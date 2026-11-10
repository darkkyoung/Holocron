import {mkdir,writeFile} from 'node:fs/promises';
import {loadV14} from './load-v14.mjs';

const s=await loadV14(),reports=[];
try{
 for(const laps of [1,3,5,10,15,30]){
  const histogram=[0,0,0],bands=[0,0,0];let duration=0,hyper=0,spacing=0,overlap=0;
  for(let i=0;i<1000;i++){
   const m=s.simulateMeetingV14(`14laps-${laps}-${i}`,false,{laps}),a=m.ultimates;
   histogram[a.length]++;duration+=m.race.durationTicks*.25;
   for(const x of a){hyper+=Number(x.type==='hyper');bands[x.progressBefore<.9?0:x.progressBefore<.94?1:2]++;if(x.progressBefore<.88||x.progressBefore>=.96)throw Error('WINDOW');}
   if(a.length===2){spacing+=Number((a[1].startTick-a[0].startTick)*250<10000);overlap+=Number(a[0].endTick>a[1].startTick);}
  }
  reports.push({laps,n:1000,meanSeconds:duration/1000,histogram,percent:histogram.map(n=>n/10),bands,hyper,spacingErrors:spacing,overlap});
  console.log(JSON.stringify(reports.at(-1)));
 }
 await mkdir('out',{recursive:true});await writeFile('out/racing-v14-lap-comparison.json',JSON.stringify(reports,null,2)+'\n');
}finally{await s.dispose();}
