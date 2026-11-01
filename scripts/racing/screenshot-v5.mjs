// Isolated Chromium QA of locally built v0.5, including tab switch, keyboard,
 // 3 manually selectable views, HUD presets, minimap and post-finish scene.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join,normalize} from 'node:path';
import {createRequire} from 'node:module';
// Reuse Playwright's bundled PNG decoder; no new browser/project dependency.
const require=createRequire(import.meta.url);
const testRequire=createRequire(require.resolve('@playwright/test'));
const playwrightRequire=createRequire(testRequire.resolve('playwright'));
const {PNG}=playwrightRequire('playwright-core/lib/utilsBundle');

const root=resolve('out/galactic-racing-phase2-v5');
const shotDir=resolve('out/galactic-racing-v5-qa');
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
  const capture=async name=>{
   if(name.includes('fullscreen')){
    // Fullscreen layout/ResizeObserver and the capped RAF finish asynchronously.
    // Verify actual canvas pixels after that transition, not only visible HUD DOM.
    let colors=0;
    for(let attempt=0;attempt<10&&colors<8;attempt++){
     await page.waitForTimeout(100);
     const png=PNG.sync.read(await page.locator('.scene canvas').screenshot({style:'.broadcast > :not(.scene), .player-screen > :not(.broadcast), .scene::before, .scene .racer-event { visibility:hidden !important; }'}));
     const values=new Set();
     for(let y=0;y<png.height;y+=3)for(let x=0;x<png.width;x+=3){const i=(y*png.width+x)*4;values.add((png.data[i]<<16)|(png.data[i+1]<<8)|png.data[i+2]);}
     colors=values.size;
    }
    assert.ok(colors>=8,'fullscreen must contain rendered 3D pixels, not an empty clear buffer');
   }
   return page.screenshot({path:join(shotDir,label+'-'+name+'.png')});
  };
  const seek=async value=>{await page.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.waitForTimeout(150);};
  const settings=async()=>{if(!await page.getByLabel('카메라 선택').isVisible())await page.getByRole('button',{name:'시청 설정',exact:true}).click();};
  await page.goto('http://127.0.0.1:4192/',{waitUntil:'networkidle'});
  await page.locator('.track-minimap').waitFor();
  assert.equal(await page.locator('.track-minimap svg circle').count(),8);
  assert.ok((await page.locator('.control-row time').innerText()).startsWith('00:00 / '));
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
  await seek(70000);await settings();await page.getByLabel('카메라 선택').selectOption('r1');
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
  for(let i=0;i<Math.min(3,finishers.length);i++){await seek(Math.ceil(finishers[i].finishMs/meeting.race.config.tickMs)*meeting.race.config.tickMs);await capture('finish-'+(i+1));assert.ok(Number(await page.locator('.scene').getAttribute('data-finishers'))>=i+1);}
  await seek(meeting.race.durationTicks*meeting.race.config.tickMs+3000);await capture('coasting');
  const passage=meeting.shortcutPassages.find(p=>p.success&&p.mergeMs);
  await settings();await page.getByLabel('카메라 선택').selectOption(passage.id);await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
  for(const [name,time] of [['branch-entry',passage.entryMs+400],['branch-mid',(passage.entryMs+passage.mergeMs)/2],['branch-merge',passage.mergeMs+400]]){await seek(time);await capture(name);}
  await page.getByRole('button',{name:/퀄리파잉 다시보기/}).click();await page.locator('.player-screen').press('k');assert.ok(Number(await page.locator('.player-progress').inputValue())<1500);await capture('qualifying');
  await seek(0);await capture('preshow');assert.ok(await page.locator('.in-video[data-stage="preshow"]').isVisible());
  for(const r of meeting.qualifying.rounds){
   await seek(r.startMs+500);assert.equal(await page.locator('.tower .not-started').count(),7);
   await seek(r.finishMs+200);await capture('round-'+r.round+'-results');assert.ok(await page.locator('.in-video[data-stage="result"]').isVisible());
  }
  const mark=meeting.qualifying.runs.filter(r=>r.round===1&&r.valid).sort((a,b)=>a.finishMs-b.finishMs)[0];
  await seek(mark.finishMs+300);if(width<600){await page.locator('.mobile-timing summary').click();await page.locator('.mobile-timing').scrollIntoViewIfNeeded();}await capture('record-highlight');assert.ok(await page.locator('.tower button').evaluateAll(nodes=>nodes.some(n=>getComputedStyle(n).boxShadow!=='none')));
  await page.locator('.player-screen').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await capture('qualifying-record-fullscreen');
  if(await page.locator('.tower').isVisible()){const tower=await page.locator('.tower').boundingBox(),map=await page.locator('.track-minimap').boundingBox();assert.ok(tower.y+tower.height<map.y,'qualifying tower must clear minimap');}
  await page.getByRole('button',{name:'전체화면 종료',exact:true}).click();await seek(meeting.qualifying.gridStartMs+200);await capture('final-grid');assert.ok(await page.locator('.in-video[data-stage="grid"]').isVisible());
  await page.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await capture('qualifying-fullscreen');
  const panel=await page.locator('.in-video').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=height,'qualifying results must fit fullscreen');
  await page.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  // Real UI gate: early click and wall-clock expiry; no engine reroll.
  await page.getByLabel('발표 진행',{exact:true}).selectOption('manual');
  await seek(meeting.qualifying.rounds[0].finishMs-500);await page.locator('.player-screen').press('k');
  await page.locator('.hold-controls').waitFor();await capture('manual-hold');
  const held=Number(await page.locator('.player-progress').inputValue());await page.waitForTimeout(500);assert.equal(Number(await page.locator('.player-progress').inputValue()),held);
  await page.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await capture('manual-hold-fullscreen');
  await page.getByRole('button',{name:'다음 라운드 시작',exact:true}).click();await page.waitForTimeout(400);assert.ok(Number(await page.locator('.player-progress').inputValue())>=meeting.qualifying.rounds[0].resultEndMs);
  assert.equal(await page.locator('.hold-controls').count(),0);await page.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  await seek(meeting.qualifying.rounds[1].finishMs-500);await page.locator('.player-screen').press('k');await page.locator('.hold-controls').waitFor();
  await page.clock.setFixedTime(new Date(Date.now()+300001));await page.waitForTimeout(500);
  assert.equal(await page.locator('.hold-controls').count(),0,'manual result must expire once after five wall-clock minutes');
  assert.ok(Number(await page.locator('.player-progress').inputValue())>=meeting.qualifying.rounds[1].resultEndMs);
  await page.getByLabel('발표 진행',{exact:true}).selectOption('auto');await page.getByLabel('전체 연속 재생',{exact:true}).check();
  await seek(meeting.raceStartMs-500);await page.locator('.player-screen').press('k');await page.waitForFunction(()=>document.querySelector('.race-timer')?.textContent.includes('RACE'));
  await seek(meeting.ceremonyStartMs-meeting.raceStartMs-500);await page.locator('.player-screen').press('k');await page.waitForFunction(()=>document.querySelector('.race-timer')?.textContent.includes('PODIUM'));
  await page.getByLabel('전체 연속 재생',{exact:true}).uncheck();

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
