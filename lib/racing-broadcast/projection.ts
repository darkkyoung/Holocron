// Server-only projection. Never serialize a Meeting, frame, event or manifest directly.
import type {Meeting,QualifyingRecord} from '../racing/v2/types';
import {ceremonyState} from '../racing/v9/ceremony';
import {routePoint} from '../racing/v5/track';
export type Entry={slot:string;id:string;name:string;color:string};
export type Rider={slot:string;rank?:number;x?:number;z?:number;status?:string;best?:number;points?:number;lap?:number};
export type Shot={phase:string;riders:Rider[];cue?:{slot:string;kind:string};notice?:string};
function point(progress:number,length:number,branch=false){return routePoint(progress,length,branch,{x:0,z:0},{x:0,z:0});}
export function qualifying(q:QualifyingRecord,t:number,preshow:boolean):Shot{
 if(t>=(q.gridStartMs??q.durationMs))return {phase:preshow?'PRESHOW':'GRID',riders:q.standings.map(r=>({slot:r.id,rank:r.grid,best:r.bestMs??undefined}))};
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
 const riders=frame.racers.map(r=>{
  const offset=(m.race.config.routeOffset??0)*lapLength;
  const branch=m.shortcutPassages?.some(p=>p.id===r.id&&p.success&&p.entryMs<=ms&&(p.mergeMs===null||p.mergeMs>ms));
  return {slot:r.id,rank:r.rank,status:r.status,lap:Math.min(m.race.config.track.laps,Math.max(1,Math.floor(r.progress/lapLength)+1)),...point(r.progress+offset,lapLength,branch)};
 });
 const a=m.ultimates?.find(u=>ms>=u.startTick*dt-(u.type==='hyper'?3000:0)&&ms<u.endTick*dt&&frame.racers.some(r=>r.id===u.id&&r.status==='RACING'));
 return {phase:ms>=m.race.durationTicks*dt?'FINISH':'RACE',riders,...(a?{cue:{slot:a.id,kind:ms<a.startTick*dt?'CHARGE':a.type.toUpperCase()}}:{})};
}
