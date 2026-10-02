import {hostAllowed,isRelevant,normalizeArticleUrl} from './policy';
import type {Candidate,SourceAdapter} from './sources';

export type CandidateQueueResult={queued:Array<{candidate:Candidate;url:string}>;invalidUrl:number;duplicate:number;irrelevant:number;deferred:number};

export function queueSourceCandidates(adapter:SourceAdapter,candidates:readonly Candidate[],known:ReadonlySet<string>,limit:number):CandidateQueueResult{
  const result:CandidateQueueResult={queued:[],invalidUrl:0,duplicate:0,irrelevant:0,deferred:0};
  for(const candidate of candidates){
    const url=normalizeArticleUrl(candidate.url);
    if(!url||!hostAllowed(url,adapter.hosts)){result.invalidUrl++;continue;}
    if(known.has(url)){result.duplicate++;continue;}
    if(!isRelevant(adapter.trusted,candidate.title,candidate.description,url)){result.irrelevant++;continue;}
    if(result.queued.length>=limit){result.deferred++;continue;}
    result.queued.push({candidate:{...candidate,url},url});
  }
  return result;
}
