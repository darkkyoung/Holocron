import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
import assert from 'node:assert/strict';
import {checkConversationD1} from './assistant-conversation-d1-check.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
const paths=['assistant/admission-sql','credit/policy-settings/repository','assistant/repository','assistant/admission','assistant/admin-output-diagnostic','admin/session-crypto','assistant/http','assistant/generate-http','assistant/account-access','assistant/account-search','assistant/receipts','assistant/service','identity/repository','identity/account-session','credit/service','backup/export','backup/validator','backup/restore-plan'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts'),{externals:['js-tiktoken/lite','js-tiktoken/ranks/o200k_base']}),m=p=>loaded.modules['lib/'+p+'.ts'];
let outbound=0,calls=0,now=Math.floor(Date.now()/86400000)*86400000+2*86400000;
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response("local")}}',d1Databases:['DB'],outboundService:()=>{outbound++;throw Error('NO NETWORK');}});
const secret='synthetic-signing-secret-at-least-32-bytes',account='synthetic-account-secret-at-least-32-bytes',abuseSecret='synthetic-abuse-secret-at-least-32-bytes';
let db,owner,cookie,credit,transport;
const sql=(s,...args)=>db.prepare(s).bind(...args).run(),first=(s,...args)=>db.prepare(s).bind(...args).first();
const deps=()=>({enabled:true,accessPolicy:'account-v1',secret,abuseSecret,identitySecrets:{account},database:()=>db,now:()=>now,network:()=>{throw Error('MUST NOT READ IP');},profileId:'gpt-5.4-mini-2026-03-17-o200k-v1',apiKey:'synthetic-not-a-key',fetcher:async(url,init)=>{calls++;return transport(JSON.parse(init.body));}});
const req=(body,c=cookie,extra={})=>new Request('https://local.test/api/assistant/retrieve',{method:'POST',headers:{Origin:'https://local.test','Content-Type':'application/json',Cookie:c,...extra},body:JSON.stringify(body)});
const input=(mode='qa',query='스타파이터')=>({requestId:crypto.randomUUID(),mode,query,filters:{}});
const search=async(v=input(),c=cookie,d=deps())=>{const r=await m('assistant/http').handleRetrieve(req(v,c),d);return {r,b:await r.json()};};
const balance=async()=>(await credit.getBalance(owner)).balance;
function valid(body){if(body.text.format.name==='general_chat')return {answer:'안녕하세요! 스타워즈 이야기를 함께 나눠요.'};return mvpOutput(body.text.format.name==='archive_qa'?'qa':'script',JSON.parse(body.input[0].content[0].text).evidence);}
const response=value=>Response.json({status:'completed',model:'gpt-5.4-mini-2026-03-17',error:null,incomplete_details:null,usage:{input_tokens:1000,output_tokens:200},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value),annotations:[]}]}]});
async function fixture(amount=100){
 now+=86400000;await sql('DELETE FROM assistant_searches');await sql('DELETE FROM assistant_admissions');await sql('DELETE FROM articles');
 await sql("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('a','story','스타파이터 제작 소식','보도에 따르면 제작이 논의 중이다.','','https://example.com/news','Deadline',?,'영화','published')",new Date(now-86400000).toISOString());
 const a=await m('identity/repository').createAccount(db,new Date(now));owner=a.owner;cookie=(await m('identity/account-session').issueAccountSession(a.userId,account,now)).split(';')[0];
 if(amount)await credit.credit({owner,amount,kind:'reward',idempotencyKey:'fund'});calls=0;transport=b=>response(valid(b));
}
const generationInput=(s,mode='qa')=>({requestId:crypto.randomUUID(),mode,receipt:s.receipt,selectedStoryIds:['story'],instructions:'',includeDraft:false,policyVersion:2});
async function generate(v,adminToken='',logger=()=>{}){const r=await m('assistant/admin-output-diagnostic').withAdminOutputDiagnostic(observer=>m('assistant/generate-http').handleGenerate(req(v),{...deps(),onOutputDiagnostic:observer}),async()=>!!await m('admin/session-crypto').verifyAdminSessionToken(adminToken,'synthetic-admin-secret',now),logger);return {r,b:await r.json()};}
try{
 db=await mf.getD1Database('DB');for(const file of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+file,'utf8')).map(s=>db.prepare(s)));credit=m('credit/service').creditService(db);
 const previous=await m('credit/policy-settings/repository').readPolicy(db);assert.equal(previous.values.qaCredits,5);const updated=await m('credit/policy-settings/repository').savePolicy(db,previous.version,{...previous.values,qaCredits:1},new Date(now+86400000));assert.equal(updated.version,2);
 await fixture();assert.equal((await search(input(),'')).r.status,401);assert.equal((await search(input(),'__Host-holocron_account=forged')).r.status,401);assert.equal(await balance(),100);
 const v=input(),ok=await search(v);assert.equal(ok.r.status,200,JSON.stringify(ok.b));assert.equal(ok.b.credit.charged,0);assert.equal(await balance(),100);assert(ok.b.receipt);assert.equal(req(v).cf,undefined);
 assert.deepEqual((await search(v)).b,ok.b);assert.equal(await balance(),100);
 assert.equal((await search({...v,query:'changed'})).b.error.code,'REQUEST_CONFLICT');
 const settled=await first('SELECT * FROM assistant_searches WHERE request_id=?',v.requestId);assert(!settled.result_cipher.includes('스타파이터'));assert(!settled.result_cipher.includes(ok.b.receipt));
 assert.equal((await search(input('qa','없는검색어'))).b.credit.charged,0);assert.equal(await balance(),100);
 for(const id of ['1','2'])await sql("INSERT INTO works(id,title,original_title,type,status,poster_url,season_number) VALUES(?,?,?,'드라마','archive','',?)",id,'아소카 시즌 '+id,'Ahsoka',id);
 const clarification=await search(input('qa','아소카'));assert.equal(clarification.b.status,'clarification');assert.equal(clarification.b.credit.charged,0);assert.equal(await balance(),100);
 const wrong=await m('assistant/http').handleRetrieve(req(input(),cookie,{Origin:'https://evil.invalid','CF-Connecting-IP':'1.1.1.1'}),deps());assert.equal(wrong.status,403);
 assert.equal((await search(input(),cookie,{...deps(),enabled:false})).b.error.code,'ASSISTANT_UNAVAILABLE');
 // Same request concurrent claims: one charge; later replay recovers identical output.
 await fixture();const parallel=input(),r=await Promise.all([search(parallel),search(parallel)]);assert(r.some(x=>x.r.status===200));assert.equal(await balance(),100);assert.equal((await search(parallel)).b.credit.charged,0);
 // Simulate committed transaction with lost response. Retry reads stored result, no second debit.
 await fixture(1);const lost=input();let dropped=false;
 const marked=new WeakSet();const lossy={prepare:s=>{const st=db.prepare(s);return {bind:(...args)=>{const bound=st.bind(...args);if(s.includes('search_atomicity_failed'))marked.add(bound);return bound;}};},withSession:s=>db.withSession(s),batch:async statements=>{const result=await db.batch(statements);if(!dropped&&statements.some(s=>marked.has(s))){dropped=true;throw Error('lost response');}return result;}};
 const lostResponse=await search(lost,cookie,{...deps(),database:()=>lossy});assert(dropped);assert.equal(lostResponse.r.status,500);assert.equal(await balance(),1);assert.equal((await search(lost)).r.status,200);assert.equal(await balance(),1);
 // Process interruption immediately after attempt claim, before any result/debit.
 await fixture();const interrupted=input();let interrupt=true;
 const crashDb={prepare:s=>db.prepare(s),withSession:s=>db.withSession(s),batch:async statements=>{const r=await db.batch(statements);if(interrupt){interrupt=false;throw Error('process interrupted');}return r;}};
 assert.equal((await search(interrupted,cookie,{...deps(),database:()=>crashDb})).r.status,500);assert.equal(await balance(),100);
 assert.equal((await search(interrupted)).b.error.code,'REQUEST_IN_PROGRESS');now+=60001;
 assert.equal((await search(interrupted)).r.status,200);assert.equal(await balance(),100);
 // Crash before computation/charge: stale lease takeover, same request only.
 await fixture();const crash=input();
 const broken={prepare:s=>db.prepare(s),batch:s=>db.batch(s),withSession:()=>{throw Error('archive failure');}};
 assert.equal((await search(crash,cookie,{...deps(),database:()=>broken})).r.status,503);assert.equal(await balance(),100);assert.equal((await search(crash)).b.error.code,'RESULT_NOT_RETAINED');
 await fixture(0);const zeroSearch=await search();assert.equal(zeroSearch.r.status,200);assert.equal((await generate(generationInput(zeroSearch.b))).b.error.code,'INSUFFICIENT_BALANCE');assert.equal(await balance(),0);
 await fixture();for(let i=0;i<10;i++)assert.equal((await search(input('qa','없는검색어'))).r.status,200);assert.equal((await search(input())).b.error.code,'ADMISSION_LIMIT');assert.equal(await balance(),100);
 await fixture();for(const mode of ['qa']){
  const found=await search(input(mode)),g=generationInput(found.b,mode),before=await balance();const success=await generate(g);assert.equal(success.r.status,200,JSON.stringify(success.b));assert.equal(success.b.credit.charged,mode==='qa'?1:7);assert.equal(await balance(),before-(mode==='qa'?1:7));
  assert.equal((await generate(g)).b.error.code,'RESULT_NOT_RETAINED');const row=await first('SELECT security_policy,network_hash FROM assistant_admissions WHERE request_id=?',g.requestId);assert.equal(row.security_policy,'account-v1');assert.equal(row.network_hash,'0'.repeat(64));
  now+=3600001;
 }
 assert.equal(calls,1);
 await fixture();const found=await search(),g=generationInput(found.b);transport=b=>{const value=valid(b);value.evidenceIds=['forged'];return response(value);};const fail=await generate(g);assert.equal(fail.b.error.code,'INVALID_OUTPUT');assert.equal(fail.b.credit.refund.applied,1);assert.equal(await balance(),100);assert.equal(calls,1);
 assert.equal(fail.r.headers.get('X-Holocron-Output-Reason'),null,'Account alone never gets diagnostics');
 // Expiry never silently recharges a completed UUID.
 now+=600001;assert.equal((await search(found.b.requestId?{...input(),requestId:found.b.requestId}:input())).r.status,409);

 // New fixture and new consent; real signed Admin token, real INVALID_OUTPUT refund.
 await fixture();const adminFound=await search(),adminGen=generationInput(adminFound.b);
 const adminToken=await m('admin/session-crypto').createAdminSessionToken('synthetic-admin-secret',now);
 transport=b=>{const value=valid(b);value.evidenceIds=['forged'];return response(value);};
 const adminFail=await generate(adminGen,adminToken,()=>{throw Error('synthetic logger outage');});
 assert.equal(adminFail.b.credit.refund.applied,1);assert.equal(await balance(),100);assert.equal(calls,1);
 assert.equal(adminFail.r.headers.get('X-Holocron-Output-Stage'),'grounding');
 assert.equal(adminFail.r.headers.get('X-Holocron-Output-Reason'),'UNKNOWN_EVIDENCE');
 assert.equal(adminFail.r.headers.get('X-Holocron-Output-Path'),'$.evidenceIds[0]');
 assert(!JSON.stringify(adminFail.b).includes('UNKNOWN_EVIDENCE'),'public body unchanged');
 const replay=await generate(adminGen,adminToken);assert.equal(calls,1);assert.equal(await balance(),100);
 assert.equal(replay.r.headers.get('X-Holocron-Output-Reason'),null,'replay cannot borrow earlier request diagnostics');
 // Unrelated archive article alone never incurs a search debit.
 await fixture();await sql("UPDATE articles SET title='스타워즈 뉴욕 코믹콘 루카스필름 출판 소식',summary='책 4권 소개'");
 const unrelated=await search(input('qa','질문 복사\n4. 스타워즈 스타파이터 제작비와 관련된 최근 소식을 알려줘.'));
 assert.equal(unrelated.b.status,'insufficient_evidence');assert.equal(unrelated.b.credit.charged,0);assert.equal(await balance(),100);assert.equal(calls,0);

 await fixture();const countBefore=(await first('SELECT count(*) AS n FROM assistant_admissions')).n;
 assert.equal((await search(input('script'))).b.error.code,'ASSISTANT_UNAVAILABLE');
 assert.equal((await generate({requestId:crypto.randomUUID(),mode:'script',receipt:'unused',selectedStoryIds:['story'],instructions:'',includeDraft:false,policyVersion:2})).b.error.code,'ASSISTANT_UNAVAILABLE');
 assert.equal(calls,0);assert.equal(await balance(),100);assert.equal((await first('SELECT count(*) AS n FROM assistant_admissions')).n,countBefore);assert.equal((await first('SELECT count(*) AS n FROM assistant_searches')).n,0);
 // Receipt-free paid chat shares qaCredits; no search charge.
 await fixture(20);const untrusted={requestId:crypto.randomUUID(),mode:'chat',query:'안녕',policyVersion:2};
 assert.notEqual((await m('assistant/generate-http').handleGenerate(req(untrusted,''),deps())).status,200);
 assert.equal((await m('assistant/generate-http').handleGenerate(req(untrusted,cookie,{Origin:'https://evil.invalid'}),deps())).status,403);
 assert.equal((await m('assistant/generate-http').handleGenerate(req({...untrusted,principalId:'forged'}),deps())).status,400);
 assert.equal((await m('assistant/generate-http').handleGenerate(req(untrusted),{...deps(),enabled:false})).status,503);
 assert.equal(await balance(),20);assert.equal(calls,0);
 for(const question of ['안녕','다스 베이더는 누구야?']){
  await fixture(20);const v={requestId:crypto.randomUUID(),mode:'chat',query:question,policyVersion:2},r=await generate(v);
  assert.equal(r.r.status,200,JSON.stringify(r.b));assert.equal(r.b.mode,'chat');assert.match(r.b.answer,/안녕하세요/);
  assert.equal(await balance(),19);assert.equal(calls,1);assert.equal((await first('SELECT COUNT(*) AS n FROM assistant_searches')).n,0);
  assert.equal((await generate(v)).b.error.code,'RESULT_NOT_RETAINED');assert.equal((await generate({...v,query:'변조'})).b.error.code,'REQUEST_CONFLICT');assert.equal(calls,1);assert.equal(await balance(),19);
 }
 await fixture(20);transport=()=>response({answer:''});const chatAdmin=await m('admin/session-crypto').createAdminSessionToken('synthetic-admin-secret',now);const bad=await generate({requestId:crypto.randomUUID(),mode:'chat',query:'안녕',policyVersion:2},chatAdmin);
 assert.equal(bad.r.headers.get('X-Holocron-Output-Reason'),'STRING_LENGTH');assert.equal(bad.r.headers.get('X-Holocron-Output-Path'),'$.answer');
 assert.equal(bad.b.error.code,'INVALID_OUTPUT');assert.equal(bad.b.credit.refund.applied,1);assert.equal(await balance(),20);assert.equal(calls,1);
 // Explicit Account limits remain effective without any network metadata.
 await fixture();const limited=await search();for(let i=0;i<5;i++)assert.equal((await generate(generationInput(limited.b))).r.status,200);
 assert.equal((await generate(generationInput(limited.b))).b.error.code,'ADMISSION_LIMIT');assert.equal(calls,5);
 await fixture();
 await db.batch(Array.from({length:200},()=>db.prepare("INSERT INTO assistant_searches(request_id,principal_id,input_hmac,owner_token,state,created_at,lease_expires_at,result_expires_at) VALUES(?,?,?,?,'failed',?,0,?)").bind(crypto.randomUUID(),owner.principalId,'a'.repeat(64),crypto.randomUUID(),now,now+600000)));
 const other=await m('identity/repository').createAccount(db,new Date(now));await credit.credit({owner:other.owner,amount:10,kind:'reward',idempotencyKey:'fund'});const otherCookie=(await m('identity/account-session').issueAccountSession(other.userId,account,now)).split(';')[0];
 assert.equal((await search(input(),otherCookie)).b.error.code,'ADMISSION_LIMIT');
 // Q&A conversational retrieval -> selected evidence -> formatted-number answer -> settlement.
 await fixture(20);
 await sql("UPDATE articles SET title='스타파이터 제작비 보도',summary='제작비는 1,000만 달러로 보도됐다. 개봉 일정은 미확정이다.' WHERE id='a'");
 await sql("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('unrelated','publishing','스타워즈 코믹콘 출판 소식','새 출판 소식','','https://example.com/book','Deadline',?,'영화','published')",new Date(now-86400000).toISOString());
 const conversational=await search(input('qa','스타파이터 제작비에 대해 자세히 알려줄래'));
 assert.equal(conversational.b.status,'ready');assert.deepEqual(conversational.b.candidates.map(c=>c.storyId),['story']);assert.equal(await balance(),20);
 transport=body=>{const evidence=JSON.parse(body.input[0].content[0].text).evidence;return response({status:'ok',answer:'제작비는 1000만 달러로 보도됐습니다.',evidenceIds:[evidence[0].evidenceId],limitations:['개봉 일정은 확인할 수 없습니다.']});};
 const partialAnswer=await generate(generationInput(conversational.b));assert.equal(partialAnswer.r.status,200);assert.equal(await balance(),19);assert.equal(calls,1);assert.equal(partialAnswer.b.evidence[0].url,'https://example.com/news');
 await fixture(20);const absent=await search(input('qa','스타파이터 제작비에 대해 자세히 알려줄래'));assert.equal(absent.b.status,'insufficient_evidence');assert.equal(await balance(),20);assert.equal(calls,0);
 await checkConversationD1({fixture,balance,invalidOutput:()=>{transport=b=>{const value=valid(b);value.evidenceIds=['forged'];return response(value);};},now:()=>now,providerCalls:()=>calls,creditState:async()=>({ownerType:'account',balance:await balance(),policy:{version:2,prices:{qa:1,planner:7}}}),handle:async(path,body)=>path.endsWith('retrieve')?m('assistant/http').handleRetrieve(req(body),deps()):m('assistant/generate-http').handleGenerate(req(body),deps())});

 // Paid chat, failed admission quota, cross-device account day and UTC/KST boundary.
 await fixture(20);const chatInput=()=>({requestId:crypto.randomUUID(),mode:'chat',query:'안녕',policyVersion:2});
 const initialLedger=(await first('SELECT count(*) AS n FROM credit_ledger')).n;
 const initialCost=(await first('SELECT COALESCE(sum(attempts),0) AS n FROM assistant_monthly_costs')).n;
 const paidChat=chatInput();const chatRace=await Promise.all([generate(paidChat),generate(paidChat)]);assert.equal(chatRace.filter(x=>x.r.status===200).length,1);assert.equal(calls,1);
 assert.equal(await balance(),19);assert.equal((await first('SELECT count(*) AS n FROM credit_ledger')).n,initialLedger+1);
 assert.equal((await first('SELECT COALESCE(sum(attempts),0) AS n FROM assistant_monthly_costs')).n,initialCost+1);
 assert.equal((await first('SELECT action,debit_entry_id,actual_cost_micros FROM assistant_admissions WHERE request_id=?',paidChat.requestId)).action,'chat');
 assert((await first('SELECT debit_entry_id FROM assistant_admissions WHERE request_id=?',paidChat.requestId)).debit_entry_id);
 const firstDay=Math.floor((now+32400000)/86400000);
 for(let i=0;i<3;i++){now+=3600001;transport=()=>response({answer:''});assert.equal((await generate(chatInput())).b.error.code,'INVALID_OUTPUT');}
 now+=3600001;const lastSlot=await Promise.all([generate(chatInput()),generate(chatInput())]);assert.equal(lastSlot.filter(r=>r.b.error.code==='INVALID_OUTPUT').length,1);assert.equal(calls,5);
 assert.equal(Math.floor((now+32400000)/86400000),firstDay);now+=3600001;
 // A newly signed session for the same account cannot reset the daily quota.
 const user=await first('SELECT user_id FROM credit_principals WHERE id=?',owner.principalId);cookie=(await m('identity/account-session').issueAccountSession(user.user_id,account,now)).split(';')[0];
 assert.equal((await generate(chatInput())).b.error.code,'ADMISSION_LIMIT');assert.equal(calls,5);assert.equal((await first('SELECT count(*) AS n FROM credit_ledger')).n,initialLedger+9);
 now=(firstDay+1)*86400000-32400000;transport=b=>response(valid(b));assert.equal((await generate(chatInput())).r.status,200);assert.equal(calls,6);
 assert.equal((await generate(paidChat)).b.error.code,'RESULT_NOT_RETAINED');
 await fixture(20);transport=()=>{throw Error('synthetic connection loss');};const lostChat=chatInput();assert.notEqual((await generate(lostChat)).r.status,200);assert.equal(calls,1);assert.equal(await balance(),20);
 const lostRow=await m('assistant/repository').readAdmission(db,lostChat.requestId);assert.equal(lostRow.state,'failed');assert.equal(lostRow.actual_cost_micros,null);assert.equal(lostRow.refund.applied,1);assert.equal((await generate(lostChat)).b.error.code,'RESULT_NOT_RETAINED');assert.equal(calls,1);
 await fixture(0);assert.equal((await generate(chatInput())).b.error.code,'INSUFFICIENT_BALANCE');assert.equal(calls,0);assert.equal(await balance(),0);
 // A new 1 CR debit with failed refund remains pending; later explicit recovery refunds exactly 1.
 await fixture(20);const pendingSearch=await search(),pendingInput=generationInput(pendingSearch.b);
 await sql("CREATE TRIGGER test_refund_outage BEFORE INSERT ON credit_ledger WHEN NEW.operation='refund' BEGIN SELECT RAISE(ABORT,'synthetic_outage'); END");
 transport=()=>response({status:'ok',answer:'bad',evidenceIds:['forged'],limitations:[]});
 const pending=await generate(pendingInput);assert.equal(pending.b.credit.settlement,'unknown');assert.equal(await balance(),19);assert.equal(calls,1);
 await sql('DROP TRIGGER test_refund_outage');now+=70000;
 const recovered=await m('assistant/admission').recoverExpiredGeneration(db,pendingInput.requestId,now);assert.equal(recovered.refund.applied,1);assert.equal(await balance(),20);assert.equal(calls,1);
 // Chat uses the same uncertain refund path; cleanup must not erase an unsettled debit.
 await fixture(20);const pendingChat=chatInput();transport=()=>response({answer:''});
 await sql("CREATE TRIGGER test_refund_outage BEFORE INSERT ON credit_ledger WHEN NEW.operation='refund' BEGIN SELECT RAISE(ABORT,'synthetic_outage'); END");
 const uncertainChat=await generate(pendingChat);assert.equal(uncertainChat.b.credit.settlement,'unknown');assert.equal(await balance(),19);
 const blockedReplay=await generate(pendingChat);assert.notEqual(blockedReplay.r.status,200);assert.equal(calls,1);
 await db.prepare(m('assistant/admission-sql').cleanupSql).bind(now+3*86400000).run();assert(await m('assistant/repository').readAdmission(db,pendingChat.requestId));
 await sql('DROP TRIGGER test_refund_outage');now+=70000;
 assert.equal((await m('assistant/admission').recoverExpiredGeneration(db,pendingChat.requestId,now)).refund.applied,1);assert.equal(await balance(),20);assert.equal(calls,1);
 // Policy lease: old revision cannot debit under the new price.
 await fixture(10);const priced=await search();assert.equal((await generate({...generationInput(priced.b),policyVersion:1})).b.error.code,'PRICE_CHANGED');assert.equal(calls,0);assert.equal(await balance(),10);

 await fixture();const monthly=await search();const month=new Date(now+9*3600000).toISOString().slice(0,7);
 await sql("INSERT INTO assistant_monthly_costs VALUES(?,30000000,0,0,1,0) ON CONFLICT(month) DO UPDATE SET reserved_micros=reserved_micros+30000000,attempts=attempts+1",month);
 assert.equal((await generate(generationInput(monthly.b))).b.error.code,'MONTHLY_BUDGET_EXCEEDED');assert.equal(calls,0);assert.equal((await generate(chatInput())).b.error.code,'MONTHLY_BUDGET_EXCEEDED');assert.equal(calls,0);
 assert.equal(outbound,0);console.log('PASS account access: no CF, auth/origin, free retrieval, no-result, replay/concurrency/lost response, rate limits, paid chat/QA, Planner public gate, refund; outbound ZERO');
}finally{await mf.dispose();await loaded.dispose();}
