import {PODIUM_NORMAL_MS,PODIUM_SPECIAL_MS} from '../v9/ceremony';
import {assembleMeeting} from '../v6/simulator';
import {raceSettings,type RaceSettings} from '../v6/config';
import {configV8} from '../v8/simulator';
import {ultimateDynamicsV10} from './ultimate';
export const VERSION_V10='galactic-racing-0.10.0';
export function configV10(input:Partial<RaceSettings>={}){return Object.freeze({...configV8(raceSettings(input)),version:VERSION_V10});}
export function simulateMeetingV10(seed:string,capture=true,input:Partial<RaceSettings>={}){
 const settings=raceSettings(input),config=configV10(settings),u=ultimateDynamicsV10(seed,config);
 const meeting=assembleMeeting(seed,capture,settings,config,'d1',u.dynamics,u.wrapTravel);
 // End effects/locks at the recorded retirement or finish tick, including a
 // finish caused by the jump. Keep planned power/distance separate from actual.
 for(const a of u.activations){
  const terminal=meeting.race.events.find(e=>e.racerId===a.id&&e.tick>=a.startTick&&['FINISH','DNF','DSQ'].includes(e.kind));
  if(terminal)a.endTick=Math.min(a.endTick,terminal.tick);
  const h=u.wormholes.find(h=>h.id===a.id);if(h){h.endTick=a.endTick;if(h.jumpTick===null)h.cancelled=true;}
 }
 // Event duration is the effective, finalized interval, not a provisional wait.
 const race=Object.freeze({...meeting.race,events:Object.freeze(meeting.race.events.map(e=>e.kind==='ULTIMATE'?Object.freeze({...e,durationTicks:u.activations.find(a=>a.id===e.racerId)!.endTick-e.tick}):e))});
 return Object.freeze({...meeting,race,durationMs:meeting.ceremonyStartMs+(meeting.specialDsq?PODIUM_SPECIAL_MS:PODIUM_NORMAL_MS),
  ultimates:Object.freeze(u.activations.map(a=>Object.freeze(a))),wormholes:Object.freeze(u.wormholes.map(h=>Object.freeze(h))),afterburnGainBound:u.afterburnGainBound});
}
