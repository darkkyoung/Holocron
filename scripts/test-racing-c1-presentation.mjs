import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {loadV7} from './racing/load-v7.mjs';
import {loadV6} from './racing/load-v6.mjs';
const s=await loadV7(),old=await loadV6();
try{
 const m=s.simulateMeetingV7('9rf-0'),snapshot=JSON.stringify(m),prior=old.simulateMeetingV6('9rf-0');
 assert.equal(m.version,'galactic-racing-0.7.0');assert.equal(m.race.config.gridLeadIn,2400);
 // Actual rendered front bumper clears the upstream edge of the 4-unit timing stripe.
 const origin=.08*360000,p={x:0,z:0},t={x:0,z:0};s.routePoint(origin,360000,false,p,t);
 const margins=m.race.grid.map(id=>{const r=m.race.frames[0].racers.find(r=>r.id===id),q={x:0,z:0},u={x:0,z:0};s.routePoint(origin+r.progress,360000,false,q,u);return -((q.x-p.x)*t.x+(q.z-p.z)*t.z)-2.75-2;});
 assert.ok(margins.every(x=>x>1),'entire bumper behind stripe with clearance');
 assert.deepEqual(m.qualifying.standings,prior.qualifying.standings);
 assert.deepEqual(m.qualifying.runs.map(r=>[r.id,r.round,r.lapMs,r.valid,r.incident,r.samples]),prior.qualifying.runs.map(r=>[r.id,r.round,r.lapMs,r.valid,r.incident,r.samples]),'measured qualifying laps unchanged; only broadcast launch timestamps shift');
 for(const r of m.qualifying.rounds){
  assert.equal(r.resultEndMs-r.finishMs,15000);
  const a=s.meetingAt(m,r.finishMs+1000),b=s.meetingAt(m,r.finishMs+12000);
  assert.equal(a.racers.length,8);assert.equal(b.racers.length,8);assert.equal(a.completed.length,r.round*8);assert.equal(b.completed.length,r.round*8);
  assert.ok(b.racers.every(x=>x.progress>a.racers.find(y=>y.id===x.id).progress));
  const gate=s.broadcastGates(m).find(g=>g.key==='round-'+r.round);assert.equal(gate.start,r.resultEndMs);
  assert.deepEqual(a,s.meetingAt(m,r.finishMs+1000));
 }
 let now=0;const hold=s.createBroadcastHold(()=>now);assert.ok(hold.begin('round-1'));now=299999;assert.equal(hold.release('round-1'),false);now=300000;assert.ok(hold.release('round-1'));assert.equal(hold.release('round-1'),false);assert.equal(hold.begin('round-1'),false);assert.ok(hold.consumed('round-1'));
 for(const sec of [60,90,120]){const a=s.simulateMeetingV7('9rf-0',true,{preshowSeconds:sec}),b=a.raceBroadcast;
  for(let i=0;i<8;i++){const cue=s.preshowCamera(a,b.preshowStartMs+sec*1000*(.3+.6*(i+.5)/8));assert.equal(cue.racerId,a.race.grid[7-i]);assert.equal(cue.reason,'GRID P'+(8-i));}
  assert.equal(s.preshowCamera(a,a.raceStartMs-5500).shot,'wide');
 }
 const b=m.raceBroadcast,end=m.raceStartMs+m.race.durationTicks*250;
 assert.equal(b.highlightsStartMs-end,10000);assert.equal(b.finisherIds.length,3);assert.equal(b.officialStartMs-b.highlightsStartMs,15000);
 assert.deepEqual(b.finisherIds,m.race.results.filter(r=>r.status==='FINISHED').slice(0,3).map(r=>r.id));
 for(const dt of [0,3000,9999])assert.equal(s.raceStage(m,end+dt).kind,'race');
 assert.deepEqual([0,1,2].map(i=>s.cameraAt(m,b.highlightsStartMs+i*5000,null).shot),['front','side','chase']);
 let dnf=null;for(let i=0;i<30&&!dnf;i++){const x=s.simulateMeetingV7('9rf-'+i);const e=x.race.events.find(e=>e.kind==='DNF');if(e)dnf={m:x,e};}
 assert.ok(dnf);const at=dnf.m.raceStartMs+dnf.e.tick*250;
 assert.equal(s.retirementStyle(dnf.m,dnf.e.racerId,at-1),null);assert.equal(s.retirementStyle(dnf.m,dnf.e.racerId,at+500).flash,1);assert.ok(s.retirementStyle(dnf.m,dnf.e.racerId,at+1300).flash<1);assert.equal(s.retirementStyle(dnf.m,dnf.e.racerId,at+2000).flash,0);
 const points=new Float64Array(16),headings=new Float64Array(16),active=new Uint8Array(8),out=new Float64Array(8),order=[0,1,2,3,4,5,6,7];
 for(let i=0;i<8;i++){points[i*2]=i*100;headings[i*2+1]=1;}active[0]=active[1]=1;points[2]=0;points[3]=1;
 const near=Array.from(s.passingLanes(points,headings,active,order,out));assert.ok(near[1]-near[0]>6,'pair has visible passing gap');
 let maxLateralStep=0,last=near[1];for(let z=1;z<60;z+=.1){points[3]=z;s.passingLanes(points,headings,active,order,out);maxLateralStep=Math.max(maxLateralStep,Math.abs(out[1]-last));last=out[1];assert.ok(Math.abs(out[1])<=6.2);}
 assert.ok(maxLateralStep<.1);assert.equal(out[1],0);points[3]=1;assert.deepEqual(Array.from(s.passingLanes(points,headings,active,order,out)),near);
 assert.equal(s.gridBlend(0),1);assert.equal(s.gridBlend(6000),0);
 assert.equal(JSON.stringify(m),snapshot,'presentation functions never alter recorded results');
 const hashes=[];for(let i=0;i<10;i++)hashes.push(createHash('sha256').update(JSON.stringify(old.simulateMeetingV6('9rf-'+i))).digest('hex'));
 const frozen=JSON.parse(await readFile('docs/racing/evidence/phase2c1-v6-golden.json','utf8'));assert.deepEqual(hashes,frozen.hashes,'v6 full meeting/events/qualifying/race lap hashes preserved');
 await mkdir('out',{recursive:true});await writeFile('out/racing-c1-contract.json',JSON.stringify({status:'PASS',oldV6Hashes:hashes,frontClearanceRenderUnits:margins,maxLateralStep,dnfSeed:dnf.m.race.seed,dnfTick:dnf.e.tick,qualificationLapRecordsPreserved:true,seed:m.race.seed},null,2));
 console.log('PASS C.1: bumper, 15s coast, manual timeout, reverse introductions, DNF, lanes, 10s coast/3 spotlights, v6 hashes');
}finally{await s.dispose();await old.dispose();}
