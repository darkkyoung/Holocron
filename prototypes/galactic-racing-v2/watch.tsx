import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createScene} from './scene';
import {meetingAt,cameraAt} from '../../lib/racing/v2/playback';
import type {Meeting} from '../../lib/racing/v2/types';
import './watch.css';

type Segment='qualifying'|'race'|'ceremony';
const formatTime=(ms:number)=>Number.isFinite(ms)
 ?String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')
 :'—';
const formatLap=(ms:number|null)=>ms===null||!Number.isFinite(ms)?'—':String(Math.floor(ms/60000))+':'+(ms%60000/1000).toFixed(3).padStart(6,'0');
const segmentLabels:Record<Segment,string>={qualifying:'퀄리파잉',race:'본경기',ceremony:'시상식'};
const eventLabels:Record<string,string>={
 START:'출발',SLIPSTREAM:'드래프트 추월',BOOST:'부스트',SHORTCUT:'지름길',
 SHORTCUT_FAIL:'지름길 실패',MINOR:'가벼운 충격',MEDIUM:'접촉 · 스핀',
 MAJOR:'대형 사고',EXTERNAL:'외부 방해',PENALTY:'타임 페널티',
 DNF:'리타이어',DSQ:'실격',ULTIMATE:'ULTIMATE',LEAD:'선두 변경',FINISH:'결승선 통과',
};
const hazardLabels:Record<number,string>={1:'트랙 파편 충격',2:'자기 펄스 교란',3:'외부 방해 공격'};
function segmentBounds(m:Meeting,segment:Segment){
 if(segment==='qualifying')return {start:0,end:m.qualifying.durationMs};
 if(segment==='race')return {start:m.raceStartMs,end:m.ceremonyStartMs};
 return {start:m.ceremonyStartMs,end:m.durationMs};
}
function App(){
 const [meeting,setMeeting]=useState<Meeting|null>(null);
 const [error,setError]=useState('');
 const [ms,setMs]=useState(0);
 const [segment,setSegment]=useState<Segment>('race');
 const [playing,setPlaying]=useState(false);
 const [rate,setRate]=useState(2);
 const [manual,setManual]=useState<string|null>(null);
 const [special,setSpecial]=useState(false);
 const [digest,setDigest]=useState('');
 const [fullscreen,setFullscreen]=useState(false);
 const player=useRef<HTMLDivElement>(null);
 const host=useRef<HTMLDivElement>(null);
 const engine=useRef<ReturnType<typeof createScene>|null>(null);
 const frame=useRef(0),clock=useRef(0),playhead=useRef(0);

 useEffect(()=>{
  const abort=new AbortController();
  setError('');
  fetch(special?'/special.json':'/race.json',{signal:abort.signal}).then(async response=>{
   if(!response.ok)throw Error('레이스 기록을 불러오지 못했습니다.');
   const bytes=await response.arrayBuffer();
   const calculated=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
     value=>value.toString(16).padStart(2,'0')).join('');
   const header=response.headers.get('X-Race-SHA256');
   if(header&&header!==calculated)throw Error('레이스 기록의 무결성을 확인하지 못했습니다.');
   const value=JSON.parse(new TextDecoder().decode(bytes)) as Meeting;
   if(!value.race||!value.qualifying||!value.official)throw Error('레이스 형식이 올바르지 않습니다.');
   setMeeting(value);setDigest(calculated);setSegment('race');setMs(value.raceStartMs);setPlaying(false);setManual(null);
  }).catch(cause=>{if(!abort.signal.aborted)setError(cause instanceof Error?cause.message:'레이스 데이터 오류');});
  return()=>abort.abort();
 },[special]);

 useEffect(()=>{
  if(!meeting||!host.current)return;
  let mounted=true;
  try{engine.current=createScene(host.current,meeting);engine.current.render(meeting.raceStartMs,null);}
  catch{if(mounted)queueMicrotask(()=>setError('3D 렌더러 오류입니다. 화면 아래의 순위와 기록은 확인할 수 있습니다.'));}
  return()=>{mounted=false;engine.current?.dispose();engine.current=null;};
 },[meeting]);

 useEffect(()=>{playhead.current=ms;engine.current?.render(ms,manual);},[ms,manual,meeting]);

 useEffect(()=>{
  if(!playing||!meeting)return;
  let elapsed=playhead.current;
  const {end}=segmentBounds(meeting,segment);
  clock.current=performance.now();
  const animate=(now:number)=>{
   const delta=Math.max(0,now-clock.current);clock.current=now;
   elapsed=Math.min(end,elapsed+delta*rate);setMs(elapsed);
   if(elapsed>=end)setPlaying(false);
   else frame.current=requestAnimationFrame(animate);
  };
  frame.current=requestAnimationFrame(animate);
  return()=>cancelAnimationFrame(frame.current);
 },[playing,rate,meeting,segment]);

 useEffect(()=>{
  const hidden=()=>{if(document.hidden)setPlaying(false);};
  const change=()=>setFullscreen(document.fullscreenElement===player.current);
  document.addEventListener('visibilitychange',hidden);
  document.addEventListener('fullscreenchange',change);
  return()=>{document.removeEventListener('visibilitychange',hidden);document.removeEventListener('fullscreenchange',change);};
 },[]);

 function choose(next:Segment,autoPlay=true){
  if(!meeting)return;
  setSegment(next);setMs(segmentBounds(meeting,next).start);setManual(null);setPlaying(autoPlay);
 }
 function jumpTo(next:number,nextSegment:Segment=segment){
  if(!meeting)return;
  const {start,end}=segmentBounds(meeting,nextSegment);
  setPlaying(false);setSegment(nextSegment);setMs(Math.min(end,Math.max(start,next)));
 }
 function togglePlay(){
  if(!meeting)return;
  const {start,end}=segmentBounds(meeting,segment);
  if(!playing&&ms>=end)setMs(start);
  setPlaying(!playing);
 }
 async function toggleFullscreen(){
  if(!player.current)return;
  try{
   if(document.fullscreenElement===player.current)await document.exitFullscreen();
   else if(player.current.requestFullscreen)await player.current.requestFullscreen();
   else setError('현재 브라우저에서 전체화면을 지원하지 않습니다.');
  }catch{setError('전체화면으로 전환할 수 없습니다. 브라우저 설정을 확인해 주세요.');}
 }
 function selectCase(){
  setPlaying(false);setSpecial(value=>!value);
 }

 if(!meeting)return <main className="loading"><strong>GALACTIC RACING</strong><p>{error||'확정된 로컬 레이스 데이터를 불러오는 중…'}</p></main>;
 const m=meeting,state=meetingAt(m,ms),cue=cameraAt(m,ms,manual);
 const {start,end}=segmentBounds(m,segment),localMs=Math.max(0,ms-start);
 const name=(id:string)=>m.race.racers.find(r=>r.id===id)?.name??'레이서';
 const q=state.phase==='qualifying',grid=state.phase==='grid',ceremony=state.phase==='ceremony';
 const reveal=ceremony&&!!m.specialDsq&&state.ceremonyMs>=10000;
 const reclassified=reveal&&state.ceremonyMs>=20000;
 const final=ceremony&&(!m.specialDsq?state.ceremonyMs>=10000:state.ceremonyMs>=28000);
 const provisional=ceremony&&!reclassified&&!!m.specialDsq;
 const tick=Math.floor(state.raceMs/m.race.config.tickMs);
 const events=ms>=m.raceStartMs&&ms<m.ceremonyStartMs?m.race.events.filter(e=>e.tick<=tick&&e.kind!=='START'):[];
 const activeEvent=[...events].reverse().find(e=>e.kind==='EXTERNAL'&&tick-e.tick<12)??[...events].reverse()[0];
 const eventText=activeEvent?(activeEvent.kind==='EXTERNAL'?hazardLabels[activeEvent.power]??'외부 방해':eventLabels[activeEvent.kind]??activeEvent.kind):'';
 const sortedRace=[...state.racers].sort((a,b)=>a.rank-b.rank);
 const scoreboard=q?state.table.map((r,i)=>({id:r.id,pos:i+1,value:formatLap(Number.isFinite(r.bestMs)?r.bestMs:null),sub:'시도 '+r.laps+'/3'})):
  grid?m.qualifying.standings.map(r=>({id:r.id,pos:r.grid,value:formatLap(r.bestMs),sub:'그리드 P'+r.grid})):
  ceremony?(reclassified||final?m.official:m.race.results).map(r=>({id:r.id,pos:r.position,value:r.status==='FINISHED'?'완주':r.status,sub:reclassified||final?(m.official.find(v=>v.id===r.id)?.points??0)+' PTS':'잠정'})):
  sortedRace.map(r=>({id:r.id,pos:r.rank,value:r.status==='RACING'?Math.round(r.speed*.036)+' km/h':r.status,sub:r.ultimate?'ULTIMATE':r.motion==='DAMAGED'?'감속':''}));
 const podium=(reclassified||final?m.official:m.race.results).filter(r=>r.status==='FINISHED').slice(0,3);
 const stageHeading=segment==='qualifying'?'세 번의 타임어택 · 최고 기록으로 그리드 결정':
  segment==='race'?'8명의 레이서 · 3랩 · 10.8km':'잠정 시상식 → 공식 결과 확정';
 const paceText=segment==='race'?'레이스 재생':'세션 재생';
 const stages:Segment[]=['qualifying','race','ceremony'];
 return <main className="page">
  <header className="site-header"><div className="brand"><span className="brand-icon">◇</span> HOLOCRON <span className="brand-meta">RACING DIVISION</span></div>
   <span className="lab-tag">LOCAL DEMO · CREDIT 미연결</span></header>
  <div className="title-row"><div><p className="eyebrow">VESPER CIRCUIT · EXHIBITION 01</p><h1>GALACTIC <em>RACING</em></h1></div>
   <div className="title-stat"><strong>10.8 <small>KM</small></strong><span>3 LAPS · 8 RACERS</span></div></div>
  <div className="watch-layout">
   <section className="player-column" aria-label="갤럭틱 레이싱 영상">
    <nav className="stage-tabs" aria-label="예선, 본경기, 시상식 리플레이">
     {stages.map((stage,i)=><button type="button" key={stage} className={segment===stage?'active':''}
       aria-current={segment===stage?'step':undefined} onClick={()=>choose(stage)}>
       <small>{'0'+(i+1)} · {stage==='qualifying'?'QUALIFYING':stage==='race'?'RACE':'PODIUM'}</small>
       <strong>{segmentLabels[stage]}</strong></button>)}
    </nav>
    <div className="session-line"><div><span className="session-pill">{segmentLabels[segment]}</span><strong>{stageHeading}</strong></div>
     <span>{formatTime(end-start)} <small>세션 길이</small></span></div>
    <div ref={player} className="player-screen">
     <section className="broadcast" aria-label={segmentLabels[segment]+' 3D 방송 화면'}>
      <div ref={host} className="scene"/>
      {error&&<p className="error" role="alert">{error}</p>}
      <div className="onair"><span className={'live-dot '+(playing?'playing':'')}/>
       <strong>{q?'Q · QUALIFYING':grid?'STARTING GRID':ceremony?'PODIUM CEREMONY':'R · RACE'}</strong>
       <time>{formatTime(localMs)}</time></div>
      <button type="button" className="expand-video" onClick={()=>void toggleFullscreen()}
        aria-label={fullscreen?'전체화면 종료':'전체화면으로 보기'} title="전체화면">{fullscreen?'축소 ↘':'⛶ 전체화면'}</button>
      <aside className="tower" aria-label="중계 순위표"><div className="tower-head">LIVE TIMING <span>8 RACERS</span></div>
       {scoreboard.slice(0,8).map(row=><button type="button" key={row.id} className={cue.racerId===row.id?'selected':''}
        onClick={()=>setManual(row.id)} title={name(row.id)+' 카메라로 전환'}>
        <b>{String(row.pos).padStart(2,'0')}</b>
        <i style={{background:m.race.racers.find(r=>r.id===row.id)?.color}}/>
        <span>{name(row.id)}<small>{row.value}</small></span></button>)}
      </aside>
      {!ceremony&&<div className="camera-tag">{manual?'CAM · MANUAL':'CAM · AUTO'} <b>{name(cue.racerId)}</b></div>}
      {activeEvent&&!ceremony&&!q&&<div className={'event-banner '+(activeEvent.kind==='EXTERNAL'?'danger':'')}>
       <small>RACE CONTROL</small><strong>{eventText}</strong><span>{name(activeEvent.racerId)}</span></div>}
      {ceremony&&<div className={'ceremony-card '+(reveal&&!final?'alert':'')} role="status">
       <small>{final?'OFFICIAL PODIUM':reclassified?'OFFICIAL RECLASSIFICATION':reveal?'RACE CONTROL · INVESTIGATION':'PROVISIONAL PODIUM'}</small>
       <h2>{final?'최종 시상식':reclassified?'DSQ · 공식 순위 수정':reveal?'!':'잠정 시상식'}</h2>
       {reveal&&!final?<><p><strong>{name(m.specialDsq!.id)}</strong> · {m.specialDsq!.reason}</p>
        {state.ceremonyMs>=14000&&<p className="evidence">{m.specialDsq!.evidence}</p>}</>:
        <p>{podium.map((r,i)=>(i+1)+'위 '+name(r.id)).join('  ·  ')}</p>}
       {provisional&&<span>검수 전 순위 · 최종 결과와 다를 수 있습니다</span>}
      </div>}
      {q&&<div className="qualifying-chip">라운드 로빈 · 총 3회 주행 · {state.completed.length}/24 랩 완료</div>}
     </section>
     <div className="fullscreen-controls"><button onClick={togglePlay}>{playing?'Ⅱ 일시정지':'▶ 재생'}</button>
       <span>{segmentLabels[segment]} · {formatTime(localMs)} / {formatTime(end-start)}</span>
       <button onClick={()=>void toggleFullscreen()}>전체화면 종료 ✕</button></div>
    </div>
    <div className="transport" aria-label="재생 제어">
     <div className="transport-row">
      <button type="button" className="play" onClick={togglePlay}>{playing?'Ⅱ 일시정지':'▶ '+paceText}</button>
      <button type="button" className="restart" onClick={()=>choose(segment)}>↺ 이 세션 다시보기</button>
      <label>속도 <select value={rate} onChange={e=>setRate(Number(e.target.value))}>
       {[.5,1,2,4,8].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
      <label>카메라 <select aria-label="카메라 선택" value={manual??'auto'} onChange={e=>setManual(e.target.value==='auto'?null:e.target.value)}>
       <option value="auto">자동 중계</option>{m.race.racers.map(r=><option key={r.id} value={r.id}>{r.name} 추적</option>)}</select></label>
      <button type="button" className="fullscreen-secondary" onClick={()=>void toggleFullscreen()}>⛶ 전체화면</button>
     </div>
     <div className="seek"><time>{formatTime(localMs)}</time>
      <input type="range" aria-label={segmentLabels[segment]+' 재생 위치'} min={start} max={end} step="250" value={Math.min(end,Math.max(start,ms))}
       onChange={event=>jumpTo(Number(event.target.value))}/>
      <time>{formatTime(end-start)}</time></div>
    </div>
    <details className="mobile-timing" open>
     <summary>{q?'예선 실시간 기록':'경기 순위 및 상태'} <span>8 RACERS · 펼치기/접기</span></summary>
     <div className="mobile-rows">{scoreboard.map(row=><button key={row.id} type="button" onClick={()=>setManual(row.id)}>
      <b>{row.pos}</b><i style={{background:m.race.racers.find(r=>r.id===row.id)?.color}}/>
      <span>{name(row.id)}<small>{row.sub}</small></span><strong>{row.value}</strong></button>)}</div>
     <p>선수를 누르면 해당 레이서 추적 카메라로 전환됩니다.</p>
    </details>
    <section className="watch-notes"><div className="eyebrow">BROADCAST HIGHLIGHTS</div>
     <h2>이번 경기 주요 장면</h2>
     <div className="highlights">
      {(['EXTERNAL','ULTIMATE','MAJOR','SHORTCUT','FINISH'] as const).map(kind=>{
       const event=m.race.events.find(e=>e.kind===kind);
       return <button type="button" key={kind} disabled={!event} onClick={()=>event&&jumpTo(m.raceStartMs+event.tick*m.race.config.tickMs,'race')}>
        {eventLabels[kind]} <span>↗</span></button>;
      })}
     </div>
     <p>리플레이는 예선·본경기·시상식별로 독립 재생합니다. 재생 속도와 카메라 선택은 기록된 결과를 바꾸지 않습니다.</p>
    </section>
   </section>
   <aside className="season-side" aria-label="레이싱 시즌과 다른 리플레이">
    <div className="side-heading"><span className="eyebrow">WATCH NEXT</span><h2>이 경기의 리플레이</h2></div>
    <div className="episode-list">
     {stages.map((stage,i)=><button type="button" className={'episode '+(segment===stage?'selected':'')} key={stage} onClick={()=>choose(stage)}>
      <span className={'episode-thumbnail thumbnail-'+stage}>{stage==='qualifying'?'Q':stage==='race'?'R':'★'}<small>{'0'+(i+1)}</small></span>
      <span className="episode-info"><strong>{segmentLabels[stage]} 다시보기</strong>
       <small>{stage==='qualifying'?'24회 타임어택 · 실측 기록':stage==='race'?'8인 3랩 본경기 · 이벤트':'잠정·최종 포디엄 · 특별 DSQ'}</small>
       <em>{formatTime(segmentBounds(m,stage).end-segmentBounds(m,stage).start)}</em></span>
     </button>)}
    </div>
    <div className="side-heading section-gap"><span className="eyebrow">SEASON ARCHIVE</span><h2>시즌별 기록 <small>화면 예시</small></h2></div>
    <p className="demo-disclaimer">시즌 운영 기능은 아직 미구현입니다. 아래는 관리자·시즌 연동 전의 레이아웃 예시입니다.</p>
    <div className="season-sample"><div className="sample-head"><span>시즌 프리셋</span><strong>7 ROUNDS</strong></div>
     {['월','화','수','목','금','토','일'].map((day,i)=><div className="sample-race" key={day}>
      <span className="round-badge">R{i+1}</span><div><strong>{day}요일 · 21:00</strong><small>결과 미등록 · 데모 화면</small></div></div>)}
    </div>
    <div className="demo-controls"><strong>테스트 사례</strong><button type="button" onClick={selectCase}>
     {special?'일반 경기로 전환':'특별 DSQ 경기 보기'} ↗</button>
     <p>서로 다른 고정 Seed의 데모입니다. 기존 경기 결과를 수정하지 않습니다.</p>
     <a href={special?'/special.json':'/race.json'} download>로컬 전체 기록 JSON ↓</a>
     <span>SEED {m.race.seed} · {digest.slice(0,12)}…</span></div>
   </aside>
  </div>
  <section className="record-tables">
   <details><summary>퀄리파잉 기록 <span>R1 · R2 · R3 / 최종 그리드</span></summary>
    <div className="table-wrap"><table><thead><tr><th>선수</th><th>R1</th><th>R2</th><th>R3</th><th>최고 랩</th><th>그리드</th></tr></thead><tbody>
     {m.race.racers.map(r=>{const best=m.qualifying.standings.find(s=>s.id===r.id)!;
      return <tr key={r.id}><th>{r.name}</th>{m.qualifying.runs.filter(run=>run.id===r.id).map(run=><td key={run.round}>{ms>=run.finishMs?run.valid?formatLap(run.lapMs):'무효':'—'}</td>)}
       <td>{ms>=m.qualifying.durationMs?formatLap(best.bestMs):'—'}</td><td>{ms>=m.qualifying.durationMs?'P'+best.grid:'—'}</td></tr>;})}
    </tbody></table></div>
   </details>
   <details><summary>본경기 · 공식 최종 결과 <span>특별 실격은 시상식에서 판정</span></summary>
    <div className="table-wrap">{final?<table><thead><tr><th>순위</th><th>선수</th><th>상태</th><th>시즌 점수</th></tr></thead><tbody>
     {m.official.map(r=><tr key={r.id}><td>{r.position}</td><th>{name(r.id)}</th><td>{r.specialDsq?'특별 DSQ':r.status}</td><td>{r.points}</td></tr>)}
    </tbody></table>:<p>시상식이 종료되면 공식 순위와 점수가 공개됩니다.</p>}</div>
   </details>
  </section>
  <footer>HOLOCRON · GALACTIC RACING {m.version}<span>격리 3D 데모 · Production / Credit 미연결</span></footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
