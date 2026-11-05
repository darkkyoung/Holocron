import type {RaceRecord,RacerStatus} from './types';
import type {Passage} from './v5/track';

interface Crossing {readonly progress:number;readonly ms:number}
export interface TimingIndex {readonly race:RaceRecord;readonly crossings:ReadonlyMap<string,readonly Crossing[]>}
export interface LeaderGap {readonly id:string;readonly label:string;readonly seconds:number|null;
 readonly laps:number;readonly status:RacerStatus;readonly sampleMs:number;readonly leaderId:string;
 readonly ownCrossingMs:number|null;readonly leaderCrossingMs:number|null}

/** Once per immutable record, never inside the RAF. Distances are cumulative cm.
 * Shortcut entry/merge anchors retain their recorded piecewise timing. A jump
 * contributes TWO positions at the SAME timestamp, not a fake high-speed line.
 * Future anchors may be indexed, but every lookup is bounded by confirmed time.
 */
export function buildTimingIndex(race:RaceRecord,passages:readonly Passage[]=[]):TimingIndex{
 const crossings=new Map<string,readonly Crossing[]>(),step=race.config.tickMs;
 for(let i=0;i<race.racers.length;i++){
  const id=race.racers[i].id,points:Crossing[]=race.frames.map(f=>({progress:f.racers[i].progress,ms:f.tick*step}));
  for(const p of passages.filter(p=>p.id===id&&p.success)){
   points.push({progress:p.entryProgress,ms:p.entryMs});
   if(p.mergeMs!==null)points.push({progress:p.exitProgress,ms:p.mergeMs});
  }
  for(const jump of race.jumps??[])if(jump.id===id)points.push({progress:jump.from,ms:jump.tick*step},{progress:jump.to,ms:jump.tick*step});
  const result=race.results.find(r=>r.id===id);
  if(result?.status==='FINISHED'&&result.finishMs!==null)points.push({progress:race.config.track.length,ms:result.finishMs});
  points.sort((a,b)=>a.ms-b.ms||a.progress-b.progress);
  crossings.set(id,Object.freeze(points));
 }
 return Object.freeze({race,crossings});
}

/** First official passage of a point; skipped wormhole interval is crossed at
 * the jump tick. No extrapolation before the grid or beyond confirmed frames.
 */
export function crossingAt(index:TimingIndex,id:string,progress:number,asOfMs:number):number|null{
 const points=index.crossings.get(id);
 if(!points?.length||!Number.isFinite(progress)||!Number.isFinite(asOfMs)||progress<points[0].progress)return null;
 let lo=0,hi=points.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(points[mid].progress<progress)lo=mid+1;else hi=mid;}
 const b=points[lo];if(!b||b.ms>asOfMs)return null;
 if(b.progress===progress)return b.ms;
 const a=points[lo-1];if(!a||a.ms>asOfMs)return null;
 const ms=a.ms+(b.ms-a.ms)*(progress-a.progress)/(b.progress-a.progress);
 return Number.isFinite(ms)&&ms<=asOfMs?ms:null;
}

/** HUD uses latest confirmed tick (5Hz caller), not interpolated future motion.
 * Rank/status are the official frame. Special-DSQ remains the ceremony's job;
 * this module never reads sealed final reclassification or future events.
 */
export function gapsToLeader(index:TimingIndex,elapsedMs:number):readonly LeaderGap[]{
 const r=index.race,step=r.config.tickMs;
 const tick=Math.floor(Math.max(0,Math.min(Number.isFinite(elapsedMs)?elapsedMs:0,r.durationTicks*step))/step);
 const frame=r.frames[tick],sampleMs=tick*step;
 if(!frame)return [];
 const leader=frame.racers.filter(x=>x.status==='RACING'||x.status==='FINISHED').sort((a,b)=>a.rank-b.rank)[0];
 const lapLength=r.config.track.length/r.config.track.laps;
 return frame.racers.map(own=>{
  const base={id:own.id,status:own.status,sampleMs,leaderId:leader?.id??'',seconds:null,laps:0,ownCrossingMs:null,leaderCrossingMs:null};
  if(own.status==='DNF'||own.status==='DSQ')return {...base,label:own.status};
  if(!leader)return {...base,label:'—'};
  if(own.id===leader.id)return {...base,label:'LEADER',seconds:0};
  const laps=Math.floor(Math.max(0,leader.progress-own.progress)/lapLength);
  if(laps>0)return {...base,laps,label:`+${laps} LAP${laps>1?'S':''}`};
  const ownCrossingMs=crossingAt(index,own.id,own.progress,sampleMs),leaderCrossingMs=crossingAt(index,leader.id,own.progress,sampleMs);
  if(ownCrossingMs===null||leaderCrossingMs===null)return {...base,label:'—'};
  const delta=ownCrossingMs-leaderCrossingMs;
  // Equal-distance ties can have different first passage times while stopped.
  // Do not turn a negative/unavailable measurement into a fabricated gap.
  if(!Number.isFinite(delta)||delta<-.001)return {...base,label:'—'};
  const seconds=Math.max(0,delta)/1000;
  return {...base,seconds,ownCrossingMs,leaderCrossingMs,label:`+${seconds.toFixed(2)}s`};
 });
}
