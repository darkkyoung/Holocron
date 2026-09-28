'use client';

import {useState} from 'react';
import {Header} from '@/app/newsroom';
import type {AnalyticsMetric,AnalyticsReport} from '@/lib/analytics/service';

function Metric({label,value}:{label:string;value:AnalyticsMetric}){
  return <article className="analytics-metric"><small>{label}</small><strong>{value.pageViews.toLocaleString('ko-KR')}</strong><span>page views</span><b>{value.visits.toLocaleString('ko-KR')} 방문</b></article>;
}

export default function AnalyticsDashboard({initialReport}:{initialReport:AnalyticsReport}){
  const [report,setReport]=useState(initialReport);
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function start(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start-beta'})});
      const data=await response.json() as AnalyticsReport&{error?:string};
      if(!response.ok)throw new Error(data.error??'베타 측정 기준을 저장하지 못했습니다.');
      setReport(data);setConfirming(false);
    }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  return <><Header admin/><main className="shell analytics-shell">
    <section className="analytics-heading"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / BETA ANALYTICS</div><h1>Beta <span>Analytics</span></h1><p>개인을 식별하지 않는 익명 브라우저·일자별 집계입니다.</p></div><nav aria-label="관리자 화면 이동"><a href="/admin">뉴스 관리</a><a href="/admin/works">작품 관리</a></nav></section>
    <section className="analytics-period" data-mode={report.mode}><div><strong>{report.mode==='beta'?'PUBLIC BETA':'QA MODE'}</strong><span>{report.mode==='beta'&&report.startedAt?`측정 시작 ${new Date(report.startedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}`:'현재 트래픽은 QA 기간으로 분리 집계됩니다.'}</span></div>{report.mode==='qa'&&!confirming&&<button type="button" onClick={()=>setConfirming(true)}>베타 측정 시작</button>}</section>
    {confirming&&<section className="analytics-confirm" role="alert"><div><strong>지금부터 새 베타 기간을 시작할까요?</strong><p>기존 QA 수치는 삭제하지 않고, 이후 방문부터 별도 기간으로 집계합니다.</p></div><div><button type="button" className="secondary" disabled={busy} onClick={()=>setConfirming(false)}>취소</button><button type="button" disabled={busy} onClick={()=>void start()}>{busy?'저장 중…':'측정 시작'}</button></div></section>}
    {error&&<p className="admin-message" role="alert">{error}</p>}
    <section className="analytics-grid" aria-label="베타 분석 요약"><Metric label="TODAY" value={report.today}/><Metric label="YESTERDAY" value={report.yesterday}/><Metric label="PERIOD TOTAL" value={report.total}/><Metric label="NEWS ARCHIVE" value={report.news}/><Metric label="WORKS ARCHIVE" value={report.works}/><Metric label="DAILY QUIZ" value={report.quiz}/></section>
    <section className="analytics-daily"><div className="section-label"><h2>최근 일별 추이 <span>DAILY TRAFFIC</span></h2><span>최대 14일</span></div>{report.daily.length?<div className="analytics-table-wrap"><table><thead><tr><th>날짜</th><th>Page views</th><th>방문</th></tr></thead><tbody>{[...report.daily].reverse().map(row=><tr key={row.day}><td>{row.day}</td><td>{row.pageViews.toLocaleString('ko-KR')}</td><td>{row.visits.toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div>:<div className="empty">현재 기간에 기록된 방문이 없습니다.</div>}</section>
    <p className="analytics-note">방문은 같은 익명 브라우저가 같은 날 해당 범위를 처음 연 경우 1회로 계산합니다. 사람 단위의 정확한 unique visitor 수를 의미하지 않습니다.</p>
  </main></>;
}
