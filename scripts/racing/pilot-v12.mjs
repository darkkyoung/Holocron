import {mkdir,writeFile} from 'node:fs/promises';
import {loadV12} from './load-v12.mjs';
import {auditV12} from './audit-v12.mjs';
const s=await loadV12(),count=Number(process.argv[2]??2000),reports=[];
const candidates=[
 {name:'A',jumpFraction:[.20,.25],afterburnPower:[2500,3000],afterburnSeconds:4},
 {name:'B',jumpFraction:[.20,.30],afterburnPower:[2500,3000],afterburnSeconds:5},
 {name:'C',jumpFraction:[.25,.30],afterburnPower:[2750,3250],afterburnSeconds:5},
];
try{await mkdir('out',{recursive:true});for(const c of candidates){const {name,...params}=c;const policy={...s.PHANTOM_POLICY,...params};const r=auditV12(s,count,'12pilot-',policy,(n,k)=>console.log(`${name} ${n}/${k}`));reports.push({name,...r});console.log(JSON.stringify({name,hyper:r.byType.hyper.conditional,gold:r.byType.gold.conditional,safety:r.hyper,errors:r.errors}));await writeFile('out/racing-v12-pilot.json',JSON.stringify(reports,null,2)+'\n');}}finally{await s.dispose();}
