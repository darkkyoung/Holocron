import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadV14} from './load-v14.mjs';
import {auditV14} from './audit-v14.mjs';
const count=Number(process.argv[2]??40000),prefix=process.argv[3]??'14holdout-',path=process.argv[4]??'out/racing-v14-balance.json';
if(!Number.isInteger(count)||count<1||count>100000||!/^14(?:pilot|holdout|laps)-$/.test(prefix))throw Error('INVALID_BATCH');
const laps=Number(process.argv[5]??10);const s=await loadV14();try{const report=auditV14(s,count,prefix,s.PHANTOM_POLICY,(n,k)=>console.log(`${n}/${k}`),laps);report.acceptanceSample=count>=40000&&prefix==='14holdout-';await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(Object.values(report.errors).some(n=>n)||report.hyper.oneLapLeadActivations||report.hyper.maxConservativeExtraCm>=360000)throw Error('INTEGRITY_FAILURE');}finally{await s.dispose();}
