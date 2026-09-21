import type {Article} from '../news';
import {COLLECTION_WINDOW_MS,CATEGORIES,editorialReason} from './policy';

export type LocalizationOutput={title:string;summary:string;category:typeof CATEGORIES[number]};
export type LocalizationPatch=LocalizationOutput;

export function hasValidKorean(value:unknown){
  return typeof value==='string'&&/[가-힣]/.test(value);
}

export function needsLocalization(article:Pick<Article,'title'|'summary'>){
  return !hasValidKorean(article.title)||!hasValidKorean(article.summary);
}

export function isLocalizationCandidate(article:Pick<Article,'title'|'summary'|'url'|'published'|'status'>,now=Date.now()){
  if(article.status!=='published'||!needsLocalization(article))return false;
  if(editorialReason(article.title,article.summary,article.url))return false;
  const published=Date.parse(article.published.length===10?`${article.published}T00:00:00Z`:article.published);
  return Number.isFinite(published)&&published>=now-COLLECTION_WINDOW_MS;
}

export function localizationPatch(output:LocalizationOutput):LocalizationPatch{
  return {title:output.title,summary:output.summary,category:output.category};
}
