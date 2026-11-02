import {decisions} from '../events';
import type {RaceDynamics} from '../integrator';
import {randomStream} from '../prng';
import type {RaceConfig} from '../types';

export interface UltimatePolicy {
 readonly baseChance:number;readonly rankBonus:number;readonly maxPerRace:number;
 readonly minProgress:number;readonly maxProgress:number;readonly minRemainingLaps:number;
 readonly cooldownSeconds:number;readonly hyperShare:number;
 readonly goldPower:readonly [number,number];readonly goldSeconds:readonly [number,number];
 readonly hyperPower:readonly [number,number];readonly hyperSeconds:readonly [number,number];
 readonly ordinaryResistance:number;readonly majorResistance:number;readonly rampSeconds:number;
}
export const ULTIMATE_POLICY:UltimatePolicy=Object.freeze({
 baseChance:.00015,rankBonus:.01,maxPerRace:2,minProgress:.35,maxProgress:.8,minRemainingLaps:.8,
 cooldownSeconds:18,hyperShare:.1,goldPower:[2200,3200] as const,goldSeconds:[6,11] as const,
 hyperPower:[3400,4200] as const,hyperSeconds:[8,11] as const,
 ordinaryResistance:.95,majorResistance:.25,rampSeconds:.75,
});
export interface UltimateActivation {
 readonly id:string;readonly type:'gold'|'hyper';readonly startTick:number;readonly endTick:number;
 readonly power:number;readonly rankBefore:number;readonly progressBefore:number;readonly remainingLaps:number;
 readonly conditionalKpi:boolean;
}
/** Per-meeting, version-namespaced policy. No final results, bets or profile data. */
export function ultimateDynamics(seed:string,c:RaceConfig,policy:UltimatePolicy=ULTIMATE_POLICY){
 const activations:UltimateActivation[]=[],random=new Map<string,()=>number>(),active=new Map<string,UltimateActivation>();
 const legacy={...c,ultimateBase:0,ultimateRankBonus:0,ordinaryResistance:policy.ordinaryResistance,majorResistance:policy.majorResistance};
 const sample=(range:readonly [number,number],r:()=>number)=>range[0]+Math.floor(r()*(range[1]-range[0]+1));
 const dynamics:RaceDynamics={
  decide(s,tick,config,emit,retire){
   const progress=s.progress/c.track.length,remaining=(c.track.length-s.progress)/(c.track.length/c.track.laps);
   const last=activations.at(-1),eligible=!s.ultimateUsed&&tick>=s.stopUntil&&activations.length<policy.maxPerRace&&
    progress>=policy.minProgress&&progress<=policy.maxProgress&&remaining>=policy.minRemainingLaps&&
    (!last||(tick-last.startTick)*c.tickMs>=policy.cooldownSeconds*1000);
   if(eligible){
    let r=random.get(s.id);if(!r){r=randomStream(seed,`${c.version}:ultimate:${s.id}`);random.set(s.id,r);}
    if(r()<policy.baseChance+policy.rankBonus*((s.rank-1)/7)**2){
     const type=r()<policy.hyperShare?'hyper':'gold',power=sample(type==='hyper'?policy.hyperPower:policy.goldPower,r);
     const seconds=sample(type==='hyper'?policy.hyperSeconds:policy.goldSeconds,r),duration=Math.round(seconds*1000/c.tickMs);
     const a=Object.freeze({id:s.id,type,startTick:tick,endTick:tick+duration,power,rankBefore:s.rank,progressBefore:progress,remainingLaps:remaining,
      conditionalKpi:s.rank>=5&&progress>=.35&&progress<=.8&&remaining>=2});
     activations.push(a);active.set(s.id,a);s.ultimateUsed=true;s.ultimateUntil=a.endTick;s.ultimatePower=power;
     // Existing damage is not repaired; minor slowdown cannot consume the launch.
     s.slowUntil=Math.min(s.slowUntil,tick);emit(s,'ULTIMATE',duration,power);
    }
   }
   decisions(s,tick,legacy,emit,retire);
  },
  power(s,tick){
   const a=active.get(s.id);if(!a||tick>=a.endTick)return undefined;
   const ramp=Math.max(1,policy.rampSeconds*1000/c.tickMs);
   const envelope=Math.min(1,(tick-a.startTick+1)/ramp,(a.endTick-tick)/ramp);
   return Math.round(1000+(a.power-1000)*envelope);
  },
 };
 return {dynamics,activations};
}
