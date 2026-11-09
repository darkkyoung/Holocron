import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
/** Actual canvas poses, not merely component existence. Missing dynamic phases
 * are recorded per rate; only an observed phase may receive visual PASS. */
export async function verifyCinematic({p,meeting,sim,simulate,cases,seek,pause,shot,captureMotion,pose,out,label,width}){
 const plan=sim.cinematicPlan(meeting).hyper[0],id=plan.id,idx=meeting.race.racers.findIndex(r=>r.id===id),offset=meeting.raceStartMs-meeting.raceBroadcast.preshowStartMs;
 const stages=[],rates=[];
 if(await p.locator('.watch-notes').getAttribute('open')===null)await p.locator('.watch-notes summary').click();await p.locator('.highlights button').filter({hasText:/^ULTIMATE/}).click();await pause();await p.waitForFunction(expected=>JSON.parse(document.querySelector('.scene')?.dataset.pose??'{}').ms===expected,meeting.raceStartMs+plan.charge);await p.locator('.player-screen').press('/');assert.equal((await pose()).ms,meeting.raceStartMs+plan.charge,'highlight includes complete three-second pre-roll');
 for(const [at,name] of [[plan.charge+500,'charge'],[plan.burst+125,'burst'],[plan.fade+62.5,'fade'],[plan.depart+750,'departure'],[plan.flight+275,'travel'],[plan.arrival+750,'arrival'],[plan.reveal+125,'return'],[plan.returnEnd+750,'follow']]){
  assert.ok(at<plan.terminal,'demo must permit full cinematic');
  await seek(offset+at);await p.locator('.player-screen').press('/');await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,id);
  const value=await pose(),car=value.cars[idx];assert.equal(await p.locator('.scene').getAttribute('data-cinematic'),name);assert.equal(car.opacity,car.spriteOpacity);
  if(['departure','travel','arrival'].includes(name)){assert.equal(car.opacity,0);assert.equal(car.visible,false);}else{assert.ok(car.visible&&car.opacity>0);assert.ok(Math.abs(car.screen[0])<.95&&Math.abs(car.screen[1])<.95&&car.screen[2]<1,'visible subject framed: '+name);}
  if(name==='fade'||name==='return')assert.ok(car.opacity<1);
  await shot('cinematic-'+name);await seek(offset+1000);await seek(offset+at);assert.deepEqual(await pose(),value,'pure Seek');stages.push({name,at,pose:value});
 }
 for(const speed of ['0.5','1','2']){
  await p.getByRole('button',{name:'시청 설정',exact:true}).click();await p.getByLabel('재생 속도',{exact:true}).selectOption(speed);await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await seek(offset+plan.charge-300);const motion=await captureMotion(meeting.raceStartMs+plan.end+300);await pause();
  const active=motion.filter(v=>v.ms>=meeting.raceStartMs+plan.charge&&v.ms<meeting.raceStartMs+plan.end);
  assert.ok(active.length>20);assert.ok(active.every(v=>v.target===id),'presentation subject lock');
  const required=['charge','burst','fade','departure','travel','arrival','return','follow'],seen=[...new Set(active.map(v=>v.phase))],missing=required.filter(x=>!seen.includes(x));
  if(speed==='0.5')assert.deepEqual(missing,[],'all phases must be captured dynamically at inspection speed');
  const departing=active.filter(v=>v.phase==='departure');assert.ok(departing.at(-1).ms-departing[0].ms>1500);assert.deepEqual(departing[0].camera,departing.at(-1).camera,'fixed departure camera');
  const arriving=active.filter(v=>v.phase==='arrival');assert.ok(arriving.at(-1).ms-arriving[0].ms>1500);assert.deepEqual(arriving[0].camera,arriving.at(-1).camera,'fixed arrival camera');
  const hidden=active.filter(v=>['departure','travel','arrival'].includes(v.phase));assert.ok(hidden.every(v=>v.cars[idx].opacity===0));assert.notDeepEqual(hidden[0].cars[idx].position,hidden.at(-1).cars[idx].position,'official movement continues while hidden');
  await writeFile(`${out}/${label}-cinematic-${speed}x-motion.json`,JSON.stringify(motion));rates.push({speed,samples:motion.length,phases:seen,missing,status:missing.length?'PARTIAL':'PASS'});
 }
 await p.getByRole('button',{name:'시청 설정',exact:true}).click();await p.getByLabel('재생 속도',{exact:true}).selectOption('1');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
 await seek(offset+plan.charge+500);const number=(idx+1)%8+1;await p.locator('.player-screen').press(String(number));await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,meeting.race.racers[number-1].id);await p.locator('.player-screen').press('/');await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,id);
 await seek(offset+plan.reveal+125);await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(400);await shot('cinematic-fullscreen-return');const full=await pose();assert.ok(Math.abs(full.cars[idx].screen[0])<.95&&Math.abs(full.cars[idx].screen[1])<.95);
 await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
 await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'Hyper Phantom Warp · '+meeting.race.seed,exact:true}).click();await p.waitForFunction(()=>JSON.parse(document.querySelector('.scene')?.dataset.pose??'{}').reducedMotion===true);await pause();await seek(offset+plan.fade+62.5);assert.ok((await pose()).cars[idx].opacity<1);await shot('cinematic-reduced-motion');await p.emulateMedia({reducedMotion:'no-preference'});
 const edges=[];
 if(width===1440)for(const title of ['Hyper · 안전 취소','선두 DNF','선두 DNF · 궁극기 긴급 중계','Hyper · 발동 순간 DNF']){
  const seed=cases.find(c=>c.label===title).seed,m=simulate(seed),o=m.raceStartMs-m.raceBroadcast.preshowStartMs;
  await p.getByRole('button',{name:title+' · '+seed,exact:true}).click();await p.waitForFunction(seed=>document.querySelector('.player-screen')?.dataset.seed===seed,seed);await pause();await p.locator('.player-screen').press('/');
  const q=title.startsWith('선두 DNF')?sim.cinematicPlan(m).retirements.find(e=>e.leader&&(!title.includes('긴급')||m.ultimates.some(a=>a.id!==e.id&&e.at>=a.startTick*250&&e.at<a.endTick*250))):sim.cinematicPlan(m).hyper[0],at=title.startsWith('선두 DNF')?q.at:q.failedAt;
  assert.ok(at!==null);await seek(o+at-3250);const motion=await captureMotion(m.raceStartMs+at+3600);await pause();await writeFile(`${out}/${label}-${seed}-edge-motion.json`,JSON.stringify(motion));
  if(title.startsWith('선두 DNF'))assert.ok(motion.filter(v=>v.ms>=m.raceStartMs+at&&v.ms<m.raceStartMs+at+3500).every(v=>v.target===q.id));
  else if(title==='Hyper · 발동 순간 DNF'){assert.ok(motion.some(v=>v.phase==='charge'));assert.ok(motion.filter(v=>v.ms>=m.raceStartMs+at&&v.ms<m.raceStartMs+at+3500).every(v=>v.target===q.id));}
  else{assert.ok(motion.some(v=>v.phase==='failed'));assert.ok(motion.filter(v=>v.phase==='failed').every(v=>v.cars[m.race.racers.findIndex(r=>r.id===q.id)].opacity===1));}
  const smoking=motion.filter(v=>v.ms>=m.raceStartMs+at+100&&v.ms<m.raceStartMs+at+2200);assert.ok(smoking.some(v=>v.cinematicEffects.smoke===8),'actual smoke meshes visible');assert.ok(smoking.at(-1).cinematicEffects.smokeOpacity<smoking[0].cinematicEffects.smokeOpacity,'smoke decays');
  assert.ok(motion.some(v=>v.ms>=m.raceStartMs+at&&v.ms<m.raceStartMs+at+300&&v.cinematicEffects.shockwave),'mechanical shockwave captured dynamically');await seek(o+at+125);await shot('mechanical-shockwave-'+seed);await seek(o+at+400);await shot(title.startsWith('선두 DNF')?'leader-dnf-smoke':'warp-failed-smoke');await seek(o+at+3600);await shot('smoke-cleared-'+seed);edges.push({seed,title,at,samples:motion.length});
 }
 if(width===1440){
  await p.getByLabel('랩 수 프리셋').selectOption('3');await p.getByLabel('경기 Seed',{exact:true}).fill('13lap3-8');await p.getByRole('button',{name:'새 경기 생성',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.player-screen')?.dataset.seed==='13lap3-8');await pause();
  const short=simulate('13lap3-8',true,{laps:3}),q=sim.cinematicPlan(short).hyper[0],o=short.raceStartMs-short.raceBroadcast.preshowStartMs;await seek(o+q.charge-250);const motion=await captureMotion(short.raceStartMs+q.terminal+1500);await pause();
  assert.ok(motion.some(v=>v.phase==='charge'));assert.ok(motion.filter(v=>v.ms>=short.raceStartMs+q.terminal).every(v=>v.phase===''));await seek(o+q.terminal+100);await shot('three-lap-terminal-cut');await writeFile(`${out}/${label}-three-lap-terminal-motion.json`,JSON.stringify(motion));
 }
 await writeFile(`${out}/${label}-cinematic-stages.json`,JSON.stringify(stages));return {seed:meeting.race.seed,stages:stages.map(s=>({name:s.name,at:s.at})),rates,edges,manualOverride:true,seek:true,fullscreen:true,reducedMotion:true};
}
