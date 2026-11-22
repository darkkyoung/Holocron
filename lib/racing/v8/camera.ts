import {routePoint,usesBranch} from '../v5/track';
import {frameAt} from '../playback';
import type {Meeting,CameraCue} from '../v2/types';

export interface TracksideStation {readonly id:string;readonly label:string;readonly position:readonly [number,number,number]}
// Render-space positions derived from the same Hermite road as the cars. Inside
// bank avoids the outer canyon blocks; elevated lenses clear the low barriers.
export const TV_STATIONS:readonly TracksideStation[]=Object.freeze([
 ['finish','START / FINISH',.08,-50],['turn1','FIRST CORNER',.27,-65],
 ['straight','LONG STRAIGHT',.70,-48],['entry','BRANCH ENTRY',.20,-45],
 ['merge','BRANCH MERGE',.40,-48],['last','LAST CORNER',.92,-50],
].map(([id,label,u,offset])=>{const p={x:0,z:0},t={x:0,z:0};routePoint(Number(u),1,false,p,t);
 return Object.freeze({id:String(id),label:String(label),position:Object.freeze([p.x-t.z*Number(offset),32,p.z+t.x*Number(offset)]) as readonly [number,number,number]});}));

/** Cheap interpolation only while constructing edit lists, not inside RAF. */
function worldAt(m:Meeting,id:string,ms:number):{x:number;z:number}|null{
 let progress:number,branch=false;
 if(ms<m.raceBroadcast!.preshowStartMs){
  const run=m.qualifying.runs.find(r=>r.id===id&&ms>=r.startMs&&ms<r.finishMs);
  if(!run)return null;const elapsed=ms-run.startMs,s=run.samples;
  let lo=0,hi=s.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(s[mid].ms<=elapsed)lo=mid;else hi=mid;}
  const a=s[lo],b=s[hi];progress=a.progress+(b.progress-a.progress)*(elapsed-a.ms)/(b.ms-a.ms||1);
 }else if(ms<m.raceStartMs){progress=m.race.frames[0].racers.find(r=>r.id===id)!.progress;}
 else{
  const r=frameAt(m.race,ms-m.raceStartMs).racers.find(r=>r.id===id);
  if(!r||r.status!=='RACING')return null;progress=r.progress;branch=usesBranch(m.shortcutPassages??[],id,progress);
 }
 const p={x:0,z:0};routePoint(progress+(m.race.config.routeOffset??0)*m.qualifying.lapLength,m.qualifying.lapLength,branch,p,{x:0,z:0});return p;
}
function stationForWindow(m:Meeting,id:string,start:number,end:number){
 const steps=Math.max(1,Math.ceil((end-start)/250));
 const positions=Array.from({length:steps+1},(_,i)=>worldAt(m,id,start+(end-start)*i/steps));
 if(positions.some(p=>!p))return null;
 let choice:TracksideStation|null=null,score=Infinity;
 for(const station of TV_STATIONS){
  const [x,,z]=station.position;const distances=positions.map(p=>Math.hypot(p!.x-x,p!.z-z));
  if(Math.min(...distances)<32||Math.max(...distances)>220)continue;
  // Coverage selection, not stateful damping: bound the angular velocity before playback.
  const vectors=positions.map(p=>{const v=[p!.x-x,-30,p!.z-z],length=Math.hypot(...v);return v.map(x=>x/length);});
  let maxRate=0;for(let i=1;i<vectors.length;i++)maxRate=Math.max(maxRate,Math.acos(Math.min(1,vectors[i].reduce((n,x,j)=>n+x*vectors[i-1][j],0)))*1000*steps/Math.max(1,end-start));
  if(maxRate>Math.PI/2)continue;
  const angles=positions.map(p=>Math.atan2(p!.x-x,p!.z-z));
  const turn=Math.abs(Math.atan2(Math.sin(angles[angles.length-1]-angles[0]),Math.cos(angles[angles.length-1]-angles[0])));
  if(turn>Math.PI*.7)continue;
  const value=distances[Math.floor(distances.length/2)]+Math.max(...distances)*.2;
  if(value<score){score=value;choice=station;}
 }
 return choice;
}
/** Keep event targets/priority; replace side shots and split long holds into 4–7s TV coverage. */
export function editTvCues(m:Meeting,cues:readonly CameraCue[],offset:number,end:number):CameraCue[]{
 const out:CameraCue[]=[];
 for(let i=0;i<cues.length;i++){
  const c=cues[i],until=Math.min(end,cues[i+1]?.atMs??end),duration=until-c.atMs;
  const finish=/FINISH|WINNER|BEST LAP/.test(c.reason),parts=finish?1:Math.max(1,Math.floor(duration/5000));
  for(let j=0;j<parts;j++){
   const atMs=c.atMs+duration*j/parts,stop=c.atMs+duration*(j+1)/parts;
   const station=finish||c.shot==='wide'?null:stationForWindow(m,c.racerId,offset+atMs,offset+stop-1);
   const shot:CameraCue['shot']=finish?'front':station?'trackside':c.shot==='side'?'front':c.shot;
   out.push({...c,atMs,shot,...(station?{stationId:station.id}:{})});
  }
 }
 return out;
}
const manualPlans=new WeakMap<Meeting,Map<string,CameraCue[]>>();
export function prepareManualTv(m:Meeting){
 if(manualPlans.has(m))return;
 const plans=new Map<string,CameraCue[]>();
 for(const r of m.race.racers){const cues:CameraCue[]=[];
  for(let atMs=0;atMs<m.ceremonyStartMs;atMs+=5000){const station=stationForWindow(m,r.id,atMs,Math.min(atMs+4999,m.ceremonyStartMs-1));
   cues.push({atMs,racerId:r.id,shot:station?'trackside':Math.floor(atMs/5000)%2?'front':'chase',...(station?{stationId:station.id}:{}),reason:station?'TV TRACKSIDE':'AUTO COVERAGE FALLBACK'});}
  plans.set(r.id,cues);
 }
 manualPlans.set(m,plans);
}
export function tvCamera(m:Meeting,ms:number,base:CameraCue,manual:string|null,angle:CameraCue['shot']|'auto'):CameraCue{
 if(manual){
  if(angle!=='trackside'&&angle!=='auto')return {...base,shot:angle};
  // Prepared once on record installation. Fixed edit windows are seek-independent.
  const plan=manualPlans.get(m)?.get(manual);
  return plan?.[Math.min(plan.length-1,Math.floor(Math.max(0,ms)/5000))]??{...base,shot:'front',reason:'TV OUT OF COVERAGE · FRONT'};
 }
 const round=m.qualifying.rounds?.find(r=>ms>=r.finishMs+3000&&ms<r.resultEndMs);
 if(round)return {...base,shot:'wide',reason:'ROUND RESULTS WIDE'};
 const b=m.raceBroadcast!;
 if(ms>=b.countdownStartMs&&ms<m.raceStartMs){
  const second=Math.min(4,Math.floor((ms-b.countdownStartMs)/1000));
  return {atMs:b.countdownStartMs+second*1000,racerId:m.race.grid[[0,5,1,0,0][second]],
   shot:(['wide','front','chase','front','wide'] as const)[second],reason:'COUNTDOWN '+(5-second)};
 }
 // Historical production/coast cues can contain side; v0.8 automatic never does.
 return base.shot==='side'?{...base,shot:'front'}:base;
}
