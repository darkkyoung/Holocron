import type {AssistantMode,FilterDraft} from './contracts';
// Selection and guide wording are not search inputs; source ordering is not meaningful.
export function searchSnapshot(mode:AssistantMode,query:string,filters:FilterDraft){
  return JSON.stringify([mode,query.trim(),filters.workId,filters.category,[...filters.sourceIds].sort(),filters.dateFrom,filters.dateTo]);
}
export function receiptExpired(expiresAt:number,now=Date.now()){
  return !Number.isSafeInteger(expiresAt)||expiresAt<=now;
}
