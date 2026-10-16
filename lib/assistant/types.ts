import type {SourceId} from '../collection/source-settings';
export const EVIDENCE_POLICY='holocron-evidence-v1';
export type RetrievalFilters={workId?:string;category?:string;sourceIds?:SourceId[];dateFrom?:string;dateTo?:string};
export type RetrievalRequest={mode:'qa'|'script';query:string;filters:RetrievalFilters};
export type AssistantCode='INVALID_REQUEST'|'EVIDENCE_CHANGED'|'EVIDENCE_TOO_LARGE'|'ASSISTANT_UNAVAILABLE'|'INTERNAL_ERROR';
export class AssistantError extends Error{
  constructor(public readonly code:AssistantCode,public readonly status=400){super(code);}
}
export const unicodeLength=(value:string)=>Array.from(value).length;
export const compareText=(a:string,b:string)=>a<b?-1:a>b?1:0;
