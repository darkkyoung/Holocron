import {AssistantError,unicodeLength} from './types';
import {opaqueId} from './validation';
import {requestId,type GenerationAction} from './limits';
export type GenerateRequest={requestId:string;mode:'qa'|'script';receipt:string;selectedStoryIds:string[];instructions:string;includeDraft:boolean;policyVersion?:number};
export function generationPreferences(action:GenerationAction,instructions:unknown='',includeDraft:unknown=action==='draft'){
  if(typeof instructions!=='string'||unicodeLength(instructions)>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(instructions)||typeof includeDraft!=='boolean'||includeDraft!==(action==='draft')||(action==='qa'&&instructions.trim()))throw new AssistantError('INVALID_REQUEST');
  return {instructions:instructions.trim(),includeDraft};
}
export function validateGenerate(value:unknown):GenerateRequest{
  if(!value||typeof value!=='object'||Array.isArray(value)||!['includeDraft,instructions,mode,receipt,requestId,selectedStoryIds','includeDraft,instructions,mode,policyVersion,receipt,requestId,selectedStoryIds'].includes(Object.keys(value).sort().join(',')))throw new AssistantError('INVALID_REQUEST');
  const v=value as Record<string,unknown>;
  if(v.policyVersion!==undefined&&(typeof v.policyVersion!=='number'||!Number.isSafeInteger(v.policyVersion)||v.policyVersion<1))throw new AssistantError('INVALID_REQUEST');
  if(v.mode!=='qa'&&v.mode!=='script')throw new AssistantError('INVALID_REQUEST');
  if(typeof v.receipt!=='string'||!v.receipt||v.receipt.length>24000||!Array.isArray(v.selectedStoryIds)||!v.selectedStoryIds.length||v.selectedStoryIds.length>(v.mode==='qa'?6:8)||!v.selectedStoryIds.every(opaqueId)||new Set(v.selectedStoryIds).size!==v.selectedStoryIds.length)throw new AssistantError('INVALID_REQUEST');
  // MVP exposes Q&A and the existing Planner only. Reject before DB/admission.
  if(v.includeDraft!==false)throw new AssistantError('INVALID_REQUEST');
  const action=v.mode==='qa'?'qa':'planner';
  return {...(v.policyVersion===undefined?{}:{policyVersion:v.policyVersion as number}),requestId:requestId(v.requestId),mode:v.mode,receipt:v.receipt,selectedStoryIds:[...v.selectedStoryIds].sort(),...generationPreferences(action,v.instructions,v.includeDraft)};
}
export function actionFor(request:GenerateRequest):GenerationAction{
  if(request.includeDraft!==false||!['qa','script'].includes(request.mode))throw new AssistantError('INVALID_REQUEST');
  return request.mode==='qa'?'qa':'planner';
}
