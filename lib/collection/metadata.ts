import {enrichGenericFromHtml,forbesAuthorFeedUrl,type Candidate,type SourceAdapter} from './sources';
import {metadataProblemAfterEnrichment,needsHtmlEnrichment} from './metadata-policy';

export async function fetchSourceText(url:string){
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'HolocronNews/2.0 (news metadata reader)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return (await response.text()).slice(0,4_000_000);
}

export async function enrichCandidate(initial:Candidate,adapter?:SourceAdapter){
  let candidate=initial;
  let failure:unknown;
  if(needsHtmlEnrichment(candidate)){
    try{
      const html=await fetchSourceText(candidate.url);
      candidate=adapter?.enrichFromHtml?adapter.enrichFromHtml(candidate,html):enrichGenericFromHtml(candidate,html);
    }
    catch(error){failure=error;}
  }
  return {candidate,problem:metadataProblemAfterEnrichment(candidate,failure)};
}

export {forbesAuthorFeedUrl};

export function createCandidateEnricher(adapter:SourceAdapter){
  const sourceEnrich=adapter.createCandidateEnricher?.(fetchSourceText);
  return async(initial:Candidate)=>{
    const candidate=sourceEnrich?await sourceEnrich(initial):initial;
    return enrichCandidate(candidate,adapter);
  };
}
