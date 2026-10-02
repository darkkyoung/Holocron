import {list,type Article} from '../news';
import {enrichCandidate,fetchSourceText} from './metadata';
import {matchFeedCandidate} from './metadata-policy';
import {COLLECTION_WINDOW_MS,hostAllowed,normalizeArticleUrl} from './policy';
import {listMissingImageArticleIds,updateArticleImage,updateMissingArticleImage} from './repository';
import {discoverCandidates,sourceAdapters,type Candidate,type SourceAdapter} from './sources';

export const MAX_IMAGE_RECOVERY_ARTICLES=20;

function adapterFor(article:Article){
  return sourceAdapters.find(source=>source.name===article.source&&hostAllowed(article.url,source.hosts));
}

async function feedCandidates(adapter:SourceAdapter){
  return discoverCandidates(adapter,await fetchSourceText(adapter.endpoint));
}

async function findArticleImage(article:Article,adapter:SourceAdapter,candidates?:readonly Candidate[]){
  let feed=candidates;
  if(!feed){
    try{feed=await feedCandidates(adapter);}
    catch{feed=[];}
  }
  const fresh=matchFeedCandidate(article.url,feed);
  const candidate={
    url:normalizeArticleUrl(article.url),title:article.title,description:article.summary,published:article.published,image:fresh?.image||'',
  };
  const {candidate:enriched}=await enrichCandidate(candidate);
  return enriched.image;
}

export async function retryArticleImage(id:string){
  const article=(await list()).find(item=>item.id===id);
  if(!article)throw new Error('기사를 찾을 수 없습니다.');
  const adapter=adapterFor(article);
  if(!adapter)throw new Error('지원하는 뉴스 소스를 찾을 수 없습니다.');
  const image=await findArticleImage(article,adapter);
  if(!image)throw new Error('이미지를 찾지 못했습니다.');
  if(!await updateArticleImage(article.id,image))throw new Error('기사를 찾을 수 없습니다.');
  return {ok:true,report:[`${article.title}: 이미지를 복구했습니다.`]};
}

export async function retryMissingArticleImages(limit=MAX_IMAGE_RECOVERY_ARTICLES){
  const boundedLimit=Number.isFinite(limit)?Math.max(1,Math.min(MAX_IMAGE_RECOVERY_ARTICLES,Math.floor(limit))):MAX_IMAGE_RECOVERY_ARTICLES;
  const cutoff=new Date(Date.now()-COLLECTION_WINDOW_MS).toISOString().slice(0,10);
  const articles=await list();
  const candidates=await listMissingImageArticleIds(boundedLimit,cutoff);
  const feeds=new Map<string,Candidate[]>();
  let recovered=0,missing=0,failed=0;

  for(const candidate of candidates){
    const article=articles.find(item=>item.id===candidate.id);
    const adapter=article?adapterFor(article):undefined;
    if(!article||!adapter){failed++;continue;}
    if(!feeds.has(adapter.id)){
      try{feeds.set(adapter.id,await feedCandidates(adapter));}
      catch{feeds.set(adapter.id,[]);}
    }
    try{
      const image=await findArticleImage(article,adapter,feeds.get(adapter.id));
      if(!image){missing++;continue;}
      if(await updateMissingArticleImage(article.id,image,cutoff))recovered++;
      else failed++;
    }catch{failed++;}
  }

  return {ok:true,limit:boundedLimit,candidates:candidates.length,recovered,missing,failed,report:[
    `누락 이미지 재조회: ${candidates.length}건 대상 · ${recovered}건 복구 · ${missing}건 이미지 없음 · ${failed}건 저장 실패`,
    `최근 90일의 이미지가 없는 기사를 한 번에 최대 ${MAX_IMAGE_RECOVERY_ARTICLES}건 처리합니다.`,
  ]};
}
