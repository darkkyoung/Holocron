import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {loadV3} from './load-v3.mjs';
const count=Number(process.argv[2]??40000),path=process.argv[3];
if(!Number.isInteger(count)||count<40000||count>100000)throw Error('40000..100000 REQUIRED');
const sim=await loadV3(),hash=createHash('sha256');
const grid=Array(8).fill(0),racers=Array(8).fill(0),eliminations=[0,0,0],events={},times=[],qualTimes=[];
let special=0,draftPasses=0,lead=0,ultimateWinners=0,specialSeed=null,featureSeed=null;
try{
 for(let i=0;i<count;i++){
  const m=sim.simulateMeetingV3(`9rc-${i}`,i<200),r=m.race,w=m.official[0];
  grid[w.grid-1]++;racers[Number(w.id.slice(1))-1]++;
  const eliminated=r.results.filter(x=>['DNF','DSQ'].includes(x.status)).length;
  if(eliminated>2)throw Error('CAP');eliminations[eliminated]++;
  if(m.specialDsq){special++;specialSeed??=r.seed;}
  if(!featureSeed&&['ULTIMATE','EXTERNAL','MAJOR','SHORTCUT'].every(k=>r.events.some(e=>e.kind===k)))featureSeed=r.seed;
  if(r.events.some(e=>e.kind==='PIT'))throw Error('PIT_FORBIDDEN');
  for(const e of r.events){events[e.kind]=(events[e.kind]??0)+1;if(e.kind==='LEAD')lead++;}
  if(w.ultimateUsed)ultimateWinners++;
  // Exact adjacent-frame order crossings only while both racers are still racing and drafting.
  if(i<200)for(let t=1;t<r.frames.length;t++)for(const a of r.frames[t].racers){
   const prev=r.frames[t-1].racers.find(x=>x.id===a.id);
   if(prev.motion!=='SLIPSTREAM'||a.status!=='RACING')continue;
   for(const b of r.frames[t].racers){const pb=r.frames[t-1].racers.find(x=>x.id===b.id);if(b.status==='RACING'&&prev.rank>pb.rank&&a.rank<b.rank)draftPasses++;}
  }
  times.push(r.durationTicks*.25);qualTimes.push(m.qualifying.durationMs/1000);
  hash.update(JSON.stringify({q:m.qualifying.standings,results:m.official,events:r.events}));
  if(i%5000===0)console.error(`completed ${i}/${count}`);
 }
 times.sort((a,b)=>a-b);
 const report={version:sim.VERSION_V3,samples:count,seedSeries:`9rc-0..9rc-${count-1}`,digest:hash.digest('hex'),
 duration:{mean:times.reduce((a,b)=>a+b,0)/count,p05:times[Math.floor(count*.05)],median:times[count>>1],p95:times[Math.floor(count*.95)],min:times[0],max:times.at(-1),within180to300:times.filter(t=>t>=180&&t<=300).length/count},
 qualifyingMeanSeconds:qualTimes.reduce((a,b)=>a+b,0)/count,
 winsByGrid:grid.map((n,i)=>({grid:i+1,wins:n,percent:n/count*100})),winsByRacer:racers.map((n,i)=>({id:`r${i+1}`,wins:n,percent:n/count*100})),
 normalEliminations:eliminations,specialDsq:{count:special,percent:special/count*100,demoSeed:specialSeed},featureSeed,
 events,meanLeadChanges:lead/count,ultimateWinners,slipstreamPasses:{races:200,count:draftPasses,definition:'adjacent-frame rank crossing while drafting; excludes finished/retired opponents, not causal attribution'},externalCalls:0};
 if(path)await writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});else console.log(JSON.stringify(report,null,2));
}finally{await sim.dispose();}
