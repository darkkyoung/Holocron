import {createHash} from 'node:crypto';
export const wilson=(k,n)=>{if(!n)return [0,0];const z=1.96,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [100*(c-h),100*(c+h)];};
const distribution=a=>{const b=[...a].sort((a,b)=>a-b);return {n:b.length,min:b[0]??0,mean:b.reduce((s,x)=>s+x,0)/(b.length||1),p05:b[Math.floor(b.length*.05)]??0,median:b[b.length>>1]??0,p95:b[Math.floor(b.length*.95)]??0,max:b.at(-1)??0};};
const outcomes=rows=>{const n=rows.length,wins=rows.filter(x=>x.win).length,podium=rows.filter(x=>x.podium).length;return {n,wins,podium,winPercent:100*wins/(n||1),podiumPercent:100*podium/(n||1),winWilson95:wilson(wins,n),meanFinalRankGain:rows.reduce((s,x)=>s+x.gain,0)/(n||1),meanEffectRankGain:rows.reduce((s,x)=>s+x.effectGain,0)/(n||1)};};
/** Full recorded frames, including every active Hyper tick. No viewer or result mutation. */
export function auditV12(s,count,prefix,policy,progress=()=>{}){
 const histogram=[0,0,0],launchLaps=Array(10).fill(0),grid=Array(8).fill(0),ids=Array(8).fill(0),rankLaunch=Array(8).fill(0),events={},byType={gold:[],hyper:[]},times=[],hyperRecords=[],cases={},hash=createHash('sha256');
 let illegal=0,lapErrors=0,qualErrors=0,finishErrors=0,branchErrors=0,specials=0,without=0,overlap=0,oneLap=0,maxLead=0,maxNearestLead=0,nearestLap=0,maxBound=0,lead=0,nonfinite=0;
 const remember=(key,m,a)=>{if(!cases[key]){const result=a?m.official.find(r=>r.id===a.id):null;cases[key]={seed:m.race.seed,...(a?{id:a.id,startTick:a.startTick,startMs:a.startTick*250,type:a.type,beforeRank:a.rankBefore,finalRank:result.position,status:result.status,officialWin:result.status==='FINISHED'&&result.position===1}:{}),specialDsq:m.specialDsq?.id??null};}};
 for(let i=0;i<count;i++){
  const m=s.simulateMeetingV12(`${prefix}${i}`,true,{},policy),r=m.race,lap=r.config.track.length/10,w=m.official[0];
  histogram[m.ultimates.length]++;grid[w.grid-1]++;ids[Number(w.id.slice(1))-1]++;times.push(r.durationTicks*.25);specials+=Number(!!m.specialDsq);without+=Number(!r.results.find(x=>x.id===w.id).ultimateUsed);
  if(!m.ultimates.length)remember('noUltimate',m);if(m.specialDsq)remember('specialDsq',m);
  for(const a of m.ultimates){
   launchLaps[Math.floor(a.progressBefore*10)]++;rankLaunch[a.rankBefore-1]++;if(a.progressBefore<.7||a.progressBefore>=.95)illegal++;
   const result=m.official.find(x=>x.id===a.id),win=result.status==='FINISHED'&&result.position===1,podium=result.status==='FINISHED'&&result.position<=3;
   const end=r.frames[Math.min(a.endTick,r.durationTicks)].racers.find(x=>x.id===a.id);
   byType[a.type].push({win,podium,gain:a.rankBefore-result.position,effectGain:a.rankBefore-end.rank,conditional:a.conditionalKpi});
   if(a.type==='gold'&&win)remember('goldWin',m,a);
   if(a.type==='hyper'){remember('hyper',m,a);if(a.conditionalKpi&&win)remember('hyperLowerWin',m,a);if(!win)remember('hyperLoss',m,a);if(['DNF','DSQ'].includes(result.status))remember('hyperRetirement',m,a);if(a.progressBefore>.9)remember('lateHyper',m,a);}
   const path=m.shortcutPassages.some(p=>p.id===a.id&&p.success&&p.mergeMs!==null&&p.entryMs<a.endTick*250&&p.mergeMs>a.startTick*250);if(path){overlap++;remember(a.type==='hyper'?'hyperShortcut':'shortcutUltimate',m,a);}
  }
  for(const h of m.wormholes){
   hyperRecords.push(h);let over=false,nearestOver=false;
   for(let tick=h.startTick;tick<=Math.min(h.endTick,r.durationTicks);tick++){
    const f=r.frames[tick].racers,own=f.find(x=>x.id===h.id);if(own.status!=='RACING')continue;
    const other=f.filter(x=>x.id!==h.id&&['RACING','FINISHED'].includes(x.status));if(!other.length)continue;const gap=own.progress-Math.min(...other.map(x=>x.progress)),nearest=own.progress-Math.max(...other.map(x=>x.progress));maxLead=Math.max(maxLead,gap);maxNearestLead=Math.max(maxNearestLead,nearest);if(gap>=lap)over=true;if(nearest>=lap)nearestOver=true;
   }
   oneLap+=Number(over);nearestLap+=Number(nearestOver);
   const burstBound=r.config.baseStep*Math.max(...r.config.sections.map(x=>x.pace))/1000*1.035*(policy.phantomBurstPower/1000-1)/s.SHORTCUT_RATIO;
   maxBound=Math.max(maxBound,h.jumpDistance+m.afterburnGainBound+burstBound);
   if(h.jumpTick!==null){
    const jump=r.jumps.find(j=>j.id===h.id);if(!jump||jump.to-jump.from!==h.jumpDistance||jump.tick!==h.jumpTick||h.jumpDistance>lap*policy.jumpFraction[1]+1)finishErrors++;
    if(m.shortcutPassages.some(p=>p.id===h.id&&p.success&&p.entryMs<=h.jumpTick*250&&(p.mergeMs===null||p.mergeMs>h.jumpTick*250)))branchErrors++;
   }
  }
  for(const e of r.events){events[e.kind]=(events[e.kind]??0)+1;if(e.kind==='LEAD')lead++;}
  for(const x of r.results){if(!Number.isFinite(x.progress)||x.finishMs!==null&&!Number.isFinite(x.finishMs))nonfinite++;if(x.status==='FINISHED'){const laps=m.raceLaps.filter(l=>l.id===x.id);if(laps.length!==10||laps.at(-1).crossingMs!==x.finishMs)lapErrors++;}}
  if(m.qualifying.runs.length!==24||m.qualifying.rounds.some((x,j)=>j&&x.startMs<m.qualifying.rounds[j-1].resultEndMs))qualErrors++;
  if(r.results.filter(x=>['DNF','DSQ'].includes(x.status)).length>2||m.ultimates.length>2||new Set(m.ultimates.map(x=>x.id)).size!==m.ultimates.length)throw Error('CAP');
  hash.update(JSON.stringify({official:m.official,events:r.events,qualifying:m.qualifying.standings,laps:m.raceLaps,ultimates:m.ultimates,wormholes:m.wormholes,jumps:r.jumps,paths:m.shortcutPassages}));
  if((i+1)%1000===0)progress(i+1,count);
 }
 const total=byType.gold.length+byType.hyper.length;
 return {version:s.VERSION_V12,count,prefix,policy,digest:hash.digest('hex'),conditionalDefinition:'P5-P8, own progress [70%,95%), RACING at activation; final official classification including special DSQ',
  ultimate:{count:total,perRaceHistogram:histogram,noActivationPercent:100*histogram[0]/count,hyper:byType.hyper.length,hyperPercent:100*byType.hyper.length/(total||1),launchLaps,launchLapPercent:launchLaps.map(n=>100*n/(total||1)),illegal,countsByBeforeRank:rankLaunch,overlappingShortcut:overlap},
  byType:Object.fromEntries(Object.entries(byType).map(([k,v])=>[k,{all:outcomes(v),conditional:outcomes(v.filter(x=>x.conditional))}])),
  hyper:{leadLimited:hyperRecords.filter(h=>h.leadLimited).length,governorEnded:hyperRecords.filter(h=>h.endReason==='live-lead-governor').length,cancelled:hyperRecords.filter(h=>h.cancelled).length,jumpCm:distribution(hyperRecords.map(h=>h.jumpDistance)),afterburnExtraPhysicalCm:distribution(hyperRecords.map(h=>h.afterburnExtraPhysical)),burstExtraPhysicalCm:distribution(hyperRecords.map(h=>h.burstExtraPhysical??0)),maxConservativeExtraCm:maxBound,observedMaxLeadCm:maxLead,oneLapLeadActivations:oneLap,nearestContenderMaxLeadCm:maxNearestLead,nearestContenderLapLeadActivations:nearestLap,definition:'Extra bound = official jump + same-step afterburn/shortest-road upper bound + burst bound, not a counterfactual final lead. Observed lead compares EVERY other live RACING/FINISHED contender (largest gap), with nearest-contender statistics separate.'},
  winsByGrid:grid.map(x=>100*x/count),winsByRacer:ids.map(x=>100*x/count),winnerWithoutUltimatePercent:100*without/count,durationSeconds:distribution(times),meanLeaderChanges:lead/count,specialDsq:specials,events,errors:{illegal,lapErrors,qualErrors,finishErrors,branchErrors,nonfinite},cases};
}
