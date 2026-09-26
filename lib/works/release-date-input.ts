import type {ReleasePrecision} from './types';

export type ReleaseDateParts={year:string;month:string;day:string};

export const emptyReleaseDateParts=():ReleaseDateParts=>({year:'',month:'',day:''});

export function parseReleaseDate(value:string|null|undefined):ReleaseDateParts {
  const [year='',month='',day='']=(value??'').split('-');
  return {year,month,day};
}

function padded(value:string){return value ? value.padStart(2,'0') : '';}

export function composeReleaseDate(parts:ReleaseDateParts,precision:ReleasePrecision):string {
  if(precision==='unknown')return '';
  if(precision==='year')return parts.year;
  if(precision==='month')return parts.year&&parts.month?`${parts.year}-${padded(parts.month)}`:'';
  return parts.year&&parts.month&&parts.day?`${parts.year}-${padded(parts.month)}-${padded(parts.day)}`:'';
}

export function isValidReleaseDateParts(parts:ReleaseDateParts,precision:ReleasePrecision):boolean {
  if(precision==='unknown')return true;
  if(!/^\d{4}$/.test(parts.year)||Number(parts.year)<1)return false;
  if(precision==='year')return true;
  if(!/^\d{1,2}$/.test(parts.month))return false;

  const year=Number(parts.year);
  const month=Number(parts.month);
  if(month<1||month>12)return false;
  if(precision==='month')return true;
  if(!/^\d{1,2}$/.test(parts.day))return false;

  const leapYear=year%4===0&&(year%100!==0||year%400===0);
  const daysPerMonth=[31,leapYear?29:28,31,30,31,30,31,31,30,31,30,31];
  const day=Number(parts.day);
  return day>=1&&day<=(daysPerMonth[month-1]??0);
}

export function sanitizeReleaseDatePart(value:string,maxLength:number){
  return value.replace(/\D/g,'').slice(0,maxLength);
}

export function partsForPrecisionChange(parts:ReleaseDateParts,precision:ReleasePrecision):ReleaseDateParts {
  if(precision==='unknown')return emptyReleaseDateParts();
  return {year:parts.year,month:precision==='month'||precision==='day'?parts.month:'',day:precision==='day'?parts.day:''};
}
