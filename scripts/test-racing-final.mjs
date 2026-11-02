import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadV9} from './racing/load-v9.mjs';
import {loadTestModules} from './test-module-loader.mjs';
const s=await loadV9(),l=await loadTestModules(['lib/racing/v9/ceremony.ts','prototypes/galactic-racing-v2/racer-profiles.ts','prototypes/galactic-racing-v2/watch-hud.ts']),x=Object.assign({},...Object.values(l.modules));
try{
 const frozen=JSON.parse(await readFile('docs/racing/evidence/phase2d-final-v9-contract.json')),results=[];
 for(const [seed,hash] of Object.entries(frozen.hashes)){const m=s.simulateMeetingV9(seed);assert.equal(createHash('sha256').update(JSON.stringify({race:m.race,qualifying:m.qualifying,paths:m.shortcutPassages,official:m.official,ultimates:m.ultimates})).digest('hex'),hash);}
 for(const seed of ['9ru-2','9ru-59']){const m=s.simulateMeetingV9(seed),before=JSON.stringify(m),at=t=>x.ceremonyState(m,m.ceremonyStartMs+t);
  assert.equal(at(0).stage,'overview');for(const [time,rank,stage] of [[4000,2,'third'],[9000,1,'second'],[14000,0,'first']]){assert.equal(at(time).rank,rank);assert.equal(at(time).stage,stage);}
  if(m.specialDsq){assert.equal(at(29999).reveal,false);assert.equal(at(30000).reveal,true);assert.equal(at(39999).reclassified,false);assert.equal(at(40000).reclassified,true);assert.equal(x.finishMark(m,m.specialDsq.id,m.ceremonyStartMs+39999),'finished');assert.equal(x.finishMark(m,m.specialDsq.id,m.ceremonyStartMs+40000),'dsq');assert.equal(at(44000).stage,'overview');assert.equal(at(48000).stage,'third');assert.equal(at(74000).final,true);assert.equal(m.official.find(r=>r.id===m.specialDsq.id).points,0);}
  for(const ms of [0,5000,15000,25000,35000,40000,50000,75000]){const a=at(ms);at(ms+9999);assert.deepEqual(at(ms),a);results.push({seed,ms,...a});}assert.equal(JSON.stringify(m),before);
 }
 const comeback=s.forBroadcast(s.simulateMeetingV9('9ru-2')),launch=comeback.ultimates[0];assert.equal(launch.rankBefore,8);assert.equal(comeback.official[0].id,launch.id);const hyperCase=s.simulateMeetingV9('9ru-7');assert.ok(hyperCase.ultimates.some(a=>a.type==='hyper'));const lower=s.simulateMeetingV9('9ru-0'),lowerActivation=lower.ultimates.find(a=>a.id==='r1');assert.ok([6,7].includes(lowerActivation.rankBefore));assert.ok([2,3].includes(lower.official.find(r=>r.id==='r1').position));assert.equal(s.cameraAt(comeback,comeback.raceStartMs+launch.startTick*250+1250,null).racerId,launch.id,'broadcast catches lower-rank launch rather than only the eventual overtake');
 const p=x.defaultProfile('r1','노바 렌');assert.deepEqual(x.validateProfiles([p]),[p]);
 for(const image of ['javascript:alert(1)','data:image/svg+xml,foo','http://example.com/a.png','https://user:secret@example.com/a.png'])assert.throws(()=>x.validateProfiles([{...p,image}]));
 assert.throws(()=>x.validateProfiles([p,p]));assert.throws(()=>x.validateProfiles([{...p,description:'x'.repeat(1601)}]));assert.throws(()=>x.validateProfiles([{...p,name:''}]));
 const future=x.defaultProfile('racer_2027','추가 선수');assert.equal(x.validateProfiles([p,future]).length,2);assert.equal(x.validateProfiles([{...p,description:'<script>alert(1)</script>'}])[0].description,'<script>alert(1)</script>','render as text, never HTML');
 assert.ok(x.readProfiles({getItem:()=>'{invalid'}).error);assert.ok(x.readProfiles({getItem:()=>{throw Error('disabled')}}).error);
 const report={status:'PASS',frozenV9Payloads:20,profileValidation:true,ceremonyDisclosureAndSeek:results};await writeFile('out/racing-final-contract.json',JSON.stringify(report,null,2));console.log('PASS final: 20 unchanged v9 official payloads, profiles validation/storage, podium entries, sealed DSQ, seek');
}finally{await s.dispose();await l.dispose();}
