// Offline rehearsal: copy a stopped Miniflare D1/R2 pair into a new root.
// Keys live in memory and never enter the snapshot or the test report.
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';

const require=createRequire(import.meta.url),wr=require('wrangler');
const {Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const paths=['racing/phase3a/service','racing-broadcast/private','racing-broadcast/http','racing/phase3a/crypto'].map(p=>'lib/'+p+'.ts');
const loaded=await loadTestModules(paths);
const [domain,priv,api,c]=paths.map(p=>loaded.modules[p]);
const directory=await mkdtemp(join(tmpdir(),'3f-private-restore-'));
const open=root=>new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response()}}',
 d1Databases:['DB'],r2Buckets:['VAULT'],d1Persist:join(root,'db'),r2Persist:join(root,'objects')});
const legacy=c.secret(),a=c.secret(),b=c.secret();
const ring=(active,keys)=>JSON.stringify({active,keys});
const rotated=ring('b',{a,b});
const start=Date.parse('2026-12-07T12:00Z'), day=86400000;
const first='regular:2026-12-07:R1',second='regular:2026-12-07:R2';
let runtime,env,db,now=start-day;
async function attach(root){
 runtime=open(root);
 db=await runtime.getD1Database('DB');
 env={RACING_ISOLATED_DB:db,RACING_PRIVATE_OBJECTS:await runtime.getR2Bucket('VAULT'),RACING_SEAL_KEY:legacy};
}
async function service(role){
 return domain.racingService({db,key:await priv.keyFor(env),artifacts:priv.objects(env),now:()=>now,role:()=>role,entropy:async ref=>c.digest(ref)});
}
async function finish(id,time){
 now=time;
 await (await service('generator')).generate(id,'main');
 const scheduler=await service('scheduler');
 await scheduler.advance(id);
 const row=await db.prepare('SELECT final_at FROM racing_races WHERE id=?').bind(id).first();
 now=row.final_at;
 await scheduler.advance(id);
 await scheduler.advance(id);
}
const watch=(id,offset='')=>api.watch(new Request('http://qa/watch?race='+id+offset),env,()=>now);
async function read(id,offset=''){
 const r=await watch(id,offset);assert.equal(r.status,200);return r.json();
}
async function denied(id,offset=''){
 const r=await watch(id,offset);assert.equal(r.status,503);assert.deepEqual(await r.json(),{phase:'WAITING'});
}
try {
 await attach(join(directory,'source'));
 for(const file of ['0001_foundation','0002_admin_grants','0003_custom_seasons']){
  const sql=await readFile('db/racing-phase3a/migrations/'+file+'.sql','utf8');
  await db.batch(wr.unstable_splitSqlQuery(sql).map(s=>db.prepare(s)));
 }
 await (await service('scheduler')).createRegular('2026-12-07');
 env.RACING_KEYRING=ring('a',{a});
 await (await service('scheduler')).createRegular('2026-12-14');
 delete env.RACING_KEYRING;
 now=start-3600000;await (await service('generator')).generate(first,'qualifying');
 await finish(first,start);
 env.RACING_KEYRING=ring('a',{a});
 now=start+day-3600000;await (await service('generator')).generate(second,'qualifying');
 env.RACING_KEYRING=rotated;
 await finish(second,start+day);
 const archived=await Promise.all([read(first),read(second),read(second,'&offset=-3500000')]);
 assert.deepEqual(archived.slice(0,2).map(v=>v.phase),['FINAL','FINAL']);
 const rows=await db.prepare('SELECT stage,output_ref FROM racing_generations WHERE race_id=? ORDER BY stage').bind(second).all();
 for(const row of rows.results){
  const cipher=await priv.objects(env).get(row.output_ref);
  assert(cipher.startsWith('v1:'+(row.stage==='main'?'b':'a')+':'));
 }
 await runtime.dispose();runtime=null;
 await cp(join(directory,'source'),join(directory,'restore'),{recursive:true});
 await attach(join(directory,'restore'));env.RACING_KEYRING=rotated;
 assert.deepEqual(await Promise.all([read(first),read(second),read(second,'&offset=-3500000')]),archived);
 env.RACING_KEYRING=ring('b',{b});await denied(second,'&offset=-3500000');
 env.RACING_KEYRING=ring('b',{a,b:c.secret()});await denied(second);
 env.RACING_KEYRING=rotated;delete env.RACING_SEAL_KEY;await denied(first);
 assert.equal((await read(second)).phase,'FINAL');
 // Resume a sealed, ungenerated post-rotation season from the restored DB.
 now=start+7*day-3600000;await (await service('generator')).generate('regular:2026-12-14:R1','qualifying');
 const key=await priv.keyFor(env);
 const cipher=await c.encrypt(key,'synthetic','fixture');
 await assert.rejects(c.decrypt(key,cipher,'other'));
 const alias=await priv.keyFor({RACING_KEYRING:ring('alias',{alias:b})});
 await assert.rejects(c.decrypt(alias,cipher.replace('v1:b:','v1:alias:'),'fixture'));
 await assert.rejects(priv.keyFor({RACING_SEAL_KEY:legacy,RACING_KEYRING:'{}'}));
 assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 console.log('PASS stopped D1/R2 restore, legacy and two versioned envelopes, sealed-season continuation, cold and warm denial, tamper and wrong-key denial');
} finally {await runtime?.dispose();await rm(directory,{recursive:true,force:true});await loaded.dispose();}
