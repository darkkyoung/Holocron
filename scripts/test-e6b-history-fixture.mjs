// Disposable synthetic history only; builds exact pinned E.5J with mock transport.
import {mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {syntheticHistory as olderHistory} from './test-e5j-history-fixture.mjs';
const exec=promisify(execFile);
export async function syntheticHistory(root){
 const path=await olderHistory(root),source=join(root,'frozen-e5j');await mkdir(source);
 await exec('git',['archive','36797d08aab875b709b1a746ba1c48a2e11730a6','--output='+join(root,'e5j.tar')]);await exec('tar',['-xf',join(root,'e5j.tar'),'-C',source]);await rm(join(root,'e5j.tar'));await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 await writeFile(join(source,'fixture.mjs'),`
 import * as actual from './scripts/assistant-e5j/state.mjs';
 import {createState} from './scripts/assistant-e5h/state.mjs';
 import {createExecute} from './scripts/assistant-e5h/execute.mjs';
 import * as fixed from './scripts/assistant-e5j/revision.mjs';
 import * as review from './scripts/assistant-e5j/review.mjs';
 import {mockResponse} from './scripts/assistant-eval/transport.mjs';
 import {readFile} from 'node:fs/promises';
 import {join} from 'node:path';
 const path=process.argv[2];globalThis.fetch=()=>{throw Error('NO_NETWORK');};
 const audited=await actual.context(path);
 try{
 const state=createState({...fixed,historyReader:async()=>({read:p=>audited.reader.read(p,'recheck'),async close(){}}),prior:{attempts:9,reservedMicros:244800,usageEstimateMicros:32355},approvalPrefix:'eval-e5j-',conflictCode:'E5J_CONFIGURATION_CONFLICT',authorizeConfirmation:'AUTHORIZE_E5J_P44_ONCE',review:async()=>review});
 const execute=createExecute({...state,...fixed,...review,conflictCode:'E5J_CONFIGURATION_CONFLICT',integrityCode:'E5J_INTEGRITY_FAILED'});
 const p=await state.inspect(path);await state.authorize(path,p.planToken,'AUTHORIZE_E5J_P44_ONCE');let calls=0;
 const r=await execute(path,'E5J-P44',{key:'SYNTHETIC',transport:async(_u,i)=>{calls++;const v=await mockResponse(JSON.parse(i.body)).json(),o=JSON.parse(v.output[0].content[0].text);v.usage={input_tokens:2001,output_tokens:438};o.caveats=[];o.outline=['도입','본론','마무리'].map(heading=>({heading,factIds:['f1'],creativeNote:'구성 제안: 핵심 소식을 소개한다.'}));v.output[0].content[0].text=JSON.stringify(o);return Response.json(v);}});
 if(calls!==1||r.result.code!=='OK'||r.result.actualMicros!==3472||r.result.charged!==7||r.result.refund!==null||r.result.settlement!=='completed')throw Error('SYNTHETIC_HISTORY_FAILED');
 const g=JSON.parse(await readFile(join(p.stateDir,'authorization.json')));await review.score(p.stateDir,g,'E5J-P44',{scores:Array(9).fill(2),critical:false});
 console.log('SYNTHETIC_E5J_READY');
 }finally{await audited.reader.close();}`);
 const gitDir=(await exec('git',['rev-parse','--absolute-git-dir'])).stdout.trim();
 await exec(process.execPath,['--import','./scripts/sites-env.mjs','fixture.mjs',path],{cwd:source,env:{PATH:process.env.PATH,HOME:process.env.HOME,GIT_DIR:gitDir},timeout:600000,maxBuffer:65536});
 return path;
}
