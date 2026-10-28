import {ArchiveSnapshotError} from '../news/archive-snapshot';
import {beginGenerationAdmission,beginChatAdmission,settleGeneration,type GenerationDependencies,type GenerationHandle} from './admission';
import {requireSpendingAccount} from './credit';
import {reloadSelectedEvidence} from './service';
import {actionFor,type GenerateRequest} from './generate-validation';
import {providerKey,providerProfile} from './provider-profile';
import {prepareProviderInput} from './prompt';
import {callResponses,ProviderError,type ProviderFetch} from './provider';
import {validateGroundedOutput} from './output-validation';
import {AssistantError,type AssistantCode} from './types';
import {utf8Size,checkInputBudget} from './token-budget';
import {validateShape} from './output-schema';
import type {Usage} from './cost';
import type {RefundSettlement} from './repository';
import {OutputValidationError,observeOutput,outputDiagnostic,type OutputObserver} from './output-diagnostic';
export type GenerateDependencies=Omit<GenerationDependencies,'profiles'|'beforeAdmission'>&{profileId?:string;apiKey?:string;fetcher?:ProviderFetch;onOutputDiagnostic?:OutputObserver};
export class GenerationFailure extends AssistantError{
  constructor(code:AssistantCode,status:number,public readonly credit:{settlement:'failed'|'refund_pending'|'completed'|'unknown';refund:RefundSettlement|null}){super(code,status);}
}
/** A completed D1 entry records valid result readiness, NOT a browser-delivery receipt.
 * Lost HTTP replies cannot be replayed (no output storage) or charged/called twice. */
export type ChatRequest={requestId:string;mode:'chat';query:string;policyVersion:number};
export async function generateArchive(db:D1Database,request:Request,input:GenerateRequest|ChatRequest,deps:GenerateDependencies){
  if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
  const clock=deps.now??Date.now,start=clock(),action=input.mode==='chat'?'qa':actionFor(input);
  await requireSpendingAccount(db,request,deps.identitySecrets,start);
  const profile=providerProfile(deps.profileId,action),key=providerKey(deps.apiKey),controller=new AbortController();
  let deadline=false;
  const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();
  const timer=setTimeout(()=>{deadline=true;controller.abort();},Math.max(0,profile.serviceMs-(clock()-start)));
  function check(){if(deadline||clock()-start>=profile.serviceMs)throw new AssistantError('SERVICE_TIMEOUT',504);if(controller.signal.aborted)throw new AssistantError('REQUEST_CANCELLED',409);}
  let handle:GenerationHandle|undefined,usage:Usage|undefined;
  try{
    check();let prepared:ReturnType<typeof prepareProviderInput>|undefined;
    const chat=input.mode==='chat';
    const chatSchema={type:'object' as const,properties:{answer:{type:'string' as const,minLength:1,maxLength:2400}},required:['answer'],additionalProperties:false as const};
    const chatBody=chat?checkInputBudget({model:profile.model,store:false,background:false,stream:false,tools:[],tool_choice:'none',reasoning:{effort:'none'},service_tier:'default',truncation:'disabled',max_output_tokens:profile.cost.maxOutputTokens,
      instructions:'당신은 HOLOCRON의 한국어 스타워즈 도우미입니다. 사용자와 자연스럽고 친절하게 대화하세요. 스타워즈 지식 질문에는 명확하게 답변하고, 최신 뉴스는 제공된 기사 근거가 있을 때만 확정적으로 설명하세요. 모르는 내용은 추측하지 말고 모른다고 답하세요.',input:[{role:'user',content:[{type:'input_text',text:input.query}]}],text:{format:{type:'json_schema',name:'general_chat',strict:true,schema:chatSchema}}},[],profile):undefined;
    const admitted=chat?await beginChatAdmission(db,request,input,{...deps,profiles:{qa:profile.cost}}):await beginGenerationAdmission(db,request,{requestId:input.requestId,action,receipt:input.receipt,selectedStoryIds:input.selectedStoryIds,instructions:input.instructions,includeDraft:input.includeDraft,policyVersion:input.policyVersion??1},
      {...deps,profiles:{[action]:profile.cost},beforeAdmission:selected=>{check();prepared=prepareProviderInput(selected,input as GenerateRequest,profile);check();}});
    handle=admitted;check();
    const response=await callResponses(chat?chatBody!.serialized:prepared!.serialized,profile,key,controller.signal,deps.fetcher);usage=response.usage;check();
    let result;
    if(input.mode==='chat'){
      validateShape(response.output,chatSchema);const answer=(response.output as {answer:string}).answer;
      if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(answer))throw new OutputValidationError('UNSAFE_PROSE','$.answer');
      result={status:'ok' as const,mode:'chat' as const,answer};
    }else{
      const archived=admitted as Awaited<ReturnType<typeof beginGenerationAdmission>>;
      validateGroundedOutput(response.output,input,archived.evidence);
      const final=await reloadSelectedEvidence(db,input.receipt,input.selectedStoryIds,archived.binding,deps.secret,clock());check();
      result=validateGroundedOutput(response.output,input,final);
    }
    if(utf8Size(JSON.stringify({...result,credit:{charged:admitted.row.charged_credits,refund:{requested:100,applied:100,forfeited:100,full:false}}}))>64*1024){observeOutput(deps.onOutputDiagnostic,outputDiagnostic('PUBLIC_BODY_LIMIT'));throw new AssistantError('OUTPUT_LIMIT',502);}
    check();const settlement=await settleGeneration(db,handle,{valid:result.status==='ok',usage},clock());
    if(settlement.status==='result_not_retained')throw new GenerationFailure('RESULT_NOT_RETAINED',409,{settlement:'completed',refund:null});
    if(result.status==='ok'&&settlement.status!=='completed')throw new GenerationFailure('LEASE_EXPIRED',409,{settlement:settlement.status==='failed'?'failed':'refund_pending',refund:'refund' in settlement?settlement.refund??null:null});
    if(result.status==='insufficient_evidence'&&settlement.status!=='failed')throw new GenerationFailure('REFUND_PENDING',503,{settlement:'refund_pending',refund:null});
    // Never reverse committed success because delivery/abort/deadline is now ambiguous.
    if(controller.signal.aborted||clock()-start>=profile.serviceMs)throw new GenerationFailure('RESULT_NOT_RETAINED',409,{settlement:settlement.status==='completed'?'completed':'failed',refund:'refund' in settlement?settlement.refund??null:null});
    return {...result,credit:{charged:admitted.row.charged_credits,refund:'refund' in settlement?settlement.refund??null:null}};
  }catch(error){
    if(error instanceof GenerationFailure)throw error;
    if(error instanceof ProviderError||error instanceof OutputValidationError)observeOutput(deps.onOutputDiagnostic,error.diagnostic);
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
