import {join} from 'node:path';
import {context,recheck,grantFor,checkpoint} from './state.mjs';
import {revision,SCOPE,internal} from './revision.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {requireActive} from '../assistant-mvp/handoff.mjs';
import {retain,storageFailure,list,reviewedPass} from './review.mjs';
import {acquireBudgetLock,openBudget,readBudget,fail} from '../assistant-eval/budget.mjs';
import {localRuntime,audit} from '../assistant-eval/local-runtime.mjs';
import {inspectLocal} from '../assistant-eval/inspect-local.mjs';
import {evaluateCase} from '../assistant-eval/evaluate.mjs';
export async function execute(path,id,{key,transport=globalThis.fetch}={}){
 const caseId=internal(id),x=await context(path);let lock,budget,runtime;
 try{
  lock=await acquireBudgetLock(x.approval.stateDir);await recheck(x);
  const authorization=await readPrivateJson(join(x.directory,'authorization.json')),g=await grantFor(x);requireActive(g);
  const checked=await checkpoint(x,g);
  if(checked.journal.records.some(r=>r.caseId===caseId))fail('CASE_ALREADY_STARTED');
  if(id==='E5D-P44'){
   if(checked.journal.records.length!==6||checked.journal.records.find(r=>r.type==='finish')?.code!=='OK')fail('P41_PROGRAM_PASS_REQUIRED');
   await reviewedPass(x.directory,g,'E5D-P41');
  }else if(checked.journal.records.length!==2)fail('INVALID_CASE_ORDER');
  if((await list(x.directory,g)).some(r=>r.caseId===id&&(r.exists||r.storage!=='NOT_STORED'||r.deletion!=='NOT_RECORDED'||r.semanticReview!=='NOT_REVIEWED')))fail('UNEXPECTED_REVIEW_STATE');
  if(typeof key!=='string'||!key||/[\s\u0000-\u001f]/.test(key))fail('DEDICATED_EVALUATION_KEY_REQUIRED');
  budget=await openBudget(x.directory,g,{requireExisting:true,heldLock:lock});
  async function authorizationCheck(){
   if((await readPrivateJson(join(x.directory,'authorization.json'))).hash!==authorization.hash)fail('E5D_CONFIGURATION_CONFLICT');
   requireActive(g);if((await revision()).hash!==x.loaded.hash)fail('E5D_INTEGRITY_FAILED');await recheck(x);
   if((await readBudget(x.directory,g)).tip!==budget.tip)fail('JOURNAL_TIP_CHANGED');
  }
  function capacity(micros){requireActive(g);const t=budget.totals();if(micros!==SCOPE[id]||x.history.attempts+t.attempts+1>40||x.history.reservedMicros+t.reservedMicros+micros>2000000)fail('GLOBAL_BUDGET_STOP');budget.canReserve(micros);}
  capacity(SCOPE[id]);await budget.checked(caseId,'STARTED');
  runtime=await localRuntime({directory:x.directory,requireExisting:true});
  const policy=await runtime.db.prepare('SELECT version,policy_json FROM credit_policy_revisions ORDER BY version DESC LIMIT 1').first(),p=JSON.parse(policy.policy_json);
  if(policy.version!==1||p.qaCredits!==5||p.plannerCredits!==7)fail('EVALUATION_POLICY_CHANGED');
  const scoped={canReserve:capacity,async reserve(c,micros){if(c!==caseId||budget.records.some(r=>r.type==='reserve'&&r.caseId===c))fail('CASE_ALREADY_STARTED');await authorizationCheck();capacity(micros);return budget.reserve(c,micros);},finish:(attempt,metrics)=>budget.finish(attempt,metrics)};
  let stored=false,storageFailed=false;
  const result=await evaluateCase(runtime,x.loaded.corpus,x.loaded.cases.find(c=>c.id===caseId),{mode:'live',budget:scoped,liveKey:key,liveFetch:(url,init)=>{requireActive(g);return transport(url,init);},onResult:async(_c,output)=>{
   try{await retain(x.directory,g,id,output);stored=true;}catch{storageFailed=true;try{await storageFailure(x.directory,g,id);}catch{/* Missing receipt also blocks human readiness. Financial checkpoint still required. */}}
  }});
  const audited=await audit(runtime,x.loaded.corpus.capturedAt);if(audited.operationalOutbound)fail('UNEXPECTED_OPERATIONAL_OUTBOUND');await runtime.close();runtime=null;
  const local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt);if(local.unsettled)fail('UNSETTLED_LOCAL_ADMISSIONS');await budget.checkpoint(local.digest,local.ledger.ledgerEntries);
  if(storageFailed)await budget.checked(caseId,'OUTPUT_STORAGE_FAILED'); // Durable terminal STOP even if a review receipt could not be written.
  const t=budget.totals();
  return {status:storageFailed?'STOP_OUTPUT_STORAGE_FAILED':result.pass&&result.code==='OK'&&result.settlement==='completed'&&stored?'PROGRAM_PASS_OWNER_REVIEW_REQUIRED':'STOP_UNEXPECTED_RESULT',caseId:id,result:{...result,caseId:id},additional:t,aggregate:{attempts:5+t.attempts,reservedMicros:139200+t.reservedMicros},semanticReview:'NOT_REVIEWED',review:await list(x.directory,g),next:'STOP_NO_AUTO_CONTINUATION'};
 }finally{await runtime?.close();await budget?.close();await lock?.close();await x.reader.close();}
}
