// Real isolated Chromium screenshots of the built Phase-1 watch UI; no Production or external API.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join,normalize} from 'node:path';

const root=resolve('out/galactic-racing-watch');
const shotDir=resolve('out/galactic-racing-phase1-qa');
await mkdir(shotDir,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4191');
  const relative=normalize(url.pathname==='/'?'/index.html':url.pathname).replace(/^[/\\]+/,'');
  const full=resolve(root,relative);
  if(!full.startsWith(root+'/')){res.writeHead(403);return res.end();}
  const body=await readFile(full);
  res.writeHead(200,{'content-type':mime[extname(full)]??'application/octet-stream','cache-control':'no-store'});
  res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(4191,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4191/',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:/갤럭틱 레이싱/}).waitFor();
  await page.locator('.lap-hud strong').waitFor();
  assert.match(await page.locator('.lap-hud strong').innerText(),/^[1-3] \/ 3$/);
  assert.equal(await page.locator('.playlist-entry').count(),3);
  assert.equal(await page.locator('.season-round').count(),7);
  assert.equal(await page.locator('.season-demo-badge').innerText(),'시연 일정');
  const fit=await page.evaluate(()=>({
   window:innerWidth,
   scroll:document.documentElement.scrollWidth,
   player:Math.round(document.querySelector('.broadcast').getBoundingClientRect().width),
   videoHeight:Math.round(document.querySelector('.broadcast').getBoundingClientRect().height),
   renderer:document.querySelector('.scene')?.getAttribute('data-renderer'),
  }));
  assert(fit.scroll<=fit.window+2,'document horizontal overflow: '+JSON.stringify(fit));
  assert(Math.abs(fit.player/fit.videoHeight-16/9)<.1,'16:9 player required');
  // Sample an actual chase shot rather than only the distant opening establishing shot.
  await page.locator('.transport-row button.play').click();
  await page.waitForTimeout(3400);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:join(shotDir,'phase1-'+label+'-race.png')});
  await page.locator('.transport-row button.play').click();
  // Event highlight seeks to the recorded incident. The badge is rendered by the 3D scene.
  await page.locator('.watch-notes summary').click();
  const hazard=page.locator('.highlights button').filter({hasText:'외부 방해'});
  if(await hazard.isEnabled()){
   await hazard.click();
   await page.waitForTimeout(300);
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:join(shotDir,'phase1-'+label+'-event.png')});
  }
  // Qualifying session uses round number, not a fake main-race lap.
  await page.getByRole('button',{name:/퀄리파잉 다시보기/}).first().click();
  await page.waitForTimeout(250);
  assert.match(await page.locator('.lap-hud strong').innerText(),/^R[1-3] \/ 3$/);
  // One week shows seven slots; season 2 exists as a UI fixture without invented results.
  await page.getByLabel('시즌 선택').selectOption('2');
  assert.equal(await page.locator('.season-round:disabled').count(),7);
  await page.getByLabel('시즌 선택').selectOption('1');
  // Podium is a separate replay, not an event-seek within the main race.
  await page.getByRole('button',{name:/시상식 다시보기/}).first().click();
  await page.getByLabel('속도').selectOption('8');
  await page.waitForTimeout(4000);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:join(shotDir,'phase1-'+label+'-podium.png')});
  assert.equal(await page.locator('.lap-hud strong').innerText(),'3 / 3');
  // The full-screen request must remain available independent of mobile portrait layout.
  const full=page.getByRole('button',{name:'전체화면으로 보기'});
  await full.click();
  await page.waitForTimeout(120);
  const isFull=await page.evaluate(()=>!!document.fullscreenElement);
  assert.equal(isFull,true,'Full-screen button must work');
  await page.evaluate(()=>document.exitFullscreen());
  assert.deepEqual(errors,[],'No JS runtime errors');
  console.log(label+' PASS '+JSON.stringify(fit));
  await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
