import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadV8} from './racing/load-v8.mjs';
import {loadV7} from './racing/load-v7.mjs';
const s=await loadV8(),old=await loadV7();
try{
 const golden=JSON.parse(await readFile('docs/racing/evidence/phase2d1-v7-frozen.json'));
 for(const [seed,hash] of Object.entries(golden))assert.equal(createHash('sha256').update(JSON.stringify(old.simulateMeetingV7(seed))).digest('hex'),hash,'frozen v7 complete record');
 const m=s.simulateMeetingV8('9rf-0'),prior=old.simulateMeetingV7('9rf-0'),b=s.forBroadcast(m),snapshot=JSON.stringify(m);
 const mean=q=>q.runs.reduce((n,r)=>n+r.lapMs,0)/24;
 assert.ok(mean(m.qualifying)/mean(prior.qualifying)>.47&&mean(m.qualifying)/mean(prior.qualifying)<.53);
 for(const r of m.qualifying.rounds){const runs=m.qualifying.runs.filter(x=>x.round===r.round);assert.equal(runs.length,8);assert.equal(r.resultEndMs-r.finishMs,15000);for(let i=1;i<8;i++)assert.equal(runs[i].startMs-runs[i-1].startMs,8000);}
 assert.ok(m.qualifying.runs.every(r=>!r.incident||r.incident.atMs<r.lapMs));
 for(let second=0;second<5;second++){
  const ms=m.raceStartMs-5000+1000*second,c=s.cameraAt(b,ms,null);
  assert.equal(c.reason,'COUNTDOWN '+(5-second));assert.deepEqual(s.meetingAt(m,ms+999).racers,m.race.frames[0].racers);
  assert.equal(s.cameraAt(b,ms,null).shot,s.cameraAt(b,ms+999,null).shot);
 }
 assert.equal(s.raceStage(b,m.raceStartMs).kind,'race');
 const cameraReport={};
 for(const [name,cues,end] of [['race',b.cameras,m.race.durationTicks*250],['qualifying',b.qualifyingCameras,m.qualifying.durationMs]]){
  const counts={},duration={};for(let i=0;i<cues.length;i++){const c=cues[i],dt=(cues[i+1]?.atMs??end)-c.atMs;assert.ok(dt>=0);assert.notEqual(c.shot,'side');counts[c.shot]=(counts[c.shot]??0)+1;duration[c.shot]=(duration[c.shot]??0)+dt;if(c.shot==='trackside')assert.ok(s.TV_STATIONS.some(s=>s.id===c.stationId));}
  assert.ok(counts.trackside>0);cameraReport[name]={cuts:cues.length,counts,timePercent:Object.fromEntries(Object.entries(duration).map(([k,v])=>[k,v/end*100])),cutsPerMinute:cues.length/end*60000};
 }
 for(let ms=0;ms<b.ceremonyStartMs;ms+=1000)assert.notEqual(s.cameraAt(b,ms,null).shot,'side');
 // All six fixed lenses clear both road ribbons. Scenery tops are below their 32-unit lens.
 const clearance=[];for(const station of s.TV_STATIONS){let min=Infinity;for(let i=0;i<1200;i++)for(const branch of [false,true]){const p=s.routePoint(i/1200,1,branch,{x:0,z:0},{x:0,z:0});min=Math.min(min,Math.hypot(p.x-station.position[0],p.z-station.position[2]));}assert.ok(min>23);clearance.push({id:station.id,min});}
 let manualTv=0;for(let ms=b.raceStartMs;ms<b.raceStartMs+300000;ms+=500){const a=s.cameraAt(b,ms,'r1','trackside');s.cameraAt(b,ms+10000,'r1','trackside');assert.deepEqual(s.cameraAt(b,ms,'r1','trackside'),a);if(a.shot==='trackside')manualTv++;}assert.ok(manualTv>0);
 for(const r of m.race.results){if(r.status==='FINISHED'){const at=m.raceStartMs+r.finishMs;assert.equal(s.finishMark(m,r.id,at-1),null);assert.equal(s.finishMark(m,r.id,at),'finished');}else assert.notEqual(s.finishMark(m,r.id,m.ceremonyStartMs),'finished');}
 let special;for(let i=0;i<500;i++){const x=s.simulateMeetingV8('9rd-'+i,false);if(x.specialDsq){special=x;break;}}
 assert.ok(special);const id=special.specialDsq.id;assert.equal(s.finishMark(special,id,special.ceremonyStartMs+19999),'finished');assert.equal(s.finishMark(special,id,special.ceremonyStartMs+20000),'dsq');
 assert.equal(JSON.stringify(m),snapshot,'camera editing never mutates official record');
 const report={status:'PASS',frozenV7:Object.keys(golden).length,qualifying:{v7MeanLapMs:mean(prior.qualifying),v8MeanLapMs:mean(m.qualifying),v7DurationMs:prior.qualifying.durationMs,v8DurationMs:m.qualifying.durationMs,launchGapMs:8000},cameraReport,clearance,manualTvSamples:manualTv};
 await mkdir('out',{recursive:true});await writeFile('out/racing-d1-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await s.dispose();await old.dispose();}
