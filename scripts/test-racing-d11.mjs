import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {loadV8} from './racing/load-v8.mjs';
import {loadTestModules} from './test-module-loader.mjs';
const s=await loadV8(),l=await loadTestModules(['prototypes/galactic-racing-v2/competition-director.ts']),d=Object.values(l.modules)[0];
const frozen=JSON.parse(await readFile('docs/racing/evidence/phase2d11-v8-frozen.json'));
const report={status:'PASS',frozen:0,oldLowerMs:0,newLowerMs:0,totalMs:0,oldCuts:0,newCuts:0,cases:{},qualifyingApproaches:0,manualAutoShots:[]};
try{
 for(const [seed,hash] of Object.entries(frozen)){
  const raw=s.simulateMeetingV8(seed);assert.equal(createHash('sha256').update(JSON.stringify(raw)).digest('hex'),hash);report.frozen++;
  const m=s.forBroadcast(raw),end=raw.race.durationTicks*250,old=s.broadcastCues(raw.race,{},true);report.totalMs+=end;
  report.oldCuts+=old.length;report.newCuts+=m.cameras.length;
  const durationBelow=cues=>cues.reduce((total,c,i)=>{const frame=raw.race.frames[Math.min(raw.race.frames.length-1,Math.floor(c.atMs/250))],r=frame.racers.find(r=>r.id===c.racerId);return total+(r.rank>=7&&!c.reason.includes('FINISH')?(cues[i+1]?.atMs??end)-c.atMs:0);},0);
  report.oldLowerMs+=durationBelow(old);report.newLowerMs+=durationBelow(m.cameras);
  for(const c of m.cameras){assert.notEqual(c.shot,'side');if(!report.cases[c.reason])report.cases[c.reason]={seed,ms:c.atMs,id:c.racerId,decision:d.competitionCandidate(raw.race,c.atMs)};}
  for(const round of m.qualifying.rounds){assert.equal(s.cameraAt(m,round.finishMs+4000,null).shot,'wide');assert.equal(s.cameraAt(m,round.resultEndMs-.001,null).shot,'wide');assert.notDeepEqual(s.meetingAt(m,round.finishMs+4000).racers,s.meetingAt(m,round.finishMs+6000).racers);}
  report.qualifyingApproaches+=m.qualifyingCameras.filter(c=>c.reason==='QUALIFYING FINISH APPROACH').length;
  for(const id of raw.race.racers.map(r=>r.id)){
   const shots=new Set();for(let at=raw.raceStartMs+1000;at<raw.ceremonyStartMs;at+=5000){const a=s.cameraAt(m,at,id,'auto');assert.equal(a.racerId,id);shots.add(a.shot);s.cameraAt(m,at+9999,id,'auto');assert.deepEqual(s.cameraAt(m,at,id,'auto'),a);assert.equal(s.cameraAt(m,at,id,'side').shot,'side');}assert.ok(shots.size>=2);if(seed==='9rf-0')report.manualAutoShots.push({id,shots:[...shots]});
  }
  // Selection must ignore future outcomes and secret DSQ. Only observed frame/event prefixes.
  for(const ms of [10000,50000,150000]){const tick=Math.floor(ms/250),truncated={...raw.race,results:[],frames:raw.race.frames.slice(0,tick+1),events:raw.race.events.filter(e=>e.tick<=tick)};assert.deepEqual(d.competitionCandidate(raw.race,ms),d.competitionCandidate(truncated,ms));}
  assert.equal(createHash('sha256').update(JSON.stringify(raw)).digest('hex'),hash,'viewer never mutates source');
 }
 assert.ok(report.newLowerMs<report.oldLowerMs,'reduce low-rank non-finish coverage');assert.ok(report.qualifyingApproaches>0);
 report.oldLowerPercent=report.oldLowerMs/report.totalMs*100;report.newLowerPercent=report.newLowerMs/report.totalMs*100;
 await writeFile('out/racing-d11-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await s.dispose();await l.dispose();}
