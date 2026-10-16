import {Tiktoken} from 'js-tiktoken/lite';
import ranks from 'js-tiktoken/ranks/o200k_base';
import {ASSISTANT_PROFILE,type ProviderProfile} from './provider-profile';
import {AssistantError} from './types';
let tokenizer:Tiktoken|undefined;
export const utf8Size=(text:string)=>new TextEncoder().encode(text).length;
export function countTokens(text:string,profile:ProviderProfile){
  if(profile.id!==ASSISTANT_PROFILE||profile.model!=='gpt-5.4-mini-2026-03-17'||profile.tokenizer!=='o200k_base')throw new AssistantError('INVALID_COST_PROFILE',503);
  tokenizer??=new Tiktoken(ranks);
  // Special-token-looking archive text is ordinary untrusted text, never control framing.
  return tokenizer.encode(text,[],[]).length;
}
export function checkInputBudget(body:unknown,evidence:unknown,profile:ProviderProfile){
  const serialized=JSON.stringify(body),evidenceJson=JSON.stringify(evidence);
  if(utf8Size(serialized)>48*1024)throw new AssistantError('EVIDENCE_TOO_LARGE',413);
  const evidenceTokens=countTokens(evidenceJson,profile);
  // Count the ENTIRE wire JSON (schema, fixed instructions, field names, user text),
  // plus 1024 tokens for provider role/schema framing. Local counts aren't invoice truth.
  const inputTokens=countTokens(serialized,profile)+1024;
  if(evidenceTokens>12000||inputTokens>16000)throw new AssistantError('EVIDENCE_TOO_LARGE',413);
  return {serialized,evidenceTokens,inputTokens,bytes:utf8Size(serialized)};
}
