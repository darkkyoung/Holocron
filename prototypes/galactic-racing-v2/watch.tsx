import React,{useEffect,useRef,useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {createScene} from './scene';
import SeasonPlaylist from './season-playlist';
import RaceMinimap from './minimap';
import {lapIndicator} from './watch-hud';
import {meetingAt,cameraAt} from '../../lib/racing/v2/playback';
import type {Meeting} from '../../lib/racing/v2/types';
import './watch.css';

type Segment='qualifying'|'race'|'ceremony';
type CameraAngle='chase'|'front'|'side';
type HudSize='small'|'medium'|'large';
const REPLAY_SESSION_KEY='holocron-galactic-racing-v4-session';
interface SavedReplay {
  version:string;seed:string;special:boolean;
  segment:Segment;ms:number;playing:boolean;rate:number;savedAt:number;
  manual:string|null;angle:CameraAngle;
}
function readReplaySession():SavedReplay|null{
  try {
    const raw=sessionStorage.getItem(REPLAY_SESSION_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw) as SavedReplay;
    if(!['qualifying','race','ceremony'].includes(parsed.segment)||
      !Number.isFinite(parsed.ms)||!Number.isFinite(parsed.savedAt)||
      ![.5,1,2,4,8].includes(parsed.rate)||typeof parsed.seed!=='string')return null;
    return parsed;
  }catch{return null;}
}

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
 const [fullscreen,setFullscreen]=useState(false);
 const [pseudoFullscreen,setPseudoFullscreen]=useState(false);
 const [angle,setAngle]=useState<CameraAngle>('chase');
 const [hudSize,setHudSize]=useState<HudSize>('medium');
 const player=useRef<HTMLDivElement>(null);
 const host=useRef<HTMLDivElement>(null);
 const engine=useRef<ReturnType<typeof createScene>|null>(null);
 const playhead=useRef(0);
 const timelineClock=useRef({position:0,started:0});

 useEffect(()=>{
  const abort=new AbortController();
  fetch(special?'/special.json':'/race.json',{signal:abort.signal}).then(async response=>{
   if(!response.ok)throw Error('레이스 기록을 불러오지 못했습니다.');
   const bytes=await response.arrayBuffer();
   const calculated=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
     value=>value.toString(16).padStart(2,'0')).join('');
   const header=response.headers.get('X-Race-SHA256');
   if(header&&header!==calculated)throw Error('레이스 기록의 무결성을 확인하지 못했습니다.');
   const value=JSON.parse(new TextDecoder().decode(bytes)) as Meeting;
   if(!value.race||!value.qualifying||!value.official)throw Error('레이스 형식이 올바르지 않습니다.');
   const saved=readReplaySession();
   const compatible=saved&&saved.seed===value.race.seed&&saved.version===value.version&&saved.special===special;
   if(compatible){
    const {start:lo,end:hi}=segmentBounds(value,saved.segment);
    const timeAway=saved.playing?Math.max(0,Date.now()-saved.savedAt)*saved.rate:0;
    const resumed=Math.min(hi,Math.max(lo,saved.ms+timeAway));
    playhead.current=resumed;
    setSegment(saved.segment);setMs(resumed);setPlaying(saved.playing&&resumed<hi);
    setRate(saved.rate);
    setManual(value.race.racers.some(r=>r.id===saved.manual)?saved.manual:null);
    setAngle(['chase','front','side'].includes(saved.angle)?saved.angle:'chase');
   }else{
    playhead.current=value.raceStartMs;
    setSegment('race');setMs(value.raceStartMs);setPlaying(false);setManual(null);
   }
   setMeeting(value);
  }).catch(cause=>{if(!abort.signal.aborted)setError(cause instanceof Error?cause.message:'레이스 데이터 오류');});
  return()=>abort.abort();
 },[special]);

 useEffect(()=>{
  if(!meeting||!host.current)return;
  let mounted=true;
  try{engine.current=createScene(host.current,meeting);engine.current.render(meeting.raceStartMs,null,'chase');}
  catch{if(mounted)queueMicrotask(()=>setError('3D 렌더러 오류입니다. 화면 아래의 순위와 기록은 확인할 수 있습니다.'));}
  return()=>{mounted=false;engine.current?.dispose();engine.current=null;};
 },[meeting]);

 useEffect(()=>{playhead.current=ms;engine.current?.render(ms,manual,angle);},[ms,manual,angle,meeting]);

 useEffect(()=>{
  if(!playing||!meeting)return;
  const end=segmentBounds(meeting,segment).end;
  timelineClock.current={position:playhead.current,started:performance.now()};
  const sync=()=>{
   const clock=timelineClock.current;
   const position=Math.min(end,clock.position+Math.max(0,performance.now()-clock.started)*rate);
   playhead.current=position;
   setMs(position);
   if(position>=end)setPlaying(false);
  };
  // requestAnimationFrame may be throttled or suspended by a browser when its
  // WebGL canvas is GPU-blocked or the tab is backgrounded. A wall-clock driven
  // timer continues the same replay without drawing fake frames or changing results.
  // 80ms also bounds expensive React/scene redraw work on software renderers.
  const ticker=window.setInterval(sync,80);
  const onVisible=()=>{if(!document.hidden)sync();};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{clearInterval(ticker);document.removeEventListener('visibilitychange',onVisible);};
 },[playing,rate,meeting,segment]);

 useEffect(()=>{
  if(!meeting)return;
  const save=()=>{
   try{
    const {start,end}=segmentBounds(meeting,segment);
    const position=playing?Math.max(start,Math.min(end,timelineClock.current.position+
      Math.max(0,performance.now()-timelineClock.current.started)*rate)):playhead.current;
    const stored:SavedReplay={
      version:meeting.version,seed:meeting.race.seed,special,segment,ms:position,
      playing:playing&&position<end,rate,savedAt:Date.now(),manual,angle,
    };
    sessionStorage.setItem(REPLAY_SESSION_KEY,JSON.stringify(stored));
   }catch{/* Storage is optional (private browsing, sandbox or policy). */}
  };
  const timer=window.setInterval(save,1000);
  window.addEventListener('pagehide',save);
  return()=>{window.clearInterval(timer);window.removeEventListener('pagehide',save);};
 },[meeting,playing,rate,segment,special,manual,angle]);

 useEffect(()=>{
  const change=()=>setFullscreen(document.fullscreenElement===player.current);
  document.addEventListener('fullscreenchange',change);
  return()=>document.removeEventListener('fullscreenchange',change);
 },[]);

 function choose(next:Segment,autoPlay=true){
  if(!meeting)return;
  const start=segmentBounds(meeting,next).start;playhead.current=start;
  setSegment(next);setMs(start);setManual(null);setPlaying(autoPlay);
 }
 function jumpTo(next:number,nextSegment:Segment=segment){
  if(!meeting)return;
  const {start,end}=segmentBounds(meeting,nextSegment);
  const position=Math.min(end,Math.max(start,next));playhead.current=position;
  setPlaying(false);setSegment(nextSegment);setMs(position);
 }
 function togglePlay(){
  if(!meeting)return;
  const {start,end}=segmentBounds(meeting,segment);
  if(!playing&&ms>=end){playhead.current=start;setMs(start);}
  setPlaying(!playing);
 }
 async function toggleFullscreen(){
  if(!player.current)return;
  if(pseudoFullscreen){setPseudoFullscreen(false);return;}
  if(document.fullscreenElement===player.current){await document.exitFullscreen();return;}
  try{
   if(!player.current.requestFullscreen)throw Error('NATIVE_FULLSCREEN_UNAVAILABLE');
   await player.current.requestFullscreen();
  }catch{
   // Embedded browsers and software-GPU test sessions may block the native API.
   // Keep the watch experience functional as a viewport-filling layout instead.
   setPseudoFullscreen(true);
  }
 }
 function selectCase(){
  setPlaying(false);setError('');setSpecial(value=>!value);
 }

 function seekBy(delta:number){
  if(!meeting)return;
  const {start,end}=segmentBounds(meeting,segment);
  const next=Math.max(start,Math.min(end,playhead.current+delta));
  playhead.current=next;timelineClock.current={position:next,started:performance.now()};
  setMs(next);
 }
 function toggleAutoCamera(){
  if(!meeting)return;
  const leader=meetingAt(meeting,ms).racers.slice().sort((a,b)=>a.rank-b.rank)[0]?.id;
  setManual(current=>current?null:leader??meeting.race.grid[0]);
 }
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if(!meeting||event.altKey||event.ctrlKey||event.metaKey)return;
   const target=event.target;
   if(target instanceof HTMLElement&&target.closest('button,select,input,textarea,[contenteditable="true"]'))return;
   const key=event.key.toLowerCase();
   if(key==='k'||event.key===' '){event.preventDefault();togglePlay();}
   else if(event.key==='ArrowLeft'){event.preventDefault();seekBy(-5000);}
   else if(event.key==='ArrowRight'){event.preventDefault();seekBy(5000);}
   else if(key==='j'){event.preventDefault();seekBy(-10000);}
   else if(key==='l'){event.preventDefault();seekBy(10000);}
   else if(key==='f'){event.preventDefault();void toggleFullscreen();}
   else if(event.key==='Escape'&&pseudoFullscreen){event.preventDefault();setPseudoFullscreen(false);}
  };
  window.addEventListener('keydown',handler);
  return()=>window.removeEventListener('keydown',handler);
 },[meeting,segment,playing,ms,fullscreen,pseudoFullscreen]);

 const fullDisplay=fullscreen||pseudoFullscreen;
 if(!meeting)return <main className="loading"><strong>GALACTIC RACING</strong><p>{error||'확정된 로컬 레이스 데이터를 불러오는 중…'}</p></main>;
 const m=meeting,state=meetingAt(m,ms),cue=cameraAt(m,ms,manual);
 const {start,end}=segmentBounds(m,segment),localMs=Math.max(0,ms-start);
 const name=(id:string)=>m.race.racers.find(r=>r.id===id)?.name??'레이서';
 const q=state.phase==='qualifying',grid=state.phase==='grid',ceremony=state.phase==='ceremony';
 const reveal=ceremony&&!!m.specialDsq&&state.ceremonyMs>=10000;
 const reclassified=reveal&&state.ceremonyMs>=20000;
 const final=ceremony&&(!m.specialDsq?state.ceremonyMs>=10000:state.ceremonyMs>=28000);
 const provisional=ceremony&&!reclassified&&!!m.specialDsq;
 const lapHud=lapIndicator(m,state.phase,ms,state.racers,manual);
 const hudScale:CSSProperties={'--hud-scale':fullDisplay?
  ({small:1.15,medium:1.5,large:1.9} as const)[hudSize]:
  ({small:.85,medium:1,large:1.3} as const)[hudSize]} as CSSProperties;
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
  <div className="watch-layout">
   <section className="player-column" aria-label="갤럭틱 레이싱 영상">
    <div ref={player} className={'player-screen '+(pseudoFullscreen?'is-pseudo-fullscreen':'')} style={hudScale}>
     <section className="broadcast" aria-label={segmentLabels[segment]+' 3D 방송 화면'}
       onClick={event=>{
        if((event.target as HTMLElement).closest('button,a,input,select,[role="button"]'))return;
        togglePlay();
       }}>
      <div ref={host} className="scene"/>
      {error&&<p className="error" role="alert">{error}</p>}
      <div className="race-timer"><span className={'race-live-dot '+(playing?'playing':'')}/><span>{q?'QUALIFYING':grid?'GRID':ceremony?'PODIUM':'RACE'}</span><time>{formatTime(localMs)}</time></div>
      <RaceMinimap meeting={m} frames={state.racers} ms={ms} phase={state.phase} manual={manual}/>
      <div className="lap-hud" role="status" aria-label={lapHud.description}><small>{lapHud.label}</small><strong>{lapHud.value}</strong></div>
      <button type="button" className="expand-video" onClick={()=>void toggleFullscreen()}
        aria-label={fullDisplay?'전체화면 종료':'전체화면으로 보기'} title="전체화면">{fullDisplay?'축소 ↘':'⛶ 전체화면'}</button>
      {!ceremony&&<aside className="tower" aria-label="중계 순위표"><div className="tower-head">POSITION <span>8</span></div>
       {scoreboard.slice(0,8).map(row=><button type="button" key={row.id} className={cue.racerId===row.id?'selected':''}
        onClick={()=>setManual(row.id)} title={name(row.id)+' 카메라로 전환'}>
        <b>{String(row.pos).padStart(2,'0')}</b>
        <i style={{background:m.race.racers.find(r=>r.id===row.id)?.color}}/>
        <span>{name(row.id)}<small>{row.value}</small></span></button>)}
      </aside>}
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
     <div className="fullscreen-controls">
      <button type="button" onClick={togglePlay} aria-label={playing?'일시정지':'재생'}>{playing?'Ⅱ 일시정지':'▶ 재생'}</button>
      <span className="fullscreen-time">{segmentLabels[segment]} · {formatTime(localMs)} / {formatTime(end-start)}</span>
      <button type="button" onClick={toggleAutoCamera} aria-label="전체화면 자동 카메라 전환">{manual?'추적 · '+name(manual):'자동 중계'}</button>
      <label>각도 <select aria-label="전체화면 카메라 각도" value={angle} disabled={!manual} onChange={e=>setAngle(e.target.value as CameraAngle)}>
       <option value="chase">후방</option><option value="front">정면</option><option value="side">측면</option>
      </select></label>
      <label>HUD <select aria-label="전체화면 HUD 크기" value={hudSize} onChange={e=>setHudSize(e.target.value as HudSize)}>
       <option value="small">작게</option><option value="medium">중간</option><option value="large">크게</option>
      </select></label>
      <button type="button" onClick={()=>void toggleFullscreen()}>전체화면 종료 ✕</button>
     </div>
    </div>
    {ceremony&&<section className={'mobile-ceremony '+(reveal&&!final?'warning':'')} aria-live="polite">
     <small>{final?'OFFICIAL PODIUM':reveal?'RACE CONTROL':'PROVISIONAL PODIUM'}</small>
     <strong>{final?'최종 시상식':reclassified?'DSQ · 순위 수정':reveal?'! 경기 조사':'잠정 시상식'}</strong>
     <p>{reveal&&!final?name(m.specialDsq!.id)+' · '+m.specialDsq!.reason+(state.ceremonyMs>=14000?' · '+m.specialDsq!.evidence:''):
       podium.map((r,i)=>(i+1)+'위 '+name(r.id)).join(' · ')}</p>
    </section>}
    <div className="title-row video-details">
     <div><h1>갤럭틱 레이싱 · 베스퍼 서킷 <span>{segmentLabels[segment]}</span></h1>
      <p className="video-meta">{stageHeading} · 시즌 1 (시연)</p></div>
     <span className="video-duration">{formatTime(end-start)} <small>영상 길이</small></span>
    </div>
    <div className="transport" aria-label="재생 제어">
     <div className="transport-row">
      <button type="button" className="play" onClick={togglePlay}>{playing?'Ⅱ 일시정지':'▶ '+paceText}</button>
      <button type="button" className="restart" onClick={()=>choose(segment)}>↺ 이 세션 다시보기</button>
      <label>속도 <select value={rate} onChange={e=>setRate(Number(e.target.value))}>
       {[.5,1,2,4,8].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
      <label>카메라 <select aria-label="카메라 선택" value={manual??'auto'} onChange={e=>setManual(e.target.value==='auto'?null:e.target.value)}>
       <option value="auto">자동 중계</option>{m.race.racers.map(r=><option key={r.id} value={r.id}>{r.name} 추적</option>)}</select></label>
      <label>시점 <select aria-label="추적 카메라 각도" value={angle} disabled={!manual}
       onChange={e=>setAngle(e.target.value as CameraAngle)}>
       <option value="chase">뒤에서</option><option value="front">정면에서</option><option value="side">옆에서</option>
      </select></label>
      <label>HUD <select aria-label="HUD 크기" value={hudSize} onChange={e=>setHudSize(e.target.value as HudSize)}>
       <option value="small">작게</option><option value="medium">중간</option><option value="large">크게</option>
      </select></label>
      <button type="button" className="fullscreen-secondary" onClick={()=>void toggleFullscreen()}>⛶ 전체화면</button>
     </div>
     <div className="seek"><time>{formatTime(localMs)}</time>
      <input type="range" aria-label={segmentLabels[segment]+' 재생 위치'} min={start} max={end} step="250" value={Math.min(end,Math.max(start,ms))}
       onChange={event=>jumpTo(Number(event.target.value))}/>
      <time>{formatTime(end-start)}</time></div>
    </div>
    <nav className="stage-tabs" aria-label="예선, 본경기, 시상식 리플레이">
     {stages.map(stage=><button type="button" key={stage} className={segment===stage?'active':''}
       aria-current={segment===stage?'step':undefined} onClick={()=>choose(stage)}>
       {segmentLabels[stage]} <span>{segment===stage?'재생 중':'다시보기'}</span></button>)}
    </nav>
    <details className="mobile-timing">
     <summary>{q?'예선 실시간 기록':'경기 순위 및 상태'} <span>8 RACERS · 펼치기/접기</span></summary>
     <div className="mobile-rows">{scoreboard.map(row=><button key={row.id} type="button" onClick={()=>setManual(row.id)}>
      <b>{row.pos}</b><i style={{background:m.race.racers.find(r=>r.id===row.id)?.color}}/>
      <span>{name(row.id)}<small>{row.sub}</small></span><strong>{row.value}</strong></button>)}</div>
     <p>선수를 누르면 해당 레이서 추적 카메라로 전환됩니다.</p>
    </details>
    <details className="watch-notes">
     <summary>주요 장면 <span>이벤트로 바로 이동</span></summary>
     <div className="highlights">
      {(['EXTERNAL','ULTIMATE','MAJOR','SHORTCUT','FINISH'] as const).map(kind=>{
       const event=m.race.events.find(e=>e.kind===kind);
       return <button type="button" key={kind} disabled={!event}
        onClick={()=>event&&jumpTo(m.raceStartMs+event.tick*m.race.config.tickMs,'race')}>
        {eventLabels[kind]} <span>↗</span></button>;
      })}
     </div>
    </details>
   </section>
   <SeasonPlaylist meeting={m} activeSegment={segment} chooseSegment={choose} special={special} toggleSpecial={selectCase}/>
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
