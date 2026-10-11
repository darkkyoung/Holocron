import {canUseForbesHeadlineOnly,matchFeedCandidate} from '../metadata-policy';
import {MAX_HISTORICAL_REQUESTS_PER_SOURCE,MAX_ROLLING_REQUESTS_PER_SOURCE} from './archive';
import {parseNewsSitemap,parseRssOrAtom} from './common';
import type {Candidate,FetchText,SourceAdapter,SourceDiscoveryContext} from './types';

export function forbesAuthorFeedUrl(articleUrl:string){
  try{
    const url=new URL(articleUrl),host=url.hostname.toLowerCase().replace(/^www\./,''),match=url.pathname.match(/^\/sites\/([a-z0-9_-]+)\//i);
    return host==='forbes.com'&&match?`https://feeds.forbes.com/sites/${match[1].toLowerCase()}/feed/`:'';
  }catch{return '';}
}

function authorFeeds(context:SourceDiscoveryContext){return [...new Set(context.articles.filter(article=>article.source==='Forbes').map(article=>forbesAuthorFeedUrl(article.url)).filter(Boolean))];}

function archivePlan(context:SourceDiscoveryContext){
  const limit=context.mode==='historical'?MAX_HISTORICAL_REQUESTS_PER_SOURCE-1:MAX_ROLLING_REQUESTS_PER_SOURCE;
  return {endpoints:authorFeeds(context).slice(0,limit).map(url=>({url,parse:parseRssOrAtom,path:'rss'}))};
}

function descriptionMissing(candidate:Candidate){return !candidate.description.trim()||candidate.description==='원문 메타데이터를 확인해 주세요.';}

function createForbesEnricher(fetchText:FetchText){
  const feeds=new Map<string,Promise<Candidate[]>>();
  return async(candidate:Candidate)=>{
    const feedUrl=forbesAuthorFeedUrl(candidate.url);
    if(feedUrl){
      if(!feeds.has(feedUrl))feeds.set(feedUrl,fetchText(feedUrl).then(parseRssOrAtom).catch(()=>[]));
      const fresh=matchFeedCandidate(candidate.url,await feeds.get(feedUrl)!);
      if(fresh)candidate={...candidate,title:!candidate.title||candidate.title==='제목 확인 필요'?fresh.title:candidate.title,description:descriptionMissing(candidate)?fresh.description:candidate.description,published:candidate.published||fresh.published,image:candidate.image||fresh.image};
    }
    return descriptionMissing(candidate)&&canUseForbesHeadlineOnly(candidate)?{...candidate,headlineOnly:true}:candidate;
  };
}

export const forbesAdapter:SourceAdapter={
  id:'forbes',name:'Forbes',description:'비즈니스와 문화 분석',category:'BUSINESS',url:'https://www.forbes.com/search/?q=star%20wars',endpoint:'https://www.forbes.com/news_sitemap.xml',trusted:false,hosts:['forbes.com'],
  parsePrimary:body=>({candidates:parseNewsSitemap(body),paths:['news-sitemap']}),archivePlan,createCandidateEnricher:createForbesEnricher,
  coverage:()=>({coverage:'limited',coverageNote:'Forbes news sitemap와 기존 작성자 RSS 범위 내에서 조회합니다.'}),
};
