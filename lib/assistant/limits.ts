import {AssistantError,type AssistantCode} from './types';
export const AI_ACTIONS={chat:{credits:0,weight:1},qa:{credits:5,weight:1},planner:{credits:7,weight:4},draft:{credits:15,weight:4}} as const;
export type GenerationAction=keyof typeof AI_ACTIONS;
export const ADMISSION_LIMITS={sessionHour:5,sessionDay:12,networkHour:30,networkDay:80,globalDay:200,
  dailyMicros:2_000_000,sessionConcurrent:1,globalConcurrent:3,leaseMs:60_000,
  retrievalSession:10,retrievalNetwork:40,retrievalGlobal:200,capacity:10_000,cleanup:100,
  retrievalRetentionMs:600_000,generationRetentionMs:172_800_000} as const;
export const utcDay=(now:number)=>Math.floor(now/86_400_000)*86_400_000;
export function admissionClock(now:number){if(!Number.isSafeInteger(now)||now<0||now>8_000_000_000_000_000)throw new AssistantError('INVALID_REQUEST',400);return now;}
export function generationAction(value:unknown):GenerationAction{
  if(typeof value!=='string'||!Object.hasOwn(AI_ACTIONS,value))throw new AssistantError('INVALID_REQUEST',400);
  return value as GenerationAction;
}
export function requestId(value:unknown):string{
  if(typeof value!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))throw new AssistantError('INVALID_REQUEST',400);
  return value;
}
export function admissionFailure(code:AssistantCode):never{
  throw new AssistantError(code,code==='LOGIN_REQUIRED'?401:code==='INSUFFICIENT_BALANCE'?402:code==='GUEST_ACTION_FORBIDDEN'?403:
    ['PRICE_CHANGED','REQUEST_IN_PROGRESS','RESULT_NOT_RETAINED','REQUEST_CONFLICT','REFUND_PENDING','LEASE_EXPIRED'].includes(code)?409:
    ['ADMISSION_LIMIT','MONTHLY_BUDGET_EXCEEDED'].includes(code)?429:503);
}
