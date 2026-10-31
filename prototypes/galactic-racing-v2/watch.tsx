import React,{useEffect,useEffectEvent,useRef,useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {createScene} from './scene';
import SeasonPlaylist from './season-playlist';
import RaceMinimap from './minimap';
import {lapIndicator} from './watch-hud';
import {meetingAt,cameraAt} from '../../lib/racing/v2/playback';
import type {Meeting} from '../../lib/racing/v2/types';
import PlayerControls,{type CameraAngle,type HudSize} from './player-controls';
import {forBroadcast} from './broadcast-director';
import './watch.css';
import './player.css';

type Segment='qualifying'|'race'|'ceremony';
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
 const [rate,setRate]=useState(1);
 const [controls,setControls]=useState(true);
 const [browse,setBrowse]=useState(false);
 const [buildInfo,setBuildInfo]=useState<{label:string;sha:string;simulator:string}|null>(null);
 const controlTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const tap=useRef({at:0,x:0});
 function showControls(){setControls(true);if(controlTimer.current)clearTimeout(controlTimer.current);controlTimer.current=setTimeout(()=>setControls(false),2800);}
 useEffect(()=>{fetch('/build-info.json').then(r=>r.json() as Promise<{label:string;sha:string;simulator:string}>).then(info=>{const expected=new URLSearchParams(location.search).get('build');if(expected&&expected!==info.sha)throw Error('BUILD_MISMATCH');setBuildInfo(info);}).catch(()=>setError('빌드 정보를 확인할 수 없습니다. 올바른 ZIP인지 확인해 주세요.'));return()=>{if(controlTimer.current)clearTimeout(controlTimer.current);};},[]);
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
   const header=response.headers.get('X-Race-SHA256');
   if(header){
    if(!crypto.subtle)throw Error('무결성 검증에는 localhost 또는 HTTPS가 필요합니다.');
    const calculated=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
    if(header!==calculated)throw Error('레이스 기록의 무결성을 확인하지 못했습니다.');
   }
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
   setMeeting(forBroadcast(value));
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
 const keyboard=useEffectEvent((event:KeyboardEvent)=>{
   if(!meeting||event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
   showControls();
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
 });
 useEffect(()=>{const handler=(event:KeyboardEvent)=>keyboard(event);window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);

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

 return <main className="page">
  <header className="site-header"><div className="brand"><span className="brand-icon">◇</span> HOLOCRON <span className="brand-meta">RACING DIVISION</span></div>
   <button className="shell-nav" onClick={()=>setBrowse(v=>!v)}>{browse?'레이스로 돌아가기':'시연 아카이브 둘러보기'}</button></header>
  <div className="build-strip">{buildInfo?.label??'빌드 확인 중'} · {m.version} · {buildInfo?.sha.slice(0,12)} <span>로컬 리플레이</span></div>
  {browse&&<section className="demo-browse"><h1>레이스 아카이브</h1><p>격리 App Shell 시연 · 작은 플레이어에서 같은 경기를 계속 관람합니다.</p><button onClick={()=>setBrowse(false)}>전체 관람 화면으로 돌아가기</button></section>}
  <div className={'watch-layout '+(browse?'is-browsing':'')}>
   <section className="player-column" aria-label="갤럭틱 레이싱 영상">
    <div ref={player} className={'player-screen '+(fullDisplay?'is-fullscreen ':'')+(pseudoFullscreen?'is-pseudo-fullscreen ':'')+(browse?'mini-player':'')} style={hudScale} tabIndex={0} onPointerMove={showControls} onFocusCapture={showControls} onPointerLeave={()=>playing&&setControls(false)}>
     <section className="broadcast" aria-label={segmentLabels[segment]+' 3D 방송 화면'} onTouchEnd={e=>{const x=e.changedTouches[0].clientX,now=Date.now();if(now-tap.current.at<320&&Math.abs(x-tap.current.x)<70){seekBy(x<(player.current?.getBoundingClientRect().left??0)+(player.current?.clientWidth??0)/2?-10000:10000);e.preventDefault();}tap.current={at:now,x};showControls();}}
       onClick={event=>{
        if((event.target as HTMLElement).closest('button,a,input,select,[role="button"]'))return;
        showControls();
        if(event.detail<2)togglePlay();
       }}>
      <div ref={host} className="scene"/>
      {ms>=end&&<div className="end-card"><strong>{segmentLabels[segment]} 종료</strong><button onClick={()=>choose(segment)}>↺ 다시 보기</button>{segment!=='ceremony'&&<button onClick={()=>choose(segment==='qualifying'?'race':'ceremony')}>{segment==='qualifying'?'본경기':'시상식'} 이어 보기 →</button>}</div>}
      <div className="broadcast-caption">{manual?'추적 · '+name(manual):'AUTO · '+name(cue.racerId)} {segment==='race'&&ms>=m.raceStartMs+m.race.durationTicks*m.race.config.tickMs?' · RACE COMPLETE':''}</div>
      {error&&<p className="error" role="alert">{error}</p>}
      <div className="race-timer"><span className={'race-live-dot '+(playing?'playing':'')}/><span>{q?'QUALIFYING':grid?'GRID':ceremony?'PODIUM':'RACE'}</span><time>{formatTime(localMs)}</time></div>
      <RaceMinimap meeting={m} frames={state.racers} ms={ms} phase={state.phase} manual={manual}/>
      <div className="lap-hud" role="status" aria-label={lapHud.description}><small>{lapHud.label}</small><strong>{lapHud.value}</strong></div>
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
     <PlayerControls playing={playing} visible={controls||!playing} position={localMs} duration={end-start} rate={rate} manual={manual} angle={angle} hudSize={hudSize} full={fullDisplay} racers={m.race.racers}
      toggle={togglePlay} seek={value=>jumpTo(start+value)} speed={setRate} camera={setManual} shot={setAngle} hud={setHudSize} fullscreen={()=>void toggleFullscreen()}/>

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
   <SeasonPlaylist revealed={final} meeting={m} activeSegment={segment} chooseSegment={choose} special={special} toggleSpecial={selectCase}/>
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
  <footer>HOLOCRON · GALACTIC RACING {m.version}<details><summary>Build Info</summary><code>{buildInfo?.sha}</code><p>같은 탭 미니 플레이어는 이 격리 데모의 App Shell에서만 유지됩니다. 실제 HOLOCRON 페이지 통합 및 21시 최초 공개 방송은 미구현입니다.</p></details><span>격리 3D 데모 · Production / Credit 미연결</span></footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
