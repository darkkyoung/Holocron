// Before/after browser measurements, never a simulation or Provider request.
// Baseline is a separately built pinned Phase 1 worktree; same browser and viewport.
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const output=resolve('out/racing-phase2a-performance');await mkdir(output,{recursive:true});
const roots={before:resolve('out/racing-performance-baseline'),after:resolve('out/galactic-racing-phase1-v4')};
const server=createServer(async(req,res)=>{
 try{const u=new URL(req.url,'http://127.0.0.1:4193'),parts=u.pathname.split('/').filter(Boolean),which=parts.shift();
  if(!roots[which])throw Error('ROOT');const file=resolve(roots[which],parts.join('/')||'index.html');
  if(!file.startsWith(roots[which]+sep))throw Error('PATH');
  res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'})[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(4193,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const report={browser:browser.version(),environment:'Linux CI / software SwiftShader; NOT hardware Windows GPU',sampleSeconds:8,measurements:[],longReplay:[],errors:[]};
const percentile=(values,q)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[Math.floor((sorted.length-1)*q)]:0;};
try{
 for(const which of ['before','after']){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});let external=0;
  // App asset URLs are absolute; rewrite to the selected static build. No production network.
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1'){external++;return route.abort();}
   if(!u.pathname.startsWith('/before/')&&!u.pathname.startsWith('/after/'))u.pathname='/'+which+u.pathname;
   return route.continue({url:u.href});});
  await context.addInitScript(()=>{
   const data={frames:[],draws:0,triangles:0,contexts:0,buffers:0,textures:0,gpu:'',longTasks:[]};
   window.__frameProbe=data;
   for(const Type of [WebGLRenderingContext,WebGL2RenderingContext]){
    const proto=Type.prototype,clear=proto.clear;
    proto.clear=function(mask){if(mask&this.COLOR_BUFFER_BIT){if(!data.gpu){const ext=this.getExtension('WEBGL_debug_renderer_info');data.gpu=ext?this.getParameter(ext.UNMASKED_RENDERER_WEBGL):this.getParameter(this.RENDERER);}data.frames.push({at:performance.now(),draws:data.draws,triangles:data.triangles});if(data.frames.length>8000)data.frames.shift();data.draws=0;data.triangles=0;}return clear.call(this,mask);};
    for(const method of ['drawElements','drawArrays']){const fn=proto[method];proto[method]=function(...args){data.draws++;if(args[0]===this.TRIANGLES)data.triangles+=(method==='drawElements'?args[1]:args[2])/3;return fn.apply(this,args);};}
    for(const [create,remove,field] of [['createBuffer','deleteBuffer','buffers'],['createTexture','deleteTexture','textures']]){
     const a=proto[create],b=proto[remove],live=new WeakSet();proto[create]=function(...args){const v=a.apply(this,args);if(v){live.add(v);data[field]++;}return v;};
     proto[remove]=function(v){if(v&&live.has(v)){live.delete(v);data[field]--;}return b.call(this,v);};
    }
   }
   new PerformanceObserver(list=>{for(const e of list.getEntries()){data.longTasks.push(e.duration);if(data.longTasks.length>8000)data.longTasks.shift();}}).observe({type:'longtask',buffered:true});
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(which+': '+e.message));
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  await page.goto('http://127.0.0.1:4193/'+which+'/',{waitUntil:'networkidle'});
  await page.locator('.track-minimap').waitFor();assert.equal(await page.locator('.scene').getAttribute('data-renderer'),'WebGL 2');
  const meeting=JSON.parse(await readFile(roots[which]+'/race.json','utf8'));
  const seek=async ms=>{await page.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},ms);await page.waitForTimeout(150);};
  const pause=async()=>{if(await page.getByRole('button',{name:'일시정지',exact:true}).isVisible())await page.locator('.player-screen').press('k');};
  const settings=async()=>{if(!await page.getByLabel('카메라 선택').isVisible())await page.getByRole('button',{name:'시청 설정',exact:true}).click();};
  const metric=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  let qualMs=0,maxActive=0;for(let ms=0;ms<meeting.qualifying.durationMs;ms+=500){const count=meeting.qualifying.runs.filter(r=>r.startMs<=ms&&r.finishMs>ms).length;if(count>maxActive){qualMs=ms;maxActive=count;}}
  const eventMs=kind=>Math.max(0,(meeting.race.events.find(e=>e.kind===kind)?.tick??280)*250-1000);
  const scenarios=[['start-8',0],['normal-corner',35000],['draft-boost',eventMs('BOOST')],['ultimate',eventMs('ULTIMATE')],['incident',eventMs('EXTERNAL')],['auto-cuts',100000],['manual-side',70000],['fullscreen-large',70000],['qualifying-overlap',qualMs]];
  for(const [label,ms] of scenarios){
   await pause();if(label==='qualifying-overlap'){await page.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await pause();}
   await settings();await page.getByLabel('카메라 선택').selectOption(label==='manual-side'?'r1':'auto');
   if(label==='manual-side')await page.getByLabel('추적 카메라 각도').selectOption('side');
   if(label==='fullscreen-large')await page.getByLabel('HUD 크기',{exact:true}).selectOption('large');
   await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
   if(label==='fullscreen-large')await page.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();
   await seek(ms);await page.locator('.player-screen').press('k');await page.waitForTimeout(1200);
   await page.evaluate(()=>{window.__frameProbe.frames=[];window.__frameProbe.longTasks=[];});const start=await metric();const wall=Date.now();
   await page.waitForTimeout(8000);const end=await metric();
   const raw=await page.evaluate(()=>window.__frameProbe);await pause();
   const gaps=raw.frames.slice(1).map((f,i)=>f.at-raw.frames[i].at),mean=gaps.reduce((a,b)=>a+b,0)/gaps.length;
   const row={build:which,scenario:label,frames:raw.frames.length,averageFps:1000/mean,medianFps:1000/percentile(gaps,.5),p05Fps:1000/percentile(gaps,.95),frameMs:{p50:percentile(gaps,.5),p95:percentile(gaps,.95),p99:percentile(gaps,.99)},over33_3:gaps.filter(x=>x>33.3).length/gaps.length,over50:gaps.filter(x=>x>50).length/gaps.length,taskMsPerSecond:(end.TaskDuration-start.TaskDuration)*1e6/(Date.now()-wall),scriptMsPerSecond:(end.ScriptDuration-start.ScriptDuration)*1e6/(Date.now()-wall),heapBytes:end.JSHeapUsedSize,drawCallsMedian:percentile(raw.frames.map(f=>f.draws),.5),trianglesMedian:percentile(raw.frames.map(f=>f.triangles),.5),buffers:raw.buffers,textures:raw.textures,gpu:raw.gpu,longTasks:raw.longTasks.length};
   report.measurements.push(row);console.log(JSON.stringify(row));
   if(which==='after')await page.screenshot({path:output+'/'+label+'.png'});
   if(label==='fullscreen-large')await page.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  }
  // Twelve repeated 10s viewing cycles; four renderer/data switches. Measures
  // retained heap after GC separately from record-file size and transient peaks.
  const memory=[];await cdp.send('HeapProfiler.collectGarbage');memory.push({cycle:0,...await metric()});
  for(let i=1;i<=12;i++){
   await page.getByRole('button',{name:/본경기 다시보기/}).click();await pause();await seek((i*17000)%150000);await page.locator('.player-screen').press('k');await page.waitForTimeout(10000);await pause();
   if(i%3===0){if(await page.locator('.watch-demo-tools').getAttribute('open')===null)await page.locator('.watch-demo-tools summary').click();await page.getByRole('button',{name:/(특별 DSQ 레이스로 변경|일반 레이스로 변경)/}).click();await page.waitForTimeout(400);await cdp.send('HeapProfiler.collectGarbage');memory.push({cycle:i,...await metric(),resources:await page.evaluate(()=>({buffers:window.__frameProbe.buffers,textures:window.__frameProbe.textures,canvas:document.querySelectorAll('.scene canvas').length,badges:document.querySelectorAll('.racer-event').length}))});}
  }
  report.longReplay.push({build:which,seconds:120,recordBytes:(await stat(roots[which]+'/race.json')).size,qualifyingMaxActive:maxActive,memory});
  assert.equal(external,0);await context.close();
 }
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(output+'/before-after.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
