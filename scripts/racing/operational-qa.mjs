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
  setFinal(true);
  const official=await shot(meeting.durationMs-meeting.raceStartMs);
  assert.deepEqual(official.riders.map(r=>r.slot),meeting.official.map(r=>r.id));
  setFinal(false);

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
  await save('http',{clock:'controlled KST, chronological one-second race observations',observed,laps:[...laps],bursts});
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
          if(Number(document.querySelector('.live-gl')?.dataset.frames)>0) resolve(performance.now());
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
