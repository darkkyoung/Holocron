import type {ReleasePrecision,Work,WorkType} from '../types';

export type TmdbMediaType='movie'|'tv';

export type TmdbSearchResult={id:number;mediaType:TmdbMediaType;title:string;originalTitle:string;releaseYear:string|null;posterUrl:string;};
export type TmdbSeason={number:number;name:string;airDate:string|null;posterUrl:string;};

export type WorkImportCandidate={
  provider:'tmdb';
  mediaType:TmdbMediaType;
  providerId:number;
  seasonNumber:number|null;
  title:string;
  originalTitle:string;
  suggestedType:WorkType;
  releaseDate:string|null;
  releasePrecision:ReleasePrecision;
  posterUrl:string;
  seriesKey:string|null;
};

export type ImportMatch={work:Work;kind:'tmdb'|'series-season'|'title';};
export type ImportPreview={candidate:WorkImportCandidate;matches:ImportMatch[];};
