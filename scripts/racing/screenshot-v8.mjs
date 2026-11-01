import {loadV8} from './load-v8.mjs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.env.RACING_QA_ROOT??'out/galactic-racing-phase2-v8'),out=resolve(process.env.RACING_QA_OUTPUT??'out/galactic-racing-v8-qa');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep))throw Error('PATH');res.setHeader('content-type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4194,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.RACING_QA_EXECUTABLE?{executablePath:process.env.RACING_QA_EXECUTABLE}:process.env.RACING_QA_CHROME?{channel:'chrome'}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const m=JSON.parse(await readFile(root+'/race.json','utf8')),offset=m.raceStartMs-m.raceBroadcast.preshowStartMs;
const sim=await loadV8(),edited=sim.forBroadcast(m);
const report={browser:browser.version(),environment:process.platform+' '+(process.env.RACING_QA_CHROME?'Google Chrome':'Chromium')+' / SwiftShader; NOT user hardware GPU',viewports:[]};
try{
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600,recordVideo:label==='desktop'&&!process.env.RACING_QA_CHROME?{dir:out+'/video',size:{width:1440,height:900}}:undefined});let external=0;const errors=[];
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():(external++,r.abort()));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  const seek=async ms=>{await p.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},ms);await p.waitForTimeout(250);};
  const shot=async name=>{await p.locator('.player-screen').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+label+'-'+name+'.png'});};
  const options=async()=>{await p.locator('.player-screen').hover();if(!await p.getByLabel('카메라 선택').isVisible())await p.getByRole('button',{name:'시청 설정',exact:true}).click();};
  const pause=async()=>{if(await p.getByRole('button',{name:'일시정지',exact:true}).isVisible())await p.locator('.player-screen').press('k');};
  const pose=async()=>JSON.parse(await p.locator('.scene').getAttribute('data-pose'));
  await p.goto('http://127.0.0.1:4194/?motion=1',{waitUntil:'networkidle'});await p.locator('.scene canvas').waitFor();await p.waitForTimeout(300);
  assert.equal(await p.locator('.scene').getAttribute('data-renderer'),'WebGL 2');assert.ok((await p.locator('.build-strip').innerText()).includes('0.8.0'));
  assert.ok((await p.locator('.race-production').innerText()).includes('PRESHOW'));const initial=await pose();
  for(let i=0;i<8;i++){await seek(offset*(.3+.6*(i+.5)/8));assert.equal(await p.locator('.scene').getAttribute('data-target'),m.race.grid[7-i]);assert.ok((await p.locator('.race-production').innerText()).includes('P'+(8-i)));if(i===0||i===7)await shot('intro-P'+(8-i));}
  await seek(0);await shot('preshow');await seek(offset-5000);await shot('two-column-grid');const grid=await pose();
  for(let i=0;i<8;i++){assert.deepEqual(grid.cars[i].position,initial.cars[i].position,'no movement before gun');const c=grid.cars[i];assert.ok(c.visible&&Math.abs(c.screen[0])<.85&&Math.abs(c.screen[1])<.82,'all eight grid cars inside viewport');}
  await seek(offset-2500);assert.ok((await p.locator('.race-production').innerText()).includes('START LIGHTS'));await shot('countdown');const overlay=await p.locator('.race-production.countdown').boundingBox(),canvasBox=await p.locator('.scene canvas').boundingBox(),countdownPose=await pose();const pole=countdownPose.cars[m.race.racers.findIndex(r=>r.id===m.race.grid[0])];const px=canvasBox.x+(pole.screen[0]+1)*canvasBox.width/2,py=canvasBox.y+(1-pole.screen[1])*canvasBox.height/2;assert.ok(px<overlay.x||px>overlay.x+overlay.width||py<overlay.y||py>overlay.y+overlay.height,'countdown panel must not cover pole car');
  // Real pointer clicks/drags plus keyboard seek retain play/pause, rate and camera.
  await options();await p.getByLabel('재생 속도',{exact:true}).selectOption('2');await p.getByLabel('카메라 선택').selectOption('r1');await p.getByLabel('추적 카메라 각도').selectOption('front');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  const ux=[];
  for(const active of [false,true]){
   await pause();await seek(offset+15000);if(active)await p.locator('.player-screen').press('k');
   const range=p.locator('.player-progress');await p.locator('.player-screen').hover();const box=await range.boundingBox();
   if(width<600)await range.tap({position:{x:box.width*.4,y:box.height/2}});else await range.click({position:{x:box.width*.4,y:box.height/2}});await p.waitForTimeout(250);
   assert.equal(await p.getByRole('button',{name:'일시정지',exact:true}).count(),active?1:0);
   const click=await pose();await p.waitForTimeout(350);const later=await pose();assert.equal(later.ms>click.ms+100,active);
   await p.mouse.move(box.x+box.width*.4,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width*.55,box.y+box.height/2,{steps:6});await p.mouse.up();
   await p.waitForTimeout(200);assert.equal(await p.getByRole('button',{name:'일시정지',exact:true}).count(),active?1:0);
   for(const key of ['ArrowRight','ArrowLeft','j','l']){await p.locator('.player-screen').press(key);await p.waitForTimeout(80);assert.equal(await p.getByRole('button',{name:'일시정지',exact:true}).count(),active?1:0);}
   ux.push({playing:active,clickMs:click.ms,laterMs:later.ms});await shot('seek-'+(active?'playing':'paused'));await pause();
  }
  await options();assert.equal(await p.getByLabel('재생 속도',{exact:true}).inputValue(),'2');assert.equal(await p.getByLabel('카메라 선택').inputValue(),'r1');assert.equal(await p.getByLabel('추적 카메라 각도').inputValue(),'front');await p.getByLabel('재생 속도',{exact:true}).selectOption('1');await p.getByLabel('카메라 선택').selectOption('auto');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  const countdown=[];
  for(let i=0;i<5;i++){await seek(offset-5000+i*1000);const sample=await pose();assert.equal(await p.locator('.start-lights .lit').count(),i+1);assert.deepEqual(sample.cars.map(c=>c.position),initial.cars.map(c=>c.position));countdown.push(sample);await shot('lights-'+(5-i));}
  assert.equal(new Set(countdown.map(v=>JSON.stringify(v.camera))).size,5,'five distinct countdown shots');
  await seek(offset);assert.equal(await p.locator('.start-lights').count(),0);
  await writeFile(out+'/'+label+'-seek-countdown.json',JSON.stringify({ux,countdown}));
  await seek(offset);await p.locator('.player-screen').press('k');await p.waitForTimeout(1500);await pause();const started=await pose();assert.ok(started.ms>m.raceStartMs);assert.notDeepEqual(started.cars[0].position,grid.cars[0].position);assert.ok((await p.locator('.race-timer time').innerText()).startsWith('00:0'),'race clock starts at gun, not preshow');await shot('start-10-laps');
  assert.ok((await p.locator('.lap-hud').innerText()).includes('/ 10'));assert.equal(await p.locator('.track-minimap svg circle').count(),9);
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
  let maxStep=0,maxYaw=0,maxCameraAngle=0;for(let i=1;i<motion.length;i++){
   const a=motion[i-1],b=motion[i],dt=(b.ms-a.ms)/1000;if(dt<=0)continue;
   const dot=Math.abs(a.quaternion.reduce((v,q,j)=>v+q*b.quaternion[j],0));maxCameraAngle=Math.max(maxCameraAngle,2*Math.acos(Math.min(1,dot)));
   const x=a.cars[0],y=b.cars[0];maxStep=Math.max(maxStep,Math.hypot(...x.position.map((v,j)=>v-y.position[j]))/dt);
   maxYaw=Math.max(maxYaw,Math.abs(Math.atan2(Math.sin(y.yaw-x.yaw),Math.cos(y.yaw-x.yaw))));
  }
  assert.ok(motion.at(-1).ms>motion[0].ms+3000);assert.ok(maxStep<100,'continuous render position');assert.ok(maxYaw<1.3,'no corner orientation flip');assert.ok(maxCameraAngle<1.3,'no camera orientation flip while tracking');
  await writeFile(out+'/'+label+'-corner-motion.json',JSON.stringify({maxRenderUnitsPerSecond:maxStep,maxYawRadians:maxYaw,maxCameraAngle,motion},null,2));
  const branch=m.shortcutPassages.find(x=>x.success&&x.mergeMs);
  await options();await p.getByLabel('카메라 선택').selectOption(branch.id);await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  for(const [name,ms] of [['shortcut-entry',branch.entryMs],['shortcut-mid',(branch.entryMs+branch.mergeMs)/2],['shortcut-merge',branch.mergeMs]]){await seek(offset+ms);await shot(name);}
  const pack=m.race.frames.find(f=>f.tick>40&&f.racers.some((r,i)=>f.racers.some((s,j)=>j>i&&r.status==='RACING'&&s.status==='RACING'&&Math.abs(r.progress-s.progress)<500)));
  assert.ok(pack);const pair=pack.racers.find((r,i)=>pack.racers.some((s,j)=>j>i&&r.status==='RACING'&&s.status==='RACING'&&Math.abs(r.progress-s.progress)<500));
  await options();await p.getByLabel('카메라 선택').selectOption(pair.id);await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await seek(offset+pack.tick*250);const packPose=await pose();const lanes=JSON.parse(await p.locator('.scene').getAttribute('data-lanes'));assert.ok(lanes.some(x=>Math.abs(x)>.5));assert.ok(lanes.every(x=>Math.abs(x)<=6.2));await shot('passing-pack');await seek(offset+pack.tick*250+5000);await seek(offset+pack.tick*250);assert.deepEqual(await pose(),packPose);
  // Trackside fixed position, rotating lens and exact seek restoration.
  const tv=edited.cameras.find((c,i)=>c.shot==='trackside'&&c.atMs>10000&&c.stationId!=='finish'&&(edited.cameras[i+1]?.atMs??0)-c.atMs>=4000);assert.ok(tv);
  await options();await p.getByLabel('카메라 선택').selectOption('auto');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await seek(offset+tv.atMs+500);const fixed=await pose();assert.equal(await p.locator('.scene').getAttribute('data-camera'),'trackside');await shot('tv-trackside');
  await p.locator('.player-screen').press('k');const tvMotion=[];for(let i=0;i<20;i++){await p.waitForTimeout(100);tvMotion.push(await pose());}await pause();
  assert.ok(tvMotion.at(-1).ms>tvMotion[0].ms+1000);for(const v of tvMotion)assert.deepEqual(v.camera,fixed.camera,'fixed lens must not ride along the car');assert.notDeepEqual(tvMotion[0].quaternion,tvMotion.at(-1).quaternion);
  await seek(offset+tv.atMs+500);assert.deepEqual(await pose(),fixed);await writeFile(out+'/'+label+'-tv-motion.json',JSON.stringify(tvMotion));
  for(const station of ['straight','turn1','entry','merge']){const cue=edited.cameras.find(c=>c.shot==='trackside'&&c.stationId===station);if(cue){await seek(offset+cue.atMs+250);await shot('tv-'+station);}}
  await seek(offset+tv.atMs+500);
  const autoId=await p.locator('.scene').getAttribute('data-target');assert.equal(await p.locator('.track-minimap svg circle[stroke="#fff"]').count(),1);
  const rank=m.race.frames[Math.floor((tv.atMs+500)/250)].racers.slice().sort((a,b)=>a.rank-b.rank).map(r=>r.id);
  await p.locator('.player-screen').press('.');await p.waitForTimeout(200);assert.equal(await p.locator('.scene').getAttribute('data-target'),rank[(rank.indexOf(autoId)+1)%8]);
  await p.getByRole('button',{name:'이전 선수',exact:true}).click();await p.waitForTimeout(200);assert.equal(await p.locator('.scene').getAttribute('data-target'),autoId);
  await options();await p.getByLabel('추적 카메라 각도').selectOption('trackside');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await shot('manual-tv');
  await p.getByRole('button',{name:'자동 중계',exact:true}).click();await p.waitForTimeout(150);assert.equal(await p.getByRole('button',{name:'자동 중계',exact:true}).getAttribute('aria-pressed'),'true');
  await options();await p.getByLabel('카메라 선택').selectOption('auto');await p.getByLabel('HUD 크기',{exact:true}).selectOption('large');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(500);await shot('fullscreen-large');
  const fullReturn=Number(await p.locator('.player-progress').inputValue());await seek(offset-3000);await shot('fullscreen-lights');
  const lightBox=await p.locator('.start-lights').boundingBox();
  for(const sel of ['.race-timer','.lap-hud','.tower'])if(await p.locator(sel).isVisible()){
   const other=await p.locator(sel).boundingBox();assert.ok(lightBox.x+lightBox.width<=other.x||other.x+other.width<=lightBox.x||lightBox.y+lightBox.height<=other.y||other.y+other.height<=lightBox.y,'start lights must clear '+sel);
  }
  await seek(fullReturn);
  await options();await p.getByLabel('HUD 크기',{exact:true}).selectOption('medium');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await shot('fullscreen-medium');
  const fullPose=await pose();assert.ok(fullPose.fog[1]>Math.hypot(...fullPose.camera)+400,'portrait framing is not hidden by distance fog');
  const bounds=await p.locator('.scene canvas').evaluate(c=>({w:c.width,h:c.height}));assert.ok(bounds.w>=width-10);
  await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  await seek(offset+m.race.durationTicks*250-20000);await shot('last-lap');
  const first=m.race.results.find(r=>r.status==='FINISHED');
  const firstRow=p.locator('.tower button').filter({hasText:m.race.racers.find(r=>r.id===first.id).name});
  await seek(offset+Math.floor(first.finishMs/250)*250-250);assert.equal(await firstRow.getByLabel('공식 완주',{exact:true}).count(),0);
  await seek(offset+Math.ceil(first.finishMs/250)*250);assert.equal(await firstRow.getByLabel('공식 완주',{exact:true}).count(),1);await shot('checkered-finish');if(width<600){await p.locator('.mobile-timing summary').click();await p.locator('.mobile-timing').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+label+'-checkered-records.png'});await p.locator('.mobile-timing summary').click();}
