import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';

const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const split=require('wrangler').unstable_splitSqlQuery;
const loaded=await loadTestModules([
  'lib/assistant/free-mvp.ts','lib/identity/repository.ts',
  'app/api/assistant/generate/route.ts','app/api/assistant/retrieve/route.ts',
  'lib/identity/account-session.ts','lib/credit/service.ts',
],{externals:['js-tiktoken/lite','js-tiktoken/ranks/o200k_base']});
const m=p=>loaded.modules[p];
const free=m('lib/assistant/free-mvp.ts');
const mf=new Miniflare({
  modules:true,compatibilityDate:'2026-05-15',
  script:'export default {fetch(){return new Response("offline")}}',
  d1Databases:['DB'],outboundService:()=>{throw new Error('REAL_NETWORK_FORBIDDEN');},
});
const accountSecret='synthetic-free-mvp-account-secret-long-enough-123',
  abuseSecret='synthetic-free-mvp-abuse-secret-long-enough-123',
  profileId='gpt-5.4-mini-2026-03-17-o200k-v1';
let now=Date.parse('2026-10-29T09:00:00.000Z'),calls=0,db,cookie,owner,credit;
let transport=()=>{throw new Error('mock not initialized');};
const deps=()=>({
  enabled:true,database:()=>db,accountSecret,abuseSecret,profileId,
  apiKey:'synthetic-test-key-not-real',now:()=>now,
  fetcher:async(url,init)=>{
    calls++;
    assert.equal(url,'https://api.openai.com/v1/responses');
    assert.equal(init.redirect,'manual');
    const body=JSON.parse(init.body);
    assert.equal(body.store,false);
    assert.deepEqual(body.tools,[]);
    assert.equal(body.max_output_tokens,1600);
    return transport(body);
  },
});
const output=data=>Response.json({
  status:'completed',model:'gpt-5.4-mini-2026-03-17',error:null,incomplete_details:null,
  usage:{input_tokens:1000,output_tokens:200},
  output:[{type:'message',role:'assistant',status:'completed',content:[
    {type:'output_text',text:JSON.stringify(data),annotations:[]},
  ]}],
});
const request=(body,c=cookie,headers={})=>new Request('https://local.test/api/assistant/free',{
  method:'POST',
  headers:{Origin:'https://local.test','Content-Type':'application/json','Sec-Fetch-Site':'same-origin',Cookie:c,...headers},
  body:JSON.stringify(body),
});
const input=(mode='chat',query='다스 베이더 소개')=>({mode,query,requestId:crypto.randomUUID()});
const call=(v=input(),c=cookie,d=deps())=>free.handleFreeMvp(request(v,c),d);
const run=async(q,...values)=>db.prepare(q).bind(...values).run();
const first=async(q,...values)=>db.prepare(q).bind(...values).first();
const count=async table=>(await first('SELECT COUNT(*) AS n FROM '+table)).n;
let checks=0;
function ok(condition,description){checks++;assert.ok(condition,description);}

