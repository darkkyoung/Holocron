import type {Article} from '../news';
import type {Candidate} from './sources';
import {normalizeArticleUrl,publicationDate} from './policy';

export const METADATA_FAILURE_REASON_PREFIX='metadata 문제:';

export function requiredMetadataProblem(candidate:Candidate,now=Date.now()){
  if(!normalizeArticleUrl(candidate.url))return `${METADATA_FAILURE_REASON_PREFIX} URL 오류`;
  if(!candidate.title.trim()||candidate.title==='제목 확인 필요')return `${METADATA_FAILURE_REASON_PREFIX} 제목 누락`;
  if(!candidate.description.trim()||candidate.description==='원문 메타데이터를 확인해 주세요.')return `${METADATA_FAILURE_REASON_PREFIX} 설명 누락`;
  const date=publicationDate(candidate.published,now);
  return date.kind==='review'?date.reason:'';
}

export function needsHtmlEnrichment(candidate:Candidate,now=Date.now()){
  return !!requiredMetadataProblem(candidate,now)||!candidate.image;
}

export function metadataProblemAfterEnrichment(candidate:Candidate,error?:unknown,now=Date.now()){
  const problem=requiredMetadataProblem(candidate,now);
  if(!problem||!error)return problem;
  return `${problem} · 원문 응답 실패 (${error instanceof Error?error.message:'알 수 없는 오류'})`;
}

export function isRetryableMetadataArticle(article:Pick<Article,'status'|'reason'|'statusOverride'|'topicOverride'|'published'>,now=Date.now()){
  return article.status==='review'
    && article.reason.startsWith(METADATA_FAILURE_REASON_PREFIX)
    && article.statusOverride===null
    && article.topicOverride===null
    && publicationDate(article.published,now).kind==='valid';
}

export function matchFeedCandidate(url:string,candidates:readonly Candidate[]){
  const normalized=normalizeArticleUrl(url);
  return normalized?candidates.find(candidate=>normalizeArticleUrl(candidate.url)===normalized):undefined;
}

export function recoveryCandidate(article:Article,fresh?:Candidate,now=Date.now()):Candidate{
  return {
    url:normalizeArticleUrl(article.url),
    title:fresh?.title.trim()||article.title,
    description:fresh?.description.trim()||article.summary,
    published:fresh&&publicationDate(fresh.published,now).kind==='valid'?fresh.published:article.published,
    image:article.image||fresh?.image||'',
  };
}
