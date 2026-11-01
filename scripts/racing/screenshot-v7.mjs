import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('out/galactic-racing-phase2-v7'),out=resolve('out/galactic-racing-v7-qa');await mkdir(out,{recursive:true});
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
  assert.equal(await p.locator('.scene').getAttribute('data-renderer'),'WebGL 2');assert.ok((await p.locator('.build-strip').innerText()).includes('0.7.0'));
  assert.ok((await p.locator('.race-production').innerText()).includes('PRESHOW'));const initial=await pose();
  for(let i=0;i<8;i++){await seek(offset*(.3+.6*(i+.5)/8));assert.equal(await p.locator('.scene').getAttribute('data-target'),m.race.grid[7-i]);assert.ok((await p.locator('.race-production').innerText()).includes('P'+(8-i)));if(i===0||i===7)await shot('intro-P'+(8-i));}
  await seek(0);await shot('preshow');await seek(offset-5000);await shot('two-column-grid');const grid=await pose();
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
  const pack=m.race.frames.find(f=>f.tick>40&&f.racers.some((r,i)=>f.racers.some((s,j)=>j>i&&r.status==='RACING'&&s.status==='RACING'&&Math.abs(r.progress-s.progress)<500)));
  assert.ok(pack);const pair=pack.racers.find((r,i)=>pack.racers.some((s,j)=>j>i&&r.status==='RACING'&&s.status==='RACING'&&Math.abs(r.progress-s.progress)<500));
  await options();await p.getByLabel('카메라 선택').selectOption(pair.id);await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await seek(offset+pack.tick*250);const packPose=await pose();const lanes=JSON.parse(await p.locator('.scene').getAttribute('data-lanes'));assert.ok(lanes.some(x=>Math.abs(x)>.5));assert.ok(lanes.every(x=>Math.abs(x)<=6.2));await shot('passing-pack');await seek(offset+pack.tick*250+5000);await seek(offset+pack.tick*250);assert.deepEqual(await pose(),packPose);
  await options();await p.getByLabel('카메라 선택').selectOption('auto');await p.getByLabel('HUD 크기',{exact:true}).selectOption('large');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(500);await shot('fullscreen-large');
  await options();await p.getByLabel('HUD 크기',{exact:true}).selectOption('medium');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await shot('fullscreen-medium');
  const fullPose=await pose();assert.ok(fullPose.fog[1]>Math.hypot(...fullPose.camera)+400,'portrait framing is not hidden by distance fog');
  const bounds=await p.locator('.scene canvas').evaluate(c=>({w:c.width,h:c.height}));assert.ok(bounds.w>=width-10);
  await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  await seek(offset+m.race.durationTicks*250-20000);await shot('last-lap');
  const first=m.race.results.find(r=>r.status==='FINISHED');await seek(offset+first.finishMs-500);await shot('winner-finish');
  const raceEnd=m.race.durationTicks*250;
  for(const dt of [0,5000,9999]){await seek(offset+raceEnd+dt);assert.equal(await p.locator('.race-production').count(),0,'ten-second coast has no forced overlay');assert.ok(Number(await p.locator('.scene').getAttribute('data-finishers'))>=3);await shot('free-coast-'+dt);}
  const coastA=await pose();await seek(offset+raceEnd+1000);const coastB=await pose();assert.notDeepEqual(coastA.cars[0].position,coastB.cars[0].position);
  for(let i=0;i<3;i++){await seek(m.raceBroadcast.highlightsStartMs-m.raceBroadcast.preshowStartMs+i*5000+500);assert.equal(await p.locator('.scene').getAttribute('data-target'),m.raceBroadcast.finisherIds[i]);assert.equal(await p.locator('.scene').getAttribute('data-camera'),['front','side','chase'][i]);await shot('finisher-'+(i+1));}
  await seek(m.raceBroadcast.officialStartMs-m.raceBroadcast.preshowStartMs+1000);await shot('classification');
  await p.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await pause();
  await seek(1000);await shot('qualifying-intro');
  const intro=await p.locator('.qualifying-intro.in-video').evaluate(el=>({panel:el.getBoundingClientRect().toJSON(),font:parseFloat(getComputedStyle(el.querySelector('h2')).fontSize)}));assert.ok(intro.font>=(width>600?40:20));
  for(const r of m.qualifying.rounds){
   await seek(r.finishMs+1000);assert.equal(await p.locator('.in-video[data-stage="result"]').count(),0);const a=await pose();assert.equal(a.cars.filter(c=>c.visible).length,8);await shot('round-'+r.round+'-free');
   await seek(r.finishMs+4000);assert.ok(await p.locator('.in-video[data-stage="result"]').isVisible());const b=await pose();assert.notDeepEqual(a.cars[0].position,b.cars[0].position);await shot('round-'+r.round+'-results');
   if(r.round===1){await p.locator('.player-screen').press('k');const motion=[];for(let i=0;i<15;i++){await p.waitForTimeout(100);motion.push(await pose());}await pause();assert.ok(motion.at(-1).ms>motion[0].ms+700);assert.notDeepEqual(motion.at(-1).cars[0].position,motion[0].cars[0].position);assert.ok(await p.locator('.in-video[data-stage="result"]').isVisible());await writeFile(out+'/'+label+'-cooldown-motion.json',JSON.stringify(motion));}
   await seek(r.resultEndMs-500);const terminal=await pose();await seek(r.startMs);await seek(r.resultEndMs-500);assert.deepEqual(await pose(),terminal);
  }
  await p.getByLabel('발표 진행',{exact:true}).selectOption('manual');await seek(m.qualifying.rounds[0].resultEndMs-800);await p.locator('.player-screen').press('k');await p.locator('.hold-controls').waitFor();assert.ok(await p.locator('.in-video[data-stage="result"]').isVisible());await shot('manual-after-cooldown');
  await p.getByRole('button',{name:'다음 라운드 시작',exact:true}).click();await p.waitForTimeout(400);assert.equal(await p.locator('.hold-controls').count(),0);await pause();assert.ok(Number(await p.locator('.player-progress').inputValue())>=m.qualifying.rounds[1].startMs);
  await seek(m.qualifying.rounds[1].resultEndMs-800);await p.locator('.player-screen').press('k');await p.locator('.hold-controls').waitFor();
  await p.evaluate(()=>{const now=Date.now;Date.now=()=>now()+300001;});await p.waitForTimeout(500);assert.equal(await p.locator('.hold-controls').count(),0);await pause();await p.getByLabel('발표 진행',{exact:true}).selectOption('auto');
  // DNF response uses actual recorded event time, and returns identically after seek.
  const dnf=m.race.events.find(e=>e.kind==='DNF');
  assert.ok(dnf,'delivered default must demonstrate DNF');
  if(dnf){await p.getByRole('button',{name:/본경기 다시보기/}).click();await pause();const row=p.locator('.tower button').filter({hasText:m.race.racers.find(r=>r.id===dnf.racerId).name});
   await seek(offset+dnf.tick*250-100);assert.ok(!(await row.getAttribute('class')).includes('retired-dnf'));
   await seek(offset+dnf.tick*250+500);assert.ok((await row.getAttribute('class')).includes('retired-dnf'));const red=await row.evaluate(el=>getComputedStyle(el).backgroundColor);if(width<600){await p.locator('.mobile-timing summary').click();await p.locator('.mobile-timing').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+label+'-dnf-red-records.png'});}await shot('dnf-red');
   await seek(offset+dnf.tick*250+2200);const grey=await row.evaluate(el=>getComputedStyle(el).backgroundColor);assert.notEqual(grey,red);await shot('dnf-grey');await seek(offset+dnf.tick*250+500);assert.equal(await row.evaluate(el=>getComputedStyle(el).backgroundColor),red);
   await p.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await pause();
  }

  await seek(m.qualifying.gridStartMs+1000);await shot('final-grid');
  await p.getByRole('button',{name:/시상식 다시보기/}).click();await pause();await seek(15000);await shot('podium');
  if(await p.locator('.watch-demo-tools').getAttribute('open')===null)await p.locator('.watch-demo-tools summary').click();
  await p.getByRole('button',{name:'특별 DSQ 레이스로 변경',exact:true}).click();await p.waitForTimeout(700);
  await p.getByRole('button',{name:/시상식 다시보기/}).click();await pause();await seek(16000);assert.ok((await p.locator('.ceremony-card').innerText()).includes('경기')||(await p.locator('.ceremony-card').innerText()).includes('!'));await shot('special-dsq');
  await p.locator('.local-race-settings summary').click();await p.getByLabel('랩 수 프리셋').selectOption('3');await p.getByLabel('본경기 프리쇼',{exact:true}).selectOption('60');
  await p.getByRole('button',{name:'새 경기 생성',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.video-meta')?.textContent.includes('3랩'),{timeout:20000});
  assert.ok((await p.locator('.race-production').innerText()).includes('60초'));await shot('new-settings-record');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal overflow');assert.deepEqual(errors,[]);assert.equal(external,0);
  report.viewports.push({label,width,height,status:'PASS',maxStep,maxYaw,intro,dnfObserved:!!dnf,fullscreenPixels:bounds,external,errors});await context.close();
 }
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
