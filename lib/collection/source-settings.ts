import {sourceAdapters,type SourceAdapter,type SourceId} from './sources';
import type {Article} from '../news';
export type {SourceId} from './sources';

export const COLLECTION_SOURCES_SETTING_KEY='collection_sources_v1';
export type SourceEnabledState=Record<SourceId,boolean>;
export type SourceSettingItem={id:SourceId;name:string;description:string;category:string;url:string;enabled:boolean};

export function defaultSourceEnabledState():SourceEnabledState{
  return Object.fromEntries(sourceAdapters.map(source=>[source.id,true])) as SourceEnabledState;
}

export function normalizeSourceEnabledState(value:unknown):SourceEnabledState{
  const stored=value&&typeof value==='object'?value as Record<string,unknown>:{};
  return Object.fromEntries(sourceAdapters.map(source=>[source.id,typeof stored[source.id]==='boolean'?stored[source.id]:true])) as SourceEnabledState;
}

export function parseSourceEnabledState(value:string|null|undefined){
  if(!value)return defaultSourceEnabledState();
  try{return normalizeSourceEnabledState(JSON.parse(value));}
  catch{return defaultSourceEnabledState();}
}

export function isSourceId(value:unknown):value is SourceId{
  return typeof value==='string'&&sourceAdapters.some(source=>source.id===value);
}

export function enabledSourceAdapters(state:SourceEnabledState,adapters:readonly SourceAdapter[]=sourceAdapters){
  return adapters.filter(source=>state[source.id]!==false);
}

export function sourceSettingItems(state:SourceEnabledState):SourceSettingItem[]{
  return sourceAdapters.map(({id,name,description,category,url})=>({id,name,description,category,url,enabled:state[id]!==false}));
}

function normalizedSourceName(value:string){return value.trim().replace(/\s+/g,' ').toLocaleLowerCase();}

/** Maps persisted display names to stable adapter IDs without changing article rows. */
export function sourceIdForArticleSource(source:string):SourceId|undefined{
  const normalized=normalizedSourceName(source);
  return sourceAdapters.find(adapter=>normalizedSourceName(adapter.name)===normalized)?.id;
}

/** Archive visibility is independent of article moderation state. */
export function filterArticlesByEnabledSources<T extends Pick<Article,'source'>>(articles:readonly T[],state:SourceEnabledState):T[]{
  return articles.filter(article=>{
    const sourceId=sourceIdForArticleSource(article.source);
    // Unknown legacy sources stay visible rather than being hidden by a setting
    // that cannot identify them safely.
    return !sourceId||state[sourceId]!==false;
  });
}
