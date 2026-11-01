import assert from 'node:assert/strict';
import {loadV5} from './racing/load-v5.mjs';
const sim=await loadV5();let checks=0,segments=0;
try{
 for(let seed=0;seed<200;seed++){
  const m=sim.simulateMeetingV5(`9re-${seed}`),again=sim.simulateMeetingV5(`9re-${seed}`,false);
  assert.deepEqual(m.race.results,again.race.results);assert.deepEqual(m.race.events,again.race.events);assert.deepEqual(m.shortcutPassages,again.shortcutPassages);
  assert.equal(m.qualifying.runs.length,24);assert.equal(m.qualifying.rounds.length,3);
  for(const r of m.qualifying.rounds){const runs=m.qualifying.runs.filter(x=>x.round===r.round);assert.equal(runs.length,8);assert.equal(new Set(runs.map(x=>x.id)).size,8);assert.equal(Math.max(...runs.map(x=>x.finishMs)),r.finishMs);assert.equal(Math.min(...runs.map(x=>x.startMs)),r.startMs);if(r.round>1)assert.ok(r.startMs>=m.qualifying.rounds[r.round-2].resultEndMs);assert.ok(runs[1].startMs<runs[0].finishMs);}
  for(const r of m.qualifying.standings){const laps=m.qualifying.runs.filter(x=>x.id===r.id&&x.valid);assert.equal(r.bestMs,laps.length?Math.min(...laps.map(x=>x.lapMs)):null);}
  assert.deepEqual(m.race.grid,m.qualifying.standings.map(x=>x.id));
  assert.ok(m.race.results.filter(x=>['DNF','DSQ'].includes(x.status)).length<=2);
  if(m.specialDsq){assert.ok(m.race.results.slice(0,3).some(x=>x.id===m.specialDsq.id));assert.equal(m.official.find(x=>x.id===m.specialDsq.id).points,0);}
  for(const p of m.shortcutPassages){assert.ok(p.entryMs>0);assert.ok(p.probability>=.42&&p.probability<=.52);if(p.mergeMs!==null)assert.ok(p.success&&p.mergeMs>p.entryMs);const tick=Math.ceil(p.entryMs/250);assert.ok(m.race.frames[tick-1].racers.find(x=>x.id===p.id).progress<=p.entryProgress+.001);assert.ok(m.race.frames[tick].racers.find(x=>x.id===p.id).progress>=p.entryProgress);}
  const lap=m.qualifying.lapLength;
  for(let i=1;i<m.race.frames.length;i++)for(let j=0;j<8;j++){
   const a=m.race.frames[i-1].racers[j],b=m.race.frames[i].racers[j];
   const pa=sim.routePoint(a.progress,lap,sim.usesBranch(m.shortcutPassages,a.id,a.progress),{x:0,z:0},{x:0,z:0}),pb=sim.routePoint(b.progress,lap,sim.usesBranch(m.shortcutPassages,b.id,b.progress),{x:0,z:0},{x:0,z:0});
   // Finish snapshots deliberately reset speed to zero. Bound that final step by the configured maximum.
   const physical=b.status==='FINISHED'?m.race.config.baseStep*1.035*1.55/100:Math.max(a.speed,b.speed)*.25/100,renderMetres=physical*sim.MAIN_LENGTH/(lap/100);
   assert.ok(Math.hypot(pa.x-pb.x,pa.z-pb.z)<=renderMetres+.3,`position jump ${seed}/${i}/${a.id}`);segments++;
  }
  for(const r of m.qualifying.runs.filter(x=>x.valid)){
   const row=sim.qualifyingRows(m.qualifying,r.finishMs,m.race.grid).find(x=>x.id===r.id);
   const prior=m.qualifying.runs.filter(x=>x.id===r.id&&x.valid&&x.finishMs<r.finishMs);
   if(!prior.length||r.lapMs<Math.min(...prior.map(x=>x.lapMs))){assert.equal(row.highlight,1);assert.equal(sim.qualifyingRows(m.qualifying,r.finishMs+2601,m.race.grid).find(x=>x.id===r.id).highlight,0);}
  }
  checks++;
 }
 const a=sim.simulateMeetingV5('v5-repeat'),b=sim.simulateMeetingV5('v5-repeat');assert.deepEqual(a,b);
 const none=sim.simulateMeetingV5('v5-no-shortcut',true,false);assert.equal(none.shortcutPassages.length,0);assert.ok(!none.race.events.some(e=>e.kind.startsWith('SHORTCUT')));
 const q=a.qualifying;assert.equal(sim.qualifyingRows(q,0,a.race.grid).filter(x=>x.status==='waiting').length,8);
 assert.deepEqual(sim.qualifyingRows(q,q.rounds[0].finishMs,a.race.grid),sim.qualifyingRows(q,q.rounds[0].finishMs,a.race.grid));
 let now=0;const hold=sim.createBroadcastHold(()=>now);assert.ok(hold.begin('r1'));now=299999;assert.equal(hold.release('r1'),false);now=300000;assert.ok(hold.release('r1'));assert.equal(hold.release('r1',true),false);assert.equal(hold.begin('r1'),false);assert.ok(hold.begin('r2'));assert.ok(hold.release('r2',true));assert.equal(hold.release('r2'),false);hold.reset();assert.ok(hold.begin('r1'));
 const schedule=sim.regularSchedule('2026-11-01');assert.equal(schedule.cutoff-schedule.qualifying,55*60000);assert.equal(schedule.race-schedule.cutoff,5*60000);now+=300000;hold.release('r1');assert.deepEqual(schedule,sim.regularSchedule('2026-11-01'));
 console.log(`PASS v0.5: ${checks} meetings, ${segments} physical continuity segments; deterministic full/summary, round barriers, grid, highlights, no-shortcut, cap/DSQ, idempotent 5-minute gates, fixed schedule`);
}finally{await sim.dispose();}
