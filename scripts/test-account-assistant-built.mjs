import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
const root=resolve('dist/server'),config=JSON.parse(await readFile(join(root,'wrangler.json'))),modules=(await readdir(root,{recursive:true})).filter(f=>f.endsWith('.js')).sort((a,b)=>a===config.main?-1:b===config.main?1:a.localeCompare(b)).map(f=>({type:'ESModule',path:join(root,f)}));
const loaded=await loadTestModules(['lib/identity/repository.ts','lib/identity/account-session.ts','lib/credit/service.ts']),m=p=>loaded.modules['lib/'+p+'.ts'];
let mocked=0,outbound=0;
const accountSecret='synthetic-account-key-built-worker-32-bytes';
const mf=new Miniflare({workers:[
 {name:'untrusted-upstream',modules:true,compatibilityDate:config.compatibility_date,serviceBindings:{APP:'app'},script:`export default {fetch(r,e){const x=new Request(r,{cf:{}});x.headers.delete('CF-Connecting-IP');return e.APP.fetch(x);}}`},
 {name:'app',modules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,d1Databases:['DB'],bindings:{HOLOCRON_ASSISTANT_ENABLED:'true',HOLOCRON_ASSISTANT_SIGNING_SECRET:'synthetic-signing-secret-built-worker-32-bytes',HOLOCRON_ASSISTANT_ABUSE_SECRET:'synthetic-abuse-secret-built-worker-32-bytes',HOLOCRON_ACCOUNT_SESSION_SECRET:accountSecret,HOLOCRON_ASSISTANT_PROFILE:'gpt-5.4-mini-2026-03-17-o200k-v1',HOLOCRON_ASSISTANT_OPENAI_API_KEY:'synthetic-not-a-real-key'},outboundService:async request=>{
  if(request.url!=='https://api.openai.com/v1/responses'){outbound++;throw Error('EXTERNAL_OUTBOUND_FORBIDDEN');}mocked++;
  const body=await request.json(),a=JSON.parse(body.input[0].content[0].text).evidence[0],fact={text:a.summary,evidenceIds:[a.evidenceId],certainty:'attributed_report',supports:[{evidenceId:a.evidenceId,field:'summary',span:a.summary}]};
  const value=body.text.format.name==='archive_qa'?{status:'ok',answer:[fact],limitations:['선택된 요약만 사용했습니다.']}:{status:'ok',facts:[{factId:'f',...fact}],caveats:[],outline:[{heading:'소식 소개',factIds:['f'],creativeNote:'도입 화면을 구성합니다.'}],draft:[]};
  return Response.json({status:'completed',model:'gpt-5.4-mini-2026-03-17',error:null,incomplete_details:null,usage:{input_tokens:1000,output_tokens:200},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value),annotations:[]}]}]});
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
}finally{await mf.dispose();await loaded.dispose();}
