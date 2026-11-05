import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadV11} from './load-v11.mjs';
import {loadTestModules} from '../test-module-loader.mjs';
const extra=await loadTestModules(['lib/racing/v10/ultimate.ts']);const {WORMHOLE_POLICY}=Object.values(extra.modules)[0];
const count=Number(process.argv[2]??40000),path=process.argv[3]??'out/racing-v11-balance.json';
if(!Number.isInteger(count)||count<1||count>100000)throw Error('INVALID_COUNT');
const s=await loadV11(),policy=s.LATE_ULTIMATE_POLICY,hash=createHash('sha256');
const grid=Array(8).fill(0),wins=Array(8).fill(0),ranks=Array(8).fill(0),events={},times=[],powers=[],durations=[],cases={},conditional=[];
const activationLaps=Array(10).fill(0);let earlyLaunches=0,cutoffViolations=0;
const activationHistogram=[0,0,0],byType={gold:[],hyper:[]},wormholes=[];let maxEffectGainBound=0,excessiveGain=0;const actualHyper={maxLeaderGapCm:0,oneLapLeadActivations:0,effectTravelCm:[],rankGainAtEnd:[]};
let activations=0,hyper=0,winnerWithoutUltimate=0,specials=0,withShortcut=0,lapErrors=0,lead=0,eligibleDsq=0,qualErrors=0;
const wilson=(k,n)=>{if(!n)return [0,0];const z=1.96,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [100*(c-h),100*(c+h)];};
const distribution=a=>{const b=[...a].sort((x,y)=>x-y);return {count:b.length,min:b[0],mean:b.reduce((x,y)=>x+y,0)/(b.length||1),p05:b[Math.floor(b.length*.05)],median:b[b.length>>1],p95:b[Math.floor(b.length*.95)],max:b.at(-1)};};
try{
 for(let i=0;i<count;i++){
  const seed=`11lu-${i}`,m=s.simulateMeetingV11(seed,true),r=m.race,w=m.official[0];
  activationHistogram[m.ultimates.length]++;wins[Number(w.id.slice(1))-1]++;grid[w.grid-1]++;times.push(r.durationTicks*.25);specials+=Number(!!m.specialDsq);
  winnerWithoutUltimate+=Number(!r.results.find(x=>x.id===w.id).ultimateUsed);
  if(m.specialDsq&&!cases.specialDsq)cases.specialDsq=seed;
  for(const a of m.ultimates){
   const lap=Math.floor(a.progressBefore*10)+1;activationLaps[lap-1]++;if(lap<8)earlyLaunches++;if(a.progressBefore>=.95)cutoffViolations++;
   byType[a.type].push({podium:m.official.some(r=>r.id===a.id&&r.status==='FINISHED'&&r.position<=3),win:m.official[0].id===a.id,conditional:a.conditionalKpi,gain:a.rankBefore-m.official.find(r=>r.id===a.id).position,atEndGain:a.rankBefore-r.frames[Math.min(a.endTick,r.durationTicks)].racers.find(r=>r.id===a.id).rank});
   activations++;ranks[a.rankBefore-1]++;hyper+=Number(a.type==='hyper');powers.push(a.power/1000);durations.push((a.endTick-a.startTick)*.25);
   const result=m.official.find(x=>x.id===a.id),podium=result.status==='FINISHED'&&result.position<=3,win=result.status==='FINISHED'&&result.position===1;
   if(a.conditionalKpi){conditional.push({podium,win,gain:a.rankBefore-result.position});eligibleDsq+=Number(result.status==='DSQ');}
   if(a.type==='hyper'&&!cases.hyper)cases.hyper={seed,id:a.id,tick:a.startTick};
   if(a.rankBefore===8&&win&&!cases.p8Win)cases.p8Win={seed,id:a.id,tick:a.startTick};
   if([6,7].includes(a.rankBefore)&&podium&&!cases.lowerPodium)cases.lowerPodium={seed,id:a.id,tick:a.startTick};
   if(!win&&!cases.notWinner)cases.notWinner={seed,id:a.id,tick:a.startTick};
   const overlap=m.shortcutPassages.some(p=>p.id===a.id&&p.success&&p.mergeMs!==null&&p.entryMs<a.endTick*250&&p.mergeMs>a.startTick*250);
   if(overlap){withShortcut++;if(!cases.shortcutUltimate)cases.shortcutUltimate={seed,id:a.id,tick:a.startTick};}
  }
  for(const h of m.wormholes){wormholes.push(h);
   let oneLap=false;
   for(let tick=h.startTick;tick<=Math.min(h.endTick,r.durationTicks);tick++){
    const frame=r.frames[tick].racers,own=frame.find(z=>z.id===h.id);if(own.status!=='RACING')continue;
    const others=frame.filter(z=>z.id!==h.id&&(z.status==='RACING'||z.status==='FINISHED'));
    const gap=own.progress-Math.max(...others.map(z=>z.progress));actualHyper.maxLeaderGapCm=Math.max(actualHyper.maxLeaderGapCm,gap);if(gap>=360000)oneLap=true;
   }
   actualHyper.oneLapLeadActivations+=Number(oneLap);
   const end=r.frames[Math.min(h.endTick,r.durationTicks)].racers.find(z=>z.id===h.id),a=m.ultimates.find(a=>a.id===h.id);
   actualHyper.effectTravelCm.push(end.progress-h.entryProgress);actualHyper.rankGainAtEnd.push(a.rankBefore-end.rank);
const bound=h.jumpDistance+m.afterburnGainBound;maxEffectGainBound=Math.max(maxEffectGainBound,bound);if(bound>=360000||h.jumpDistance>72000.001)excessiveGain++;}
  for(const e of r.events){events[e.kind]=(events[e.kind]??0)+1;if(e.kind==='LEAD')lead++;}
  if(r.results.filter(x=>x.status==='DNF'||x.status==='DSQ').length>2)throw Error('RETIREMENT_CAP');
  if(new Set(m.ultimates.map(x=>x.id)).size!==m.ultimates.length||m.ultimates.length>policy.maxPerRace)throw Error('ULTIMATE_CAP');
  for(const result of r.results.filter(x=>x.status==='FINISHED')){const laps=m.raceLaps.filter(x=>x.id===result.id);if(laps.length!==10||laps.at(-1).crossingMs!==result.finishMs)lapErrors++;}
  if(m.qualifying.runs.length!==24||m.qualifying.rounds.some((x,j)=>j&&x.startMs<m.qualifying.rounds[j-1].resultEndMs))qualErrors++;
  hash.update(JSON.stringify({q:{...m.qualifying,runs:m.qualifying.runs.map(run=>({...run,samples:[]}))},results:m.official,events:r.events,paths:m.shortcutPassages,ultimates:m.ultimates}));
  if((i+1)%2000===0)console.log(`completed ${i+1}/${count}`);
 }
 const n=conditional.length,k=conditional.filter(x=>x.podium).length,w=conditional.filter(x=>x.win).length;
 const summarize=rows=>({n:rows.length,podiumPercent:100*rows.filter(r=>r.podium).length/rows.length,winPercent:100*rows.filter(r=>r.win).length/rows.length,meanRankGain:rows.reduce((s,r)=>s+r.gain,0)/rows.length,meanRankGainAtEffectEnd:rows.reduce((s,r)=>s+r.atEndGain,0)/rows.length});
 const report={lateLaunch:{activationLaps,activationLapPercent:activationLaps.map(x=>100*x/activations),earlyLaunches,cutoffViolations,noActivationRaces:activationHistogram[0],noActivationPercent:100*activationHistogram[0]/count,windows:s.LATE_WINDOWS},actualHyper:{...actualHyper,effectTravelCm:distribution(actualHyper.effectTravelCm),rankGainAtEnd:distribution(actualHyper.rankGainAtEnd),definition:"Observed while RACING through effect end; lead over nearest other RACING/FINISHED contender, excluding retired racers. Total effect travel includes ordinary travel and is not marginal gain."},byType:Object.fromEntries(Object.entries(byType).map(([k,v])=>[k,{all:summarize(v),conditional:summarize(v.filter(r=>r.conditional))}])),wormhole:{count:wormholes.length,cancelled:wormholes.filter(h=>h.cancelled).length,jumpCm:distribution(wormholes.map(h=>h.jumpDistance)),afterburnExtraPhysicalCm:distribution(wormholes.map(h=>h.afterburnExtraPhysical)),maxEffectGainBoundCm:maxEffectGainBound,excessiveGain,definition:'Jump plus conservative same-step afterburn marginal road-equivalent bound, NOT final lead or full counterfactual outcome'},version:s.VERSION_V11,count,acceptanceSample:count>=40000,seeds:`11lu-0..${count-1}`,policy:{launchAndGold:Object.fromEntries(Object.entries(policy).filter(([k])=>!k.startsWith('hyper')||k==='hyperShare')),wormhole:WORMHOLE_POLICY},digest:hash.digest('hex'),durationSeconds:distribution(times),winsByGrid:grid.map(x=>100*x/count),winsByRacer:wins.map(x=>100*x/count),
 ultimate:{count:activations,meanPerRace:activations/count,perRaceHistogram:activationHistogram,activationCountsByRank:ranks,activationsPerRaceByRank:ranks.map(x=>x/count),hyper,hyperPercent:100*hyper/activations,power:distribution(powers),seconds:distribution(durations),overlappingSuccessfulShortcut:withShortcut,winnerWithoutUltimatePercent:100*winnerWithoutUltimate/count},
 conditional:{definition:'Official FINISHED podium/win after special DSQ; activation before-rank P5-P8, own progress70%-exclusive95%, no minimum remaining-lap constraint, RACING',n,podium:k,podiumPercent:100*k/n,podiumWilson95: wilson(k,n),wins:w,winPercent:100*w/n,winWilson95:wilson(w,n),meanFinalRankGain:conditional.reduce((a,x)=>a+x.gain,0)/n,officialDsq:eligibleDsq},
 meanLeaderChanges:lead/count,specialDsq:specials,events,lapErrors,qualErrors,cases,externalCalls:0};
 if(lapErrors||qualErrors||excessiveGain||earlyLaunches||cutoffViolations)throw Error('TIMING_INVARIANT');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await s.dispose();await extra.dispose();}
