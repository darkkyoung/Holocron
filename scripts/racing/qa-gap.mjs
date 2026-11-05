import assert from 'node:assert/strict';
/** Compare the actual rendered HUD with confirmed timing, including rewind.
 * Algebra, jump/shortcut boundaries and future-data noninterference are also
 * independently exercised by the domain test's hand-built timing records.
 */
export async function verifyGapHud({p,meeting,sim,seek,shot,label,width}){
 const index=sim.buildTimingIndex(meeting.race,meeting.shortcutPassages),r=meeting.race,offset=meeting.raceStartMs-meeting.raceBroadcast.preshowStartMs;
 const checks=[],samples=new Map([['start',0],['start-moving',1000],['finish',r.durationTicks*250]]);
 const lead=r.events.find(e=>e.kind==='LEAD');if(lead)samples.set('leader-change',lead.tick*250);
 const pass=meeting.shortcutPassages.find(x=>x.success&&x.mergeMs!==null);if(pass){samples.set('shortcut-entry',Math.ceil(pass.entryMs/250)*250);samples.set('shortcut-merge',Math.ceil(pass.mergeMs/250)*250);}
 for(const h of meeting.wormholes??[])if(h.jumpTick!==null){samples.set('hyper-before',h.jumpTick*250-250);samples.set('hyper-jump',h.jumpTick*250);samples.set('hyper-after',(h.afterburnStartTick+2)*250);}
 for(const kind of ['DNF','DSQ']){const e=r.events.find(e=>e.kind===kind);if(e)samples.set(kind,e.tick*250);}
 if(width<600&&!await p.locator('.mobile-timing').evaluate(el=>el.open))await p.locator('.mobile-timing summary').click();
 const root=width<600?'.mobile-timing':'.tower';
 const inspect=async()=>{
  const at=Number(await p.locator(root).getAttribute('data-gap-ms')),expected=sim.gapsToLeader(index,at);
  const rows=await p.locator(root+' button[data-racer-id]').evaluateAll((buttons,mobile)=>buttons.map(b=>({id:b.dataset.racerId,label:b.querySelector(mobile?'strong':'small').textContent})),width<600);
  assert.deepEqual(rows.map(x=>[x.id,x.label]).sort(),expected.map(x=>[x.id,x.label]).sort());
  assert.ok(rows.every(x=>!/(km\/h|NaN|Infinity|\+-)/.test(x.label)));return {at,rows};
 };
 for(const [name,at] of samples){await seek(offset+at);await p.waitForFunction(({root,at})=>Number(document.querySelector(root)?.dataset.gapMs)===at,{root,at});const first=await inspect();await shot('gap-'+label+'-'+name);await seek(offset+1000);await seek(offset+at);assert.deepEqual(await inspect(),first);checks.push({name,...first});}
 await seek(offset+15000);await p.locator('.player-screen').press('k');const a=await inspect();await p.waitForTimeout(1300);const b=await inspect();assert.ok(b.at>a.at);await p.locator('.player-screen').press('k');checks.push({name:'dynamic-playing',before:a,after:b});
 if(width<600)await p.locator('.mobile-timing summary').click();
 return checks;
}

/** Explicit synthetic UI fixture, never a saved Seed result or balance sample.
 * A monotone slower racer creates a full-lap deficit; another retires as DSQ.
 * Same actual player/HTTP asset route, separately marked in QA evidence.
 */
export async function verifyGapFixtures({p,base,sim,seek,shot,width}){
 const fixture=structuredClone(base),r=fixture.race,id=r.racers[7].id,dsqId=r.racers[6].id;
 const terminalTick=40,terminalProgress=r.frames[terminalTick].racers[6].progress;
 for(const f of r.frames){for(const x of f.racers){if(x.id===id){x.progress=x.progress<0?x.progress:x.progress*.7;x.status='RACING';}if(x.id===dsqId&&f.tick>=terminalTick){x.progress=terminalProgress;x.status='DSQ';}}
  f.racers.slice().sort((a,b)=>(a.status==='DSQ')-(b.status==='DSQ')||b.progress-a.progress).forEach((x,i)=>x.rank=i+1);
 }
 r.results=r.results.map(x=>x.id===id?{...x,status:'RACING',finishMs:null}:x.id===dsqId?{...x,status:'DSQ',finishMs:null}:x);
 r.events=r.events.filter(e=>e.racerId!==id&&e.racerId!==dsqId);r.events.push({tick:terminalTick,racerId:dsqId,kind:'DSQ',rank:8,durationTicks:0,power:0});
 fixture.shortcutPassages=fixture.shortcutPassages.filter(x=>x.id!==id&&x.id!==dsqId);r.jumps=r.jumps?.filter(x=>x.id!==id&&x.id!==dsqId);
 fixture.ultimates=[];fixture.wormholes=[];
 await p.route('**/race.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)}));
 await p.evaluate(()=>sessionStorage.clear());await p.reload({waitUntil:'networkidle'});await p.locator('.scene canvas').waitFor();
 await p.getByRole('button',{name:/본경기 다시보기/}).click();
 const tick=Math.floor(r.durationTicks*.85),at=tick*250;await seek(fixture.raceStartMs-fixture.raceBroadcast.preshowStartMs+at);
 if(width<600)await p.locator('.mobile-timing summary').click();
 const root=width<600?'.mobile-timing':'.tower',value=width<600?'strong':'small';
 const expected=sim.gapsToLeader(sim.buildTimingIndex(r,fixture.shortcutPassages),at),gap=expected.find(x=>x.id===id);
 assert.ok(gap.laps>=1);assert.equal(await p.locator(root+` button[data-racer-id="${id}"] ${value}`).innerText(),gap.label);
 assert.equal(await p.locator(root+` button[data-racer-id="${dsqId}"] ${value}`).innerText(),'DSQ');await shot('gap-synthetic-lapped-and-dsq');
 await p.unroute('**/race.json');return {synthetic:true,description:'Monotone slower racer and recorded DSQ; not an official simulated Seed',at,lapped:gap.label,dsq:'DSQ'};
}
