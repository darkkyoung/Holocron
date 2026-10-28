import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
import assert from 'node:assert/strict';
import {checkConversationD1} from './assistant-conversation-d1-check.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
const paths=['assistant/admin-output-diagnostic','admin/session-crypto','assistant/http','assistant/generate-http','assistant/account-access','assistant/account-search','assistant/receipts','assistant/service','identity/repository','identity/account-session','credit/service','backup/export','backup/validator','backup/restore-plan'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts'),{externals:['js-tiktoken/lite','js-tiktoken/ranks/o200k_base']}),m=p=>loaded.modules['lib/'+p+'.ts'];
let outbound=0,calls=0,now=Date.parse('2026-10-22T00:00:00Z');
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response("local")}}',d1Databases:['DB'],outboundService:()=>{outbound++;throw Error('NO NETWORK');}});
const secret='synthetic-signing-secret-at-least-32-bytes',account='synthetic-account-secret-at-least-32-bytes',abuseSecret='synthetic-abuse-secret-at-least-32-bytes';
let db,owner,cookie,credit,transport;
const sql=(s,...args)=>db.prepare(s).bind(...args).run(),first=(s,...args)=>db.prepare(s).bind(...args).first();
const deps=()=>({enabled:true,accessPolicy:'account-v1',secret,abuseSecret,identitySecrets:{account},database:()=>db,now:()=>now,network:()=>{throw Error('MUST NOT READ IP');},profileId:'gpt-5.4-mini-2026-03-17-o200k-v1',apiKey:'synthetic-not-a-key',fetcher:async(url,init)=>{calls++;return transport(JSON.parse(init.body));}});
const req=(body,c=cookie,extra={})=>new Request('https://local.test/api/assistant/retrieve',{method:'POST',headers:{Origin:'https://local.test','Content-Type':'application/json',Cookie:c,...extra},body:JSON.stringify(body)});
const input=(mode='qa',query='스타파이터')=>({requestId:crypto.randomUUID(),mode,query,filters:{}});
const search=async(v=input(),c=cookie,d=deps())=>{const r=await m('assistant/http').handleRetrieve(req(v,c),d);return {r,b:await r.json()};};
const balance=async()=>(await credit.getBalance(owner)).balance;
function valid(body){return mvpOutput(body.text.format.name==='archive_qa'?'qa':'script',JSON.parse(body.input[0].content[0].text).evidence);}
const response=value=>Response.json({status:'completed',model:'gpt-5.4-mini-2026-03-17',error:null,incomplete_details:null,usage:{input_tokens:1000,output_tokens:200},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value),annotations:[]}]}]});
async function fixture(amount=100){
 now+=86400000;await sql('DELETE FROM assistant_searches');await sql('DELETE FROM assistant_admissions');await sql('DELETE FROM articles');
 await sql("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('a','story','스타파이터 제작 소식','보도에 따르면 제작이 논의 중이다.','','https://example.com/news','Deadline',?,'영화','published')",new Date(now-86400000).toISOString());
 const a=await m('identity/repository').createAccount(db,new Date(now));owner=a.owner;cookie=(await m('identity/account-session').issueAccountSession(a.userId,account,now)).split(';')[0];
 if(amount)await credit.credit({owner,amount,kind:'reward',idempotencyKey:'fund'});calls=0;transport=b=>response(valid(b));
}
const generationInput=(s,mode='qa')=>({requestId:crypto.randomUUID(),mode,receipt:s.receipt,selectedStoryIds:['story'],instructions:'',includeDraft:false,policyVersion:1});
async function generate(v,adminToken='',logger=()=>{}){const r=await m('assistant/admin-output-diagnostic').withAdminOutputDiagnostic(observer=>m('assistant/generate-http').handleGenerate(req(v),{...deps(),onOutputDiagnostic:observer}),async()=>!!await m('admin/session-crypto').verifyAdminSessionToken(adminToken,'synthetic-admin-secret',now),logger);return {r,b:await r.json()};}
try{
 db=await mf.getD1Database('DB');for(const file of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+file,'utf8')).map(s=>db.prepare(s)));credit=m('credit/service').creditService(db);
 await fixture();assert.equal((await search(input(),'')).r.status,401);assert.equal((await search(input(),'__Host-holocron_account=forged')).r.status,401);assert.equal(await balance(),100);
 const v=input(),ok=await search(v);assert.equal(ok.r.status,200,JSON.stringify(ok.b));assert.equal(ok.b.credit.charged,1);assert.equal(await balance(),99);assert(ok.b.receipt);assert.equal(req(v).cf,undefined);
 assert.deepEqual((await search(v)).b,ok.b);assert.equal(await balance(),99);
 assert.equal((await search({...v,query:'changed'})).b.error.code,'REQUEST_CONFLICT');
 const settled=await first('SELECT * FROM assistant_searches WHERE request_id=?',v.requestId);assert(!settled.result_cipher.includes('스타파이터'));assert(!settled.result_cipher.includes(ok.b.receipt));
 assert.equal((await search(input('qa','없는검색어'))).b.credit.charged,0);assert.equal(await balance(),99);
 for(const id of ['1','2'])await sql("INSERT INTO works(id,title,original_title,type,status,poster_url,season_number) VALUES(?,?,?,'드라마','archive','',?)",id,'아소카 시즌 '+id,'Ahsoka',id);
 const clarification=await search(input('qa','아소카'));assert.equal(clarification.b.status,'clarification');assert.equal(clarification.b.credit.charged,0);assert.equal(await balance(),99);
 const wrong=await m('assistant/http').handleRetrieve(req(input(),cookie,{Origin:'https://evil.invalid','CF-Connecting-IP':'1.1.1.1'}),deps());assert.equal(wrong.status,403);
 assert.equal((await search(input(),cookie,{...deps(),enabled:false})).b.error.code,'ASSISTANT_UNAVAILABLE');
 // Same request concurrent claims: one charge; later replay recovers identical output.
 await fixture();const parallel=input(),r=await Promise.all([search(parallel),search(parallel)]);assert(r.some(x=>x.r.status===200));assert.equal(await balance(),99);assert.equal((await search(parallel)).b.credit.charged,1);
 // Simulate committed transaction with lost response. Retry reads stored result, no second debit.
 await fixture(1);const lost=input();let dropped=false;
 const marked=new WeakSet();const lossy={prepare:s=>{const st=db.prepare(s);return {bind:(...args)=>{const bound=st.bind(...args);if(s.includes('search_atomicity_failed'))marked.add(bound);return bound;}};},withSession:s=>db.withSession(s),batch:async statements=>{const result=await db.batch(statements);if(!dropped&&statements.some(s=>marked.has(s))){dropped=true;throw Error('lost response');}return result;}};
 const lostResponse=await search(lost,cookie,{...deps(),database:()=>lossy});assert(dropped);assert.equal(lostResponse.r.status,500);assert.equal(await balance(),0);assert.equal((await search(lost)).r.status,200);assert.equal(await balance(),0);
 // Process interruption immediately after attempt claim, before any result/debit.
 await fixture();const interrupted=input();let interrupt=true;
 const crashDb={prepare:s=>db.prepare(s),withSession:s=>db.withSession(s),batch:async statements=>{const r=await db.batch(statements);if(interrupt){interrupt=false;throw Error('process interrupted');}return r;}};
 assert.equal((await search(interrupted,cookie,{...deps(),database:()=>crashDb})).r.status,500);assert.equal(await balance(),100);
 assert.equal((await search(interrupted)).b.error.code,'REQUEST_IN_PROGRESS');now+=60001;
 assert.equal((await search(interrupted)).r.status,200);assert.equal(await balance(),99);
 // Crash before computation/charge: stale lease takeover, same request only.
 await fixture();const crash=input();
 const broken={prepare:s=>db.prepare(s),batch:s=>db.batch(s),withSession:()=>{throw Error('archive failure');}};
 assert.equal((await search(crash,cookie,{...deps(),database:()=>broken})).r.status,503);assert.equal(await balance(),100);assert.equal((await search(crash)).b.error.code,'RESULT_NOT_RETAINED');
 await fixture(0);assert.equal((await search()).b.error.code,'INSUFFICIENT_BALANCE');assert.equal(await balance(),0);
 await fixture();for(let i=0;i<10;i++)assert.equal((await search(input('qa','없는검색어'))).r.status,200);assert.equal((await search(input())).b.error.code,'ADMISSION_LIMIT');assert.equal(await balance(),100);
 await fixture();for(const mode of ['qa','script']){
  const found=await search(input(mode)),g=generationInput(found.b,mode),before=await balance();const success=await generate(g);assert.equal(success.r.status,200,JSON.stringify(success.b));assert.equal(success.b.credit.charged,mode==='qa'?5:7);assert.equal(await balance(),before-(mode==='qa'?5:7));
  assert.equal((await generate(g)).b.error.code,'RESULT_NOT_RETAINED');const row=await first('SELECT security_policy,network_hash FROM assistant_admissions WHERE request_id=?',g.requestId);assert.equal(row.security_policy,'account-v1');assert.equal(row.network_hash,'0'.repeat(64));
  now+=3600001;
 }
 assert.equal(calls,2);
 await fixture();const found=await search(),g=generationInput(found.b);transport=b=>{const value=valid(b);value.evidenceIds=['forged'];return response(value);};const fail=await generate(g);assert.equal(fail.b.error.code,'INVALID_OUTPUT');assert.equal(fail.b.credit.refund.applied,5);assert.equal(await balance(),99);assert.equal(calls,1);
 assert.equal(fail.r.headers.get('X-Holocron-Output-Reason'),null,'Account alone never gets diagnostics');
 // Expiry never silently recharges a completed UUID.
 now+=600001;assert.equal((await search(found.b.requestId?{...input(),requestId:found.b.requestId}:input())).r.status,409);

 // New fixture and new consent; real signed Admin token, real INVALID_OUTPUT refund.
 await fixture();const adminFound=await search(),adminGen=generationInput(adminFound.b);
 const adminToken=await m('admin/session-crypto').createAdminSessionToken('synthetic-admin-secret',now);
 transport=b=>{const value=valid(b);value.evidenceIds=['forged'];return response(value);};
 const adminFail=await generate(adminGen,adminToken,()=>{throw Error('synthetic logger outage');});
 assert.equal(adminFail.b.credit.refund.applied,5);assert.equal(await balance(),99);assert.equal(calls,1);
 assert.equal(adminFail.r.headers.get('X-Holocron-Output-Stage'),'grounding');
 assert.equal(adminFail.r.headers.get('X-Holocron-Output-Reason'),'UNKNOWN_EVIDENCE');
 assert.equal(adminFail.r.headers.get('X-Holocron-Output-Path'),'$.evidenceIds[0]');
 assert(!JSON.stringify(adminFail.b).includes('UNKNOWN_EVIDENCE'),'public body unchanged');
 const replay=await generate(adminGen,adminToken);assert.equal(calls,1);assert.equal(await balance(),99);
 assert.equal(replay.r.headers.get('X-Holocron-Output-Reason'),null,'replay cannot borrow earlier request diagnostics');
 // Unrelated archive article alone never incurs a search debit.
 await fixture();await sql("UPDATE articles SET title='스타워즈 뉴욕 코믹콘 루카스필름 출판 소식',summary='책 4권 소개'");
 const unrelated=await search(input('qa','질문 복사\n4. 스타워즈 스타파이터 제작비와 관련된 최근 소식을 알려줘.'));
 assert.equal(unrelated.b.status,'insufficient_evidence');assert.equal(unrelated.b.credit.charged,0);assert.equal(await balance(),100);assert.equal(calls,0);

 // Explicit Account limits remain effective without any network metadata.
 await fixture();const limited=await search();for(let i=0;i<5;i++)assert.equal((await generate(generationInput(limited.b))).r.status,200);
 assert.equal((await generate(generationInput(limited.b))).b.error.code,'ADMISSION_LIMIT');assert.equal(calls,5);
 await fixture();
 await db.batch(Array.from({length:200},()=>db.prepare("INSERT INTO assistant_searches(request_id,principal_id,input_hmac,owner_token,state,created_at,lease_expires_at,result_expires_at) VALUES(?,?,?,?,'failed',?,0,?)").bind(crypto.randomUUID(),owner.principalId,'a'.repeat(64),crypto.randomUUID(),now,now+600000)));
 const other=await m('identity/repository').createAccount(db,new Date(now));await credit.credit({owner:other.owner,amount:10,kind:'reward',idempotencyKey:'fund'});const otherCookie=(await m('identity/account-session').issueAccountSession(other.userId,account,now)).split(';')[0];
 assert.equal((await search(input(),otherCookie)).b.error.code,'ADMISSION_LIMIT');
 await checkConversationD1({fixture,balance,invalidOutput:()=>{transport=b=>{const value=valid(b);value.evidenceIds=['forged'];return response(value);};},now:()=>now,providerCalls:()=>calls,creditState:async()=>({ownerType:'account',balance:await balance(),policy:{version:1,prices:{qa:5,planner:7}}}),handle:async(path,body)=>path.endsWith('retrieve')?m('assistant/http').handleRetrieve(req(body),deps()):m('assistant/generate-http').handleGenerate(req(body),deps())});
 await fixture();const monthly=await search();const month=new Date(now+9*3600000).toISOString().slice(0,7);
 await sql("INSERT INTO assistant_monthly_costs VALUES(?,30000000,0,0,1,0) ON CONFLICT(month) DO UPDATE SET reserved_micros=reserved_micros+30000000,attempts=attempts+1",month);
 assert.equal((await generate(generationInput(monthly.b))).b.error.code,'MONTHLY_BUDGET_EXCEEDED');assert.equal(calls,0);
 assert.equal(outbound,0);console.log('PASS account access: no CF, auth/origin, paid retrieval, no-result, replay/concurrency/lost response, rate limits, QA/Guide, refund; outbound ZERO');
}finally{await mf.dispose();await loaded.dispose();}
