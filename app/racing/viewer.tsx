'use client';
import {useEffect,useState} from 'react';
import {MAIN_SAMPLES} from '@/lib/racing/v5/track-samples';
import {BRANCH_SAMPLES} from '@/lib/racing/v5/track';
import type {Entry,Shot} from '@/lib/racing-broadcast/projection';
import './watch.css';
type View=Shot&{race?:string;offset?:number;start?:number;replayEnd?:number;entries?:Entry[]};
const course=MAIN_SAMPLES.map(p=>p.join(',')).join(' '),branch=BRANCH_SAMPLES.map(p=>p.x+','+p.z).join(' ');
const bounds=MAIN_SAMPLES.reduce((b,[x,z])=>[Math.min(b[0],x),Math.min(b[1],z),Math.max(b[2],x),Math.max(b[3],z)],[Infinity,Infinity,-Infinity,-Infinity]);
const phases:Record<string,string>={GRID:'예선 최종 그리드',PRESHOW:'본경기 프리쇼',RACE:'본경기',FINAL:'공식 최종 순위',FINISH:'완주 · 잠정 순위',WAITING:'공식 기록을 준비하고 있습니다',OFFLINE:'아직 시작한 경기가 없습니다',SCHEDULED:'방송 예정',UNAVAILABLE:'방송 중지','QUALIFYING INTRO':'퀄리파잉 프리쇼','PODIUM overview':'포디엄 입장','PODIUM third':'3위 입장','PODIUM second':'2위 입장','PODIUM first':'우승자 입장','PODIUM winner':'우승자 소개','PODIUM celebration':'포디엄 축하','PODIUM final':'시상식','PODIUM alert':'포디엄 조사 중','PODIUM evidence':'조사 증거 공개','PODIUM verdict':'실격 및 순위 재분류'};
const format=(ms:number)=>[Math.floor(Math.abs(ms)/60000),String(Math.floor(Math.abs(ms)/1000)%60).padStart(2,'0')].join(':');
export default function Viewer(){
 const [archive,setArchive]=useState<{race:string;start:number}[]>([]);
 useEffect(()=>{const abort=new AbortController();fetch('/api/racing/watch?archive=1',{cache:'no-store',credentials:'omit',signal:abort.signal}).then(async r=>{if(r.ok){const v=await r.json() as {races?:{race:string;start:number}[]};setArchive(v.races??[]);}}).catch(()=>{});return ()=>abort.abort();},[]);
 const [view,set]=useState<View>({phase:'WAITING',riders:[]}),[replay,seek]=useState<number|null>(null),[paused,pause]=useState(false),[lost,offline]=useState(false);
 useEffect(()=>{
  const q=new URLSearchParams(location.search),race=q.get('race');let timer:ReturnType<typeof setTimeout>,closed=false;const abort=new AbortController(),anchor=performance.now();
  async function update(){
   try{const params=new URLSearchParams();if(race)params.set('race',race);
    if(replay!==null)params.set('offset',String(Math.min(view.replayEnd??replay,replay+(paused?0:Math.floor(performance.now()-anchor)))));
    const response=await fetch('/api/racing/watch?'+params,{cache:'no-store',credentials:'omit',signal:abort.signal});
    if(!response.ok)throw Error('unavailable');
    const v=await response.json() as View;if(!closed){set(v);offline(false);}
   }catch{if(!closed)offline(true);}
   if(!closed)timer=setTimeout(update,500);
  }
  void update();return ()=>{closed=true;abort.abort();clearTimeout(timer);};
 },[replay,paused,view.replayEnd]);
 const names=new Map(view.entries?.map(e=>[e.slot,e])),ordered=[...(view.riders??[])].sort((a,b)=>(a.rank??99)-(b.rank??99));
 return <section className="race-watch"><header><b>{replay===null?'공식 방송':'다시보기'}</b><strong data-testid="phase">{phases[view.phase]??view.phase}</strong>{view.offset!==undefined&&<time>{view.offset<0?'−':''}{format(view.offset)}</time>}</header>
 {lost&&<p role="status">연결을 기다리는 중입니다. 복귀하면 서버 방송 시점에 맞춥니다.</p>}
 <svg role="img" aria-label="베스퍼 서킷 실시간 위치" viewBox={[bounds[0]-22,bounds[1]-22,bounds[2]-bounds[0]+44,bounds[3]-bounds[1]+44].join(' ')}><polyline points={course}/><polyline points={branch}/>{ordered.filter(r=>r.x!==undefined).map(r=><g key={r.slot}><circle cx={r.x} cy={r.z} r={view.cue?.slot===r.slot?9:6} fill={names.get(r.slot)?.color??'white'}/><title>{names.get(r.slot)?.name}</title></g>)}</svg>
 {view.phase.startsWith('PODIUM')&&<p>{view.cue?.kind==='DSQ'?'재분류된 순위로 재시상합니다.':'포디엄 중계'}</p>}
 {view.cue&&<p><b>{view.cue.kind}</b> · {names.get(view.cue.slot)?.name}</p>}{view.notice&&<p>{view.notice}</p>}
 <ol>{ordered.map(r=><li key={r.slot}><b>{r.rank??'·'}　{names.get(r.slot)?.name}</b> <small>{r.points!==undefined?r.points+'점':r.best!==undefined?(r.best/1000).toFixed(3)+'초':r.lap?'LAP '+r.lap:''} {r.status}</small></li>)}</ol>
 {view.replayEnd!==undefined&&<footer><button onClick={()=>{pause(false);seek(-3600000);}}>예선 다시보기</button><button onClick={()=>{pause(false);seek(0);}}>본경기 다시보기</button>{replay!==null&&<><button onClick={()=>{seek(view.offset??0);pause(!paused);}}>{paused?'재생':'일시정지'}</button><input aria-label="다시보기 위치" type="range" min={-3600000} max={view.replayEnd} value={view.offset??0} onChange={e=>seek(Number(e.target.value))}/><button onClick={()=>seek(null)}>공식 결과</button></>}</footer>}
 {archive.length>0&&<details><summary>완료 경기 다시보기</summary><ul>{archive.map(r=><li key={r.race}><a href={'/racing?race='+encodeURIComponent(r.race)}>{r.race}</a></li>)}</ul></details>}
 </section>;
}
