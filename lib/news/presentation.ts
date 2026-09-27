import type {Article} from '../news';

export const ARTICLE_TITLE_OVERRIDE_MAX_LENGTH=160;

export function displayArticleTitle(article:Pick<Article,'title'|'titleOverride'>){
  return article.titleOverride?.trim()||article.title;
}

export function normalizeArticleTitleOverride(value:unknown){
  if(typeof value!=='string')throw new Error('수정할 제목을 확인해 주세요.');
  const normalized=value.trim();
  if(!normalized)throw new Error('제목을 입력해 주세요.');
  if(normalized.length>ARTICLE_TITLE_OVERRIDE_MAX_LENGTH)throw new Error(`제목은 ${ARTICLE_TITLE_OVERRIDE_MAX_LENGTH}자 이하로 입력해 주세요.`);
  return normalized;
}
