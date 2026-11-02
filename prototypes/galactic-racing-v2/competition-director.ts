import type {Meeting,CameraCue} from '../../lib/racing/v2/types';
import type {RaceRecord} from '../../lib/racing/types';
import {SHORTCUT_RATIO,BRANCH_ENTRY,BRANCH_EXIT} from '../../lib/racing/v5/track';

/** Editorial policy over observed frames/events only. Never consult final results,
 * future rank, passage outcome or special DSQ to select a contender. Distances cm. */
export function competitionCandidate(race:RaceRecord,ms:number){
 const tick=Math.min(race.frames.length-1,Math.floor(ms/race.config.tickMs));
 const rows=[...race.frames[tick].racers].filter(r=>r.status==='RACING').sort((a,b)=>a.rank-b.rank);
 if(!rows.length)return null;
 const previous=race.frames[Math.max(0,tick-8)].racers,leader=rows[0];
 const recent=race.events.filter(e=>e.tick<=tick&&e.tick>tick-6);
 const lap=race.config.track.length/race.config.track.laps;
 const candidates=rows.map(r=>{
  const ahead=rows.find(x=>x.rank===r.rank-1),gap=leader.progress-r.progress;
  const gained=(previous.find(x=>x.id===r.id)?.rank??r.rank)-r.rank;
  const closing=ahead?Math.max(0,r.speed-ahead.speed):0;
  const near=!!ahead&&ahead.progress-r.progress<Math.max(1500,r.speed*.9);
  const reachable=gap<Math.max(3000,r.speed*2.5);
  let score=r.rank===1?25:0,reason='LEAD COVERAGE';
  if(r.rank<=4&&near){score=55+(5-r.rank)*2+Math.min(8,closing/1000);reason='TOP FOUR BATTLE';}
  if(gained>0&&(r.rank<=4||reachable)){score=78+gained*2;reason='OBSERVED OVERTAKE';}
  const branch=recent.some(e=>e.racerId===r.id&&e.kind==='SHORTCUT_ENTER');
  // Geometric potential only, not the future success bit. A failed entry observed
  // at this tick is not a promising shortcut.
  const failed=recent.some(e=>e.racerId===r.id&&e.kind==='SHORTCUT_FAIL');
  const saving=lap*(BRANCH_EXIT-BRANCH_ENTRY)*(1-SHORTCUT_RATIO)*.75; // conservative 75% of geometric gain
  if(branch&&!failed&&gap<saving+r.speed*1.5&&r.rank<=6){score=84;reason='SHORTCUT CONTENDER';}
  if(race.simulatorVersion==='galactic-racing-0.9.0'&&recent.some(e=>e.racerId===r.id&&e.kind==='ULTIMATE')&&r.rank>=5){score=89;reason='ULTIMATE LAUNCH';}
  if(r.ultimate&&(gained>0||near&&closing>0)&&(r.rank<=4||reachable)){score=88;reason='ULTIMATE CHASE';}
  if(recent.some(e=>e.racerId===r.id&&['MAJOR','EXTERNAL'].includes(e.kind))&&r.rank<=4){score=82;reason='CONTENDER INCIDENT';}
  const remaining=race.config.track.length-r.progress;
  if(remaining>=0&&remaining/Math.max(1,r.speed)<=2&&(r.rank<=4||r.id===leader.id)){score=110-r.rank;reason='FINISH APPROACH';}
  return {id:r.id,rank:r.rank,gap,score,reason};
 });
 // Retirement is already observed. It cannot be selected solely because the
 // event exists: only a previously top-four contender warrants a brief shot.
 for(const e of recent.filter(e=>['DNF','DSQ'].includes(e.kind))){const prior=previous.find(r=>r.id===e.racerId);if(prior&&prior.rank<=4)candidates.push({id:e.racerId,rank:prior.rank,gap:leader.progress-prior.progress,score:83,reason:'CONTENDER RETIRED'});}
 return candidates.sort((a,b)=>b.score-a.score||a.rank-b.rank||a.id.localeCompare(b.id))[0];
}
export function competitionCues(race:RaceRecord):CameraCue[]{
 const cues:CameraCue[]=[{atMs:0,racerId:race.grid[0],shot:'wide',reason:'START'}];
 let priority=0;
 for(let ms=1000;ms<=race.durationTicks*race.config.tickMs;ms+=250){
  const candidate=competitionCandidate(race,ms);if(!candidate)continue;
  const last=cues[cues.length-1],hold=ms-last.atMs;
  const urgent=candidate.reason==='FINISH APPROACH';
  if(hold<(urgent?1000:4000))continue;
  if(candidate.id===last.racerId&&hold<10000)continue;
  if(!urgent&&hold<6500&&candidate.score<=priority+8)continue;
  cues.push({atMs:ms,racerId:candidate.id,shot:urgent?'front':cues.length%2?'chase':'front',reason:candidate.reason});priority=candidate.score;
 }
 return cues;
}
/** Estimate a lap from samples already reached; never read the future lap time
 * when anticipating a record. Completed laps alone establish the current best. */
export function qualifyingCompetitionCues(m:Meeting):CameraCue[]{
 const q=m.qualifying,cues:CameraCue[]=[{atMs:0,racerId:m.race.racers[0].id,shot:'wide',reason:'QUALIFYING PRESHOW'}];
 for(const round of q.rounds??[]){
  let lastPriority=0;
  for(let ms=round.startMs;ms<round.finishMs;ms+=250){
   const finished=q.runs.filter(r=>r.finishMs<=ms&&r.valid);
   const best=Math.min(...finished.map(r=>r.lapMs));
   const active=q.runs.filter(r=>r.round===round.round&&r.startMs<=ms&&r.finishMs>ms);
   const candidates=active.map(r=>{
    const elapsed=ms-r.startMs;let i=0;while(i+1<r.samples.length&&r.samples[i+1].ms<=elapsed)i++;
    const a=r.samples[i],b=r.samples[Math.max(0,i-1)],speed=(a.progress-b.progress)/Math.max(1,a.ms-b.ms);
    const left=(q.lapLength-a.progress)/Math.max(.001,speed),projected=elapsed+left;
    const contender=left<=2000&&(projected<=best+150||active.length===1&&q.runs.filter(x=>x.round===round.round&&x.startMs>ms).length===0);
    return {id:r.id,score:contender?100:projected<best?50:20,reason:contender?'QUALIFYING FINISH APPROACH':'QUALIFYING COVERAGE'};
   });
   const record=finished.find(r=>ms-r.finishMs<1250&&r.lapMs===best);
   if(record)candidates.push({id:record.id,score:105,reason:'NEW BEST LAP'});
   const c=candidates.sort((a,b)=>b.score-a.score)[0];if(!c)continue;
   const last=cues[cues.length-1],hold=ms-last.atMs;
   if(hold<(c.score>=100?1250:4000)||hold<7500&&c.score<=lastPriority&&c.id===last.racerId)continue;
   if(c.score<100&&hold<7500)continue;
   cues.push({atMs:ms,racerId:c.id,shot:c.score>=100?'front':cues.length%2?'chase':'wide',reason:c.reason});lastPriority=c.score;
  }
  cues.push({atMs:round.finishMs,racerId:m.race.racers[0].id,shot:'wide',reason:'ROUND RESULTS'});
 }
 cues.push({atMs:q.gridStartMs!,racerId:q.standings[0].id,shot:'wide',reason:'FINAL GRID'});return cues;
}
