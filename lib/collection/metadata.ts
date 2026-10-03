import {enrichFromHtml,parseRssOrAtom,type Candidate,type SourceAdapter} from './sources';
import {canUseForbesHeadlineOnly,matchFeedCandidate,metadataProblemAfterEnrichment,needsHtmlEnrichment} from './metadata-policy';

export async function fetchSourceText(url:string){
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'HolocronNews/2.0 (news metadata reader)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return (await response.text()).slice(0,4_000_000);
}

export async function enrichCandidate(initial:Candidate,sourceId?:SourceAdapter['id']){
  let candidate=initial;
  let failure:unknown;
  if(needsHtmlEnrichment(candidate)){
    try{candidate=enrichFromHtml(candidate,await fetchSourceText(candidate.url),sourceId);}
    catch(error){failure=error;}
  }
  return {candidate,problem:metadataProblemAfterEnrichment(candidate,failure)};
}

export function forbesAuthorFeedUrl(articleUrl:string){
  try{
    const url=new URL(articleUrl);
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    const match=url.pathname.match(/^\/sites\/([a-z0-9_-]+)\//i);
    return host==='forbes.com'&&match?`https://feeds.forbes.com/sites/${match[1].toLowerCase()}/feed/`:'';
  }catch{return '';}
}

function descriptionMissing(candidate:Candidate){
  return !candidate.description.trim()||candidate.description==='원문 메타데이터를 확인해 주세요.';
}

export function createCandidateEnricher(adapter:SourceAdapter){
  const feeds=new Map<string,Promise<Candidate[]>>();
  return async(initial:Candidate)=>{
    let candidate=initial;
    if(adapter.id==='forbes'){
      const feedUrl=forbesAuthorFeedUrl(candidate.url);
      if(feedUrl){
        if(!feeds.has(feedUrl))feeds.set(feedUrl,fetchSourceText(feedUrl).then(parseRssOrAtom).catch(()=>[]));
        const fresh=matchFeedCandidate(candidate.url,await feeds.get(feedUrl)!);
        if(fresh)candidate={
          ...candidate,
          title:!candidate.title||candidate.title==='제목 확인 필요'?fresh.title:candidate.title,
          description:descriptionMissing(candidate)?fresh.description:candidate.description,
          published:candidate.published||fresh.published,
          image:candidate.image||fresh.image,
        };
      }
      if(descriptionMissing(candidate)&&canUseForbesHeadlineOnly(candidate))candidate={...candidate,headlineOnly:true};
    }
    return enrichCandidate(candidate,adapter.id);
  };
}
