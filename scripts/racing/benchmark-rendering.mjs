// Before/after browser measurements, never a simulation or Provider request.
// Baseline is a separately built pinned worktree; same browser and viewport.
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const output=resolve(process.env.RACING_BENCH_OUTPUT??'out/racing-phase2a-performance');await mkdir(output,{recursive:true});
const roots={before:resolve('out/racing-performance-baseline'),after:resolve(process.env.RACING_BENCH_AFTER??'out/galactic-racing-phase1-v4')};
const server=createServer(async(req,res)=>{
 try{const u=new URL(req.url,'http://127.0.0.1:4193'),parts=u.pathname.split('/').filter(Boolean),which=parts.shift();
  if(!roots[which])throw Error('ROOT');const file=resolve(roots[which],parts.join('/')||'index.html');
  if(!file.startsWith(roots[which]+sep))throw Error('PATH');
  res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'})[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(4193,'127.0.0.1',r));
const browser=await chromium.launch({headless:process.env.RACING_BENCH_HEADED!=='1',args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const report={browser:browser.version(),environment:(process.env.RACING_BENCH_HEADED==='1'?'Linux Xvfb headed Chromium':'Linux headless Chromium')+' / software SwiftShader; NOT hardware Windows GPU',sampleSeconds:8,measurements:[],longReplay:[],errors:[]};
const percentile=(values,q)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[Math.floor((sorted.length-1)*q)]:0;};
try{
 for(const which of ['before','after']){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});let external=0;
  // App asset URLs are absolute; rewrite to the selected static build. No production network.
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1'){external++;return route.abort();}
   if(!u.pathname.startsWith('/before/')&&!u.pathname.startsWith('/after/'))u.pathname='/'+which+u.pathname;
   return route.continue({url:u.href});});
  await context.addInitScript(()=>{
   const data={generation:0,frames:[],draws:0,triangles:0,contexts:0,buffers:0,textures:0,gpu:'',longTasks:[],raf:[]};
   window.__frameProbe=data;
   const contexts=new WeakMap();let contextRefs=[];
   const resources=gl=>{let r=contexts.get(gl);if(!r){r={buffers:0,textures:0,id:++data.generation};contexts.set(gl,r);contextRefs.push(new WeakRef(gl));data.contexts++;
    gl.canvas.addEventListener('webglcontextlost',()=>{data.buffers-=r.buffers;data.textures-=r.textures;r.buffers=0;r.textures=0;data.contexts--;},{once:true});}return r;};
   window.__liveFrameResources=()=>{
    const live=contextRefs.map(ref=>ref.deref()).filter(gl=>gl&&!gl.isContextLost());
    contextRefs=live.map(gl=>new WeakRef(gl));
    return {contexts:live.length,contextIds:live.map(gl=>contexts.get(gl).id),generation:data.generation,buffers:live.reduce((n,gl)=>n+contexts.get(gl).buffers,0),textures:live.reduce((n,gl)=>n+contexts.get(gl).textures,0)};
   };
   const heartbeat=time=>{data.raf.push(time);if(data.raf.length>900)data.raf.shift();requestAnimationFrame(heartbeat);};requestAnimationFrame(heartbeat);
   for(const Type of [WebGLRenderingContext,WebGL2RenderingContext]){
    const proto=Type.prototype,clear=proto.clear;
    proto.clear=function(mask){if(mask&this.COLOR_BUFFER_BIT){if(!data.gpu){const ext=this.getExtension('WEBGL_debug_renderer_info');data.gpu=ext?this.getParameter(ext.UNMASKED_RENDERER_WEBGL):this.getParameter(this.RENDERER);}data.frames.push({at:performance.now(),draws:data.draws,triangles:data.triangles});if(data.frames.length>900)data.frames.shift();data.draws=0;data.triangles=0;}return clear.call(this,mask);};
    for(const method of ['drawElements','drawArrays']){const fn=proto[method];proto[method]=function(...args){data.draws++;if(args[0]===this.TRIANGLES)data.triangles+=(method==='drawElements'?args[1]:args[2])/3;return fn.apply(this,args);};}
    for(const [create,remove,field] of [['createBuffer','deleteBuffer','buffers'],['createTexture','deleteTexture','textures']]){
     const a=proto[create],b=proto[remove],live=new WeakSet();proto[create]=function(...args){const v=a.apply(this,args);if(v){live.add(v);data[field]++;resources(this)[field]++;}return v;};
     proto[remove]=function(v){if(v&&live.has(v)){live.delete(v);const r=resources(this);if(r[field]>0){r[field]--;data[field]--;}}return b.call(this,v);};
    }
   }
   new PerformanceObserver(list=>{for(const e of list.getEntries()){data.longTasks.push(e.duration);if(data.longTasks.length>900)data.longTasks.shift();}}).observe({type:'longtask',buffered:true});
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(which+': '+e.message));
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  await page.goto('http://127.0.0.1:4193/'+which+'/',{waitUntil:'networkidle'});
  await page.locator('.scene canvas').waitFor();assert.equal(await page.locator('.scene').getAttribute('data-renderer'),'WebGL 2');
  const meeting=JSON.parse(await readFile(roots[which]+'/race.json','utf8'));
  const seek=async ms=>{await page.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},ms);await page.waitForTimeout(150);};
  const pause=async()=>{if(await page.getByRole('button',{name:'일시정지',exact:true}).isVisible())await page.locator('.player-screen').press('k');};
  const settings=async()=>{if(!await page.getByLabel('카메라 선택').isVisible())await page.getByRole('button',{name:'시청 설정',exact:true}).click();};
  const metric=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  let qualMs=0,maxActive=0;for(let ms=0;ms<meeting.qualifying.durationMs;ms+=500){const count=meeting.qualifying.runs.filter(r=>r.startMs<=ms&&r.finishMs>ms).length;if(count>maxActive){qualMs=ms;maxActive=count;}}
  const eventMs=kind=>Math.max(0,(meeting.race.events.find(e=>e.kind===kind)?.tick??280)*250-1000);
  const raceOffset=meeting.raceStartMs-(meeting.raceBroadcast?.preshowStartMs??meeting.raceStartMs);
  const scenarios=[['start-8',0],['normal-corner',35000],['draft-boost',eventMs('BOOST')],['ultimate',eventMs('ULTIMATE')],['incident',eventMs('EXTERNAL')],['auto-cuts',100000],['manual-side',70000],['fullscreen-large',70000],['qualifying-overlap',qualMs]];
  if(meeting.shortcutPassages){const p=meeting.shortcutPassages.find(p=>p.success&&p.mergeMs);scenarios.splice(8,0,['branch-route',(p.entryMs+p.mergeMs)/2]);scenarios.push(['qualifying-results',meeting.qualifying.rounds[0].finishMs]);}
  if(meeting.raceBroadcast){scenarios.unshift(['preshow-grid',-raceOffset]);scenarios.splice(8,0,['last-lap',meeting.race.durationTicks*250-25000],['finisher-spotlight',meeting.raceBroadcast.highlightsStartMs-meeting.raceStartMs]);}
  for(const [label,ms] of scenarios){
   await pause();if(label.startsWith('qualifying-')){await page.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await pause();}
   await settings();await page.getByLabel('카메라 선택').selectOption(label==='manual-side'?'r1':label==='branch-route'?meeting.shortcutPassages.find(p=>p.success&&p.mergeMs).id:'auto');
   if(label==='manual-side')await page.getByLabel('추적 카메라 각도').selectOption('side');
   if(label==='fullscreen-large')await page.getByLabel('HUD 크기',{exact:true}).selectOption('large');
   await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
   if(label==='fullscreen-large')await page.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();
   await seek(ms+(label.startsWith('qualifying-')?0:raceOffset));await page.locator('.player-screen').press('k');await page.waitForTimeout(1200);
   await page.evaluate(()=>{window.__frameProbe.frames=[];window.__frameProbe.longTasks=[];window.__frameProbe.raf=[];});const start=await metric();const wall=Date.now();
   await page.waitForTimeout(8000);const end=await metric();
   const raw=await page.evaluate(()=>({...window.__frameProbe,...window.__liveFrameResources(),visibility:document.visibilityState,canvasPixels:[document.querySelector('.scene canvas').width,document.querySelector('.scene canvas').height]}));await pause();
   const gaps=raw.frames.slice(1).map((f,i)=>f.at-raw.frames[i].at),mean=gaps.reduce((a,b)=>a+b,0)/gaps.length;
   const row={build:which,scenario:label,frames:raw.frames.length,averageFps:1000/mean,medianFps:1000/percentile(gaps,.5),p05Fps:1000/percentile(gaps,.95),frameMs:{p50:percentile(gaps,.5),p95:percentile(gaps,.95),p99:percentile(gaps,.99)},over33_3:gaps.filter(x=>x>33.3).length/gaps.length,over50:gaps.filter(x=>x>50).length/gaps.length,taskMsPerSecond:(end.TaskDuration-start.TaskDuration)*1e6/(Date.now()-wall),scriptMsPerSecond:(end.ScriptDuration-start.ScriptDuration)*1e6/(Date.now()-wall),heapBytes:end.JSHeapUsedSize,drawCallsMedian:percentile(raw.frames.map(f=>f.draws),.5),trianglesMedian:percentile(raw.frames.map(f=>f.triangles),.5),buffers:raw.buffers,textures:raw.textures,gpu:raw.gpu,rafFrames:raw.raf.length,visibility:raw.visibility,canvasPixels:raw.canvasPixels,longTasks:raw.longTasks.length};
   report.measurements.push(row);console.log(JSON.stringify(row));
   if(which==='after')await page.screenshot({path:output+'/'+label+'.png'});
   if(label==='fullscreen-large')await page.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  }
  // Before: 12 x 10s; after: 36 x 10s (six minutes), with renderer switches. Measures
  // retained heap after GC separately from record-file size and transient peaks.
  const memory=[];await cdp.send('HeapProfiler.collectGarbage');memory.push({cycle:0,...await metric()});
  const cycles=Number(process.env.RACING_BENCH_CYCLES??(which==='after'?36:12));
  const longRecord={build:which,seconds:0,plannedSeconds:cycles*10,recordBytes:(await stat(roots[which]+'/race.json')).size,qualifyingMaxActive:maxActive,memory};report.longReplay.push(longRecord);
  for(let i=1;i<=cycles;i++){
   await page.getByRole('button',{name:/본경기 다시보기/}).click();await pause();await seek(raceOffset+(i*17000)%(meeting.race.durationTicks*250-12000));await page.locator('.player-screen').press('k');await page.waitForTimeout(10000);await pause();
   longRecord.seconds=i*10;
   if(i%3===0){
    if(await page.locator('.watch-demo-tools').getAttribute('open')===null)await page.locator('.watch-demo-tools summary').click();
    const swap=page.getByRole('button',{name:/(특별 DSQ 레이스로 변경|일반 레이스로 변경)/});
    const nextCase=(await swap.innerText()).includes('특별')?'special':'normal';
    const oldGeneration=await page.evaluate(()=>window.__frameProbe.generation);
    const loaded=page.waitForResponse(r=>r.url().endsWith(nextCase==='special'?'/special.json':'/race.json'));
    await page.evaluate(()=>sessionStorage.clear());await swap.click();await loaded;await page.waitForTimeout(400);
    // The frozen Phase 2-A baseline predates the handover fix. Normalize only
    // that baseline with a non-playing seek; the candidate must reset by itself.
    if(which==='before'){
     await page.waitForFunction(prior=>window.__frameProbe.generation>prior,oldGeneration);
     await seek(0);
    }
    // Compare like-for-like freshly created scenes. GPU buffers are lazily allocated
    // by visible effects; counts at arbitrary positions/seeds are not a leak test.
    // Loading a different record already resets to a paused race start. Clicking
    // the race playlist would auto-play briefly and allocate random first-tick FX.
    try{await page.waitForFunction(prior=>window.__frameProbe.generation>prior&&
     document.querySelector('.scene')?.dataset.camera==='wide'&&
     Number(document.querySelector('.player-progress')?.value)===0&&
     document.querySelector('.player-controls button[aria-label="재생"]'),oldGeneration);}catch(error){
     const state=await page.evaluate(()=>({resources:window.__liveFrameResources(),camera:document.querySelector('.scene')?.dataset.camera,position:document.querySelector('.player-progress')?.value,paused:!!document.querySelector('.player-controls button[aria-label="재생"]')}));
     report.errors.push(which+' scene reset '+JSON.stringify(state));await page.screenshot({path:output+'/'+which+'-reset-failure.png'});throw error;
    }
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.scene').getAttribute('data-camera'),'wide');
    await cdp.send('HeapProfiler.collectGarbage');memory.push({cycle:i,case:nextCase,...await metric(),resources:await page.evaluate(()=>({...window.__liveFrameResources(),canvas:document.querySelectorAll('.scene canvas').length,badges:document.querySelectorAll('.racer-event').length}))});
   }
  }
  if(which==='after'){
   const references=new Map();let priorGeneration=0;
   for(const checkpoint of memory.filter(x=>x.resources)){
    const r=checkpoint.resources;
    assert.equal(r.contexts,1,'one live WebGL context');assert.deepEqual(r.contextIds,[r.generation],'every retired context must be lost or collected');assert.ok(r.generation>priorGeneration,'swap must create a new renderer');priorGeneration=r.generation;
    assert.equal(r.canvas,1);assert.equal(r.badges,8);
    const initial=references.get(checkpoint.case);if(initial){assert.equal(r.textures,initial.textures,'same case at start: stable textures');assert.equal(r.buffers,initial.buffers,'same case at start: stable buffers');}else references.set(checkpoint.case,r);
   }
  }
  assert.equal(external,0);await context.close();
 }
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(output+'/before-after.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
