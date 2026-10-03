import {config,type Article} from '../news';
import {applyAutomaticDecision} from '../admin/override-policy';
import {processWithOpenAi,type AiOutput} from './openai';
import {editorialReason,isRelevant,publicationDate,runIsolated} from './policy';
import type {Candidate,SourceAdapter} from './sources';
import {insertCollectedArticle} from './repository';
import {createCandidateEnricher} from './metadata';
import {queueSourceCandidates} from './candidate-queue';
import {candidateDate,type HistoricalRange} from './date-range';
import type {DiscoveryResult} from './discovery';

export type SourceStats={
  sourceId:string;source:string;disabled:boolean;discovered:number;inserted:number;published:number;review:number;duplicate:number;
  editorial:number;irrelevant:number;expired:number;invalidUrl:number;metadataFailure:number;dateReview:number;aiFailure:number;
  processingFailure:number;persistenceFailure:number;deferred:number;sourceFailure:string;primaryDiscovered:number;backfillDiscovered:number;
  backfillRequests:number;backfillFailures:number;headlineOnlyFallback:number;attempted:number;discoveryPaths:string[];coverage:'complete'|'limited';coverageNote:string;
};

export function createSourceStats(adapter:SourceAdapter,disabled=false):SourceStats{return {sourceId:adapter.id,source:adapter.name,disabled,discovered:0,inserted:0,published:0,review:0,duplicate:0,editorial:0,irrelevant:0,expired:0,invalidUrl:0,metadataFailure:0,dateReview:0,aiFailure:0,processingFailure:0,persistenceFailure:0,deferred:0,sourceFailure:'',primaryDiscovered:0,backfillDiscovered:0,backfillRequests:0,backfillFailures:0,headlineOnlyFallback:0,attempted:0,discoveryPaths:[],coverage:'complete',coverageNote:''};}

export function sourceReportLine(result:SourceStats,historical=false){
  if(result.disabled)return `${result.source}: 수집 비활성화`;
  if(result.sourceFailure)return `${result.source}: 수집원 실패 — ${result.sourceFailure}`;
  const discovery=`${result.discovered}건 발견 (${result.primaryDiscovered}건 primary + ${result.backfillDiscovered}건 ${historical?'historical':'rolling'})`;
  const details=[discovery,`${result.inserted}건 신규`,`${result.published}건 공개`,`${result.review}건 검토`,`${result.duplicate}건 중복`,`${result.editorial}건 편집 필터`,`${result.irrelevant}건 관련성 제외`,`${result.expired}건 기간 제외`];
  if(result.invalidUrl)details.push(`${result.invalidUrl}건 URL 오류`);if(result.metadataFailure)details.push(`${result.metadataFailure}건 메타데이터 검토`);if(result.dateReview)details.push(`${result.dateReview}건 게시일 검토`);if(result.aiFailure)details.push(`${result.aiFailure}건 AI 실패`);if(result.processingFailure)details.push(`${result.processingFailure}건 처리 실패`);if(result.persistenceFailure)details.push(`${result.persistenceFailure}건 저장 실패`);if(result.deferred)details.push(`${result.deferred}건 다음 실행으로 이월`);if(result.headlineOnlyFallback)details.push(`${result.headlineOnlyFallback}건 제목 한정 fallback`);if(result.backfillFailures)details.push(`${result.backfillFailures}/${result.backfillRequests} archive 요청 실패`);
  if(result.discoveryPaths.length)details.push(`경로 ${result.discoveryPaths.join('+')}`);if(historical&&result.coverage==='limited')details.push(`제한: ${result.coverageNote}`);
  return `${result.source}: ${details.join(' · ')}`;
}

function fallbackOutput(candidate:Candidate):AiOutput{return {title:candidate.title||'제목 확인 필요',summary:candidate.description||(candidate.headlineOnly?candidate.title:'원문 메타데이터를 확인해 주세요.'),category:'기타',topic:crypto.randomUUID()};}

export async function processSourceCandidates(adapter:SourceAdapter,discovery:DiscoveryResult,articles:Article[],known:Set<string>,limit:number,now=Date.now(),range?:HistoricalRange){
  const result=createSourceStats(adapter);Object.assign(result,{discovered:discovery.candidates.length+(discovery.knownSkipped??0),primaryDiscovered:discovery.primaryDiscovered,backfillDiscovered:discovery.backfillDiscovered,backfillRequests:discovery.backfillRequests,backfillFailures:discovery.backfillFailures.length,discoveryPaths:discovery.discoveryPaths,coverage:discovery.coverage,coverageNote:discovery.coverageNote});
  const queue=queueSourceCandidates(adapter,discovery.candidates,known,limit);result.attempted=queue.queued.length;result.invalidUrl+=queue.invalidUrl;result.duplicate+=(discovery.knownSkipped??0)+queue.duplicate;result.irrelevant+=queue.irrelevant;result.deferred+=queue.deferred;
  const enrich=createCandidateEnricher(adapter);
  await runIsolated(queue.queued,async({candidate:initial,url})=>{
    const enriched=await enrich(initial),candidate=enriched.candidate;if(candidate.headlineOnly)result.headlineOnlyFallback++;
    let metadataProblem=enriched.problem;if(metadataProblem)result.metadataFailure++;
    if(!isRelevant(adapter.trusted,candidate.title,candidate.description,url)){result.irrelevant++;return;}
    const date=publicationDate(candidate.published,now);if(date.kind==='expired'){result.expired++;return;}if(date.kind==='review'){result.dateReview++;metadataProblem=metadataProblem||date.reason;}
    if(range){const calendar=candidateDate(candidate,now);if(calendar&&(calendar<range.start||calendar>range.end)){result.expired++;return;}}
    const editorial=editorialReason(candidate.title,candidate.description,url);if(editorial)result.editorial++;
    let output=fallbackOutput(candidate),aiProblem='';
    if(!editorial&&!metadataProblem){try{const {key,model}=config();output=await processWithOpenAi(candidate.title,candidate.description,articles,key,model,{source:adapter.name,url,published:date.value,headlineOnly:candidate.headlineOnly});}catch(error){aiProblem=`AI 처리 실패: ${error instanceof Error?error.message:'알 수 없는 오류'}`;result.aiFailure++;}}
    const automaticReason=editorial||metadataProblem||aiProblem;
    const decision=applyAutomaticDecision({topic:output.topic,topicOverride:null,status:'published',statusOverride:null,reason:''},automaticReason?{status:'review',reason:automaticReason}:{status:'published',reason:''});
    const article:Article={id:crypto.randomUUID(),topic:decision.topic,topicOverride:null,title:output.title,titleOverride:null,summary:output.summary,image:candidate.image,url,source:adapter.name,published:date.value,category:output.category,status:decision.status,statusOverride:null,reason:decision.reason,franchise:'star-wars'};
    try{if(!await insertCollectedArticle(article)){result.duplicate++;known.add(url);return;}}catch{result.persistenceFailure++;return;}
    known.add(url);articles.push(article);result.inserted++;if(article.status==='review')result.review++;else result.published++;
  },async()=>{result.processingFailure++;});
  return result;
}
