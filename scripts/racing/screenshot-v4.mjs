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
const meeting=JSON.parse(await readFile(join(root,'race.json'),'utf8'));
const report=[];
try {
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  let external=0;await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external++;return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const capture=name=>page.screenshot({path:join(shotDir,label+'-'+name+'.png')});
  const seek=async value=>{await page.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.waitForTimeout(150);};
  const settings=async()=>{if(!await page.getByLabel('카메라 선택').isVisible())await page.getByRole('button',{name:'시청 설정',exact:true}).click();};
  await page.goto('http://127.0.0.1:4192/',{waitUntil:'networkidle'});
  await page.locator('.track-minimap').waitFor();
  assert.equal(await page.locator('.track-minimap svg circle').count(),8);
  assert.equal(await page.locator('.control-row time').innerText(),'00:00 / 03:46');
  const initial=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,renderer:document.querySelector('.scene').dataset.renderer}));
  assert.ok(initial.scroll<=width);assert.equal(initial.renderer,'WebGL 2','GPU QA must not silently pass as SVG');
  await page.locator('.player-screen').press('ArrowRight');
  assert.equal(Number(await page.locator('.player-progress').inputValue()),5000);
  await page.locator('.player-screen').press('l');assert.equal(Number(await page.locator('.player-progress').inputValue()),15000);
  await page.locator('.player-screen').press('j');assert.equal(Number(await page.locator('.player-progress').inputValue()),5000);
  await page.locator('.player-screen').press('k');await page.waitForTimeout(500);
  const before=Number(await page.locator('.player-progress').inputValue());
  const tab=await context.newPage();await tab.goto('about:blank');await tab.bringToFront();await page.waitForTimeout(1200);await page.bringToFront();await page.waitForTimeout(200);
  assert.ok(Number(await page.locator('.player-progress').inputValue())>before+1000);await tab.close();
  await page.getByRole('button',{name:'시연 아카이브 둘러보기'}).click();assert.ok(await page.locator('.mini-player').isVisible());
  const mini=Number(await page.locator('.player-progress').inputValue());await page.waitForTimeout(500);
  await page.getByRole('button',{name:'전체 관람 화면으로 돌아가기'}).click();assert.ok(Number(await page.locator('.player-progress').inputValue())>mini);
  await page.locator('.player-screen').press('k');await seek(60000);await capture('race');
  await settings();await page.getByLabel('카메라 선택').selectOption('r1');
  for(const shot of ['chase','front','side']){await page.getByLabel('추적 카메라 각도').selectOption(shot);await page.getByRole('button',{name:'설정 닫기',exact:true}).click();await capture(shot);assert.equal(await page.locator('.scene').getAttribute('data-camera'),shot);await settings();}
  await page.getByLabel('카메라 선택').selectOption('auto');await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await page.getByRole('button',{name:'전체화면으로 보기'}).click();
  await page.waitForFunction(()=>document.fullscreenElement||document.querySelector('.is-pseudo-fullscreen'));
  const dimensions={};
  for(const size of ['medium','large']){
   await settings();await page.getByLabel('HUD 크기',{exact:true}).selectOption(size);await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
   dimensions[size]=await page.evaluate(()=>Object.fromEntries(['tower','lap-hud','track-minimap'].map(c=>{const e=document.querySelector('.'+c),r=e.getBoundingClientRect();return[c,{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,visible:getComputedStyle(e).display!=='none'}];})));
   const d=dimensions[size];if(d.tower.visible)assert.ok(d.tower.bottom<d['track-minimap'].y,'tower / map overlap');
   assert.ok(d['track-minimap'].x+d['track-minimap'].width<=width);await capture('fullscreen-'+size);
  }
  assert.ok(dimensions.large['lap-hud'].width>dimensions.medium['lap-hud'].width);
  await page.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  const finishers=meeting.race.results.filter(r=>r.status==='FINISHED').sort((a,b)=>a.finishMs-b.finishMs);
  for(let i=0;i<Math.min(3,finishers.length);i++){await seek(finishers[i].finishMs);await capture('finish-'+(i+1));assert.ok(Number(await page.locator('.scene').getAttribute('data-finishers'))>=i+1);}
  await seek(meeting.race.durationTicks*meeting.race.config.tickMs+3000);await capture('coasting');
  await page.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await page.locator('.player-screen').press('k');assert.ok(Number(await page.locator('.player-progress').inputValue())<1500);await capture('qualifying');
  await page.getByRole('button',{name:/시상식 다시보기/}).click();await page.locator('.player-screen').press('k');await seek(12000);await capture('ceremony');
  await page.getByLabel('시즌 선택').selectOption('3');assert.equal(await page.locator('.season-round:disabled').count(),7);await page.locator('.season-playlist').scrollIntoViewIfNeeded();await capture('season3');
  await page.locator('.watch-demo-tools summary').click();await page.getByRole('button',{name:'특별 DSQ 레이스로 변경',exact:true}).click();await page.waitForTimeout(500);
  await page.getByRole('button',{name:/시상식 다시보기/}).click();await page.locator('.player-screen').press('k');await seek(16000);await page.locator('.player-screen').scrollIntoViewIfNeeded();await capture('special-dsq');
  assert.deepEqual(errors,[]);assert.equal(external,0);report.push({label,width,height,...initial,dimensions,errors,external,status:'PASS'});
  await context.close();
 }
}finally{
 await (await import('node:fs/promises')).writeFile(join(shotDir,'browser-report.json'),JSON.stringify(report,null,2));
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(report));
