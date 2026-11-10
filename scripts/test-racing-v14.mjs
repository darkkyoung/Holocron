import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadV14} from './racing/load-v14.mjs';
import {loadV13} from './racing/load-v13.mjs';
const s=await loadV14(),old=await loadV13(),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
let checked=0,overlaps=0,cuts=0;
try{
 assert.equal(s.VERSION_V14,'galactic-racing-0.14.0');
 for(const k of ['goldPower','goldSeconds','rampSeconds','ordinaryResistance','majorResistance','hyperShare'])assert.deepEqual(s.LAUNCH_V14.policy[k],old.LAUNCH_V13.policy[k]);
 assert.deepEqual(s.PHANTOM_POLICY,old.PHANTOM_POLICY);
 for(const p of [.89,.92,.95])assert.equal(s.LAUNCH_V14.weight(p),old.LAUNCH_V13.weight(p));
 assert.equal(s.FREQUENCY_V14.cooldownSeconds,10);
 const frozen=JSON.parse(await readFile('docs/racing/evidence/v013-contract.json','utf8')).hashes;
 for(const [seed,h] of Object.entries(frozen))assert.equal(hash(old.simulateMeetingV13(seed)),h,'v13 full-record regression '+seed);
 for(let i=0;i<400;i++){
  const seed=`14contract-${i}`,m=s.simulateMeetingV14(seed),b=s.forBroadcast(m);
  if(i<20)assert.equal(hash(s.simulateMeetingV14(seed)),hash(m));
  assert.equal(m.version,s.VERSION_V14);assert.equal(m.ultimates.length<=2,true);assert.equal(new Set(m.ultimates.map(a=>a.id)).size,m.ultimates.length);
  for(const a of m.ultimates)assert.ok(a.progressBefore>=.88&&a.progressBefore<.96);
  if(m.ultimates.length===2){const [a,z]=m.ultimates,between=(z.startTick-a.startTick)*250;assert.ok(between>=10000);if(a.endTick>z.startTick){overlaps++;
    for(const t of [z.startTick*250-50,z.startTick*250,z.startTick*250+750]){
      if(t<0||t>=m.ceremonyStartMs-m.raceStartMs)continue;
      const ms=m.raceStartMs+t,first=s.cameraAt(b,ms,null),again=s.cameraAt(b,ms,null);assert.deepEqual(first,again);assert.equal(first.racerId,z.id,'second official launch takes picture');assert.equal(s.cameraAt(b,ms,a.id).racerId,a.id,'manual overrides');
      if(t>=z.startTick*250){assert.equal(s.cinematicState(b,ms,a.id),null,'older movie cannot hide old car after cut');cuts++;}
    }
  }}
  for(const h of m.wormholes){const plan=s.cinematicPlan(b).hyper.find(x=>x.id===h.id);assert.equal(plan.start-plan.charge,3000);assert.equal(plan.flight-plan.depart,2000);assert.equal(plan.arrival-plan.flight,550);assert.equal(plan.reveal-plan.arrival,2000);}
  assert.equal(m.race.config.version,s.VERSION_V14);checked++;
 }
 assert.ok(overlaps>=1,'pilot corpus needs physical overlap');
 for(const laps of [1,3,5,10,15,30])for(let i=0;i<5;i++){
  const m=s.simulateMeetingV14(`14laptest-${laps}-${i}`,true,{laps});for(const a of m.ultimates)assert.ok(a.progressBefore>=.88&&a.progressBefore<.96);
  for(const r of m.race.results.filter(r=>r.status==='FINISHED')){const times=m.raceLaps.filter(l=>l.id===r.id);assert.equal(times.length,laps);assert.equal(times.at(-1).crossingMs,r.finishMs);}
 }
 const report={status:'PASS',checked,overlaps,cuts,oldV13Hashes:Object.keys(frozen).length,policy:s.FREQUENCY_V14};await mkdir('out',{recursive:true});await writeFile('out/racing-v14-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await s.dispose();await old.dispose();}
