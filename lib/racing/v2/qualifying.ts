import {RACERS} from '../config';
import {randomStream,qualifying} from '../prng';
import {CONFIG_V2,VERSION} from './config';
import type {RaceConfig} from '../types';
import type {QualifyingRun,QualifyingRecord,QualifyingIncident} from './types';

/** Three measured laps per racer; staggered round-robin launches, never two copies of a racer on track. */
export function runQualifying(seed:string,capture=true,c:RaceConfig=CONFIG_V2,version=VERSION):QualifyingRecord {
  const order=qualifying(seed,`${version}:launch-order`,RACERS.map(r=>r.id));
  const runs:QualifyingRun[]=[],lastFinish=new Map<string,number>();
  const lapLength=c.track.length/c.track.laps;
  let nextStart=0;
  for(let round=1;round<=3;round++)for(const id of order){
    const rng=randomStream(seed,`${version}:qualifying:${round}:${id}`);
    const startMs=Math.max(nextStart,(lastFinish.get(id)??-6000)+6000);
    // At most one incident in a lap (~22%); far lower than race event pressure.
    const roll=rng(),kind:QualifyingIncident|null=c.gentleIncidents?
      roll<.01?'INVALID':roll<.035?'OFF_TRACK':roll<.055?'WALL':roll<.10?'GLITCH':null:
      roll<.025?'INVALID':roll<.08?'OFF_TRACK':roll<.14?'WALL':roll<.22?'GLITCH':null;
    const incident=kind?{kind,atMs:15000+Math.floor(rng()*35000),
      durationMs:c.gentleIncidents?(kind==='OFF_TRACK'?2000:kind==='WALL'?1500:1000):
        kind==='OFF_TRACK'?4000:kind==='WALL'?2500:1500}:null;
    const form=985+Math.floor(rng()*31),samples:{ms:number;progress:number}[]=[];
    let progress=0,ms=0;
    if(capture)samples.push({ms,progress});
    while(progress<lapLength&&ms<150000){
      const pace=c.sections!.find(z=>progress/lapLength<z.end)!.pace;
      const impaired=incident&&ms>=incident.atMs&&ms<incident.atMs+incident.durationMs;
      const step=Math.floor(c.baseStep*pace/1000*form/1000*(985+Math.floor(rng()*31))/1000*(impaired?(c.gentleIncidents?(kind==='GLITCH'?.85:kind==='OFF_TRACK'?.72:.76):.35):1));
      const prior=progress;progress=Math.min(lapLength,progress+step);
      ms+=progress===lapLength?Math.max(1,Math.round((lapLength-prior)/step*c.tickMs)):c.tickMs;
      if(capture)samples.push({ms,progress});
    }
    if(progress<lapLength)throw Error('QUALIFYING_BOUND_EXCEEDED');
    const finishMs=startMs+ms;
    runs.push({id,round,startMs,finishMs,lapMs:ms,valid:kind!=='INVALID',incident,samples});
    lastFinish.set(id,finishMs);nextStart=startMs+8000;
  }
  const standings=order.map(id=>{const valid=runs.filter(r=>r.id===id&&r.valid);return {id,bestMs:valid.length?Math.min(...valid.map(r=>r.lapMs)):null,grid:0};})
    .sort((a,b)=>(a.bestMs??Infinity)-(b.bestMs??Infinity)||order.indexOf(a.id)-order.indexOf(b.id))
    .map((r,i)=>({...r,grid:i+1}));
  return {runs,durationMs:Math.max(...runs.map(r=>r.finishMs)),lapLength,standings};
}
