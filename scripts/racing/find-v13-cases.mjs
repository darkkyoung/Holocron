import {writeFile} from 'node:fs/promises';
import {loadV13} from './load-v13.mjs';
const s=await loadV13(),found={};
try{
 for(let i=0;i<40000;i++){
  const seed='13edge-'+i,m=s.simulateMeetingV13(seed,false),a=m.ultimates;
  const remember=(key,detail)=>{if(!found[key]){found[key]={seed,...detail};console.log(key,JSON.stringify(found[key]));}};
  for(const x of a){
   const d=m.race.events.find(e=>e.racerId===x.id&&e.kind==='DNF'&&e.tick>=x.startTick&&e.tick<=x.endTick);
   if(d&&x.type==='hyper'){remember('hyperDnf',{id:x.id,tick:d.tick});if(d.tick===x.startTick)remember('activationHyperDnf',{id:x.id,tick:d.tick});}
  }
  for(const e of m.race.events.filter(e=>e.kind==='DNF'&&e.rank===1)){
   const other=a.find(x=>x.id!==e.racerId&&e.tick>=x.startTick&&e.tick<x.endTick);
   if(other){const full=s.simulateMeetingV13(seed);if(full.race.frames[Math.max(0,e.tick-1)].racers.find(x=>x.id===e.racerId).rank===1)remember('leaderInterrupt',{id:e.racerId,tick:e.tick,locked:other.id});}
  }
  if(a.length===2&&a[0].type==='hyper'&&a[1].type==='gold'&&m.official[0].id===a[1].id)remember('hyperGoldReversal',{id:a[1].id,hyper:a[0].id});
  if(Object.keys(found).length===4)break;
 }
 await writeFile('out/v13-edge-cases.json',JSON.stringify(found,null,2));
}finally{await s.dispose();}
