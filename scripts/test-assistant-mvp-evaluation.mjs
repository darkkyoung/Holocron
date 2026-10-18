import strict from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,lstat,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {run} from './assistant-mvp/run.mjs';
import {loadMvp} from './assistant-mvp/fixture.mjs';
import {inspectPrior} from './assistant-mvp/prior.mjs';
import {openBudget,MODEL,PROFILE,hash} from './assistant-eval/budget.mjs';
import {localRuntime,audit} from './assistant-eval/local-runtime.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {loadTestModules} from './test-module-loader.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const originalFetch=globalThis.fetch;let outbound=0;
globalThis.fetch=()=>{outbound++;throw new Error('OUTBOUND_FORBIDDEN');};
const root=await mkdtemp(join(tmpdir(),'holocron-mvp-test-')),loaded=await loadMvp();
const priorManifest=await readFile('evaluation/assistant/manifest.json','utf8');
const keyDescriptor=Object.getOwnPropertyDescriptor(process.env,'HOLOCRON_EVAL_OPENAI_API_KEY');
// Only a synthetic marker. No real key lookup or use.
process.env.HOLOCRON_EVAL_OPENAI_API_KEY='SYNTHETIC_NO_LIVE_AUTHORIZATION';
try{
  for(const args of [['--live'],['--live','--approval','missing'],['--repeat'],['--stage','rest'],['--state',root],['--case','P07'],['--apply']])await assert.rejects(()=>run(args));
  const dry=await run([]),mock=await run(['--mock']);
  assert.equal(dry.status,'PREPARATION_PASS');assert.equal(dry.totals.attempts,0);
  assert.equal(mock.status,'PREPARATION_PASS');assert.deepEqual(mock.totals,{attempts:6,reservedMicros:158400});
  assert.equal(mock.ledger.ledgerEntries,16);assert.equal(mock.realProviderCalls,0);assert.equal(mock.semanticQuality,'NOT_TESTED');
  assert.equal(mock.results.length,10);assert.equal(mock.results.filter(r=>r.stage==='smoke').reduce((n,r)=>n+r.reservationMicros,0),52800);
  for(const r of mock.results){assert.equal(r.pass,true);assert.equal(r.realOutbound,0);if(r.stage==='control'){assert.equal(r.providerAttempts,0);assert.equal(r.charged,0);}else{assert.equal(r.charged,r.mode==='qa'?5:7);assert.equal(r.settlement,'completed');assert.equal(r.providerAttempts,1);}}
  for(const id of ['P42','P45'])assert.equal(mock.results.find(r=>r.caseId===id).evidenceArticleCount,2);
  assert.deepEqual(mock.results.filter(r=>r.stage==='smoke').map(r=>r.caseId),['P41','P44']);
  assert.doesNotMatch(JSON.stringify(mock),/SYNTHETIC_NO_LIVE_AUTHORIZATION|Bearer|__Host|support.*span/);
  const rt=await localRuntime();
  try{
    const result=await evaluateCase(rt,loaded.corpus,loaded.cases.find(c=>c.id==='P44'),{mockFetch:()=>Response.json({secret:'SYNTHETIC_RAW_REJECTED'})});
    assert.equal(result.code,'INVALID_OUTPUT');assert.equal(result.providerAttempts,1);assert.deepEqual(result.refund,{requested:7,applied:7,forfeited:0,full:true});assert(result.diagnostic);
    assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC_RAW_REJECTED/);assert.equal((await audit(rt,loaded.corpus.capturedAt)).ledgerEntries,3);
  }finally{await rt.close();}
  // Reconstruct the REPORTED historic numeric baseline with synthetic local accounts only.
  // This is not a read of the user's campaign or a replay of the missing live response.
  const directory=join(root,'prior'),path=join(root,'approval.json');
  const historic=JSON.parse(priorManifest),approval={approvalId:'eval-e4-synthetic',model:MODEL,profile:PROFILE,maxCalls:40,maxMicros:2000000,
    corpusHash:historic.corpusHash,casesHash:historic.casesHash,rubricHash:historic.rubricHash,pipelineHash:'3033f845d991bbdde172d0ee01c233dfe723d4b54d5bb7589ec789f19804037c',
    expiresAt:new Date(Date.now()-1000).toISOString(),stateDir:directory,retainValidatedOutputsHours:24};
  await writeFile(path,JSON.stringify(approval),{mode:0o600});
  const budget=await openBudget(directory,approval),runtime=await localRuntime({directory}),modules=await loadTestModules(['lib/assistant/repository.ts']);
  try{
    let i=0;
    for(const [id,action,micros,charge,inputTokens,outputTokens] of [['P01','qa',19200,5,974,223],['P05','planner',33600,7,1345,801],['P07','draft',33600,15,1581,1233]]){
      const now=Date.parse(loaded.corpus.capturedAt)+i++,account=await runtime.m('identity/repository').createAccount(runtime.db,new Date(now));
      await runtime.credit.credit({owner:account.owner,amount:100,kind:'reward',idempotencyKey:'evaluation-fixture-funding'});
      const row=await modules.modules['lib/assistant/repository.ts'].insertAdmission(runtime.db,{requestId:randomUUID(),ownerToken:randomUUID(),action,principalId:account.owner.principalId,debitEntryId:randomUUID(),weight:action==='qa'?1:4,credits:charge,reservedCostMicros:micros,now,sessionHash:hash(id),networkHash:hash(id+'n'),previousNetworkHash:hash(id+'p'),inputHmac:hash(id+'i')});
      const profile=runtime.m('assistant/provider-profile').providerProfile(PROFILE,action).cost;
      const settlement=await runtime.m('assistant/admission').settleGeneration(runtime.db,{row,profile},{valid:action!=='draft',usage:{inputTokens,outputTokens}},now+1);
      const attempt=await budget.reserve(id,micros),actualMicros=runtime.m('assistant/cost').estimatedCost(profile,{inputTokens,outputTokens});
      await budget.finish(attempt,{code:action==='draft'?'INVALID_OUTPUT':'OK',latencyMs:1,inputTokens,outputTokens,actualMicros,charged:charge,refund:settlement.refund??null});
    }
  }finally{await modules.dispose();await runtime.close();await budget.close();}
  // SQLite read-only WAL readers update shared-memory read marks; DB/WAL/approval/journal bytes must stay identical.
  async function snapshot(dir){const result={};for(const name of await readdir(dir)){const p=join(dir,name),s=await lstat(p);if(s.isDirectory())result[name]=await snapshot(p);else if(!name.endsWith('-shm'))result[name]=hash(await readFile(p));}return result;}
  const before=await snapshot(root),report=await inspectPrior(path,loaded.corpus);
  assert.equal(report.expired,true);assert.equal(report.prior.attempts,3);assert.equal(report.prior.reservedMicros,86400);assert.equal(report.prior.usageEstimateMicros,13083);
  assert.equal(report.aggregatePlanned.reservedMicros,244800);assert.equal(report.aggregateCeiling.reservedMicros,286400);assert.equal(report.providerCalls,0);
  assert.deepEqual(await snapshot(root),before);assert.deepEqual(await run(['--inspect-prior',path]),report);
  await writeFile(path,JSON.stringify({...approval,expiresAt:new Date(Date.now()+3600000).toISOString()}));await assert.rejects(()=>inspectPrior(path,loaded.corpus),/BUDGET_CONFIGURATION_CONFLICT/);
  await writeFile(path,JSON.stringify(approval));
  const journal=join(directory,'budget.jsonl'),bytes=await readFile(journal);
  await writeFile(journal,bytes.subarray(0,bytes.length-1));await assert.rejects(()=>inspectPrior(path,loaded.corpus),/INCOMPLETE_BUDGET_JOURNAL/);await writeFile(journal,bytes);
  await writeFile(join(directory,'budget.lock'),'');await assert.rejects(()=>inspectPrior(path,loaded.corpus),/EVALUATION_LOCKED/);await rm(join(directory,'budget.lock'));
  await assert.rejects(()=>run(['--inspect-prior',join(root,'missing.json')]),/REQUIRED_PRIOR_STATE_MISSING/);
  await rename(join(directory,'local-d1'),join(directory,'held-d1'));
  try{await assert.rejects(()=>run(['--inspect-prior',path]),/REQUIRED_PRIOR_STATE_MISSING/);}finally{await rename(join(directory,'held-d1'),join(directory,'local-d1'));}
  await rename(journal,journal+'.held');
  try{await assert.rejects(()=>run(['--inspect-prior',path]),/REQUIRED_PRIOR_STATE_MISSING/);}finally{await rename(journal+'.held',journal);}
  assert.deepEqual(await snapshot(root),before);
  const b=await openBudget(join(root,'limits'),{maxCalls:6,maxMicros:200000});
  try{for(let i=0;i<6;i++)await b.reserve('P41',19200);await assert.rejects(()=>b.reserve('P41',19200),/EVALUATION_BUDGET_STOP/);}finally{await b.close();}
  const resumed=await openBudget(join(root,'limits'),{maxCalls:6,maxMicros:200000},{requireExisting:true});
  try{assert.deepEqual(resumed.totals(),{attempts:6,reservedMicros:115200});await assert.rejects(()=>resumed.reserve('P41',19200),/EVALUATION_BUDGET_STOP/);}finally{await resumed.close();}
  const c=await openBudget(join(root,'cost'),{maxCalls:6,maxMicros:20000});
  try{await c.reserve('P41',19200);await assert.rejects(()=>c.reserve('P41',19200),/EVALUATION_BUDGET_STOP/);}finally{await c.close();}
  assert.equal(await readFile('evaluation/assistant/manifest.json','utf8'),priorManifest);assert.equal(outbound,0);
  console.log(`PASS: ${count} MVP evaluation assertions; real outbound ZERO; prior state read-only; semantics NOT TESTED`);
}finally{globalThis.fetch=originalFetch;if(keyDescriptor)Object.defineProperty(process.env,'HOLOCRON_EVAL_OPENAI_API_KEY',keyDescriptor);else delete process.env.HOLOCRON_EVAL_OPENAI_API_KEY;await rm(root,{recursive:true,force:true});}
