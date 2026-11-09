import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadV13} from './racing/load-v13.mjs';
import {loadV12} from './racing/load-v12.mjs';
import {loadTestModules} from './test-module-loader.mjs';
const s=await loadV13(),old=await loadV12(),extra=await loadTestModules(['lib/racing/v10/ultimate.ts']),u=Object.values(extra.modules)[0];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hashes={};let phases=0,locks=0,gaps=0,emergencies=0;
try{
 const frozen=JSON.parse(await readFile('docs/racing/evidence/v012-contract.json','utf8')).hashes;
 for(const [seed,h] of Object.entries(frozen))assert.equal(hash(old.simulateMeetingV12(seed)),h,'v12 full record preserved');
 for(const key of ['goldPower','goldSeconds','rampSeconds','ordinaryResistance','majorResistance','maxPerRace','cooldownSeconds','hyperShare','baseChance','rankBonus'])assert.deepEqual(s.FINAL_LAP_POLICY[key],old.LATE_ULTIMATE_POLICY[key],key);
 assert.deepEqual(s.PHANTOM_POLICY,old.PHANTOM_POLICY);
 for(const p of [-1,0,.879999,.96,1,NaN,Infinity])assert.equal(s.LAUNCH_V13.eligible(p,0),false);
 for(const p of [.88,.90,.94,.95999])assert.equal(s.LAUNCH_V13.eligible(p,0),true);
 // Force the same ordinary incident RNG path. Active DSQ becomes an existing
 // finite penalty; active DNF and outside-window DSQ remain terminal.
 const c={...s.configV13(),externalChance:0,badChance:1,minorShare:0,mediumShare:0,dnfShare:.2,dsqShare:.8};
 for(const [active,outcome,expected] of [[true,.5,'PENALTY'],[false,.5,'DSQ'],[true,.1,'DNF']]){
  const draws=[0,.9,...(active?[.99]:[]),outcome,.5];let calls=0;
  const racer={id:'r1',grid:1,progress:0,rank:1,speed:0,status:'RACING',finishMs:null,damage:0,stopUntil:0,slowUntil:0,boostUntil:0,ultimateUntil:active?100:0,ultimatePower:2500,ultimateUsed:true,slip:false,stopKind:'STOPPED',random:()=>{calls++;return draws.shift()??.5;}};
  const kinds=[];u.wormholeDynamics('incident-contract',c,s.LAUNCH_V13,s.PHANTOM_POLICY).dynamics.decide(racer,50,c,(_r,k)=>kinds.push(k),(r,k)=>{r.status=k;return true;});
  assert.equal(expected==='PENALTY'?racer.stopKind:racer.status,expected);assert.equal(calls,active&&expected==='PENALTY'?5:active?4:3);
 }
 for(const seed of [...Array.from({length:60},(_,i)=>'13contract-'+i),'13pilot-12','13pilot-133','13pilot-15','13pilot-34','13pilot-96','13edge-4919','13edge-6110']){
  const m=s.simulateMeetingV13(seed),b=s.forBroadcast(m),r=m.race,idx=s.buildTimingIndex(r,m.shortcutPassages),before=hash(m);
  if(Object.keys(hashes).length<20){assert.equal(hash(s.simulateMeetingV13(seed)),before);hashes[seed]=before;}
  const compact=s.simulateMeetingV13(seed,false);for(const k of ['official','raceLaps','ultimates','wormholes','shortcutPassages'])assert.deepEqual(compact[k],m[k]);
  for(const a of m.ultimates)assert.ok(a.progressBefore>=.88&&a.progressBefore<.96);
  for(const h of m.wormholes){const plan=s.cinematicPlan(b).hyper.find(x=>x.id===h.id);assert.equal(plan.start-plan.charge,3000);
   if(h.jumpTick!==null){assert.equal(h.jumpTick-h.phantomStartTick,3);assert.equal(h.afterburnStartTick-h.jumpTick,1);assert.ok(h.jumpDistance<=108001);assert.equal(plan.flight-plan.depart,2000);assert.equal(plan.arrival-plan.flight,550);assert.equal(plan.reveal-plan.arrival,2000);}
   for(let time=plan.charge;time<plan.end;time+=62.5){const ms=b.raceStartMs+time,p=s.cinematicState(b,ms,h.id);assert.ok(p);const first=s.cameraAt(b,ms,null);s.cameraAt(b,ms-18000,null);assert.deepEqual(s.cameraAt(b,ms,null),first);if(first.reason!=='LEADER RETIRES')assert.equal(first.racerId,h.id);assert.equal(s.cameraAt(b,ms,'r3','front').racerId,'r3');locks++;
    assert.ok(p.opacity>=0&&p.opacity<=1);if(p.phase==='departure'||p.phase==='arrival')assert.equal(p.opacity,0);if(p.phase==='failed')assert.equal(p.opacity,1);phases++;
   }
   assert.equal(s.cinematicState(b,b.raceStartMs+plan.terminal,h.id),null);
  }
  for(const e of s.cinematicPlan(b).retirements.filter(e=>e.leader)){for(const dt of [0,100,2000,3499]){const cue=s.cameraAt(b,b.raceStartMs+e.at+dt,null);assert.equal(cue.reason,'LEADER RETIRES');assert.equal(cue.racerId,e.id);emergencies++;}}
  for(let tick=0;tick<r.frames.length;tick+=47){assert.ok(s.gapsToLeader(idx,tick*250).every(g=>!/(NaN|Infinity|\+-)/.test(g.label)));gaps+=8;}
  assert.equal(hash(m),before,'presentation never mutates official record');
 }
 for(const laps of [1,3,5,10,15,30])for(let i=0;i<5;i++){const m=s.simulateMeetingV13('13settings-'+i,true,{laps});for(const a of m.ultimates)assert.ok(a.progressBefore>=.88&&a.progressBefore<.96);for(const r of m.race.results.filter(r=>r.status==='FINISHED')){const times=m.raceLaps.filter(l=>l.id===r.id);assert.equal(times.length,laps);assert.equal(times.at(-1).crossingMs,r.finishMs);}}
 const report={status:'PASS',v12FullHashes:Object.keys(frozen).length,hashes,phases,locks,gaps,emergencies,incidentPolicy:'active ordinary DSQ -> finite penalty; active DNF / outside DSQ preserved'};await mkdir('out',{recursive:true});await writeFile('out/racing-v13-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,hashes:Object.keys(hashes).length}));
}finally{await s.dispose();await old.dispose();await extra.dispose();}
