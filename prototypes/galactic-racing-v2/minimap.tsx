import {useMemo} from 'react';
import type {Meeting} from '../../lib/racing/v2/types';
import type {RacerFrame} from '../../lib/racing/types';
import {route,point} from './track';
import {finishIndex,displayedProgress} from '../../lib/racing/v4/presentation';

const samples=Array.from({length:145},(_,i)=>route.getPointAt(i/144));
const bounds={
  minX:Math.min(...samples.map(v=>v.x)),maxX:Math.max(...samples.map(v=>v.x)),
  minZ:Math.min(...samples.map(v=>v.z)),maxZ:Math.max(...samples.map(v=>v.z)),
};
const scale=Math.min(168/(bounds.maxX-bounds.minX),98/(bounds.maxZ-bounds.minZ));
function coord(x:number,z:number){
  return {x:10+(x-bounds.minX)*scale,y:10+(z-bounds.minZ)*scale};
}
const d=samples.map((v,i)=>{
  const p=coord(v.x,v.z);return (i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2);
}).join(' ')+' Z';

export default function RaceMinimap({meeting,frames,ms,phase,manual}:{
  meeting:Meeting;frames:readonly RacerFrame[];ms:number;
  phase:string;manual:string|null;
}){
  const finish=useMemo(()=>finishIndex(meeting.race),[meeting]);
  if(phase==='ceremony'||phase==='grid')return null;
  const lapLength=meeting.race.config.track.length/meeting.race.config.track.laps;
  const elapsed=Math.max(0,ms-meeting.raceStartMs);
  return <div className="track-minimap" aria-label="트랙 미니맵: 8명의 레이서 위치">
    <div className="minimap-heading"><span>TRACK MAP</span><small>{phase==='qualifying'?'QUALI':'3 LAPS'}</small></div>
    <svg viewBox="0 0 190 130" role="img" aria-label="트랙 위 선수들의 현재 위치">
      <path d={d} fill="none" stroke="#3e546c" strokeWidth="8" strokeLinejoin="round"/>
      <path d={d} fill="none" stroke="#b8c1cc" strokeWidth="2" strokeLinejoin="round"/>
      {frames.map(frame=>{
        const meta=meeting.race.racers.find(r=>r.id===frame.id);
        if(!meta)return null;
        const progress=phase==='race'?displayedProgress(meeting.race,frame,elapsed,finish):frame.progress;
        const position=point(progress,lapLength).p,p=coord(position.x,position.z);
        const selected=manual===frame.id;
        return <g key={frame.id}>
          {selected&&<circle cx={p.x} cy={p.y} r="8.5" fill="none" stroke="#fff" strokeWidth="1.8"/>}
          <circle cx={p.x} cy={p.y} r={selected?5.2:4.2} fill={meta.color}
            stroke="#0b1420" strokeWidth="1.5" opacity={frame.status==='DNF'||frame.status==='DSQ'?.46:1}/>
        </g>;
      })}
    </svg>
  </div>;
}
