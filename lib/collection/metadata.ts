import {enrichGenericFromHtml,forbesAuthorFeedUrl,imageRequestFailure,type ImageLookupReason,type Candidate,type CandidateEnrichmentDiagnostic,type SourceAdapter,type FetchText} from './sources';
import {metadataProblemAfterEnrichment,needsHtmlEnrichment} from './metadata-policy';

export async function fetchSourceText(url:string,timeoutMs=15000,fetchImpl:typeof fetch=fetch){
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(Math.max(1,Math.min(15000,Math.floor(timeoutMs)))),headers:{'User-Agent':'HolocronNews/2.0 (news metadata reader)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return (await response.text()).slice(0,4_000_000);
}

export async function enrichCandidate(initial:Candidate,adapter?:SourceAdapter,reportDiagnostic?:(diagnostic:CandidateEnrichmentDiagnostic)=>void,fetchText:FetchText=fetchSourceText){
  let candidate=initial;
  let failure:unknown;
  if(needsHtmlEnrichment(candidate)){
    let reason:ImageLookupReason='NO_IMAGE',detail='이미지 메타데이터 누락';
    try{
      const html=await fetchText(candidate.url);
      try{candidate=adapter?.enrichFromHtml?adapter.enrichFromHtml(candidate,html):enrichGenericFromHtml(candidate,html);}
      catch(error){failure=error;reason='PARSE_ERROR';detail='파싱 오류';}
    }
    catch(error){failure=error;({reason,detail}=imageRequestFailure(error));}
    if(!initial.image&&!candidate.image){
      reportDiagnostic?.({kind:'image-lookup-failure',reason,message:`원문 HTML 이미지 조회 실패 (${detail})`});
    }
  }
  return {candidate,problem:metadataProblemAfterEnrichment(candidate,failure)};
}

export {forbesAuthorFeedUrl};

export function createCandidateEnricher(adapter:SourceAdapter,reportDiagnostic?:(diagnostic:CandidateEnrichmentDiagnostic)=>void,fetchText:FetchText=fetchSourceText){
  const sourceEnrich=adapter.createCandidateEnricher?.(fetchText,{reportDiagnostic});
  return async(initial:Candidate)=>{
    const candidate=sourceEnrich?await sourceEnrich(initial):initial;
    return enrichCandidate(candidate,adapter,reportDiagnostic,fetchText);
  };
}
