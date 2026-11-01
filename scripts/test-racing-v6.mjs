import assert from 'node:assert/strict';
import {loadV6} from './racing/load-v6.mjs';
import {loadV5} from './racing/load-v5.mjs';
const s=await loadV6(),old=await loadV5();let segments=0;
try{
 for(const laps of [1,3,5,10,15,30]){
  const a=s.simulateMeetingV6('v6-laps',true,{laps}),b=s.simulateMeetingV6('v6-laps',false,{laps});
  assert.deepEqual(a.raceLaps,b.raceLaps);
  for(const r of a.race.results.filter(r=>r.status==='FINISHED')){const rows=a.raceLaps.filter(x=>x.id===r.id);assert.equal(rows.length,laps);assert.equal(rows.at(-1).crossingMs,r.finishMs);assert.ok(rows.every(x=>x.lapMs>0));}
  assert.deepEqual(a.race.results,b.race.results);assert.deepEqual(a.race.events,b.race.events);assert.deepEqual(a.shortcutPassages,b.shortcutPassages);
  assert.equal(a.race.config.track.length,360000*laps);assert.ok(a.race.results.every(r=>r.status!=='RACING'));
  for(const r of a.race.results.filter(r=>r.status==='FINISHED'))assert.equal(r.progress,360000*laps);
 }
 const base=old.simulateMeetingV5('9re-0');assert.equal(base.race.durationTicks*250,218750);
 const a=s.simulateMeetingV6('9rf-0'),snapshot=JSON.stringify(a);
 assert.equal(a.race.config.baseStep,base.race.config.baseStep*2);assert.equal(a.race.config.track.laps,10);
 assert.deepEqual(a,s.simulateMeetingV6('9rf-0'));
 assert.equal(a.raceStartMs-a.raceBroadcast.preshowStartMs,120000);
 assert.equal(a.raceStartMs-a.raceBroadcast.countdownStartMs,5000);
 for(const delta of [0,10000,119999])assert.deepEqual(s.meetingAt(a,a.raceBroadcast.preshowStartMs+delta).racers,a.race.frames[0].racers);
 assert.equal(s.meetingAt(a,a.raceStartMs).raceMs,0);
 assert.equal(s.raceStage(a,a.raceStartMs-1).kind,'countdown');assert.equal(s.raceStage(a,a.raceStartMs).kind,'race');
 assert.equal(a.raceBroadcast.officialStartMs-a.raceBroadcast.highlightsStartMs,5000*a.raceBroadcast.finisherIds.length);
 for(const [i,id] of a.raceBroadcast.finisherIds.entries()){
  assert.equal(s.raceStage(a,a.raceBroadcast.highlightsStartMs+i*5000).id,id);
  assert.equal(s.cameraAt(a,a.raceBroadcast.highlightsStartMs+i*5000,null).racerId,id);
  assert.equal(a.race.results.find(r=>r.id===id).status,'FINISHED');
 }
 for(const sec of [60,90,120]){
  const b=s.simulateMeetingV6('9rf-0',true,{preshowSeconds:sec});assert.deepEqual(b.race,a.race);assert.deepEqual(b.official,a.official);
  assert.equal(b.raceStartMs-b.qualifying.durationMs,sec*1000);
  const at=Date.parse('2026-11-01T21:00:00+09:00'),schedule=s.scheduledBroadcast('2026-11-01',at,sec);
  assert.equal(schedule.phase,'race');assert.equal(schedule.predictionsOpen,false);assert.ok(schedule.overrideManualHold);
  assert.equal(schedule.preshow,at-sec*1000);assert.equal(schedule.countdown,at-5000);
  assert.equal(s.scheduledBroadcast('2026-11-01',at-300000,sec).predictionsOpen,false);
 }
 for(const bad of [0,31,1.5,NaN])assert.throws(()=>s.simulateMeetingV6('bad',false,{laps:bad}));
 assert.throws(()=>s.simulateMeetingV6('bad',false,{preshowSeconds:61}));
 for(let n=0;n<100;n++){
  const m=s.simulateMeetingV6(`9rf-${n}`),r=m.race,lap=360000,origin=r.config.routeOffset*lap;
  const summary=s.simulateMeetingV6(`9rf-${n}`,false);assert.deepEqual(r.results,summary.race.results);assert.deepEqual(r.events,summary.race.events);
  assert.equal(m.qualifying.runs.length,24);assert.equal(m.qualifying.rounds.length,3);
  for(let j=1;j<3;j++)assert.ok(m.qualifying.rounds[j].startMs>=m.qualifying.rounds[j-1].resultEndMs);
  assert.deepEqual(r.grid,m.qualifying.standings.map(x=>x.id));
  for(const [i,id] of r.grid.entries())assert.equal(r.frames[0].racers.find(x=>x.id===id).progress,0-i*r.config.gridGap);
  assert.equal(new Set(r.config.gridLanes).size,2);
  assert.ok(r.results.filter(x=>['DNF','DSQ'].includes(x.status)).length<=2);
  if(m.specialDsq){assert.ok(r.results.slice(0,3).some(x=>x.id===m.specialDsq.id));assert.equal(m.official.find(x=>x.id===m.specialDsq.id).points,0);}
  const seen=new Set();for(const p of m.shortcutPassages){const key=p.id+':'+p.lap;assert.ok(!seen.has(key));seen.add(key);assert.ok(p.lap<=10);assert.ok(Math.abs((p.entryProgress%lap)/lap-.12)<1e-8);}
  for(let tick=1;tick<r.frames.length;tick++)for(let j=0;j<8;j++){
   const x=r.frames[tick-1].racers[j],y=r.frames[tick].racers[j];
   const pos=v=>s.routePoint(v.progress+origin,lap,s.usesBranch(m.shortcutPassages,v.id,v.progress),{x:0,z:0},{x:0,z:0});
   const p=pos(x),q=pos(y),maxStep=r.config.baseStep*1.08*1.035*1.55;
   assert.ok(y.progress>=x.progress);assert.ok(y.progress-x.progress<=maxStep/s.SHORTCUT_RATIO+1);
   const maximum=maxStep/100*s.MAIN_LENGTH/(lap/100)+.3;
   assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<=maximum,'nonphysical position jump');segments++;
  }
 }
 assert.equal(JSON.stringify(a),snapshot,'new settings/seek must never rewrite existing records');
 console.log(JSON.stringify({status:'PASS',fullMeetings:100,physicalSegments:segments,lapSettings:[1,3,5,10,15,30],defaultSeconds:a.race.durationTicks*.25,oldDefaultSeconds:218.75,seed:'9rf-0'}));
}finally{await s.dispose();await old.dispose();}
