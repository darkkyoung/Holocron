import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
/** Real rendered positions, body+billboard alpha, framing and replay operations. */
export async function verifyPhantom({p,meeting,seek,pause,shot,captureMotion,pose,out,label,width}){
 const a=meeting.ultimates.find(a=>a.type==='hyper'),h=meeting.wormholes.find(h=>h.id===a.id),idx=meeting.race.racers.findIndex(r=>r.id===a.id),offset=meeting.raceStartMs-meeting.raceBroadcast.preshowStartMs;
 assert.ok(h.jumpTick!==null&&!h.cancelled&&h.phantomStartTick!==null);
 const start=h.phantomStartTick*250,jump=h.jumpTick*250,stages=[];
 for(const [at,name] of [[start+125,'acceleration'],[start+313,'fade'],[start+500,'transit'],[jump+125,'return'],[h.afterburnStartTick*250+500,'afterburn']]){
  await seek(offset+at);await p.locator('.player-screen').press('/');await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,a.id);
  const value=await pose(),car=value.cars[idx],phase=await p.locator('.scene').getAttribute('data-phantom');assert.equal(phase,name);assert.equal(car.opacity,car.spriteOpacity,'car and billboard fade together');
  if(name==='transit'){assert.equal(car.opacity,0);assert.equal(car.visible,false);}else{assert.ok(car.visible);assert.ok(car.opacity>0);if(name==='fade'||name==='return')assert.ok(car.opacity<1);else assert.equal(car.opacity,1);assert.ok(Math.abs(car.screen[0])<.9&&Math.abs(car.screen[1])<.9&&car.screen[2]<1,'visible burst/arrival subject framed');}
  await shot('phantom-'+name);stages.push({name,at,pose:value});await seek(offset+1000);await seek(offset+at);assert.deepEqual(await pose(),value,'pure phase/camera seek');
 }
 // 0.5x gives a short fade sufficient rendered samples even with software GL.
 const rates=[];
 for(const speed of ['0.5','1','2']){
  await p.getByRole('button',{name:'시청 설정',exact:true}).click();await p.getByLabel('재생 속도',{exact:true}).selectOption(speed);await p.getByRole('button',{name:'설정 닫기',exact:true}).click();await seek(offset+start-500);
  const motion=await captureMotion(meeting.raceStartMs+a.endTick*250+250);await pause();
  const active=motion.filter(v=>v.ms>=meeting.raceStartMs+a.startTick*250&&v.ms<meeting.raceStartMs+a.endTick*250);assert.ok(active.length>10);assert.ok(active.every(v=>v.target===a.id));
  assert.ok(active.some(v=>v.cars[idx].opacity===0),'actual invisible frames');assert.ok(active.some(v=>v.cars[idx].opacity===1&&v.phase==='afterburn'));
  if(speed==='0.5'){for(const phase of ['acceleration','fade','transit','return','afterburn'])assert.ok(active.some(v=>v.phase===phase),phase+' captured dynamically');const acc=active.filter(v=>v.phase==='acceleration');assert.ok(acc.length>=2);assert.notDeepEqual(acc[0].cars[idx].position,acc.at(-1).cars[idx].position,'visible acceleration moves');}
  await writeFile(`${out}/${label}-phantom-${speed}x-motion.json`,JSON.stringify(motion));rates.push({speed,samples:motion.length,phases:[...new Set(active.map(v=>v.phase))]});
 }
 await p.getByRole('button',{name:'시청 설정',exact:true}).click();await p.getByLabel('재생 속도',{exact:true}).selectOption('1');await p.getByRole('button',{name:'설정 닫기',exact:true}).click();
 await seek(offset+start+500);const manual=meeting.race.racers[(idx+1)%8];await p.locator('.player-screen').press(String((idx+1)%8+1));await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,manual.id);await p.locator('.player-screen').press('/');await p.waitForFunction(id=>document.querySelector('.scene')?.dataset.target===id,a.id);
 await seek(offset+jump+125);await p.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();await p.waitForTimeout(300);await shot('phantom-fullscreen-return');const full=await pose();assert.ok(Math.abs(full.cars[idx].screen[0])<.9&&Math.abs(full.cars[idx].screen[1])<.9);assert.equal(full.cars[idx].opacity,.5);
 await p.getByRole('button',{name:'전체화면 종료',exact:true}).click();
 await writeFile(`${out}/${label}-phantom-stages.json`,JSON.stringify(stages));
 return {seed:meeting.race.seed,stages:stages.map(s=>({name:s.name,at:s.at,opacity:s.pose.cars[idx].opacity})),rates,manualOverride:true,seek:true,fullscreen:true,width};
}
