import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {loadV11} from './racing/load-v11.mjs';
import {loadV10} from './racing/load-v10.mjs';
const s=await loadV11(),old=await loadV10();
let launches=0,gapSamples=0,locks=0,zero=0;const hashes={},cases={};
try{
 const frozen=JSON.parse(await readFile('docs/racing/evidence/phase2d-v010-contract.json','utf8')).hashes;
 for(const [seed,hash] of Object.entries(frozen))assert.equal(createHash('sha256').update(JSON.stringify(old.simulateMeetingV10(seed))).digest('hex'),hash);
 assert.equal(s.LAUNCH_V11.eligible(.699999,3),false);assert.equal(s.LAUNCH_V11.eligible(.7,.3),true);assert.equal(s.LAUNCH_V11.eligible(.949999,.05),true);assert.equal(s.LAUNCH_V11.eligible(.95,2),false);
 assert.ok(s.LAUNCH_V11.weight(.75)<s.LAUNCH_V11.weight(.85));assert.ok(s.LAUNCH_V11.weight(.925)<s.LAUNCH_V11.weight(.85));
 // Hand-calculated same-distance timing, stopped racer, a skipped interval,
 // start-grid unknown point, finish interpolation, lap deficit and retirement.
 const racer=(id,p,rank,status='RACING')=>({id,progress:p,rank,status,speed:0,motion:'CRUISE',damage:0,ultimate:false});
 const race={config:{tickMs:1000,track:{length:400,laps:4}},durationTicks:4,racers:[{id:'a'},{id:'b'},{id:'c'}],frames:[
 {tick:0,racers:[racer('a',0,1),racer('b',-10,2),racer('c',-20,3)]},
 {tick:1,racers:[racer('a',100,1),racer('b',50,2),racer('c',0,3)]},
 {tick:2,racers:[racer('a',200,1),racer('b',150,2),racer('c',0,3,'DNF')]},
 {tick:3,racers:[racer('a',300,2),racer('b',350,1),racer('c',0,3,'DNF')]},
 {tick:4,racers:[racer('a',400,2,'FINISHED'),racer('b',400,1,'FINISHED'),racer('c',0,3,'DNF')]}],
 results:[{id:'a',status:'FINISHED',finishMs:4000},{id:'b',status:'FINISHED',finishMs:3500},{id:'c',status:'DNF',finishMs:null}],jumps:[{id:'b',tick:3,from:200,to:350}]};
 const idx=s.buildTimingIndex(race);
 assert.equal(s.gapsToLeader(idx,0).find(g=>g.id==='b').label,'—');
 assert.equal(s.gapsToLeader(idx,1500).find(g=>g.id==='b').label,'+0.50s');
 assert.equal(s.gapsToLeader(idx,2000).find(g=>g.id==='b').label,'+0.50s');
 assert.equal(s.gapsToLeader(idx,3000).find(g=>g.id==='a').label,'+0.00s');
 assert.equal(s.crossingAt(idx,'b',250,2999),null);assert.equal(s.crossingAt(idx,'b',250,3000),3000);
 assert.equal(s.gapsToLeader(idx,4000).find(g=>g.id==='a').label,'+0.50s');
 assert.equal(s.gapsToLeader(idx,2000).find(g=>g.id==='c').label,'DNF');
 const lapRace={...race,frames:race.frames.map(f=>({...f,racers:f.racers.map(x=>x.id==='c'?{...x,status:'RACING'}:x)}))};
 assert.equal(s.gapsToLeader(s.buildTimingIndex(lapRace),2000).find(g=>g.id==='c').label,'+2 LAPS');
 // Branch entry/merge is piecewise: 20cm at 200ms,80cm at500ms.
 const branch={...race,frames:[{tick:0,racers:[racer('a',0,1),racer('b',0,2),racer('c',0,3)]},{tick:1,racers:[racer('a',100,1),racer('b',100,2),racer('c',0,3)]}],durationTicks:1,results:[],jumps:[]};
 const shortcut=s.buildTimingIndex(branch,[{id:'a',success:true,entryProgress:20,exitProgress:80,entryMs:200,mergeMs:500}]);
 assert.equal(s.crossingAt(shortcut,'a',50,1000),350);assert.equal(s.crossingAt(shortcut,'a',50,300),null);
 const d=s.gapsToLeader(idx,2500);s.gapsToLeader(idx,4000);assert.deepEqual(s.gapsToLeader(idx,2500),d);
 for(let n=0;n<100;n++){
  const seed='11lu-'+n,m=s.simulateMeetingV11(seed),r=m.race,index=s.buildTimingIndex(r,m.shortcutPassages);if(!m.ultimates.length)zero++;
  if(n<20){assert.deepEqual(m,s.simulateMeetingV11(seed));hashes[seed]=createHash('sha256').update(JSON.stringify(m)).digest('hex');}
  if(n<10){const summary=s.simulateMeetingV11(seed,false);for(const key of ['ultimates','wormholes','raceLaps','official','shortcutPassages'])assert.deepEqual(m[key],summary[key]);assert.deepEqual(r.events,summary.race.events);}
  if(m.specialDsq&&!cases.specialDsq)cases.specialDsq=seed;
  for(const a of m.ultimates){launches++;assert.ok(a.progressBefore>=.7&&a.progressBefore<.95);assert.ok(a.remainingLaps>0&&a.remainingLaps<=3.00001);assert.ok(Math.floor(a.progressBefore*10)+1>=8);
   if(!cases[a.type])cases[a.type]={seed,id:a.id,tick:a.startTick};
   if(n<20){const b=s.forBroadcast(m);for(let t=a.startTick;t<a.endTick;t+=.5){const ms=b.raceStartMs+t*250;assert.equal(s.cameraAt(b,ms,null).racerId,a.id);s.cameraAt(b,ms+50000,null);assert.equal(s.cameraAt(b,ms,null).racerId,a.id);locks++;}}
  }
  for(let tick=0;tick<r.frames.length;tick+=11){
   const at=tick*250,gaps=s.gapsToLeader(index,at);assert.equal(gaps.length,8);
   assert.ok(gaps.every(g=>!/(NaN|Infinity|\+-)/.test(g.label)));
   // With all future frames/anchors/results withheld, answers must be identical.
   const prefix={...r,frames:r.frames.slice(0,tick+1),durationTicks:tick,jumps:r.jumps?.filter(j=>j.tick<=tick),results:r.results.filter(x=>x.finishMs!==null&&x.finishMs<=at)};
   const knownPassages=m.shortcutPassages.filter(p=>p.entryMs<=at).map(p=>({...p,mergeMs:p.mergeMs!==null&&p.mergeMs<=at?p.mergeMs:null}));
   assert.deepEqual(s.gapsToLeader(s.buildTimingIndex(prefix,knownPassages),at),gaps);
   const before=JSON.stringify(gaps);s.gapsToLeader(index,at+999999);assert.equal(JSON.stringify(s.gapsToLeader(index,at)),before);gapSamples+=8;
  }
  const finish=s.gapsToLeader(index,r.durationTicks*250),winner=r.results.find(x=>x.position===1);
  for(const g of finish.filter(g=>g.status==='FINISHED')){const own=r.results.find(x=>x.id===g.id);assert.equal(g.label,own.id===winner.id?'LEADER':'+'+((own.finishMs-winner.finishMs)/1000).toFixed(2)+'s');}
 }
 assert.ok(zero>0,'no forced launch');assert.ok(cases.gold&&cases.hyper&&cases.specialDsq);
 for(const laps of [1,3,5,10,15,30])for(let n=0;n<5;n++){const m=s.simulateMeetingV11('settings-'+n,true,{laps});for(const a of m.ultimates)assert.ok(a.progressBefore>=.7&&a.progressBefore<.95);for(const r of m.race.results.filter(r=>r.status==='FINISHED'))assert.equal(m.raceLaps.filter(l=>l.id===r.id).length,laps);}
 const result={status:'PASS',oldV10FullHashes:Object.keys(frozen).length,meetings:100,extraLapMeetings:30,launches,zero,gapSamples,locks,hashes,cases};await mkdir('out',{recursive:true});await writeFile('out/racing-v11-contract.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,hashes:Object.keys(hashes).length}));
}finally{await s.dispose();await old.dispose();}
