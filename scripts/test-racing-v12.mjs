import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadV12} from './racing/load-v12.mjs';
import {loadV11} from './racing/load-v11.mjs';
const s=await loadV12(),old=await loadV11(),hash=m=>createHash('sha256').update(JSON.stringify(m)).digest('hex');
const hashes={};let locks=0,gapSamples=0,phases=0,launches=0;
try{
 const frozen=JSON.parse(await readFile('docs/racing/evidence/v011-contract.json','utf8')).hashes;
 for(const [seed,h] of Object.entries(frozen))assert.equal(hash(old.simulateMeetingV11(seed)),h,'v11 full meeting unchanged');
 assert.deepEqual(s.LATE_ULTIMATE_POLICY,old.LATE_ULTIMATE_POLICY);
 assert.deepEqual(s.LATE_ULTIMATE_POLICY.goldPower,[2200,3200]);assert.deepEqual(s.LATE_ULTIMATE_POLICY.goldSeconds,[6,11]);
 for(const seed of [...Array.from({length:100},(_,i)=>'12contract-'+i),'12pilot-6','12pilot-19','12pilot-72','12pilot-79','12pilot-81','12pilot-630','12final-15329','12final-38475']){
  const m=s.simulateMeetingV12(seed),b=s.forBroadcast(m),r=m.race,idx=s.buildTimingIndex(r,m.shortcutPassages);
  if(Object.keys(hashes).length<20){assert.equal(hash(s.simulateMeetingV12(seed)),hash(m));hashes[seed]=hash(m);}
  const compact=s.simulateMeetingV12(seed,false);for(const k of ['official','raceLaps','ultimates','wormholes','shortcutPassages'])assert.deepEqual(compact[k],m[k]);assert.deepEqual(compact.race.events,r.events);
  for(const a of m.ultimates){launches++;assert.ok(a.progressBefore>=.7&&a.progressBefore<.95);if(a.type==='gold'){assert.ok(a.power>=2200&&a.power<=3200);assert.ok(a.endTick-a.startTick<=44);}
   for(let tick=a.startTick;tick<a.endTick;tick+=.25){const ms=b.raceStartMs+tick*250;assert.equal(s.cameraAt(b,ms,null).racerId,a.id);const known=s.cameraAt(b,ms,null);s.cameraAt(b,ms+60000,null);assert.deepEqual(s.cameraAt(b,ms,null),known);locks++;}
  }
  for(const h of m.wormholes){
   assert.equal(s.phantomPhase(b,b.raceStartMs+h.endTick*250,h.id),null);
   const retired=r.events.find(e=>e.racerId===h.id&&['DNF','DSQ'].includes(e.kind)&&e.tick===h.endTick);
   if(retired){const fixed=r.frames[retired.tick].racers.find(x=>x.id===h.id).progress;for(let t=retired.tick;t<r.frames.length;t++){const frame=r.frames[t].racers.find(x=>x.id===h.id);assert.equal(frame.status,retired.kind);assert.equal(frame.progress,fixed);}assert.equal(s.cameraAt(b,b.raceStartMs+h.endTick*250,null).reason.startsWith('PHANTOM'),false);}

   if(h.cancelled){assert.equal(h.jumpTick,null);if(h.phantomStartTick!==null&&h.phantomStartTick<h.endTick)assert.equal(s.phantomPhase(b,b.raceStartMs+h.phantomStartTick*250+125,h.id)?.phase,'acceleration');continue;}
   assert.equal(r.jumps.filter(j=>j.id===h.id).length,1);assert.ok(h.jumpDistance<=r.config.track.length/r.config.track.laps*.3+1);
   assert.equal(h.jumpTick-h.phantomStartTick,3);assert.equal(h.afterburnStartTick-h.jumpTick,1);
   const at=age=>s.phantomPhase(b,b.raceStartMs+h.phantomStartTick*250+age,h.id);
   for(const [age,phase,opacity] of [[125,'acceleration',1],[312.5,'fade',.5],[500,'transit',0],[875,'return',.5],[1250,'afterburn',1]]){
    const ms=h.phantomStartTick*250+age;if(ms>=h.endTick*250)continue;
    const value=at(age);assert.equal(value.phase,phase);assert.equal(value.opacity,opacity);at(99999);assert.deepEqual(at(age),value);phases++;
   }
   // The one visible burst really traverses official road; visual alpha cannot
   // create distance. Jump skipped points remain unknown to GAP until commit.
   const pre=r.frames[h.phantomStartTick].racers.find(x=>x.id===h.id),burst=r.frames[h.phantomStartTick+1].racers.find(x=>x.id===h.id);
   assert.ok(burst.progress>pre.progress);assert.ok(h.burstExtraPhysical>0);
   const mid=(h.fromProgress+h.toProgress)/2;assert.equal(s.crossingAt(idx,h.id,mid,h.jumpTick*250-1),null);assert.equal(s.crossingAt(idx,h.id,mid,h.jumpTick*250),h.jumpTick*250);
   assert.ok(!m.shortcutPassages.some(p=>p.id===h.id&&p.success&&p.entryMs<=h.jumpTick*250&&(p.mergeMs===null||p.mergeMs>h.jumpTick*250)));
  }
  for(let tick=0;tick<r.frames.length;tick+=37){const ms=tick*250,gaps=s.gapsToLeader(idx,ms);assert.ok(gaps.every(x=>!/(NaN|Infinity|\+-)/.test(x.label)));
   const prefix={...r,frames:r.frames.slice(0,tick+1),durationTicks:tick,jumps:r.jumps?.filter(j=>j.tick<=tick),results:r.results.filter(x=>x.finishMs!==null&&x.finishMs<=ms)},paths=m.shortcutPassages.filter(p=>p.entryMs<=ms).map(p=>({...p,mergeMs:p.mergeMs!==null&&p.mergeMs<=ms?p.mergeMs:null}));
   assert.deepEqual(s.gapsToLeader(s.buildTimingIndex(prefix,paths),ms),gaps);gapSamples+=8;
  }
 }
 for(const laps of [1,3,5,10,15,30])for(let n=0;n<5;n++){const m=s.simulateMeetingV12('12settings-'+n,true,{laps});for(const a of m.ultimates)assert.ok(a.progressBefore>=.7&&a.progressBefore<.95);for(const r of m.race.results.filter(x=>x.status==='FINISHED')){const entries=m.raceLaps.filter(x=>x.id===r.id);assert.equal(entries.length,laps);assert.equal(entries.at(-1).crossingMs,r.finishMs);}}
 const report={status:'PASS',oldV11FullHashes:Object.keys(frozen).length,meetings:108,lapSettingsMeetings:30,launches,locks,gapSamples,phaseChecks:phases,hashes};await mkdir('out',{recursive:true});await writeFile('out/racing-v12-contract.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,hashes:Object.keys(hashes).length}));
}finally{await s.dispose();await old.dispose();}
