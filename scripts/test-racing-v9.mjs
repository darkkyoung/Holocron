import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {loadV9} from './racing/load-v9.mjs';
import {loadTestModules} from './test-module-loader.mjs';
const s=await loadV9(),l=await loadTestModules(['lib/racing/v5/track.ts','prototypes/galactic-racing-v2/competition-director.ts']),x=Object.assign({},...Object.values(l.modules));
let segments=0,activations=0;const hashes={},samples=[];
try{
 for(let n=0;n<100;n++){
  const seed=`9ru-${n}`,m=s.simulateMeetingV9(seed),summary=s.simulateMeetingV9(seed,false),r=m.race;
  assert.deepEqual(r.results,summary.race.results);assert.deepEqual(r.events,summary.race.events);assert.deepEqual(m.ultimates,summary.ultimates);assert.deepEqual(m.raceLaps,summary.raceLaps);
  if(n<20){assert.deepEqual(m,s.simulateMeetingV9(seed));hashes[seed]=createHash('sha256').update(JSON.stringify({race:m.race,qualifying:m.qualifying,paths:m.shortcutPassages,official:m.official,ultimates:m.ultimates})).digest('hex');}
  assert.equal(m.qualifying.runs.length,24);assert.ok(r.results.every(z=>z.status!=='RACING'));assert.ok(r.results.filter(z=>['DNF','DSQ'].includes(z.status)).length<=2);
  assert.ok(m.ultimates.length<=2);assert.equal(new Set(m.ultimates.map(z=>z.id)).size,m.ultimates.length);
  for(const a of m.ultimates){activations++;const before=r.frames[a.startTick-1].racers.find(z=>z.id===a.id);assert.equal(before.status,'RACING');assert.ok(a.progressBefore>=.35&&a.progressBefore<=.8);assert.ok(a.power>=2200&&a.power<=4200);assert.ok(a.endTick>a.startTick);assert.equal(r.events.filter(e=>e.racerId===a.id&&e.kind==='ULTIMATE').length,1);}
  for(const a of r.results.filter(z=>z.status==='FINISHED'))assert.equal(m.raceLaps.filter(z=>z.id===a.id).length,10);
  for(let tick=1;tick<r.frames.length;tick++)for(let j=0;j<8;j++){
   const a=r.frames[tick-1].racers[j],b=r.frames[tick].racers[j],lap=360000,origin=r.config.routeOffset*lap;
   const point=z=>x.routePoint(z.progress+origin,lap,x.usesBranch(m.shortcutPassages,z.id,z.progress),{x:0,z:0},{x:0,z:0});
   const p=point(a),q=point(b),maxStep=r.config.baseStep*1.08*1.035*4.2;
   assert.ok(b.progress>=a.progress);assert.ok(b.progress-a.progress<=maxStep/x.SHORTCUT_RATIO+1);assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<=maxStep/100*x.MAIN_LENGTH/(lap/100)+.5);segments++;
  }
  if(n<5){const broadcast=s.forBroadcast(m),frozen=JSON.stringify(m);for(const a of m.ultimates){const at=m.raceStartMs+a.startTick*250+500,pose=s.meetingAt(m,at);s.meetingAt(m,at+20000);assert.deepEqual(s.meetingAt(m,at),pose);samples.push({seed,id:a.id,type:a.type,decision:x.competitionCandidate(r,a.startTick*250)});}assert.equal(JSON.stringify(m),frozen);assert.ok(broadcast.cameras.length);}
 }
 for(const laps of [1,3,15,30]){const m=s.simulateMeetingV9('v9-laps',false,{laps});assert.ok(m.race.results.every(z=>z.status!=='RACING'));for(const r of m.race.results.filter(z=>z.status==='FINISHED'))assert.equal(m.raceLaps.filter(z=>z.id===r.id).length,laps);}
 const report={status:'PASS',meetings:100,physicalSegments:segments,activations,hashes,samples};await writeFile('out/racing-v9-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await s.dispose();await l.dispose();}
