import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const bytes=await readFile('out/racing-v12-balance.json'),r=JSON.parse(bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'110b24075b9c91374c972a4076ca665f331906a9e650e372c80c525a83b48008');
assert.equal(r.count,40000);assert.equal(r.prefix,'12verify-');assert.equal(r.version,'galactic-racing-0.12.0');assert.equal(r.acceptanceSample,true);
assert.ok(Object.values(r.errors).every(x=>x===0));assert.equal(r.hyper.oneLapLeadActivations,0);assert.ok(r.hyper.maxConservativeExtraCm<360000);
assert.equal(r.policy.maxLiveLeadFraction,.85);assert.ok(r.byType.hyper.conditional.winWilson95[0]>=70);assert.ok(r.byType.hyper.conditional.winPercent>r.byType.gold.conditional.winPercent);
console.log('PASS independent 40000-Seed v12 audit identity and acceptance');
