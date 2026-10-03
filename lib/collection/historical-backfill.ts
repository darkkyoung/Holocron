import {list} from '../news';
import {knownUrlSet,runIsolated} from './policy';
import {sourceAdapters,type SourceId} from './sources';
import {enabledSourceAdapters} from './source-settings';
import {loadSourceEnabledState} from './source-settings-repository';
import {fetchSourceText} from './metadata';
import {discoverSourceCandidates} from './discovery';
import {parseHistoricalRange,type HistoricalRange} from './date-range';
import {createSourceStats,processSourceCandidates,sourceReportLine,type SourceStats} from './processor';
import {acquireCollectionLock,releaseCollectionLock} from './run-repository';
import {COLLECTION_LOCK_LEASE_MS} from './run';

export const MAX_HISTORICAL_NEW_PER_SOURCE=20;
export const MAX_HISTORICAL_CANDIDATES=100;
export type HistoricalBackfillResult={ok:true;range:HistoricalRange;sources:SourceStats[];discovered:number;count:number;published:number;review:number;duplicate:number;deferred:number;report:string[]};

export async function runHistoricalBackfill(startValue:unknown,endValue:unknown,requestedSourceIds:unknown,now=Date.now()):Promise<HistoricalBackfillResult>{
  const range=parseHistoricalRange(startValue,endValue,now);
  const enabled=enabledSourceAdapters(await loadSourceEnabledState());
  let selected=enabled;
  if(requestedSourceIds!==undefined){
    if(!Array.isArray(requestedSourceIds)||!requestedSourceIds.length||requestedSourceIds.some(id=>typeof id!=='string'||!sourceAdapters.some(adapter=>adapter.id===id)))throw new Error('복구할 뉴스 소스를 확인해 주세요.');
    const wanted=new Set(requestedSourceIds as SourceId[]);selected=enabled.filter(adapter=>wanted.has(adapter.id));
  }
  if(!selected.length)throw new Error('활성화된 복구 대상 소스가 없습니다.');
  const owner=crypto.randomUUID(),startedAt=new Date(now).toISOString(),expiresAt=new Date(now+COLLECTION_LOCK_LEASE_MS).toISOString();
  if(!await acquireCollectionLock(owner,'manual',startedAt,expiresAt))throw new Error('현재 다른 수집 작업이 진행 중입니다.');
  try{
    const articles=await list(),known=knownUrlSet(articles.map(article=>article.url));let remaining=MAX_HISTORICAL_CANDIDATES;
    const results=await runIsolated(selected,async adapter=>{
      const discovery=await discoverSourceCandidates(adapter,fetchSourceText,{mode:'historical',range,now,articles});
      const limit=Math.min(MAX_HISTORICAL_NEW_PER_SOURCE,remaining);
      if(limit<=0)return {...createSourceStats(adapter),discovered:discovery.candidates.length+discovery.knownSkipped,duplicate:discovery.knownSkipped,deferred:discovery.candidates.length,coverage:discovery.coverage,coverageNote:discovery.coverageNote,discoveryPaths:discovery.discoveryPaths};
      const result=await processSourceCandidates(adapter,discovery,articles,known,limit,now,range);remaining-=result.attempted;return result;
    },async(adapter,error)=>({...createSourceStats(adapter),sourceFailure:error instanceof Error?error.message:'알 수 없는 오류'}));
    const discovered=results.reduce((sum,result)=>sum+result.discovered,0),count=results.reduce((sum,result)=>sum+result.inserted,0),published=results.reduce((sum,result)=>sum+result.published,0),review=results.reduce((sum,result)=>sum+result.review,0),duplicate=results.reduce((sum,result)=>sum+result.duplicate,0),deferred=results.reduce((sum,result)=>sum+result.deferred,0);
    const report=[`과거 뉴스 복구 ${range.start} ~ ${range.end} (UTC date, inclusive)`,...results.map(result=>sourceReportLine(result,true)),`전체: 발견 ${discovered}건 · 신규 ${count}건 · 공개 ${published}건 · 검토 ${review}건 · 중복 ${duplicate}건 · 이월 ${deferred}건`];
    return {ok:true,range,sources:results,discovered,count,published,review,duplicate,deferred,report};
  }finally{await releaseCollectionLock(owner);}
}
