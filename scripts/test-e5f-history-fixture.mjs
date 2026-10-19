// Synthetic histories only; no owner private input. Historical code is unmodified.
import {mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {syntheticHistory as olderHistory} from './test-e5d-history-fixture.mjs';
const exec=promisify(execFile);
export async function syntheticHistory(root){
 const path=await olderHistory(root),source=join(root,'frozen-e5d');await mkdir(source);
 await exec('git',['archive','23633635fba075d148f72662a6909a1b81b63b28','--output='+join(root,'e5d.tar')]);await exec('tar',['-xf',join(root,'e5d.tar'),'-C',source]);await rm(join(root,'e5d.tar'));await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 await writeFile(join(source,'fixture.mjs'),`
 import {inspect,authorize} from './scripts/assistant-e5d/state.mjs';
 import {execute} from './scripts/assistant-e5d/execute.mjs';
 import {run} from './scripts/assistant-e5d/cli.mjs';
 import {mockResponse} from './scripts/assistant-eval/transport.mjs';
 import {writeFile} from 'node:fs/promises';import {join} from 'node:path';
 const path=process.argv[2],root=process.argv[3];globalThis.fetch=()=>{throw Error('NO_NETWORK');};
 const p=await inspect(path);await authorize(path,p.planToken,'AUTHORIZE_E5D_TWO_CASES');let n=0;
 const r=await execute(path,'E5D-P41',{key:'SYNTHETIC',transport:async(_u,i)=>{n++;const v=await mockResponse(JSON.parse(i.body)).json();v.usage={input_tokens:1000,output_tokens:298};return Response.json(v);}});
 if(n!==1||r.result.actualMicros!==2091||r.status!=='PROGRAM_PASS_OWNER_REVIEW_REQUIRED')throw Error('SYNTHETIC_HISTORY_FAILED');
 const sp=join(root,'historical-scores.json');await writeFile(sp,JSON.stringify({scores:[2,2,1,1,2,2,'NOT_REVIEWED','NOT_REVIEWED',2],critical:false}),{mode:0o600});
 const scored=await run(['score','--prior',path,'--case','E5D-P41','--scores',sp,'--confirm','RECORD_OWNER_REVIEW_AND_DELETE'],{});
 if(scored.verdict!=='OWNER_NOT_PASS')throw Error('SYNTHETIC_HISTORY_FAILED');
 // The reported repeat-score error changes no receipt or consumed amount.
 try{await run(['score','--prior',path,'--case','E5D-P41','--scores',sp,'--confirm','RECORD_OWNER_REVIEW_AND_DELETE'],{});throw Error('REPEAT_SCORE_ALLOWED');}catch(e){if(e.code!=='ENOENT')throw e;}
 console.log('SYNTHETIC_E5D_READY');`);
 const gitDir=(await exec('git',['rev-parse','--absolute-git-dir'])).stdout.trim();
 await exec(process.execPath,['--import','./scripts/sites-env.mjs','fixture.mjs',path,root],{cwd:source,env:{PATH:process.env.PATH,HOME:process.env.HOME,GIT_DIR:gitDir},timeout:240000,maxBuffer:65536});
 return path;
}
