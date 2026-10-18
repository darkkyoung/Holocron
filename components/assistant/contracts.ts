import type {retrieveArchive} from '@/lib/assistant/service';
import type {generateArchive} from '@/lib/assistant/generation';
import type {RetrievalFilters} from '@/lib/assistant/types';
import type {SourceId} from '@/lib/collection/source-settings';

// Types are erased from the browser bundle. The APIs remain the authority.
export type RetrievalView=Awaited<ReturnType<typeof retrieveArchive>>;
export type Candidate=RetrievalView['candidates'][number];
export type GenerationView=Awaited<ReturnType<typeof generateArchive>>;
export type AssistantMode='qa'|'script';
export type FilterChoices={workOptions:{id:string;title:string}[];categories:string[];sources:{id:SourceId;name:string}[]};
export type FilterDraft={workId:string;category:string;sourceIds:SourceId[];dateFrom:string;dateTo:string};
export const emptyFilters=():FilterDraft=>({workId:'',category:'',sourceIds:[],dateFrom:'',dateTo:''});
export function retrievalFilters(draft:FilterDraft,now=Date.now()):RetrievalFilters{
  const filters:RetrievalFilters={};
  if(draft.workId)filters.workId=draft.workId;
  if(draft.category)filters.category=draft.category;
  if(draft.sourceIds.length)filters.sourceIds=draft.sourceIds;
  const boundary=now-90*24*60*60*1000;
  if(draft.dateFrom)filters.dateFrom=new Date(Math.max(Date.parse(draft.dateFrom+'T00:00:00.000Z'),boundary)).toISOString();
  if(draft.dateTo)filters.dateTo=new Date(Math.min(Date.parse(draft.dateTo+'T23:59:59.999Z'),now)).toISOString();
  return filters;
}
export const generationCost=(mode:AssistantMode,policy?:import('@/lib/credit/policy-settings/domain').PublicCreditPolicy)=>policy?(mode==='qa'?policy.prices.qa:policy.prices.planner):null;
