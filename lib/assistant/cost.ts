import {AssistantError} from './types';
import {ADMISSION_LIMITS} from './limits';
/** Server configuration only. No default model or assumed API price in 9D-B. */
export type CostProfile={id:string;maxInputTokens:number;maxOutputTokens:number;inputMicrosPerMillion:number;outputMicrosPerMillion:number};
export type Usage={inputTokens:number;outputTokens:number};
function invalid():never{throw new AssistantError('INVALID_COST_PROFILE',503);}
export function validateCostProfile(profile:CostProfile|undefined):CostProfile{
  if(!profile||Object.keys(profile).sort().join(',')!=='id,inputMicrosPerMillion,maxInputTokens,maxOutputTokens,outputMicrosPerMillion'||
    !/^[a-zA-Z0-9._-]{1,80}$/.test(profile.id))invalid();
  for(const value of [profile.maxInputTokens,profile.maxOutputTokens,profile.inputMicrosPerMillion,profile.outputMicrosPerMillion]){
    if(!Number.isSafeInteger(value)||value<=0||value>1_000_000_000)invalid();
  }
  return {...profile};
}
export function estimatedCost(profile:CostProfile,usage:Usage):number{
  validateCostProfile(profile);
  if(Object.keys(usage).sort().join(',')!=='inputTokens,outputTokens'||!Number.isSafeInteger(usage.inputTokens)||!Number.isSafeInteger(usage.outputTokens)||
    usage.inputTokens<0||usage.outputTokens<0||usage.inputTokens>profile.maxInputTokens||usage.outputTokens>profile.maxOutputTokens)invalid();
  const numerator=BigInt(usage.inputTokens)*BigInt(profile.inputMicrosPerMillion)+BigInt(usage.outputTokens)*BigInt(profile.outputMicrosPerMillion);
  const cost=Number((numerator+BigInt(999_999))/BigInt(1_000_000));
  if(!Number.isSafeInteger(cost)||cost>ADMISSION_LIMITS.dailyMicros)invalid();
  return cost;
}
export function reserveCost(profile:CostProfile){validateCostProfile(profile);return estimatedCost(profile,{inputTokens:profile.maxInputTokens,outputTokens:profile.maxOutputTokens});}
