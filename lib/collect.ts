import {config,list,setting,type Article} from './news';
import {applyAutomaticDecision} from './admin/override-policy';
import {processWithOpenAi,type AiOutput} from './collection/openai';
import {editorialReason,hostAllowed,isRelevant,knownUrlSet,normalizeArticleUrl,publicationDate,runIsolated} from './collection/policy';
import {discoverCandidates,enrichFromHtml,sourceAdapters,type Candidate,type SourceAdapter} from './collection/sources';
import {insertCollectedArticle,runEditorialMaintenanceOnce} from './collection/repository';
import {backfillPublishedLocalization} from './collection/localization';
import {enabledSourceAdapters} from './collection/source-settings';
import {loadSourceEnabledState} from './collection/source-settings-repository';

const MAX_NEW_PER_SOURCE=12;

type SourceStats={
  sourceId:string;source:string;disabled:boolean;discovered:number;inserted:number;published:number;review:number;duplicate:number;
  editorial:number;irrelevant:number;expired:number;invalidUrl:number;metadataFailure:number;
  dateReview:number;aiFailure:number;processingFailure:number;persistenceFailure:number;deferred:number;sourceFailure:string;
};

function stats(adapter:SourceAdapter,disabled=false):SourceStats{return {sourceId:adapter.id,source:adapter.name,disabled,discovered:0,inserted:0,published:0,review:0,duplicate:0,editorial:0,irrelevant:0,expired:0,invalidUrl:0,metadataFailure:0,dateReview:0,aiFailure:0,processingFailure:0,persistenceFailure:0,deferred:0,sourceFailure:''};}

async function get(url:string){
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'HolocronNews/2.0 (news metadata reader)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return (await response.text()).slice(0,4_000_000);
}

function reportLine(result:SourceStats){
  if(result.disabled)return `${result.source}: 수집 비활성화`;
  if(result.sourceFailure)return `${result.source}: 수집원 실패 — ${result.sourceFailure}`;
  const details=[
    `${result.discovered}건 발견`,`${result.published}건 공개`,`${result.review}건 검토`,`${result.duplicate}건 중복`,
    `${result.editorial}건 편집 필터`,`${result.irrelevant}건 관련성 제외`,`${result.expired}건 기간 제외`,
  ];
  if(result.invalidUrl)details.push(`${result.invalidUrl}건 URL 오류`);
  if(result.metadataFailure)details.push(`${result.metadataFailure}건 메타데이터 검토`);
  if(result.dateReview)details.push(`${result.dateReview}건 게시일 검토`);
  if(result.aiFailure)details.push(`${result.aiFailure}건 AI 실패`);
  if(result.processingFailure)details.push(`${result.processingFailure}건 처리 실패`);
  if(result.persistenceFailure)details.push(`${result.persistenceFailure}건 저장 실패`);
  if(result.deferred)details.push(`${result.deferred}건 다음 실행으로 이월`);
  return `${result.source}: ${details.join(' · ')}`;
}

function fallbackOutput(candidate:Candidate):AiOutput{
  return {title:candidate.title||'제목 확인 필요',summary:candidate.description||'원문 메타데이터를 확인해 주세요.',category:'기타',topic:crypto.randomUUID()};
}

