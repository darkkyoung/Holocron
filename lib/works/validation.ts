import {isPosterSource,isReleaseDateForPrecision,isReleasePrecision,isWorkStatus,isWorkType,type PosterSource,type ReleasePrecision,type WorkStatus,type WorkType} from './types';

export type WorkDraft={title:string;originalTitle:string;type:WorkType;status:WorkStatus;posterUrl:string;posterSource?:PosterSource|null;posterReferenceUrl?:string|null;posterTmdbPath?:string|null;releaseDate:string|null;releasePrecision:ReleasePrecision;officialUrl:string|null;seriesKey:string|null;seasonNumber:number|null;tmdbMediaType?:'movie'|'tv';tmdbId?:number;tmdbSeasonNumber?:number|null;};

function text(value:unknown){return typeof value==='string'?value.trim():'';}
function optionalUrl(value:unknown,label:string){const parsed=text(value);if(!parsed)return null;try{const url=new URL(parsed);if(url.protocol!=='http:'&&url.protocol!=='https:')throw new Error();return url.toString();}catch{throw new Error(`${label} URL 형식을 확인해 주세요.`);}}

export function validateWorkDraft(value:unknown):WorkDraft{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('작품 정보를 확인해 주세요.');
  const input=value as Record<string,unknown>;
  const title=text(input.title);if(!title)throw new Error('한국어 제목을 입력해 주세요.');
  if(!isWorkType(input.type))throw new Error('작품 유형을 확인해 주세요.');
  if(!isWorkStatus(input.status))throw new Error('작품 상태를 확인해 주세요.');
  if(!isReleasePrecision(input.releasePrecision))throw new Error('공개일 정밀도를 확인해 주세요.');
  const releasePrecision=input.releasePrecision;
  const rawDate=text(input.releaseDate);
  const releaseDate=releasePrecision==='unknown'?null:rawDate||null;
  if(!isReleaseDateForPrecision(releaseDate,releasePrecision))throw new Error('공개일과 정밀도 형식이 일치하지 않습니다.');
  const seriesKey=text(input.seriesKey)||null;
  const seasonRaw=text(input.seasonNumber);
  const seasonNumber=seasonRaw?Number(seasonRaw):null;
  if(seasonNumber!==null&&(!Number.isInteger(seasonNumber)||seasonNumber<1))throw new Error('시즌 번호를 확인해 주세요.');
  const tmdbMediaType=input.tmdbMediaType;
  const tmdbIdRaw=input.tmdbId;
  const tmdbId=typeof tmdbIdRaw==='number'?tmdbIdRaw:typeof tmdbIdRaw==='string'&&tmdbIdRaw.trim()?Number(tmdbIdRaw):undefined;
  const tmdbSeasonRaw=input.tmdbSeasonNumber;
  const tmdbSeasonNumber=typeof tmdbSeasonRaw==='number'?tmdbSeasonRaw:typeof tmdbSeasonRaw==='string'&&tmdbSeasonRaw.trim()?Number(tmdbSeasonRaw):undefined;
  if(tmdbMediaType!==undefined&&tmdbMediaType!=='movie'&&tmdbMediaType!=='tv')throw new Error('TMDB 미디어 유형을 확인해 주세요.');
  if(tmdbId!==undefined&&(!Number.isInteger(tmdbId)||tmdbId<1))throw new Error('TMDB 작품 정보를 확인해 주세요.');
  if(tmdbSeasonNumber!==undefined&&(!Number.isInteger(tmdbSeasonNumber)||tmdbSeasonNumber<1))throw new Error('TMDB 시즌 정보를 확인해 주세요.');
  if((tmdbMediaType!==undefined||tmdbId!==undefined)&&(tmdbMediaType===undefined||tmdbId===undefined))throw new Error('TMDB 작품 정보를 확인해 주세요.');
  if(tmdbMediaType==='movie'&&tmdbSeasonNumber!==undefined)throw new Error('영화에는 TMDB 시즌 정보를 저장할 수 없습니다.');
  const posterSource=input.posterSource===undefined?undefined:input.posterSource===null?null:isPosterSource(input.posterSource)?input.posterSource:(()=>{throw new Error('포스터 출처를 확인해 주세요.');})();
  const posterReferenceUrl=optionalUrl(input.posterReferenceUrl,'포스터 참고')??null;
  const posterTmdbPath=text(input.posterTmdbPath)||null;
  return {title,originalTitle:text(input.originalTitle),type:input.type,status:input.status,posterUrl:optionalUrl(input.posterUrl,'포스터')??'',...(posterSource!==undefined?{posterSource,posterReferenceUrl,posterTmdbPath}:{}),releaseDate,releasePrecision,officialUrl:optionalUrl(input.officialUrl,'공식 페이지'),seriesKey,seasonNumber,...(tmdbMediaType&&tmdbId?{tmdbMediaType,tmdbId,tmdbSeasonNumber:tmdbSeasonNumber??null}:{})};
}
