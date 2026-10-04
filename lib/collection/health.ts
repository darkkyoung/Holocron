import type {SourceStats} from './processor';
import {sourceAdapters,type SourceId} from './sources';

export const COLLECTION_HEALTH_VERSION=1;
export type StoredCollectionHealthStatus='healthy'|'warning'|'danger';
export type CollectionHealthStatus=StoredCollectionHealthStatus|'disabled'|'unknown';

export type StoredSourceHealth={
  lastCheckedAt:string;lastHealthyAt:string|null;lastDiscovered:number;lastInserted:number;
  lastPrimaryDiscovered:number;lastBackfillDiscovered:number;consecutiveZeroDiscoveries:number;
  consecutiveFailures:number;lastError:string;lastStatus:StoredCollectionHealthStatus;
  metadataFailure:number;headlineOnlyFallback:number;backfillFailures:number;
};
export type CollectionHealthSnapshot={version:1;sources:Partial<Record<SourceId,StoredSourceHealth>>};
export type CollectionSourceHealthView=StoredSourceHealth&{sourceId:SourceId;source:string;status:CollectionHealthStatus};
export type CollectionHealthSource={id:SourceId;name:string;enabled:boolean};

const validStatuses=new Set<StoredCollectionHealthStatus>(['healthy','warning','danger']);
const sourceIds=new Set(sourceAdapters.map(source=>source.id));
const emptySnapshot=():CollectionHealthSnapshot=>({version:COLLECTION_HEALTH_VERSION,sources:{}});
const count=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.floor(value):0;

function storedSourceHealth(value:unknown):StoredSourceHealth|null{
  if(!value||typeof value!=='object')return null;
  const item=value as Partial<StoredSourceHealth>;
  if(typeof item.lastCheckedAt!=='string'||!validStatuses.has(item.lastStatus as StoredCollectionHealthStatus))return null;
  return {
    lastCheckedAt:item.lastCheckedAt,lastHealthyAt:typeof item.lastHealthyAt==='string'?item.lastHealthyAt:null,
    lastDiscovered:count(item.lastDiscovered),lastInserted:count(item.lastInserted),
    lastPrimaryDiscovered:count(item.lastPrimaryDiscovered),lastBackfillDiscovered:count(item.lastBackfillDiscovered),
    consecutiveZeroDiscoveries:count(item.consecutiveZeroDiscoveries),consecutiveFailures:count(item.consecutiveFailures),
    lastError:typeof item.lastError==='string'?item.lastError.slice(0,500):'',lastStatus:item.lastStatus as StoredCollectionHealthStatus,
    metadataFailure:count(item.metadataFailure),headlineOnlyFallback:count(item.headlineOnlyFallback),backfillFailures:count(item.backfillFailures),
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
};}

export function updateCollectionHealthSnapshot(previous:CollectionHealthSnapshot,stats:readonly SourceStats[],checkedAt:string):CollectionHealthSnapshot{
  const sources={...previous.sources};
  for(const result of stats){
    if(!sourceIds.has(result.sourceId as SourceId)||result.disabled)continue;
    const id=result.sourceId as SourceId,prior=sources[id];
    if(result.sourceFailure){
      const consecutiveFailures=(prior?.consecutiveFailures??0)+1;
      sources[id]={...detail(result),lastCheckedAt:checkedAt,lastHealthyAt:prior?.lastHealthyAt??null,
        consecutiveZeroDiscoveries:prior?.consecutiveZeroDiscoveries??0,consecutiveFailures,
        lastError:result.sourceFailure.slice(0,500),lastStatus:consecutiveFailures>=2?'danger':'warning'};
      continue;
    }
    if(result.discovered===0){
      const consecutiveZeroDiscoveries=(prior?.consecutiveZeroDiscoveries??0)+1;
      sources[id]={...detail(result),lastCheckedAt:checkedAt,lastHealthyAt:prior?.lastHealthyAt??null,
        consecutiveZeroDiscoveries,consecutiveFailures:0,lastError:'',
        lastStatus:consecutiveZeroDiscoveries>=3?'danger':consecutiveZeroDiscoveries>=2?'warning':'healthy'};
      continue;
    }
    sources[id]={...detail(result),lastCheckedAt:checkedAt,lastHealthyAt:checkedAt,
      consecutiveZeroDiscoveries:0,consecutiveFailures:0,lastError:'',lastStatus:'healthy'};
  }
  return {version:COLLECTION_HEALTH_VERSION,sources};
}

export function collectionHealthView(snapshot:CollectionHealthSnapshot,sources:readonly CollectionHealthSource[]):CollectionSourceHealthView[]{
  return sources.map(source=>{
    const stored=snapshot.sources[source.id];
    const fallback:StoredSourceHealth={lastCheckedAt:'',lastHealthyAt:null,lastDiscovered:0,lastInserted:0,lastPrimaryDiscovered:0,lastBackfillDiscovered:0,consecutiveZeroDiscoveries:0,consecutiveFailures:0,lastError:'',lastStatus:'healthy',metadataFailure:0,headlineOnlyFallback:0,backfillFailures:0};
    return {...fallback,...stored,sourceId:source.id,source:source.name,status:source.enabled?(stored?.lastStatus??'unknown'):'disabled'};
  });
}

export function formatCollectionHealthTime(value:string){
  const date=new Date(value);if(Number.isNaN(date.getTime()))return '확인 기록 없음';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??'';
  return `${part('year')}. ${part('month')}. ${part('day')}. ${part('hour')}:${part('minute')}`;
}
