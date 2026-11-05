import type {Meeting,CameraCue} from '../v2/types';
import {tvCamera} from '../v8/camera';
/** Earliest active launch wins overlaps; roster ID breaks an equal-tick tie. */
export function lockedUltimate(m:Meeting,ms:number){
 if(!m.wormholes)return null;
 const tick=(ms-m.raceStartMs)/m.race.config.tickMs;
 return m.ultimates?.filter(a=>tick>=a.startTick&&tick<a.endTick).sort((a,b)=>a.startTick-b.startTick||a.id.localeCompare(b.id))[0]??null;
}
export function wormholePhase(m:Meeting,ms:number,id?:string){
 const tick=(ms-m.raceStartMs)/m.race.config.tickMs;
 const h=m.wormholes?.find(h=>(!id||h.id===id)&&tick>=h.startTick&&tick<h.endTick);
 if(!h)return null;
 const phase=h.jumpTick===null||tick<h.jumpTick-2?'entry':tick<h.jumpTick?'transit':tick<(h.afterburnStartTick??Infinity)?'exit':'afterburn';
 return {record:h,phase};
}
export function ultimateCamera(m:Meeting,ms:number):CameraCue|null{
 const a=lockedUltimate(m,ms);if(!a)return null;
 const w=wormholePhase(m,ms,a.id),base:CameraCue={atMs:ms,racerId:a.id,shot:'front',reason:'ULTIMATE LOCK'};
 if(w&&w.phase!=='afterburn')return {...base,reason:'WORMHOLE '+w.phase.toUpperCase()};
 // Reuses the eight precomputed, per-racer coverage plans, not target scoring.
 return {...tvCamera(m,ms,base,a.id,'auto'),reason:'ULTIMATE LOCK'};
}
