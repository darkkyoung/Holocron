/** Server-validated policy; amounts are integer CR / whole USD, never floating money. */
export const DEFAULT_CREDIT_POLICY=Object.freeze({qaCredits:5,plannerCredits:7,guestFirst:1,opening:1,attendanceDaily:1,attendanceDay7:5,quizCorrect:3,accountFirst:3,monthlyLimitUsd:30,monthlyWarningUsd:20});
export type CreditPolicy={ [K in keyof typeof DEFAULT_CREDIT_POLICY]:number };
export type PolicyKey=keyof CreditPolicy;
export type PolicySnapshot={version:number;values:CreditPolicy;changedAt:string};
export type PublicCreditPolicy={version:number;prices:{qa:number;planner:number};rewards:{guestFirst:number;opening:number;attendanceDaily:number;attendanceDay7:number;quizCorrect:number;accountFirst:number}};
export class PolicyError extends Error{constructor(public code:'INVALID_POLICY'|'POLICY_CONFLICT'|'POLICY_UNAVAILABLE',public status:number){super(code);}}
export function validatePolicy(input:unknown):CreditPolicy{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new PolicyError('INVALID_POLICY',400);
  const value=input as Record<string,unknown>,keys=Object.keys(DEFAULT_CREDIT_POLICY);
  if(Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k)))throw new PolicyError('INVALID_POLICY',400);
  for(const key of keys){const n=value[key],max=key.startsWith('monthly')?1000:key.endsWith('Credits')?100:10;
    if(typeof n!=='number'||!Number.isSafeInteger(n)||n<1||n>max)throw new PolicyError('INVALID_POLICY',400);}
  if(Number(value.monthlyWarningUsd)>Number(value.monthlyLimitUsd))throw new PolicyError('INVALID_POLICY',400);
  return Object.fromEntries(keys.map(k=>[k,value[k]])) as CreditPolicy;
}
export function publicPolicy(p:PolicySnapshot):PublicCreditPolicy{
  const v=p.values;return {version:p.version,prices:{qa:v.qaCredits,planner:v.plannerCredits},rewards:{guestFirst:v.guestFirst,opening:v.opening,attendanceDaily:v.attendanceDaily,attendanceDay7:v.attendanceDay7,quizCorrect:v.quizCorrect,accountFirst:v.accountFirst}};
}
export function kstMonth(now:number){return new Date(now+9*3600000).toISOString().slice(0,7);}
