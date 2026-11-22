// Server-only projection. Never serialize a Meeting, frame, event or manifest directly.
import type {Meeting,QualifyingRecord} from '../racing/v2/types';
import {ceremonyState} from '../racing/v9/ceremony';
import {routePoint} from '../racing/v5/track';
import {buildTimingIndex,gapsToLeader,type TimingIndex} from '../racing/gap';
import {configV14} from '../racing/v14/simulator';
const grid=configV14();
const indices=new WeakMap<Meeting,TimingIndex>();
export type Entry={slot:string;id:string;name:string;color:string};
export type Rider={slot:string;rank?:number;x?:number;z?:number;status?:string;best?:number;points?:number;lap?:number;yaw?:number;gap?:string;warpHidden?:true};
export type Shot={phase:string;riders:Rider[];cue?:{slot:string;kind:string};cameraSlot?:string;notice?:string};
function point(progress:number,length:number,branch=false){const dir={x:0,z:0};const pos=routePoint(progress,length,branch,{x:0,z:0},dir);return {...pos,yaw:Math.atan2(dir.x,dir.z)};}
function gridPoint(rank:number,length:number){
 const p=point((grid.routeOffset??0)*length-(grid.gridLeadIn??0)-(rank-1)*grid.gridGap,length);
 const lane=grid.gridLanes?.[rank-1]??0;
 return {...p,x:p.x-Math.cos(p.yaw)*lane,z:p.z+Math.sin(p.yaw)*lane};
}
export function qualifying(q:QualifyingRecord,t:number,preshow:boolean):Shot{
 if(t>=(q.gridStartMs??q.durationMs))return {phase:preshow?'PRESHOW':'GRID',riders:q.standings.map(r=>({slot:r.id,rank:r.grid,best:r.bestMs??undefined,...gridPoint(r.grid,q.lapLength)}))};
 const round=q.rounds?.filter(r=>r.startMs<=t).at(-1);
 const riders=q.runs.filter(r=>r.round===1).map(({id})=>{
  const runs=q.runs.filter(r=>r.id===id&&r.startMs<=t),done=runs.filter(r=>r.finishMs<=t&&r.valid);
  const active=runs.at(-1),sample=active?.samples.filter(s=>s.ms<=t-active.startMs).at(-1);
  return {slot:id,...(sample?point(sample.progress,q.lapLength):{}),best:done.length?Math.min(...done.map(r=>r.lapMs)):undefined};
 });
 riders.sort((a,b)=>(a.best??Infinity)-(b.best??Infinity)||a.slot.localeCompare(b.slot));
 return {phase:round?'QUALIFYING R'+round.round:'QUALIFYING INTRO',riders};
}
export function mainShot(m:Meeting,ms:number,official:boolean):Shot{
 const local=m.raceStartMs+ms,dt=m.race.config.tickMs,lapLength=m.race.config.track.length/m.race.config.track.laps;
 if(local>=m.ceremonyStartMs){
  const c=ceremonyState(m,local);
  const order=c.reclassified?m.official:m.race.results;
  return {phase:official?'FINAL':'PODIUM '+c.stage,riders:(official?m.official:order.filter(r=>c.visibleRanks.includes(r.position-1))).map(r=>({slot:r.id,rank:r.position,status:r.status,...(official?{points:m.official.find(x=>x.id===r.id)!.points}:{})})),
   ...(c.evidence&&m.specialDsq?{notice:m.specialDsq.reason+' · '+m.specialDsq.evidence}:{}),
   ...(c.reclassified&&m.specialDsq?{cue:{kind:'DSQ',slot:m.specialDsq.id}}:{})};
 }
 const tick=Math.floor(ms/dt),frame=m.race.frames[Math.min(tick,m.race.frames.length-1)];
 let idx=indices.get(m);if(!idx){idx=buildTimingIndex(m.race,m.shortcutPassages);indices.set(m,idx);}
 const gaps=gapsToLeader(idx,ms);
 const riders=frame.racers.map(r=>{
  const offset=(m.race.config.routeOffset??0)*lapLength;
  const branch=m.shortcutPassages?.some(p=>p.id===r.id&&p.success&&p.entryMs<=ms&&(p.mergeMs===null||p.mergeMs>ms));
  // A committed jump may affect the picture only after its actual tick.
  const jumped=m.race.jumps?.find(j=>j.id===r.id&&j.tick<=tick&&ms-j.tick*dt<4000);
  const pos=point(r.progress+offset,lapLength,branch);
  const t=Math.max(0,Math.min(1,ms/6000)),lane=(m.race.config.gridLanes?.[m.race.grid.indexOf(r.id)]??0)*(1-t*t*(3-2*t));
  pos.x-=Math.cos(pos.yaw)*lane;pos.z+=Math.sin(pos.yaw)*lane;
  return {...(jumped&&r.status==='RACING'?{warpHidden:true as const}:{}),slot:r.id,rank:r.rank,status:r.status,gap:gaps.find(g=>g.id===r.id)?.label,lap:Math.min(m.race.config.track.laps,Math.max(1,Math.floor(r.progress/lapLength)+1)),...pos};
 });
 const a=m.ultimates?.findLast(u=>ms>=u.startTick*dt-(u.type==='hyper'?3000:0)&&ms<u.endTick*dt&&frame.racers.some(r=>r.id===u.id&&r.status==='RACING'));
 const retirement=m.race.events.find(e=>e.kind==='DNF'&&e.tick<=tick&&ms-e.tick*dt<3500&&m.race.frames[Math.max(0,e.tick-1)].racers.find(r=>r.id===e.racerId)?.rank===1);
 return {cameraSlot:retirement?.racerId??a?.id??riders.find(r=>r.rank===1)?.slot,phase:ms>=m.race.durationTicks*dt?'FINISH':'RACE',riders,...(a?{cue:{slot:a.id,kind:ms<a.startTick*dt?'CHARGE':a.type.toUpperCase()}}:{})};
}
