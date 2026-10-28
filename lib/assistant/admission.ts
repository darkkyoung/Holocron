import {readPolicy} from '../credit/policy-settings/repository';
import {generationPreferences} from './generate-validation';
import {requireSpendingAccount} from './credit';
import {assistantSession} from './identity';
import {accountBinding,accountAdmissionIdentity} from './account-access';
import {admissionHmac,admissionIdentity,trustedEdgeNetwork} from './abuse-identity';
import {AI_ACTIONS,admissionClock,admissionFailure,generationAction,requestId,type GenerationAction} from './limits';
import {validateCostProfile,reserveCost,estimatedCost,type CostProfile,type Usage} from './cost';
import {insertAdmission,completeAdmission,failAdmission,readAdmission,type AdmissionRow} from './repository';
import {reloadSelectedEvidence} from './service';
import {verifyReceipt} from './receipts';
import {AssistantError,compareText} from './types';

export type AdmissionDependencies={enabled:boolean;accessPolicy?:'edge-v1'|'account-v1';identitySecrets?:{account?:string;guest?:string};secret?:string;abuseSecret?:string;network?:(request:Request)=>string|null;now?:()=>number};
export type GenerationDependencies=AdmissionDependencies&{identitySecrets:{account?:string;guest?:string};profiles:Partial<Record<GenerationAction,CostProfile>>;beforeAdmission?:(evidence:Awaited<ReturnType<typeof reloadSelectedEvidence>>)=>void|Promise<void>};
/** Free retrieval admission. No Credit owner is created/resolved or charged. */
export async function admitRetrieval(db:D1Database,request:Request,binding:string,input:unknown,deps:AdmissionDependencies,now:number){
  if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
  admissionClock(now);
  const identity=await admissionIdentity(binding,(deps.network??trustedEdgeNetwork)(request),deps.abuseSecret,now);
  return insertAdmission(db,{...identity,requestId:crypto.randomUUID(),action:'retrieve',ownerToken:crypto.randomUUID(),
    inputHmac:await admissionHmac(deps.abuseSecret,'retrieval-input',JSON.stringify(input)),principalId:null,debitEntryId:null,
    weight:0,credits:0,reservedCostMicros:0,now});
}
/** Shared admission boundary. The server-only preparation hook validates complete input
 * before any debit; no SQL transaction spans provider work or HTTP delivery. */
export async function beginGenerationAdmission(db:D1Database,request:Request,input:unknown,deps:GenerationDependencies){
  if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
  const now=admissionClock(deps.now?.()??Date.now());
  if(!input||typeof input!=='object'||Array.isArray(input)||!['action,receipt,requestId,selectedStoryIds','action,includeDraft,instructions,receipt,requestId,selectedStoryIds','action,includeDraft,instructions,policyVersion,receipt,requestId,selectedStoryIds'].includes(Object.keys(input).sort().join(',')))throw new AssistantError('INVALID_REQUEST',400);
  const value=input as Record<string,unknown>,id=requestId(value.requestId),action=generationAction(value.action);
  const preferences=generationPreferences(action,value.instructions,value.includeDraft);
  const owner=await requireSpendingAccount(db,request,deps.identitySecrets,now);
  const policy=await readPolicy(db),policyVersion=value.policyVersion??1;
  if(policyVersion!==policy.version)admissionFailure('PRICE_CHANGED');
  const credits=action==='qa'?policy.values.qaCredits:action==='planner'?policy.values.plannerCredits:15;
  const profile=validateCostProfile(deps.profiles[action]),reservedCostMicros=reserveCost(profile);
  const accountPolicy=deps.accessPolicy==='account-v1';
  const session=accountPolicy?{binding:await accountBinding(owner.principalId,deps.secret),setCookie:undefined}:await assistantSession(request,deps.secret,now);
  const identity=accountPolicy?await accountAdmissionIdentity(owner.principalId,deps.abuseSecret):await admissionIdentity(session.binding,(deps.network??trustedEdgeNetwork)(request),deps.abuseSecret,now);
  const selected=await reloadSelectedEvidence(db,value.receipt,value.selectedStoryIds,session.binding,deps.secret,now);
  if(selected.request.mode!==(action==='qa'?'qa':'script'))throw new AssistantError('INVALID_REQUEST',400);
  const claims=await verifyReceipt(value.receipt,session.binding,deps.secret,now);
  const fingerprints=claims.candidates.filter(c=>selected.evidence.some(e=>e.storyId===c.storyId)).sort((a,b)=>compareText(a.storyId,b.storyId));
  const inputHmac=await admissionHmac(deps.abuseSecret,'generation-input',JSON.stringify({action,owner:owner.principalId,session:identity.sessionHash,
    request:selected.request,fingerprints,profile,...preferences,policyVersion,credits}));
  await deps.beforeAdmission?.(selected);
  const row=await insertAdmission(db,{...identity,securityPolicy:accountPolicy?'account-v1':'edge-v1',requestId:id,action,inputHmac,ownerToken:crypto.randomUUID(),principalId:owner.principalId,
    debitEntryId:crypto.randomUUID(),...{weight:AI_ACTIONS[action].weight,credits},policyVersion:policy.version,reservedCostMicros,now:admissionClock(deps.now?.()??Date.now())});
  return {row,profile,evidence:selected,binding:session.binding,setCookie:session.setCookie};
}
/** A distinct, receipt-free QA contract; it uses the same atomic qa admission,
 * account identity, global limits, cost reservation and settlement machinery. */
