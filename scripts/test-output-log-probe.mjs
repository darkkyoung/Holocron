import strict from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
let checks=0;
const assert=new Proxy(strict,{get(t,k){return typeof t[k]==='function'?(...a)=>{checks++;return t[k](...a);}:t[k];}});
const paths=['observability/output-log-probe','observability/output-log-probe-repository','assistant/output-logger','backup/export','backup/validator','backup/restore-plan','backup/format','identity/repository','credit/service'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts')),m=p=>loaded.modules['lib/'+p+'.ts'];
const {handleOutputLogProbe:handle,outputProbeWindow}=m('observability/output-log-probe'),{OUTPUT_LOG_PROBE_KEY:key}=m('observability/output-log-probe-repository');
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
let outbound=0;const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],outboundService:()=>{outbound++;throw Error('OUTBOUND_FORBIDDEN');}});
const start=Date.parse('2026-10-23T12:00:00.000Z'),end=start+600000,window=new Date(start).toISOString()+'/'+new Date(end).toISOString();
let now=start,db,writes=0;const events=[];
const maintenance={schemaVersion:1,revision:1,mode:'MAINTENANCE',title:'점검 중',body:'준비 중'};
const request=(body='{}',headers={},method='POST',suffix='')=>new Request('https://example.invalid/api/admin/assistant-output-probe'+suffix,{method,headers:{Origin:'https://example.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json',...headers},...(!['GET','HEAD'].includes(method)?{body}:{} )});
const deps=()=>({authorized:async()=>true,database:()=>db,enabled:'false',window,now:()=>now,createLogger:m('assistant/output-logger').outputLoggerFactory(event=>{events.push(event);})});
const call=(r=request(),d=deps())=>handle(r,d);
async function reset(){await db.prepare('DELETE FROM settings WHERE key=?').bind(key).run();await db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').bind('site_visibility_v1',JSON.stringify(maintenance)).run();events.length=0;now=start;}
async function snapshot(){
 const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()).results;
 const result={};for(const {name}of tables){assert.match(name,/^[a-z_][a-z0-9_]*$/i);result[name]=(await db.prepare(`SELECT * FROM "${name}"`).all()).results.filter(r=>name!=='settings'||r.key!==key).map(r=>JSON.stringify(r)).sort();}return result;
}
const marker=()=>db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();
// Wrap only the atomic INSERT. Every test still uses a real isolated D1.
function interceptWrite(effect){return {withSession:s=>db.withSession(s),prepare:sql=>{
 const statement=db.prepare(sql);if(!sql.startsWith('INSERT INTO settings'))return statement;
 return {bind:(...args)=>({first:async()=>{writes++;return effect(()=>statement.bind(...args).first());}})};
}};}
try{
 db=await mf.getD1Database('DB');for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 const account=await m('identity/repository').createAccount(db,new Date(start));await m('credit/service').creditService(db).credit({owner:account.owner,amount:8,kind:'reward',idempotencyKey:'fixture'});
 await reset();const before=await snapshot(),backup=await m('backup/export').exportBackup(db,new Date(start));
 assert.equal(outputProbeWindow(window,start).end,end);assert.equal(outputProbeWindow(window,end-1).start,start);
 for(const bad of [undefined,'',window+'/',window.replace('.000Z','Z'),window.replace('12:00','13:00'),window.replace('12:10','12:11'),'2026-02-30T12:00:00.000Z/2026-02-30T12:01:00.000Z'])assert.equal(outputProbeWindow(bad,start),null);
 for(const t of [start-1,end,NaN,Infinity,-1,1.5])assert.equal(outputProbeWindow(window,t),null);
 // Reject before any D1 access when auth/request/window fails.
 const noDb={...deps(),database:()=>{throw Error('UNEXPECTED_DB');}};
 assert.equal((await call(request(),{...noDb,authorized:async()=>false})).status,401);
 for(const method of ['GET','HEAD','PUT','PATCH','DELETE','OPTIONS'])assert.equal((await call(request('{}',{},method),noDb)).status,405);
 for(const headers of [{Origin:'https://evil.invalid'},{Origin:''},{'Sec-Fetch-Site':'same-site'},{'Sec-Fetch-Site':'cross-site'},{'Content-Type':'text/plain'}])assert.equal((await call(request('{}',headers),noDb)).status,headers['Content-Type']?415:403);
 for(const body of ['[]','null','{"query":"PRIVATE"}','{"probe":true}','{'])assert.equal((await call(request(body),noDb)).status,400);
 assert.equal((await call(request(' '.repeat(33)),noDb)).status,413);
 assert.equal((await call(request('{}',{},'POST','?enable=true'),noDb)).status,400);
 for(const enabled of ['true',undefined,false,'FALSE'])assert.equal((await call(request(),{...noDb,enabled})).status,409);
 for(const value of [undefined,'',window+'bad'])assert.equal((await call(request(),{...noDb,window:value})).status,409);
 now=end;assert.equal((await call(request(),noDb)).status,409);now=start;
 assert.equal(await marker(),null);assert.equal(events.length,0);
 // Independent handler/dependency instances contend on D1, not memory.
 const responses=await Promise.all(Array.from({length:12},()=>call(request(),deps())));
 assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(responses.filter(r=>r.status===409).length,11);
 assert.deepEqual(await responses.find(r=>r.status===200).json(),{status:'consumed'});
 assert.deepEqual(events,[{event:'ASSISTANT_OUTPUT_DIAGNOSTIC_V1',stage:'schema',reason:'SCHEMA_TYPE',path:'$'}]);
 const tombstone=(await marker()).value;assert.ok(Buffer.byteLength(tombstone)<=256);assert.equal(JSON.parse(tombstone).state,'consumed');
 assert.deepEqual(await snapshot(),before);
 const afterBackup=await m('backup/export').exportBackup(db,new Date(start));assert.deepEqual(afterBackup,backup);
 assert.equal(afterBackup.version,10);assert.equal(Object.keys(afterBackup.tables).length,16);
 assert.equal(afterBackup.schema.latestMigration,'0020_account_assistant_access.sql');assert.ok(!JSON.stringify(afterBackup).includes(key));
 assert.equal(m('backup/validator').validateBackup(afterBackup).version,10);
 const plan=m('backup/restore-plan').buildRestorePlan(afterBackup);assert.ok(plan.excludedSettings[key]);assert.ok(!plan.settings.replacementScope.includes(key));
 for(let version=1;version<=10;version++)assert.ok(!m('backup/format').backupSettingsKeys(version).includes(key));
 // Changing the operator window or creating fresh handler objects never rearms.
 now=end+1;const later=new Date(end).toISOString()+'/'+new Date(end+600000).toISOString();
 assert.equal((await call(request(),{...deps(),window:later})).status,409);assert.equal(events.length,1);assert.equal((await marker()).value,tombstone);
 await reset();await db.prepare('INSERT INTO settings VALUES(?,?)').bind(key,'malformed marker').run();assert.equal((await call()).status,409);assert.equal(events.length,0);
 // Visibility must remain maintenance, including the read/write race.
 for(const value of [JSON.stringify({...maintenance,mode:'PUBLIC'}),'broken']){
  await reset();await db.prepare('UPDATE settings SET value=? WHERE key=?').bind(value,'site_visibility_v1').run();assert.notEqual((await call()).status,200);assert.equal(await marker(),null);assert.equal(events.length,0);
 }
 await reset();await db.prepare("DELETE FROM settings WHERE key='site_visibility_v1'").run();assert.equal((await call()).status,409);assert.equal(await marker(),null);
 await reset();writes=0;
 const changed=interceptWrite(async run=>{await db.prepare("UPDATE settings SET value=? WHERE key='site_visibility_v1'").bind(JSON.stringify({...maintenance,mode:'PUBLIC'})).run();return run();});
 assert.equal((await call(request(),{...deps(),database:()=>changed})).status,409);assert.equal(await marker(),null);assert.equal(events.length,0);assert.equal(writes,1);
 // Lost D1 acknowledgement after commit: never emit or retry; tombstone survives.
 await reset();writes=0;const lost=interceptWrite(async run=>{await run();throw Error('PRIVATE_D1_ACK');});
 let r=await call(request(),{...deps(),database:()=>lost});assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'PROBE_CONSUMPTION_UNKNOWN',retryAllowed:false});assert.equal(writes,1);assert.equal(events.length,0);assert.ok(await marker());
 assert.equal((await call()).status,409);assert.equal(events.length,0);
 // A failed write with no commit also emits nothing and is never auto-retried.
 await reset();writes=0;const down=interceptWrite(async()=>{throw Error('PRIVATE_D1_BEFORE_COMMIT');});
 assert.equal((await call(request(),{...deps(),database:()=>down})).status,503);assert.equal(writes,1);assert.equal(await marker(),null);assert.equal(events.length,0);
 // Expiry/visibility after durable consumption spends the attempt without logging.
 for(const transition of ['expire','public']){
  await reset();const late=interceptWrite(async run=>{const result=await run();if(transition==='expire')now=end;else await db.prepare("UPDATE settings SET value=? WHERE key='site_visibility_v1'").bind(JSON.stringify({...maintenance,mode:'PUBLIC'})).run();return result;});
  r=await call(request(),{...deps(),database:()=>late});assert.deepEqual(await r.json(),{status:'consumed'});assert.equal(events.length,0);assert.ok(await marker());
 }
 for(const sink of [()=>{throw Error('PRIVATE_SINK');},()=>Promise.reject(Error('PRIVATE_SINK'))]){
  await reset();r=await call(request(),{...deps(),createLogger:()=>sink});assert.deepEqual(await r.json(),{status:'consumed'});assert.ok(await marker());assert.equal((await call()).status,409);assert.equal(events.length,0);
 }
 await reset();r=await call();assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('vary'),'Cookie');assert.deepEqual(await snapshot(),before);
 assert.equal(outbound,0);
 console.log(`Output probe domain: ${checks} assertions PASS; real local D1 one-shot concurrency/tombstone, strict OFF/window/admin/Origin/body, lost acknowledgements, sink failure, no retry, immutable business data, v1-v10 exclusion + v10 validate/plan. Provider outbound ZERO.`);
}finally{await mf.dispose();await loaded.dispose();}
