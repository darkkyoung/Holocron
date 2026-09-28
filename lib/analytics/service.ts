import {activeAnalyticsPeriod,loadAnalyticsRows,startBetaAnalytics as persistBetaStart} from './repository';
import {previousDay,seoulDay,type AnalyticsScope} from './domain';

export type AnalyticsMetric={pageViews:number;visits:number};
export type AnalyticsDay=AnalyticsMetric&{day:string};
export type AnalyticsReport={mode:'qa'|'beta';startedAt:string|null;today:AnalyticsMetric;yesterday:AnalyticsMetric;total:AnalyticsMetric;news:AnalyticsMetric;works:AnalyticsMetric;quiz:AnalyticsMetric;daily:AnalyticsDay[]};
const empty=():AnalyticsMetric=>({pageViews:0,visits:0});

export async function getAnalyticsReport(now=new Date()):Promise<AnalyticsReport>{
  const period=await activeAnalyticsPeriod();
  const rows=await loadAnalyticsRows(period);
  const metric=(route:AnalyticsScope,day?:string)=>rows.filter(row=>row.route===route&&(!day||row.day===day)).reduce((sum,row)=>({pageViews:sum.pageViews+row.pageViews,visits:sum.visits+row.visits}),empty());
  const todayDay=seoulDay(now);
  const yesterdayDay=previousDay(todayDay);
  return {
    mode:period==='qa'?'qa':'beta',startedAt:period==='qa'?null:period,
    today:metric('all',todayDay),yesterday:metric('all',yesterdayDay),total:metric('all'),news:metric('news'),works:metric('works'),quiz:metric('quiz'),
    daily:rows.filter(row=>row.route==='all').slice(-14).map(row=>({day:row.day,pageViews:row.pageViews,visits:row.visits})),
  };
}

export async function startBetaAnalytics(now=new Date()){
  await persistBetaStart(now);
  return getAnalyticsReport(now);
}
