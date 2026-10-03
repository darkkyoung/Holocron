import type {Article} from '../news';
import {isRelevant,normalizeArticleUrl,publicationDate} from './policy';
import {discoverCandidates,parseArticleSitemap,parseRssOrAtom,parseStarWarsIndexWithDiagnostics,type Candidate,type SourceAdapter} from './sources';
import {candidateInRange,type HistoricalRange} from './date-range';

export const ROLLING_BACKFILL_DAYS=14;
export const MAX_ROLLING_REQUESTS_PER_SOURCE=2;
export const MAX_HISTORICAL_REQUESTS_PER_SOURCE=6;
export const MAX_ARCHIVE_CANDIDATES_PER_SOURCE=100;

type ArchiveEndpoint={url:string;parser:'source'|'rss'|'article-sitemap'};
export type DiscoveryOptions={now?:number;mode?:'normal'|'historical';range?:HistoricalRange;articles?:readonly Pick<Article,'source'|'url'>[]};
export type DiscoveryResult={candidates:Candidate[];primaryDiscovered:number;backfillDiscovered:number;knownSkipped:number;backfillRequests:number;backfillFailures:string[];discoveryPaths:string[];coverage:'complete'|'limited';coverageNote:string};

function monthKeys(start:string,end:string){
  const keys:string[]=[];const cursor=new Date(`${start.slice(0,7)}-01T00:00:00Z`);const last=end.slice(0,7);
  while(cursor.toISOString().slice(0,7)<=last){keys.push(cursor.toISOString().slice(0,7));cursor.setUTCMonth(cursor.getUTCMonth()+1);}
  return keys;
}

export function swnnBackfillEndpoints(now=Date.now()){
  const end=new Date(now).toISOString().slice(0,10),start=new Date(now-ROLLING_BACKFILL_DAYS*86400000).toISOString().slice(0,10);
  const month=monthKeys(start,end)[0].replace('-','/');
  return [1,2].map(page=>`https://www.starwarsnewsnet.com/${month}/feed/${page===1?'':`?paged=${page}`}`);
}

function authorFeeds(adapter:SourceAdapter,articles:readonly Pick<Article,'source'|'url'>[]){
  return [...new Set(articles.filter(article=>article.source===adapter.name).map(article=>{
    try{const match=new URL(article.url).pathname.match(/^\/sites\/([a-z0-9_-]+)\//i);return match?`https://feeds.forbes.com/sites/${match[1].toLowerCase()}/feed/`:'';}catch{return '';}
  }).filter(Boolean))];
}

function monthlySitemap(adapter:SourceAdapter,month:string){
  const host=adapter.id==='thr'?'https://www.hollywoodreporter.com':adapter.id==='deadline'?'https://deadline.com':'https://variety.com';
  return `${host}/post-sitemap${month.replace('-','')}.xml`;
}

function normalArchiveEndpoints(adapter:SourceAdapter,now:number,articles:readonly Pick<Article,'source'|'url'>[]):ArchiveEndpoint[]{
  const end=new Date(now).toISOString().slice(0,10),start=new Date(now-ROLLING_BACKFILL_DAYS*86400000).toISOString().slice(0,10),months=monthKeys(start,end);
  if(adapter.id==='swnn')return swnnBackfillEndpoints(now).map(url=>({url,parser:'rss'}));
  if(adapter.id==='collider')return months.slice(-2).map(month=>({url:`https://collider.com/sitemap-${month}-part1-articles.xml`,parser:'article-sitemap'}));
  if(adapter.id==='thr'||adapter.id==='deadline'||adapter.id==='variety')return months.slice(-2).map(month=>({url:monthlySitemap(adapter,month),parser:'article-sitemap'}));
  if(adapter.id==='forbes')return authorFeeds(adapter,articles).slice(0,MAX_ROLLING_REQUESTS_PER_SOURCE).map(url=>({url,parser:'rss'}));
  return [];
}

function historicalStaticEndpoints(adapter:SourceAdapter,range:HistoricalRange,articles:readonly Pick<Article,'source'|'url'>[]):ArchiveEndpoint[]{
  const months=monthKeys(range.start,range.end);
  if(adapter.id==='swnn'){
    const endpoints:ArchiveEndpoint[]=[];
    for(const month of months)for(let page=1;page<=MAX_HISTORICAL_REQUESTS_PER_SOURCE;page++)endpoints.push({url:`https://www.starwarsnewsnet.com/${month.replace('-','/')}/feed/${page===1?'':`?paged=${page}`}`,parser:'rss'});
    return endpoints.slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE);
  }
  if(adapter.id==='thr'||adapter.id==='deadline'||adapter.id==='variety')return months.map<ArchiveEndpoint>(month=>({url:monthlySitemap(adapter,month),parser:'article-sitemap'})).slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE);
  if(adapter.id==='forbes')return authorFeeds(adapter,articles).slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE-1).map(url=>({url,parser:'rss'}));
  return [];
}

function parseEndpoint(adapter:SourceAdapter,endpoint:ArchiveEndpoint,body:string){
  if(endpoint.parser==='rss')return parseRssOrAtom(body);
  if(endpoint.parser==='article-sitemap')return parseArticleSitemap(body);
  return discoverCandidates(adapter,body);
}

