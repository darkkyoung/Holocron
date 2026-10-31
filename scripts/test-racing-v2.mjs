import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV2} from './racing/load-v2.mjs';
import {readFile} from 'node:fs/promises';
const sim=await loadV2(),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const oldFetch=globalThis.fetch,oldRandom=Math.random;globalThis.fetch=()=>{throw Error('NO_NETWORK');};Math.random=()=>{throw Error('NO_UNSEEDED_RANDOM');};
let assertions=0;const ok=(v,msg)=>{assert.ok(v,msg);assertions++;};
try{
 const m=sim.simulateMeeting('9rb-0');
 assert.deepEqual(sim.simulateMeeting('9rb-0'),m);assert.equal(m.version,'galactic-racing-0.2.0');
 assert.equal(hash(m),'5307ead3658e0fa88e7bccb0d6f752efcee0ad696aca6313add06e4c023d46de');
 assert.equal(m.race.config.track.length,1080000);
 assert.throws(()=>sim.simulateMeeting('bad/seed'),/INVALID/);
 assert.throws(()=>{m.official[0].points=100;},TypeError);
 assert.throws(()=>{m.qualifying.runs[0].samples[0].progress=100;},TypeError);
 const seen=new Set();let specialCount=0;
 for(let n=0;n<200;n++){
  const a=sim.simulateMeeting(`9rb-${n}`),b=sim.simulateMeeting(`9rb-${n}`,false),q=a.qualifying,r=a.race;
  assert.deepEqual(a.official,b.official);assert.deepEqual(a.race.events,b.race.events);assert.deepEqual(q.standings,b.qualifying.standings);
  ok(q.runs.length===24);ok(q.standings.length===8);ok(r.frames.length===r.durationTicks+1);
  const firstRound=q.runs.slice(0,8).map(x=>x.id);
  for(let round=0;round<3;round++)assert.deepEqual(q.runs.slice(round*8,round*8+8).map(x=>x.id),firstRound);
  ok(q.runs[1].startMs<q.runs[0].finishMs,'pipeline overlap');
  for(let i=1;i<q.runs.length;i++)ok(q.runs[i].startMs-q.runs[i-1].startMs>=8000);
  for(const row of q.standings){const laps=q.runs.filter(l=>l.id===row.id);ok(laps.length===3);for(let i=1;i<3;i++)ok(laps[i].startMs>laps[i-1].finishMs,'no duplicate car');const valid=laps.filter(l=>l.valid);assert.equal(row.bestMs,valid.length?Math.min(...valid.map(l=>l.lapMs)):null);}
  for(const lap of q.runs){ok(lap.samples.at(-1).progress===q.lapLength);ok(lap.lapMs===lap.finishMs-lap.startMs);for(let i=1;i<lap.samples.length;i++)ok(lap.samples[i].ms>lap.samples[i-1].ms&&lap.samples[i].progress>=lap.samples[i-1].progress);}
  ok(r.results.filter(x=>['DNF','DSQ'].includes(x.status)).length<=2);
  r.frames[0].racers.forEach(s=>assert.equal(s.progress,0-r.grid.indexOf(s.id)*r.config.gridGap));
  assert.deepEqual(r.grid,q.standings.map(x=>x.id));
  r.events.forEach(e=>seen.add(e.kind));
  for(let i=1;i<a.cameras.length;i++)ok(a.cameras[i].atMs-a.cameras[i-1].atMs>=6000);
  if(a.specialDsq){specialCount++;ok(r.results.slice(0,3).some(x=>x.id===a.specialDsq.id));const dsq=a.official.find(x=>x.id===a.specialDsq.id);ok(dsq.points===0&&dsq.status==='DSQ'&&dsq.position===8);ok(a.official[0].status==='FINISHED');}
  assert.deepEqual(a.official.map(x=>x.position),[1,2,3,4,5,6,7,8]);
 }
 ok(specialCount>0);ok(seen.has('ULTIMATE')&&seen.has('PIT')&&seen.has('SHORTCUT')&&seen.has('DSQ')&&seen.has('DNF'));
 const before=hash(m);
 for(const time of [0,12000,m.qualifying.durationMs+1,m.raceStartMs, m.raceStartMs+60000,m.ceremonyStartMs,m.durationMs]){
  const state=sim.meetingAt(m,time);ok(state.ms===time);for(const r of m.race.racers)ok(sim.cameraAt(m,time,r.id).racerId===r.id);
 }
 // Qualifying camera never tracks an inactive historical lap during the live pipeline.
 for(let t=0;t<m.qualifying.durationMs;t+=250){
  const state=sim.meetingAt(m,t);
  if(state.racers.length)ok(state.racers.some(r=>r.id===sim.cameraAt(m,t,null).racerId),
    'auto qualifying camera target must still be on track');
 }
 const localViewer=await readFile('prototypes/galactic-racing-v2/viewer.tsx','utf8');
 ok(localViewer.includes('[rate,setRate]=useState(2)'),'local replay starts at 2x, authoritative timeline unchanged');
 ok(hash(m)===before,'camera/replay cannot mutate record');
 ok(sim.meetingAt(m,-99).ms===0);ok(sim.meetingAt(m,Infinity).ms===0);ok(sim.meetingAt(m,1e9).ms===m.durationMs);
 ok(sim.meetingAt(m,0).table.every(x=>!Number.isFinite(x.bestMs)),'future lap times hidden');
 const partial=sim.meetingAt(m,m.qualifying.runs[0].finishMs+1);ok(partial.completed.length>0&&partial.completed.length<24);
 const points={r8:80,r2:75};const cam=sim.directRace(m.race,points);ok(cam.length>0);ok(hash(m)===before);
 for(const file of ['prototypes/galactic-racing-v2/viewer.tsx','prototypes/galactic-racing-v2/scene.ts']){const s=await readFile(file,'utf8');ok(!/simulateMeeting|randomStream|Math\.random|\/api\//.test(s),'client never simulates or calls production API');}
 console.log(`PASS v0.2 ${assertions} assertions + 200 full/summary pairs; qualifying, official DSQ, cameras, replay, zero network`);
}finally{globalThis.fetch=oldFetch;Math.random=oldRandom;await sim.dispose();}
