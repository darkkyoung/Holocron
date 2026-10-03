import type {Article} from '../news';
import type {Candidate} from './sources';
import {normalizeArticleUrl,publicationDate} from './policy';

export const METADATA_FAILURE_REASON_PREFIX='metadata 문제:';

export function requiredMetadataProblem(candidate:Candidate,now=Date.now()){
  if(!normalizeArticleUrl(candidate.url))return `${METADATA_FAILURE_REASON_PREFIX} URL 오류`;
  if(!candidate.title.trim()||candidate.title==='제목 확인 필요')return `${METADATA_FAILURE_REASON_PREFIX} 제목 누락`;
  const date=publicationDate(candidate.published,now);
  if(date.kind==='review')return date.reason;
  if((!candidate.description.trim()||candidate.description==='원문 메타데이터를 확인해 주세요.')&&!candidate.headlineOnly)return `${METADATA_FAILURE_REASON_PREFIX} 설명 누락`;
  return '';
}

export function canUseForbesHeadlineOnly(candidate:Candidate,now=Date.now()){
  return !!normalizeArticleUrl(candidate.url)
    &&!!candidate.title.trim()
    &&candidate.title!=='제목 확인 필요'
    &&publicationDate(candidate.published,now).kind==='valid';
}

export function needsHtmlEnrichment(candidate:Candidate,now=Date.now()){
  return !!requiredMetadataProblem(candidate,now)||!candidate.image;
}

export function metadataProblemAfterEnrichment(candidate:Candidate,error?:unknown,now=Date.now()){
  const problem=requiredMetadataProblem(candidate,now);
  if(!problem||!error)return problem;
  return `${problem} · 원문 응답 실패 (${error instanceof Error?error.message:'알 수 없는 오류'})`;
}

export const MISSING_TITLE_PLACEHOLDER='제목 확인 필요';
export const MISSING_SUMMARY_PLACEHOLDER='원문 메타데이터를 확인해 주세요.';
export type MetadataRecoveryKind='review'|'published';

export function metadataRecoveryKind(article:Pick<Article,'status'|'reason'|'statusOverride'|'topicOverride'|'published'|'title'|'summary'>,now=Date.now()):MetadataRecoveryKind|null{
  if(article.status==='review'&&article.reason.startsWith(METADATA_FAILURE_REASON_PREFIX)&&article.statusOverride===null&&article.topicOverride===null&&(article.published===''||publicationDate(article.published,now).kind==='valid'))return 'review';
  if(publicationDate(article.published,now).kind!=='valid')return null;
  if(article.status==='published'&&(article.title===MISSING_TITLE_PLACEHOLDER||article.summary===MISSING_SUMMARY_PLACEHOLDER))return 'published';
  return null;
}

export function isRetryableMetadataArticle(article:Pick<Article,'status'|'reason'|'statusOverride'|'topicOverride'|'published'|'title'|'summary'>,now=Date.now()){return metadataRecoveryKind(article,now)!==null;}

export function matchFeedCandidate(url:string,candidates:readonly Candidate[]){
  const normalized=normalizeArticleUrl(url);
  return normalized?candidates.find(candidate=>normalizeArticleUrl(candidate.url)===normalized):undefined;
}

export function recoveryCandidate(article:Article,fresh?:Candidate,now=Date.now()):Candidate{
  const published=metadataRecoveryKind(article,now)==='published';
  return {
    url:normalizeArticleUrl(article.url),
    title:fresh?.title.trim()||article.title,
    description:fresh?.description.trim()||article.summary,
    published:!published&&fresh&&publicationDate(fresh.published,now).kind==='valid'?fresh.published:article.published,
    image:article.image||fresh?.image||'',
    headlineOnly:false,
  };
}
