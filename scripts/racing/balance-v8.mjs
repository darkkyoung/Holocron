import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadV8} from './load-v8.mjs';
const count=Number(process.argv[2]??40000),path=process.argv[3]??'out/racing-v8-balance.json';
if(!Number.isInteger(count)||count<40000||count>100000)throw Error('40000..100000 REQUIRED');
const s=await loadV8(),hash=createHash('sha256'),wins=Array(8).fill(0),grid=Array(8).fill(0),byRank=Array.from({length:8},()=>({attempts:0,success:0})),eliminations=[0,0,0],times=[],events={};
let specials=0,entries=0,merges=0,failures=0,gain=0,barrierViolations=0,gridErrors=0,incomplete=0,qualSeconds=0,lapErrors=0,qualLapMs=0,qualInvalid=0,qualIncidents=0,qualOutsideLap=0;
try{
 for(let i=0;i<count;i++){
  const m=s.simulateMeetingV8(`9rf-${i}`,false),r=m.race,w=m.official[0];wins[Number(w.id.slice(1))-1]++;grid[w.grid-1]++;times.push(r.durationTicks*.25);qualSeconds+=m.qualifying.durationMs/1000;
  for(const racer of r.results.filter(x=>x.status==='FINISHED')){const laps=m.raceLaps.filter(x=>x.id===racer.id);if(laps.length!==10||laps.at(-1).crossingMs!==racer.finishMs||laps.some((x,i)=>x.lap!==i+1||x.lapMs<=0))lapErrors++;}
  for(const q of m.qualifying.runs){qualLapMs+=q.lapMs;if(!q.valid)qualInvalid++;if(q.incident){qualIncidents++;if(q.incident.atMs>=q.lapMs)qualOutsideLap++;}}
  const n=r.results.filter(x=>x.status==='DNF'||x.status==='DSQ').length;if(n>2)throw Error('CAP');eliminations[n]++;if(m.specialDsq)specials++;
  for(const e of r.events)events[e.kind]=(events[e.kind]??0)+1;
  for(const p of m.shortcutPassages){entries++;byRank[p.rank-1].attempts++;if(p.success)byRank[p.rank-1].success++;else failures++;
   if(p.mergeMs!==null){merges++;gain+=(p.mergeMs-p.entryMs)*(1/s.SHORTCUT_RATIO-1)/1000;}else if(p.success)incomplete++;
  }
  for(let j=1;j<3;j++)if(m.qualifying.rounds[j].startMs<m.qualifying.rounds[j-1].resultEndMs)barrierViolations++;
  if(r.grid.join()!==m.qualifying.standings.map(x=>x.id).join())gridErrors++;
  hash.update(JSON.stringify({q:m.qualifying,results:m.official,events:r.events,paths:m.shortcutPassages}));
  if(i%5000===0)console.log(`completed ${i}/${count}`);
 }
 times.sort((a,b)=>a-b);
 const report={version:s.VERSION_V8,samples:count,seeds:`9rf-0..9rf-${count-1}`,digest:hash.digest('hex'),duration:{mean:times.reduce((a,b)=>a+b,0)/count,p05:times[Math.floor(count*.05)],p50:times[count>>1],p95:times[Math.floor(count*.95)],min:times[0],max:times.at(-1)},
  winsByRacer:wins.map((n,i)=>({id:`r${i+1}`,count:n,percent:100*n/count})),winsByGrid:grid.map((n,i)=>({grid:i+1,count:n,percent:100*n/count})),
  shortcut:{ratio:s.SHORTCUT_RATIO,entries,success:entries-failures,failures,merges,incompleteDueToRetirement:incomplete,meanSamePaceTraversalSecondsSaved:gain/merges,definition:'Completed branch traversal versus its longer main route at the same measured mean pace; not causal whole-race gain',byRank:byRank.map((r,i)=>({...r,rank:i+1,configured:s.shortcutProbability(i+1),observed:r.success/r.attempts}))},
  qualifying:{lapsPerMeeting:24,rounds:3,barrierViolations,gridErrors,meanSeconds:qualSeconds/count,meanLapSeconds:qualLapMs/count/24/1000,invalid:qualInvalid,incidents:qualIncidents,incidentsOutsideLap:qualOutsideLap},lapTiming:{errors:lapErrors,allSummaryMeetingsChecked:count},eliminations,specialDsq:{count:specials,percent:100*specials/count},events,
  spatialContinuity:{test:'scripts/test-racing-v8.mjs',meetings:100,note:'Full-frame physical position checks run separately; this 40k summary run does not retain positions'},externalCalls:0};
 if(barrierViolations||gridErrors||lapErrors)throw Error('QUALIFYING_INVARIANT');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await s.dispose();}
