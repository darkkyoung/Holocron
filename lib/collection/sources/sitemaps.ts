import {MAX_HISTORICAL_REQUESTS_PER_SOURCE,monthKeys,rollingMonthKeys} from './archive';
import {parseArticleSitemap,parseRssOrAtom} from './common';
import type {ArchiveEndpoint,SourceAdapter,SourceDiscoveryContext} from './types';

function articleEndpoint(url:string):ArchiveEndpoint{return {url,parse:parseArticleSitemap,path:'article-sitemap'};}

function industryAdapter(config:Omit<SourceAdapter,'parsePrimary'|'archivePlan'>,host:string):SourceAdapter{
  return {...config,parsePrimary:body=>({candidates:parseRssOrAtom(body),paths:['rss']}),archivePlan:(context:SourceDiscoveryContext)=>{
    const months=context.mode==='historical'&&context.range?monthKeys(context.range.start,context.range.end):rollingMonthKeys(context.now).slice(-2);
    return {endpoints:months.map(month=>articleEndpoint(`${host}/post-sitemap${month.replace('-','')}.xml`)).slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE)};
  }};
}

export const colliderAdapter:SourceAdapter={
  id:'collider',name:'Collider',description:'영화와 시리즈 엔터테인먼트',category:'ENTERTAINMENT',url:'https://collider.com/tag/star-wars/',endpoint:'https://collider.com/feed/category/tag/star-wars/',trusted:false,hosts:['collider.com'],
  parsePrimary:body=>({candidates:parseRssOrAtom(body),paths:['rss']}),
  archivePlan:async(context,fetchText)=>{
    if(context.mode!=='historical'||!context.range)return {endpoints:rollingMonthKeys(context.now).slice(-2).map(month=>articleEndpoint(`https://collider.com/sitemap-${month}-part1-articles.xml`))};
    try{
      const index=await fetchText('https://collider.com/sitemap.xml'),months=new Set(monthKeys(context.range.start,context.range.end));
      const endpoints=[...index.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match=>match[1]).filter(url=>[...months].some(month=>url.includes(`sitemap-${month}-`)&&url.includes('-articles.xml'))).slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE-1).map(articleEndpoint);
      return {endpoints,preflightRequests:1,paths:['sitemap-index']};
    }catch(error){return {endpoints:[],preflightRequests:1,paths:['sitemap-index-failed'],failures:[`https://collider.com/sitemap.xml: ${error instanceof Error?error.message:'알 수 없는 오류'}`]};}
  },
};

export const thrAdapter=industryAdapter({id:'thr',name:'The Hollywood Reporter',description:'할리우드 산업 뉴스',category:'INDUSTRY',url:'https://www.hollywoodreporter.com/t/star-wars/',endpoint:'https://www.hollywoodreporter.com/t/star-wars/feed/',trusted:false,hosts:['hollywoodreporter.com']},'https://www.hollywoodreporter.com');
export const deadlineAdapter=industryAdapter({id:'deadline',name:'Deadline',description:'영화·방송 속보',category:'INDUSTRY',url:'https://deadline.com/tag/star-wars/',endpoint:'https://deadline.com/tag/star-wars/feed/',trusted:false,hosts:['deadline.com']},'https://deadline.com');
export const varietyAdapter=industryAdapter({id:'variety',name:'Variety',description:'엔터테인먼트 업계 소식',category:'INDUSTRY',url:'https://variety.com/t/star-wars/',endpoint:'https://variety.com/t/star-wars/feed/',trusted:false,hosts:['variety.com']},'https://variety.com');
