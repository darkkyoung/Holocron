import type {ReleasePrecision,Work,WorkType} from '../types';
import type {ImportMatch,TmdbMediaType,WorkImportCandidate} from './types';

export function normalizeReleaseDate(value:unknown):{releaseDate:string|null;releasePrecision:ReleasePrecision}{
  if(typeof value!=='string'||!value.trim())return {releaseDate:null,releasePrecision:'unknown'};
  const date=value.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(date))return {releaseDate:date,releasePrecision:'day'};
  if(/^\d{4}-\d{2}$/.test(date))return {releaseDate:date,releasePrecision:'month'};
  if(/^\d{4}$/.test(date))return {releaseDate:date,releasePrecision:'year'};
  return {releaseDate:null,releasePrecision:'unknown'};
}

export function localizedTitle(korean:unknown,original:unknown,fallback:string){
  const ko=typeof korean==='string'?korean.trim():'';
  const en=typeof original==='string'?original.trim():'';
  return {title:ko||en||fallback,originalTitle:en||ko||fallback};
}

export function seriesKeyFromTitle(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||null;}

export function suggestedWorkType(mediaType:TmdbMediaType,genres:unknown):WorkType{
  if(mediaType==='movie')return '영화';
  const names=Array.isArray(genres)?genres.map(item=>typeof item==='object'&&item&&'name' in item?String(item.name).toLowerCase():''):[];
  return names.some(name=>name.includes('animation'))?'애니메이션':'드라마';
}

export function createCandidate(input:{mediaType:TmdbMediaType;id:number;seasonNumber?:number|null;title:string;originalTitle:string;suggestedType:WorkType;releaseDate:unknown;posterUrl:string;posterSource?:WorkImportCandidate['posterSource'];posterTmdbPath?:string|null;seriesKey?:string|null}):WorkImportCandidate{
  const release=normalizeReleaseDate(input.releaseDate);
  const season=input.seasonNumber??null;
  return {provider:'tmdb',mediaType:input.mediaType,providerId:input.id,seasonNumber:season,title:input.title,originalTitle:input.originalTitle,suggestedType:input.suggestedType,releaseDate:release.releaseDate,releasePrecision:release.releasePrecision,posterUrl:input.posterUrl,posterSource:input.posterSource??'unknown',posterTmdbPath:input.posterTmdbPath??null,seriesKey:input.seriesKey??null};
}

function sameText(a:string,b:string){return a.trim().toLocaleLowerCase('ko')===b.trim().toLocaleLowerCase('ko');}
export function findImportMatches(candidate:WorkImportCandidate,works:Work[]):ImportMatch[]{
  return works.flatMap<ImportMatch>(work=>{
    if(work.tmdbMediaType===candidate.mediaType&&work.tmdbId===candidate.providerId&&(work.tmdbSeasonNumber??null)===candidate.seasonNumber)return [{work,kind:'tmdb' as const}];
    if(candidate.seriesKey&&candidate.seasonNumber!==null&&work.seriesKey===candidate.seriesKey&&work.seasonNumber===candidate.seasonNumber)return [{work,kind:'series-season' as const}];
    if(sameText(work.title,candidate.title)||sameText(work.originalTitle,candidate.originalTitle))return [{work,kind:'title' as const}];
    return [];
  });
}
