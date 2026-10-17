'use client';
import {useEffect,useRef,useState} from 'react';
import type {GuestCreditState} from '@/lib/credit/rewards/policy';
import {CREDIT_CHANGED,initializeGuestCredits,logoutAccount} from './client';
import './guest-credit-status.css';

const DAYS=['월','화','수','목','금','토','일'];
export default function GuestCreditStatus(){
  const [state,setState]=useState<GuestCreditState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[loginError,setLoginError]=useState('');
  const details=useRef<HTMLDetailsElement>(null),summary=useRef<HTMLElement>(null),loginDetails=useRef<HTMLDetailsElement>(null),loginSummary=useRef<HTMLElement>(null);
  function closePanels(){details.current?.removeAttribute('open');loginDetails.current?.removeAttribute('open');}
  async function refresh(){
    setBusy(true);setError('');
    try{setState(await initializeGuestCredits(true));}catch(reason){setState(null);setError((reason as Error).message);}finally{setBusy(false);}
  }
  useEffect(()=>{
    if(!['/','/works','/quiz','/roadmap','/assistant','/credits'].includes(window.location.pathname))return;
    const login=new URLSearchParams(window.location.search).get('login');
    let active=true,handledLogin=false;
    const showLoginError=()=>{if(!handledLogin&&(login==='failed'||login==='unavailable')){handledLogin=true;setLoginError('Google 로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');loginDetails.current?.setAttribute('open','');window.history.replaceState(null,'',window.location.pathname);}};
    const resolve=()=>{void initializeGuestCredits(true).then(value=>{if(active){setState(value);setError('');if(value.loginNotice)loginDetails.current?.setAttribute('open','');showLoginError();}}).catch(reason=>{if(active){setState(null);setError((reason as Error).message);showLoginError();}}).finally(()=>{if(active)setBusy(false);});};
    const changed=(event:Event)=>{setState((event as CustomEvent<GuestCreditState|null>).detail);setError((event as CustomEvent).detail?'':'Credit 상태를 다시 확인해 주세요.');};
    const visible=()=>{if(document.visibilityState==='visible')resolve();};
    window.addEventListener(CREDIT_CHANGED,changed);document.addEventListener('visibilitychange',visible);
    window.addEventListener('holocron-news-search-open',closePanels);
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('holocron-credit'):null;
    if(channel)channel.onmessage=resolve;
    resolve();
    return ()=>{active=false;window.removeEventListener(CREDIT_CHANGED,changed);document.removeEventListener('visibilitychange',visible);window.removeEventListener('holocron-news-search-open',closePanels);channel?.close();};
  },[]);
  const earned=state?.rewards.reduce((sum,reward)=>sum+reward.applied,0)??0;
  const labels=state?.rewards.map(reward=>reward.reason==='first_visit'?'첫 방문':reward.reason==='opening'?'오픈 기념':`출석 DAY ${reward.streak}`).join(' · ');
  return <section className="guest-credit" aria-label="Credit 및 계정">
    <div className="credit-top-actions"><details className="credit-balance" ref={details} onToggle={event=>{if(event.currentTarget.open){loginDetails.current?.removeAttribute('open');window.dispatchEvent(new Event('holocron-header-panel-open'));}}} onKeyDown={event=>{if(event.key==='Escape'){details.current!.open=false;summary.current?.focus();}}}>
      <summary ref={summary}><strong><span className="credit-desktop-label">{state?(state.ownerType==='account'?`Account ${state.balance} CR`:`Guest ${state.balance} / 10 CR`):busy?'Credit 확인 중…':'Credit 확인 불가'}</span><span className="credit-mobile-label">{state?`${state.balance.toLocaleString('ko-KR')} CR`:busy?'확인 중':'확인 불가'}</span></strong><span>주간 출석 <span aria-hidden="true">⌄</span></span></summary>
      <div className="guest-credit-panel">
        <div className="credit-panel-heading"><h2>크레딧 모으는 방법</h2><button type="button" aria-label="크레딧 안내 닫기" onClick={()=>{details.current!.open=false;summary.current?.focus();}}>닫기</button></div>
        <ul className="credit-guide">
          <li>Guest 첫 방문 <b>+1 CR</b> · Guest당 최초 한 번</li>
          <li>오픈 기념 <b>+1 CR</b> · 최초 한 번, 매일 지급되지 않음</li>
          <li>주간 연속 출석 DAY 1–6 <b>하루 +1 CR</b>, DAY 7 <b>그날 총 +5 CR</b> · 주간 최대 11 CR</li>
          <li>Daily Quiz <b>첫 제출이 정답이면 +3 CR</b> · 첫 제출 오답은 0 CR, 나중에 정답으로 바꿔도 보상 없음</li>
          <li>Google 계정 <b>첫 로그인 +3 CR</b> · Account당 최초 한 번</li>
        </ul>
        <p>KST 월요일부터 일요일까지 연속 출석합니다. 하루를 놓치면 DAY 1부터 다시 시작하며 소급 지급은 없습니다.</p>
        <p>{state?.ownerType==='account'?'Account에는 상품 정책상 잔액 상한이 없습니다.':'Guest는 최대 10 CR까지 보유합니다. 예를 들어 9 CR에서 +3 CR 보상은 1 CR만 반영되고 해당 보상 기회는 처리됩니다.'} Credit은 현금·구매·송금·환전 대상이 아니며 뉴스와 작품 열람은 무료입니다.</p>
        {state?<><p>KST 월요일 시작 · 현재 <b>{state.attendance.streak}일 연속</b>{state.attendance.claimedToday?' · 오늘 출석 완료':''}</p>
          <ol className="guest-attendance">{state.attendance.days.map((day,index)=><li key={day.date} data-claimed={day.claimed||undefined} data-today={day.today||undefined}><span>{DAYS[index]}</span><b>{day.claimed?'✓':day.missed?'미출석':day.today?'오늘':'—'}</b><small>{day.date.slice(5).replace('-','/')}</small></li>)}</ol>
          {state.ownerType==='account'?<p>Google 계정 로그인됨 · Account Credit은 다른 기기에서도 이어집니다.</p>:<p>Guest 최대 10 CR · 상한에 도달해도 출석과 보상 처리는 완료됩니다. 이 브라우저의 쿠키를 삭제하면 Guest Credit이 유지되지 않습니다.</p>}</>:<p>{error||'출석 정보를 확인하고 있습니다.'}</p>}
        <div className="credit-account-actions">{state?.ownerType==='account'?<button type="button" disabled={busy} onClick={()=>{setBusy(true);void logoutAccount().catch(reason=>{setError((reason as Error).message);setBusy(false);});}}>로그아웃</button>:<a href="/api/auth/google/start">Google 로그인</a>}</div>
        {loginError&&<p role="alert">{loginError}</p>}
        <button type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'확인 중…':'상태 다시 확인'}</button>
      </div>
    </details><details className="credit-login" ref={loginDetails} onToggle={event=>{if(event.currentTarget.open){details.current?.removeAttribute('open');window.dispatchEvent(new Event('holocron-header-panel-open'));}}} onKeyDown={event=>{if(event.key==='Escape'){loginDetails.current!.open=false;loginSummary.current?.focus();}}}>
      <summary ref={loginSummary}>{state?.ownerType==='account'?'계정':busy?'확인 중':state?'로그인':'계정 확인'}</summary>
      <div className="credit-login-panel"><div className="credit-panel-heading"><h2>{state?.ownerType==='account'?'계정':'로그인'}</h2><button type="button" aria-label="로그인 패널 닫기" onClick={()=>{loginDetails.current!.open=false;loginSummary.current?.focus();}}>닫기</button></div>
        {state?.ownerType==='account'?<><p>Google 계정 로그인됨 · Account Credit은 다른 기기에서도 이어집니다.</p>{state.loginNotice&&<p role="status">{state.loginNotice.status==='already_migrated'?'이 계정은 이미 Guest Credit 이전을 완료했습니다.':state.loginNotice.status==='migrated'?`Guest ${state.loginNotice.migrated} CR을 이전했습니다.`:'Guest 이전 기회가 처리되었습니다.'}{state.loginNotice.firstLogin>0?' · 첫 로그인 +3 CR':''}</p>}<button type="button" disabled={busy} onClick={()=>{setBusy(true);void logoutAccount().catch(reason=>{setError((reason as Error).message);setBusy(false);});}}>로그아웃</button></>:<><p>Google 계정으로 로그인하면 Account Credit을 다른 기기에서도 이어서 사용할 수 있습니다. 첫 로그인 +3 CR은 Account당 한 번 지급됩니다.</p><p>현재 Guest Credit은 이 Account의 첫 로그인 때 한 번만 이전할 수 있습니다. 이후 다른 Guest 잔액이 계속 합쳐지지는 않습니다.</p>{state?<a href="/api/auth/google/start">Google 로그인</a>:<p>{error||'Credit 상태를 확인하고 있습니다.'}</p>}</>}
        {loginError&&<p role="alert">{loginError}</p>}{error&&state?.ownerType==='account'&&<p role="alert">{error}</p>}
      </div>
    </details></div>
{state?.loginNotice&&<p role="status">{state.loginNotice.status==='already_migrated'?`이 계정은 이미 게스트 크레딧 이전을 완료했습니다. 현재 브라우저의 Guest ${state.loginNotice.guestBalance} CR은 계정에 합산되지 않았습니다.`:state.loginNotice.status==='migrated'?`Guest ${state.loginNotice.migrated} CR을 계정으로 이전했습니다.`:'Guest 이전 기회가 처리되었습니다.'}{state.loginNotice.firstLogin>0?' · 최초 로그인 +3 CR':''}</p>}
    <p className="guest-credit-feedback" role="status">{error||((state?.rewards.length??0)>0?`${earned>0?`+${earned} CR`:'Guest 최대 10 CR · 보상 처리 완료'} · ${labels}`:'첫 방문·출석·퀴즈 정답으로 Credit을 모으세요.')}</p>
  </section>;
}
