import {join} from 'node:path';
import {freshAudit,validateGrant,assertCheckpoint,requireActive} from './handoff.mjs';
import {readPrivateJson,recheckPrior} from './historical-reader.mjs';
import {loadLiveRevision,SCOPE} from './live-revision.mjs';
import {reviewFiles,retainOutput} from './review-output.mjs';
import {acquireBudgetLock,openBudget,readBudget,fail} from '../assistant-eval/budget.mjs';
import {localRuntime,audit} from '../assistant-eval/local-runtime.mjs';
import {inspectLocal} from '../assistant-eval/inspect-local.mjs';
import {evaluateCase} from '../assistant-eval/evaluate.mjs';

/** Importable transport injection is used by synthetic tests only. CLI has no
 * transport/model/state override. No retry or continuation command exists. */
export async function smoke(path,{key,transport=globalThis.fetch}={}){
  if(typeof key!=='string'||!key||/[\s\u0000-\u001f]/.test(key))fail('DEDICATED_EVALUATION_KEY_REQUIRED');
  const x=await freshAudit(path);let lock,budget,runtime;
  try{
    lock=await acquireBudgetLock(x.approval.stateDir);
    await recheckPrior(path,x.prior,x.reader);
    const authorization=await readPrivateJson(join(x.directory,'authorization.json'));
    const grant=validateGrant(authorization.value,x.prior,x.loaded,x.directory);
    requireActive(grant);
    const checked=await assertCheckpoint(x.directory,grant,x.loaded);
    // A smoke invocation is one-shot even if interruption occurred before dispatch.
    if(checked.journal.records.length!==2)fail('SMOKE_ALREADY_STARTED_STOP');
    if((await reviewFiles(x.directory)).length)fail('UNEXPECTED_REVIEW_FILES');
    budget=await openBudget(x.directory,grant,{requireExisting:true,heldLock:lock});
    async function recheckAuthorization(){
      const current=await readPrivateJson(join(x.directory,'authorization.json'));
      if(current.hash!==authorization.hash)fail('HANDOFF_CONFIGURATION_CONFLICT');
      requireActive(grant);
      if((await readBudget(x.directory,grant)).tip!==budget.tip)fail('JOURNAL_TIP_CHANGED');
    }
    const results=[];
    for(const c of x.loaded.cases){
      await recheckAuthorization();await loadLiveRevision();await recheckPrior(path,x.prior,x.reader);
      await assertCheckpoint(x.directory,grant,x.loaded);
      const expected=SCOPE[c.id];
      if(!expected||c.includeDraft||budget.seen(c.id))fail('SMOKE_CASE_NOT_AUTHORIZED');
      function capacity(micros){
        requireActive(grant);
        const t=budget.totals();
        if(micros!==expected||x.prior.attempts+t.attempts+1>40||x.prior.reservedMicros+t.reservedMicros+micros>2000000)fail('HANDOFF_BUDGET_STOP');
        budget.canReserve(micros);
      }
      capacity(expected);
      // Durable start before any local funding/debit: an uncertain crash cannot rerun.
      await budget.checked(c.id,'STARTED');
      runtime=await localRuntime({directory:x.directory,requireExisting:true});
      const policy=await runtime.db.prepare('SELECT version,policy_json FROM credit_policy_revisions ORDER BY version DESC LIMIT 1').first();
      const values=JSON.parse(policy.policy_json);
      if(policy.version!==1||values.qaCredits!==5||values.plannerCredits!==7)fail('EVALUATION_POLICY_CHANGED');
      const scoped={canReserve:capacity,async reserve(id,micros){
        if(id!==c.id||budget.records.some(r=>r.type==='reserve'&&r.caseId===id))fail('SMOKE_CASE_NOT_AUTHORIZED');
        await recheckAuthorization();await loadLiveRevision();await recheckPrior(path,x.prior,x.reader);capacity(micros);
        return budget.reserve(id,micros); // fsync before transport, never reclaimed
      },finish:(id,metrics)=>budget.finish(id,metrics)};
      const result=await evaluateCase(runtime,x.loaded.corpus,c,{mode:'live',budget:scoped,liveKey:key,liveFetch:(url,init)=>{requireActive(grant);return transport(url,init);},
        onResult:(id,output)=>retainOutput(x.directory,grant,id,output)});
      const ledger=await audit(runtime,x.loaded.corpus.capturedAt);
      if(ledger.operationalOutbound)fail('UNEXPECTED_OPERATIONAL_OUTBOUND');
      await runtime.close();runtime=null;
      const local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt);
      if(local.unsettled)fail('UNSETTLED_LOCAL_ADMISSIONS');
      await budget.checkpoint(local.digest,local.ledger.ledgerEntries);
      results.push(result);
      if(!result.pass||result.code!=='OK'||result.settlement!=='completed')break;
    }
    const totals=budget.totals();
    return {status:results.length===2&&results.every(r=>r.code==='OK'&&r.pass)?'SMOKE_PROGRAM_PASS_REVIEW_REQUIRED':'STOP_UNEXPECTED_RESULT',
      results,additional:totals,aggregate:{attempts:x.prior.attempts+totals.attempts,reservedMicros:x.prior.reservedMicros+totals.reservedMicros},
      priorSemanticReview:'UNREVIEWED',semanticReview:'NOT_REVIEWED',next:'STOP_OWNER_REVIEW_NO_REST_AUTHORIZED',reviewFiles:await reviewFiles(x.directory)};
  }finally{await runtime?.close();await budget?.close();await lock?.close();await x.reader.close();}
}
