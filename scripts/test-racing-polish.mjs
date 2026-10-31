import assert from 'node:assert/strict';
import {loadV4} from './racing/load-v4.mjs';
import {loadTestModules} from './test-module-loader.mjs';
const sim=await loadV4();const modules=await loadTestModules(['prototypes/galactic-racing-v2/broadcast-director.ts']);
try{
 const {broadcastCues,forBroadcast}=modules.modules['prototypes/galactic-racing-v2/broadcast-director.ts'];
 let tight=0;
 for(let i=0;i<100;i++){
  const m=sim.simulateMeetingV4('9rd-'+i),original=JSON.stringify(m),view=forBroadcast(m),cues=view.cameras;
  assert.deepEqual(cues,broadcastCues(m.race));assert.equal(JSON.stringify(m),original);
  assert.strictEqual(view.race,m.race);assert.strictEqual(view.official,m.official);
  const ordinary=cues.filter(c=>!c.reason.includes('FINISH'));
  for(let n=2;n<ordinary.length;n++)assert.ok(ordinary[n].atMs-ordinary[n-1].atMs>=3500);
  const finishers=m.race.results.filter(r=>r.status==='FINISHED').sort((a,b)=>a.finishMs-b.finishMs);
  const winner=cues.find(c=>c.reason==='WINNER FINISH CAMERA');assert.equal(winner.racerId,finishers[0].id);
  finishers.slice(1).forEach((r,n)=>{const shot=cues.find(c=>c.reason==='FINISH P'+(n+2));if(shot){assert.ok(shot.atMs>finishers[n].finishMs);assert.ok(shot.atMs<r.finishMs);}else tight++;});
  assert.deepEqual(sim.simulateMeetingV4('9rd-'+i).race.results,m.race.results);
 }
 console.log('PASS: 100 deterministic records unchanged; event hold >=3500ms; sequential finish shots; '+tight+' near-simultaneous arrivals share shot.');
}finally{await sim.dispose();await modules.dispose();}
