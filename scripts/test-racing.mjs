import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadTestModules} from './test-module-loader.mjs';
import {replayHandler} from './racing/http.mjs';

const loaded = await loadTestModules(['lib/racing/simulator.ts','lib/racing/config.ts','lib/racing/events.ts','lib/racing/playback.ts']);
const {simulateRace,simulateSummary} = loaded.modules['lib/racing/simulator.ts'];
const {CONFIG:c,SIMULATOR_VERSION:v} = loaded.modules['lib/racing/config.ts'];
const {decisions} = loaded.modules['lib/racing/events.ts'];
const {playbackAt} = loaded.modules['lib/racing/playback.ts'];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const savedFetch = globalThis.fetch, savedRandom = Math.random;
globalThis.fetch = () => {throw Error('EXTERNAL_CALL_FORBIDDEN');};
Math.random = () => {throw Error('UNSEEDED_RANDOM_FORBIDDEN');};
try {
  const race = simulateRace('vesper-001');
  // A versioned golden records the entire timeline, not just the winner.
  assert.equal(v,'galactic-racing-0.1.0');
  assert.equal(hash(race),'c2e00c0e94fad71ee39bf08721db20da05ba454f0e4ba509eeed68d684f840c8');
  assert.deepEqual(simulateRace('vesper-001'),race);
  assert.notEqual(hash(simulateRace('vesper-002')),hash(race));
  for (const seed of ['', 'x'.repeat(65),'a/b',null,7]) assert.throws(()=>simulateRace(seed),/INVALID_RACE_SEED/);
  assert.throws(()=>simulateRace('x','unknown'),/UNSUPPORTED_SIMULATOR_VERSION/);
  assert.throws(()=>{race.results[0].id='override';},TypeError);
  assert.throws(()=>{race.frames[2].racers[0].progress=99;},TypeError);
  assert.throws(()=>{race.config.baseStep=999;},TypeError);
  assert.throws(()=>race.events.push({}),TypeError);
  assert.deepEqual(playbackAt(race,-10).racers,race.frames[0].racers);
  assert.equal(playbackAt(race,NaN).tick,0);
  assert.equal(playbackAt(race,1e9).finished,true);
  assert.equal(playbackAt(race,1e9).tick,race.durationTicks);
  const before = hash(race);
  for (const time of [5000,100,100000,0,100000]) playbackAt(race,time);
  assert.equal(hash(race),before,'replay must never mutate or regenerate the result');
  const bytes=Buffer.from(JSON.stringify(race));
  const handler=replayHandler(new Map([['/race.json',bytes],['/',Buffer.from('viewer')]]),before);
  function request(method,url,host='127.0.0.1:4173') {
    const response={headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status){this.status=status;},end(body){this.body=body;}};
    handler({method,url,headers:{host}},response);return response;
  }
  const get=request('GET','/race.json');
  assert.equal(get.status,200);assert.equal(get.headers['X-Race-SHA256'],before);
  assert.equal(createHash('sha256').update(get.body).digest('hex'),before);
  assert.equal(request('POST','/race.json').status,405);
  assert.equal(request('GET','/race.json','evil.example').status,403);
  assert.equal(request('GET','/../package.json').status,404);
  assert.equal(request('GET','/%2e%2e/package.json').status,404);
  assert.equal(request('GET','/regenerate?winner=r8').status,404);
  assert.equal(request('HEAD','/race.json').body,undefined);
  assert.deepEqual(request('GET','/race.json?seed=override').body,get.body);
  assert.throws(()=>playbackAt(simulateSummary('x'),0),/REPLAY_TIMELINE_REQUIRED/);

  const kinds = new Set(), losses = new Set();
  let maxRetired = 0, ultimateLosers = 0, lowerGridWinners = 0;
  for (let n=0;n<512;n++) {
    const r=simulateRace(`test-${n}`), summary=simulateSummary(`test-${n}`);
    assert.deepEqual(summary.results,r.results); assert.deepEqual(summary.events,r.events);
    assert.equal(r.frames.length,r.durationTicks+1);
    assert.ok(r.durationTicks<=c.maxTicks && r.events.length<=c.maxEvents);
    const retired=r.results.filter(x=>['DNF','DSQ'].includes(x.status)).length;
    maxRetired=Math.max(maxRetired,retired); assert.ok(retired<=2);
    assert.equal(r.results.length,8); assert.equal(new Set(r.results.map(x=>x.id)).size,8);
    assert.deepEqual(r.results.map(x=>x.position),[1,2,3,4,5,6,7,8]);
    assert.ok(r.results.every(x=>x.status!=='RACING'));
    const finishers=r.results.filter(x=>x.status==='FINISHED');
    assert.ok(finishers.length>=6);
    for(let i=1;i<finishers.length;i++) assert.ok(finishers[i].finishMs>=finishers[i-1].finishMs);
    const counts=new Map();
    for(let i=0;i<r.events.length;i++) {
      const e=r.events[i]; kinds.add(e.kind);
      assert.ok(e.tick>=0 && e.tick<=r.durationTicks);
      if(i) assert.ok(e.tick>=r.events[i-1].tick);
      if(e.kind==='ULTIMATE') {
        counts.set(e.racerId,(counts.get(e.racerId)??0)+1);
        assert.equal(counts.get(e.racerId),1);
        if(e.racerId!==r.results[0].id) ultimateLosers++;
      }
      if(['MINOR','MEDIUM','MAJOR','PIT','PENALTY','SHORTCUT_FAIL'].includes(e.kind)) {
        const later=r.frames[Math.min(e.tick+40,r.durationTicks)].racers.find(s=>s.id===e.racerId);
        if(later.rank>e.rank) losses.add(e.kind);
      }
    }
    if(r.results[0].grid>=5) lowerGridWinners++;
    for(let t=0;t<r.frames.length;t++) {
      const frame=r.frames[t];assert.equal(frame.tick,t);
      assert.deepEqual(frame.racers.map(s=>s.rank).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
      for(let i=0;i<8;i++) {
        const s=frame.racers[i],prior=r.frames[Math.max(0,t-1)].racers[i];
        assert.ok(Number.isInteger(s.progress) && s.speed>=0 && s.progress<=c.track.length);
        assert.ok(s.progress>=prior.progress);
        if(prior.status!=='RACING') {assert.equal(s.status,prior.status);assert.equal(s.progress,prior.progress);}
        if(s.status!=='RACING'||s.motion==='PIT'||s.motion==='PENALTY') assert.equal(s.speed,0);
        if(t===0) assert.equal(s.progress,0-r.grid.indexOf(s.id)*c.gridGap);
      }
    }
    assert.equal(r.events.filter(e=>e.kind==='FINISH').length,finishers.length);
  }
  assert.equal(maxRetired,2);
  assert.ok(ultimateLosers>0 && lowerGridWinners>0);
  assert.deepEqual([...kinds].sort(),['START','SLIPSTREAM','BOOST','SHORTCUT','SHORTCUT_FAIL','MINOR','MEDIUM','MAJOR','PIT','PENALTY','DNF','DSQ','ULTIMATE','LEAD','FINISH'].sort());
  assert.equal(losses.size,6,'all adverse mechanisms must sometimes cost actual positions');

  // Controlled draws isolate rank eligibility and resistance, not winner selection.
  function state(draws,patch={}) {
    let index=0;
    return {id:'r1',grid:1,progress:c.track.length*.5,rank:1,speed:0,status:'RACING',finishMs:null,
      damage:0,stopUntil:0,slowUntil:0,boostUntil:0,ultimateUntil:0,ultimatePower:1000,
      ultimateUsed:false,slip:false,stopKind:'STOPPED',random:()=>draws[index++]??.99,...patch};
  }
  function decide(s,retire=()=>false){const events=[];decisions(s,80,c,(_s,k)=>events.push(k),retire);return events;}
  assert.ok(!decide(state([.003])).includes('ULTIMATE'));
  assert.ok(decide(state([.003,.5,.5],{rank:8})).includes('ULTIMATE'));
  assert.ok(!decide(state([0,0,.5],{ultimateUsed:true,ultimateUntil:100})).includes('MINOR'));
  assert.ok(decide(state([0,.99,.5,.8,.5],{ultimateUsed:true,ultimateUntil:100})).includes('MAJOR'));
  const capState=state([0,.99,0,.5],{ultimateUsed:true});
  const capEvents=decide(capState,()=>false);
  assert.ok(capEvents.includes('MAJOR') && capEvents.includes('PENALTY'));
  assert.equal(capState.status,'RACING');assert.ok(capState.stopUntil>80);
  for(const [draw,status] of [[.01,'DNF'],[.11,'DSQ']]) {
    const s=state([0,.99,draw],{ultimateUsed:true});let retired;
    decide(s,(_s,outcome)=>{retired=outcome;return true;});assert.equal(retired,status);
  }
  console.log('PASS racing: golden + 512 full/summary pairs, all events, cap, comeback, resistance, immutable replay; external calls ZERO');
} finally {globalThis.fetch=savedFetch;Math.random=savedRandom;await loaded.dispose();}
