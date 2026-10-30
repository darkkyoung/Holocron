// Actual packaged Worker, local D1 0020, synthetic identities, no live network.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
const root=resolve('dist/server'),config=JSON.parse(await readFile(join(root,'wrangler.json')));
const modules=(await readdir(root,{recursive:true})).filter(f=>f.endsWith('.js')).sort((a,b)=>a===config.main?-1:b===config.main?1:a.localeCompare(b)).map(f=>({type:'ESModule',path:join(root,f)}));
const loaded=await loadTestModules(['lib/identity/repository.ts','lib/identity/account-session.ts']);
const accountSecret='synthetic-free-built-account-secret-32-bytes';
let calls=0,unexpected=0,mode='success';const events=[];
const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,d1Databases:['DB'],
 handleStructuredLogs:e=>{events.push(e);},
 bindings:{HOLOCRON_ASSISTANT_ENABLED:'true',HOLOCRON_ASSISTANT_FREE_MVP_ENABLED:'true',HOLOCRON_ASSISTANT_SIGNING_SECRET:'synthetic-signing-key-long-enough-for-test',HOLOCRON_ASSISTANT_ABUSE_SECRET:'synthetic-abuse-key-long-enough-for-test',HOLOCRON_ACCOUNT_SESSION_SECRET:accountSecret,HOLOCRON_ASSISTANT_PROFILE:'gpt-5.4-mini-2026-03-17-o200k-v1',HOLOCRON_ASSISTANT_OPENAI_API_KEY:'synthetic-not-a-key'},
 outboundService:async r=>{
  if(r.url!=='https://api.openai.com/v1/responses'){unexpected++;throw Error('NETWORK_FORBIDDEN');}
  calls++;const b=await r.json();assert.equal(b.model,'gpt-5.4-mini-2026-03-17');assert.equal(b.store,false);
  const value=mode==='invalid'?{answer:42}:b.text.format.name==='general_chat'?{answer:'안녕하세요! 스타워즈 이야기를 나눠요.'}:{status:'ok',answer:'보도에 따르면 제작이 논의 중입니다.',evidenceIds:['a'],limitations:[]};
  return Response.json({status:'completed',model:b.model,error:null,incomplete_details:null,usage:{input_tokens:1000,output_tokens:200},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value),annotations:[]}]}]});
 }});
try{
 const db=await mf.getD1Database('DB');const migrations=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();assert.equal(migrations.at(-1),'0020_account_assistant_access.sql');
 for(const f of migrations)await db.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 const cookies=[];
 for(let i=0;i<3;i++){const a=await loaded.modules['lib/identity/repository.ts'].createAccount(db,new Date());cookies.push((await loaded.modules['lib/identity/account-session.ts'].issueAccountSession(a.userId,accountSecret)).split(';')[0]);}
 await db.prepare("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('a','s','스타파이터 제작 소식','보도에 따르면 제작이 논의 중이다.','','https://example.com/news','Deadline',?,'영화','published')").bind(new Date().toISOString()).run();
 const tables=['credit_wallets','credit_ledger','credit_policy_revisions','assistant_admissions','assistant_monthly_costs'];
 const snapshot=async()=>JSON.stringify(await Promise.all(tables.map(async t=>(await db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()).results)));
 const before=await snapshot();
 const input=(mode='chat',query='안녕')=>({mode,query,requestId:crypto.randomUUID()});
 const call=(body,cookie=cookies[0],path='free',origin='https://local.test')=>mf.dispatchFetch('https://local.test/api/assistant/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
 assert.equal((await call(input(),'')).status,401);
 assert.equal((await call(input(),cookies[0],'free','https://foreign.invalid')).status,403);
 for(const path of ['retrieve','generate'])assert.equal((await call(input(),cookies[0],path)).status,503);
 const chat=input();let r=await call(chat);assert.equal(r.status,200);assert.match((await r.json()).answer,/안녕하세요/);assert.equal(calls,1);
 assert.equal((await call(chat)).status,409);assert.equal(calls,1);
 r=await call(input('qa','스타파이터 제작'));assert.equal(r.status,200);assert.equal((await r.json()).sources[0].url,'https://example.com/news');
 r=await call(input('qa','존재하지않는유니콘'));assert.equal((await r.json()).status,'insufficient_evidence');assert.equal(calls,2);
 mode='invalid';r=await call(input(),cookies[1]);assert.equal(r.status,502);assert.equal((await r.json()).error.code,'INVALID_OUTPUT');
 for(let i=0;i<25&&!events.some(e=>e.message.includes('ASSISTANT_OUTPUT_DIAGNOSTIC_V1'));i++)await new Promise(resolve=>setTimeout(resolve,20));
 const diagnostic=events.find(e=>e.message.includes('ASSISTANT_OUTPUT_DIAGNOSTIC_V1'));assert(diagnostic);assert.equal(diagnostic.level,'warn');assert.deepEqual(JSON.parse(diagnostic.message),{event:'ASSISTANT_OUTPUT_DIAGNOSTIC_V1',stage:'schema',reason:'SCHEMA_TYPE',path:'$.answer'});
 assert.equal(await snapshot(),before);assert.equal(calls,3);assert.equal(unexpected,0);
 assert.equal(config.assets.run_worker_first,true);
 console.log('Packaged Worker PASS: signed Account/Origin, zero-balance chat + archive QA, no evidence/no Provider, replay, disabled paid routes, real WARN sink, all protected accounting rows unchanged; 3 Mock calls, live outbound 0.');
}finally{await mf.dispose();await loaded.dispose();}
