import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from '@playwright/test';
import {loadV14} from './load-v14.mjs';

const root=resolve(process.env.RACING_QA_ROOT??'out/galactic-racing-phase2-v14');
const out=resolve(process.env.RACING_QA_OUTPUT??'out/galactic-racing-v14-qa');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+sep))throw Error('PATH');res.setHeader('content-type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4196,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.RACING_QA_EXECUTABLE?{executablePath:process.env.RACING_QA_EXECUTABLE}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const s=await loadV14();const base=JSON.parse(await readFile(root+'/race.json','utf8'));
const report={status:'RUNNING',browser:browser.version(),platform:process.platform,gpu:'SwiftShader / software; Windows hardware GPU NOT VERIFIED',viewports:[]};
try{
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['narrow',360,800]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600,recordVideo:label==='desktop'?{dir:out+'/video',size:{width,height}}:undefined});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:4196/?motion=1',{waitUntil:'networkidle'});await p.locator('.scene canvas').waitFor();
  const info=await p.locator('.build-strip').innerText();assert.ok(info.includes('0.14.0')&&!info.includes('DIRTY'),info);
  assert.equal(await p.locator('.scene').getAttribute('data-renderer'),'WebGL 2');
  const offset=base.raceStartMs-base.raceBroadcast.preshowStartMs;
  const pause=async()=>{if(await p.getByRole('button',{name:'일시정지',exact:true}).count())await p.locator('.player-screen').press('k');};
  const seek=async ms=>{await p.locator('.player-progress').evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},ms);await p.waitForTimeout(300);};
  const sample=async()=>({pose:JSON.parse(await p.locator('.scene').getAttribute('data-pose')),target:await p.locator('.scene').getAttribute('data-target'),phase:await p.locator('.scene').getAttribute('data-cinematic')});
  const shot=async name=>{await p.locator('.player-screen').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${label}-${name}.png`});};
  await pause();await seek(offset+70000);await shot('race');
  const a=base.ultimates[0];await seek(offset+a.startTick*250+1000);await shot('gold');assert.equal((await sample()).target,a.id);
  await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(300);await p.getByRole('button',{name:'시청 설정',exact:true}).click();await p.getByLabel('HUD 크기',{exact:true}).selectOption('large');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await shot('fullscreen-large');await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  await p.locator('.local-race-settings summary').click();await p.getByRole('button',{name:'Hyper Phantom Warp · 14case-3',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.player-screen')?.dataset.seed==='14case-3');await pause();
  const hyper=s.simulateMeetingV14('14case-3'),plan=s.cinematicPlan(hyper).hyper[0],ho=hyper.raceStartMs-hyper.raceBroadcast.preshowStartMs;
  assert.ok(plan);const stages=[];
  for(const [stage,ms] of [['charge',plan.charge+500],['departure',plan.depart+600],['travel',plan.flight+270],['arrival',plan.arrival+600],['return',plan.reveal+125],['follow',plan.returnEnd+250]]){
   if(ms>=plan.terminal)continue;await seek(ho+ms);await p.locator('.player-screen').press('/');const value=await sample();assert.equal(value.target,plan.id);assert.equal(value.phase,stage);await shot('hyper-'+stage);stages.push({stage,ms,target:value.target,car:value.pose.cars[hyper.race.racers.findIndex(r=>r.id===plan.id)]});
  }
  assert.ok(stages.length>=5,'actual warp stages');await seek(ho+plan.depart+600);const before=await sample();await seek(ho+plan.returnEnd+250);await seek(ho+plan.depart+600);assert.deepEqual(await sample(),before,'seek reproduces picture');
  await p.getByRole('button',{name:'연속 궁극기 · 14case-0',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.player-screen')?.dataset.seed==='14case-0');await pause();
  const overlap=s.simulateMeetingV14('14case-366');await p.getByRole('button',{name:'궁극기 연출 중첩 · 14case-366',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.player-screen')?.dataset.seed==='14case-366');await pause();
  const oo=overlap.raceStartMs-overlap.raceBroadcast.preshowStartMs,[first,second]=overlap.ultimates;assert.ok(first.endTick>second.startTick);
  await seek(oo+second.startTick*250+200);await p.locator('.player-screen').press('/');assert.equal((await sample()).target,second.id,'new launch preempts older visual');await shot('overlap-new-subject');
  await p.locator('.player-screen').press(String(Number(first.id.slice(1))));await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,first.id);assert.equal((await sample()).target,first.id,'manual override');await p.locator('.player-screen').press('/');await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,second.id);assert.equal((await sample()).target,second.id,'AUTO resumes newest launch');
  await seek(oo+second.startTick*250-500);await p.locator('.player-screen').press('k');const samples=await p.evaluate(()=>new Promise(resolve=>{let rows=[],host=document.querySelector('.scene');let obs=new MutationObserver(()=>{rows.push({ms:JSON.parse(host.dataset.pose).ms,target:host.dataset.target,phase:host.dataset.cinematic});if(rows.length>=80){obs.disconnect();resolve(rows);}});obs.observe(host,{attributes:true,attributeFilter:['data-pose']});setTimeout(()=>{obs.disconnect();resolve(rows)},8000);}));await pause();assert.ok(samples.length>10,'real 30 FPS motion observed');assert.ok(samples.some(x=>x.ms>=overlap.raceStartMs+second.startTick*250&&x.target===second.id),'live second launch observed');
  await writeFile(`${out}/${label}-motion.json`,JSON.stringify({stages,samples}));assert.deepEqual(errors,[]);report.viewports.push({label,width,height,status:'PASS',hyperStages:stages.map(s=>s.stage),motionSamples:samples.length,overlap:true,seek:true,manual:true,fullscreen:true});await context.close();
 }
 report.status='PASS';await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await s.dispose();await browser.close();await new Promise(r=>server.close(r));}
