import type {SourceId} from '../collection/source-settings';
export const EVIDENCE_POLICY='holocron-evidence-v1';
export type RetrievalFilters={workId?:string;category?:string;sourceIds?:SourceId[];dateFrom?:string;dateTo?:string};
export type RetrievalRequest={mode:'qa'|'script';query:string;filters:RetrievalFilters};
export type AssistantCode='ARCHIVE_UNAVAILABLE'|'ARCHIVE_CAPACITY'|'PROVIDER_CONFIGURATION'|'PROVIDER_UNAVAILABLE'|'PROVIDER_RATE_LIMIT'|'PROVIDER_TIMEOUT'|'PROVIDER_REFUSAL'|'OUTPUT_LIMIT'|'INVALID_OUTPUT'|'REQUEST_CANCELLED'|'SERVICE_TIMEOUT'|'INVALID_REQUEST'|'EVIDENCE_CHANGED'|'EVIDENCE_TOO_LARGE'|'ASSISTANT_UNAVAILABLE'|'INTERNAL_ERROR'|'NETWORK_UNAVAILABLE'|'INVALID_COST_PROFILE'|'INSUFFICIENT_BALANCE'|'GUEST_ACTION_FORBIDDEN'|'REQUEST_IN_PROGRESS'|'RESULT_NOT_RETAINED'|'REQUEST_CONFLICT'|'REFUND_PENDING'|'LEASE_EXPIRED'|'ADMISSION_LIMIT'|'ADMISSION_CAPACITY'|'ADMISSION_UNAVAILABLE'|'OWNER_UNAVAILABLE'|'LOGIN_REQUIRED';
export class AssistantError extends Error{
  constructor(public readonly code:AssistantCode,public readonly status=400){super(code);}
}
export const unicodeLength=(value:string)=>Array.from(value).length;
export const compareText=(a:string,b:string)=>a<b?-1:a>b?1:0;
