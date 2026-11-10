import {decisions} from '../events';
import type {RaceDynamics} from '../integrator';
import {randomStream} from '../prng';
import type {RaceConfig} from '../types';
import {ULTIMATE_POLICY,type UltimateActivation,type UltimatePolicy} from '../v9/ultimate';
import type {shortcutTravel} from '../v5/shortcut';
import {BRANCH_ENTRY,SHORTCUT_RATIO} from '../v5/track';
import type {RaceTravel} from '../travel';

/** Gold and launch frequency are exactly the accepted v0.9 policy. */
export {ULTIMATE_POLICY};
export const WORMHOLE_POLICY=Object.freeze({jumpFraction:[.1,.2] as const,entrySeconds:1,
 exitSeconds:.5,afterburnSeconds:3,afterburnPower:[1800,2200] as const,maxEntrySeconds:8});
export interface HyperMotionPolicy {
 readonly jumpFraction:readonly [number,number];readonly entrySeconds:number;readonly exitSeconds:number;
 readonly afterburnSeconds:number;readonly afterburnPower:readonly [number,number];readonly maxEntrySeconds:number;
 /** v12 only: one recorded 250ms burst, followed by a bounded jump. */
 readonly phantomBurstPower?:number;
 /** v12 safety governor, based only on the shared pre-step live field. */
 readonly maxLiveLeadFraction?:number;
}
export interface WormholeRecord {
 readonly id:string;readonly startTick:number;readonly requestedJump:number;readonly power:number;
 readonly entryProgress:number;readonly jumpTick:number|null;readonly fromProgress:number|null;
 readonly toProgress:number|null;readonly jumpDistance:number;readonly afterburnStartTick:number|null;
 readonly endTick:number;readonly cancelled:boolean;
 readonly afterburnExtraPhysical:number;
 readonly phantomStartTick?:number|null;readonly burstPower?:number;readonly burstExtraPhysical?:number;
 readonly leadLimited?:boolean;readonly endReason?:'live-lead-governor';
}
type Mutable<T>={-readonly [K in keyof T]:T[K]};

/** Launch policy is separate from the accepted Gold/wormhole motion contract. */
export interface UltimateLaunchRule {
 readonly policy:UltimatePolicy;
 /** Opt-in v13 rule: a major incident may penalize, but not DSQ an active Ultimate. */
 readonly protectActiveFromDsq?:boolean;
 readonly eligible:(progress:number,remainingLaps:number)=>boolean;
 readonly weight:(progress:number)=>number;
 /** Optional versioned stochastic frequency tuning; absent keeps old engines exact. */
 readonly firstChanceScale?:number;
 readonly secondChanceScale?:number;
 readonly conditional:(rank:number,progress:number,remainingLaps:number)=>boolean;
}
export const LAUNCH_V10:UltimateLaunchRule=Object.freeze({policy:ULTIMATE_POLICY,
 eligible:(p:number,r:number)=>p>=ULTIMATE_POLICY.minProgress&&p<=ULTIMATE_POLICY.maxProgress&&r>=ULTIMATE_POLICY.minRemainingLaps,
 weight:()=>1,conditional:(rank:number,p:number,r:number)=>rank>=5&&p>=.35&&p<=.8&&r>=2});
