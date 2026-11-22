// Linux counters for the local Miniflare child, shared by both test isolates.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
const proc=pid=>readFileSync('/proc/'+pid+'/stat','utf8');
export function workerdCounters() {
  const children=readdirSync('/proc').filter(name=>/^\d+$/.test(name)).filter(pid=>{
    try {return proc(pid).split(' (workerd) ')[1]?.split(' ')[1]===String(process.pid);} catch{return false;}
  });
  assert.equal(children.length,1,'Expected one workerd child of this fixture');
  const pid=children[0],hz=Number(execFileSync('getconf',['CLK_TCK'],{encoding:'utf8'}));
  return ()=>{
    const fields=proc(pid).split(') ')[1].split(' ');
    const status=readFileSync('/proc/'+pid+'/status','utf8');
    return {cpuMs:(Number(fields[11])+Number(fields[12]))*1000/hz,
      rssKiB:Number(/^VmRSS:\s+(\d+)/m.exec(status)[1]),processHighWaterKiB:Number(/^VmHWM:\s+(\d+)/m.exec(status)[1])};
  };
}
export async function measureOperation(read,operation){
  const before=read(),at=performance.now();
  const result=await operation();
  const wallMs=performance.now()-at,after=read();
  return {result,metrics:{wallMs,cpuMs:after.cpuMs-before.cpuMs,rssBeforeKiB:before.rssKiB,rssAfterKiB:after.rssKiB,processHighWaterKiB:after.processHighWaterKiB}};
}
