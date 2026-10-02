export type PublicAnalyticsRoute='news'|'works'|'quiz';
export type AnalyticsScope='all'|PublicAnalyticsRoute;
export type AnalyticsMode='qa'|'scheduled'|'beta';
export const QA_ANALYTICS_PERIOD='qa';
export const BETA_START_SETTING='beta_analytics_start_at';
export const SEOUL_TIME_ZONE='Asia/Seoul';
export class AnalyticsInputError extends Error{}

export function parseAnalyticsRoute(value:unknown):PublicAnalyticsRoute{
  if(value==='news'||value==='works'||value==='quiz')return value;
  throw new Error('지원하지 않는 페이지입니다.');
}

export function seoulDay(value:Date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:SEOUL_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
}

export function previousDay(day:string){
  const date=new Date(`${day}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate()-1);
  return seoulDay(date);
}

export function parseSeoulDateTime(date:unknown,time:unknown){
  if(typeof date!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(date))throw new AnalyticsInputError('날짜를 YYYY-MM-DD 형식으로 입력해 주세요.');
  if(typeof time!=='string'||!/^(\d{2}):(\d{2})$/.test(time))throw new AnalyticsInputError('시간을 HH:mm 형식으로 입력해 주세요.');
  const [,yearText,monthText,dayText]=date.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
  const [,hourText,minuteText]=time.match(/^(\d{2}):(\d{2})$/)!;
  const [year,month,day,hour,minute]=[yearText,monthText,dayText,hourText,minuteText].map(Number);
  if(month<1||month>12||hour>23||minute>59)throw new AnalyticsInputError('유효한 날짜와 시간을 입력해 주세요.');
  const parsed=new Date(Date.UTC(year,month-1,day,hour-9,minute));
  const fields=seoulDateTimeFields(parsed);
  if(fields.date!==date||fields.time!==time)throw new AnalyticsInputError('유효한 날짜와 시간을 입력해 주세요.');
  return parsed.toISOString();
}

export function seoulDateTimeFields(value:Date|string){
  const date=typeof value==='string'?new Date(value):value;
  if(Number.isNaN(date.getTime()))throw new Error('베타 측정 기준 시각을 확인해 주세요.');
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:SEOUL_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(value=>value.type===type)?.value??'';
  return {date:`${part('year')}-${part('month')}-${part('day')}`,time:`${part('hour')}:${part('minute')}`};
}

export function analyticsPeriodState(startedAt:string|null,now:Date){
  if(!startedAt)return {mode:'qa' as const,period:QA_ANALYTICS_PERIOD,startedAt:null};
  const startTime=new Date(startedAt).getTime();
  if(Number.isNaN(startTime))throw new Error('저장된 베타 측정 기준 시각을 확인해 주세요.');
  if(now.getTime()<startTime)return {mode:'scheduled' as const,period:QA_ANALYTICS_PERIOD,startedAt};
  return {mode:'beta' as const,period:startedAt,startedAt};
}
