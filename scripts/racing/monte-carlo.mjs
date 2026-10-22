import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {loadSimulator} from './load.mjs';

const args=process.argv.slice(2);
if(args.length>2)throw Error('Usage: node scripts/racing/monte-carlo.mjs [10000..100000] [report.json]');
const count=Number(args[0]??40000);
if(!Number.isInteger(count)||count<10000||count>100000)throw Error('BOUNDED_SAMPLE_REQUIRED');
const sim=await loadSimulator(),digest=createHash('sha256');
const winsByGrid=Array(8).fill(0),winsByRacer=Object.fromEntries(sim.RACERS.map(r=>[r.id,0]));
const eliminationHistogram=[0,0,0],ultimateByRank=Array(8).fill(0),events={};
let ultimateStarts=0,ultimateWins=0,comebacks=0,leaders=0,duration=0,maxTicks=0,maxEvents=0;
const impact=Object.fromEntries(['MINOR','MEDIUM','MAJOR','PIT','PENALTY','SHORTCUT_FAIL'].map(k=>[k,{sample:0,rankLost:0,lostPosition:0}]));
// Wilson interval; identities are sampled under randomized qualifying, not fixed grids.
function interval(k,n){const z=1.96,p=k/n,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [m-h,m+h].map(x=>Number((100*x).toFixed(3)));}
try{
  for(let i=0;i<count;i++){
    const race=i<1000?sim.simulateRace(`mc-v1-${i}`):sim.simulateSummary(`mc-v1-${i}`),winner=race.results[0];
    if(winner.status!=='FINISHED')throw Error('NO_FINISHER');
    winsByGrid[winner.grid-1]++;winsByRacer[winner.id]++;if(winner.grid>=5)comebacks++;
    const eliminated=race.results.filter(x=>x.status==='DNF'||x.status==='DSQ').length;
    if(eliminated>2)throw Error('ELIMINATION_CAP_BROKEN');eliminationHistogram[eliminated]++;
    duration+=race.durationTicks*sim.CONFIG.tickMs;maxTicks=Math.max(maxTicks,race.durationTicks);maxEvents=Math.max(maxEvents,race.events.length);
    for(const e of race.events){
      events[e.kind]=(events[e.kind]??0)+1;
      if(e.kind==='ULTIMATE'){ultimateStarts++;ultimateByRank[e.rank-1]++;if(e.racerId===winner.id)ultimateWins++;}
      if(e.kind==='LEAD')leaders++;
      if(i<1000&&impact[e.kind]){
        const later=race.frames[Math.min(e.tick+40,race.durationTicks)].racers.find(s=>s.id===e.racerId);
        const loss=later.rank-e.rank;impact[e.kind].sample++;impact[e.kind].rankLost+=loss;
        if(loss>0)impact[e.kind].lostPosition++;
      }
    }
    digest.update(JSON.stringify({seed:race.seed,results:race.results,events:race.events}));
  }
  const report={simulatorVersion:sim.SIMULATOR_VERSION,config:sim.CONFIG,samples:count,seedSeries:`mc-v1-0..mc-v1-${count-1}`,
    resultEventDigest:digest.digest('hex'),winsByGrid:winsByGrid.map((wins,i)=>({grid:i+1,wins,percent:100*wins/count,ci95Percent:interval(wins,count)})),
    winsByRacer:Object.entries(winsByRacer).map(([id,wins])=>({id,wins,percent:100*wins/count,ci95Percent:interval(wins,count)})),
    bottomHalfGridWinPercent:100*comebacks/count,eliminationHistogram,events,
    ultimate:{activations:ultimateStarts,activationsByRank:ultimateByRank,winnersWhoActivated:ultimateWins,winConversionPercent:100*ultimateWins/ultimateStarts},
    meanLeadChanges:leaders/count,meanDurationSeconds:duration/count/1000,maxTicks,maxEvents,
    impact10Seconds:{samples:1000,note:'Observational, overlapping events; not a causal estimate. Rank is the full field including retirees.',byEvent:impact},
    limits:{ticks:sim.CONFIG.maxTicks,events:sim.CONFIG.maxEvents,eliminations:sim.CONFIG.maxEliminations},
    scope:'One original track; no economy, season, payout, production fairness or human enjoyment acceptance.'};
  const text=JSON.stringify(report,null,2)+'\n';if(args[1])await writeFile(args[1],text,{flag:'wx'});else console.log(text);
  console.error(`Completed ${count} deterministic offline races; external calls 0.`);
}finally{await sim.dispose();}
