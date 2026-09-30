import {groupWorksByStatus,isWorkStatus,type WorkStatus} from './types';
import {selectFeaturedWork} from './featured';
import {createWork,deleteWork,deleteLegacyCatalogRow,findLegacySeriesRow,findWorkBySeriesSeason,findWorkByTmdbReference,insertCatalogWork,listWorks,updateCatalogPoster,updateWork,updateWorkStatus} from './repository';
import {validateWorkDraft} from './validation';
import {LEGACY_SERIES_ROWS,SEASON_CATALOG} from './catalog/season-catalog';
import {unstable_cache} from 'next/cache';
import {invalidatePublicWorksCache,PUBLIC_WORKS_CACHE_SECONDS,PUBLIC_WORKS_CACHE_TAG} from '@/lib/public-cache';

function projectWorks(works:Awaited<ReturnType<typeof listWorks>>){return {sections:groupWorksByStatus(works),featured:selectFeaturedWork(works)};}
const loadPublicWorks=unstable_cache(listWorks,['public-works-v1'],{revalidate:PUBLIC_WORKS_CACHE_SECONDS,tags:[PUBLIC_WORKS_CACHE_TAG]});

export async function getWorksArchive(){return projectWorks(await loadPublicWorks());}
export async function getWorksManagementState(){return projectWorks(await listWorks());}
export async function getManagedWorks(){return listWorks();}
export async function changeWorkStatus(id:unknown,status:unknown){
  if(typeof id!=='string'||!id)throw new Error('작품을 확인해 주세요.');
  if(!isWorkStatus(status))throw new Error('작품 상태를 확인해 주세요.');
  await updateWorkStatus(id,status);
  invalidatePublicWorksCache();
  return {ok:true,status:status as WorkStatus};
}

function workId(value:unknown){if(typeof value!=='string'||!value)throw new Error('작품을 확인해 주세요.');return value;}
async function ensureUniqueTmdbReference(draft:ReturnType<typeof validateWorkDraft>,currentId?:string){
  if(!draft.tmdbMediaType||!draft.tmdbId)return;
  const existing=await findWorkByTmdbReference(draft.tmdbMediaType,draft.tmdbId,draft.tmdbSeasonNumber??null);
  if(existing&&existing.id!==currentId)throw new Error('같은 TMDB 작품이 이미 HOLOCRON에 등록되어 있습니다.');
}
export async function createManagedWork(input:unknown){const draft=validateWorkDraft(input);await ensureUniqueTmdbReference(draft);const created=await createWork(crypto.randomUUID(),draft);invalidatePublicWorksCache();return created;}
export async function updateManagedWork(id:unknown,input:unknown){const work=workId(id);const draft=validateWorkDraft(input);await ensureUniqueTmdbReference(draft,work);const updated=await updateWork(work,draft);invalidatePublicWorksCache();return updated;}
export async function deleteManagedWork(id:unknown){await deleteWork(workId(id));invalidatePublicWorksCache();return {ok:true};}

export type SeasonCatalogMaintenanceReport={created:string[];posterUpdated:string[];unchanged:string[];fallback:string[];legacyRemoved:string[];legacyPreserved:string[];};
const protectedPosterSources=new Set(['manual-official','manual-reference']);

export async function runSeasonCatalogMaintenance():Promise<SeasonCatalogMaintenanceReport>{
  const report:SeasonCatalogMaintenanceReport={created:[],posterUpdated:[],unchanged:[],fallback:[],legacyRemoved:[],legacyPreserved:[]};
  let changed=false;
  try{
  for(const entry of SEASON_CATALOG){
    const existing=await findWorkBySeriesSeason(entry.seriesKey,entry.seasonNumber);
    if(!existing){
      const posterUrl=entry.posterUrl||entry.fallbackPosterUrl;
      const posterSource=entry.posterUrl?entry.posterSource:posterUrl?'tmdb-series-fallback':'unknown';
      const created=await insertCatalogWork(`${entry.seriesKey}-season-${entry.seasonNumber}`,validateWorkDraft({title:entry.title,originalTitle:entry.originalTitle,type:entry.type,status:entry.status,posterUrl,posterSource,posterReferenceUrl:entry.posterReferenceUrl,releaseDate:entry.releaseDate,releasePrecision:entry.releasePrecision,officialUrl:entry.officialUrl,seriesKey:entry.seriesKey,seasonNumber:entry.seasonNumber}));
      if(created){changed=true;report.created.push(entry.title);if(!entry.posterUrl)report.fallback.push(entry.title);}
      continue;
    }
    if(entry.posterUrl&&!protectedPosterSources.has(existing.posterSource??'')&&existing.posterUrl!==entry.posterUrl){
      await updateCatalogPoster(existing.id,entry.posterUrl,entry.posterSource,entry.posterReferenceUrl);
      changed=true;
      report.posterUpdated.push(existing.title);
      continue;
    }
    if(!existing.posterUrl&&entry.fallbackPosterUrl&&!protectedPosterSources.has(existing.posterSource??'')){
      await updateCatalogPoster(existing.id,entry.fallbackPosterUrl,'tmdb-series-fallback',entry.posterReferenceUrl);
      changed=true;
      report.posterUpdated.push(existing.title);report.fallback.push(existing.title);continue;
    }
    if(!entry.posterUrl)report.fallback.push(existing.title);
    report.unchanged.push(existing.title);
  }
  for(const legacy of LEGACY_SERIES_ROWS){
    const row=await findLegacySeriesRow(legacy.id);
    if(!row){continue;}
    if(row.title!==legacy.title||row.originalTitle!==legacy.originalTitle){report.legacyPreserved.push(row.title);continue;}
    const related=SEASON_CATALOG.filter(item=>item.seriesKey===legacy.seriesKey);
    const rows=await Promise.all(related.map(item=>findWorkBySeriesSeason(item.seriesKey,item.seasonNumber)));
    if(rows.every(Boolean)&&await deleteLegacyCatalogRow(legacy.id)){changed=true;report.legacyRemoved.push(legacy.title);}
    else report.legacyPreserved.push(legacy.title);
  }
  return report;
  }finally{
    if(changed)invalidatePublicWorksCache();
  }
}
