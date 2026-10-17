import strict from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,appendFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {loadCorpus} from './assistant-eval/corpus.mjs';
import {openBudget,validateApproval,MODEL,PROFILE} from './assistant-eval/budget.mjs';
import {localRuntime,audit} from './assistant-eval/local-runtime.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
import {extractPublic} from './assistant-eval/import-public.mjs';
import {reviewTemplate,scoreReview} from './assistant-eval/review.mjs';
import {run,options} from './assistant-eval/run.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const {corpus,cases,hashes}=await loadCorpus(),root=await mkdtemp(join(tmpdir(),'holocron-eval-test-'));
const config={profile:PROFILE,...hashes,maxCalls:40,maxMicros:2000000};
let runtime;
try{
 const publicProps={initial:false,stories:[{topic:'public-story',workIds:[],articles:[{...corpus.articles[0],topic:'public-story',status:'published',titleOverride:'effective <script>test only</script>',privateField:'must-not-copy'}]}],workOptions:[]};
 const html='<script>(globalThis.fixture??={rsc:[]}).rsc.push('+JSON.stringify('1:'+JSON.stringify(publicProps)+'\n')+')</script>';
 const extracted=extractPublic(html,corpus.capturedAt);assert.equal(extracted.articles[0].title,'effective <script>test only</script>');assert(!('privateField' in extracted.articles[0]));assert.equal(globalThis.fixture,undefined);
 const privateProps=structuredClone(publicProps);privateProps.stories[0].articles[0].status='review';
 assert.throws(()=>extractPublic('.rsc.push('+JSON.stringify('1:'+JSON.stringify(privateProps)+'\n')+')',corpus.capturedAt),/PUBLIC_PROJECTION_UNAVAILABLE/);
 const template=reviewTemplate(cases,hashes);assert.throws(()=>scoreReview(template,cases,hashes),/INCOMPLETE_REVIEW/);
 const rated={...template,reviewer:'synthetic-review-test',rows:template.rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,k==='caseId'?v:k==='critical'?[]:['usefulCompletion','safeHandling'].includes(k)?true:2])))};
 assert.equal(scoreReview(rated,cases,hashes).status,'REVIEWED_QUALITY_PASS');rated.rows[0].critical=['unsupported_fact'];assert.equal(scoreReview(rated,cases,hashes).status,'QUALITY_BLOCKED');rated.rows[0].critical=[];
 for(const r of rated.rows)r.usefulCompletion=false;assert.equal(scoreReview(rated,cases,hashes).status,'QUALITY_BLOCKED');
 assert.equal(cases.length,46);assert.equal(cases.filter(c=>c.origin==='public_archive').length,30);assert.equal(cases.filter(c=>c.origin==='synthetic_adversarial').length,16);
 assert.equal(corpus.articles.length,77);assert.equal(new Set(corpus.articles.map(a=>a.topic)).size,45);
 const approval={approvalId:'eval-test',model:MODEL,profile:PROFILE,maxCalls:40,maxMicros:2000000,...hashes,expiresAt:new Date(Date.now()+86400000).toISOString(),stateDir:join(root,'live'),retainValidatedOutputsHours:24};
 assert.deepEqual(validateApproval(approval,hashes),approval);
 for(const patch of [{model:'other'},{profile:'other'},{maxCalls:41},{maxCalls:0},{maxMicros:2000001},{maxMicros:0},{maxMicros:1.1},{corpusHash:'changed'},{expiresAt:'2000-01-01'},{retainValidatedOutputsHours:48},{stateDir:'relative'},{apiKey:'must-not-be-in-manifest'}])assert.throws(()=>validateApproval({...approval,...patch},hashes));
 assert.equal(options([]).mode,'dry-run');assert.throws(()=>options(['--live','--mock']));assert.throws(()=>options(['--model','other']));assert.throws(()=>options(['--repeat']));
 // Key presence never selects live. Also reject live without approval before runtime/network.
 await assert.rejects(()=>run(['--live'],{HOLOCRON_EVAL_OPENAI_API_KEY:'synthetic-not-real'}),/LIVE_AUTHORIZATION_REQUIRED/);
 await assert.rejects(()=>run(['--live','--approval',join(root,'missing')],{OPENAI_API_KEY:'synthetic-collection'}));
 let concurrent=await openBudget(join(root,'concurrent'),{...config,maxCalls:1});
 const raced=await Promise.allSettled(Array.from({length:8},()=>concurrent.reserve('P01',19200)));assert.equal(raced.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.totals().attempts,1);await concurrent.close();
 let b=await openBudget(join(root,'budget'),{...config,maxCalls:2,maxMicros:40000});
 await assert.rejects(()=>openBudget(join(root,'budget'),config),/EVALUATION_LOCKED/);
 const attempt=await b.reserve('P01',19200);assert.equal(b.totals().attempts,1);await b.close();
 b=await openBudget(join(root,'budget'),{...config,maxCalls:2,maxMicros:40000});assert(b.seen('P01'));assert.equal(b.totals().reservedMicros,19200);
 await b.finish(attempt,{code:'PROVIDER_TIMEOUT',latencyMs:30,inputTokens:null,outputTokens:null,actualMicros:null,charged:5,refund:{requested:5,applied:5,forfeited:0,full:true}});
 await assert.rejects(()=>b.finish(attempt,{}),/INVALID_SETTLEMENT/);
 await assert.rejects(()=>b.reserve('P02',33600),/EVALUATION_BUDGET_STOP/);
 await b.reserve('P02',19200);await assert.rejects(()=>b.reserve('P03',19200),/EVALUATION_BUDGET_STOP/);assert.equal(b.totals().reservedMicros,38400);await b.close();
 await assert.rejects(()=>openBudget(join(root,'budget'),config),/BUDGET_CONFIGURATION_CONFLICT/);
 await appendFile(join(root,'budget','budget.jsonl'),'broken');await assert.rejects(()=>openBudget(join(root,'budget'),{...config,maxCalls:2,maxMicros:40000}),/INCOMPLETE_BUDGET_JOURNAL/);
 const leaked=await readFile(join(root,'budget','budget.jsonl'),'utf8');assert.doesNotMatch(leaked,/Bearer|synthetic-collection|cookie|summary|instructions/);
 // Real Miniflare with full unchanged migrations and protected Credit triggers.
 runtime=await localRuntime();b=await openBudget(join(root,'corpus'),config);
 const originalFetch=globalThis.fetch;let networkAttempts=0;globalThis.fetch=()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
 try{
  const reports=[];
  for(const c of [...cases].sort((a,b)=>Number(a.expected==='generate')-Number(b.expected==='generate'))){const r=await evaluateCase(runtime,corpus,c,{budget:b});reports.push(r);assert(r.pass,`${c.id}: ${r.code}`);assert.equal(r.realOutbound,0);assert(r.inputBytes===undefined||r.inputBytes<=49152);assert(r.providerAttempts<=1);}
  assert.equal(reports.length,46);assert.equal(b.totals().attempts,40);assert.equal(networkAttempts,0);
  for(const [id,price] of [['P01',5],['P05',7],['P07',15]])assert.equal(reports.find(r=>r.caseId===id).charged,price);
  for(const id of ['S03','S04','S13','S14','S15','S16'])assert.equal(reports.find(r=>r.caseId===id).providerAttempts,0);
  assert.equal(reports.find(r=>r.caseId==='S13').code,'LOGIN_REQUIRED');assert.equal(reports.find(r=>r.caseId==='S14').code,'INSUFFICIENT_BALANCE');
  assert.equal(reports.find(r=>r.caseId==='S05').refund.applied,5);
  assert(reports.filter(r=>cases.find(c=>c.id===r.caseId).qualityClass==='normal').every(r=>r.code==='OK'));
  assert(reports.filter(r=>r.providerAttempts).every(r=>r.inputTokens===1000&&r.outputTokens===200));
  assert.doesNotMatch(JSON.stringify(reports),/synthetic-evaluation|Bearer|__Host-|ignore previous|api\.openai|userId|principalId/);
 }finally{globalThis.fetch=originalFetch;await b.close();}
 // Injected failure transports exercise production refunds, never a separate evaluator wallet.
 const c=cases.find(x=>x.id==='S12');let failureCase=50;
 for(const [code,transport] of [
  ['PROVIDER_RATE_LIMIT',()=>new Response('',{status:429})],['PROVIDER_UNAVAILABLE',()=>new Response('',{status:503})],
  ['INVALID_OUTPUT',()=>Response.json({})],['PROVIDER_TIMEOUT',()=>{throw new (runtime.m('assistant/provider').ProviderError)('PROVIDER_TIMEOUT',504);}] ,
 ]){
  // Network exception maps to unavailable; timeout has its own unchanged provider tests.
  const result=await evaluateCase(runtime,corpus,{...c,id:'S'+failureCase++},{mockFetch:transport});assert.equal(result.code,code);assert.equal(result.providerAttempts,1);assert.equal(result.refund.applied,15);assert.equal(result.settlement,'failed');
 }
 // In-flight archive mutation is rejected after the one mock call and refunds.
 const changed=await evaluateCase(runtime,corpus,{...c,id:'S'+failureCase++},{mockFetch:async body=>{await runtime.db.prepare("UPDATE articles SET summary='edited' WHERE id='eval-a'").run();return mockResponse(body);}});
 assert.equal(changed.code,'EVIDENCE_CHANGED');assert.equal(changed.refund.applied,15);
 const invalid=await evaluateCase(runtime,corpus,{...c,id:'S'+failureCase++},{mockFetch:async body=>{const response=await mockResponse(body).json();const value=JSON.parse(response.output[0].content[0].text);value.facts[0].evidenceIds=['invented'];response.output[0].content[0].text=JSON.stringify(value);return Response.json(response);}});
 assert.equal(invalid.code,'INVALID_OUTPUT');assert.equal(invalid.refund.applied,15);
 const cancel=new AbortController();
 const cancelled=await evaluateCase(runtime,corpus,{...c,id:'S'+failureCase++},{signal:cancel.signal,mockFetch:()=>{cancel.abort();return new Promise(()=>{});}});
 assert.equal(cancelled.code,'REQUEST_CANCELLED');assert.equal(cancelled.refund.applied,15);
 const originalDb=runtime.db;let outage=false;
 const proxy={prepare:s=>originalDb.prepare(s),withSession:s=>originalDb.withSession(s),batch:s=>outage?Promise.reject(new Error('private D1 outage')):originalDb.batch(s)};
 const pendingResult=await evaluateCase({...runtime,db:proxy},corpus,{...c,id:'S'+failureCase++},{mockFetch:()=>{outage=true;return new Response('',{status:503});}});
 assert.equal(pendingResult.code,'REFUND_PENDING');assert.equal(pendingResult.refund,null);
 const pending=(await originalDb.prepare("SELECT request_id FROM assistant_admissions WHERE state IN ('started','refund_pending') AND action!='retrieve'").all()).results;
 assert.equal(pending.length,1);
 const recovered=await runtime.m('assistant/admission').recoverExpiredGeneration(originalDb,pending[0].request_id,Date.parse(corpus.capturedAt)+3600000);
 assert.equal(recovered.refund.applied,15);
 const recoveredAgain=await runtime.m('assistant/admission').recoverExpiredGeneration(originalDb,pending[0].request_id,Date.parse(corpus.capturedAt)+3600000);
 assert.equal(recoveredAgain.state,'failed');
 const liveBudget=await openBudget(join(root,'injected-live'),config);let injectedCalls=0,reviewed=0;
 const outboundBefore=globalThis.fetch;globalThis.fetch=()=>{throw new Error('REAL_PROVIDER_FORBIDDEN');};
 try{for(const scenario of ['creative','thin']){
  const fixture={...c,id:scenario==='creative'?'S70':'S71',scenario,mode:scenario==='thin'?'qa':'script',instructions:scenario==='thin'?'':c.instructions,includeDraft:scenario!=='thin'};
  const result=await evaluateCase(runtime,corpus,fixture,{mode:'live',budget:liveBudget,liveKey:'synthetic-NOT-REAL',liveFetch:async(_url,init)=>{injectedCalls++;return mockResponse(JSON.parse(init.body),scenario);},onResult:async(_id,value)=>{reviewed++;assert(['ok','insufficient_evidence'].includes(value.status));}});
  assert.equal(result.providerAttempts,1);assert(result.inputTokens>0);
 }}finally{globalThis.fetch=outboundBefore;await liveBudget.close();}
 assert.equal(injectedCalls,2);assert.equal(reviewed,2);
 const ledger=await audit(runtime,corpus.capturedAt);assert(ledger.ledgerEntries>=111);assert.equal(ledger.operationalOutbound,0);
 const ops=JSON.stringify((await runtime.db.prepare('SELECT * FROM assistant_admissions').all()).results);assert.doesNotMatch(ops,/ignore previous|탐사|summary|synthetic-evaluation|Bearer/);
 // Invalid budget/profile fails before a provider call; no alternate model configuration.
 assert.throws(()=>runtime.m('assistant/provider-profile').providerProfile('unknown','qa'));
 assert.throws(()=>runtime.m('assistant/cost').validateCostProfile({id:PROFILE,maxInputTokens:Infinity}));
 // Full dry-run CLI path sees a key but still has zero provider attempts/debits.
 await runtime.close();runtime=null;
 const dry=await run(['--dry-run','--case','P01'],{HOLOCRON_EVAL_OPENAI_API_KEY:'synthetic-not-real',OPENAI_API_KEY:'synthetic-collection'});
 assert.equal(dry.realProviderCalls,0);assert.equal(dry.totals.attempts,0);assert.equal(dry.results[0].charged,0);assert.equal(dry.status,'HARNESS_PASS');
 // Safety boundary: no runtime/source/schema/backup changes are required by this runner.
 const resumeDir=join(root,'resume');
 const firstRun=await run(['--mock','--case','P01','--state',resumeDir],{HOLOCRON_EVAL_OPENAI_API_KEY:'synthetic-not-real'});
 assert.equal(firstRun.realProviderCalls,0);assert.equal(firstRun.totals.attempts,1);
 const resumed=await run(['--mock','--case','P01','--state',resumeDir],{});
 assert.equal(resumed.status,'NO_NEW_CASES');assert.equal(resumed.totals.attempts,1);assert.equal(resumed.totals.reservedMicros,19200);assert.equal(resumed.ledger.ledgerEntries,firstRun.ledger.ledgerEntries);
 const journal=await readFile(join(resumeDir,'budget.jsonl'),'utf8');await rm(join(resumeDir,'budget.jsonl'));
 await assert.rejects(()=>run(['--mock','--case','P01','--state',resumeDir],{}),/MISSING_BUDGET_HISTORY/);
 await writeFile(join(resumeDir,'budget.jsonl'),journal,{mode:0o600});
 await rm(join(resumeDir,'local-d1'),{recursive:true,force:true});
 await assert.rejects(()=>run(['--mock','--case','P01','--state',resumeDir],{}),/LOCAL_STATE_MISSING/);
 const runner=await readFile('scripts/assistant-eval/run.mjs','utf8');assert(!runner.includes('environment.OPENAI_API_KEY'));assert(runner.includes('SMOKE_REVIEW_REQUIRED'));
 console.log(`Assistant evaluation: ${count} assertions PASS; 46 reviewed cases, real local D1, production service reuse, durable aggregate budgets, mock-only outbound ZERO. Model quality NOT TESTED.`);
}finally{await runtime?.close();await rm(root,{recursive:true,force:true});}
