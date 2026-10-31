// Isolated Chromium QA of locally built v0.4, including tab switch, keyboard,
 // 3 manually selectable views, HUD presets, minimap and post-finish scene.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join,normalize} from 'node:path';

const root=resolve('out/galactic-racing-phase1-v4');
const shotDir=resolve('out/galactic-racing-v4-qa');
await mkdir(shotDir,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1:4192');
  const relative=normalize(u.pathname==='/'?'/index.html':u.pathname).replace(/^[/\\]+/,'');
  const full=resolve(root,relative);
  if(!full.startsWith(root+'/')){res.writeHead(403);return res.end();}
  res.writeHead(200,{'content-type':mime[extname(full)]??'application/octet-stream','cache-control':'no-store'});
  res.end(await readFile(full));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(4192,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try {
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4192/',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:/갤럭틱 레이싱/}).first().waitFor();
  assert.match(await page.locator('.lap-hud strong').innerText(),/^[1-3] \/ 3$/);
  assert.equal(await page.locator('.track-minimap svg circle').count(),8,'8 map positions');
  const dimensions=await page.evaluate(()=>({
   innerWidth,scrollWidth:document.documentElement.scrollWidth,
   aspect:document.querySelector('.broadcast').getBoundingClientRect().width/
    document.querySelector('.broadcast').getBoundingClientRect().height,
   renderer:document.querySelector('.scene')?.dataset.renderer,
  }));
  assert.ok(dimensions.scrollWidth<=dimensions.innerWidth+2,'no horizontal overflow');
  assert.ok(Math.abs(dimensions.aspect-16/9)<.12,'video is 16:9');
  const video=page.locator('.broadcast');
  // Click-to-toggle: the empty central part of video, not a control overlay.
  await video.click({position:{x:width<500?width*.6:width*.68,y:55}});
  const afterClick=await page.locator('.transport-row .play').innerText();
  assert.ok(afterClick.includes('일시정지'),'video click starts playback: '+afterClick);
  await page.waitForTimeout(1900);
  let t=await page.locator('.race-timer time').innerText();
  assert.notEqual(t,'00:00','elapsed time advances after playback begins');
  // Keyboard arrows should seek 5 sec, J/L should seek 10 sec without requiring UI forms.
  await page.locator('.broadcast').focus().catch(()=>{});
  await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
  const later=await page.locator('.race-timer time').innerText();
  assert.notEqual(later,t,'right arrow seeks the replay');
  t=later;await page.keyboard.press('k');await page.waitForTimeout(150);
  assert.ok((await page.locator('.transport-row .play').innerText()).includes('재생'),'K pauses');
  await page.keyboard.press('k');
  const other=await context.newPage();await other.goto('about:blank');
  await other.bringToFront();await page.waitForTimeout(1000);await page.bringToFront();
  await page.waitForTimeout(150);
  assert.ok((await page.locator('.transport-row .play').innerText()).includes('일시정지'),'browser tab switch must not pause');
  await other.close();
  await page.locator('.broadcast').click({position:{x:width<500?width*.6:width*.68,y:55}});
  // Cam angles change locally without modifying the replay record.
  await page.getByLabel('카메라 선택').selectOption('r1');
  for(const shot of ['chase','front','side'])await page.getByLabel('추적 카메라 각도').selectOption(shot);
  await page.getByLabel('카메라 선택').selectOption('auto');
  await page.getByLabel('HUD 크기',{exact:true}).selectOption('large');
  assert.equal(await page.locator('.player-screen').evaluate(el=>el.style.getPropertyValue('--hud-scale')),'1.3');
  await page.getByLabel('HUD 크기',{exact:true}).selectOption('medium');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:join(shotDir,'v4-'+label+'-race.png')});
  // Fullscreen HUD should be 1.5x at Medium by default.
  await page.getByRole('button',{name:'전체화면으로 보기'}).click();
  assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
  assert.equal(await page.locator('.player-screen').evaluate(el=>el.style.getPropertyValue('--hud-scale')),'1.5');
  await page.getByLabel('전체화면 HUD 크기').selectOption('large');
  assert.equal(await page.locator('.player-screen').evaluate(el=>el.style.getPropertyValue('--hud-scale')),'1.9');
  await page.getByRole('button',{name:'전체화면 자동 카메라 전환'}).click();
  await page.getByLabel('전체화면 카메라 각도').selectOption('front');
  await page.screenshot({path:join(shotDir,'v4-'+label+'-fullscreen.png')});
  await page.evaluate(()=>document.exitFullscreen());
  await page.getByLabel('HUD 크기',{exact:true}).selectOption('medium');
  // Seek to the finish: visually crossing racers should coast with glowing outlines.
  await page.locator('.watch-notes summary').click();
  const finish=page.locator('.highlights button').filter({hasText:'결승선 통과'});
  if(await finish.isEnabled()){
   await finish.click();await page.waitForTimeout(180);
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:join(shotDir,'v4-'+label+'-finish.png')});
  }
  assert.deepEqual(errors,[],'JS runtime errors: '+errors.join(' | '));
  console.log(label+' PASS '+JSON.stringify(dimensions));
  await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
