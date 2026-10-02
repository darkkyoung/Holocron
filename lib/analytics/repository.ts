import {db} from '@/lib/news';
import {analyticsPeriodState,BETA_START_SETTING,QA_ANALYTICS_PERIOD,seoulDay,type AnalyticsScope,type PublicAnalyticsRoute} from './domain';
import type {AnalyticsReconciliation} from './reconciliation';

type AggregateRow={day:string;route:AnalyticsScope;pageViews:number;visits:number};
type StatsRow={rows:number;pageViews:number};

export async function getBetaAnalyticsStart(){
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(BETA_START_SETTING).first<{value:string}>();
  return row?.value??null;
}

export async function getAnalyticsPeriodState(now=new Date()){
  return analyticsPeriodState(await getBetaAnalyticsStart(),now);
}

export async function activeAnalyticsPeriod(now=new Date()){
  return (await getAnalyticsPeriodState(now)).period;
}

export async function recordPageView(route:PublicAnalyticsRoute,sessionHash:string,now:Date){
  const at=now.toISOString();
  const day=seoulDay(now);
  const scopes:AnalyticsScope[]=['all',route];
  await db().batch(scopes.map(scope=>db().prepare(`INSERT INTO beta_analytics_daily_sessions
    (period,day,route,session_hash,page_views,first_seen_at,last_seen_at)
    SELECT COALESCE((SELECT value FROM settings WHERE key=? AND value<=?),?),?,?,?,1,?,?
    ON CONFLICT(period,day,route,session_hash) DO UPDATE SET
      page_views=beta_analytics_daily_sessions.page_views+excluded.page_views,
      first_seen_at=MIN(beta_analytics_daily_sessions.first_seen_at,excluded.first_seen_at),
      last_seen_at=MAX(beta_analytics_daily_sessions.last_seen_at,excluded.last_seen_at)`)
    .bind(BETA_START_SETTING,at,QA_ANALYTICS_PERIOD,day,scope,sessionHash,at,at)));
}

export async function loadAnalyticsRows(period:string){
  const rows=await db().prepare(`SELECT day,route,SUM(page_views) AS pageViews,COUNT(*) AS visits
    FROM beta_analytics_daily_sessions WHERE period=? GROUP BY day,route ORDER BY day ASC`)
    .bind(period).all<AggregateRow>();
  return rows.results.map(row=>({...row,pageViews:Number(row.pageViews),visits:Number(row.visits)}));
}

function stats(result:{results?:unknown[]}){
  const row=(result.results?.[0]??{}) as Partial<StatsRow>;
  return {rows:Number(row.rows??0),pageViews:Number(row.pageViews??0)};
}

export async function reconcileBetaAnalyticsStart(newPeriod:string):Promise<AnalyticsReconciliation>{
  const oldPeriod=await getBetaAnalyticsStart();
  const totalStatement=()=>db().prepare('SELECT COUNT(*) AS rows,COALESCE(SUM(page_views),0) AS pageViews FROM beta_analytics_daily_sessions');
  if(oldPeriod===newPeriod){
    const total=stats(await totalStatement().all());
    return {qaToBetaRows:0,betaToQaRows:0,mergedRows:0,ambiguousRows:0,preservedPageViews:total.pageViews};
  }

  const statements=[];
  const beforeIndex=statements.push(totalStatement())-1;
  const qaToBetaIndex=statements.push(db().prepare('SELECT COUNT(*) AS rows,0 AS pageViews FROM beta_analytics_daily_sessions WHERE period=? AND first_seen_at>=?').bind(QA_ANALYTICS_PERIOD,newPeriod))-1;
  const betaToQaIndex=oldPeriod?statements.push(db().prepare('SELECT COUNT(*) AS rows,0 AS pageViews FROM beta_analytics_daily_sessions WHERE period=? AND last_seen_at<?').bind(oldPeriod,newPeriod))-1:null;
  const ambiguousIndex=statements.push(oldPeriod
    ?db().prepare('SELECT COUNT(*) AS rows,0 AS pageViews FROM beta_analytics_daily_sessions WHERE period IN (?,?) AND first_seen_at<? AND last_seen_at>=?').bind(QA_ANALYTICS_PERIOD,oldPeriod,newPeriod,newPeriod)
    :db().prepare('SELECT COUNT(*) AS rows,0 AS pageViews FROM beta_analytics_daily_sessions WHERE period=? AND first_seen_at<? AND last_seen_at>=?').bind(QA_ANALYTICS_PERIOD,newPeriod,newPeriod))-1;

  function move(source:string,target:string,predicate:string){
    statements.push(db().prepare(`INSERT INTO beta_analytics_daily_sessions
      (period,day,route,session_hash,page_views,first_seen_at,last_seen_at)
      SELECT ?,day,route,session_hash,page_views,first_seen_at,last_seen_at
      FROM beta_analytics_daily_sessions WHERE period=? AND ${predicate}
      ON CONFLICT(period,day,route,session_hash) DO UPDATE SET
        page_views=beta_analytics_daily_sessions.page_views+excluded.page_views,
        first_seen_at=MIN(beta_analytics_daily_sessions.first_seen_at,excluded.first_seen_at),
        last_seen_at=MAX(beta_analytics_daily_sessions.last_seen_at,excluded.last_seen_at)`).bind(target,source,newPeriod));
    statements.push(db().prepare(`DELETE FROM beta_analytics_daily_sessions WHERE period=? AND ${predicate}`).bind(source,newPeriod));
  }

  move(QA_ANALYTICS_PERIOD,newPeriod,'first_seen_at>=?');
  if(oldPeriod){
    move(oldPeriod,QA_ANALYTICS_PERIOD,'last_seen_at<?');
    move(oldPeriod,newPeriod,'last_seen_at>=?');
  }
  statements.push(db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(BETA_START_SETTING,newPeriod));
  const afterIndex=statements.push(totalStatement())-1;

  const results=await db().batch(statements);
  const before=stats(results[beforeIndex]);
  const after=stats(results[afterIndex]);
  if(before.pageViews!==after.pageViews)throw new Error('Analytics page-view reconciliation invariant failed.');
  return {
    qaToBetaRows:stats(results[qaToBetaIndex]).rows,
    betaToQaRows:betaToQaIndex===null?0:stats(results[betaToQaIndex]).rows,
    mergedRows:before.rows-after.rows,
    ambiguousRows:stats(results[ambiguousIndex]).rows,
    preservedPageViews:after.pageViews,
  };
}
