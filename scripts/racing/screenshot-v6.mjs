import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('out/galactic-racing-phase2-v6'),out=resolve('out/galactic-racing-v6-qa');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/'))throw Error('PATH');res.setHeader('content-type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4194,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const m=JSON.parse(await readFile(root+'/race.json','utf8')),offset=m.raceStartMs-m.raceBroadcast.preshowStartMs;
const report={browser:browser.version(),environment:'Linux Chromium / SwiftShader; not Windows hardware',viewports:[]};
try{
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:label==='desktop'?{dir:out+'/video',size:{width:1440,height:900}}:undefined});let external=0;const errors=[];
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():(external++,r.abort()));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  const seek=async ms=>{await p.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},ms);await p.waitForTimeout(250);};
  const shot=async name=>{await p.locator('.player-screen').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+label+'-'+name+'.png'});};
  const options=async()=>{await p.locator('.player-screen').hover();if(!await p.getByLabel('카메라 선택').isVisible())await p.getByRole('button',{name:'시청 설정',exact:true}).click();};
  const pause=async()=>{if(await p.getByRole('button',{name:'일시정지',exact:true}).isVisible())await p.locator('.player-screen').press('k');};
  const pose=async()=>JSON.parse(await p.locator('.scene').getAttribute('data-pose'));
  await p.goto('http://127.0.0.1:4194/?motion=1',{waitUntil:'networkidle'});await p.locator('.scene canvas').waitFor();await p.waitForTimeout(300);
  assert.equal(await p.locator('.scene').getAttribute('data-renderer'),'WebGL 2');assert.ok((await p.locator('.build-strip').innerText()).includes('0.6.0'));
  assert.ok((await p.locator('.race-production').innerText()).includes('PRESHOW'));const initial=await pose();
  await shot('preshow');await seek(offset-5000);await shot('two-column-grid');const grid=await pose();
  for(let i=0;i<8;i++){assert.deepEqual(grid.cars[i].position,initial.cars[i].position,'no movement before gun');const c=grid.cars[i];assert.ok(c.visible&&Math.abs(c.screen[0])<.85&&Math.abs(c.screen[1])<.82,'all eight grid cars inside viewport');}
  await seek(offset-2500);assert.ok((await p.locator('.race-production').innerText()).includes('START LIGHTS'));await shot('countdown');
  await seek(offset);await p.locator('.player-screen').press('k');await p.waitForTimeout(1500);await pause();const started=await pose();assert.ok(started.ms>m.raceStartMs);assert.notDeepEqual(started.cars[0].position,grid.cars[0].position);assert.ok((await p.locator('.race-timer time').innerText()).startsWith('00:0'),'race clock starts at gun, not preshow');await shot('start-10-laps');
  assert.ok((await p.locator('.lap-hud').innerText()).includes('/ 10'));assert.equal(await p.locator('.track-minimap svg circle').count(),8);
  await options();await p.getByLabel('카메라 선택').selectOption('r1');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  // Fixed-time pose must be identical regardless of the path used to seek there.
  const cornerTick=m.race.frames.find(f=>{const r=f.racers.find(r=>r.id==='r1');return r.progress/360000>(390/600-.08);}).tick;
  const corner=offset+cornerTick*250;
  for(const angle of ['chase','front','side']){
   await options();await p.getByLabel('추적 카메라 각도').selectOption(angle);await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
   await seek(corner);const first=await pose();await seek(corner+12000);await seek(corner);assert.deepEqual(await pose(),first,'seek-independent camera/car pose');await shot('corner-'+angle);
   if(angle==='chase')for(const [part,delta] of [['approach',-750],['apex',0],['exit',750]]){await seek(corner+delta);await shot('sharp-corner-'+part);}
  }
  // Observe actual playing frames, not only stationary screenshots.
  await seek(corner-3000);await p.locator('.player-screen').press('k');const motion=[];
  for(let i=0;i<50;i++){await p.waitForTimeout(100);motion.push(await pose());}await pause();
  let maxStep=0,maxYaw=0;for(let i=1;i<motion.length;i++){
   const a=motion[i-1],b=motion[i],dt=(b.ms-a.ms)/1000;if(dt<=0)continue;
   const x=a.cars[0],y=b.cars[0];maxStep=Math.max(maxStep,Math.hypot(...x.position.map((v,j)=>v-y.position[j]))/dt);
   maxYaw=Math.max(maxYaw,Math.abs(Math.atan2(Math.sin(y.yaw-x.yaw),Math.cos(y.yaw-x.yaw))));
  }
  assert.ok(motion.at(-1).ms>motion[0].ms+3000);assert.ok(maxStep<100,'continuous render position');assert.ok(maxYaw<1.3,'no corner orientation flip');
  await writeFile(out+'/'+label+'-corner-motion.json',JSON.stringify({maxRenderUnitsPerSecond:maxStep,maxYawRadians:maxYaw,motion},null,2));
  const branch=m.shortcutPassages.find(x=>x.success&&x.mergeMs);
  await options();await p.getByLabel('카메라 선택').selectOption(branch.id);await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  for(const [name,ms] of [['shortcut-entry',branch.entryMs],['shortcut-mid',(branch.entryMs+branch.mergeMs)/2],['shortcut-merge',branch.mergeMs]]){await seek(offset+ms);await shot(name);}
  await options();await p.getByLabel('카메라 선택').selectOption('auto');await p.getByLabel('HUD 크기',{exact:true}).selectOption('large');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(500);await shot('fullscreen-large');
  const fullPose=await pose();assert.ok(fullPose.fog[1]>Math.hypot(...fullPose.camera)+400,'portrait framing is not hidden by distance fog');
  const bounds=await p.locator('.scene canvas').evaluate(c=>({w:c.width,h:c.height}));assert.ok(bounds.w>=width-10);
  await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  await seek(offset+m.race.durationTicks*250-20000);await shot('last-lap');
  const first=m.race.results.find(r=>r.status==='FINISHED');await seek(offset+first.finishMs-500);await shot('winner-finish');
  for(let i=0;i<3;i++){await seek(m.raceBroadcast.highlightsStartMs-m.raceBroadcast.preshowStartMs+i*5000+500);assert.equal(await p.locator('.scene').getAttribute('data-target'),m.raceBroadcast.finisherIds[i]);await shot('finisher-'+(i+1));}
  await seek(m.raceBroadcast.officialStartMs-m.raceBroadcast.preshowStartMs+1000);await shot('classification');
  await p.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await pause();
  for(const r of m.qualifying.rounds){await seek(r.finishMs+1000);await shot('round-'+r.round+'-results');}
  await seek(m.qualifying.gridStartMs+1000);await shot('final-grid');
  await p.getByRole('button',{name:/시상식 다시보기/}).click();await pause();await seek(15000);await shot('podium');
  if(await p.locator('.watch-demo-tools').getAttribute('open')===null)await p.locator('.watch-demo-tools summary').click();
  await p.getByRole('button',{name:'특별 DSQ 레이스로 변경',exact:true}).click();await p.waitForTimeout(700);
  await p.getByRole('button',{name:/시상식 다시보기/}).click();await pause();await seek(16000);assert.ok((await p.locator('.ceremony-card').innerText()).includes('경기')||(await p.locator('.ceremony-card').innerText()).includes('!'));await shot('special-dsq');
  await p.locator('.local-race-settings summary').click();await p.getByLabel('랩 수 프리셋').selectOption('3');await p.getByLabel('본경기 프리쇼',{exact:true}).selectOption('60');
  await p.getByRole('button',{name:'새 경기 생성',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.video-meta')?.textContent.includes('3랩'),{timeout:20000});
  assert.ok((await p.locator('.race-production').innerText()).includes('60초'));await shot('new-settings-record');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal overflow');assert.deepEqual(errors,[]);assert.equal(external,0);
  report.viewports.push({label,width,height,status:'PASS',maxStep,maxYaw,fullscreenPixels:bounds,external,errors});await context.close();
 }
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
