import {list,type Article} from '../news';
import {createCandidateEnricher,fetchSourceText} from './metadata';
import {matchFeedCandidate} from './metadata-policy';
import {COLLECTION_WINDOW_MS,hostAllowed,normalizeArticleUrl} from './policy';
import {listAutomaticSwnnImageCandidates,saveAutomaticSwnnImageCursor,listMissingImageArticleIds,updateArticleImage,updateMissingArticleImage,updateAutomaticSwnnImage} from './repository';
import {sourceAdapters,type Candidate,type SourceAdapter} from './sources';

export const MAX_IMAGE_RECOVERY_ARTICLES=20;

function adapterFor(article:Article){
  return sourceAdapters.find(source=>source.name===article.source&&hostAllowed(article.url,source.hosts));
}

async function feedCandidates(adapter:SourceAdapter){
  return adapter.parsePrimary(await fetchSourceText(adapter.endpoint)).candidates;
}

async function findArticleImage(article:Article,adapter:SourceAdapter,candidates?:readonly Candidate[],enrich=createCandidateEnricher(adapter)){
  let feed=candidates;
  if(!feed){
    try{feed=await feedCandidates(adapter);}
    catch{feed=[];}
  }
  const fresh=matchFeedCandidate(article.url,feed);
  const candidate={
    url:normalizeArticleUrl(article.url),title:article.title,description:article.summary,published:article.published,image:fresh?.image||'',
  };
  const {candidate:enriched}=await enrich(candidate);
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
  const enrichers=new Map<string,ReturnType<typeof createCandidateEnricher>>();
  let recovered=0,missing=0,failed=0;

  for(const candidate of candidates){
    const article=articles.find(item=>item.id===candidate.id);
    const adapter=article?adapterFor(article):undefined;
    if(!article||!adapter){failed++;continue;}
    if(!feeds.has(adapter.id)){
      try{feeds.set(adapter.id,await feedCandidates(adapter));}
      catch{feeds.set(adapter.id,[]);}
    }
    if(!enrichers.has(adapter.id))enrichers.set(adapter.id,createCandidateEnricher(adapter));
    try{
      const image=await findArticleImage(article,adapter,feeds.get(adapter.id),enrichers.get(adapter.id));
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

// Automatic collection only. Manual recovery retains its existing scope and limit.
export const AUTO_SWNN_IMAGE_LIMIT=3;
export const AUTO_SWNN_IMAGE_REQUEST_LIMIT=10; // One feed + at most three lookups per article.
export const AUTO_SWNN_IMAGE_BUDGET_MS=30_000;

export async function recoverAutomaticSwnnImages(deadline:number,now=Date.now){
  const end=Math.min(deadline,now()+AUTO_SWNN_IMAGE_BUDGET_MS);
  const cutoff=new Date(now()-COLLECTION_WINDOW_MS).toISOString().slice(0,10);
  const diagnostics=new Set<string>();
  let requests=0,attempted=0,recovered=0,missing=0,failed=0,deferred=0,unchanged=0;
  const available=()=>now()<end&&requests<AUTO_SWNN_IMAGE_REQUEST_LIMIT;
  const fetchText=async(url:string)=>{
    if(!available())throw new DOMException('Recovery budget exhausted','AbortError');
    // Count redirects as requests too; at most two same-source redirects per lookup.
    const boundedFetch:typeof fetch=async(input,init)=>{
      let target=String(input);
      for(let hop=0;hop<=2;hop++){
        if(!available())throw new DOMException('Recovery budget exhausted','AbortError');
        requests++;
        const response=await fetch(target,{...init,redirect:'manual'});
        if(![301,302,303,307,308].includes(response.status))return response;
        const location=response.headers.get('location');
        await response.body?.cancel();
        if(!location||hop===2)throw new Error('Redirect limit');
        target=new URL(location,target).href;
        if(!hostAllowed(target,['starwarsnewsnet.com']))throw new Error('Redirect source mismatch');
      }
      throw new Error('Redirect limit');
    };
    return fetchSourceText(url,end-now(),boundedFetch);
  };
  const candidates=available()?await listAutomaticSwnnImageCandidates(AUTO_SWNN_IMAGE_LIMIT,cutoff):[];
  const adapter=sourceAdapters.find(source=>source.id==='swnn')!;
  let feed:Candidate[]=[];
  if(candidates.length&&available()){
    try{feed=adapter.parsePrimary(await fetchText(adapter.endpoint)).candidates;}
    catch(error){diagnostics.add(error instanceof Error&&/^HTTP \d{3}$/.test(error.message)?`RSS ${error.message}`:error instanceof Error&&['AbortError','TimeoutError'].includes(error.name)?'RSS 요청 시간 초과':'RSS 요청 또는 파싱 실패');}
  }
  const enrich=createCandidateEnricher(adapter,diagnostic=>diagnostics.add(diagnostic.message),fetchText);
  for(const article of candidates){
    if(!available()){deferred++;continue;}
    attempted++;
    try{
      if(!hostAllowed(article.url,adapter.hosts)){failed++;diagnostics.add('SWNN URL 불일치');continue;}
      const image=await findArticleImage(article,adapter,feed,enrich);
      if(now()>=end){deferred++;continue;}
      if(!image){if(available())missing++;else deferred++;continue;}
      if(await updateAutomaticSwnnImage(article.id,image,cutoff))recovered++;else unchanged++;
    }catch{failed++;diagnostics.add('이미지 복구 처리 또는 저장 실패');}
    finally{await saveAutomaticSwnnImageCursor(article.id);}
  }
  return {candidates:candidates.length,attempted,recovered,missing,failed,deferred,unchanged,requests,report:[
    `SWNN 누락 이미지 자동 복구: ${candidates.length}건 대상 / ${recovered}건 성공 / ${missing}건 미발견 / ${failed}건 실패 / ${deferred}건 이월 / ${unchanged}건 변경 없음`,
    ...[...diagnostics].slice(0,6).map(message=>`SWNN 이미지 진단: ${message}`),
  ]};
}
