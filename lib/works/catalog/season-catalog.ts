import type {WorkType,ReleasePrecision,PosterSource,WorkStatus} from '../types';

export type SeasonCatalogEntry={
  seriesKey:string;
  seasonNumber:number;
  title:string;
  originalTitle:string;
  type:WorkType;
  status:WorkStatus;
  releaseDate:string|null;
  releasePrecision:ReleasePrecision;
  posterUrl:string;
  posterSource:PosterSource;
  posterReferenceUrl:string;
  fallbackPosterUrl:string;
  officialUrl:string;
};

const official=(path:string)=>`https://www.starwars.com/series/${path}`;

/**
 * Curated, conservative maintenance input.  It is deliberately not a runtime
 * provider: once applied, D1 remains the source of truth.  Empty/safe fallback
 * poster values mean that the action must not invent season artwork.
 */
export const SEASON_CATALOG:SeasonCatalogEntry[]=[
  ...Array.from({length:7},(_,index)=>{const season=index+1;return {seriesKey:'the-clone-wars',seasonNumber:season,title:`스타워즈: 클론 전쟁 시즌 ${season}`,originalTitle:`Star Wars: The Clone Wars Season ${season}`,type:'애니메이션',status:'archive',releaseDate:['2008-10-03','2009-10-02','2010-09-17','2011-09-16','2012-09-29','2014-02-15','2020-02-21'][index],releasePrecision:'day',posterUrl:'',posterSource:'unknown',posterReferenceUrl:official('star-wars-the-clone-wars'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/the-clone-wars-poster-post-catalog_6fe148dd.jpeg',officialUrl:official('star-wars-the-clone-wars')} as SeasonCatalogEntry;}),
  ...Array.from({length:4},(_,index)=>{const season=index+1;const isFinal=season===4;return {seriesKey:'star-wars-rebels',seasonNumber:season,title:`스타워즈 반란군 시즌 ${season}`,originalTitle:`Star Wars Rebels Season ${season}`,type:'애니메이션',status:'archive',releaseDate:['2014-10-03','2015-10-14','2016-09-24','2017-10-16'][index],releasePrecision:'day',posterUrl:isFinal?'https://lumiere-a.akamaihd.net/v1/images/59cac0f608005900014903df-image_5d995848.jpeg?region=0%2C0%2C1536%2C864':'',posterSource:isFinal?'manual-official':'unknown',posterReferenceUrl:isFinal?'https://www.starwars.com/news/star-wars-rebels-season-four-key-art-revealed':official('star-wars-rebels'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/rebels-poster-post-catalog_ebbfc425.jpeg',officialUrl:official('star-wars-rebels')} as SeasonCatalogEntry;}),
  {seriesKey:'the-mandalorian',seasonNumber:1,title:'만달로리안 시즌 1',originalTitle:'The Mandalorian Season 1',type:'드라마',status:'archive',releaseDate:'2019-11-12',releasePrecision:'day',posterUrl:'',posterSource:'unknown',posterReferenceUrl:official('the-mandalorian'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/the-mandalorian-poster-post-catalog_1e7babb3.jpeg',officialUrl:official('the-mandalorian')},
  {seriesKey:'the-mandalorian',seasonNumber:2,title:'만달로리안 시즌 2',originalTitle:'The Mandalorian Season 2',type:'드라마',status:'archive',releaseDate:'2020-10-30',releasePrecision:'day',posterUrl:'',posterSource:'unknown',posterReferenceUrl:official('the-mandalorian'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/the-mandalorian-poster-post-catalog_1e7babb3.jpeg',officialUrl:official('the-mandalorian')},
  {seriesKey:'the-mandalorian',seasonNumber:3,title:'만달로리안 시즌 3',originalTitle:'The Mandalorian Season 3',type:'드라마',status:'archive',releaseDate:'2023-03-01',releasePrecision:'day',posterUrl:'',posterSource:'unknown',posterReferenceUrl:official('the-mandalorian'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/the-mandalorian-poster-post-catalog_1e7babb3.jpeg',officialUrl:official('the-mandalorian')},
  ...[['2021-05-04','스타워즈: 배드 배치 시즌 1','Star Wars: The Bad Batch Season 1'],['2023-01-04','스타워즈: 배드 배치 시즌 2','Star Wars: The Bad Batch Season 2'],['2024-02-21','스타워즈: 배드 배치 시즌 3','Star Wars: The Bad Batch Season 3']].map(([date,title,originalTitle],index)=>({seriesKey:'the-bad-batch',seasonNumber:index+1,title,originalTitle,type:'애니메이션',status:'archive',releaseDate:date,releasePrecision:'day',posterUrl:'',posterSource:'unknown',posterReferenceUrl:official('the-bad-batch'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/the-bad-batch-poster-post-catalog_31481d5a.jpeg',officialUrl:official('the-bad-batch')} as SeasonCatalogEntry)),
  {seriesKey:'andor',seasonNumber:1,title:'안도르 시즌 1',originalTitle:'Andor Season 1',type:'드라마',status:'archive',releaseDate:'2022-09-21',releasePrecision:'day',posterUrl:'https://lumiere-a.akamaihd.net/v1/images/andor-payoff-poster_73908645.jpeg?width=1136',posterSource:'manual-official',posterReferenceUrl:'https://www.starwars.com/andor-poster-gallery',fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/andor-season-2-series-poster-catalog_be46f85f.jpeg',officialUrl:official('andor')},
  {seriesKey:'andor',seasonNumber:2,title:'안도르 시즌 2',originalTitle:'Andor Season 2',type:'드라마',status:'archive',releaseDate:'2025-04-22',releasePrecision:'day',posterUrl:'https://lumiere-a.akamaihd.net/v1/images/andor-season-2-series-poster-catalog_be46f85f.jpeg',posterSource:'manual-official',posterReferenceUrl:official('andor'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/andor-season-2-series-poster-catalog_be46f85f.jpeg',officialUrl:official('andor')},
  {seriesKey:'ahsoka',seasonNumber:1,title:'아소카 시즌 1',originalTitle:'Ahsoka Season 1',type:'드라마',status:'archive',releaseDate:'2023-08-22',releasePrecision:'day',posterUrl:'',posterSource:'unknown',posterReferenceUrl:official('ahsoka'),fallbackPosterUrl:'https://lumiere-a.akamaihd.net/v1/images/ahsoka-poster-post-catalog_3617795e.jpeg',officialUrl:official('ahsoka')},
  {seriesKey:'ahsoka',seasonNumber:2,title:'아소카 시즌 2',originalTitle:'Ahsoka Season 2',type:'드라마',status:'upcoming',releaseDate:null,releasePrecision:'unknown',posterUrl:'',posterSource:'unknown',posterReferenceUrl:official('ahsoka'),fallbackPosterUrl:'',officialUrl:official('ahsoka')},
];

export const LEGACY_SERIES_ROWS=[
  {id:'clone-wars-series',seriesKey:'the-clone-wars',title:'스타워즈: 클론 전쟁',originalTitle:'Star Wars: The Clone Wars'},
  {id:'star-wars-rebels',seriesKey:'star-wars-rebels',title:'스타워즈 반란군',originalTitle:'Star Wars Rebels'},
] as const;
