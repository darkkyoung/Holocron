import {loadV13} from './load-v13.mjs';
import {verifyCinematic} from './qa-cinematic.mjs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {loadV10} from './load-v10.mjs';
import {loadV12} from './load-v12.mjs';
import {verifyPhantom,verifyPhantomEdges} from './qa-phantom.mjs';
import {loadV11} from './load-v11.mjs';
import {verifyGapHud,verifyGapFixtures} from './qa-gap.mjs';
const v13=process.env.RACING_QA_V13==='1';
const v12=process.env.RACING_QA_V12==='1',v11=process.env.RACING_QA_V11==='1',timing=v11||v12||v13;
let hyperSeed=v11?'11lu-31':'10rw-8';
const root=resolve(process.env.RACING_QA_ROOT??'out/galactic-racing-phase2-v10'),out=resolve(process.env.RACING_QA_OUTPUT??'out/galactic-racing-v10-qa');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep))throw Error('PATH');res.setHeader('content-type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4195,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.RACING_QA_EXECUTABLE?{executablePath:process.env.RACING_QA_EXECUTABLE}:process.env.RACING_QA_CHROME?{channel:'chrome'}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
if(v12||v13)hyperSeed=JSON.parse(await readFile(root+'/cases.json','utf8')).find(x=>x.label==='Hyper Phantom Warp').seed;
const sim=await (v13?loadV13:v12?loadV12:v11?loadV11:loadV10)(),simulate=sim[v13?'simulateMeetingV13':v12?'simulateMeetingV12':v11?'simulateMeetingV11':'simulateMeetingV10'],base=JSON.parse(await readFile(root+'/race.json','utf8')),special=JSON.parse(await readFile(root+'/special.json','utf8'));
const report={status:'RUNNING',browser:browser.version(),platform:process.platform,gpu:'SwiftShader; NOT user hardware GPU',viewports:[]};
try{
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600,recordVideo:label==='desktop'?{dir:out+'/video',size:{width,height}}:undefined});let blocked=0;const errors=[];
  await context.route('**/*',r=>{const host=new URL(r.request().url()).hostname;if(host==='127.0.0.1')return r.continue();if(host==='qa.invalid')return r.fulfill({status:404,body:'test missing image'});blocked++;return r.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  const pose=async()=>JSON.parse(await p.locator('.scene').getAttribute('data-pose'));
  // Observe actual rendered poses in the browser. Cross-process polling can
  // miss a short effect on slow Windows software-GPU runners.
  const captureMotion=async endMs=>{
   await p.evaluate(end=>{window.__racingMotion=new Promise((resolve,reject)=>{
    const host=document.querySelector('.scene'),samples=[];let previous=-1;
    const observer=new MutationObserver(()=>{const value=JSON.parse(host.dataset.pose);if(value.ms===previous)return;previous=value.ms;samples.push({...value,target:host.dataset.target,phase:host.dataset.cinematic||host.dataset.phantom||host.dataset.wormhole||''});if(value.ms>=end){clearTimeout(timer);observer.disconnect();resolve(samples);}});
    const timer=setTimeout(()=>{observer.disconnect();reject(Error('Motion did not reach effect end; samples='+samples.length));},30000);
    observer.observe(host,{attributes:true,attributeFilter:['data-pose']});
   });},endMs);
   await p.locator('.player-screen').press('k');return p.evaluate(()=>window.__racingMotion);
  };
  const pause=async()=>{if(await p.getByRole('button',{name:'일시정지',exact:true}).count())await p.locator('.player-screen').press('k');};
  const seek=async ms=>{await p.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},ms);await p.waitForTimeout(300);};
  const shot=async name=>{await p.locator('.player-screen').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+label+'-'+name+'.png'});};
  const choose=async name=>{await p.getByRole('button',{name:new RegExp(name+' 다시보기')}).click();await pause();};
  await p.goto('http://127.0.0.1:4195/?motion=1',{waitUntil:'networkidle'});await p.locator('.scene canvas').waitFor();await p.waitForTimeout(500);
  assert.ok((await p.locator('.build-strip').innerText()).includes(v13?'0.13.0':v12?'0.12.0':v11?'0.11.0':'0.10.0'));assert.equal(await p.locator('.scene').getAttribute('data-renderer'),'WebGL 2');
  const offset=base.raceStartMs-base.raceBroadcast.preshowStartMs;
  const gapChecks=[];if(timing)gapChecks.push({seed:base.race.seed,checks:await verifyGapHud({p,meeting:base,sim,seek,shot,label:'base',width})});
  await seek(offset-4000);await shot('countdown-grid');assert.equal(await p.locator('.start-lights .lit').count(),2);
  await seek(offset+10000);await p.locator('.player-screen').press('k');await p.waitForTimeout(400);await seek(offset+15000);const moving=await pose();await p.waitForTimeout(500);assert.ok((await pose()).ms>moving.ms);await pause();
  await seek(offset+17000);const still=await pose();await p.waitForTimeout(500);assert.equal((await pose()).ms,still.ms);
  for(let n=1;n<=8;n++){await p.locator('.player-screen').press(String(n));await p.waitForFunction(id=>document.querySelector('.scene')?.getAttribute('data-target')===id,base.race.racers[n-1].id);assert.equal(await p.locator('.scene').getAttribute('data-target'),base.race.racers[n-1].id);}await p.locator('.player-screen').press('/');assert.equal(await p.getByRole('button',{name:'자동 중계',exact:true}).getAttribute('aria-pressed'),'true');
  const a=base.ultimates[0],idx=base.race.racers.findIndex(r=>r.id===a.id);await seek(offset+a.startTick*250-500);await p.locator('.player-screen').press('/');
  const motion=await captureMotion(base.raceStartMs+a.endTick*250+250);await pause();await writeFile(out+'/'+label+'-gold-motion.json',JSON.stringify(motion));assert.ok(motion.some(x=>x.ultimateEffects[idx]));assert.ok(motion.at(-1).ms>motion[0].ms+2000);assert.notDeepEqual(motion[0].cars[idx].position,motion.at(-1).cars[idx].position);const activeGold=motion.filter(x=>x.ms>=base.raceStartMs+a.startTick*250&&x.ms<base.raceStartMs+a.endTick*250);assert.ok(activeGold.length>10);assert.ok(activeGold.every(x=>x.target===a.id));assert.ok(motion.at(-1).ms>=base.raceStartMs+a.endTick*250);await seek(offset+a.startTick*250+1500);await shot('gold-ultimate');
  await seek(offset+a.startTick*250+1500);const fixed=await pose();await seek(offset+1000);await seek(offset+a.startTick*250+1500);assert.deepEqual(await pose(),fixed,'seek reproduces ultimate and camera');await writeFile(out+'/'+label+'-gold-motion.json',JSON.stringify(motion));
  // Native modal, distinct from track button; playback continues, ESC restores focus.
  await seek(offset+20000);await p.locator('.player-screen').press('k');if(width<600)await p.locator('.mobile-timing summary').click();await p.locator(width<600?'.mobile-rows .profile-info':'.tower .profile-info').first().click();await p.locator('dialog[open]').waitFor();const profileBefore=await pose();await p.waitForTimeout(900);assert.ok((await pose()).ms>profileBefore.ms+400);assert.ok((await p.locator('dialog').innerText()).includes('정보 준비 중'));await shot('profile-open');await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);await pause();
  await p.locator('.profile-admin summary').click();await p.getByLabel('프로필 이름',{exact:true}).fill('로컬 QA 레이서');await p.getByLabel('프로필 설명',{exact:true}).fill('<script>window.__unsafe=1</script>');await p.getByLabel('프로필 이미지 URL',{exact:true}).fill('javascript:alert(1)');await p.getByRole('button',{name:'프로필 저장',exact:true}).click();assert.ok((await p.locator('.profile-admin [role=alert]').innerText()).includes('HTTPS'));
  await p.getByLabel('프로필 이미지 URL',{exact:true}).fill('https://qa.invalid/missing.png');await p.getByRole('button',{name:'프로필 저장',exact:true}).click();assert.ok((await p.locator('.profile-admin [role=status]').innerText()).includes('저장'));assert.equal(await p.evaluate(()=>window.__unsafe),undefined);
  await p.reload({waitUntil:'networkidle'});await p.locator('.scene canvas').waitFor();await pause();if(width<600)await p.locator('.mobile-timing summary').click();await p.getByRole('button',{name:'로컬 QA 레이서 선수 정보',exact:true}).click();assert.ok((await p.locator('dialog').innerText()).includes('<script>window.__unsafe=1</script>'));await p.locator('dialog .placeholder').waitFor();await p.keyboard.press('Escape');
  await p.locator('.profile-admin summary').click();const downloadEvent=p.waitForEvent('download');await p.getByRole('button',{name:'JSON 내보내기',exact:true}).click();const download=await downloadEvent;await download.saveAs(out+'/'+label+'-local-profile-test.json');
  await p.getByLabel('프로필 JSON 가져오기').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('[{}]')});await p.locator('.profile-admin [role=alert]').waitFor({state:'visible'});await p.getByLabel('프로필 JSON 가져오기').setInputFiles({name:'reset.json',mimeType:'application/json',buffer:Buffer.from('[]')});await p.waitForFunction(()=>document.querySelector('.profile-admin [role=status]')?.textContent.includes('가져왔'));
  await choose('퀄리파잉');for(const round of base.qualifying.rounds){await seek(round.finishMs+4000);assert.equal(await p.locator('.scene').getAttribute('data-camera'),'wide');assert.equal(await p.locator('.qualifying-result th').filter({hasText:/^BEST$/}).count(),0);const best=await p.locator('.qualifying-result table:visible .best-lap').count();const expectedBest=base.race.racers.reduce((n,r)=>{const runs=base.qualifying.runs.filter(x=>x.id===r.id&&x.finishMs<=round.finishMs+4000&&x.valid),fastest=Math.min(...runs.map(x=>x.lapMs));return n+runs.filter(x=>x.lapMs===fastest).length;},0);assert.equal(best,expectedBest);assert.equal(await p.locator('.qualifying-result table:visible .best-lap').first().evaluate(el=>getComputedStyle(el).color),'rgb(255, 224, 82)');const cells=await p.locator('.qualifying-result table:visible tbody tr').first().locator('td').allTextContents();assert.equal(cells.length,4);if(round.round<3)assert.equal(cells.at(-1),'—');await shot('round-'+round.round+'-results');}
  await choose('본경기');await seek(offset+70000);await shot('race');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  {
   await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(400);await shot('fullscreen-medium');await p.getByRole('button',{name:'시청 설정',exact:true}).click();await p.getByLabel('HUD 크기',{exact:true}).selectOption('large');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await shot('fullscreen-large');if(timing){assert.equal(await p.locator('.tower').isVisible(),true);assert.ok((await p.locator('.tower').innerText()).includes('GAP'));const box=await p.locator('.tower').boundingBox(),map=await p.locator('.track-minimap').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y+box.height<=map.y,'fullscreen GAP and minimap do not overlap');}await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  }
  await choose('시상식');const podiumMotion=[];
  for(const [ms,title] of [[0,'wide'],[5000,'third'],[10000,'second'],[15000,'winner-entry'],[21000,'winner-close'],[26000,'celebration'],[32000,'official']]){await seek(ms);await shot('podium-'+title);podiumMotion.push(JSON.parse(await p.locator('.scene').getAttribute('data-podium')));}
  assert.deepEqual(podiumMotion.slice(1,4).map(x=>x.visible.length),[1,2,3]);await seek(15000);await p.locator('.player-screen').press('k');const before=await p.locator('.scene').getAttribute('data-podium');await p.waitForTimeout(1500);await pause();assert.notEqual(await p.locator('.scene').getAttribute('data-podium'),before);await writeFile(out+'/'+label+'-podium-motion.json',JSON.stringify(podiumMotion));
  // Exercise actual end callbacks, not just independent playlist selection.
  await p.getByLabel('전체 연속 재생',{exact:true}).check();await choose('퀄리파잉');await seek(base.raceBroadcast.preshowStartMs-750);await p.locator('.player-screen').press('k');
  await p.waitForFunction(()=>document.querySelector('.playlist-entry[aria-current=true]')?.textContent.includes('본경기 다시보기'));await pause();
  await seek(base.ceremonyStartMs-base.raceBroadcast.preshowStartMs-750);await p.locator('.player-screen').press('k');
  await p.waitForFunction(()=>document.querySelector('.playlist-entry[aria-current=true]')?.textContent.includes('시상식 다시보기'));await pause();
  await seek(base.durationMs-base.ceremonyStartMs-750);await p.locator('.player-screen').press('k');await p.waitForFunction(()=>Number(document.querySelector('.player-progress')?.value)===Number(document.querySelector('.player-progress')?.max)&&!!document.querySelector('.player-controls button[aria-label="재생"]'));
  await p.getByLabel('전체 연속 재생',{exact:true}).uncheck();
  await p.locator('.watch-demo-tools summary').click();await p.getByRole('button',{name:'특별 DSQ 레이스로 변경',exact:true}).click();await p.waitForTimeout(900);if(timing){await choose('본경기');gapChecks.push({seed:special.race.seed,checks:await verifyGapHud({p,meeting:special,sim,seek,shot,label:'special',width})});}await choose('시상식');
  await seek(29750);assert.ok(!(await p.locator('.ceremony-card').innerText()).includes(special.specialDsq.reason));
  for(const [ms,title] of [[31000,'alert'],[35000,'evidence'],[41000,'verdict'],[49000,'third'],[59000,'winner'],[75000,'final']]){await seek(ms);await shot('dsq-'+title);const value=JSON.parse(await p.locator('.scene').getAttribute('data-podium'));if(ms>=40000)assert.ok(!value.visible.some(x=>x.id===special.specialDsq.id));}
  await p.locator('.local-race-settings summary').click();await p.getByRole('button',{name:(v12||v13?'Hyper Phantom Warp':'Hyper Wormhole')+' · '+hyperSeed,exact:true}).click();await p.waitForFunction(seed=>document.querySelector('.player-screen')?.getAttribute('data-seed')===seed,hyperSeed);await p.waitForTimeout(300);
  const hyper=simulate(hyperSeed),h=hyper.ultimates.find(a=>a.type==='hyper'),w=hyper.wormholes[0];
  await p.locator('.player-screen').press('/');await seek(120000+h.startTick*250-250);
  if(timing){gapChecks.push({seed:hyper.race.seed,checks:await verifyGapHud({p,meeting:hyper,sim,seek,shot,label:'hyper',width})});await seek(120000+h.startTick*250-250);}
  let phantomReport=null,phantomEdges=[];
  if(v13){phantomReport=await verifyCinematic({p,meeting:hyper,sim,simulate,cases:JSON.parse(await readFile(root+'/cases.json','utf8')),seek,pause,shot,captureMotion,pose,out,label,width});}else if(v12){phantomReport=await verifyPhantom({p,meeting:hyper,seek,pause,shot,captureMotion,pose,out,label,width});if(width===1440)phantomEdges=await verifyPhantomEdges({p,simulate,cases:JSON.parse(await readFile(root+'/cases.json','utf8')),seek,pause,shot,pose,captureMotion,out,label});}else{
  const hyperMotion=await captureMotion(hyper.raceStartMs+h.endTick*250+250);await pause();await writeFile(out+'/'+label+'-hyper-motion.json',JSON.stringify(hyperMotion));
  const activeMotion=hyperMotion.filter(p=>p.ms>=hyper.raceStartMs+h.startTick*250&&p.ms<hyper.raceStartMs+h.endTick*250);assert.ok(activeMotion.length>=15);assert.ok(activeMotion.every(p=>p.target===h.id));assert.ok(activeMotion.some(p=>p.phase==='exit'));assert.ok(activeMotion.some(p=>p.phase==='afterburn'));
  for(const [tick,title] of [[h.startTick+.5,'entry'],[w.jumpTick-1,'transit'],[w.jumpTick+.5,'exit'],[w.afterburnStartTick+3,'afterburn']]){await seek(120000+tick*250);assert.equal(await p.locator('.scene').getAttribute('data-target'),h.id);await shot('hyper-'+title);const fixed=await pose();const subject=fixed.cars[hyper.race.racers.findIndex(r=>r.id===h.id)];assert.equal(subject.visible,title!=='transit');if(title==='entry'||title==='exit'){assert.ok(Math.abs(subject.screen[0])<.9&&Math.abs(subject.screen[1])<.9&&subject.screen[2]<1,'actual wormhole subject stays in the camera frustum');if(width<600){const banner=await p.locator('.ultimate-banner:visible').boundingBox(),canvas=await p.locator('.scene canvas').boundingBox();assert.ok(banner.y>=canvas.y+canvas.height,'mobile caption is outside the racing picture');}}await seek(120000+1000);await seek(120000+tick*250);assert.deepEqual(await pose(),fixed);}
  await seek(120000+(w.jumpTick+.5)*250);await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(400);await shot('hyper-fullscreen-large');assert.equal(await p.locator('.ultimate-banner:visible').count(),1);
  const fullscreenMotion=await captureMotion(hyper.raceStartMs+w.afterburnStartTick*250+250);await pause();await writeFile(out+'/'+label+'-hyper-fullscreen-motion.json',JSON.stringify(fullscreenMotion));
  const exitFrames=fullscreenMotion.filter(x=>x.phase==='exit');assert.ok(exitFrames.length>0);for(const frame of exitFrames){const subject=frame.cars[hyper.race.racers.findIndex(r=>r.id===h.id)];assert.equal(frame.target,h.id);assert.ok(subject.visible&&Math.abs(subject.screen[0])<.8&&Math.abs(subject.screen[1])<.8,'emerging racer remains framed in fullscreen, including portrait');}
  await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  await seek(120000+(w.afterburnStartTick+1)*250);await p.locator('.player-screen').press('1');await p.waitForFunction(()=>document.querySelector('.scene')?.dataset.target==='r1');assert.equal(await p.locator('.scene').getAttribute('data-target'),'r1');await p.locator('.player-screen').press('/');await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,h.id);
  await writeFile(out+'/'+label+'-hyper-motion.json',JSON.stringify(hyperMotion));
  }
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>sessionStorage.clear());await p.reload({waitUntil:'networkidle'});await p.locator('.scene canvas').waitFor();await pause();await seek(offset+a.startTick*250+500);await p.locator('.player-screen').press(String(idx+1));assert.equal((await pose()).reducedMotion,true);assert.ok((await pose()).ultimateEffects[idx]);await shot('reduced-motion-ultimate');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);assert.equal(blocked,0);if(timing)gapChecks.push({fixture:await verifyGapFixtures({p,base,sim,seek,shot,width})});report.viewports.push({label,width,height,status:phantomReport?.rates?.some(r=>r.status==='PARTIAL')||phantomReport?.fullscreenMotion?.missing?.length?'PARTIAL':'PASS',externalRequests:blocked,profileStorage:true,continuousTransitions:true,fullscreen:true,reducedMotion:true,ultimateMotionSamples:motion.length,...(v12||v13?{phantom:phantomReport,phantomEdges}:{}),gapChecks,podiumStages:podiumMotion.map(x=>x.stage)});await context.close();
 }
 report.status=report.viewports.some(v=>v.status==='PARTIAL')?'PARTIAL':'PASS';
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await sim.dispose();await browser.close();await new Promise(r=>server.close(r));}
