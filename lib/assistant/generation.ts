import {ArchiveSnapshotError} from '../news/archive-snapshot';
import {beginGenerationAdmission,settleGeneration,type GenerationDependencies,type GenerationHandle} from './admission';
import {requireSpendingAccount} from './credit';
import {reloadSelectedEvidence} from './service';
import {actionFor,type GenerateRequest} from './generate-validation';
import {providerKey,providerProfile} from './provider-profile';
import {prepareProviderInput} from './prompt';
import {callResponses,ProviderError,type ProviderFetch} from './provider';
import {validateGroundedOutput} from './output-validation';
import {AssistantError,type AssistantCode} from './types';
import {utf8Size} from './token-budget';
import type {Usage} from './cost';
import type {RefundSettlement} from './repository';
import {AI_ACTIONS} from './limits';
export type GenerateDependencies=Omit<GenerationDependencies,'profiles'|'beforeAdmission'>&{profileId?:string;apiKey?:string;fetcher?:ProviderFetch};
export class GenerationFailure extends AssistantError{
  constructor(code:AssistantCode,status:number,public readonly credit:{settlement:'failed'|'refund_pending'|'completed'|'unknown';refund:RefundSettlement|null}){super(code,status);}
}
/** A completed D1 entry records valid result readiness, NOT a browser-delivery receipt.
 * Lost HTTP replies cannot be replayed (no output storage) or charged/called twice. */
export async function generateArchive(db:D1Database,request:Request,input:GenerateRequest,deps:GenerateDependencies){
  if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
  const clock=deps.now??Date.now,start=clock(),action=actionFor(input);
  await requireSpendingAccount(db,request,deps.identitySecrets,start);
  const profile=providerProfile(deps.profileId,action),key=providerKey(deps.apiKey),controller=new AbortController();
  let deadline=false;
  const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();
  const timer=setTimeout(()=>{deadline=true;controller.abort();},Math.max(0,profile.serviceMs-(clock()-start)));
  function check(){if(deadline||clock()-start>=profile.serviceMs)throw new AssistantError('SERVICE_TIMEOUT',504);if(controller.signal.aborted)throw new AssistantError('REQUEST_CANCELLED',409);}
  let handle:GenerationHandle|undefined,usage:Usage|undefined;
  try{
    check();let prepared:ReturnType<typeof prepareProviderInput>|undefined;
    const admitted=await beginGenerationAdmission(db,request,{requestId:input.requestId,action,receipt:input.receipt,selectedStoryIds:input.selectedStoryIds,instructions:input.instructions,includeDraft:input.includeDraft},
      {...deps,profiles:{[action]:profile.cost},beforeAdmission:selected=>{check();prepared=prepareProviderInput(selected,input,profile);check();}});
    handle=admitted;check();
    const response=await callResponses(prepared!.serialized,profile,key,controller.signal,deps.fetcher);usage=response.usage;check();
    // Validate before expensive final reads; validate/map again against the final primary projection.
    validateGroundedOutput(response.output,input,admitted.evidence);
    const final=await reloadSelectedEvidence(db,input.receipt,input.selectedStoryIds,admitted.binding,deps.secret,clock());check();
    const result=validateGroundedOutput(response.output,input,final);
    if(utf8Size(JSON.stringify({...result,credit:{charged:AI_ACTIONS[action].credits,refund:{requested:15,applied:15,forfeited:15,full:false}}}))>64*1024)throw new AssistantError('OUTPUT_LIMIT',502);
    check();const settlement=await settleGeneration(db,handle,{valid:result.status==='ok',usage},clock());
    if(settlement.status==='result_not_retained')throw new GenerationFailure('RESULT_NOT_RETAINED',409,{settlement:'completed',refund:null});
    if(result.status==='ok'&&settlement.status!=='completed')throw new GenerationFailure('LEASE_EXPIRED',409,{settlement:settlement.status==='failed'?'failed':'refund_pending',refund:'refund' in settlement?settlement.refund??null:null});
    if(result.status==='insufficient_evidence'&&settlement.status!=='failed')throw new GenerationFailure('REFUND_PENDING',503,{settlement:'refund_pending',refund:null});
    // Never reverse committed success because delivery/abort/deadline is now ambiguous.
    if(controller.signal.aborted||clock()-start>=profile.serviceMs)throw new GenerationFailure('RESULT_NOT_RETAINED',409,{settlement:settlement.status==='completed'?'completed':'failed',refund:'refund' in settlement?settlement.refund??null:null});
    return {...result,credit:{charged:AI_ACTIONS[action].credits,refund:'refund' in settlement?settlement.refund??null:null}};
  }catch(error){
    if(error instanceof GenerationFailure)throw error;
    const code=deadline?'SERVICE_TIMEOUT':error instanceof AssistantError||error instanceof ArchiveSnapshotError?error.code:'INTERNAL_ERROR',status=error instanceof AssistantError?error.status:503;
    if(!handle){if(error instanceof AssistantError&&error.code==='ADMISSION_UNAVAILABLE')throw new GenerationFailure(error.code,error.status,{settlement:'unknown',refund:null});throw error;}
    try{
      const settled=await settleGeneration(db,handle,{valid:false,usage:error instanceof ProviderError?error.usage:usage},clock());
      if(settled.status==='result_not_retained')throw new GenerationFailure('RESULT_NOT_RETAINED',409,{settlement:'completed',refund:null});
      throw new GenerationFailure(code,status,{settlement:settled.status==='failed'?'failed':'refund_pending',refund:'refund' in settled?settled.refund??null:null});
    }catch(settlementError){
      if(settlementError instanceof GenerationFailure)throw settlementError;
      // D1 may have committed even if the response was lost. No invented refund claim.
      throw new GenerationFailure('REFUND_PENDING',503,{settlement:'unknown',refund:null});
    }
  }finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);}
}
