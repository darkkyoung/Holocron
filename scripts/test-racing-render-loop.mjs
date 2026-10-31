import assert from 'node:assert/strict';
import {loadTestModules} from './test-module-loader.mjs';
import {loadV4} from './racing/load-v4.mjs';
const modules=await loadTestModules(['prototypes/galactic-racing-v2/render-loop.ts','lib/racing/playback.ts','lib/racing/v2/playback.ts']);
const {createRenderLoop}=modules.modules['prototypes/galactic-racing-v2/render-loop.ts'];
const sim=await loadV4();
try{
 let now=0,id=0,ended=0,huds=0;const callbacks=new Map(),draws=[];
 const platform={now:()=>now,request:fn=>{callbacks.set(++id,fn);return id;},cancel:id=>callbacks.delete(id)};
 const loop=createRenderLoop({position:0,end:1200000,platform,render:ms=>draws.push(ms),hud:()=>huds++,ended:()=>ended++});
 const advance=ms=>{const target=now+ms;while(now<target){now=Math.min(target,now+1000/120);const jobs=[...callbacks.values()];callbacks.clear();jobs.forEach(fn=>fn(now));assert.ok(callbacks.size<=1,'one RAF only');}};
 loop.configure({playing:true,rate:1,end:1200000});advance(60000);
 assert.ok(draws.length>=1790&&draws.length<=1801);assert.ok(huds<=301);assert.ok(Math.abs(draws.at(-1)-now)<34);
 loop.visibility(false);const count=draws.length;advance(5000);assert.equal(draws.length,count);
 loop.visibility(true);advance(40);assert.ok(draws.at(-1)>65000);
 loop.configure({playing:false,rate:1,end:1200000});advance(50);const paused=loop.position();advance(1000);assert.equal(loop.position(),paused);assert.equal(callbacks.size,0);
 loop.seek(90000);advance(40);assert.equal(draws.at(-1),90000);
 loop.configure({playing:true,rate:2,end:1200000});advance(1000);assert.ok(Math.abs(loop.position()-92000)<1);
 loop.seek(1199900);advance(100);assert.equal(ended,1);assert.equal(loop.position(),1200000);
 assert.equal(loop.snapshot().capacity,900);assert.ok(loop.snapshot().samples<=900);
 loop.dispose();advance(1000);assert.equal(callbacks.size,0);
 const failed=createRenderLoop({position:0,end:1200000,platform,render:()=>false,hud:()=>{},ended:()=>{}});
 failed.configure({playing:true,rate:1,end:1200000});advance(1000);assert.equal(failed.snapshot().frames,0,'lost renderer must not advertise FPS');failed.dispose();
 const {frameAt,playbackAt}=modules.modules['lib/racing/playback.ts'];
 const {cameraAt}=modules.modules['lib/racing/v2/playback.ts'];
 const m=sim.simulateMeetingV4('9rd-0'),before=JSON.stringify(m);
 for(let ms=0;ms<m.ceremonyStartMs;ms+=137){
  const full=playbackAt(m.race,ms);assert.deepEqual(frameAt(m.race,ms),{tick:full.tick,elapsedMs:full.elapsedMs,racers:full.racers,finished:full.finished});
  if(ms>=m.raceStartMs)assert.deepEqual(cameraAt(m,ms,null),[...m.cameras].reverse().find(c=>c.atMs<=ms-m.raceStartMs)??{atMs:0,racerId:m.race.grid[0],shot:'wide',reason:'GRID'});
 }
 assert.equal(JSON.stringify(m),before);
 console.log('PASS: 30FPS cap, 5Hz HUD, one RAF, hidden-tab wall clock, pause/seek/rate/end/dispose, bounded telemetry, frame/camera parity and immutable record');
}finally{await sim.dispose();await modules.dispose();}
