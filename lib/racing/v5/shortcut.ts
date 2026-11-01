import {randomStream} from '../prng';
import type {State,Emit} from '../events';
import {BRANCH_ENTRY,BRANCH_EXIT,SHORTCUT_RATIO,shortcutProbability,type Passage} from './track';
/** Per-meeting travel state; never writes historical engines. Progress is continuous main-route equivalence. */
export function shortcutTravel(seed:string,version:string,lapLength:number,laps:number,tickMs:number,enabled=true,routeOffset=0){
 const passages:Passage[]=[];
 const active=new Map<string,Passage>();const attempted=new Map<string,number>();
 const rng=new Map<string,()=>number>();
 return {passages,advance(s:State,tick:number,step:number,emit:Emit){
  if(!enabled)return step;
  const lap=Math.floor(Math.max(0,s.progress)/lapLength),entry=lap*lapLength+lapLength*(BRANCH_ENTRY-routeOffset),exit=lap*lapLength+lapLength*(BRANCH_EXIT-routeOffset);
  let physical=step,progress=s.progress,used=0,p=active.get(s.id);
  if(!p&&lap<laps&&progress<entry&&progress+physical>=entry&&attempted.get(s.id)!==lap){
   const distance=entry-progress;physical-=distance;used+=distance;progress=entry;
   let random=rng.get(s.id);if(!random){random=randomStream(seed,`${version}:shortcut:${s.id}`);rng.set(s.id,random);}
   const probability=shortcutProbability(s.rank),success=random()<probability;
   p={id:s.id,lap:lap+1,rank:s.rank,probability,success,entryMs:(tick-1+used/step)*tickMs,mergeMs:null,entryProgress:entry,exitProgress:exit};
   passages.push(p);attempted.set(s.id,lap);emit(s,'SHORTCUT_ENTER');emit(s,success?'SHORTCUT':'SHORTCUT_FAIL');
   if(success)active.set(s.id,p);else p=undefined;
  }
  if(p?.success){
   const remaining=(p.exitProgress-progress)*SHORTCUT_RATIO;
   if(physical>=remaining){used+=remaining;physical-=remaining;progress=p.exitProgress;p.mergeMs=(tick-1+used/step)*tickMs;emit(s,'SHORTCUT_MERGE');active.delete(s.id);}
   else {progress+=physical/SHORTCUT_RATIO;physical=0;}
  }
  return progress+physical-s.progress;
 }};
}
