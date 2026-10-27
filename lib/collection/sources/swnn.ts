import {MAX_HISTORICAL_REQUESTS_PER_SOURCE,monthKeys,rollingMonthKeys} from './archive';
import {parseRssOrAtom,validImageUrl} from './common';
import {imageRequestFailure,type ImageLookupReason} from './image-diagnostic';
import type {Candidate,CandidateEnricherContext,FetchText,SourceAdapter,SourceDiscoveryContext} from './types';

export function swnnBackfillEndpoints(now=Date.now()){
  return rollingMonthKeys(now).reverse().flatMap(key=>[1,2].map(page=>`https://www.starwarsnewsnet.com/${key.replace('-','/')}/feed/${page===1?'':`?paged=${page}`}`));
}

/** New discovery only; never reclassifies already stored articles. */
export function isSwnnWeeklyRoundup(candidate:Pick<Candidate,'title'|'url'>){
  if(/^this\s+week(?=$|[\s\p{P}])/iu.test(candidate.title.trim()))return true;
  try{
    const slug=new URL(candidate.url).pathname.split('/').filter(Boolean).at(-1)??'';
    return /^this-week-/i.test(decodeURIComponent(slug));
  }catch{return false;}
}

/** Exact SWNN source taxonomy only; never infer it from prose or internal category. */
export function isSwnnExcludedCandidate(candidate:Candidate){
  return isSwnnWeeklyRoundup(candidate)||candidate.sourceCategories?.some(category=>category.trim().toLowerCase()==='other')===true;
}

function archivePlan(context:SourceDiscoveryContext){
  if(context.mode==='historical'&&context.range){
    const endpoints=[];
    for(const month of monthKeys(context.range.start,context.range.end))for(let page=1;page<=MAX_HISTORICAL_REQUESTS_PER_SOURCE;page++)endpoints.push({url:`https://www.starwarsnewsnet.com/${month.replace('-','/')}/feed/${page===1?'':`?paged=${page}`}`,parse:parseRssOrAtom,path:'rss'});
    return {endpoints:endpoints.slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE)};
  }
  return {endpoints:swnnBackfillEndpoints(context.now).map(url=>({url,parse:parseRssOrAtom,path:'rss'})).slice(0,4)};
}

export function swnnWordPressPostUrl(articleUrl:string){
  try{
    const article=new URL(articleUrl);
    if(article.hostname.toLowerCase().replace(/^www\./,'')!=='starwarsnewsnet.com')return '';
    const slug=article.pathname.split('/').filter(Boolean).at(-1)?.replace(/\.html$/i,'')??'';
    if(!/^[a-z0-9][a-z0-9-]*$/i.test(slug))return '';
    const endpoint=new URL('https://www.starwarsnewsnet.com/wp-json/wp/v2/posts');
    endpoint.searchParams.set('slug',slug);
    endpoint.searchParams.set('_fields','id,link,featured_media,yoast_head_json,jetpack_featured_media_url,_embedded,_links');
    endpoint.searchParams.set('_embed','wp:featuredmedia');
    return endpoint.href;
  }catch{return '';}
}

function positiveInteger(value:unknown){return typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value:0;}

export function swnnWordPressMediaUrl(post:unknown){
  if(!post||typeof post!=='object')return '';
  const item=post as Record<string,unknown>;
  const mediaId=positiveInteger(item.featured_media),postId=positiveInteger(item.id);
  if(mediaId){
    const endpoint=new URL(`https://www.starwarsnewsnet.com/wp-json/wp/v2/media/${mediaId}`);
    endpoint.searchParams.set('_fields','source_url');
    return endpoint.href;
  }
  if(postId){
    const endpoint=new URL('https://www.starwarsnewsnet.com/wp-json/wp/v2/media');
    endpoint.searchParams.set('parent',String(postId));
    endpoint.searchParams.set('per_page','1');
    endpoint.searchParams.set('order','desc');
    endpoint.searchParams.set('orderby','date');
    endpoint.searchParams.set('_fields','post,source_url');
    return endpoint.href;
  }
  return '';
}

