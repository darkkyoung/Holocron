import type {QualifyingRecord,CameraCue} from '../v2/types';
export function qualifyingStage(q:QualifyingRecord,ms:number){
 if(ms<(q.preshowMs??0))return {kind:'preshow' as const,round:0,startMs:0,endMs:q.preshowMs!};
 for(const r of q.rounds??[]){
  if(ms<r.finishMs)return {kind:'running' as const,round:r.round,startMs:r.startMs,endMs:r.finishMs};
  if(ms<r.resultEndMs)return {kind:'result' as const,round:r.round,startMs:r.finishMs,endMs:r.resultEndMs};
 }
 return {kind:'grid' as const,round:3,startMs:q.gridStartMs??q.durationMs,endMs:q.durationMs};
}
export function qualifyingRows(q:QualifyingRecord,ms:number,ids:readonly string[]){
 const stage=qualifyingStage(q,ms),round=Math.max(1,stage.round);
 const completed=q.runs.filter(r=>r.finishMs<=ms),improvements:{id:string;at:number}[]=[];
 const best=new Map<string,number>();
 for(const r of [...completed].sort((a,b)=>a.finishMs-b.finishMs))if(r.valid&&r.lapMs<(best.get(r.id)??Infinity)){best.set(r.id,r.lapMs);improvements.push({id:r.id,at:r.finishMs});}
 const newest=improvements.at(-1);
 return ids.map(id=>{const run=q.runs.find(r=>r.id===id&&r.round===round)!;const mark=improvements.findLast(r=>r.id===id),age=mark?ms-mark.at:Infinity;
  return {id,bestMs:best.get(id)??Infinity,lapMs:ms>=run.finishMs?run.lapMs:null,valid:ms>=run.finishMs?run.valid:null,
   laps:completed.filter(r=>r.id===id).length,status:ms<run.startMs?'waiting':ms<run.finishMs?'running':run.valid?'finished':'invalid',
   highlight:age<2000?1:age<2600?1-(age-2000)/600:0,primary:newest?.id===id,round};
 }).sort((a,b)=>a.bestMs-b.bestMs||ids.indexOf(a.id)-ids.indexOf(b.id));
}
/** Precomputed deterministic edit list; no director work is added to the 30FPS loop. */
export function directQualifying(q:QualifyingRecord,ids:readonly string[]):CameraCue[]{
 const cues:CameraCue[]=[{atMs:0,racerId:ids[0],shot:'wide',reason:'QUALIFYING PRESHOW'}];
 for(const round of q.rounds??[]){
  let last=-Infinity;
  for(let ms=round.startMs;ms<round.finishMs;ms+=500){
   if(ms-last<4000)continue;
   const active=q.runs.filter(r=>r.round===round.round&&r.startMs<=ms&&r.finishMs>ms);
   if(!active.length)continue;
   const completed=q.runs.filter(r=>r.valid&&r.finishMs<=ms);
   const record=completed.find(r=>ms-r.finishMs<2000&&r.lapMs===Math.min(...completed.map(x=>x.lapMs)));
   if(record){cues.push({atMs:ms,racerId:record.id,shot:'wide',reason:'NEW BEST LAP'});last=ms;continue;}
   const best=Math.min(...q.runs.filter(r=>r.valid&&r.finishMs<=ms).map(r=>r.lapMs));
   const score=(r:typeof active[number])=>{const elapsed=ms-r.startMs;const a=r.samples[Math.min(r.samples.length-1,Math.floor(elapsed/250))];const projection=a?.progress?elapsed/(a.progress/q.lapLength):Infinity;
    const incident=r.incident&&elapsed>=r.incident.atMs&&elapsed<r.incident.atMs+r.incident.durationMs;
    const remaining=q.runs.filter(x=>x.round===round.round&&x.finishMs>ms).length;
    return incident?100:remaining===1?90:projection<best&&elapsed>10000?80:elapsed/1000;};
   const target=active.reduce((a,b)=>score(a)>=score(b)?a:b),priority=score(target);
   if(ms-last<8000&&priority<80)continue;
   const angles:CameraCue['shot'][]=['chase','front','side','wide'];
   cues.push({atMs:ms,racerId:target.id,shot:priority>=90?'front':angles[cues.length%4],reason:priority===100?'QUALIFYING INCIDENT':priority===90?'LAST FINISHER':priority>=80?'BEST LAP CHALLENGE':'QUALIFYING COVERAGE'});last=ms;
  }
  cues.push({atMs:round.finishMs,racerId:ids[0],shot:'wide',reason:`ROUND ${round.round} RESULTS`});
 }
 cues.push({atMs:q.gridStartMs!,racerId:q.standings[0].id,shot:'wide',reason:'FINAL GRID'});return cues;
}
