import {enrichGenericFromHtml,forbesAuthorFeedUrl,type Candidate,type CandidateEnrichmentDiagnostic,type SourceAdapter,type FetchText} from './sources';
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
    try{
      const html=await fetchText(candidate.url);
      candidate=adapter?.enrichFromHtml?adapter.enrichFromHtml(candidate,html):enrichGenericFromHtml(candidate,html);
    }
    catch(error){failure=error;}
    if(!initial.image&&!candidate.image){
      const detail=failure instanceof Error&&/^HTTP \d{3}$/.test(failure.message)?failure.message
        :failure instanceof Error&&['TimeoutError','AbortError'].includes(failure.name)?'요청 시간 초과'
        :failure?'요청 또는 파싱 오류':'이미지 메타데이터 누락';
      reportDiagnostic?.({kind:'image-lookup-failure',message:`원문 HTML 이미지 조회 실패 (${detail})`});
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