await seek(offset+first.finishMs-500);await shot('winner-finish');
  const raceEnd=m.race.durationTicks*250;
  for(const dt of [0,5000,9750]){await seek(offset+raceEnd+dt);assert.equal(await p.locator('.race-production').count(),0,'ten-second coast has no forced overlay');assert.ok(Number(await p.locator('.scene').getAttribute('data-finishers'))>=3);await shot('free-coast-'+dt);}
  await seek(offset+raceEnd+1000);await p.locator('.player-screen').press('k');const finishMotion=[];for(let i=0;i<15;i++){await p.waitForTimeout(100);finishMotion.push(await pose());assert.equal(await p.locator('.race-production').count(),0);}await pause();assert.ok(finishMotion.at(-1).ms>finishMotion[0].ms+700);assert.notDeepEqual(finishMotion[0].cars,finishMotion.at(-1).cars);await writeFile(out+'/'+label+'-finish-coast-motion.json',JSON.stringify(finishMotion));
  const coastA=await pose();await seek(offset+raceEnd+1000);const coastB=await pose();assert.notDeepEqual(coastA.cars[0].position,coastB.cars[0].position);
  for(let i=0;i<3;i++){await seek(m.raceBroadcast.highlightsStartMs-m.raceBroadcast.preshowStartMs+i*5000+500);assert.equal(await p.locator('.scene').getAttribute('data-target'),m.raceBroadcast.finisherIds[i]);assert.equal(await p.locator('.scene').getAttribute('data-camera'),['front','front','chase'][i]);await shot('finisher-'+(i+1));}
  await seek(m.raceBroadcast.officialStartMs-m.raceBroadcast.preshowStartMs+1000);await shot('classification');
  await p.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await pause();
  await seek(1000);await shot('qualifying-intro');
  const intro=await p.locator('.qualifying-intro.in-video').evaluate(el=>({panel:el.getBoundingClientRect().toJSON(),clipped:el.scrollHeight>el.clientHeight+1,font:parseFloat(getComputedStyle(el.querySelector('h2')).fontSize)}));assert.ok(intro.font>=(width>600?40:20));assert.equal(intro.clipped,false,'intro text must be readable without clipped overflow');
  for(const r of m.qualifying.rounds){
   await seek(r.finishMs+1000);assert.equal(await p.locator('.in-video[data-stage="result"]').count(),0);const a=await pose();assert.equal(a.cars.filter(c=>c.visible).length,8);await shot('round-'+r.round+'-free');
   await seek(r.finishMs+4000);assert.ok(await p.locator('.in-video[data-stage="result"]').isVisible());const b=await pose();assert.notDeepEqual(a.cars[0].position,b.cars[0].position);await shot('round-'+r.round+'-results');
   if(r.round===1){await p.locator('.player-screen').press('k');const motion=[];for(let i=0;i<15;i++){await p.waitForTimeout(100);motion.push(await pose());}await pause();assert.ok(motion.at(-1).ms>motion[0].ms+700);assert.notDeepEqual(motion.at(-1).cars[0].position,motion[0].cars[0].position);assert.ok(await p.locator('.in-video[data-stage="result"]').isVisible());await writeFile(out+'/'+label+'-cooldown-motion.json',JSON.stringify(motion));}
   await seek(r.resultEndMs-500);const terminal=await pose();await seek(r.startMs);await seek(r.resultEndMs-500);assert.deepEqual(await pose(),terminal);
  }
  await seek(m.qualifying.rounds[0].resultEndMs-800);await p.locator('.player-screen').press('k');await p.waitForTimeout(1300);await pause();assert.ok((await p.locator('.qualifying-chip').innerText()).includes('ROUND 2'));assert.equal(await p.locator('.in-video[data-stage="result"]').count(),0);
  await p.getByLabel('발표 진행',{exact:true}).selectOption('manual');await seek(m.qualifying.rounds[0].resultEndMs-800);await p.locator('.player-screen').press('k');await p.locator('.hold-controls').waitFor();assert.ok(await p.locator('.in-video[data-stage="result"]').isVisible());await shot('manual-after-cooldown');const held=await pose();await seek(m.qualifying.rounds[2].startMs);assert.deepEqual(await pose(),held,'scrub cannot release manual gate');
  await p.getByRole('button',{name:'다음 라운드 시작',exact:true}).click();await p.waitForTimeout(400);assert.equal(await p.locator('.hold-controls').count(),0);await pause();assert.ok(Number(await p.locator('.player-progress').inputValue())>=m.qualifying.rounds[1].startMs);
  await seek(m.qualifying.rounds[1].resultEndMs-800);await p.locator('.player-screen').press('k');await p.locator('.hold-controls').waitFor();
  await p.evaluate(()=>{const now=Date.now;Date.now=()=>now()+300001;});await p.waitForTimeout(500);assert.equal(await p.locator('.hold-controls').count(),0);await pause();await p.getByLabel('발표 진행',{exact:true}).selectOption('auto');
  // DNF response uses actual recorded event time, and returns identically after seek.
  const dnf=m.race.events.find(e=>e.kind==='DNF');
  assert.ok(dnf,'delivered default must demonstrate DNF');
  if(dnf){await p.getByRole('button',{name:/본경기 다시보기/}).click();await pause();const row=p.locator('.tower button').filter({hasText:m.race.racers.find(r=>r.id===dnf.racerId).name});
   await seek(offset+dnf.tick*250-250);assert.ok(!(await row.getAttribute('class')).includes('retired-dnf'));
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
  report.viewports.push({label,width,height,gpu:await p.locator('.scene').getAttribute('data-gpu'),status:'PASS',maxStep,maxYaw,maxCameraAngle,intro,dnfObserved:!!dnf,fullscreenPixels:bounds,external,errors});await context.close();
 }
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await sim.dispose();await browser.close();await new Promise(r=>server.close(r));}
