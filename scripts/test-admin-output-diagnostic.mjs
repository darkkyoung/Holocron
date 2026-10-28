import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadTestModules} from './test-module-loader.mjs';
const loaded=await loadTestModules(['lib/assistant/admin-output-diagnostic.ts','lib/admin/session-crypto.ts']);
const {withAdminOutputDiagnostic:deliver}=loaded.modules['lib/assistant/admin-output-diagnostic.ts'];
const {createAdminSessionToken,verifyAdminSessionToken}=loaded.modules['lib/admin/session-crypto.ts'];
const secret='synthetic-admin-only-secret',now=Date.parse('2026-10-28T00:00:00Z');
const body={status:'error',error:{code:'INVALID_OUTPUT'},credit:{settlement:'failed',refund:{requested:5,applied:5}}};
const response=()=>Response.json(body,{status:502,headers:{'Cache-Control':'private, no-store'}});
const header='X-Holocron-Output-Reason';
let writes=0;
try{
 const token=await createAdminSessionToken(secret,now);
 const auth=t=>async()=>!!await verifyAdminSessionToken(t,secret,now);
 const run=async observer=>{observer({stage:'schema',reason:'SCHEMA_TYPE',path:'$.answer'});observer({stage:'schema',reason:'STRING_LENGTH',path:'$.direction'});return response();};
 const good=await deliver(run,auth(token),()=>{writes++;});
 assert.equal(writes,1);assert.equal(good.headers.get(header),'SCHEMA_TYPE');
 assert.equal(good.headers.get('X-Holocron-Output-Path'),'$.answer');assert.deepEqual(await good.json(),body);
 for(const bad of ['',token+'forged','holocron_account=synthetic']){
  const r=await deliver(run,auth(bad),()=>{});assert.equal(r.headers.get(header),null);assert.deepEqual(await r.json(),body);
 }
 const expired=await createAdminSessionToken(secret,now-13*3600000);
 assert.equal((await deliver(run,auth(expired),()=>{})).headers.get(header),null);
 const unknown=await deliver(async()=>response(),auth(token),()=>{});assert.equal(unknown.headers.get(header),'UNKNOWN');
 const failedAuth=await deliver(run,async()=>{throw Error('private auth details');},()=>{});assert.deepEqual(await failedAuth.json(),body);assert.equal(failedAuth.headers.get(header),null);
 const failedLog=await deliver(run,auth(token),async()=>{throw Error('private logger details');});assert.equal(failedLog.headers.get(header),'SCHEMA_TYPE');assert.deepEqual(await failedLog.json(),body);
 // Two overlapping requests retain their own observations; no isolate/global slot.
 let resume;const waiting=new Promise(resolve=>{resume=resolve;});
 const first=deliver(async observer=>{observer({reason:'SCHEMA_TYPE',path:'$.answer'});await waiting;return response();},auth(token),()=>{});
 const second=await deliver(async observer=>{observer({reason:'OUTPUT_JSON',path:'$'});return response();},auth(token),()=>{});
 resume();assert.equal((await first).headers.get(header),'SCHEMA_TYPE');assert.equal(second.headers.get(header),'OUTPUT_JSON');
 const malicious=await deliver(async observer=>{observer({stage:'PRIVATE',reason:'PRIVATE',path:'$.PRIVATE_COOKIE_SECRET'});return response();},auth(token),()=>{});
 assert.equal(malicious.headers.get(header),'RESPONSE_METADATA');assert.equal(malicious.headers.get('X-Holocron-Output-Path'),'$');
 assert(!JSON.stringify([...malicious.headers]).includes('PRIVATE_COOKIE_SECRET'));
 const success=await deliver(async()=>Response.json({status:'ok'}),async()=>{throw Error('must not authorize success');},()=>{});assert.equal(success.headers.get(header),null);
 const route=await readFile('app/api/assistant/generate/route.ts','utf8');
 assert.match(route,/getAdminSession\(\)/);assert.match(route,/onOutputDiagnostic:observer/);assert.match(route,/createOutputLogger\(\)/);
 console.log('PASS admin output diagnostics: signed/forged/expired/account-only, isolated concurrent requests, UNKNOWN, sanitization, logger/auth failures, unchanged public body; Provider ZERO');
}finally{await loaded.dispose();}
