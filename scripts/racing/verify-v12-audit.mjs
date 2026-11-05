import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const bytes=await readFile('out/racing-v12-balance.json'),r=JSON.parse(bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'8d88e9bc5afc20d380a3a35f750744d36e939a97ff2322a0b4ac9f7b54ed2080');
assert.equal(r.count,40000);assert.equal(r.prefix,'12final-');assert.equal(r.version,'galactic-racing-0.12.0');assert.equal(r.acceptanceSample,true);
assert.ok(Object.values(r.errors).every(x=>x===0));assert.equal(r.hyper.oneLapLeadActivations,0);assert.ok(r.hyper.maxConservativeExtraCm<360000);
assert.ok(r.byType.hyper.conditional.winWilson95[0]>=70);assert.ok(r.byType.hyper.conditional.winPercent>r.byType.gold.conditional.winPercent);
console.log('PASS independent 40000-Seed v12 audit identity and acceptance');
