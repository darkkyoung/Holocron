'use client';

import {useState} from 'react';
import {Header} from '@/app/newsroom';
import {SEOUL_TIME_ZONE,seoulDateTimeFields} from '@/lib/analytics/domain';
import type {AnalyticsMetric,AnalyticsReport,AnalyticsStartResult} from '@/lib/analytics/service';
import type {AnalyticsReconciliation} from '@/lib/analytics/reconciliation';

function Metric({label,value}:{label:string;value:AnalyticsMetric}){
  return <article className="analytics-metric"><small>{label}</small><strong>{value.pageViews.toLocaleString('ko-KR')}</strong><span>page views</span><b>{value.visits.toLocaleString('ko-KR')} 방문</b></article>;
}

function startLabel(startedAt:string){return new Intl.DateTimeFormat('ko-KR',{timeZone:SEOUL_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(startedAt));}
function inputLabel(date:string,time:string){const [year,month,day]=date.split('-');return `${year}년 ${Number(month)}월 ${Number(day)}일 ${time} KST`;}
function ReconciliationResult({result,startedAt}:{result:AnalyticsReconciliation;startedAt:string}){
  return <section className="analytics-reconciliation" role="status"><div><strong>베타 측정 기준 변경 완료</strong><span>기준: {startLabel(startedAt)} KST</span><span>기존 통계 데이터는 삭제하지 않았습니다.</span><span>경계 시각을 걸친 세션 {result.ambiguousRows.toLocaleString('ko-KR')}건은 기존 분류를 유지했습니다.</span></div><dl><div><dt>QA → Beta</dt><dd>{result.qaToBetaRows.toLocaleString('ko-KR')} rows</dd></div><div><dt>Beta → QA</dt><dd>{result.betaToQaRows.toLocaleString('ko-KR')} rows</dd></div><div><dt>병합</dt><dd>{result.mergedRows.toLocaleString('ko-KR')} rows</dd></div><div><dt>경계 세션</dt><dd>{result.ambiguousRows.toLocaleString('ko-KR')} rows</dd></div><div><dt>보존된 page views</dt><dd>{result.preservedPageViews.toLocaleString('ko-KR')}</dd></div></dl></section>;
}

export default function AnalyticsDashboard({initialReport}:{initialReport:AnalyticsReport}){
  const [report,setReport]=useState(initialReport);
  const [pending,setPending]=useState<{date:string;time:string}|null>(null);
  const [result,setResult]=useState<AnalyticsReconciliation|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const initialFields=report.startedAt?seoulDateTimeFields(report.startedAt):{date:'',time:''};
  async function apply(){
    if(!pending)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'set-beta-start',date:pending.date,time:pending.time})});
      const data=await response.json() as AnalyticsStartResult&{error?:string};
      if(!response.ok)throw new Error(data.error??'베타 측정 기준을 저장하지 못했습니다.');
      setReport(data.report);setResult(data.reconciliation);setPending(null);
    }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  return <><Header admin/><main className="shell analytics-shell">
    <section className="analytics-heading"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / BETA ANALYTICS</div><h1>Beta <span>Analytics</span></h1><p>개인을 식별하지 않는 익명 브라우저·일자별 집계입니다.</p></div><nav aria-label="관리자 화면 이동"><a href="/admin">뉴스 관리</a><a href="/admin/works">작품 관리</a></nav></section>
    <section className="analytics-period" data-mode={report.mode}><div><strong>{report.mode==='beta'?'PUBLIC BETA':report.mode==='scheduled'?'BETA SCHEDULED':'QA MODE'}</strong><span>{report.mode==='qa'?'베타 시작 기준이 설정되지 않았습니다.':report.mode==='scheduled'&&report.startedAt?`측정 시작 예정 ${startLabel(report.startedAt)} KST`:report.startedAt?`측정 시작 ${startLabel(report.startedAt)} KST`:''}</span></div></section>
    <form className="analytics-start-setting" key={report.startedAt??'unset'} onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);setError('');setResult(null);setPending({date:String(form.get('date')??''),time:String(form.get('time')??'')});}}><div><strong>베타 측정 기준</strong><p>베타 통계의 공식 시작 날짜와 시간을 지정합니다. 과거 시각은 기존 집계를 가능한 범위에서 재분류하며, 미래 시각까지는 QA로 기록합니다.</p><b>기존 통계 데이터는 삭제하지 않습니다.</b></div><div className="analytics-start-fields"><label>날짜<input type="date" name="date" defaultValue={initialFields.date} required/></label><label>시간<input type="time" name="time" defaultValue={initialFields.time} required/></label><span>Asia/Seoul (KST)</span><button type="submit">{report.startedAt?'시작 시각 변경':'기준 적용'}</button></div></form>
    {pending&&<section className="analytics-confirm" role="alert"><div><strong>베타 통계 시작 기준을<br/>{inputLabel(pending.date,pending.time)}로 설정하시겠습니까?</strong><p>과거 시각을 지정하면 기존 QA/Beta 데이터를 새 기준에 맞게 재분류합니다. 경계 시각을 걸친 세션은 기존 분류를 보존합니다.</p></div><div><button type="button" className="secondary" disabled={busy} onClick={()=>setPending(null)}>취소</button><button type="button" disabled={busy} onClick={()=>void apply()}>{busy?'적용 중…':'적용'}</button></div></section>}
    {error&&<p className="admin-message" role="alert">{error}</p>}
    {result&&report.startedAt&&<ReconciliationResult result={result} startedAt={report.startedAt}/>}
    <section className="analytics-grid" aria-label="베타 분석 요약"><Metric label="TODAY" value={report.today}/><Metric label="YESTERDAY" value={report.yesterday}/><Metric label="PERIOD TOTAL" value={report.total}/><Metric label="NEWS ARCHIVE" value={report.news}/><Metric label="WORKS ARCHIVE" value={report.works}/><Metric label="DAILY QUIZ" value={report.quiz}/></section>
    <section className="analytics-daily"><div className="section-label"><h2>최근 일별 추이 <span>DAILY TRAFFIC</span></h2><span>최대 14일</span></div>{report.daily.length?<div className="analytics-table-wrap"><table><thead><tr><th>날짜</th><th>Page views</th><th>방문</th></tr></thead><tbody>{[...report.daily].reverse().map(row=><tr key={row.day}><td>{row.day}</td><td>{row.pageViews.toLocaleString('ko-KR')}</td><td>{row.visits.toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div>:<div className="empty">현재 기간에 기록된 방문이 없습니다.</div>}</section>
    <p className="analytics-note">방문은 같은 익명 브라우저가 같은 날 해당 범위를 처음 연 경우 1회로 계산합니다. 사람 단위의 정확한 unique visitor 수를 의미하지 않습니다.</p>
  </main></>;
}