export async function beginChatAdmission(db:D1Database,request:Request,input:{requestId:string;query:string;policyVersion:number},deps:GenerationDependencies){
  if(!deps.enabled||deps.accessPolicy!=='account-v1')throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
  const now=admissionClock(deps.now?.()??Date.now()),id=requestId(input.requestId);
  const owner=await requireSpendingAccount(db,request,deps.identitySecrets,now),policy=await readPolicy(db);
  if(input.policyVersion!==policy.version)admissionFailure('PRICE_CHANGED');
  const profile=validateCostProfile(deps.profiles.qa),reservedCostMicros=reserveCost(profile),credits=policy.values.qaCredits;
  await accountBinding(owner.principalId,deps.secret);
  const identity=await accountAdmissionIdentity(owner.principalId,deps.abuseSecret);
  const inputHmac=await admissionHmac(deps.abuseSecret,'generation-input',JSON.stringify({kind:'general-chat-v1',action:'qa',owner:owner.principalId,session:identity.sessionHash,query:input.query,profile,policyVersion:policy.version,credits}));
  const row=await insertAdmission(db,{...identity,securityPolicy:'account-v1',requestId:id,action:'qa',inputHmac,ownerToken:crypto.randomUUID(),principalId:owner.principalId,debitEntryId:crypto.randomUUID(),weight:AI_ACTIONS.qa.weight,credits,policyVersion:policy.version,reservedCostMicros,now:admissionClock(deps.now?.()??Date.now())});
  return {row,profile};
}
export type GenerationHandle={row:AdmissionRow;profile:CostProfile};
/** Test-injectable settlement boundary; never accepts client cost/usage directly. */
export async function settleGeneration(db:D1Database,handle:GenerationHandle,outcome:{valid:boolean;usage?:Usage},now=Date.now()){
  let actual:number|null=null,valid=outcome.valid;
  try{if(outcome.usage)actual=estimatedCost(handle.profile,outcome.usage);}
  catch(error){
    if(!(error instanceof AssistantError)||error.code!=='INVALID_COST_PROFILE')throw error;
    // Invalid usage is a technical failure, never an excuse to strand the debit.
    // The unknown provider bill retains its conservative reservation.
    valid=false;
  }
  if(valid){
    const result=await completeAdmission(db,handle.row.request_id,handle.row.owner_token,actual,now);
    if(result.completed)return {status:'completed' as const};
    // A lost response/repeated success cannot refund an already committed completion.
    if(result.row?.state==='completed')return {status:'result_not_retained' as const};
  }
  const row=await failAdmission(db,handle.row.request_id,handle.row.owner_token,now,actual);
  return {status:row.state==='completed'?'result_not_retained' as const:row.state,refund:row.refund};
}
/** Explicit lazy recovery, no background queue and no repeat provider call. */
export async function recoverExpiredGeneration(db:D1Database,id:string,now=Date.now()){
  const row=await readAdmission(db,id);
  if(!row||row.action==='retrieve')admissionFailure('REQUEST_CONFLICT');
  if(row.state==='started'&&row.lease_expires_at>now)admissionFailure('REQUEST_IN_PROGRESS');
  if(row.state==='started'||row.state==='refund_pending')return failAdmission(db,id,row.owner_token,now);
  return row;
}