async function collectSource(adapter:SourceAdapter,articles:Article[],known:Set<string>){
  const result=stats(adapter);
  let body:string;
  try{body=await get(adapter.endpoint);}
  catch(error){throw new Error(`discovery fetch 실패: ${error instanceof Error?error.message:'알 수 없는 오류'}`);}
  const candidates=discoverCandidates(adapter,body);
  result.discovered=candidates.length;
  if(!candidates.length)throw new Error('지원하는 기사 목록 형식을 찾지 못했습니다.');
  let attempted=0;

  await runIsolated(candidates,async initial=>{
    const url=normalizeArticleUrl(initial.url);
    if(!url||!hostAllowed(url,adapter.hosts)){result.invalidUrl++;return;}
    if(known.has(url)){result.duplicate++;return;}
    if(!isRelevant(adapter.trusted,initial.title,initial.description,url)){result.irrelevant++;return;}
    if(attempted>=MAX_NEW_PER_SOURCE){result.deferred++;return;}
    attempted++;

    let candidate={...initial,url};
    let metadataProblem='';
    if(!candidate.title||!candidate.description||!candidate.published||!candidate.image){
      try{candidate=enrichFromHtml(candidate,await get(url));}
      catch(error){metadataProblem=`metadata 문제: 원문 응답 실패 (${error instanceof Error?error.message:'알 수 없는 오류'})`;}
    }
    if(!candidate.title)metadataProblem='metadata 문제: 제목 누락';
    else if(!candidate.description)metadataProblem=metadataProblem||'metadata 문제: 설명 누락';
    else if(!candidate.image)metadataProblem=metadataProblem||'metadata 문제: 대표 이미지 누락';
    if(metadataProblem)result.metadataFailure++;

    if(!isRelevant(adapter.trusted,candidate.title,candidate.description,url)){result.irrelevant++;return;}
    const date=publicationDate(candidate.published);
    if(date.kind==='expired'){result.expired++;return;}
    if(date.kind==='review'){result.dateReview++;metadataProblem=metadataProblem||date.reason;}

    const editorial=editorialReason(candidate.title,candidate.description,url);
    if(editorial)result.editorial++;
    let output=fallbackOutput(candidate);
    let aiProblem='';
    if(!editorial&&!metadataProblem){
      try{
        const {key,model}=config();
        output=await processWithOpenAi(candidate.title,candidate.description,articles,key,model,{source:adapter.name,url,published:date.value});
      }catch(error){
        aiProblem=`AI 처리 실패: ${error instanceof Error?error.message:'알 수 없는 오류'}`;
        result.aiFailure++;
      }
    }

    const automaticReason=editorial||metadataProblem||aiProblem;
    const decision=applyAutomaticDecision(
      {topic:output.topic,topicOverride:null,status:'published',statusOverride:null,reason:''},
      automaticReason?{status:'review',reason:automaticReason}:{status:'published',reason:''},
    );
    const article:Article={
      id:crypto.randomUUID(),topic:decision.topic,topicOverride:null,title:output.title,summary:output.summary,
      image:candidate.image,url,source:adapter.name,published:date.value,category:output.category,
      status:decision.status,statusOverride:null,reason:decision.reason,franchise:'star-wars',
    };
    try{
      if(!await insertCollectedArticle(article)){result.duplicate++;known.add(url);return;}
    }catch{result.persistenceFailure++;return;}
    known.add(url);articles.push(article);result.inserted++;
    if(article.status==='review')result.review++;else result.published++;
  },async()=>{result.processingFailure++;});
  return result;
}

export async function collect(){
  const repaired=await runEditorialMaintenanceOnce();
  const articles=await list();
  const known=knownUrlSet(articles.map(article=>article.url));
  const sourceState=await loadSourceEnabledState();
  const enabled=enabledSourceAdapters(sourceState);
  const collected=await runIsolated(enabled,adapter=>collectSource(adapter,articles,known),async(adapter,error)=>({
    ...stats(adapter),sourceFailure:error instanceof Error?error.message:'알 수 없는 오류',
  }));
  const collectedById=new Map(collected.map(result=>[result.sourceId,result]));
  const results=sourceAdapters.map(adapter=>collectedById.get(adapter.id)??stats(adapter,true));
  const report=results.map(reportLine);
  if(repaired)report.unshift(`기존 공개 기사: 편집성 콘텐츠 ${repaired}건을 검토 대기로 이동`);
  if(!enabled.length){
    report.push('활성화된 뉴스 소스가 없습니다.');
    const localization={candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:[] as string[]};
    await setting('last_collection',JSON.stringify({at:new Date().toISOString(),count:0,repaired,activeSources:0,sources:results,localization,report}));
    return {ok:true,count:0,repaired,activeSources:0,sources:results,localization,report};
  }
  let localization;
  try{localization=await backfillPublishedLocalization();}
  catch{localization={candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:['기존 영문 기사 한글화: 조회 실패']};}
  report.push(...localization.report);
  const count=results.reduce((sum,result)=>sum+result.inserted,0);
  await setting('last_collection',JSON.stringify({at:new Date().toISOString(),count,repaired,activeSources:enabled.length,sources:results,localization,report}));
  return {ok:true,count,repaired,activeSources:enabled.length,sources:results,localization,report};
}
