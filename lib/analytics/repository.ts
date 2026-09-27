import {db,setting} from '@/lib/news';
import {BETA_START_SETTING,QA_ANALYTICS_PERIOD,type AnalyticsScope,type PublicAnalyticsRoute} from './domain';

type AggregateRow={day:string;route:AnalyticsScope;pageViews:number;visits:number};

export async function activeAnalyticsPeriod(){
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(BETA_START_SETTING).first<{value:string}>();
  return row?.value??QA_ANALYTICS_PERIOD;
}

export async function recordPageView(route:PublicAnalyticsRoute,sessionHash:string,now:Date){
  const period=await activeAnalyticsPeriod();
  const at=now.toISOString();
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const scopes:AnalyticsScope[]=['all',route];
  await db().batch(scopes.map(scope=>db().prepare(`INSERT INTO beta_analytics_daily_sessions
    (period,day,route,session_hash,page_views,first_seen_at,last_seen_at) VALUES (?,?,?,?,1,?,?)
    ON CONFLICT(period,day,route,session_hash) DO UPDATE SET page_views=page_views+1,last_seen_at=excluded.last_seen_at`)
    .bind(period,day,scope,sessionHash,at,at)));
}

export async function loadAnalyticsRows(period:string){
  const rows=await db().prepare(`SELECT day,route,SUM(page_views) AS pageViews,COUNT(*) AS visits
    FROM beta_analytics_daily_sessions WHERE period=? GROUP BY day,route ORDER BY day ASC`)
    .bind(period).all<AggregateRow>();
  return rows.results.map(row=>({...row,pageViews:Number(row.pageViews),visits:Number(row.visits)}));
}

export async function startBetaAnalytics(now:Date){
  const value=now.toISOString();
  await setting(BETA_START_SETTING,value);
  return value;
}