try{
  db=await mf.getD1Database('DB');
  const migrations=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();
  assert.equal(migrations.at(-1),'0020_account_assistant_access.sql');
  for(const filename of migrations){
    await db.batch(split(await readFile('drizzle/'+filename,'utf8')).map(s=>db.prepare(s)));
  }
  const account=await m('lib/identity/repository.ts').createAccount(db,new Date(now));
  owner=account.owner;
  cookie=(await m('lib/identity/account-session.ts').issueAccountSession(account.userId,accountSecret,now)).split(';')[0];
  credit=m('lib/credit/service.ts').creditService(db);
  const legacyAccount=await m('lib/identity/repository.ts').createAccount(db,new Date(now));
  await credit.credit({owner:legacyAccount.owner,amount:7,kind:'reward',idempotencyKey:'legacy-fixture'});
  const protectedTables=['credit_wallets','credit_ledger','credit_policy_revisions','assistant_admissions','assistant_monthly_costs'];
  const snapshotProtected=async()=>JSON.stringify(await Promise.all(protectedTables.map(async table=>(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results)));
  const protectedBefore=await snapshotProtected();
  const balance=async()=>(await credit.getBalance(owner)).balance;
  const ledgerBefore=await count('credit_ledger'),walletBefore=await balance();
  const body={answer:'다스 베이더는 스타워즈의 주요 등장인물입니다.'};
  transport=()=>output(body);
  const v=input();
  let response=await call(v);
  assert.equal(response.status,200,await response.text().catch(()=>''));checks++;
  // No retry is performed after a failed response.
  let row=await first('SELECT * FROM assistant_searches WHERE request_id=?',v.requestId);
  assert.equal(row.state,'completed');assert.equal(row.result_cipher,'FREE_AI_MVP_V1');
  ok(!JSON.stringify(row).includes(v.query),'no question stored in DB');
  assert.equal(row.charged,0);assert.equal(row.debit_entry_id,null);
  assert.equal(await balance(),walletBefore);assert.equal(await count('credit_ledger'),ledgerBefore);
  const replay=await call(v);assert.equal(replay.status,409);
  assert.equal((await replay.json()).error.code,'RESULT_NOT_RETAINED');
  assert.equal(calls,1);

  const collision=await call({...v,query:'다른 질문'});assert.equal(collision.status,409);
  assert.equal((await collision.json()).error.code,'REQUEST_CONFLICT');assert.equal(calls,1);
  response=await call(input(),'');assert.equal(response.status,401);assert.equal(calls,1);
  response=await free.handleFreeMvp(request(input(),cookie,{Origin:'https://bad.example'}),deps());
  assert.equal(response.status,403);assert.equal(calls,1);
  response=await free.handleFreeMvp(request(input()),{...deps(),enabled:false});
  assert.equal(response.status,503);assert.equal(calls,1);
  const bad=await call({mode:'planner',query:'무단 호출',requestId:crypto.randomUUID()});
  assert.equal(bad.status,400);assert.equal(calls,1);

  // Search evidence is derived from the existing 0020 archive, never client-submitted.
  now+=3600000;
  await run("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('a','story-a','스타파이터 제작 소식','보도에 따르면 제작이 논의 중이다.','','https://example.com/news','Deadline',?,'영화','published')",
    new Date(now-86400000).toISOString());
  transport=body=>{
    assert.equal(body.text.format.name,'archive_qa');
    const evidence=JSON.parse(body.input[0].content[0].text).evidence;
    assert.equal(evidence[0].evidenceId,'a');
    return output({status:'ok',answer:'보도에 따르면 스타파이터 제작이 논의 중입니다.',evidenceIds:['a'],limitations:[]});
  };
  response=await call(input('qa','스타파이터 제작'));
  assert.equal(response.status,200);
  let result=await response.json();
  assert.equal(result.mode,'qa');assert.equal(result.sources.length,1);
  assert.equal(result.sources[0].url,'https://example.com/news');
  assert.equal(await balance(),walletBefore);assert.equal(await count('credit_ledger'),ledgerBefore);
  const lastCount=calls;
  response=await call(input('qa','존재하지않는가상기사키워드'));
  assert.equal(response.status,200);result=await response.json();
  assert.equal(result.status,'insufficient_evidence');assert.equal(calls,lastCount);
  // At most three requests per minute from one Account.
  now+=3600000;
  transport=()=>output(body);
  for(let i=0;i<free.FREE_MVP_LIMITS.accountMinute;i++){
    const admitted=await free.admitFreeMvp(db,owner.principalId,input(),abuseSecret,now);
    await run("UPDATE assistant_searches SET state='completed',lease_expires_at=0 WHERE request_id=?",admitted.id);
  }
  await assert.rejects(free.admitFreeMvp(db,owner.principalId,input(),abuseSecret,now),
    e=>e.code==='ADMISSION_LIMIT');
  assert.equal(await count('credit_ledger'),ledgerBefore);
  assert.equal(await balance(),walletBefore);
  for(const route of ['generate','retrieve']){
    const disabled=m('app/api/assistant/'+route+'/route.ts');
    assert.equal((await disabled.POST(request(input()))).status,503);
  }
  // Bad identity, body, origin and client-selected evidence never reach Provider.
  now+=3600000;
  const blockedCalls=calls;
  for(const headers of [{Origin:''},{'Sec-Fetch-Site':'same-site'}]){
    assert.equal((await free.handleFreeMvp(request(input(),cookie,headers),deps())).status,403);
  }
  assert.equal((await call(input(),'holocron_account=forged')).status,401);
  assert.equal((await call({...input(),evidenceIds:['a']})).status,400);
  assert.equal((await call(input('chat','x'.repeat(501)))).status,400);
  assert.equal(calls,blockedCalls);

  // Provider failure and malformed output consume one attempt, never retry.
  const failure=input();transport=()=>new Response('',{status:503});
  assert.equal((await call(failure)).status,503);
  assert.equal(calls,blockedCalls+1);
  assert.equal((await call(failure)).status,409);
  assert.equal(calls,blockedCalls+1);
  const diagnostics=[];
  transport=()=>output({answer:42});
  assert.equal((await call(input(),cookie,{...deps(),onOutputDiagnostic:d=>diagnostics.push(d)})).status,502);
  assert.deepEqual(diagnostics,[{stage:'schema',reason:'SCHEMA_TYPE',path:'$.answer'}]);
  now+=3600000;
  transport=()=>output({answer:'<script>bad</script>'});
  assert.equal((await call()).status,502);
  assert.equal((await first('SELECT state FROM assistant_searches WHERE request_id=?',failure.requestId)).state,'failed');

  // Single UUID in parallel: only one transport, even while response is pending.
  now+=3600000;
  let release,entered;
  const started=new Promise(resolve=>{entered=resolve;});
  transport=()=>{entered();return new Promise(resolve=>{release=()=>resolve(output(body));});};
  const parallel=input(),beforeParallel=calls,firstCall=call(parallel);
  await started;
  assert.equal((await call(parallel)).status,409);
  release();assert.equal((await firstCall).status,200);assert.equal(calls,beforeParallel+1);

  // Disconnect: abort is propagated, a new replay cannot repeat the Provider.
  now+=3600000;
  const abort=new AbortController(),lost=input();
  let abortEntered;
  const abortStarted=new Promise(resolve=>{abortEntered=resolve;});
  transport=()=>{abortEntered();return new Promise(()=>{});};
  const lostResponse=free.handleFreeMvp(new Request(request(lost),{signal:abort.signal}),deps());
  await abortStarted;abort.abort();
  assert.equal((await lostResponse).status,409);
  assert.equal((await call(lost)).status,409);

  // Public evidence modified during generation must not be shown.
  now+=3600000;
  transport=async()=>{
    await run("UPDATE articles SET status='excluded' WHERE id='a'");
    return output({status:'ok',answer:'보도에 따르면 제작이 논의 중입니다.',evidenceIds:['a'],limitations:[]});
  };
  assert.equal((await call(input('qa','스타파이터 제작'))).status,409);

  // Ambiguous D1 acknowledgement: never repeat a possibly committed admission/call.
  function uncertainDb(fragment){return {prepare(sql){
    const wrap=statement=>new Proxy(statement,{get(target,key){
      if(key==='bind')return(...args)=>wrap(target.bind(...args));
      if(key==='run')return async()=>{const result=await target.run();if(sql.includes(fragment))throw Error('synthetic lost DB acknowledgement');return result;};
      const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
    }});return wrap(db.prepare(sql));
  }};}
  now+=3600000;transport=()=>output(body);
  const uncertain=input(),beforeUncertain=calls;
  assert.equal((await call(uncertain,cookie,{...deps(),database:()=>uncertainDb('INSERT OR IGNORE')})).status,500);
  assert.equal(calls,beforeUncertain);
  assert.equal((await call(uncertain)).status,409);
  const finished=input();
  assert.equal((await call(finished,cookie,{...deps(),database:()=>uncertainDb('UPDATE assistant_searches')})).status,500);
  assert.equal(calls,beforeUncertain+1);
  assert.equal((await call(finished)).status,409);assert.equal(calls,beforeUncertain+1);

  // Preserve old paid/search rows and prevent replay after the old 3-day cleanup horizon.
  const historical=crypto.randomUUID();
  await run("INSERT INTO assistant_searches(request_id,principal_id,input_hmac,owner_token,state,result_cipher,created_at,lease_expires_at,result_expires_at) VALUES(?,?,?,?,'completed',?,?,0,?)",
    historical,owner.principalId,'0'.repeat(64),'legacy-owner','legacy-ciphertext',now-10*86400000,now-9*86400000);
  const historicalBefore=JSON.stringify(await first('SELECT * FROM assistant_searches WHERE request_id=?',historical));
  now+=4*86400000;
  const handle=await free.admitFreeMvp(db,owner.principalId,input(),abuseSecret,now);
  await run("UPDATE assistant_searches SET state='completed',lease_expires_at=0 WHERE request_id=?",handle.id);
  await assert.rejects(free.admitFreeMvp(db,owner.principalId,v,abuseSecret,now),e=>e.code==='RESULT_NOT_RETAINED');
  assert.equal(JSON.stringify(await first('SELECT * FROM assistant_searches WHERE request_id=?',historical)),historicalBefore);

  // Hour limit: failures count, rolling minute reset does not reset the hour.
  now+=86400000;
  for(let i=0;i<8;i++){
    const h=await free.admitFreeMvp(db,owner.principalId,input(),abuseSecret,now+i*61000);
    await run("UPDATE assistant_searches SET state='failed',lease_expires_at=0 WHERE request_id=?",h.id);
  }
  await assert.rejects(free.admitFreeMvp(db,owner.principalId,input(),abuseSecret,now+8*61000),e=>e.code==='ADMISSION_LIMIT');

  assert.equal(await snapshotProtected(),protectedBefore,'all chat/QA requests preserve every protected row');
  // Multiple accounts/isolates share the atomic global concurrency and KST quota.
  const principals=[owner.principalId];
  for(let i=0;i<5;i++)principals.push((await m('lib/identity/repository.ts').createAccount(db,new Date(now))).owner.principalId);
  const afterAccounts=await snapshotProtected();
  now+=86400000;
  const simultaneous=await Promise.allSettled(principals.map(p=>free.admitFreeMvp(db,p,input(),abuseSecret,now)));
  assert.equal(simultaneous.filter(x=>x.status==='fulfilled').length,3);
  const shared=input();
  now+=3600000;
  const original=await free.admitFreeMvp(db,principals[0],shared,abuseSecret,now);
  await assert.rejects(free.admitFreeMvp(db,principals[1],shared,abuseSecret,now),e=>e.code==='REQUEST_CONFLICT');
  await run("UPDATE assistant_searches SET state='completed',lease_expires_at=0 WHERE request_id=?",original.id);
  now=Date.parse('2026-11-10T14:50:00Z'); // 23:50 KST
  for(let i=0;i<39;i++){
    const h=await free.admitFreeMvp(db,principals[i%6],input(),abuseSecret,now+Math.floor(i/6)*61000);
    await run("UPDATE assistant_searches SET state='completed',lease_expires_at=0 WHERE request_id=?",h.id);
  }
  const dayRace=await Promise.allSettled(principals.map(p=>free.admitFreeMvp(db,p,input(),abuseSecret,now+8*61000)));
  assert.equal(dayRace.filter(x=>x.status==='fulfilled').length,1,'atomic final KST-day slot');
  await assert.rejects(free.admitFreeMvp(db,principals[5],input(),abuseSecret,now+9*61000),e=>e.code==='ADMISSION_LIMIT');
  await free.admitFreeMvp(db,principals[5],input(),abuseSecret,Date.parse('2026-11-10T15:00:00Z'));
  assert.equal(await snapshotProtected(),afterAccounts,'free requests never modify protected accounting tables');
  // Synthetic account creation above is intentionally excluded from request no-mutation audit.
  assert.ok(protectedBefore);
  const freeCount=(await first("SELECT count(*) n FROM assistant_searches WHERE result_cipher='FREE_AI_MVP_V1'")).n;
  await run("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<?) INSERT INTO assistant_searches(request_id,principal_id,input_hmac,owner_token,state,result_cipher,created_at,lease_expires_at,result_expires_at) SELECT 'capacity-'||x,?,?,?,'completed','FREE_AI_MVP_V1',0,0,0 FROM n",free.FREE_MVP_LIMITS.capacity-freeCount,owner.principalId,'0'.repeat(64),'synthetic-owner');
  await assert.rejects(free.admitFreeMvp(db,owner.principalId,input(),abuseSecret,now+86400000),e=>e.code==='ADMISSION_LIMIT');
  const flags={};globalThis.__freeFlags=flags;
  const routeCheck=await loadTestModules(['app/api/assistant/free/route.ts'],{stubs:{'cloudflare:workers':'export const env=globalThis.__freeFlags;', '@/lib/news':'export const db=()=>{throw Error("OFF touched database");};', '@/lib/assistant/generation-config':'export const assistantGenerationConfig=()=>({enabled:globalThis.__freeFlags.HOLOCRON_ASSISTANT_ENABLED==="true",identitySecrets:{}});'},externals:['js-tiktoken/lite','js-tiktoken/ranks/o200k_base']});
  try{for(const [ai,freeFlag] of [['false','true'],['true','false'],['false','false']]){flags.HOLOCRON_ASSISTANT_ENABLED=ai;flags.HOLOCRON_ASSISTANT_FREE_MVP_ENABLED=freeFlag;assert.equal((await routeCheck.modules['app/api/assistant/free/route.ts'].POST(request(input()))).status,503);}}finally{await routeCheck.dispose();delete globalThis.__freeFlags;}
  console.log('Extended cases PASS: authentication/origin/body, failure, parallel UUID, disconnect, evidence change, retained UUID, legacy row preservation, hourly/global/KST quotas, protected table snapshots');
  const paidAdmissions=await count('assistant_admissions');
  assert.equal(paidAdmissions,0);
  ok((await readFile('drizzle/meta/_journal.json','utf8')).includes('0020_account_assistant_access'),'journal contains 0020');
  console.log('Free AI MVP isolated 0020 checks PASS:',checks,'extra assertions; provider requests mocked:',calls);
}finally{
  await loaded.dispose();await mf.dispose();
}
