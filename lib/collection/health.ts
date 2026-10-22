import type {SourceStats} from './processor';
import {sourceAdapters,type SourceId} from './sources';

export const COLLECTION_HEALTH_VERSION=1;
export type StoredCollectionHealthStatus='healthy'|'warning'|'danger';
export type CollectionHealthStatus=StoredCollectionHealthStatus|'disabled'|'unknown';

export type DiscoveryHealth={
  primary:'ok'|'failed'|'unknown';backfill:'ok'|'failed'|'not_requested'|'unknown';
  lastPrimarySuccessAt:string|null;lastBackfillSuccessAt:string|null;
  primaryError:string;backfillRequests:number;backfillErrors:string[];
};
export type StoredSourceHealth={
  discovery?:DiscoveryHealth;
  lastCheckedAt:string;lastHealthyAt:string|null;lastDiscovered:number;lastInserted:number;
  lastPrimaryDiscovered:number;lastBackfillDiscovered:number;consecutiveZeroDiscoveries:number;
  consecutiveFailures:number;lastError:string;lastStatus:StoredCollectionHealthStatus;
  metadataFailure:number;headlineOnlyFallback:number;backfillFailures:number;imageLookupFailures:number;imageLookupFailureReasons:string[];
};
export type CollectionHealthSnapshot={version:1;sources:Partial<Record<SourceId,StoredSourceHealth>>};
export type CollectionSourceHealthView=StoredSourceHealth&{sourceId:SourceId;source:string;status:CollectionHealthStatus};
export type CollectionHealthSource={id:SourceId;name:string;enabled:boolean};

const validStatuses=new Set<StoredCollectionHealthStatus>(['healthy','warning','danger']);
const sourceIds=new Set(sourceAdapters.map(source=>source.id));
const emptySnapshot=():CollectionHealthSnapshot=>({version:COLLECTION_HEALTH_VERSION,sources:{}});
const count=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.floor(value):0;
const reasons=(value:unknown)=>Array.isArray(value)?value.filter(item=>typeof item==='string').slice(0,3).map(item=>item.slice(0,160)):[];

function parseDiscoveryHealth(value:unknown):DiscoveryHealth|undefined{
  if(!value||typeof value!=='object')return undefined;
  const item=value as Partial<DiscoveryHealth>;
  if(!['ok','failed','unknown'].includes(item.primary??'')||!['ok','failed','not_requested','unknown'].includes(item.backfill??''))return undefined;
  return {primary:item.primary!,backfill:item.backfill!,
    lastPrimarySuccessAt:typeof item.lastPrimarySuccessAt==='string'?item.lastPrimarySuccessAt:null,
    lastBackfillSuccessAt:typeof item.lastBackfillSuccessAt==='string'?item.lastBackfillSuccessAt:null,
    primaryError:typeof item.primaryError==='string'?item.primaryError.slice(0,500):'',backfillRequests:count(item.backfillRequests),
    backfillErrors:Array.isArray(item.backfillErrors)?item.backfillErrors.filter((v):v is string=>typeof v==='string').slice(0,4).map(v=>v.slice(0,300)):[]};
}

function discoveryHealth(result:SourceStats,prior:StoredSourceHealth|undefined,checkedAt:string):DiscoveryHealth{
  const primary=result.sourceFailure||result.primaryFailure?'failed':'ok';
  // A thrown whole-source failure has no completed request accounting. Do not invent it.
  const backfill=result.sourceFailure?'unknown':result.backfillFailures>0?'failed':result.backfillRequests>0?'ok':'not_requested';
  return {primary,backfill,lastPrimarySuccessAt:primary==='ok'?checkedAt:prior?.discovery?.lastPrimarySuccessAt??null,
    lastBackfillSuccessAt:backfill==='ok'?checkedAt:prior?.discovery?.lastBackfillSuccessAt??null,
    primaryError:(result.sourceFailure||result.primaryFailure||'').slice(0,500),backfillRequests:count(result.backfillRequests),
    backfillErrors:(result.backfillFailureReasons??[]).slice(0,4).map(v=>v.slice(0,300))};
}

/** Historical v1 rows did not retain separate stage outcomes; never rewrite their history. */
export function collectionDiscoveryLabel(item:StoredSourceHealth):string{
  if(!item.discovery)return item.backfillFailures>0?'보완 수집 실패 기록 · 기본 경로 상세 미보존':'경로별 상세 미보존';
  if(item.discovery.primary==='failed')return item.discovery.backfill==='ok'?'기본 수집 실패 · 보완 수집 정상':'기본 수집 실패';
  if(item.discovery.primary==='unknown')return '기본 수집 확인 전';
  if(item.discovery.backfill==='failed')return item.discovery.backfillRequests>0&&item.backfillFailures>=item.discovery.backfillRequests?'기본 수집 정상 · 보완 수집 실패':'기본 수집 정상 · 보완 수집 일부 실패';
  if(item.discovery.backfill==='unknown')return '기본 수집 정상 · 보완 경로 확인 전';
  return item.discovery.backfill==='not_requested'?'기본 수집 정상 · 보완 요청 없음':'기본 / 보완 수집 정상';
}

