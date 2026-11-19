import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadTestModules} from './test-module-loader.mjs';
const files=['racing-broadcast/runner','racing-broadcast/http','racing-broadcast/private','racing/phase3a/operations','racing/phase3a/crypto'].map(p=>'lib/'+p+'.ts');
const mod=await loadTestModules(files),[runner,http,priv,op,c]=files.map(p=>mod.modules[p]);
const require=createRequire(import.meta.url),wr=require('wrangler'),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response()}}',d1Databases:['DB'],r2Buckets:['VAULT'],kvNamespaces:['BEACON']});
try{
 const db=await mf.getD1Database('DB'),vault=await mf.getR2Bucket('VAULT'),beacon=await mf.getKVNamespace('BEACON');
 for(const f of ['0001_foundation','0002_admin_grants','0003_custom_seasons']){
 const sql=await readFile('db/racing-phase3a/migrations/'+f+'.sql','utf8');await db.batch(wr.unstable_splitSqlQuery(sql).map(s=>db.prepare(s)));}
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const env={RACING_ISOLATED_DB:db,RACING_PRIVATE_OBJECTS:vault,RACING_SEAL_KEY:'aa'.repeat(32),RACING_BEACON:beacon,RACING_BEACON_PUBLIC_JWK:JSON.stringify(await crypto.subtle.exportKey('jwk',pair.publicKey))};
 const now0=Date.parse('2026-12-06T01:00:00Z'),scheduler=op.racingOperations({db,key:await priv.keyFor(env),now:()=>now0,role:()=>'scheduler'});
 const report={coldReader:[],warmReader:[]};
 for(let week=0;week<15;week++){
 const monday=new Date(Date.parse('2026-12-07T00:00Z')+week*7*86400000).toISOString().slice(0,10);
 const season=await scheduler.createRegular(monday);
 for(let i=0;i<7;i++){
 const race=season+':R'+(i+1),q=Date.parse(monday+'T11:00Z')+i*86400000,start=q+3600000;
 for(const stage of ['qualifying','main']){
 const ref='isolated-external-v1:'+race+':'+stage,value=await c.digest('fixture:'+ref);
 const signature=c.hex(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(c.canonical({ref,value})))));
 if(week===0&&i===0){await beacon.put(ref,JSON.stringify({ref,value:'0'.repeat(64),signature}));await assert.rejects(runner.verifiedContribution(env,ref));}
 await beacon.put(ref,JSON.stringify({ref,value,signature}));
 }
 const req=new Request('http://isolated/api/racing/watch?race='+encodeURIComponent(race));
 await runner.wake(env,()=>q);
 assert.equal((await (await http.watch(req,env,()=>start-120000)).json()).phase,'PRESHOW');
 await runner.wake(env,()=>start-1);assert.equal((await (await http.watch(req,env,()=>start)).json()).phase,'WAITING');
 const marks={};const t=performance.now();await runner.wake(env,()=>start+Math.floor(performance.now()-t),(stage,name)=>{if(stage==='main')marks[name]=performance.now()-t;});
 const generated=performance.now()-t;
 for(const variant of ['coldReader','warmReader']){
 const began=performance.now();const response=await http.watch(req,env,()=>start+Math.floor(performance.now()-t));const shot=await response.json();
 assert.equal(shot.phase,'RACE');assert(shot.offset>=Math.floor(generated));assert.equal(shot.entries.length,8);
 const read=performance.now()-began;report[variant].push({...marks,generation:generated,read,total:performance.now()-t});
 }
 // Drop test artifacts after both observed responses; never touches real storage.
 for(const row of (await db.prepare('SELECT output_ref FROM racing_generations WHERE race_id=?').bind(race).all()).results)await vault.delete(row.output_ref);
 }}
 const summary=Object.fromEntries(Object.entries(report).map(([k,v])=>[k,Object.fromEntries(Object.keys(v[0]).map(key=>{const xs=v.map(x=>x[key]).sort((a,b)=>a-b);return [key,Object.fromEntries([50,95,99].map(p=>['p'+p,Math.round(xs[Math.ceil(p*xs.length/100)-1])]))];}))]));
 console.log('PASS isolated strict schedule, signature failure, private R2/D1 commit/readback, honest wait, first live frame',JSON.stringify(summary));
 await mkdir('out',{recursive:true});await writeFile('out/3c-latency.json',JSON.stringify({sample:105,units:'ms',summary,report},null,2));
}finally{await mf.dispose();await mod.dispose();}
