import {isSourceId} from '../collection/source-settings';
import {normalizeWorkText} from '../news-work/matcher';
import {ARCHIVE_WINDOW_MS} from '../news/archive-snapshot';
import {AssistantError,unicodeLength,type RetrievalRequest,type RetrievalFilters} from './types';

function object(value:unknown,keys:readonly string[]):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new AssistantError('INVALID_REQUEST');
  return value as Record<string,unknown>;
}
export function opaqueId(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0&&unicodeLength(value)<=200&&!/[\u0000-\u001f\u007f]/u.test(value);}
function instant(value:unknown){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw new AssistantError('INVALID_REQUEST');
  return value;
}
export function validateRetrieval(value:unknown,now=Date.now()):RetrievalRequest{
  const data=object(value,['mode','query','filters']);
  if(data.mode!=='qa'&&data.mode!=='script')throw new AssistantError('INVALID_REQUEST');
  if(typeof data.query!=='string'||!data.query.trim()||unicodeLength(data.query)>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(data.query))throw new AssistantError('INVALID_REQUEST');
  const raw=object(data.filters,['workId','category','sourceIds','dateFrom','dateTo']),filters:RetrievalFilters={};
  for(const field of ['workId','category'] as const)if(field in raw){if(!opaqueId(raw[field]))throw new AssistantError('INVALID_REQUEST');filters[field]=raw[field] as string;}
  if('sourceIds' in raw){
    if(!Array.isArray(raw.sourceIds)||raw.sourceIds.length>7||!raw.sourceIds.length||!raw.sourceIds.every(isSourceId)||new Set(raw.sourceIds).size!==raw.sourceIds.length)throw new AssistantError('INVALID_REQUEST');
    filters.sourceIds=[...raw.sourceIds].sort();
  }
  for(const field of ['dateFrom','dateTo'] as const)if(field in raw){filters[field]=instant(raw[field]);const time=Date.parse(filters[field]!);if(time<now-ARCHIVE_WINDOW_MS||time>now)throw new AssistantError('INVALID_REQUEST');}
  if(filters.dateFrom&&filters.dateTo&&filters.dateFrom>filters.dateTo)throw new AssistantError('INVALID_REQUEST');
  const query=normalizeWorkText(data.query);
  if(unicodeLength(query)>500)throw new AssistantError('INVALID_REQUEST');
  return {mode:data.mode,query,filters};
}
