// Synthetic disposable histories only. All paid boundaries replaced with mocks.
import {mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {syntheticHistory as olderHistory} from './test-e5h-history-fixture.mjs';
const exec=promisify(execFile);
export async function syntheticHistory(root){
 const path=await olderHistory(root),source=join(root,'frozen-e5h');await mkdir(source);
 await exec('git',['archive','6fc7ac7b4ebbbd111ddcc16775fe0d1343501b0a','--output='+join(root,'e5h.tar')]);await exec('tar',['-xf',join(root,'e5h.tar'),'-C',source]);await rm(join(root,'e5h.tar'));await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 await writeFile(join(source,'fixture.mjs'),`
 import {inspect,authorize} from './scripts/assistant-e5h/state.mjs';
 import {execute} from './scripts/assistant-e5h/execute.mjs';
 import {mockResponse} from './scripts/assistant-eval/transport.mjs';
 const path=process.argv[2];globalThis.fetch=()=>{throw Error('NO_NETWORK');};
 const p=await inspect(path);await authorize(path,p.planToken,'AUTHORIZE_E5H_P44_ONCE');let calls=0;
 const result=await execute(path,'E5H-P44',{key:'SYNTHETIC',transport:async(_u,i)=>{
  calls++;const v=await mockResponse(JSON.parse(i.body)).json(),o=JSON.parse(v.output[0].content[0].text);
  v.usage={input_tokens:1604,output_tokens:714};
  o.caveats=[{text:'선택된 제목과 요약의 범위를 확인하세요.',evidenceIds:o.facts[0].evidenceIds},{text:'디즈니가 가격 인상을 공식 발표했다.',evidenceIds:o.facts[0].evidenceIds}];
  v.output[0].content[0].text=JSON.stringify(o);return Response.json(v);
 }});
 if(calls!==1||result.result.code!=='INVALID_OUTPUT'||result.result.actualMicros!==4416||result.result.diagnostic?.reason!=='OFFICIAL_PROMOTION'||result.result.diagnostic?.path!=='$.caveats[1].text'||result.result.refund?.applied!==7||result.result.settlement!=='failed')throw Error('SYNTHETIC_HISTORY_FAILED');
 console.log('SYNTHETIC_E5H_READY');`);
 const gitDir=(await exec('git',['rev-parse','--absolute-git-dir'])).stdout.trim();
 await exec(process.execPath,['--import','./scripts/sites-env.mjs','fixture.mjs',path,root],{cwd:source,env:{PATH:process.env.PATH,HOME:process.env.HOME,GIT_DIR:gitDir},timeout:360000,maxBuffer:65536});
 return path;
}