export function ultimateDynamicsV10(seed:string,c:RaceConfig){return wormholeDynamics(seed,c,LAUNCH_V10);}
/** Reused by versioned launch policies; no final result or viewer state inputs. */
export function wormholeDynamics(seed:string,c:RaceConfig,launch:UltimateLaunchRule,w:HyperMotionPolicy=WORMHOLE_POLICY){
 const policy=launch.policy,lap=c.track.length/c.track.laps;
 const maxPace=Math.max(1000,...(c.sections??[]).map(s=>s.pace));
 // Begin the visible burst only where the next three ticks cannot acquire a
 // branch. Existing branch travel is completed normally; no ownership reset.
 const entryTravelBound=c.baseStep*maxPace/1000*1.035*((w.phantomBurstPower??1000)/1000+2)/SHORTCUT_RATIO;
 if(w.maxLiveLeadFraction!==undefined){
  const maxStep=c.baseStep*maxPace/1000*1.035*Math.max(w.phantomBurstPower??1000,w.afterburnPower[1],c.boostPower??1200,c.slipstreamPower)/1000/SHORTCUT_RATIO;
  if(w.maxLiveLeadFraction<=0||w.maxLiveLeadFraction>=1||maxStep>=lap*(1-w.maxLiveLeadFraction))throw Error('HYPER_LEAD_MARGIN_TOO_SMALL');
 }
 const safeStart=(progress:number)=>{const entry=lap*(BRANCH_ENTRY-(c.routeOffset??0));const next=entry+(Math.floor((progress-entry)/lap)+1)*lap;return next-progress>entryTravelBound;};
 const activations:Mutable<UltimateActivation>[]=[],wormholes:Mutable<WormholeRecord>[]=[];
 const random=new Map<string,()=>number>(),active=new Map<string,Mutable<UltimateActivation>>(),hyper=new Map<string,Mutable<WormholeRecord>>();
 const leadCeilings=new Map<string,number>();
 const legacy={...c,ultimateBase:0,ultimateRankBonus:0,ordinaryResistance:policy.ordinaryResistance,majorResistance:policy.majorResistance};
 const ticks=(seconds:number)=>Math.round(seconds*1000/c.tickMs);
 const sample=(range:readonly [number,number],r:()=>number)=>range[0]+Math.floor(r()*(range[1]-range[0]+1));
 const dynamics:RaceDynamics={
  ...(w.maxLiveLeadFraction===undefined?{}:{beforeTick(states){
   let lowest=Infinity,second=Infinity,lowestId='';
   for(const x of states)if(x.status==='RACING'||x.status==='FINISHED'){
    if(x.progress<lowest){second=lowest;lowest=x.progress;lowestId=x.id;}else second=Math.min(second,x.progress);
   }
   for(const own of states)leadCeilings.set(own.id,(own.id===lowestId?second:lowest)+lap*w.maxLiveLeadFraction!);
  }}),
  decide(s,tick,_config,emit,retire){
   const progress=s.progress/c.track.length,remaining=(c.track.length-s.progress)/lap,last=activations.at(-1);
   const eligible=!s.ultimateUsed&&tick>=s.stopUntil&&activations.length<policy.maxPerRace&&launch.eligible(progress,remaining)&&(!last||(tick-last.startTick)*c.tickMs>=policy.cooldownSeconds*1000);
   if(eligible){
    let r=random.get(s.id);if(!r){r=randomStream(seed,`${c.version}:ultimate:${s.id}`);random.set(s.id,r);}
    const frequencyScale=activations.length===0?(launch.firstChanceScale??1):(launch.secondChanceScale??1);
    if(r()<(policy.baseChance+policy.rankBonus*((s.rank-1)/7)**2)*launch.weight(progress)*frequencyScale){
     const type=r()<policy.hyperShare?'hyper':'gold',power=sample(type==='hyper'?w.afterburnPower:policy.goldPower,r);
     const duration=type==='hyper'?ticks(w.maxEntrySeconds+w.exitSeconds+w.afterburnSeconds):ticks(sample(policy.goldSeconds,r));
     const a:Mutable<UltimateActivation>={id:s.id,type,startTick:tick,endTick:tick+duration,power,rankBefore:s.rank,progressBefore:progress,remainingLaps:remaining,
      conditionalKpi:launch.conditional(s.rank,progress,remaining)};
     activations.push(a);active.set(s.id,a);s.ultimateUsed=true;s.ultimateUntil=a.endTick;s.ultimatePower=power;s.slowUntil=Math.min(s.slowUntil,tick);
     if(type==='hyper'){
      const h={id:s.id,startTick:tick,requestedJump:Math.round(lap*(w.jumpFraction[0]+r()*(w.jumpFraction[1]-w.jumpFraction[0]))),power,
       entryProgress:s.progress,jumpTick:null,fromProgress:null,toProgress:null,jumpDistance:0,afterburnStartTick:null,endTick:a.endTick,cancelled:false,afterburnExtraPhysical:0,
       ...(w.phantomBurstPower?{phantomStartTick:null,burstPower:w.phantomBurstPower,burstExtraPhysical:0}:{})};
      wormholes.push(h);hyper.set(s.id,h);
     }
     emit(s,'ULTIMATE',duration,power);
    }
   }
   decisions(s,tick,legacy,emit,launch.protectActiveFromDsq?(r,status)=>status==='DSQ'&&tick<r.ultimateUntil?false:retire(r,status):retire);
  },
  power(s,tick){
   const a=active.get(s.id);if(!a||tick>=a.endTick)return undefined;
   const h=hyper.get(s.id);
   if(h&&s.progress>=(leadCeilings.get(s.id)??Infinity)){
    h.endTick=a.endTick=s.ultimateUntil=tick;h.endReason='live-lead-governor';h.leadLimited=true;
    if(h.jumpTick===null)h.cancelled=true;
    return 1000;
   }
   if(h){if(h.phantomStartTick!=null&&tick===h.phantomStartTick+1)return h.burstPower;return h.afterburnStartTick!==null&&tick>=h.afterburnStartTick?a.power:1000;}
   const ramp=Math.max(1,policy.rampSeconds*1000/c.tickMs),envelope=Math.min(1,(tick-a.startTick+1)/ramp,(a.endTick-tick)/ramp);
   return Math.round(1000+(a.power-1000)*envelope);
  },
  measureStep(s,tick,step,unboosted){const h=hyper.get(s.id);if(h){if(h.phantomStartTick!=null&&tick===h.phantomStartTick+1)h.burstExtraPhysical!+=Math.max(0,step-unboosted);if(h.afterburnStartTick!==null&&tick>=h.afterburnStartTick&&tick<h.endTick)h.afterburnExtraPhysical+=Math.max(0,step-unboosted);}},
 };
 function wrapTravel(base:ReturnType<typeof shortcutTravel>):RaceTravel{return {advance(s,tick,step,emit){
  const distance=base.advance(s,tick,step,emit),h=hyper.get(s.id),a=active.get(s.id);
  if(!h||!a||h.jumpTick!==null||h.cancelled||tick>=a.endTick)return distance;
  const from=s.progress+distance;
  if(w.phantomBurstPower){
   if(tick>=h.startTick+ticks(w.maxEntrySeconds)||from>=c.track.length){h.cancelled=true;h.endTick=a.endTick=s.ultimateUntil=tick;return distance;}
   if(h.phantomStartTick===null){if(!base.passages.some(p=>p.id===s.id&&p.success&&p.mergeMs===null)&&safeStart(from))h.phantomStartTick=tick;return distance;}
   if(tick<h.phantomStartTick!+ticks(w.entrySeconds))return distance;
  }else if(tick<h.startTick+ticks(w.entrySeconds))return distance;
  // No stale branch ownership: merge normally before a jump. Timeout cancels,
  // never teleports out of a branch or grants an unbounded waiting boost.
  if(tick>=h.startTick+ticks(w.maxEntrySeconds)||from>=c.track.length){h.cancelled=true;h.endTick=a.endTick=s.ultimateUntil=tick;return distance;}
  if(base.passages.some(p=>p.id===s.id&&p.success&&p.mergeMs===null))return distance;
  const ceiling=leadCeilings.get(s.id)??Infinity;
  if(from>=ceiling){h.cancelled=true;h.leadLimited=true;h.endReason='live-lead-governor';h.endTick=a.endTick=s.ultimateUntil=tick;return distance;}
  const to=Math.min(c.track.length,from+h.requestedJump,ceiling);
  if(to<Math.min(c.track.length,from+h.requestedJump))h.leadLimited=true;
  h.jumpTick=tick;h.fromProgress=from;h.toProgress=to;h.jumpDistance=to-from;
  h.afterburnStartTick=tick+ticks(w.exitSeconds);h.endTick=a.endTick=s.ultimateUntil=h.afterburnStartTick+ticks(w.afterburnSeconds);
  emit(s,'WORMHOLE',0,h.jumpDistance);
  return {distance:distance+h.jumpDistance,jump:{id:s.id,tick,from,to}};
 }};}
 // A conservative same-step marginal upper bound, including the shortest road.
 // Not a counterfactual final lead: that also depends on incidents and rivals.
 const afterburnGainBound= Math.ceil(c.baseStep*maxPace/1000*1.035*(w.afterburnPower[1]/1000-1)*ticks(w.afterburnSeconds)/SHORTCUT_RATIO);
 return {dynamics,activations,wormholes,wrapTravel,afterburnGainBound};
}
