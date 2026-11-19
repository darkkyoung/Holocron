import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const paths=['lib/racing-admin/commands.ts','lib/racing-admin/weekly.ts','lib/admin/session-crypto.ts','lib/racing/phase3a/crypto.ts','lib/racing/phase3a/engine.ts'];
const m=await loadTestModules(paths),[admin,weekly,auth,cryptoApi,engine]=paths.map(p=>m.modules[p]);
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response()}}',d1Databases:['TEST']});
try{
 const db=await mf.getD1Database('TEST'),key='ab'.repeat(32),now=Date.parse('2026-12-06T14:59:00Z');
 for(const name of ['0001_foundation','0002_admin_grants']){
 const sql=await readFile('db/racing-phase3a/migrations/'+name+'.sql','utf8');
 await db.batch(require('wrangler').unstable_splitSqlQuery(sql).map(x=>db.prepare(x)));
 }
 const origin='https://local.example',req=o=>new Request(origin,{headers:{origin:o,'Content-Type':'application/json','X-Racing-Command':'1'}});
 assert(admin.sameOriginMutation(req(origin),origin));assert(!admin.sameOriginMutation(req('https://other.example'),origin));
 const token=await auth.createAdminSessionToken('test-only',now), session=await auth.verifyAdminSessionToken(token,'test-only',now);
 assert.equal(await auth.verifyAdminSessionToken(token,'other',now),null);assert.equal(await auth.verifyAdminSessionToken(token,'test-only',now+86400000),null);
 const access=()=>admin.adminConsole(db,session,key,()=>now),hash=await cryptoApi.digest(session.nonce);
 await assert.rejects(access(),/FORBIDDEN/);
 const set=role=>db.prepare('INSERT OR REPLACE INTO racing_admin_grants VALUES(?,?,?,?)').bind(hash,'operator-test',role,now+60000).run();
 await set('viewer');await assert.rejects((await access()).execute({action:'nextWeek'}),/FORBIDDEN/);
 await set('scheduler');const s=await access();
 const env={RACING_ISOLATED_DB:db,RACING_SEAL_KEY:key};
 const ids=await Promise.all([s.execute({action:'nextWeek'}),weekly.scheduledWeek(now,env,()=>now)]);
 assert.deepEqual(ids,['regular:2026-12-07','regular:2026-12-07']);
 const list=await s.list();assert.equal(list.races.length,7);assert(!JSON.stringify(list).includes('commitment'));
 const edit={action:'profile',id:'r1',name:'Test driver',bio:'local',revision:0};await s.execute(edit);await assert.rejects(s.execute(edit));assert.equal((await s.list()).profiles[0].revision,1);
 await set('incident');await assert.rejects(s.execute({action:'seal',monday:'2026-12-14'}));
 const i=await access(),cmd={action:'cancel',id:ids[0]+':R1',revision:0,reason:'venue unavailable'};
 await i.execute(cmd);await assert.rejects(i.execute(cmd),/STATE_CONFLICT/);
 assert.equal((await db.prepare("SELECT count(*) n FROM racing_audit WHERE actor='operator-test' AND command='cancel'").first()).n,1);
 await db.prepare('UPDATE racing_admin_grants SET expires_at=?').bind(now).run();await assert.rejects(access(),/FORBIDDEN/);
 const timings=[];
 for(let n=0;n<20;n++){const q=engine.qualify('qa-q'+n,10),start=performance.now();engine.main('qa-m'+n,10,q);timings.push(performance.now()-start);}
 timings.sort((a,b)=>a-b);console.log('PASS isolated roles, session expiry/revocation, Origin, weekly replay, concurrent seal, cancellation and atomic actor audit');
 console.log('10-lap main computation only, 20 samples, median/p95/max ms:',timings[9],timings[18],timings[19]);
}finally{await mf.dispose();await m.dispose();}
