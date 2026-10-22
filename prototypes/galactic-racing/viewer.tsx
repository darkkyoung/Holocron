import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {playbackAt} from '../../lib/racing/playback';
import type {RaceRecord,EventKind,Motion} from '../../lib/racing/types';
import {Track} from './track';
import './viewer.css';

const labels:Record<EventKind,string>={START:'그리드 출발',SLIPSTREAM:'슬립스트림 진입',BOOST:'부스트',SHORTCUT:'지름길 통과',SHORTCUT_FAIL:'지름길 실패',MINOR:'경미한 접촉',MEDIUM:'스핀 · 중간 사고',MAJOR:'중대 사고',PIT:'피트 수리',PENALTY:'타임 페널티',DNF:'리타이어',DSQ:'실격',ULTIMATE:'ULTIMATE 발동',LEAD:'선두 교체',FINISH:'결승선 통과'};
const motions:Record<Motion,string>={CRUISE:'주행',SLIPSTREAM:'슬립스트림',BOOST:'부스트',ULTIMATE:'ULTIMATE',DAMAGED:'사고 감속',PIT:'피트 수리',PENALTY:'페널티',STOPPED:'정지'};
function clock(ms:number){return `${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}`;}

function Viewer({race,digest}:{race:RaceRecord;digest:string}){
  const [elapsed,setElapsed]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
  const anchor=useRef<number|null>(null),duration=race.durationTicks*race.config.tickMs;
  const done=elapsed>=duration;
  useEffect(()=>{
    if(!playing||done)return;
    let frame:number;
    const loop=(now:number)=>{
      const delta=anchor.current===null?0:(now-anchor.current)*speed;
      setElapsed(t=>Math.min(duration,t+delta));
      anchor.current=now;frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);
    return ()=>{cancelAnimationFrame(frame);anchor.current=null;};
  },[playing,speed,duration,done]);
  const view=playbackAt(race,elapsed),leader=view.racers.find(r=>r.rank===1)!;
  const recent=view.events.filter(e=>e.kind!=='START'&&e.kind!=='SLIPSTREAM').slice(-5).reverse();
  const winner=race.racers.find(r=>r.id===race.results[0].id)!;
  const lap=Math.min(race.config.track.laps,Math.floor(Math.max(0,leader.progress)/(race.config.track.length/race.config.track.laps))+1);
  return <main>
    <header><a className="brand" href="#top">HOLOCRON<span> / RACING LAB</span></a><span className="local">LOCAL PROTOTYPE <i/> 9R-A</span></header>
    <section className="intro" id="top"><div><p className="eyebrow">ORBITAL BROADCAST · 001</p><h1>GALACTIC <em>RACING</em></h1><p className="description">8명의 레이서. 한 번 결정된 레이스. 마지막 코너까지 이어지는 순위 경쟁.</p></div><div className="session"><span>VESPER RING</span><strong>베스퍼 링</strong><small>예선 그리드 · 동일 기본 성능</small></div></section>
    <section className="broadcast" aria-label="레이스 중계">
      <div className="track-panel"><div className="track-bar"><span className={playing&&!view.finished?'status active':'status'}>{view.finished?'FINISHED':playing?'REPLAY RUNNING':elapsed===0?'GRID READY':'PAUSED'}</span><span>LAP <b>{lap}</b> / 3</span><span className="mono">{clock(elapsed)} <span className="muted">/ {clock(duration)}</span></span></div>
        <Track race={race} racers={view.racers} finished={view.finished}/>
        <div className="track-footer"><span><i className="yellow-dot"/> {view.finished?`${winner.name} 우승`:`선두 ${race.racers.find(r=>r.id===leader.id)!.name}`}</span><span>경기 진행 <b>{Math.min(100,Math.floor(Math.max(0,leader.progress)/race.config.track.length*100))}%</b></span></div>
      </div>
      <aside className="standings"><div className="panel-heading"><h2>순위 타워</h2><span>8 RACERS</span></div><div className="column-label"><span>POS / RACER</span><span>상태 · 속도</span></div>
        <ol>{[...view.racers].sort((a,b)=>a.rank-b.rank).map(r=>{const meta=race.racers.find(x=>x.id===r.id)!;return <li key={r.id} className={r.rank===1?'leader':''} style={{'--racer':meta.color} as React.CSSProperties}><span className="position">{r.rank.toString().padStart(2,'0')}</span><div className="racer-meta"><strong>{meta.name}<small> #{race.racers.indexOf(meta)+1}</small></strong><span>{meta.vehicle}</span><div className="mini-progress"><i style={{width:`${Math.max(0,r.progress)/race.config.track.length*100}%`}}/></div></div><div className="racer-status"><strong className={r.ultimate?'ultimate':''}>{r.status==='RACING'?motions[r.motion]:r.status}</strong><small>{r.status==='RACING'?`${Math.round(r.speed*.036)} km/h`:`GRID ${race.grid.indexOf(r.id)+1}`}</small></div></li>;})}</ol>
      </aside>
    </section>
    <section className="controls" aria-label="타임라인 재생 제어"><div className="control-row"><button className="primary" disabled={view.finished} onClick={()=>setPlaying(v=>!v)}>{playing&&!view.finished?'Ⅱ 일시정지':'▶ 중계 재생'}</button><button onClick={()=>{setPlaying(false);setElapsed(0);anchor.current=null;}}>↺ 처음부터</button><label>재생 속도 <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><span className="replay-note">Replay는 동일한 경기 기록을 재생합니다.</span></div><label className="scrub"><span className="sr-only">경기 재생 위치</span><input type="range" min="0" max={duration} step={race.config.tickMs} value={elapsed} onChange={e=>{setPlaying(false);setElapsed(Number(e.target.value));}}/><span>{clock(elapsed)} / {clock(duration)}</span></label></section>
    <section className="lower"><div className="event-panel"><div className="panel-heading"><h2>레이스 로그</h2><span>EVENT FEED</span></div><ul aria-label="현재 시점까지의 주요 이벤트">{recent.length?recent.map((e,i)=><li key={`${e.tick}-${e.racerId}-${e.kind}-${i}`}><time>{clock(e.tick*race.config.tickMs)}</time><span className={e.kind==='ULTIMATE'?'ultimate':e.kind==='MAJOR'||e.kind==='DNF'||e.kind==='DSQ'?'danger':''}>{labels[e.kind]}</span><strong>{race.racers.find(r=>r.id===e.racerId)!.name}</strong></li>):<li className="empty">신호 대기 중. 중계 재생을 눌러 레이스를 시작하세요.</li>}</ul></div>
      <div className="record-panel"><div className="panel-heading"><h2>{view.finished?'최종 결과':'경기 기록'}</h2><span>LOCKED RESULT</span></div>{view.finished?<ol className="final-results">{race.results.map(r=><li key={r.id}><b>{r.position}</b><span>{race.racers.find(x=>x.id===r.id)!.name}</span><small>{r.finishMs===null?r.status:`${(r.finishMs/1000).toFixed(3)}s`}</small></li>)}</ol>:<><dl><div><dt>Seed</dt><dd>{race.seed}</dd></div><div><dt>Simulator</dt><dd>{race.simulatorVersion}</dd></div><div><dt>Record SHA-256</dt><dd title={digest}>{digest.slice(0,24)}…</dd></div></dl><p>결과는 로컬 서버 시작 시 한 번 생성됩니다.<br/>우승자 선택·재추첨·Credit 거래 기능은 없습니다.</p><a href="/race.json" download="race.json">기록 JSON 다운로드 ↗</a></>}</div>
    </section><footer>HOLOCRON LAB · ORIGINAL RACERS & CIRCUIT<span>오프라인 밸런스 실험 / Production 미연결</span></footer>
  </main>;
}

const root=createRoot(document.getElementById('root')!);
root.render(<p className="loading">경기 기록을 불러오는 중…</p>);
fetch('/race.json').then(async response=>{
  if(!response.ok)throw Error('RECORD_UNAVAILABLE');
  const text=await response.text(),hash=response.headers.get('X-Race-SHA256');
  // Server-generated byte digest for offline verification, not a signature or
  // a client-side authority claim. Replay never submits a result to the server.
  if(!hash||!/^[a-f0-9]{64}$/.test(hash))throw Error('RECORD_DIGEST_MISSING');
  const race=JSON.parse(text) as RaceRecord;
  if(!Array.isArray(race.frames)||race.frames.length!==race.durationTicks+1)throw Error('INVALID_TIMELINE');
  root.render(<Viewer race={race} digest={hash}/>);
}).catch(()=>root.render(<p role="alert" className="loading">경기 기록을 검증하지 못했습니다. 로컬 서버의 실행 결과를 확인하세요.</p>));
