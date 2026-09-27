export type PublicAnalyticsRoute='news'|'works';
export type AnalyticsScope='all'|PublicAnalyticsRoute;
export const QA_ANALYTICS_PERIOD='qa';
export const BETA_START_SETTING='beta_analytics_start_at';

export function parseAnalyticsRoute(value:unknown):PublicAnalyticsRoute{
  if(value==='news'||value==='works')return value;
  throw new Error('지원하지 않는 페이지입니다.');
}

export function seoulDay(value:Date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
}

export function previousDay(day:string){
  const date=new Date(`${day}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate()-1);
  return seoulDay(date);
}
