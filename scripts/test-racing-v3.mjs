import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {loadV2} from './racing/load-v2.mjs';
import {loadV3} from './racing/load-v3.mjs';

const old=await loadV2(),v3=await loadV3();
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const realFetch=globalThis.fetch,realRandom=Math.random;
globalThis.fetch=()=>{throw Error('EXTERNAL_NETWORK_FORBIDDEN');};
Math.random=()=>{throw Error('UNSEEDED_RANDOM_FORBIDDEN');};
let assertions=0,externalSeen=0,specialSeen=0;
const ok=(value,description)=>{assert.ok(value,description);assertions++;};
try{
 const historical=old.simulateMeeting('9rb-0');
 assert.equal(hash(historical),'5307ead3658e0fa88e7bccb0d6f752efcee0ad696aca6313add06e4c023d46de');
 const one=v3.simulateMeetingV3('9rc-0');
 assert.equal(one.version,'galactic-racing-0.3.0');
 assert.equal(one.race.config.noPitStops,true);
 assert.equal(one.race.config.externalChance,.006);
 assert.equal(one.qualifying.runs.length,24);
 ok(!one.race.events.some(e=>e.kind==='PIT'),'pit events removed');
 ok(!one.race.frames.some(f=>f.racers.some(r=>r.motion==='PIT')),'pit motion removed');
 assert.deepEqual(v3.simulateMeetingV3('9rc-0'),one);
 let maxDuration=0,minDuration=Infinity;
 for(let i=0;i<200;i++){
  const m=v3.simulateMeetingV3('9rc-'+i),summary=v3.simulateMeetingV3('9rc-'+i,false);
  assert.deepEqual(m.race.results,summary.race.results);
  assert.deepEqual(m.official,summary.official);
  assert.deepEqual(m.race.events,summary.race.events);
  assert.deepEqual(m.qualifying.standings,summary.qualifying.standings);
  ok(m.race.events.every(e=>e.kind!=='PIT'),'no pit event');
  ok(m.race.frames.every(f=>f.racers.every(r=>r.motion!=='PIT')),'no pit motion');
  ok(m.race.results.filter(r=>r.status==='DNF'||r.status==='DSQ').length<=2,'normal elimination cap');
  ok(m.official.every((r,j)=>r.position===j+1),'official classification order');
  ok(m.race.racers.length===8&&m.qualifying.runs.length===24,'fixed roster and measured rounds');
  ok(m.race.config.track.length===1080000,'unchanged physical race distance');
  const duration=m.race.durationTicks*m.race.config.tickMs/1000;
  minDuration=Math.min(duration,minDuration);maxDuration=Math.max(duration,maxDuration);
  for(const e of m.race.events)if(e.kind==='EXTERNAL'){externalSeen++;ok(e.power>=1&&e.power<=3,'typed outside hazard');}
  if(m.specialDsq){specialSeen++;const disq=m.official.find(r=>r.id===m.specialDsq.id);
   ok(disq?.status==='DSQ'&&disq.points===0,'official DSQ and zero points');}
 }
 ok(externalSeen>0,'outside events actually appear');
 // A 1% rare event need not occur in the first 200 seeds.
 let specialSeed=null;
 for(let i=0;i<1500&&!specialSeed;i++)if(v3.simulateMeetingV3('9rc-'+i,false).specialDsq)specialSeed='9rc-'+i;
 ok(!!specialSeed,'a deterministic special DSQ seed exists in the bounded demo scan');
 const special=v3.simulateMeetingV3(specialSeed);
 const disqualified=special.official.find(r=>r.id===special.specialDsq?.id);
 ok(disqualified?.status==='DSQ'&&disqualified.points===0,'special DSQ official zero-point classification');
 const source=await readFile('prototypes/galactic-racing-v2/watch.tsx','utf8');
 ok(source.includes("type Segment='qualifying'|'race'|'ceremony'"),'separate replay segments');
 ok(source.includes('requestFullscreen'),'native fullscreen control');
 ok(source.includes('시즌별 기록'),'season sidebar labeled as a demo');
 const css=await readFile('prototypes/galactic-racing-v2/watch.css','utf8');
 ok(css.includes('aspect-ratio:16/9')&&css.includes('mobile-timing'),'mobile 16:9 with separate timing');
 console.log('PASS 9R-B.2 pit-free + external v0.3: '+assertions+' checks / 200 summary+full pairs; external '+externalSeen+', special DSQ '+specialSeen+', duration '+minDuration+'-'+maxDuration+'s; v0.2 historical Golden unchanged, zero network');
}finally{globalThis.fetch=realFetch;Math.random=realRandom;await old.dispose();await v3.dispose();}
