// Each subprocess creates a fresh sealed race and independent temporary storage.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const samples=[];
for(let i=0;i<5;i++) {
  const args=['--import','./scripts/sites-env.mjs','scripts/racing/preview-phase3c.mjs','--smoke'];
  if(process.argv.includes('--browser')) args.push('--render-timing');
  execFileSync(process.execPath,args,{stdio:'inherit',timeout:120000});
  samples.push(JSON.parse(await readFile('out/3e-timeline.json','utf8')));
}
const summary={};
for(const key of Object.keys(samples[0])) {
  const values=samples.map(s=>s[key]).sort((a,b)=>a-b);
  summary[key]=Object.fromEntries([50,95,99].map(p=>['p'+p,values[Math.ceil(p*values.length/100)-1]]));
}
await writeFile('out/3e-start.json',JSON.stringify({epoch:'simulated 21:00 KST; 500 ms loopback timer; first observed HTTP RACE body; optional main frame observation',samples,summary},null,2));
