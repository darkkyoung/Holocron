import {config,list} from '../news';
import {processWithOpenAi} from './openai';
import {COLLECTION_WINDOW_MS,editorialReason,hostAllowed,isRelevant,publicationDate} from './policy';
import {discoverCandidates,sourceAdapters,type Candidate} from './sources';
import {enrichCandidate,fetchSourceText} from './metadata';
import {isRetryableMetadataArticle,matchFeedCandidate,recoveryCandidate} from './metadata-policy';
import {failedRecoveryPatch,successfulRecoveryPatch,type RecoveryArticlePatch} from './recovery-policy';
import {listMetadataFailedReviewArticleIds,updateMetadataRecovery} from './repository';
import {enabledSourceAdapters} from './source-settings';
import {loadSourceEnabledState} from './source-settings-repository';

export const MAX_METADATA_RECOVERY_ARTICLES=20;

export async function retryFailedMetadataArticles(limit=MAX_METADATA_RECOVERY_ARTICLES){
  const boundedLimit=Number.isFinite(limit)?Math.max(1,Math.min(MAX_METADATA_RECOVERY_ARTICLES,Math.floor(limit))):MAX_METADATA_RECOVERY_ARTICLES;
  const now=Date.now();
  const cutoff=new Date(now-COLLECTION_WINDOW_MS).toISOString().slice(0,10);
  const articles=await list();
  const candidates=await listMetadataFailedReviewArticleIds(boundedLimit,cutoff);
  const enabled=enabledSourceAdapters(await loadSourceEnabledState());
  const feeds=new Map<string,Candidate[]>();
  const {key,model}=config();
  let succeeded=0,metadataFailed=0,aiFailed=0,skipped=0,imageRecovered=0;
  const failures:string[]=[];

  for(const stored of candidates){
    const article=articles.find(item=>item.id===stored.id);
    const adapter=sourceAdapters.find(source=>source.name===article?.source);
    if(!article||!adapter||!enabled.includes(adapter)||!isRetryableMetadataArticle(article,now)||!hostAllowed(article.url,adapter.hosts)){
      skipped++;continue;
    }
    try{
      if(!feeds.has(adapter.id)){
        try{feeds.set(adapter.id,discoverCandidates(adapter,await fetchSourceText(adapter.endpoint)));}
        catch(error){feeds.set(adapter.id,[]);failures.push(`${adapter.name}: 피드 조회 실패 (${error instanceof Error?error.message:'알 수 없는 오류'}) · 저장된 메타데이터로 재처리합니다.`);}
      }
      const fresh=matchFeedCandidate(article.url,feeds.get(adapter.id)??[]);
      const enriched=await enrichCandidate(recoveryCandidate(article,fresh,now));
      const candidate=enriched.candidate;
      const date=publicationDate(candidate.published,now);
      if(date.kind==='expired'){skipped++;continue;}
      const reason=editorialReason(candidate.title,candidate.description,candidate.url)
        ||(!isRelevant(adapter.trusted,candidate.title,candidate.description,candidate.url)?'Star Wars 관련성 부족':'')
        ||enriched.problem;
      const base={title:candidate.title,summary:candidate.description,image:candidate.image,published:date.value,category:article.category,topic:article.topic};
      let patch:RecoveryArticlePatch&{image:string;published:string}={...base,status:'review',reason};
      let outcome:'metadata'|'ai'|'success'='metadata';
      if(!reason){
        try{
          const output=await processWithOpenAi(candidate.title,candidate.description,articles,key,model,{source:article.source,url:candidate.url,published:date.value});
          patch={...base,...successfulRecoveryPatch(output)};
          outcome='success';
        }catch(error){patch={...base,...failedRecoveryPatch(error)};outcome='ai';}
      }
      if(!await updateMetadataRecovery(article.id,patch,cutoff)){skipped++;continue;}
      if(!article.image&&patch.image)imageRecovered++;
      Object.assign(article,patch);
      if(outcome==='success')succeeded++;
      else{
        if(outcome==='ai')aiFailed++;else metadataFailed++;
        failures.push(`${article.title}: ${patch.reason}`);
      }
    }catch(error){skipped++;failures.push(`${article.title}: 재처리/저장 실패 (${error instanceof Error?error.message:'알 수 없는 오류'}) · 상태 변경 없음`);}
  }
  const report=[`메타데이터 실패 재처리: ${candidates.length}건 대상 · ${succeeded}건 공개 · ${metadataFailed}건 메타데이터/편집 검토 유지 · ${aiFailed}건 AI 실패 · ${skipped}건 상태 변경 없음 · ${imageRecovered}건 이미지 복구`,
    `최근 90일의 관리자 상태/주제 override가 없는 기사만 최대 ${MAX_METADATA_RECOVERY_ARTICLES}건 처리합니다.`,...failures];
  return {limit:boundedLimit,candidates:candidates.length,succeeded,failed:metadataFailed+aiFailed,metadataFailed,aiFailed,skipped,imageRecovered,report};
}
