export const WORK_TYPES=['영화','드라마','애니메이션','기타'] as const;
export const WORK_STATUSES=['upcoming','recent','archive'] as const;
export const RELEASE_PRECISIONS=['day','month','year','unknown'] as const;

export type WorkType=typeof WORK_TYPES[number];
export type WorkStatus=typeof WORK_STATUSES[number];
export type ReleasePrecision=typeof RELEASE_PRECISIONS[number];

export type Work={
  id:string;
  title:string;
  originalTitle:string;
  type:WorkType;
  status:WorkStatus;
  posterUrl:string;
  releaseDate:string|null;
  releasePrecision:ReleasePrecision;
  officialUrl:string|null;
  franchise:string;
  seriesKey?:string|null;
  seasonNumber?:number|null;
  tmdbMediaType?:'movie'|'tv'|null;
  tmdbId?:number|null;
  tmdbSeasonNumber?:number|null;
};

export type WorksByStatus=Record<WorkStatus,Work[]>;

export function isWorkType(value:unknown):value is WorkType{return typeof value==='string'&&(WORK_TYPES as readonly string[]).includes(value);}
export function isWorkStatus(value:unknown):value is WorkStatus{return typeof value==='string'&&(WORK_STATUSES as readonly string[]).includes(value);}
export function isReleasePrecision(value:unknown):value is ReleasePrecision{return typeof value==='string'&&(RELEASE_PRECISIONS as readonly string[]).includes(value);}

export function isReleaseDateForPrecision(value:string|null,precision:ReleasePrecision){
  if(precision==='unknown')return value===null;
  if(!value)return false;
  const expression=precision==='year'?/^\d{4}$/:precision==='month'?/^\d{4}-(0[1-9]|1[0-2])$/:/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if(!expression.test(value))return false;
  if(precision!=='day')return true;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

export function formatReleaseDate(date:string|null,precision:ReleasePrecision){
  if(!date||precision==='unknown')return '공개일 미정';
  const [year,month,day]=date.split('-');
  if(precision==='year')return `${year}년 공개`;
  if(precision==='month')return `${year}.${month} 공개`;
  return `${year}.${month}.${day}`;
}

function dateValue(work:Work){return work.releaseDate??'';}
function compareTitle(a:Work,b:Work){return a.title.localeCompare(b.title,'ko');}

export function orderWorks(status:WorkStatus,items:Work[]){
  return [...items].sort((a,b)=>{
    const aDate=dateValue(a);const bDate=dateValue(b);
    if(!aDate&&!bDate)return compareTitle(a,b);
    if(!aDate)return 1;
    if(!bDate)return -1;
    const direction=status==='upcoming'?1:-1;
    return aDate===bDate?compareTitle(a,b):aDate>bDate?direction:-direction;
  });
}

export function groupWorksByStatus(items:Work[]):WorksByStatus{
  return {upcoming:orderWorks('upcoming',items.filter(work=>work.status==='upcoming')),recent:orderWorks('recent',items.filter(work=>work.status==='recent')),archive:orderWorks('archive',items.filter(work=>work.status==='archive'))};
}
