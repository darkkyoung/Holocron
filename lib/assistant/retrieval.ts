import type {Article} from '../news';
import type {ArchiveSnapshot} from '../news/archive-snapshot';
import {buildStories,type Story} from '../news/stories';
import {displayArticleTitle} from '../news/presentation';
import {storyCategories} from '../news/explorer';
import {sourceIdForArticleSource} from '../collection/source-settings';
import {buildWorkMatchIndex,matchArticleWorks,normalizeWorkText} from '../news-work/matcher';
import {projectNewsWorks} from '../news-work/projection';
import {AssistantError,compareText,type RetrievalRequest} from './types';
import {searchTerms,searchTermVariants,coreSearchTerms,sufficientCoverage} from './search-terms';
export {searchTerms} from './search-terms';

export function scoreArticle(article:Article,terms:readonly string[]){
  const title=normalizeWorkText(displayArticleTitle(article)),summary=normalizeWorkText(article.summary),phrase=terms.join(' ');
  const matches=terms.map(t=>({title:searchTermVariants(t).some(v=>title.includes(v)),summary:searchTermVariants(t).some(v=>summary.includes(v))}));
  const coverage=matches.filter(m=>m.title||m.summary).length;
  return {score:(phrase&&title.includes(phrase)?10:0)+matches.reduce((s,m)=>s+(m.title?2:0)+(m.summary?1:0),0),coverage};
}
export function projectFilteredStories(snapshot:ArchiveSnapshot,request:RetrievalRequest){
  const {sourceIds}=request.filters;
  const articles=sourceIds?snapshot.articles.filter(a=>{const id=sourceIdForArticleSource(a.source);return id&&sourceIds.includes(id);}):snapshot.articles;
  return projectNewsWorks(buildStories(articles,Date.parse(snapshot.asOf)),snapshot.relations.filter(r=>r.state==='linked'),snapshot.works).stories;
}
export function retrieveStories(snapshot:ArchiveSnapshot,request:RetrievalRequest){
  const {filters}=request,index=buildWorkMatchIndex(snapshot.works);
  const projected=projectFilteredStories(snapshot,request);
  if(filters.workId&&!snapshot.works.some(w=>w.id===filters.workId))throw new AssistantError('INVALID_REQUEST');
  if(filters.category&&!storyCategories(projected).includes(filters.category))throw new AssistantError('INVALID_REQUEST');
  const match=filters.workId?{workIds:[filters.workId],ambiguous:false}:matchArticleWorks(index,{title:request.query,summary:''});
  const base={candidates:[] as {story:Story;score:number;coverage:number}[],terms:searchTerms(request.query),resolvedWork:null as null|{id:string;title:string},workChoices:[] as {id:string;title:string}[]};
  if(match.ambiguous||match.workIds.length>1){
    // The SAME matcher identifies which catalog rows participate in ambiguity.
    base.workChoices=snapshot.works.filter(w=>{const m=matchArticleWorks(buildWorkMatchIndex([w]),{title:request.query,summary:''});return m.ambiguous||m.workIds.includes(w.id);}).map(({id,title})=>({id,title})).sort((a,b)=>compareText(a.id,b.id));
    return {...base,status:'clarification' as const,reason:'choose_work' as const};
  }
  let residual=request.query;
  const workId=match.workIds[0];
  if(workId){
    const work=snapshot.works.find(w=>w.id===workId)!;base.resolvedWork={id:work.id,title:work.title};
    // Strip only the resolved catalog's recognized aliases, longest first.
    for(const [term,owners] of [...index.terms].sort((a,b)=>b[0].length-a[0].length))if(owners.has(workId)){
      const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      residual=residual.replace(new RegExp(`(^| )${escaped}(?=$| |[은는이가을를의와과에로])`,'gu'),' ').trim();
    }
  }
  const terms=searchTerms(residual),core=coreSearchTerms(terms);base.terms=terms;
  if(!workId&&!core.length)return {...base,status:'clarification' as const,reason:'specific_query' as const};
  const candidates=projected.filter(story=>{
    const first=story.articles[0],date=Date.parse(first.published);
    return (!workId||story.workIds?.includes(workId))&&(!filters.category||first.category===filters.category)&&(!filters.dateFrom||date>=Date.parse(filters.dateFrom))&&(!filters.dateTo||date<=Date.parse(filters.dateTo));
  }).map(story=>{
    const scores=story.articles.map(a=>({...scoreArticle(a,terms),relevant:!core.length||sufficientCoverage(scoreArticle(a,core).coverage,core.length)})).sort((a,b)=>Number(b.relevant)-Number(a.relevant)||b.score-a.score||b.coverage-a.coverage);
    return {story,...scores[0]};
  }).filter(row=>row.relevant).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||Date.parse(b.story.articles[0].published)-Date.parse(a.story.articles[0].published)||compareText(a.story.topic,b.story.topic)).slice(0,12);
  return {...base,candidates,status:candidates.length?'ready' as const:'insufficient_evidence' as const,reason:candidates.length?'matched' as const:workId?'no_linked_match' as const:'no_match' as const};
}
