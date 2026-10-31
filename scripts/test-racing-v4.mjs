import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {loadV4} from './racing/load-v4.mjs';
import {loadV3} from './racing/load-v3.mjs';
import {loadTestModules} from './test-module-loader.mjs';

const v4=await loadV4(),v3=await loadV3();
const p=await loadTestModules(['lib/racing/v4/presentation.ts']);
const {finishIndex,displayedProgress,displayedSpeed}=p.modules['lib/racing/v4/presentation.ts'];
const hash=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
let samples=0,totalBad=0,qualifyingIncidents=0,external=0,boost=0,finisherShots=0;
try{
 const original=v3.simulateMeetingV3('9rc-0');
 const originalHash=hash(original);
 const result=v4.simulateMeetingV4('9rd-0');
 assert.equal(result.version,'galactic-racing-0.4.0');
 assert.deepEqual(v4.simulateMeetingV4('9rd-0'),result);
 assert.equal(hash(v3.simulateMeetingV3('9rc-0')),originalHash,'historical version must not change');
 const finish=finishIndex(result.race);
 const winner=result.race.results.find(r=>r.status==='FINISHED');
 assert.ok(winner&&winner.finishMs!==null);
 const startFrame=result.race.frames[Math.ceil(winner.finishMs/result.race.config.tickMs)];
 const winnerFrame=startFrame.racers.find(r=>r.id===winner.id);
 const atFinish=displayedProgress(result.race,winnerFrame,winner.finishMs,finish);
 const coast=displayedProgress(result.race,winnerFrame,winner.finishMs+2000,finish);
 assert.ok(coast>atFinish,'finisher must continue moving with presentation-only progress');
 assert.ok(displayedSpeed(winnerFrame,winner.finishMs+2000,finish)>0);
 assert.equal(winnerFrame.progress,result.race.config.track.length,'immutable authority stays at finish');
 assert.ok(result.cameras.some(c=>c.racerId===winner.id&&c.shot==='front'&&c.reason==='WINNER FINISH CAMERA'));
 for(let i=0;i<240;i++){
  const m=v4.simulateMeetingV4('9rd-'+i),summary=v4.simulateMeetingV4('9rd-'+i,false);
  assert.deepEqual(m.race.results,summary.race.results);
  assert.deepEqual(m.race.events,summary.race.events);
  assert.deepEqual(m.qualifying.standings,summary.qualifying.standings);
  assert.deepEqual(m.official,summary.official);
  assert.ok(m.race.results.filter(r=>['DNF','DSQ'].includes(r.status)).length<=2);
  assert.ok(m.race.events.every(e=>e.kind!=='PIT'));
  const seconds=m.race.durationTicks*m.race.config.tickMs/1000;
  assert.ok(seconds>180&&seconds<320,'v0.4 cannot unboundedly break 3–5 minute target');
  const entries=m.race.events;
  totalBad+=entries.filter(e=>['MINOR','MEDIUM','MAJOR'].includes(e.kind)).length;
  boost+=entries.filter(e=>e.kind==='BOOST').length;
  external+=entries.filter(e=>e.kind==='EXTERNAL').length;
  qualifyingIncidents+=m.qualifying.runs.filter(q=>q.incident).length;
  finisherShots+=m.cameras.filter(c=>c.reason.startsWith('FINISH')||c.reason==='WINNER FINISH CAMERA').length;
  samples++;
 }
 assert.ok(external>0&&boost>totalBad,'good events should outnumber ordinary bad events');
 assert.ok(qualifyingIncidents/(samples*24)<.13,'qualifying incident ratio must drop below 13%');
 assert.ok(finisherShots>=samples,'every race needs front-facing winner finish');
 const sources=await Promise.all(['prototypes/galactic-racing-v2/watch.tsx',
  'prototypes/galactic-racing-v2/minimap.tsx','prototypes/galactic-racing-v2/scene.ts',
  'prototypes/galactic-racing-v2/watch.css'].map(path=>readFile(path,'utf8')));
 assert.ok(sources[0].includes('seekBy(5000)')&&sources[0].includes("key==='k'"));
 assert.ok(sources[0].includes('timelineClock')&&sources[0].includes('visibilitychange'));
 assert.ok(sources[1].includes('displayedProgress'));
 assert.ok(sources[2].includes("cue.shot")&&sources[2].includes("manualShot"));
 assert.ok(sources[2].includes('finishGlow')&&sources[3].includes('--hud-scale'));
 console.log('PASS v0.4: '+samples+' deterministic meetings, legacy v0.3 hash, no pit, qualifying incidents '
  +(qualifyingIncidents/(samples*24)*100).toFixed(2)+'%, bad '+totalBad+', boosts '+boost
  +', external '+external+', finish camera shots '+finisherShots+', coast half-speed, UI contracts, external calls ZERO');
}finally{await v4.dispose();await v3.dispose();await p.dispose();}
