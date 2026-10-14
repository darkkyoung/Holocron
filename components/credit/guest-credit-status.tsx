'use client';
import {useEffect,useRef,useState} from 'react';
import type {GuestCreditState} from '@/lib/credit/rewards/policy';
import {CREDIT_CHANGED,initializeGuestCredits} from './client';
import './guest-credit-status.css';

const DAYS=['월','화','수','목','금','토','일'];
export default function GuestCreditStatus(){
  const [state,setState]=useState<GuestCreditState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
  const details=useRef<HTMLDetailsElement>(null),summary=useRef<HTMLElement>(null);
  async function refresh(){
    setBusy(true);setError('');
    try{setState(await initializeGuestCredits(true));}catch(reason){setState(null);setError((reason as Error).message);}finally{setBusy(false);}
  }
  useEffect(()=>{
    if(!['/','/works','/quiz','/roadmap','/assistant','/credits'].includes(window.location.pathname))return;
    let active=true;
    const resolve=()=>{void initializeGuestCredits(true).then(value=>{if(active){setState(value);setError('');}}).catch(reason=>{if(active){setState(null);setError((reason as Error).message);}}).finally(()=>{if(active)setBusy(false);});};
    const changed=(event:Event)=>{setState((event as CustomEvent<GuestCreditState|null>).detail);setError((event as CustomEvent).detail?'':'Credit 상태를 다시 확인해 주세요.');};
    const visible=()=>{if(document.visibilityState==='visible')resolve();};
    window.addEventListener(CREDIT_CHANGED,changed);document.addEventListener('visibilitychange',visible);
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('holocron-credit'):null;
    if(channel)channel.onmessage=resolve;
    resolve();
    return ()=>{active=false;window.removeEventListener(CREDIT_CHANGED,changed);document.removeEventListener('visibilitychange',visible);channel?.close();};
  },[]);
  const earned=state?.rewards.reduce((sum,reward)=>sum+reward.applied,0)??0;
  const labels=state?.rewards.map(reward=>reward.reason==='first_visit'?'첫 방문':reward.reason==='opening'?'오픈 기념':`출석 DAY ${reward.streak}`).join(' · ');
  return <section className="guest-credit" aria-label="Guest Credit 및 주간 출석">
    <details ref={details} onKeyDown={event=>{if(event.key==='Escape'){details.current!.open=false;summary.current?.focus();}}}>
      <summary ref={summary}><strong>{state?`Guest ${state.balance} / 10 CR`:busy?'Guest Credit 확인 중…':'Guest Credit 확인 불가'}</strong><span>주간 출석 <span aria-hidden="true">⌄</span></span></summary>
      <div className="guest-credit-panel">
        {state?<><p>KST 월요일 시작 · 현재 <b>{state.attendance.streak}일 연속</b>{state.attendance.claimedToday?' · 오늘 출석 완료':''}</p>
          <ol className="guest-attendance">{state.attendance.days.map((day,index)=><li key={day.date} data-claimed={day.claimed||undefined} data-today={day.today||undefined}><span>{DAYS[index]}</span><b>{day.claimed?'✓':day.missed?'미출석':day.today?'오늘':'—'}</b><small>{day.date.slice(5).replace('-','/')}</small></li>)}</ol>
          <p>연속 DAY 1–6 +1 CR · DAY 7 <b>총 +5 CR</b><br/>하루를 놓치면 DAY 1부터 다시 시작합니다. 매주 월요일 초기화됩니다.</p>
          <p>Guest 최대 10 CR · 상한에 도달해도 출석과 보상 처리는 완료됩니다. 이 브라우저의 쿠키를 삭제하면 Guest Credit이 유지되지 않습니다.</p></>:<p>{error||'출석 정보를 확인하고 있습니다.'}</p>}
        <button type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'확인 중…':'상태 다시 확인'}</button>
      </div>
    </details>
    <p className="guest-credit-feedback" role="status">{error||((state?.rewards.length??0)>0?`${earned>0?`+${earned} CR`:'Guest 최대 10 CR · 보상 처리 완료'} · ${labels}`:'첫 방문·출석·퀴즈 정답으로 Credit을 모으세요.')}</p>
  </section>;
}
