import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
const root=resolve('dist/server'),config=JSON.parse(await readFile(join(root,'wrangler.json'))),modules=(await readdir(root,{recursive:true})).filter(f=>f.endsWith('.js')).sort((a,b)=>a===config.main?-1:b===config.main?1:a.localeCompare(b)).map(f=>({type:'ESModule',path:join(root,f)}));
assert.equal(config.assets.run_worker_first,true);
const paths=['admin/session-crypto','identity/repository','identity/account-session','credit/service','backup/export','backup/validator','backup/restore-plan'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts')),m=p=>loaded.modules['lib/'+p+'.ts'];
const temp=await mkdtemp(join(tmpdir(),'holocron-output-probe-')),secret='synthetic-admin-probe-secret-32-bytes',accountSecret='synthetic-account-probe-secret-32-bytes';
const key='assistant_output_log_probe_v1',path='https://example.invalid/api/admin/assistant-output-probe';
const now=Date.now(),iso=t=>new Date(t).toISOString(),window=iso(now-1000)+'/'+iso(now+300000);
const captured=[];let outbound=0,mf;
const worker=(name,enabled='false',probeWindow=window)=>({name,modules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,d1Databases:{DB:'isolated-shared-output-probe'},bindings:{HOLOCRON_ADMIN_SESSION_SECRET:secret,HOLOCRON_ACCOUNT_SESSION_SECRET:accountSecret,HOLOCRON_ASSISTANT_ENABLED:enabled,HOLOCRON_ASSISTANT_OUTPUT_PROBE_WINDOW:probeWindow},outboundService:()=>{outbound++;throw Error('ALL_EXTERNAL_OUTBOUND_FORBIDDEN');}});
// Use Miniflare's HTTP ingress. Its getWorker() RPC bridge has its own Origin
// restrictions, so it is not a browser request path. This test-only dispatcher
// selects independent real app Workers and strips its routing header.
const options=workers=>({d1Persist:join(temp,'state'),handleStructuredLogs:entry=>{captured.push({level:entry.level,message:entry.message});},workers:[
 {name:'test-ingress',modules:true,compatibilityDate:config.compatibility_date,serviceBindings:Object.fromEntries(workers.map(w=>[w.name,w.name])),script:`export default {fetch(r,e){const target=r.headers.get('x-test-target'),next=new Request(r);next.headers.delete('x-test-target');return e[target].fetch(next);}}`},...workers,
]});
const events=()=>captured.filter(e=>e.message.includes('ASSISTANT_OUTPUT_DIAGNOSTIC_V1'));
let cookie;
const call=async(name,{method='POST',body='{}',session=cookie,headers={}}={})=>mf.dispatchFetch(path,{method,headers:{'x-test-target':name,Origin:'https://example.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json',Cookie:session,...headers},...(!['GET','HEAD'].includes(method)?{body}:{} )});
try{
 mf=new Miniflare(options([worker('a'),worker('b'),worker('on','true'),worker('expired','false',iso(now-120000)+'/'+iso(now-60000)),worker('unset','false','')]));
 const db=await mf.getD1Database('DB','a');for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 const maintenance={schemaVersion:1,revision:1,mode:'MAINTENANCE',title:'점검 중',body:'준비 중'};
 const visibility=mode=>db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').bind('site_visibility_v1',JSON.stringify({...maintenance,mode})).run();
 await visibility('PUBLIC');
 const account=await m('identity/repository').createAccount(db,new Date(now));await m('credit/service').creditService(db).credit({owner:account.owner,amount:8,kind:'reward',idempotencyKey:'fixture'});
 const accountCookie=(await m('identity/account-session').issueAccountSession(account.userId,accountSecret)).split(';')[0];
 cookie='holocron_admin_session='+await m('admin/session-crypto').createAdminSessionToken(secret);
 const expiredCookie='holocron_admin_session='+await m('admin/session-crypto').createAdminSessionToken(secret,now-13*60*60*1000);
 for(const session of ['',accountCookie,'holocron_admin_session=forged',expiredCookie]){
  const r=await call('a',{session});assert.equal(r.status,401);assert.equal((await r.json()).error,'UNAUTHORIZED');
 }
 assert.equal((await call('a')).status,409,'even admin cannot probe in PUBLIC');
 await visibility('MAINTENANCE');
 const before=await m('backup/export').exportBackup(db,new Date(now));
 for(const session of ['',accountCookie,'holocron_admin_session=forged',expiredCookie]){
  const r=await call('a',{session});assert.equal(r.status,503);assert.equal((await r.json()).error,'SITE_MAINTENANCE');
 }
 for(const name of ['on','expired','unset'])assert.equal((await call(name)).status,409);
 assert.equal((await call('a',{headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await call('a',{body:'{"question":"PRIVATE"}'})).status,400);
 assert.equal((await call('a',{method:'GET'})).status,405);
 assert.equal(events().length,0);assert.equal(await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first(),null);
 // Separate application Workers/isolates, same real D1 database identifier.
 const responses=await Promise.all(Array.from({length:12},(_,i)=>call(i%2?'a':'b')));
 assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(responses.filter(r=>r.status===409).length,11);
 const accepted=responses.find(r=>r.status===200);assert.deepEqual(await accepted.json(),{status:'consumed'});assert.match(accepted.headers.get('cache-control'),/no-store/);
 for(let i=0;i<50&&!events().length;i++)await new Promise(r=>setTimeout(r,20));
 assert.equal(events().length,1);assert.equal(events()[0].level,'warn');
 assert.deepEqual(JSON.parse(events()[0].message),{event:'ASSISTANT_OUTPUT_DIAGNOSTIC_V1',stage:'schema',reason:'SCHEMA_TYPE',path:'$'});
 for(const value of [secret,accountSecret,cookie,accountCookie,account.userId,'PRIVATE','holocron_admin_session','__Host-holocron_account'])assert.ok(!events()[0].message.includes(value));
 const marker=await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();assert.ok(Buffer.byteLength(marker.value)<=256);
 assert.deepEqual(await(await mf.getD1Database('DB','b')).prepare('SELECT value FROM settings WHERE key=?').bind(key).first(),marker);
 const after=await m('backup/export').exportBackup(db,new Date(now));assert.deepEqual(after,before);assert.equal(after.version,10);assert.equal(Object.keys(after.tables).length,16);
 assert.equal(m('backup/validator').validateBackup(after).version,10);assert.ok(m('backup/restore-plan').buildRestorePlan(after).excludedSettings[key]);
 for(const table of ['assistant_searches','assistant_admissions'])assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first()).n,0);
 assert.equal((await m('credit/service').creditService(db).getBalance(account.owner)).balance,8);
 assert.equal((await call('b')).status,409);await new Promise(r=>setTimeout(r,50));assert.equal(events().length,1);
 // Restart every isolate and change the window: the persisted tombstone wins.
 await mf.dispose();mf=new Miniflare(options([worker('restart','false',iso(Date.now()-1000)+'/'+iso(Date.now()+240000))]));
 assert.equal((await call('restart')).status,409);await new Promise(r=>setTimeout(r,50));assert.equal(events().length,1);
 assert.equal(outbound,0);
 console.log('PASS actual packaged Worker probe: Signed Admin only, Account/anonymous denial, OFF+MAINTENANCE+UTC gating, 12 concurrent requests across 2 isolates -> 1 atomic tombstone / 1 WARN, persisted restart/reconfigured-window denial, opaque acknowledgement, v10 backup/business-data equality, admissions 0, Credit delta 0, Provider/outbound 0. Production log collection NOT TESTED.');
}finally{await mf?.dispose();await loaded.dispose();await rm(temp,{recursive:true,force:true});}
