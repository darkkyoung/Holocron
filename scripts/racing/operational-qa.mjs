// Called only by the in-process QA fixture. There is no configurable network target.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

async function save(name, data) {
  await mkdir('out', {recursive:true});
  await writeFile('out/3e-'+name+'.json', JSON.stringify(data,null,2));
}

function percentiles(samples) {
  const sorted = [...samples].sort((a,b)=>a-b);
  return Object.fromEntries([50,95,99].map(p=>['p'+p, sorted[Math.ceil(sorted.length*p/100)-1]]));
}

export async function rehearse({get,meeting,setFinal,endpoint}) {
  assert.equal(new URL(endpoint).hostname,'127.0.0.1');
  const shot = async offset => {
    const {status,v} = await get(offset);
    assert.equal(status,200);
    assert.equal(v.offset,offset);
    return v;
  };
  const observed = [];
  for (const offset of [-3600000,-120000,0]) observed.push((await shot(offset)).phase);
  assert.match(observed[0],/^QUALIFYING/);
  assert.deepEqual(observed.slice(1),['PRESHOW','RACE']);
  const laps = new Set();
  const podium = meeting.ceremonyStartMs-meeting.raceStartMs;
  for(let offset=0;offset<podium;offset+=1000) {
    const frame=await shot(offset);
    for(const rider of frame.riders) if(rider.lap) laps.add(rider.lap);
  }
  assert.deepEqual([...laps].sort((a,b)=>a-b),Array.from({length:10},(_,i)=>i+1));
  for(const offset of [0,30000,34000,40000,44000]) {
    const frame=await shot(podium+offset);
    observed.push(frame.phase);
    if(offset===40000) assert.equal(frame.cue.slot,meeting.specialDsq.id);
  }
  const end=meeting.durationMs-meeting.raceStartMs;
  // A scheduler wake can arrive after final_at. Preserve both public clocks
  // across the durable FINAL transition, with independent live and archive offsets.
  const before=(await get(end+1200)).v;
  setFinal(true);
  const after=(await get(end+1300)).v;
  assert.equal(after.phase,'FINAL');
  assert.equal(after.serverMs-before.serverMs,100);
  assert.equal(after.offset-before.offset,100);
  assert.equal(before.replayCursor,undefined);
  assert.equal(before.replayEnd,undefined);
  assert.equal(after.replayCursor,end);
  assert.equal(after.replayEnd,end);
  assert.deepEqual((await get(end+1300)).v,after);
  const archived=(await get(end+1400,'&offset=1100')).v;
  assert.equal(archived.replayCursor,1100);
  assert.equal(archived.offset,1100);
  assert.deepEqual(after.riders,(await get(end+1500)).v.riders);
  const finalBoundary={before:{serverMs:before.serverMs,offset:before.offset,phase:before.phase},
    after:{serverMs:after.serverMs,offset:after.offset,phase:after.phase},offsetDeltaMs:after.offset-before.offset};
  const official=await shot(end);
  assert.deepEqual(official.riders.map(r=>r.slot),meeting.official.map(r=>r.id));
  setFinal(false);

  // One shared URL and cache, two viewer times. Only store a response when
  // the edge-specific policies permit it. This is a local cache model.
  const cache=new Map();
  async function edge(offset) {
    if(cache.has(endpoint)) return cache.get(endpoint);
    const result=await get(offset);
    for(const policy of result.edgePolicy) assert.match(policy,/no-store/);
    if(result.edgePolicy.every(header=>!header?.includes('no-store'))) cache.set(endpoint,result);
    return result;
  }
  assert.equal((await edge(podium+40000)).v.cue.kind,'DSQ');
  assert.equal((await edge(10000)).v.cue?.kind=== 'DSQ',false);
  assert.equal(cache.size,0);

  const bursts=[];
  for(const width of [1,16,64]) {
    for(const wave of ['join','rejoin']) {
      const offset=wave==='join'?10000:22000;
      const samples=await Promise.all(Array.from({length:width},async()=>{
        const at=performance.now();
        const frame=await shot(offset);
        assert.equal(frame.phase,'RACE');
        return performance.now()-at;
      }));
      bursts.push({width,wave,samples,ms:percentiles(samples)});
    }
  }
  await save('http',{clock:'controlled KST, chronological one-second race observations',observed,laps:[...laps],finalBoundary,bursts});
}

export async function measureRender(browser,url) {
  const samples=[];
  for(let i=0;i<5;i++){
    const context=await browser.newContext({viewport:{width:960,height:540}});
    try {
      const page=await context.newPage();
      await page.goto(url,{waitUntil:'commit'});
      const elapsed=await page.evaluate(()=>new Promise(resolve=>{
        function check() {
          if(document.querySelector('[data-testid=phase]')?.textContent==='본경기' && Number(document.querySelector('.live-gl')?.dataset.frames)>0) resolve(performance.now());
          else if(performance.now()>30000) resolve(null);
          else requestAnimationFrame(check);
        }
        check();
      }));
      assert.ok(Number.isFinite(elapsed),'No observed WebGL frame in 30 s');
      samples.push(elapsed);
    } finally {await context.close();}
  }
  await save('render',{platform:process.platform,origin:'navigation start to first observed WebGL frame, warm server; fresh contexts; SwiftShader',samples,ms:percentiles(samples)});
}

export async function checkReaderRecovery({watch,env,race,now}) {
  const url = 'http://qa/api/racing/watch?race='+encodeURIComponent(race);
  const call = bindings=>watch(new Request(url),bindings,now);
  let reads=0, fail=true;
  const vault={get:async key=>{
    reads++;
    await new Promise(resolve=>setTimeout(resolve,25));
    if(fail) throw Error('fixture storage unavailable');
    return env.RACING_PRIVATE_OBJECTS.get(key);
  }};
  const bindings={...env,RACING_PRIVATE_OBJECTS:vault};
  const outage=await call(bindings);
  assert.equal(outage.status,503);
  assert.deepEqual(await outage.json(),{phase:'WAITING'});
  assert.match(outage.headers.get('cache-control'),/no-store/);
  fail=false;
  const samples=await Promise.all(Array.from({length:32},async()=>{
    const at=performance.now(),response=await call(bindings);
    assert.equal(response.status,200);
    assert.equal((await response.json()).phase,'RACE');
    return performance.now()-at;
  }));
  assert.equal(reads,2,'One failed read and one shared retry');
  let delayedReads=0;
  const delayedDb={prepare(sql){
    const stmt=env.RACING_ISOLATED_DB.prepare(sql);
    return {bind(...params){
      const query=stmt.bind(...params);
      return {async first(){
        delayedReads++;
        await new Promise(resolve=>setTimeout(resolve,20));
        return query.first();
      }};
    }};
  }};
  const start=performance.now();
  assert.equal((await call({...bindings,RACING_ISOLATED_DB:delayedDb})).status,200);
  const delayedResponseMs=performance.now()-start;
  assert(delayedReads>0 && delayedResponseMs>=20);
  const dbFault=await call({...bindings,RACING_ISOLATED_DB:{prepare(){throw Error('fixture DB unavailable');}}});
  assert.equal(dbFault.status,503);
  assert.deepEqual(await dbFault.json(),{phase:'WAITING'});
  assert.equal((await call(bindings)).status,200);
  await save('recovery',{injectedR2DelayMs:25,reads,concurrent:32,samples,ms:percentiles(samples),d1Recovery:true,delayedReads,d1DelayPerReadMs:20,delayedResponseMs});
}