function wordPressImage(value:unknown){
  if(!value||typeof value!=='object')return '';
  const post=value as Record<string,unknown>;
  const yoast=post.yoast_head_json&&typeof post.yoast_head_json==='object'?post.yoast_head_json as Record<string,unknown>:{};
  const ogImages=Array.isArray(yoast.og_image)?yoast.og_image:[];
  for(const item of ogImages){
    const image=item&&typeof item==='object'?validImageUrl(String((item as Record<string,unknown>).url??'')):'';
    if(image)return image;
  }
  const jetpack=validImageUrl(typeof post.jetpack_featured_media_url==='string'?post.jetpack_featured_media_url:'');
  if(jetpack)return jetpack;
  const embedded=post._embedded&&typeof post._embedded==='object'?post._embedded as Record<string,unknown>:{};
  const featured=Array.isArray(embedded['wp:featuredmedia'])?embedded['wp:featuredmedia']:[];
  for(const item of featured){
    const image=item&&typeof item==='object'?validImageUrl(String((item as Record<string,unknown>).source_url??'')):'';
    if(image)return image;
  }
  return '';
}

function wordPressPosts(json:string){
  const value=JSON.parse(json) as unknown;
  if(!Array.isArray(value)||value.some(item=>!item||typeof item!=='object'||Array.isArray(item)))throw new SyntaxError('Invalid WordPress post response');
  return value;
}

function wordPressMediaImage(json:string){
  const value=JSON.parse(json) as unknown,items=Array.isArray(value)?value:[value];
  if(items.some(item=>!item||typeof item!=='object'||Array.isArray(item)))throw new SyntaxError('Invalid WordPress media response');
  for(const item of items){
    const image=item&&typeof item==='object'?validImageUrl(String((item as Record<string,unknown>).source_url??'')):'';
    if(image)return image;
  }
  return '';
}

export function enrichSwnnFromWordPress(candidate:Candidate,json:string):Candidate{
  if(candidate.image)return candidate;
  try{
    const posts=wordPressPosts(json);
    for(const post of posts){const image=wordPressImage(post);if(image)return {...candidate,image};}
  }catch{/* The optional article HTML fallback remains available. */}
  return candidate;
}

function createSwnnEnricher(fetchText:FetchText,context?:CandidateEnricherContext){
  const failure=(reason:ImageLookupReason,message:string)=>context?.reportDiagnostic?.({kind:'image-lookup-failure',reason,message});
  return async(candidate:Candidate)=>{
    if(candidate.image)return candidate;
    const endpoint=swnnWordPressPostUrl(candidate.url);
    if(!endpoint){failure('INVALID_URL','WordPress REST URL 생성 실패');return candidate;}
    try{
      const json=await fetchText(endpoint);
      let posts:unknown[];
      try{posts=wordPressPosts(json);}
      catch{failure('PARSE_ERROR','WordPress REST JSON 파싱 실패');return candidate;}
      if(!posts.length){failure('NO_IMAGE','WordPress REST post 0건');return candidate;}
      for(const post of posts){const image=wordPressImage(post);if(image)return {...candidate,image};}
      const mediaEndpoint=posts.map(swnnWordPressMediaUrl).find(Boolean);
      if(mediaEndpoint){
        try{
          const image=wordPressMediaImage(await fetchText(mediaEndpoint));
          if(image)return {...candidate,image};
          failure('NO_IMAGE','WordPress media 이미지 URL 누락');
        }catch(error){
          const malformed=error instanceof SyntaxError;
          const issue=imageRequestFailure(error);
          failure(malformed?'PARSE_ERROR':issue.reason,malformed?'WordPress media JSON 파싱 실패':`WordPress media 요청 실패 (${issue.detail})`);
        }
        return candidate;
      }
      failure('NO_IMAGE','WordPress REST 이미지 메타데이터 누락');
      return candidate;
    }catch(error){const issue=imageRequestFailure(error);failure(issue.reason,`WordPress REST 요청 실패 (${issue.detail})`);return candidate;}
  };
}

export const swnnAdapter:SourceAdapter={
  id:'swnn',name:'Star Wars News Net',description:'팬의 시선으로 보는 은하계',category:'FAN MEDIA',url:'https://www.starwarsnewsnet.com',endpoint:'https://www.starwarsnewsnet.com/feed',trusted:true,hosts:['starwarsnewsnet.com'],
  excludeCandidate:isSwnnExcludedCandidate,
  normalArchiveRequestLimit:4,
  parsePrimary:body=>({candidates:parseRssOrAtom(body),paths:['rss']}),archivePlan,createCandidateEnricher:createSwnnEnricher,
  coverage:mode=>({coverage:'limited',coverageNote:`SWNN 월별 RSS를 최대 ${mode==='normal'?4:MAX_HISTORICAL_REQUESTS_PER_SOURCE}회 조회합니다.`}),
};
