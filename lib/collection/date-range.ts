import {COLLECTION_WINDOW_MS,publicationDate} from './policy';
import type {Candidate} from './sources';

const DAY_MS=24*60*60*1000;
export const MAX_HISTORICAL_RANGE_DAYS=31;
export type HistoricalRange={start:string;end:string;days:number};

function strictDate(value:unknown){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const time=Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time)||new Date(time).toISOString().slice(0,10)!==value?null:{value,time};
}

export function parseHistoricalRange(startValue:unknown,endValue:unknown,now=Date.now()):HistoricalRange{
  const start=strictDate(startValue),end=strictDate(endValue);
  if(!start||!end)throw new Error('시작일과 종료일을 YYYY-MM-DD 형식으로 입력해 주세요.');
  if(end.time<start.time)throw new Error('종료일은 시작일보다 빠를 수 없습니다.');
  const days=Math.floor((end.time-start.time)/DAY_MS)+1;
  if(days>MAX_HISTORICAL_RANGE_DAYS)throw new Error(`한 번에 최대 ${MAX_HISTORICAL_RANGE_DAYS}일까지 복구할 수 있습니다.`);
  const today=new Date(now).toISOString().slice(0,10);
  const oldest=new Date(now-COLLECTION_WINDOW_MS).toISOString().slice(0,10);
  if(start.value<oldest||end.value>today)throw new Error(`현재 수집 정책 범위(${oldest} ~ ${today}) 안의 날짜를 입력해 주세요.`);
  return {start:start.value,end:end.value,days};
}

export function candidateDate(candidate:Pick<Candidate,'published'>,now=Date.now()){
  const date=publicationDate(candidate.published,now);
  return date.kind==='valid'?date.precision==='date'?date.value:new Date(date.value).toISOString().slice(0,10):'';
}

export function candidateInRange(candidate:Pick<Candidate,'published'|'discoveryDate'>,range:HistoricalRange,now=Date.now()){
  const date=candidateDate({published:candidate.published||candidate.discoveryDate||''},now);
  return !date||(date>=range.start&&date<=range.end);
}
