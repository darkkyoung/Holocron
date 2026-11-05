import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadV12} from './load-v12.mjs';
import {auditV12} from './audit-v12.mjs';
const count=Number(process.argv[2]??40000),prefix=process.argv[3]??'12verify-',path=process.argv[4]??'out/racing-v12-balance.json';
if(!Number.isInteger(count)||count<1||count>100000||!/^12(?:pilot|final|verify)-$/.test(prefix))throw Error('INVALID_BATCH');
const s=await loadV12();try{const report=auditV12(s,count,prefix,s.PHANTOM_POLICY,(n,k)=>console.log(`${n}/${k}`));report.acceptanceSample=count>=40000&&prefix==='12verify-';await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(Object.values(report.errors).some(n=>n)||report.hyper.oneLapLeadActivations||report.hyper.maxConservativeExtraCm>=360000)throw Error('INTEGRITY_FAILURE');}finally{await s.dispose();}
