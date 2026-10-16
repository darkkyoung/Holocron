import type {CostProfile} from './cost';
import type {GenerationAction} from './limits';
import {AssistantError} from './types';
/** Reviewed 2026-10-16. Explicit opt-in only; never collection OPENAI_MODEL/key fallback. */
export const ASSISTANT_PROFILE='gpt-5.4-mini-2026-03-17-o200k-v1';
export function providerProfile(id:unknown,action:GenerationAction){
  if(id!==ASSISTANT_PROFILE||!['qa','planner','draft'].includes(action))throw new AssistantError('INVALID_COST_PROFILE',503);
  const cost:CostProfile={id:ASSISTANT_PROFILE,maxInputTokens:16000,maxOutputTokens:action==='qa'?1600:4800,inputMicrosPerMillion:750000,outputMicrosPerMillion:4500000};
  return {id:ASSISTANT_PROFILE,model:'gpt-5.4-mini-2026-03-17',tokenizer:'o200k_base',cost,providerMs:action==='qa'?30000:45000,serviceMs:action==='qa'?35000:50000} as const;
}
export type ProviderProfile=ReturnType<typeof providerProfile>;
export function providerKey(value:unknown):string{
  if(typeof value!=='string'||!value.trim()||value.length>512||/[\s\u0000-\u001f\u007f]/u.test(value))throw new AssistantError('PROVIDER_CONFIGURATION',503);
  return value;
}
