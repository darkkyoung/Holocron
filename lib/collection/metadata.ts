import {enrichFromHtml,type Candidate} from './sources';
import {metadataProblemAfterEnrichment,needsHtmlEnrichment} from './metadata-policy';

export async function fetchSourceText(url:string){
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'HolocronNews/2.0 (news metadata reader)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return (await response.text()).slice(0,4_000_000);
}

export async function enrichCandidate(initial:Candidate){
  let candidate=initial;
  let failure:unknown;
  if(needsHtmlEnrichment(candidate)){
    try{candidate=enrichFromHtml(candidate,await fetchSourceText(candidate.url));}
    catch(error){failure=error;}
  }
  return {candidate,problem:metadataProblemAfterEnrichment(candidate,failure)};
}
