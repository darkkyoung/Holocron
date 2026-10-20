import {join} from 'node:path';
import * as state from './state.mjs';
import {stateDigest} from './state.mjs';
import {revision,SCOPE,internal,accepted} from './revision.mjs';
import * as review from './review.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {requireActive} from '../assistant-mvp/handoff.mjs';
import {acquireBudgetLock,openBudget,readBudget,fail} from '../assistant-eval/budget.mjs';
import {localRuntime,audit} from '../assistant-eval/local-runtime.mjs';
import {inspectLocal} from '../assistant-eval/inspect-local.mjs';
import {evaluateCase} from '../assistant-eval/evaluate.mjs';
// Bind each new admission and ledger to this execution before sealing it. The
// shared ledger audit additionally checks all wallets, sequences and balances.
export function settlement(before,after,id,result){
 const rows=after.admissions.filter(a=>!before.admissions.some(b=>b.request_id===a.request_id)),entries=after.entries.filter(a=>!before.entries.some(b=>b.id===a.id)),cost=SCOPE[id]===19200?5:7,action=cost===5?'qa':'planner';
 if(rows.length!==1||after.walletCount!==before.walletCount+1||after.unsettled)fail('SETTLEMENT_MISMATCH');
 const ad=rows[0],debit=entries.find(e=>e.id===ad.debit_entry_id),fund=entries.filter(e=>e.operation==='credit'),refund=entries.filter(e=>e.operation==='refund');
 const ok=result.code==='OK';
 if(ad.action!==action||ad.state!==(ok?'completed':'failed')||ad.state!==result.settlement||ad.actual_cost_micros!==result.actualMicros||ad.reserved_cost_micros!==SCOPE[id]||result.charged!==cost||!debit||debit.operation!=='debit'||debit.kind!=='ai_spend'||debit.wallet_id!==ad.principal_id||debit.reference_id!==ad.request_id||debit.requested_amount!==-cost||debit.applied_amount!==-cost||fund.length!==1||fund[0].wallet_id!==ad.principal_id||fund[0].applied_amount!==100||entries.length!==(ok?2:3))fail('SETTLEMENT_MISMATCH');
 if(ok?(result.refund!==null||refund.length!==0):(refund.length!==1||refund[0].wallet_id!==ad.principal_id||refund[0].original_entry_id!==debit.id||refund[0].requested_amount!==cost||refund[0].applied_amount!==cost||result.refund?.applied!==cost||result.refund?.full!==true))fail('SETTLEMENT_MISMATCH');
}
export function createExecute(s=state,{retain=review.retain,storageFailure=review.storageFailure}={}){
 return async function execute(path,id,{key,transport=globalThis.fetch}={}){
  const caseId=internal(id),x=await s.context(path);let lock,budget,runtime;
  try{
   lock=await acquireBudgetLock(x.approval.stateDir);await s.recheck(x);const authorization=await readPrivateJson(join(x.directory,'authorization.json')),g=await s.grantFor(x);requireActive(g);
   const checked=await s.checkpoint(x,g);await s.gate(x,g,checked,id);
   if(typeof key!=='string'||!key||/[\s\u0000-\u001f]/.test(key))fail('DEDICATED_EVALUATION_KEY_REQUIRED');
   budget=await openBudget(x.directory,g,{requireExisting:true,heldLock:lock});
   async function authorizationCheck(){
    if((await readPrivateJson(join(x.directory,'authorization.json'))).hash!==authorization.hash)fail('E6B_CONFIGURATION_CONFLICT');requireActive(g);
    if((await revision()).hash!==x.loaded.hash)fail('E6B_INTEGRITY_FAILED');await s.recheck(x);if((await readBudget(x.directory,g)).tip!==budget.tip)fail('JOURNAL_TIP_CHANGED');
   }
   function capacity(micros){requireActive(g);const t=budget.totals();if(micros!==SCOPE[id]||10+t.attempts+1>40||278400+t.reservedMicros+micros>2000000)fail('GLOBAL_BUDGET_STOP');budget.canReserve(micros);}
   capacity(SCOPE[id]);await budget.checked(caseId,'STARTED');runtime=await localRuntime({directory:x.directory,requireExisting:true});
   const policy=await runtime.db.prepare('SELECT version,policy_json FROM credit_policy_revisions ORDER BY version DESC LIMIT 1').first(),p=JSON.parse(policy.policy_json);if(policy.version!==1||p.qaCredits!==5||p.plannerCredits!==7)fail('EVALUATION_POLICY_CHANGED');
   const scoped={canReserve:capacity,async reserve(c,micros){if(c!==caseId||budget.records.some(r=>r.type==='reserve'&&r.caseId===c))fail('CASE_ALREADY_STARTED');await authorizationCheck();capacity(micros);return budget.reserve(c,micros);},finish:(attempt,metrics)=>budget.finish(attempt,metrics)};
   let stored=false,storageFailed=false;
   const result=await evaluateCase(runtime,x.loaded.corpus,x.loaded.cases.find(c=>c.id===caseId),{mode:'live',budget:scoped,liveKey:key,liveFetch:(url,init)=>{requireActive(g);return transport(url,init);},onResult:async(_c,output)=>{
    try{await retain(x.directory,g,id,output);stored=true;}catch{storageFailed=true;try{await storageFailure(x.directory,g,id);}catch{/* Financial history remains authoritative; terminal STOP below. */}}
   }});
   const audited=await audit(runtime,x.loaded.corpus.capturedAt);if(audited.operationalOutbound)fail('UNEXPECTED_OPERATIONAL_OUTBOUND');await runtime.close();runtime=null;
   const local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt);settlement(checked.local,local,id,result);
   if(storageFailed){await budget.checked(caseId,'OUTPUT_STORAGE_FAILED');}else{await budget.checkpoint(await stateDigest(x.directory,local),local.ledger.ledgerEntries);}
   const t=budget.totals();return {status:storageFailed?'STOP_OUTPUT_STORAGE_FAILED':result.pass&&accepted(id,result.code)&&result.actualMicros!==null&&stored?'PROGRAM_PASS_OWNER_REVIEW_REQUIRED':'STOP_UNEXPECTED_RESULT',caseId:id,result:{...result,caseId:id},additional:t,aggregate:{attempts:10+t.attempts,reservedMicros:278400+t.reservedMicros},semanticReview:'NOT_REVIEWED',next:'STOP_REVIEW_AND_DELETE_THEN_EXPLICIT_NEXT_COMMAND'};
  }finally{await runtime?.close();await budget?.close();await lock?.close();await x.reader.close();}
 };
}
export const execute=createExecute();
