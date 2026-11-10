import {frameAt} from '../playback';
import type {Meeting,CameraCue} from '../v2/types';
import type {WormholeRecord} from '../v10/ultimate';
import {tvCamera} from '../v8/camera';

export const CINEMATIC=Object.freeze({charge:3000,visibleBurst:250,fade:125,departure:2000,travel:550,arrival:2000,return:250,follow:2200,smoke:2500,retirement:3500});
type CinematicPhase='charge'|'stabilizing'|'burst'|'fade'|'departure'|'travel'|'arrival'|'return'|'follow'|'failed';
type HyperPlan={id:string;record:WormholeRecord;charge:number;start:number;burst:number;fade:number;depart:number;flight:number;arrival:number;reveal:number;returnEnd:number;end:number;terminal:number;terminalKind:string|null;failedAt:number|null;departureProgress:number;arrivalProgress:number};
type Plan={hyper:HyperPlan[];retirements:{id:string;at:number;leader:boolean}[]};
const cache=new WeakMap<Meeting,Plan>();
const supportsCinematic=(m:Meeting)=>m.version==='galactic-racing-0.13.0'||m.version==='galactic-racing-0.14.0';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Private local replay plan, computed once. A live server must gate each cue at
 * its disclosure time (charge >= T-3s), not send this sealed plan wholesale. */
export function cinematicPlan(m:Meeting):Plan{
 const old=cache.get(m);if(old)return old;
 const dt=m.race.config.tickMs;
 const progress=(id:string,ms:number)=>frameAt(m.race,Math.max(0,ms)).racers.find(r=>r.id===id)!.progress;
 const hyper=(supportsCinematic(m)?m.wormholes??[]:[]).map(h=>{
  const start=h.startTick*dt,burst=(h.phantomStartTick??h.startTick)*dt;
  const terminalEvent=m.race.events.find(e=>e.racerId===h.id&&e.tick>=h.startTick&&['DNF','DSQ','FINISH'].includes(e.kind));
  const terminal=terminalEvent?(terminalEvent.kind==='FINISH'?m.race.results.find(r=>r.id===h.id)!.finishMs!:terminalEvent.tick*dt):Infinity;
  const fade=burst+CINEMATIC.visibleBurst,depart=fade+CINEMATIC.fade,flight=depart+CINEMATIC.departure,arrival=flight+CINEMATIC.travel,reveal=arrival+CINEMATIC.arrival,returnEnd=reveal+CINEMATIC.return;
  const failedAt=h.cancelled&&h.jumpTick===null?Math.min(h.endTick*dt,terminal):null;
  return {id:h.id,record:h,charge:Math.max(0,start-CINEMATIC.charge),start,burst,fade,depart,flight,arrival,reveal,returnEnd,
   end:Math.min(terminal,failedAt!==null?failedAt+CINEMATIC.smoke:Math.max(h.endTick*dt,returnEnd+CINEMATIC.follow)),terminal,terminalKind:terminalEvent?.kind??null,failedAt,
   departureProgress:progress(h.id,depart),arrivalProgress:progress(h.id,arrival)};
 });
 const retirements=supportsCinematic(m)?m.race.events.filter(e=>e.kind==='DNF').map(e=>({id:e.racerId,at:e.tick*dt,leader:m.race.frames[Math.max(0,e.tick-1)]?.racers.find(r=>r.id===e.racerId)?.rank===1})):[];
 const plan={hyper,retirements};cache.set(m,plan);return plan;
}
export function cinematicState(m:Meeting,ms:number,id?:string){
 if(!supportsCinematic(m)||ms>=m.ceremonyStartMs)return null;
 const time=ms-m.raceStartMs,dt=m.race.config.tickMs;
 // A new launch preempts the previous *picture*, never its official physics.
 // For another Hyper, preemption begins with its recorded three-second cue.
 const candidates=cinematicPlan(m).hyper.filter(p=>(!id||p.id===id)&&time>=p.charge&&time<p.end);
 const p=candidates.findLast(p=>m.version!=='galactic-racing-0.14.0'||!m.ultimates?.some(a=>a.startTick*dt>p.start&&time>=a.startTick*dt-(a.type==='hyper'?CINEMATIC.charge:0)));
 if(!p)return null;
 const failed=p.failedAt!==null&&time>=p.failedAt;
 const phase:CinematicPhase=failed?'failed':time<p.start?'charge':p.failedAt!==null||time<p.burst?'stabilizing':time<p.fade?'burst':time<p.depart?'fade':time<p.flight?'departure':time<p.arrival?'travel':time<p.reveal?'arrival':time<p.returnEnd?'return':'follow';
 const opacity=phase==='fade'?1-clamp((time-p.fade)/CINEMATIC.fade):['departure','travel','arrival'].includes(phase)?0:phase==='return'?clamp((time-p.reveal)/CINEMATIC.return):1;
 return {plan:p,id:p.id,time,phase,opacity,masked:opacity<1,charge:phase==='charge'?clamp((time-p.charge)/CINEMATIC.charge):0,smoke:failed?1-clamp((time-p.failedAt!)/CINEMATIC.smoke):0};
}
export function retirementAt(m:Meeting,ms:number,id?:string){const time=ms-m.raceStartMs,events=cinematicPlan(m).retirements,active=(e:Plan['retirements'][number])=>(!id||id===e.id)&&time>=e.at&&time<e.at+CINEMATIC.retirement;return events.find(e=>e.leader&&active(e))??events.find(active)??null;}
/** One arbiter: viewer > P1 DNF > Hyper presentation > physical Ultimate > director. */
export function cinematicCamera(m:Meeting,ms:number,manual:string|null):CameraCue|null{
 if(manual||!supportsCinematic(m)||ms<m.raceStartMs||ms>=m.ceremonyStartMs)return null;
 const time=ms-m.raceStartMs,emergency=cinematicPlan(m).retirements.find(e=>e.leader&&time>=e.at&&time<e.at+CINEMATIC.retirement);
 if(emergency)return {atMs:emergency.at,racerId:emergency.id,shot:'front',reason:'LEADER RETIRES'};
 const ownRetirement=cinematicPlan(m).retirements.find(e=>time>=e.at&&time<e.at+CINEMATIC.retirement&&m.ultimates?.some(a=>a.id===e.id&&a.startTick*250<=e.at&&a.endTick*250===e.at));
 if(ownRetirement)return {atMs:ownRetirement.at,racerId:ownRetirement.id,shot:'front',reason:'ULTIMATE DNF'};
 const finish=cinematicPlan(m).hyper.find(p=>p.terminalKind==='FINISH'&&p.terminal<Math.max(p.record.endTick*m.race.config.tickMs,p.returnEnd+CINEMATIC.follow)&&time>=p.terminal&&time<p.terminal+1500&&
  (m.version!=='galactic-racing-0.14.0'||!m.ultimates?.some(a=>a.startTick*m.race.config.tickMs>p.start&&a.startTick*m.race.config.tickMs<=time)));
 if(finish)return {atMs:finish.terminal,racerId:finish.id,shot:'front',reason:'HYPER FINISH'};
 const state=cinematicState(m,ms);
 if(!state)return null;
 if(m.ultimates?.some(a=>a.id!==state.id&&a.startTick*250>state.plan.start&&time>=a.startTick*250&&time<a.endTick*250))return null;
 const cue:CameraCue={atMs:time,racerId:state.id,shot:'front',reason:'CINEMATIC '+state.phase};
 return state.phase==='follow'?tvCamera(m,ms,cue,state.id,'auto'):cue;
}
