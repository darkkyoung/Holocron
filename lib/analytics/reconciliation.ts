import {QA_ANALYTICS_PERIOD} from './domain';

export type AnalyticsSessionRow={period:string;day:string;route:string;sessionHash:string;pageViews:number;firstSeenAt:string;lastSeenAt:string};
export type AnalyticsReconciliation={qaToBetaRows:number;betaToQaRows:number;mergedRows:number;ambiguousRows:number;preservedPageViews:number};

function key(row:AnalyticsSessionRow){return [row.period,row.day,row.route,row.sessionHash].join('\u0000');}

export function targetAnalyticsPeriod(row:AnalyticsSessionRow,oldPeriod:string|null,newPeriod:string){
  if(row.period!==QA_ANALYTICS_PERIOD&&row.period!==oldPeriod)return row.period;
  if(row.lastSeenAt<newPeriod)return QA_ANALYTICS_PERIOD;
  if(row.firstSeenAt>=newPeriod)return newPeriod;
  return row.period===QA_ANALYTICS_PERIOD?QA_ANALYTICS_PERIOD:newPeriod;
}

export function reconcileAnalyticsRows(rows:AnalyticsSessionRow[],oldPeriod:string|null,newPeriod:string){
  const beforePageViews=rows.reduce((sum,row)=>sum+row.pageViews,0);
  if(oldPeriod===newPeriod)return {rows:rows.map(row=>({...row})),report:{qaToBetaRows:0,betaToQaRows:0,mergedRows:0,ambiguousRows:0,preservedPageViews:beforePageViews}};
  const merged=new Map<string,AnalyticsSessionRow>();
  let qaToBetaRows=0;
  let betaToQaRows=0;
  let ambiguousRows=0;
  for(const source of rows){
    const targeted=source.period===QA_ANALYTICS_PERIOD||source.period===oldPeriod;
    const ambiguous=targeted&&source.firstSeenAt<newPeriod&&source.lastSeenAt>=newPeriod;
    if(ambiguous)ambiguousRows++;
    const period=targetAnalyticsPeriod(source,oldPeriod,newPeriod);
    if(source.period===QA_ANALYTICS_PERIOD&&period===newPeriod)qaToBetaRows++;
    if(oldPeriod&&source.period===oldPeriod&&period===QA_ANALYTICS_PERIOD)betaToQaRows++;
    const row={...source,period};
    const existing=merged.get(key(row));
    if(existing){
      existing.pageViews+=row.pageViews;
      if(row.firstSeenAt<existing.firstSeenAt)existing.firstSeenAt=row.firstSeenAt;
      if(row.lastSeenAt>existing.lastSeenAt)existing.lastSeenAt=row.lastSeenAt;
    }else merged.set(key(row),row);
  }
  const result=[...merged.values()];
  const preservedPageViews=result.reduce((sum,row)=>sum+row.pageViews,0);
  if(preservedPageViews!==beforePageViews)throw new Error('Analytics page-view reconciliation invariant failed.');
  return {rows:result,report:{qaToBetaRows,betaToQaRows,mergedRows:rows.length-result.length,ambiguousRows,preservedPageViews}};
}
