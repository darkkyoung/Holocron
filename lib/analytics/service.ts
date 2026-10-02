import {getAnalyticsPeriodState,loadAnalyticsRows,reconcileBetaAnalyticsStart} from './repository';
import {parseSeoulDateTime,previousDay,seoulDay,type AnalyticsMode,type AnalyticsScope} from './domain';
import type {AnalyticsReconciliation} from './reconciliation';

export type AnalyticsMetric={pageViews:number;visits:number};
export type AnalyticsDay=AnalyticsMetric&{day:string};
export type AnalyticsReport={mode:AnalyticsMode;startedAt:string|null;today:AnalyticsMetric;yesterday:AnalyticsMetric;total:AnalyticsMetric;news:AnalyticsMetric;works:AnalyticsMetric;quiz:AnalyticsMetric;daily:AnalyticsDay[]};
export type AnalyticsStartResult={report:AnalyticsReport;reconciliation:AnalyticsReconciliation};
const empty=():AnalyticsMetric=>({pageViews:0,visits:0});

export async function getAnalyticsReport(now=new Date()):Promise<AnalyticsReport>{
  const state=await getAnalyticsPeriodState(now);
  const rows=await loadAnalyticsRows(state.period);
  const metric=(route:AnalyticsScope,day?:string)=>rows.filter(row=>row.route===route&&(!day||row.day===day)).reduce((sum,row)=>({pageViews:sum.pageViews+row.pageViews,visits:sum.visits+row.visits}),empty());
  const todayDay=seoulDay(now);
  const yesterdayDay=previousDay(todayDay);
  return {
    mode:state.mode,startedAt:state.startedAt,
    today:metric('all',todayDay),yesterday:metric('all',yesterdayDay),total:metric('all'),news:metric('news'),works:metric('works'),quiz:metric('quiz'),
    daily:rows.filter(row=>row.route==='all').slice(-14).map(row=>({day:row.day,pageViews:row.pageViews,visits:row.visits})),
  };
}

export async function setBetaAnalyticsStart(date:unknown,time:unknown,now=new Date()):Promise<AnalyticsStartResult>{
  const startedAt=parseSeoulDateTime(date,time);
  const reconciliation=await reconcileBetaAnalyticsStart(startedAt);
  return {report:await getAnalyticsReport(now),reconciliation};
}
