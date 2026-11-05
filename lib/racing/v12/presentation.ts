import type {Meeting} from '../v2/types';
/** Visual phases use finalized jump timestamps. No rank, GAP or official frame
 * is altered. During transit only, the invisible body/streak cursor follows the
 * main route between official jump endpoints; the jump commits once at its tick. */
export function phantomPhase(m:Meeting,ms:number,id?:string){
 const tick=(ms-m.raceStartMs)/m.race.config.tickMs;
 const h=m.wormholes?.find(h=>h.burstPower!==undefined&&(!id||h.id===id)&&tick>=h.startTick&&tick<h.endTick);
 if(!h)return null;
 const start=h.phantomStartTick,age=start==null?-1:(tick-start)*m.race.config.tickMs;
 const jump=h.jumpTick==null?Infinity:(h.jumpTick-(start??h.startTick))*m.race.config.tickMs;
 const phase=start==null||age<0?'charging':age<250?'acceleration':h.cancelled?'charging':age<375?'fade':age<jump?'transit':age<jump+250?'return':'afterburn';
 const opacity=phase==='fade'?Math.max(0,1-(age-250)/125):phase==='transit'?0:phase==='return'?Math.min(1,(age-jump)/250):1;
 const fraction=phase==='transit'?Math.max(0,Math.min(1,(age-375)/Math.max(1,jump-375))):phase==='return'||phase==='afterburn'?1:0;
 const effectProgress=h.fromProgress!=null&&h.toProgress!=null?h.fromProgress+(h.toProgress-h.fromProgress)*fraction:h.entryProgress;
 return {record:h,phase,opacity,age,transitFraction:fraction,effectProgress};
}
