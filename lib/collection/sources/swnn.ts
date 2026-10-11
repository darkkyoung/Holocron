import {MAX_HISTORICAL_REQUESTS_PER_SOURCE,MAX_ROLLING_REQUESTS_PER_SOURCE,monthKeys,rollingMonthKeys} from './archive';
import {parseRssOrAtom,validImageUrl} from './common';
import type {Candidate,FetchText,SourceAdapter,SourceDiscoveryContext} from './types';

export function swnnBackfillEndpoints(now=Date.now()){
  const month=rollingMonthKeys(now)[0].replace('-','/');
  return [1,2].map(page=>`https://www.starwarsnewsnet.com/${month}/feed/${page===1?'':`?paged=${page}`}`);
}

function archivePlan(context:SourceDiscoveryContext){
  if(context.mode==='historical'&&context.range){
    const endpoints=[];
    for(const month of monthKeys(context.range.start,context.range.end))for(let page=1;page<=MAX_HISTORICAL_REQUESTS_PER_SOURCE;page++)endpoints.push({url:`https://www.starwarsnewsnet.com/${month.replace('-','/')}/feed/${page===1?'':`?paged=${page}`}`,parse:parseRssOrAtom,path:'rss'});
    return {endpoints:endpoints.slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE)};
  }
  return {endpoints:swnnBackfillEndpoints(context.now).map(url=>({url,parse:parseRssOrAtom,path:'rss'})).slice(0,MAX_ROLLING_REQUESTS_PER_SOURCE)};
}

export function swnnWordPressPostUrl(articleUrl:string){
  try{
    const article=new URL(articleUrl);
    if(article.hostname.toLowerCase().replace(/^www\./,'')!=='starwarsnewsnet.com')return '';
    const slug=article.pathname.split('/').filter(Boolean).at(-1)?.replace(/\.html$/i,'')??'';
    if(!/^[a-z0-9][a-z0-9-]*$/i.test(slug))return '';
    const endpoint=new URL('https://www.starwarsnewsnet.com/wp-json/wp/v2/posts');
    endpoint.searchParams.set('slug',slug);
    endpoint.searchParams.set('_fields','link,yoast_head_json,jetpack_featured_media_url,_embedded');
    endpoint.searchParams.set('_embed','wp:featuredmedia');
    return endpoint.href;
  }catch{return '';}
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

export function enrichSwnnFromWordPress(candidate:Candidate,json:string):Candidate{
  if(candidate.image)return candidate;
  try{
    const value=JSON.parse(json) as unknown,posts=Array.isArray(value)?value:[value];
    for(const post of posts){const image=wordPressImage(post);if(image)return {...candidate,image};}
  }catch{/* The optional article HTML fallback remains available. */}
  return candidate;
}

function createSwnnEnricher(fetchText:FetchText){
  return async(candidate:Candidate)=>{
    if(candidate.image)return candidate;
    const endpoint=swnnWordPressPostUrl(candidate.url);
    if(!endpoint)return candidate;
    try{return enrichSwnnFromWordPress(candidate,await fetchText(endpoint));}
    catch{return candidate;}
  };
}

export const swnnAdapter:SourceAdapter={
  id:'swnn',name:'Star Wars News Net',description:'팬의 시선으로 보는 은하계',category:'FAN MEDIA',url:'https://www.starwarsnewsnet.com',endpoint:'https://www.starwarsnewsnet.com/feed',trusted:true,hosts:['starwarsnewsnet.com'],
  parsePrimary:body=>({candidates:parseRssOrAtom(body),paths:['rss']}),archivePlan,createCandidateEnricher:createSwnnEnricher,
  coverage:mode=>({coverage:'limited',coverageNote:`SWNN 월별 RSS를 최대 ${mode==='normal'?MAX_ROLLING_REQUESTS_PER_SOURCE:MAX_HISTORICAL_REQUESTS_PER_SOURCE}회 조회합니다.`}),
};
