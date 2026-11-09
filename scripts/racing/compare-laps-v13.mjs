import {writeFile,mkdir} from 'node:fs/promises';
import {loadV13} from './load-v13.mjs';
const s=await loadV13(),reports=[],cases={};
try{
 for(const laps of [1,3,5,10,15,30]){
  const histogram=[0,0,0];let duration=0,hyper=0,total=0,illegal=0,spacing=0,hyperThenGold=0,goldRepass=0,terminalBeforeReveal=0;
  for(let i=0;i<1000;i++){
   const seed=`13lap${laps}-${i}`,m=s.simulateMeetingV13(seed,false,{laps}),a=m.ultimates;
   histogram[a.length]++;duration+=m.race.durationTicks*.25;total+=a.length;hyper+=a.filter(x=>x.type==='hyper').length;
   illegal+=a.filter(x=>x.progressBefore<.88||x.progressBefore>=.96).length;
   if(a.length===2){spacing+=Number((a[1].startTick-a[0].startTick)*250<18000);if(a[0].type==='hyper'&&a[1].type==='gold'){hyperThenGold++;if(m.official[0].id===a[1].id){goldRepass++;cases.hyperThenGold??={seed,laps};}}}
   for(const h of m.wormholes){const terminal=m.race.events.find(e=>e.racerId===h.id&&e.tick>=h.startTick&&['DNF','DSQ','FINISH'].includes(e.kind));if(terminal&&terminal.tick*250<(h.phantomStartTick??h.startTick)*250+4925)terminalBeforeReveal++;}
  }
  reports.push({laps,n:1000,meanSeconds:duration/1000,histogram,ultimateCount:total,hyperCount:hyper,hyperThenGold,goldRepass,terminalBeforeReveal,illegal,spacing});console.log(JSON.stringify(reports.at(-1)));
 }
 await mkdir('out',{recursive:true});await writeFile('out/v13-lap-comparison.json',JSON.stringify({reports,cases},null,2));
}finally{await s.dispose();}
