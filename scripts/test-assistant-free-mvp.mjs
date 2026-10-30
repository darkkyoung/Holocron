import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';

const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const split=require('wrangler').unstable_splitSqlQuery;
const loaded=await loadTestModules([
  'lib/assistant/free-mvp.ts','lib/identity/repository.ts',
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
  const balance=async()=>(await credit.getBalance(owner)).balance;
  const ledgerBefore=await count('credit_ledger'),walletBefore=await balance();
  const body={answer:'다스 베이더는 스타워즈의 주요 등장인물입니다.'};
  transport=()=>output(body);
  const v=input();
  let response=await call(v);
  assert.equal(response.status,200,await response.text().catch(()=>''));checks++;
  // The body was consumed above if status had failed; re-run with a new UUID only in failure.
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
  const paidAdmissions=await count('assistant_admissions');
  assert.equal(paidAdmissions,0);
  ok((await readFile('drizzle/meta/_journal.json','utf8')).includes('0020_account_assistant_access'),'journal contains 0020');
  console.log('Free AI MVP isolated 0020 checks PASS:',checks,'extra assertions; provider requests mocked:',calls);
}finally{
  await loaded.dispose();await mf.dispose();
}