function storedSourceHealth(value:unknown):StoredSourceHealth|null{
  if(!value||typeof value!=='object')return null;
  const item=value as Partial<StoredSourceHealth>;
  if(typeof item.lastCheckedAt!=='string'||!validStatuses.has(item.lastStatus as StoredCollectionHealthStatus))return null;
  return {
    discovery:parseDiscoveryHealth(item.discovery),
    lastCheckedAt:item.lastCheckedAt,lastHealthyAt:typeof item.lastHealthyAt==='string'?item.lastHealthyAt:null,
    lastDiscovered:count(item.lastDiscovered),lastInserted:count(item.lastInserted),
    lastPrimaryDiscovered:count(item.lastPrimaryDiscovered),lastBackfillDiscovered:count(item.lastBackfillDiscovered),
    consecutiveZeroDiscoveries:count(item.consecutiveZeroDiscoveries),consecutiveFailures:count(item.consecutiveFailures),
    lastError:typeof item.lastError==='string'?item.lastError.slice(0,500):'',lastStatus:item.lastStatus as StoredCollectionHealthStatus,
    metadataFailure:count(item.metadataFailure),headlineOnlyFallback:count(item.headlineOnlyFallback),backfillFailures:count(item.backfillFailures),
    imageLookupFailures:count(item.imageLookupFailures),imageLookupFailureReasons:reasons(item.imageLookupFailureReasons),
  };
}

export function parseCollectionHealthSnapshot(value:string|null|undefined):CollectionHealthSnapshot{
  if(!value)return emptySnapshot();
  try{
    const parsed=JSON.parse(value) as {version?:unknown;sources?:unknown};
    if(parsed.version!==COLLECTION_HEALTH_VERSION||!parsed.sources||typeof parsed.sources!=='object')return emptySnapshot();
    const sources:CollectionHealthSnapshot['sources']={};
    for(const [id,item] of Object.entries(parsed.sources)){
      if(!sourceIds.has(id as SourceId))continue;
      const normalized=storedSourceHealth(item);if(normalized)sources[id as SourceId]=normalized;
    }
    return {version:COLLECTION_HEALTH_VERSION,sources};
  }catch{return emptySnapshot();}
}

function detail(stats:SourceStats){return {
  lastDiscovered:stats.discovered,lastInserted:stats.inserted,lastPrimaryDiscovered:stats.primaryDiscovered,
  lastBackfillDiscovered:stats.backfillDiscovered,metadataFailure:stats.metadataFailure,
  headlineOnlyFallback:stats.headlineOnlyFallback,backfillFailures:stats.backfillFailures,
  imageLookupFailures:stats.imageLookupFailures,imageLookupFailureReasons:stats.imageLookupFailureReasons,
};}

export function updateCollectionHealthSnapshot(previous:CollectionHealthSnapshot,stats:readonly SourceStats[],checkedAt:string):CollectionHealthSnapshot{
  const sources={...previous.sources};
  for(const result of stats){
    if(!sourceIds.has(result.sourceId as SourceId)||result.disabled)continue;
    const id=result.sourceId as SourceId,prior=sources[id],discovery=discoveryHealth(result,prior,checkedAt);
    if(result.sourceFailure||result.primaryFailure||result.backfillFailures>0){
      const consecutiveFailures=(prior?.consecutiveFailures??0)+1;
      sources[id]={...detail(result),discovery,lastCheckedAt:checkedAt,lastHealthyAt:prior?.lastHealthyAt??null,
        consecutiveZeroDiscoveries:prior?.consecutiveZeroDiscoveries??0,consecutiveFailures,
        lastError:(result.sourceFailure||result.primaryFailure||`보완 탐색 ${result.backfillFailures}건 실패`).slice(0,500),lastStatus:consecutiveFailures>=2?'danger':'warning'};
      continue;
    }
    if(result.discovered===0){
      const consecutiveZeroDiscoveries=(prior?.consecutiveZeroDiscoveries??0)+1;
      sources[id]={...detail(result),discovery,lastCheckedAt:checkedAt,lastHealthyAt:prior?.lastHealthyAt??null,
        consecutiveZeroDiscoveries,consecutiveFailures:0,lastError:'',
        lastStatus:consecutiveZeroDiscoveries>=3?'danger':consecutiveZeroDiscoveries>=2?'warning':'healthy'};
      continue;
    }
    sources[id]={...detail(result),discovery,lastCheckedAt:checkedAt,lastHealthyAt:checkedAt,
      consecutiveZeroDiscoveries:0,consecutiveFailures:0,lastError:'',lastStatus:'healthy'};
  }
  return {version:COLLECTION_HEALTH_VERSION,sources};
}

export function collectionHealthView(snapshot:CollectionHealthSnapshot,sources:readonly CollectionHealthSource[]):CollectionSourceHealthView[]{
  return sources.map(source=>{
    const stored=snapshot.sources[source.id];
    const fallback:StoredSourceHealth={lastCheckedAt:'',lastHealthyAt:null,lastDiscovered:0,lastInserted:0,lastPrimaryDiscovered:0,lastBackfillDiscovered:0,consecutiveZeroDiscoveries:0,consecutiveFailures:0,lastError:'',lastStatus:'healthy',metadataFailure:0,headlineOnlyFallback:0,backfillFailures:0,imageLookupFailures:0,imageLookupFailureReasons:[]};
    return {...fallback,...stored,sourceId:source.id,source:source.name,status:source.enabled?(stored?.lastStatus??'unknown'):'disabled'};
  });
}

export function formatCollectionHealthTime(value:string){
  const date=new Date(value);if(Number.isNaN(date.getTime()))return '확인 기록 없음';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??'';
  return `${part('year')}. ${part('month')}. ${part('day')}. ${part('hour')}:${part('minute')}`;
}
