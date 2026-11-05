import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadV10} from './racing/load-v10.mjs';
import {loadTestModules} from './test-module-loader.mjs';
const s=await loadV10(),l=await loadTestModules(['lib/racing/playback.ts','lib/racing/integrator.ts','lib/racing/v6/lap-times.ts','lib/racing/travel.ts','lib/racing/v10/presentation.ts','lib/racing/v5/track.ts']);const x=Object.assign({},...Object.values(l.modules));
let jumps=0,locks=0,segments=0,branchDeferrals=0;const hashes={};
try{
 for(let n=0;n<100;n++){
  const seed='10rw-'+n,m=s.simulateMeetingV10(seed),summary=s.simulateMeetingV10(seed,false),r=m.race;
  for(const key of ['ultimates','wormholes','raceLaps','official','shortcutPassages'])assert.deepEqual(m[key],summary[key]);
  assert.deepEqual(m.qualifying.standings,summary.qualifying.standings);assert.deepEqual(m.qualifying.runs.map(run=>({...run,samples:[]})),summary.qualifying.runs.map(run=>({...run,samples:[]})));
  assert.deepEqual(r.events,summary.race.events);assert.deepEqual(r.results,summary.race.results);
  if(n<20){assert.deepEqual(m,s.simulateMeetingV10(seed));hashes[seed]=createHash('sha256').update(JSON.stringify(m)).digest('hex');}
  for(const h of m.wormholes){
   assert.ok(h.jumpDistance<=72000.001);assert.ok(h.jumpDistance+m.afterburnGainBound<360000);assert.ok(h.afterburnExtraPhysical/x.SHORTCUT_RATIO<=m.afterburnGainBound+20);
   if(h.jumpTick===null){assert.equal(h.cancelled,true);continue;}jumps++;
   assert.ok(h.jumpTick>=h.startTick+4);if(h.jumpTick>h.startTick+4)branchDeferrals++;
   assert.ok(!m.shortcutPassages.some(p=>p.id===h.id&&p.success&&p.entryMs<h.jumpTick*250&&(p.mergeMs===null||p.mergeMs>h.jumpTick*250)));
   const before=x.frameAt(r,h.jumpTick*250-.001).racers.find(r=>r.id===h.id),after=x.frameAt(r,h.jumpTick*250).racers.find(r=>r.id===h.id);
   assert.ok(Math.abs(before.progress-h.fromProgress)<1);assert.ok(Math.abs(after.progress-h.toProgress)<1);
   assert.equal(r.jumps.filter(j=>j.id===h.id).length,1);
  }
  for(const a of m.ultimates.filter(a=>a.type==='gold')){assert.ok(a.power>=2200&&a.power<=3200);assert.ok(a.endTick-a.startTick<=44);}
  for(const finisher of r.results.filter(r=>r.status==='FINISHED')){const laps=m.raceLaps.filter(l=>l.id===finisher.id);assert.equal(laps.length,10);assert.equal(laps.at(-1).crossingMs,finisher.finishMs);}
  for(let tick=1;tick<r.frames.length;tick++)for(let j=0;j<8;j++){
   const prior=r.frames[tick-1].racers[j],next=r.frames[tick].racers[j],jump=r.jumps?.find(h=>h.id===prior.id&&h.tick===tick);
   const delta=next.progress-prior.progress-(jump?jump.to-jump.from:0);
   assert.ok(delta>=-.001);assert.ok(delta<=r.config.baseStep*1.08*1.035*3.2/x.SHORTCUT_RATIO+1);segments++;
  }
  if(n<20){const b=s.forBroadcast(m),untouched=JSON.stringify(m);
   for(const a of m.ultimates)for(let tick=a.startTick;tick<a.endTick;tick+=.5){const ms=m.raceStartMs+tick*250,cue=s.cameraAt(b,ms,null);assert.equal(cue.racerId,a.id);assert.ok(/ULTIMATE LOCK|WORMHOLE/.test(cue.reason));const other=m.race.racers.find(r=>r.id!==a.id).id;assert.equal(s.cameraAt(b,ms,other,'auto').racerId,other);s.cameraAt(b,ms+30000,null);assert.deepEqual(s.cameraAt(b,ms,null),cue);locks++;}
   assert.equal(JSON.stringify(m),untouched);
  }
 }
 for(const laps of [1,3,5,10,15,30])for(let n=0;n<3;n++){const m=s.simulateMeetingV10('laps-'+n,true,{laps});for(const r of m.race.results.filter(r=>r.status==='FINISHED')){const times=m.raceLaps.filter(l=>l.id===r.id);assert.equal(times.length,laps);assert.equal(times.at(-1).crossingMs,r.finishMs);}}
 // Explicit finish/lap boundary discontinuity, regardless of random seed coverage.
 const jump={distance:65000,jump:{id:'r1',tick:20,from:345000,to:405000}};
 assert.equal(x.crossingTime(340000,360000,jump,20,250),5000);assert.equal(x.crossingTime(340000,342500,jump,20,250),4875);
 const config={...s.configV10({laps:3}),goodChance:0,badChance:0,externalChance:0,slipstreamPower:1000};
 const traveled=new Set(),travel={advance(state,tick,step){if(!traveled.has(state.id)&&state.progress+step>config.track.length-60000){traveled.add(state.id);const from=state.progress+step,to=config.track.length;return {distance:to-state.progress,jump:{id:state.id,tick,from,to}};}return step;}};
 const timing=x.lapRecorder(travel,360000,3,250),finishJump=x.integrateRace('finish-jump',config,['r1','r2','r3','r4','r5','r6','r7','r8'],true,timing,{decide(){},power:()=>1000});
 for(const result of finishJump.results){const jump=finishJump.jumps.find(j=>j.id===result.id);assert.equal(result.finishMs,jump.tick*250);assert.equal(timing.records.filter(l=>l.id===result.id).length,3);assert.equal(x.frameAt(finishJump,result.finishMs-.001).racers.find(r=>r.id===result.id).status,'RACING');}
 const overlapBase=s.simulateMeetingV10('10rw-8'),fake={...overlapBase,ultimates:[{...overlapBase.ultimates[0],id:'r8',startTick:100,endTick:150},{...overlapBase.ultimates[0],id:'r2',startTick:100,endTick:160}]};assert.equal(x.lockedUltimate(fake,fake.raceStartMs+110*250).id,'r2');assert.equal(x.lockedUltimate(fake,fake.raceStartMs+170*250),null);
 const dsq=s.simulateMeetingV10('10rw-14');assert.ok(dsq.specialDsq);assert.equal(dsq.official.find(r=>r.id===dsq.specialDsq.id).points,0);
 const report={status:'PASS',meetings:100,extraLapSettingMeetings:18,segments,jumps,branchDeferrals,lockAndSeekSamples:locks,hashes};await mkdir('out',{recursive:true});await writeFile('out/racing-v10-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,hashes:Object.keys(hashes).length}));
}finally{await s.dispose();await l.dispose();}