function addCandidate(target:Map<string,Candidate>,candidate:Candidate){
  const key=normalizeArticleUrl(candidate.url);if(!key)return false;
  const existing=target.get(key);
  target.set(key,existing?{url:key,title:existing.title||candidate.title,description:existing.description||candidate.description,published:existing.published||candidate.published,image:existing.image||candidate.image,discoveryDate:existing.discoveryDate||candidate.discoveryDate}:{...candidate,url:key});
  return !existing;
}

function rollingCandidate(candidate:Candidate,now:number){
  const date=publicationDate(candidate.published||candidate.discoveryDate||'',now);if(date.kind!=='valid')return true;
  return Date.parse(date.precision==='date'?`${date.value}T00:00:00Z`:date.value)>=now-ROLLING_BACKFILL_DAYS*86400000;
}

function coverage(adapter:SourceAdapter,mode:'normal'|'historical'):{coverage:'complete'|'limited';coverageNote:string}{
  if(adapter.id==='forbes')return {coverage:'limited',coverageNote:'Forbes news sitemap와 기존 작성자 RSS 범위 내에서 조회합니다.'};
  if(adapter.id==='starwars')return {coverage:'complete',coverageNote:'StarWars.com 현재 /news structured index 범위를 조회합니다.'};
  if(adapter.id==='swnn')return {coverage:'limited',coverageNote:`SWNN 월별 RSS를 최대 ${mode==='normal'?MAX_ROLLING_REQUESTS_PER_SOURCE:MAX_HISTORICAL_REQUESTS_PER_SOURCE}회 조회합니다.`};
  return {coverage:'complete',coverageNote:'공식 월별 article sitemap 범위를 조회합니다.'};
}

export async function discoverSourceCandidates(adapter:SourceAdapter,fetchText:(url:string)=>Promise<string>,options:DiscoveryOptions|number={}):Promise<DiscoveryResult>{
  const legacyNow=typeof options==='number'?options:undefined,normalized=typeof options==='number'?{}:options;
  const now=legacyNow??normalized.now??Date.now(),mode=normalized.mode??'normal',articles=normalized.articles??[];
  const merged=new Map<string,Candidate>(),paths:string[]=[];
  const known=new Set(articles.map(article=>normalizeArticleUrl(article.url)).filter(Boolean));
  const primaryBody=await fetchText(adapter.endpoint);
  const primary=adapter.id==='starwars'?parseStarWarsIndexWithDiagnostics(primaryBody):{candidates:discoverCandidates(adapter,primaryBody),paths:[adapter.kind]};
  paths.push(...primary.paths);
  for(const candidate of primary.candidates)if(mode==='normal'||!normalized.range||candidateInRange(candidate,normalized.range,now))addCandidate(merged,candidate);
  let endpoints=mode==='historical'&&normalized.range?historicalStaticEndpoints(adapter,normalized.range,articles):normalArchiveEndpoints(adapter,now,articles);
  let preflightRequests=0;const preflightFailures:string[]=[];
  if(adapter.id==='collider'&&mode==='historical'&&normalized.range){
    preflightRequests=1;
    try{
      const index=await fetchText('https://collider.com/sitemap.xml'),months=new Set(monthKeys(normalized.range.start,normalized.range.end));
      endpoints=[...index.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match=>match[1]).filter(url=>[...months].some(month=>url.includes(`sitemap-${month}-`)&&url.includes('-articles.xml'))).slice(0,MAX_HISTORICAL_REQUESTS_PER_SOURCE-1).map(url=>({url,parser:'article-sitemap'}));
      paths.push('sitemap-index');
    }catch(error){endpoints=[];paths.push('sitemap-index-failed');preflightFailures.push(`https://collider.com/sitemap.xml: ${error instanceof Error?error.message:'알 수 없는 오류'}`);}
  }
  endpoints=endpoints.slice(0,mode==='normal'?MAX_ROLLING_REQUESTS_PER_SOURCE:MAX_HISTORICAL_REQUESTS_PER_SOURCE);
  let backfillDiscovered=0;const knownSkippedUrls=new Set<string>(),backfillFailures=[...preflightFailures];
  for(const endpoint of endpoints){
    try{
      for(const candidate of parseEndpoint(adapter,endpoint,await fetchText(endpoint.url))){
        if(!isRelevant(adapter.trusted,candidate.title,candidate.description,candidate.url))continue;
        if(mode==='normal'&&!rollingCandidate(candidate,now))continue;
        if(mode==='historical'&&normalized.range&&!candidateInRange(candidate,normalized.range,now))continue;
        const normalizedUrl=normalizeArticleUrl(candidate.url);
        if(normalizedUrl&&known.has(normalizedUrl)&&!merged.has(normalizedUrl)){knownSkippedUrls.add(normalizedUrl);continue;}
        if(addCandidate(merged,candidate))backfillDiscovered++;
        if(backfillDiscovered>=MAX_ARCHIVE_CANDIDATES_PER_SOURCE)break;
      }
      paths.push(endpoint.parser);
    }catch(error){backfillFailures.push(`${endpoint.url}: ${error instanceof Error?error.message:'알 수 없는 오류'}`);}
  }
  const cap=coverage(adapter,mode);
  return {candidates:[...merged.values()],primaryDiscovered:primary.candidates.length,backfillDiscovered,knownSkipped:knownSkippedUrls.size,backfillRequests:endpoints.length+preflightRequests,backfillFailures,discoveryPaths:[...new Set(paths)],...cap};
}
