import {loadV14} from './load-v14.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const s=await loadV14();try{
 const cases={},details={};const wanted=['goldWin','hyperWin','hyperLoss','none','double','overlap','hyperGold','safetyCancel','leaderDnf','specialDsq'];
 for(let i=0;i<15000&&wanted.some(k=>!cases[k]);i++){
  const m=s.simulateMeetingV14(`14case-${i}`,true),a=m.ultimates,win=m.official[0],has=t=>a.some(x=>x.type===t);
  const flags={goldWin:has('gold')&&a.some(x=>x.type==='gold'&&x.id===win.id),hyperWin:has('hyper')&&a.some(x=>x.type==='hyper'&&x.id===win.id),hyperLoss:has('hyper')&&a.some(x=>x.type==='hyper'&&x.id!==win.id),none:!a.length,double:a.length===2,overlap:a.length===2&&a[0].endTick>a[1].startTick,hyperGold:a.length===2&&a[0].type==='hyper'&&a[1].type==='gold'&&win.id===a[1].id&&m.race.events.some(e=>e.kind==='LEAD'&&e.racerId===a[0].id&&e.tick>=a[0].startTick),safetyCancel:m.wormholes.some(x=>x.cancelled&&x.jumpTick===null),leaderDnf:m.race.events.some(e=>e.kind==='DNF'&&m.race.frames[Math.min(m.race.frames.length-1,Math.max(0,e.tick-1))].racers.find(x=>x.id===e.racerId)?.rank===1),specialDsq:!!m.specialDsq};
  for(const k of wanted)if(flags[k]&&!cases[k]){cases[k]=m.race.seed;details[k]={seed:m.race.seed,ultimates:a.map(x=>({id:x.id,type:x.type,startTick:x.startTick,rankBefore:x.rankBefore,final:m.official.find(r=>r.id===x.id)?.position})),winner:win.id};console.log(k,cases[k]);}
 }
 await mkdir('out',{recursive:true});await writeFile('out/racing-v14-cases.json',JSON.stringify({cases,details},null,2));if(wanted.some(k=>!cases[k]))console.log('missing',wanted.filter(k=>!cases[k]));
}finally{await s.dispose();}
