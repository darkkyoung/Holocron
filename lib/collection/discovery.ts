import type {Article} from '../news';
import {isRelevant,normalizeArticleUrl,publicationDate} from './policy';
import {MAX_ARCHIVE_CANDIDATES_PER_SOURCE,MAX_HISTORICAL_REQUESTS_PER_SOURCE,MAX_ROLLING_REQUESTS_PER_SOURCE,ROLLING_BACKFILL_DAYS,mergeCandidateMetadata,type Candidate,type SourceAdapter} from './sources';
import {candidateInRange,type HistoricalRange} from './date-range';

export {MAX_ARCHIVE_CANDIDATES_PER_SOURCE,MAX_HISTORICAL_REQUESTS_PER_SOURCE,MAX_ROLLING_REQUESTS_PER_SOURCE,ROLLING_BACKFILL_DAYS,swnnBackfillEndpoints} from './sources';

export type DiscoveryOptions={now?:number;mode?:'normal'|'historical';range?:HistoricalRange;articles?:readonly Pick<Article,'source'|'url'>[]};
export type DiscoveryResult={candidates:Candidate[];primaryDiscovered:number;backfillDiscovered:number;knownSkipped:number;backfillRequests:number;backfillFailures:string[];discoveryPaths:string[];coverage:'complete'|'limited';coverageNote:string};

function addCandidate(target:Map<string,Candidate>,candidate:Candidate){
  const key=normalizeArticleUrl(candidate.url);if(!key)return false;
  const existing=target.get(key),normalized={...candidate,url:key};
  target.set(key,existing?mergeCandidateMetadata(existing,normalized,key):normalized);
  return !existing;
}

function rollingCandidate(candidate:Candidate,now:number){
  const date=publicationDate(candidate.published||candidate.discoveryDate||'',now);if(date.kind!=='valid')return true;
  return Date.parse(date.precision==='date'?`${date.value}T00:00:00Z`:date.value)>=now-ROLLING_BACKFILL_DAYS*86400000;
}

export async function discoverSourceCandidates(adapter:SourceAdapter,fetchText:(url:string)=>Promise<string>,options:DiscoveryOptions|number={}):Promise<DiscoveryResult>{
  const legacyNow=typeof options==='number'?options:undefined,normalized=typeof options==='number'?{}:options;
  const now=legacyNow??normalized.now??Date.now(),mode=normalized.mode??'normal',articles=normalized.articles??[];
  const merged=new Map<string,Candidate>(),paths:string[]=[];
  const known=new Set(articles.map(article=>normalizeArticleUrl(article.url)).filter(Boolean));
  const primary=adapter.parsePrimary(await fetchText(adapter.endpoint));
  paths.push(...primary.paths);
  for(const candidate of primary.candidates)if(mode==='normal'||!normalized.range||candidateInRange(candidate,normalized.range,now))addCandidate(merged,candidate);

  const plan=adapter.archivePlan?await adapter.archivePlan({now,mode,range:normalized.range,articles},fetchText):{endpoints:[]};
  const requestLimit=mode==='normal'?MAX_ROLLING_REQUESTS_PER_SOURCE:MAX_HISTORICAL_REQUESTS_PER_SOURCE;
  const endpoints=plan.endpoints.slice(0,requestLimit);
  const preflightRequests=plan.preflightRequests??0;
  const backfillFailures=[...(plan.failures??[])];
  paths.push(...(plan.paths??[]));
  let backfillDiscovered=0;const knownSkippedUrls=new Set<string>();
  for(const endpoint of endpoints){
    try{
      for(const candidate of endpoint.parse(await fetchText(endpoint.url))){
        if(!isRelevant(adapter.trusted,candidate.title,candidate.description,candidate.url))continue;
        if(mode==='normal'&&!rollingCandidate(candidate,now))continue;
        if(mode==='historical'&&normalized.range&&!candidateInRange(candidate,normalized.range,now))continue;
        const normalizedUrl=normalizeArticleUrl(candidate.url);
        if(normalizedUrl&&known.has(normalizedUrl)&&!merged.has(normalizedUrl)){knownSkippedUrls.add(normalizedUrl);continue;}
        if(addCandidate(merged,candidate))backfillDiscovered++;
        if(backfillDiscovered>=MAX_ARCHIVE_CANDIDATES_PER_SOURCE)break;
      }
      paths.push(endpoint.path);
    }catch(error){backfillFailures.push(`${endpoint.url}: ${error instanceof Error?error.message:'알 수 없는 오류'}`);}
  }
  const coverage=adapter.coverage?.(mode)??{coverage:'complete' as const,coverageNote:'공식 월별 article sitemap 범위를 조회합니다.'};
  return {candidates:[...merged.values()],primaryDiscovered:primary.candidates.length,backfillDiscovered,knownSkipped:knownSkippedUrls.size,backfillRequests:endpoints.length+preflightRequests,backfillFailures,discoveryPaths:[...new Set(paths)],...coverage};
}
