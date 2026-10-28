import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
// Optional retained Sites build: execute its real modules without modifying them.
const root=resolve(process.argv[2]??'dist/server'),config=JSON.parse(await readFile(join(root,'wrangler.json'))),modules=(await readdir(root,{recursive:true})).filter(f=>f.endsWith('.js')).sort((a,b)=>a===config.main?-1:b===config.main?1:a.localeCompare(b)).map(f=>({type:'ESModule',path:join(root,f)}));
const loaded=await loadTestModules(['lib/admin/session-crypto.ts','lib/identity/repository.ts','lib/identity/account-session.ts','lib/credit/service.ts','lib/assistant/repository.ts']),m=p=>loaded.modules['lib/'+p+'.ts'];
let mocked=0,outbound=0,failureMode=null;
const consoleEvents=[];
const diagnostics=()=>consoleEvents.filter(e=>e.message.includes('ASSISTANT_OUTPUT_DIAGNOSTIC_V1'));
async function waitForDiagnostic(count){
 // Local workerd console delivery can follow the HTTP response. This is NOT
 // a Sites production log query or evidence of durable cloud log retention.
 for(let i=0;i<50&&diagnostics().length<count;i++)await new Promise(r=>setTimeout(r,20));
 assert.equal(diagnostics().length,count,'actual workerd Console Sink delivery');
}
const adminSecret='synthetic-admin-secret-built-worker';
const accountSecret='synthetic-account-key-built-worker-32-bytes';
const mf=new Miniflare({handleStructuredLogs:entry=>{consoleEvents.push({level:entry.level,message:entry.message});},workers:[
 {name:'untrusted-upstream',modules:true,compatibilityDate:config.compatibility_date,serviceBindings:{APP:'app'},script:`export default {fetch(r,e){const x=new Request(r,{cf:{}});x.headers.delete('CF-Connecting-IP');return e.APP.fetch(x);}}`},
 {name:'app',modules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,d1Databases:['DB'],bindings:{HOLOCRON_ADMIN_SESSION_SECRET:adminSecret,HOLOCRON_ASSISTANT_ENABLED:'true',HOLOCRON_ASSISTANT_SIGNING_SECRET:'synthetic-signing-secret-built-worker-32-bytes',HOLOCRON_ASSISTANT_ABUSE_SECRET:'synthetic-abuse-secret-built-worker-32-bytes',HOLOCRON_ACCOUNT_SESSION_SECRET:accountSecret,HOLOCRON_ASSISTANT_PROFILE:'gpt-5.4-mini-2026-03-17-o200k-v1',HOLOCRON_ASSISTANT_OPENAI_API_KEY:'synthetic-not-a-real-key'},outboundService:async request=>{
  if(request.url!=='https://api.openai.com/v1/responses'){outbound++;throw Error('EXTERNAL_OUTBOUND_FORBIDDEN');}mocked++;
  const body=await request.json();
  const value=mvpOutput(body.text.format.name==='archive_qa'?'qa':'script',JSON.parse(body.input[0].content[0].text).evidence);
  if(failureMode==='ENVELOPE_JSON')return new Response('{PRIVATE_ENVELOPE_CANARY',{headers:{'Content-Type':'application/json'}});
  if(failureMode==='SCHEMA_TYPE')value.answer=42;
  if(failureMode==='UNKNOWN_EVIDENCE')value.evidenceIds=['PRIVATE_EVIDENCE_CANARY'];
  return Response.json({status:'completed',model:'gpt-5.4-mini-2026-03-17',error:null,incomplete_details:null,usage:{input_tokens:1000,output_tokens:200},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:failureMode==='OUTPUT_JSON'?'{PRIVATE_OUTPUT_CANARY':JSON.stringify(value),annotations:[]}]}]});
 }},
]});
try{
 const db=await mf.getD1Database('DB','app');for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 await db.prepare("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('a','s','스타파이터 보도','보도에 따르면 제작이 논의 중이다.','','https://example.invalid/a','Deadline',?,'영화','published')").bind(new Date().toISOString()).run();
 const acc=await m('identity/repository').createAccount(db,new Date()),credit=m('credit/service').creditService(db);await credit.credit({owner:acc.owner,amount:30,kind:'reward',idempotencyKey:'fixture'});
 const cookie=(await m('identity/account-session').issueAccountSession(acc.userId,accountSecret)).split(';')[0];
 const call=(path,body,c=cookie)=>mf.dispatchFetch('https://example.invalid/api/assistant/'+path,{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json',Cookie:c},body:JSON.stringify(body)});
 assert.equal((await call('retrieve',{requestId:crypto.randomUUID(),mode:'qa',query:'스타파이터',filters:{}},'')).status,401);
 for(const mode of ['qa','script']){
  const input={requestId:crypto.randomUUID(),mode,query:'스타파이터',filters:{}};let r=await call('retrieve',input);const found=await r.json();assert.equal(r.status,200,JSON.stringify(found));assert.equal(found.credit.charged,1);assert(found.receipt);assert.deepEqual(await(await call('retrieve',input)).json(),found);
  const generate={requestId:crypto.randomUUID(),mode,receipt:found.receipt,selectedStoryIds:['s'],instructions:'',includeDraft:false,policyVersion:1};r=await call('generate',generate);const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));assert.equal(result.credit.charged,mode==='qa'?5:7);assert.equal((await(await call('generate',generate)).json()).error.code,'RESULT_NOT_RETAINED');
 }
 assert.equal((await credit.getBalance(acc.owner)).balance,16);assert.equal(mocked,2);assert.equal(outbound,0);console.log('PASS actual packaged Worker: upstream strips CF/IP, production Account configuration, signed D1 ownership, 1 CR search/recovery + 5/7 CR generation + replay; 2 local mock transports, real Provider calls ZERO');
 assert.equal(diagnostics().length,0,'success/replay/unauthenticated rejection emit no output diagnostic');
 const diagnosticAccount=await m('identity/repository').createAccount(db,new Date());
 await credit.credit({owner:diagnosticAccount.owner,amount:30,kind:'reward',idempotencyKey:'fixture'});
 const diagnosticCookie=(await m('identity/account-session').issueAccountSession(diagnosticAccount.userId,accountSecret)).split(';')[0];
 const adminToken=await m('admin/session-crypto').createAdminSessionToken(adminSecret);
 const expiredToken=await m('admin/session-crypto').createAdminSessionToken(adminSecret,Date.now()-13*3600000);
 const found=await(await call('retrieve',{requestId:crypto.randomUUID(),mode:'qa',query:'스타파이터',filters:{}},diagnosticCookie)).json();
 assert.equal(found.credit.charged,1);assert(found.receipt);
 for(const [i,[reason,stage,path]] of [
  ['ENVELOPE_JSON','response_body','$'],['OUTPUT_JSON','output_json','$'],
  ['SCHEMA_TYPE','schema','$.answer'],['UNKNOWN_EVIDENCE','grounding','$.evidenceIds[0]'],
 ].entries()){
  failureMode=reason;
  const input={requestId:crypto.randomUUID(),mode:'qa',receipt:found.receipt,selectedStoryIds:['s'],instructions:'',includeDraft:false,policyVersion:1};
  const adminCookie=i>=2?adminToken:i===0?'forged':expiredToken;
  const response=await call('generate',input,diagnosticCookie+'; holocron_admin_session='+adminCookie),result=await response.json();
  assert.equal(response.headers.get('X-Holocron-Output-Reason'),i>=2?reason:null);
  if(i>=2){assert.equal(response.headers.get('X-Holocron-Output-Stage'),stage);assert.equal(response.headers.get('X-Holocron-Output-Path'),path);}
  assert.match(response.headers.get('Cache-Control'),/private/);assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal(response.status,502);assert.equal(result.error.code,'INVALID_OUTPUT');
  assert.deepEqual(result.credit,{settlement:'failed',refund:{requested:5,applied:5,forfeited:0,full:true}});
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_|ASSISTANT_OUTPUT_DIAGNOSTIC|UNKNOWN_EVIDENCE|SCHEMA_TYPE|OUTPUT_JSON|ENVELOPE_JSON/);
  await waitForDiagnostic(i+1);
  const entry=diagnostics()[i],event=JSON.parse(entry.message);
  assert.equal(entry.level,'warn');
  assert.deepEqual(event,{event:'ASSISTANT_OUTPUT_DIAGNOSTIC_V1',stage,reason,path});
  for(const forbidden of ['PRIVATE_','스타파이터',diagnosticCookie,found.receipt,input.requestId,diagnosticAccount.userId,accountSecret,'synthetic-not-a-real-key'])assert(!entry.message.includes(forbidden));
  const admission=await m('assistant/repository').readAdmission(db,input.requestId);
  assert.equal(admission.state,'failed');assert.equal(admission.security_policy,'account-v1');assert.equal(admission.charged_credits,5);
  const ledger=await db.prepare('SELECT operation,applied_amount FROM credit_ledger WHERE reference_id=? ORDER BY sequence').bind(input.requestId).all();
  assert.deepEqual(ledger.results,[{operation:'debit',applied_amount:-5},{operation:'refund',applied_amount:5}]);
  const before=mocked;
  assert.equal((await(await call('generate',input,diagnosticCookie)).json()).error.code,'RESULT_NOT_RETAINED');
  assert.equal(mocked,before,'Replay never calls transport');
  assert.equal((await credit.getBalance(diagnosticAccount.owner)).balance,29);
  await new Promise(r=>setTimeout(r,50));assert.equal(diagnostics().length,i+1,'Replay never emits a duplicate diagnostic');
 }
 for(const wallet of(await db.prepare('SELECT principal_id,balance,version FROM credit_wallets').all()).results){
  const entries=(await db.prepare('SELECT sequence,applied_amount,resulting_balance FROM credit_ledger WHERE wallet_id=? ORDER BY sequence').bind(wallet.principal_id).all()).results;
  let balance=0;for(const [i,e]of entries.entries()){balance+=e.applied_amount;assert.equal(e.sequence,i+1);assert.equal(e.resulting_balance,balance);}
  assert.equal(wallet.balance,balance);assert.equal(wallet.version,entries.length);
 }
 assert.equal(mocked,6);assert.equal(outbound,0);
 console.log('PASS packaged Worker OutputDiagnostic -> real console.warn -> local structured Console Sink: 4 exact private-data-free events, envelope/JSON/schema/grounding, full refunds + replay + wallet/ledger audit. Signed Admin response headers verified; forged/expired blocked. Production log collection/retention NOT VERIFIED. Real Provider calls ZERO.');
}finally{await mf.dispose();await loaded.dispose();}
