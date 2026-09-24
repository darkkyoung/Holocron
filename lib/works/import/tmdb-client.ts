import {createCandidate,localizedTitle,seriesKeyFromTitle,suggestedWorkType} from './normalize';
import type {TmdbMediaType,TmdbSearchResult,TmdbSeason,WorkImportCandidate} from './types';

const API='https://api.themoviedb.org/3';
const TIMEOUT=9000;
type Fetcher=typeof fetch;
export class TmdbImportError extends Error{constructor(message:string,readonly configuration=false){super(message);}}

type ImageConfig={images?:{secure_base_url?:string;poster_sizes?:string[]}};
type Image={file_path?:string|null;iso_639_1?:string|null;};
type SearchItem={id?:unknown;title?:unknown;name?:unknown;original_title?:unknown;original_name?:unknown;release_date?:unknown;first_air_date?:unknown;poster_path?:unknown;genre_ids?:unknown;};

function token(){return process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();}
function string(value:unknown){return typeof value==='string'?value.trim():'';}
function number(value:unknown){return typeof value==='number'&&Number.isInteger(value)&&value>0?value:null;}
function posterPath(value:unknown){const path=string(value);return path.startsWith('/')?path:'';}
function pickPoster(images:Image[],fallback:string){return images.find(image=>image.iso_639_1==='ko'&&posterPath(image.file_path))?.file_path??images.find(image=>image.iso_639_1===null&&posterPath(image.file_path))?.file_path??images.find(image=>image.iso_639_1==='en'&&posterPath(image.file_path))?.file_path??fallback;}

export class TmdbClient{
  constructor(private readonly fetcher:Fetcher=fetch,private readonly accessToken=token()){}
  private async request<T>(path:string,params:Record<string,string>={}){
    if(!this.accessToken)throw new TmdbImportError('TMDB API 설정이 필요합니다.',true);
    const url=new URL(`${API}${path}`);for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
    let response:Response;
    try{response=await this.fetcher(url,{headers:{Authorization:`Bearer ${this.accessToken}`,Accept:'application/json'},signal:AbortSignal.timeout(TIMEOUT)});}catch{throw new TmdbImportError('TMDB에서 정보를 가져오지 못했습니다.');}
    if(!response.ok)throw new TmdbImportError(response.status===401||response.status===403?'TMDB API 설정을 확인해 주세요.':'TMDB에서 정보를 가져오지 못했습니다.');
    try{return await response.json() as T;}catch{throw new TmdbImportError('TMDB 응답을 읽지 못했습니다.');}
  }
  private async configuration(){return this.request<ImageConfig>('/configuration');}
  private imageUrl(config:ImageConfig,path:unknown){const value=posterPath(path);if(!value)return '';const base=config.images?.secure_base_url;const size=config.images?.poster_sizes?.includes('w500')?'w500':config.images?.poster_sizes?.find(size=>size.startsWith('w'))??'original';return base?`${base}${size}${value}`:'';}
  private async images(path:string){const response=await this.request<{posters?:Image[]}>(path,{include_image_language:'ko,null,en'});return response.posters??[];}
  async search(query:string):Promise<TmdbSearchResult[]>{
    const normalized=query.trim();if(!normalized)throw new TmdbImportError('검색어를 입력해 주세요.');
    const [config,movies,tv]=await Promise.all([this.configuration(),this.request<{results?:SearchItem[]}>('/search/movie',{query:normalized,language:'ko-KR',include_adult:'false',page:'1'}),this.request<{results?:SearchItem[]}>('/search/tv',{query:normalized,language:'ko-KR',include_adult:'false',page:'1'})]);
    const map=(mediaType:TmdbMediaType,item:SearchItem):TmdbSearchResult|null=>{const id=number(item.id);if(!id)return null;const names=localizedTitle(mediaType==='movie'?item.title:item.name,mediaType==='movie'?item.original_title:item.original_name,'제목 미상');const rawDate=mediaType==='movie'?item.release_date:item.first_air_date;return {id,mediaType,title:names.title,originalTitle:names.originalTitle,releaseYear:string(rawDate).slice(0,4)||null,posterUrl:this.imageUrl(config,item.poster_path)};};
    return [...(movies.results??[]).map(item=>map('movie',item)),...(tv.results??[]).map(item=>map('tv',item))].filter((item):item is TmdbSearchResult=>Boolean(item)).slice(0,12);
  }
  async movieCandidate(id:number):Promise<WorkImportCandidate>{
    const [config,movie,images]=await Promise.all([this.configuration(),this.request<SearchItem & {genres?:unknown}>('/movie/'+id,{language:'ko-KR'}),this.images('/movie/'+id+'/images')]);
    const names=localizedTitle(movie.title,movie.original_title,'제목 미상');
    return createCandidate({mediaType:'movie',id,title:names.title,originalTitle:names.originalTitle,suggestedType:'영화',releaseDate:movie.release_date,posterUrl:this.imageUrl(config,pickPoster(images,posterPath(movie.poster_path)))});
  }
  async tvSeasons(id:number):Promise<{seriesTitle:string;originalTitle:string;seriesKey:string|null;suggestedType:ReturnType<typeof suggestedWorkType>;seasons:TmdbSeason[]}>{
    const [config,tv]=await Promise.all([this.configuration(),this.request<{name?:unknown;original_name?:unknown;genres?:unknown;seasons?:{season_number?:unknown;name?:unknown;air_date?:unknown;poster_path?:unknown}[]}>('/tv/'+id,{language:'ko-KR'})]);
    const names=localizedTitle(tv.name,tv.original_name,'제목 미상');
    const seasons=(tv.seasons??[]).flatMap(season=>{const seasonNumber=number(season.season_number);if(!seasonNumber)return [];return [{number:seasonNumber,name:string(season.name)||`Season ${seasonNumber}`,airDate:string(season.air_date)||null,posterUrl:this.imageUrl(config,season.poster_path)}];});
    return {seriesTitle:names.title,originalTitle:names.originalTitle,seriesKey:seriesKeyFromTitle(names.originalTitle),suggestedType:suggestedWorkType('tv',tv.genres),seasons};
  }
  async tvSeasonCandidate(id:number,seasonNumber:number):Promise<WorkImportCandidate>{
    const [config,tv,season,images]=await Promise.all([this.configuration(),this.request<{name?:unknown;original_name?:unknown;genres?:unknown;poster_path?:unknown}>('/tv/'+id,{language:'ko-KR'}),this.request<{air_date?:unknown;poster_path?:unknown}>('/tv/'+id+'/season/'+seasonNumber,{language:'ko-KR'}),this.images('/tv/'+id+'/season/'+seasonNumber+'/images')]);
    const series=localizedTitle(tv.name,tv.original_name,'제목 미상');
    const english=series.originalTitle;const korean=series.title;
    return createCandidate({mediaType:'tv',id,seasonNumber,title:`${korean} 시즌 ${seasonNumber}`,originalTitle:`${english} Season ${seasonNumber}`,suggestedType:suggestedWorkType('tv',tv.genres),releaseDate:season.air_date,posterUrl:this.imageUrl(config,pickPoster(images,posterPath(season.poster_path)||posterPath(tv.poster_path))),seriesKey:seriesKeyFromTitle(english)});
  }
}
