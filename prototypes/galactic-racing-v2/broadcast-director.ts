import type {RaceRecord} from '../../lib/racing/types';
import type {CameraCue,Meeting} from '../../lib/racing/v2/types';
/** Viewer-only edit list. The immutable simulator record is never rewritten. */
export function broadcastCues(race:RaceRecord,seasonPoints:Readonly<Record<string,number>>={}):CameraCue[]{
 const cues:CameraCue[]=[{atMs:0,racerId:race.grid[0],shot:'wide',reason:'START'}];
 const priorities:Record<string,number>={EXTERNAL:95,MAJOR:90,DNF:90,DSQ:90,ULTIMATE:85,LEAD:65,SLIPSTREAM:60};
 const contenders=new Set(Object.entries(seasonPoints).sort((a,b)=>b[1]-a[1]).slice(0,2).map(r=>r[0]));
 const finishers=race.results.filter(r=>r.status==='FINISHED'&&r.finishMs!==null).sort((a,b)=>a.finishMs!-b.finishMs!);
 const firstFinish=finishers[0]?.finishMs??Infinity;
 const seen=new Map<string,number>();let lastPriority=0;
 for(let ms=1000;ms<firstFinish-4500;ms+=500){
  const tick=Math.min(race.frames.length-1,Math.floor(ms/race.config.tickMs));
  const ordered=[...race.frames[tick].racers].sort((a,b)=>a.rank-b.rank);
  const leader=ordered.find(r=>r.status==='RACING');if(!leader)continue;
  const last=cues[cues.length-1],held=ms-last.atMs;
  if(held<3500)continue;
  const recent=race.events.filter(e=>e.tick*race.config.tickMs<=ms&&e.tick*race.config.tickMs>ms-1500&&priorities[e.kind]);
  const event=recent.filter(e=>ms-(seen.get(e.kind+e.racerId)??-Infinity)>10000)
   .sort((a,b)=>(priorities[b.kind]+(contenders.has(b.racerId)?4:0))-(priorities[a.kind]+(contenders.has(a.racerId)?4:0))||b.tick-a.tick)[0];
  const important=event&&(held>=6000||priorities[event.kind]>lastPriority);
  const battle=ordered[1]&&leader.progress-ordered[1].progress<2000;
  if(!important&&held<11000)continue;
  const id=important?event.racerId:leader.id;
  const reason=important?event.kind:battle?'LEAD BATTLE':'TRACK COVERAGE';
  const shot:CameraCue['shot']=reason==='ULTIMATE'?'front':reason==='LEAD'||battle?'side':cues.length%3===0?'front':'chase';
  cues.push({atMs:ms,racerId:id,shot,reason});lastPriority=important?priorities[event.kind]:0;
  if(important)seen.set(event.kind+event.racerId,ms);
 }
 // Never cut to P2 before P1 has crossed. Near-simultaneous arrivals share a
 // stable shot; it is physically impossible to hold a separate shot for each.
 let priorCross=-Infinity;
 finishers.forEach((r,i)=>{
  const start=Math.max(r.finishMs!-4500,priorCross+120);
  if(start<r.finishMs!){cues.push({atMs:start,racerId:r.id,shot:'front',reason:i===0?'WINNER FINISH CAMERA':`FINISH P${i+1}`});}
  priorCross=r.finishMs!;
 });
 return cues;
}
export function forBroadcast(meeting:Meeting):Meeting{
 return {...meeting,cameras:broadcastCues(meeting.race)};
}
