import {COLLECTION_WINDOW_MS,normalizeArticleUrl,publicationDate} from './policy';
import {discoverCandidates,type Candidate,type SourceAdapter} from './sources';

export const MAX_SWNN_BACKFILL_REQUESTS=3;

export function swnnBackfillEndpoints(now=Date.now()){
  const cutoff=new Date(now-COLLECTION_WINDOW_MS);
  const cursor=new Date(now);
  cursor.setUTCDate(1);cursor.setUTCHours(0,0,0,0);cursor.setUTCMonth(cursor.getUTCMonth()-1);
  const cutoffMonth=Date.UTC(cutoff.getUTCFullYear(),cutoff.getUTCMonth(),1);
  const endpoints:string[]=[];
  while(cursor.getTime()>=cutoffMonth&&endpoints.length<MAX_SWNN_BACKFILL_REQUESTS){
    endpoints.push(`https://www.starwarsnewsnet.com/${cursor.getUTCFullYear()}/${String(cursor.getUTCMonth()+1).padStart(2,'0')}/feed/`);
    cursor.setUTCMonth(cursor.getUTCMonth()-1);
  }
  return endpoints;
}

function addCandidate(target:Map<string,Candidate>,candidate:Candidate){
  const key=normalizeArticleUrl(candidate.url);
  if(!key)return false;
  const existing=target.get(key);
  target.set(key,existing?{
    url:key,title:existing.title||candidate.title,description:existing.description||candidate.description,
    published:existing.published||candidate.published,image:existing.image||candidate.image,
  }:{...candidate,url:key});
  return !existing;
}

export type DiscoveryResult={candidates:Candidate[];primaryDiscovered:number;backfillDiscovered:number;backfillRequests:number;backfillFailures:string[]};

export async function discoverSourceCandidates(adapter:SourceAdapter,fetchText:(url:string)=>Promise<string>,now=Date.now()):Promise<DiscoveryResult>{
  const primary=discoverCandidates(adapter,await fetchText(adapter.endpoint));
  const merged=new Map<string,Candidate>();
  for(const candidate of primary)addCandidate(merged,candidate);
  if(adapter.id!=='swnn')return {candidates:[...merged.values()],primaryDiscovered:primary.length,backfillDiscovered:0,backfillRequests:0,backfillFailures:[]};

  let backfillDiscovered=0;
  const backfillFailures:string[]=[];
  const endpoints=swnnBackfillEndpoints(now);
  for(const endpoint of endpoints){
    try{
      for(const candidate of discoverCandidates(adapter,await fetchText(endpoint))){
        if(publicationDate(candidate.published,now).kind!=='valid')continue;
        if(addCandidate(merged,candidate))backfillDiscovered++;
      }
    }catch(error){backfillFailures.push(`${endpoint}: ${error instanceof Error?error.message:'알 수 없는 오류'}`);}
  }
  return {candidates:[...merged.values()],primaryDiscovered:primary.length,backfillDiscovered,backfillRequests:endpoints.length,backfillFailures};
}
