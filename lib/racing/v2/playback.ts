import {playbackAt} from '../playback';
import type {RacerFrame} from '../types';
import type {Meeting,CameraCue} from './types';
export function meetingAt(m:Meeting,inputMs:number){
  const ms=Number.isFinite(inputMs)?Math.max(0,Math.min(inputMs,m.durationMs)):0;
  if(ms<m.raceStartMs){
    const active=m.qualifying.runs.filter(r=>r.startMs<=ms&&r.finishMs>ms);
    const racers:RacerFrame[]=active.map(r=>{
      const elapsed=ms-r.startMs,s=r.samples;
      let lo=0,hi=s.length-1;
      while(lo+1<hi){const mid=(lo+hi)>>1;if(s[mid].ms<=elapsed)lo=mid;else hi=mid;}
      const a=s[lo],b=s[hi],f=b.ms===a.ms?0:(elapsed-a.ms)/(b.ms-a.ms);
      const incident=r.incident&&elapsed>=r.incident.atMs&&elapsed<r.incident.atMs+r.incident.durationMs;
      return {id:r.id,progress:a.progress+(b.progress-a.progress)*f,rank:0,speed:Math.round((b.progress-a.progress)*1000/(b.ms-a.ms||1)),status:'RACING',motion:incident?'DAMAGED':'CRUISE',damage:0,ultimate:false};
    });
    const completed=m.qualifying.runs.filter(r=>r.finishMs<=ms);
    // Public timing only: never expose future best times while qualifying is running.
    const table=m.race.racers.map(r=>{const laps=completed.filter(l=>l.id===r.id);return {id:r.id,bestMs:Math.min(...laps.filter(l=>l.valid).map(l=>l.lapMs)),laps: laps.length};}).sort((a,b)=>a.bestMs-b.bestMs||a.id.localeCompare(b.id));
    const target=[...racers].sort((a,b)=>{
      const best=Math.min(...table.map(x=>x.bestMs));
      const chance=(x:RacerFrame)=>{const run=active.find(r=>r.id===x.id)!;const elapsed=ms-run.startMs;return elapsed>10000&&elapsed/(x.progress/m.qualifying.lapLength)<best?1:0;};
      return chance(b)-chance(a)||b.progress-a.progress;
    })[0];
    // Fixed six-second windows prevent per-frame qualifying cuts.
    return {ms,phase:(ms<m.qualifying.durationMs?'qualifying':'grid') as 'qualifying'|'grid',racers,table,completed,target:target?.id??m.race.grid[0],raceMs:0,ceremonyMs:0};
  }
  const raceMs=Math.min(ms-m.raceStartMs,m.race.durationTicks*m.race.config.tickMs),race=playbackAt(m.race,raceMs);
  return {ms,phase:(ms<m.ceremonyStartMs?'race':'ceremony') as 'race'|'ceremony',racers:race.racers,table:[],completed:[],target:m.race.grid[0],raceMs,ceremonyMs:Math.max(0,ms-m.ceremonyStartMs)};
}
export function cameraAt(m:Meeting,ms:number,manual:string|null):CameraCue{
  const valid=manual&&m.race.racers.some(r=>r.id===manual)?manual:null;
  if(valid)return {atMs:ms,racerId:valid,shot:'chase',reason:'MANUAL TRACKING'};
  if(ms<m.raceStartMs){const sample=Math.floor(Math.max(0,ms)/6000)*6000;return {atMs:sample,racerId:meetingAt(m,sample).target,shot:sample===0?'wide':'chase',reason:'QUALIFYING · LIVE TIMING'};}
  const raceMs=ms-m.raceStartMs;
  return [...m.cameras].reverse().find(c=>c.atMs<=raceMs)??{atMs:0,racerId:m.race.grid[0],shot:'wide',reason:'GRID'};
}
