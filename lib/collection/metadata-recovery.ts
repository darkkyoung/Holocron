import {config,list} from '../news';
import {processWithOpenAi} from './openai';
import {COLLECTION_WINDOW_MS,editorialReason,hostAllowed,isRelevant,publicationDate} from './policy';
import {sourceAdapters,type Candidate} from './sources';
import {createCandidateEnricher,fetchSourceText} from './metadata';
import {isRetryableMetadataArticle,matchFeedCandidate,metadataRecoveryKind,recoveryCandidate} from './metadata-policy';
import {failedRecoveryPatch,successfulRecoveryPatch,type RecoveryArticlePatch} from './recovery-policy';
import {listMetadataFailedReviewArticleIds,updatePublishedMetadataRecovery,updateReviewMetadataRecovery} from './repository';
import {enabledSourceAdapters} from './source-settings';
import {loadSourceEnabledState} from './source-settings-repository';
import {discoverSourceCandidates} from './discovery';

export const MAX_METADATA_RECOVERY_ARTICLES=20;

export async function retryFailedMetadataArticles(limit=MAX_METADATA_RECOVERY_ARTICLES){
  const boundedLimit=Number.isFinite(limit)?Math.max(1,Math.min(MAX_METADATA_RECOVERY_ARTICLES,Math.floor(limit))):MAX_METADATA_RECOVERY_ARTICLES;
  const now=Date.now();
  const cutoff=new Date(now-COLLECTION_WINDOW_MS).toISOString().slice(0,10);
  const articles=await list();
  const selection=await listMetadataFailedReviewArticleIds(boundedLimit,cutoff);
  const candidates=selection.rows;
  const enabled=enabledSourceAdapters(await loadSourceEnabledState());
  const feeds=new Map<string,Candidate[]>();
  const enrichers=new Map<string,ReturnType<typeof createCandidateEnricher>>();
  const {key,model}=config();
  let succeeded=0,metadataFailed=0,aiFailed=0,skipped=0,imageRecovered=0,headlineOnlyFallback=0,publishedRecovered=0,reviewRecovered=0;
  const failures:string[]=[];

  for(const stored of candidates){
    const article=articles.find(item=>item.id===stored.id);
    const adapter=sourceAdapters.find(source=>source.name===article?.source);
    const kind=article?metadataRecoveryKind(article,now):null;
    if(!article||!adapter||!kind||!enabled.includes(adapter)||!isRetryableMetadataArticle(article,now)||!hostAllowed(article.url,adapter.hosts)){
      skipped++;continue;
    }
    try{
      if(!feeds.has(adapter.id)){
        try{
          const discovery=await discoverSourceCandidates(adapter,fetchSourceText,now);
          feeds.set(adapter.id,discovery.candidates);
          if(discovery.backfillFailures.length)failures.push(`${adapter.name}: ${discovery.backfillFailures.length}/${discovery.backfillRequests} backfill 조회 실패 · 가능한 후보로 계속합니다.`);
        }
        catch(error){feeds.set(adapter.id,[]);failures.push(`${adapter.name}: 피드 조회 실패 (${error instanceof Error?error.message:'알 수 없는 오류'}) · 저장된 메타데이터로 재처리합니다.`);}
      }
      const fresh=matchFeedCandidate(article.url,feeds.get(adapter.id)??[]);
      if(!enrichers.has(adapter.id))enrichers.set(adapter.id,createCandidateEnricher(adapter));
      const enriched=await enrichers.get(adapter.id)!(recoveryCandidate(article,fresh,now));
      const candidate=enriched.candidate;
      if(candidate.headlineOnly)headlineOnlyFallback++;
      const date=publicationDate(candidate.published,now);
      if(date.kind==='expired'){skipped++;continue;}
      const reason=editorialReason(candidate.title,candidate.description,candidate.url)
        ||(!isRelevant(adapter.trusted,candidate.title,candidate.description,candidate.url)?'Star Wars 관련성 부족':'')
        ||enriched.problem;
      const base={title:candidate.title,summary:candidate.description,image:candidate.image,published:kind==='published'?article.published:date.value,category:article.category,topic:article.topicOverride?article.topic:article.topic};
      let patch:RecoveryArticlePatch&{image:string;published:string}={...base,status:'review',reason};
      let outcome:'metadata'|'ai'|'success'='metadata';
      if(!reason){
        try{
          const output=await processWithOpenAi(candidate.title,candidate.description,articles,key,model,{source:article.source,url:candidate.url,published:date.value,headlineOnly:candidate.headlineOnly});
          patch={...base,...successfulRecoveryPatch(output)};
          outcome='success';
        }catch(error){patch={...base,...failedRecoveryPatch(error)};outcome='ai';}
      }
      if(kind==='published'&&outcome!=='success'){
        if(outcome==='ai')aiFailed++;else metadataFailed++;
        failures.push(`${article.title}: ${patch.reason}`);continue;
      }
      const updated=kind==='published'?await updatePublishedMetadataRecovery(article.id,patch,cutoff):await updateReviewMetadataRecovery(article.id,patch,cutoff);
      if(!updated){skipped++;continue;}
      if(!article.image&&patch.image)imageRecovered++;
      if(kind==='published')Object.assign(article,{title:patch.title,summary:patch.summary,category:patch.category,topic:article.topicOverride?article.topic:patch.topic,image:patch.image||article.image});
      else Object.assign(article,patch);
      if(outcome==='success'){succeeded++;if(kind==='published')publishedRecovered++;else reviewRecovered++;}
      else{
        if(outcome==='ai')aiFailed++;else metadataFailed++;
        failures.push(`${article.title}: ${patch.reason}`);
      }
    }catch(error){skipped++;failures.push(`${article.title}: 재처리/저장 실패 (${error instanceof Error?error.message:'알 수 없는 오류'}) · 상태 변경 없음`);}
  }
  const report=[`메타데이터 재처리: ${candidates.length}건 대상 · review 복구 ${reviewRecovered}건 · published placeholder 복구 ${publishedRecovered}건 · ${metadataFailed}건 메타데이터/편집 실패 · ${aiFailed}건 AI 실패 · ${skipped}건 상태 변경 없음 · ${imageRecovered}건 이미지 복구`,
    `최근 90일의 review metadata failure와 published placeholder ${selection.total}건을 stable key cursor로 최대 ${MAX_METADATA_RECOVERY_ARTICLES}건씩 순환 처리합니다.`,
    ...(headlineOnlyFallback?[`Forbes 제목 한정 fallback ${headlineOnlyFallback}건`]:[]),...failures];
  return {limit:boundedLimit,candidates:candidates.length,eligible:selection.total,cursor:selection.cursor,nextCursor:selection.nextCursor,succeeded,reviewRecovered,publishedRecovered,failed:metadataFailed+aiFailed,metadataFailed,aiFailed,skipped,imageRecovered,headlineOnlyFallback,report};
}
