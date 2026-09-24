import {getManagedWorks} from '../service';
import {findImportMatches} from './normalize';
import {TmdbClient} from './tmdb-client';
import type {ImportPreview,TmdbSearchResult} from './types';

function id(value:unknown){const parsed=typeof value==='number'?value:Number(value);if(!Number.isInteger(parsed)||parsed<1)throw new Error('TMDB 작품을 확인해 주세요.');return parsed;}
function season(value:unknown){const parsed=typeof value==='number'?value:Number(value);if(!Number.isInteger(parsed)||parsed<1)throw new Error('TMDB 시즌을 확인해 주세요.');return parsed;}
export async function searchTmdbWorks(query:unknown):Promise<TmdbSearchResult[]>{if(typeof query!=='string')throw new Error('검색어를 입력해 주세요.');return new TmdbClient().search(query);}
export async function getTmdbTvSeasons(workId:unknown){return new TmdbClient().tvSeasons(id(workId));}
export async function previewTmdbImport(mediaType:unknown,workId:unknown,seasonNumber?:unknown):Promise<ImportPreview>{
  const client=new TmdbClient();const tmdbId=id(workId);
  const candidate=mediaType==='movie'?await client.movieCandidate(tmdbId):mediaType==='tv'?await client.tvSeasonCandidate(tmdbId,season(seasonNumber)):(()=>{throw new Error('TMDB 미디어 유형을 확인해 주세요.');})();
  return {candidate,matches:findImportMatches(candidate,await getManagedWorks())};
}
