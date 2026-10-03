import {list} from './news';
import {knownUrlSet,runIsolated} from './collection/policy';
import {sourceAdapters,type SourceAdapter} from './collection/sources';
import {runEditorialMaintenanceOnce} from './collection/repository';
import {backfillPublishedLocalization} from './collection/localization';
import {enabledSourceAdapters} from './collection/source-settings';
import {loadSourceEnabledState} from './collection/source-settings-repository';
import {fetchSourceText} from './collection/metadata';
import {discoverSourceCandidates} from './collection/discovery';
import {createSourceStats,processSourceCandidates,sourceReportLine,type SourceStats} from './collection/processor';

const MAX_NEW_PER_SOURCE=12;
export type {SourceStats} from './collection/processor';

async function collectSource(adapter:SourceAdapter,articles:Awaited<ReturnType<typeof list>>,known:Set<string>,now:number){
  let discovery;
  try{discovery=await discoverSourceCandidates(adapter,fetchSourceText,{now,mode:'normal',articles});}
  catch(error){throw new Error(`discovery fetch 실패: ${error instanceof Error?error.message:'알 수 없는 오류'}`);}
  if(!discovery.candidates.length)throw new Error(`지원하는 기사 목록 형식을 찾지 못했습니다. primary ${discovery.primaryDiscovered}건 / rolling ${discovery.backfillDiscovered}건`);
  return processSourceCandidates(adapter,discovery,articles,known,MAX_NEW_PER_SOURCE,now);
}

export type CollectionResult={ok:true;count:number;repaired:number;activeSources:number;sources:SourceStats[];localization:{candidates:number;succeeded:number;failed:number;skipped:number;deferred:number;report:string[]};report:string[]};

export async function collect():Promise<CollectionResult>{
  const now=Date.now(),repaired=await runEditorialMaintenanceOnce(),articles=await list(),known=knownUrlSet(articles.map(article=>article.url));
  const sourceState=await loadSourceEnabledState();
  const enabled=enabledSourceAdapters(sourceState);
  const collected=await runIsolated(enabled,adapter=>collectSource(adapter,articles,known,now),async(adapter,error)=>({...createSourceStats(adapter),sourceFailure:error instanceof Error?error.message:'알 수 없는 오류'}));
  const collectedById=new Map(collected.map(result=>[result.sourceId,result]));
  const results=sourceAdapters.map(adapter=>collectedById.get(adapter.id)??createSourceStats(adapter,true)),report=results.map(result=>sourceReportLine(result));
  if(repaired)report.unshift(`기존 공개 기사: 편집성 콘텐츠 ${repaired}건을 검토 대기로 이동`);
  if(!enabled.length){report.push('활성화된 뉴스 소스가 없습니다.');const localization={candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:[] as string[]};return {ok:true,count:0,repaired,activeSources:0,sources:results,localization,report};}
  let localization;try{localization=await backfillPublishedLocalization();}catch{localization={candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:['기존 영문 기사 한글화: 조회 실패']};}
  report.push(...localization.report);const count=results.reduce((sum,result)=>sum+result.inserted,0);
  return {ok:true,count,repaired,activeSources:enabled.length,sources:results,localization,report};
}
