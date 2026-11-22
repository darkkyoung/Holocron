// Pass an extracted isolated-latency JSON from each run. Verify every stored
// nearest-rank percentile from its own 105 raw races before printing the table.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
if(process.argv.length<3) throw Error('Pass one or more extracted 3c-latency.json files');
for(const file of process.argv.slice(2)) {
  const data=JSON.parse(await readFile(file,'utf8'));
  assert.equal(data.sample,105);
  for(const [reader,rows] of Object.entries(data.report)) {
    assert.equal(rows.length,data.sample);
    for(const [metric,stored] of Object.entries(data.summary[reader])) {
      const sorted=rows.map(row=>row[metric]).sort((a,b)=>a-b);
      assert(sorted.every(Number.isFinite));
      for(const p of [50,95,99]) assert.equal(stored['p'+p],Math.round(sorted[Math.ceil(p*rows.length/100)-1]));
    }
  }
  console.log(file,JSON.stringify(data.summary));
}
