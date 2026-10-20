// Synthetic disposable histories only. All paid boundaries replaced with mocks.
import {mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {syntheticHistory as olderHistory} from './test-e5f-history-fixture.mjs';
const exec=promisify(execFile);
export async function syntheticHistory(root){
 const path=await olderHistory(root),source=join(root,'frozen-e5f');await mkdir(source);
 await exec('git',['archive','1512d95de440db812c4b051dcc9a7372f2333ccc','--output='+join(root,'e5f.tar')]);await exec('tar',['-xf',join(root,'e5f.tar'),'-C',source]);await rm(join(root,'e5f.tar'));await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 await writeFile(join(source,'fixture.mjs'),`
 import {inspect,authorize} from './scripts/assistant-e5f/state.mjs';
 import {execute} from './scripts/assistant-e5f/execute.mjs';
 import {run} from './scripts/assistant-e5f/cli.mjs';
 import {mockResponse} from './scripts/assistant-eval/transport.mjs';
 import {writeFile} from 'node:fs/promises';import {join} from 'node:path';
 const path=process.argv[2],root=process.argv[3];globalThis.fetch=()=>{throw Error('NO_NETWORK');};
 const p=await inspect(path);await authorize(path,p.planToken,'AUTHORIZE_E5F_TWO_CASES');let calls=0;
 const transport=async(_u,i)=>{calls++;const v=await mockResponse(JSON.parse(i.body)).json();
  v.usage=calls===1?{input_tokens:1005,output_tokens:340}:{input_tokens:1630,output_tokens:654};
  if(calls===2){const o=JSON.parse(v.output[0].content[0].text);o.caveats=[{text:'기사 요약만으로는 별도의 공식 발표 여부를 판단할 수 없다.',evidenceIds:o.facts[0].evidenceIds}];v.output[0].content[0].text=JSON.stringify(o);}
  return Response.json(v);
 };
 const a=await execute(path,'E5F-P41',{key:'SYNTHETIC',transport});
 if(a.result.actualMicros!==2284||a.status!=='PROGRAM_PASS_OWNER_REVIEW_REQUIRED')throw Error('SYNTHETIC_HISTORY_FAILED');
 const sp=join(root,'e5f-owner-scores.json');await writeFile(sp,JSON.stringify({scores:[2,2,2,2,2,2,'NOT_REVIEWED','NOT_REVIEWED',2],critical:false}),{mode:0o600});
 const scored=await run(['score','--prior',path,'--case','E5F-P41','--scores',sp,'--confirm','RECORD_OWNER_REVIEW_AND_DELETE'],{});
 if(scored.verdict!=='OWNER_PASS')throw Error('SYNTHETIC_HISTORY_FAILED');
 const b=await execute(path,'E5F-P44',{key:'SYNTHETIC',transport});
 if(calls!==2||b.result.code!=='INVALID_OUTPUT'||b.result.actualMicros!==4166||b.result.diagnostic?.reason!=='OFFICIAL_PROMOTION'||b.result.refund?.applied!==7)throw Error('SYNTHETIC_HISTORY_FAILED');
 console.log('SYNTHETIC_E5F_READY');`);
 const gitDir=(await exec('git',['rev-parse','--absolute-git-dir'])).stdout.trim();
 await exec(process.execPath,['--import','./scripts/sites-env.mjs','fixture.mjs',path,root],{cwd:source,env:{PATH:process.env.PATH,HOME:process.env.HOME,GIT_DIR:gitDir},timeout:360000,maxBuffer:65536});
 return path;
}
