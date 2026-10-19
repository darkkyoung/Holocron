// Synthetic test-only histories. Never accepts or reads the owner's private paths.
import {mkdir,readFile,writeFile,symlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export async function syntheticHistory(root){
 const source=join(root,'frozen-e5b');await mkdir(source);
 await exec('git',['archive','be6965ab058291b107b5767201e400386829e5c7','--output='+join(root,'source.tar')]);await exec('tar',['-xf',join(root,'source.tar'),'-C',source]);await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 const old=await readFile(join(source,'scripts/test-assistant-mvp-handoff.mjs'),'utf8');
 const helper=old.slice(old.indexOf('async function makeHistory()'),old.indexOf('let manifestBytes;'));
 const fixture=`import {join,resolve} from 'node:path';import {readFile,writeFile,symlink} from 'node:fs/promises';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
 import {HISTORICAL} from './scripts/assistant-mvp/live-revision.mjs';import {inspectHandoff,authorizeHandoff} from './scripts/assistant-mvp/handoff.mjs';import {smoke} from './scripts/assistant-mvp/live-smoke.mjs';import {mockResponse} from './scripts/assistant-eval/transport.mjs';
 const root=process.argv[2],exec=promisify(execFile);${helper}
 const path=await makeHistory(),plan=await inspectHandoff(path);await authorizeHandoff(path,plan.planToken,'AUTHORIZE_P41_P44_ONCE');let n=0;
 globalThis.fetch=()=>{throw Error('NO_NETWORK');};
 const report=await smoke(path,{key:'SYNTHETIC',transport:async(_u,init)=>{const response=await mockResponse(JSON.parse(init.body)).json();n++;response.usage={input_tokens:1000,output_tokens:n===1?200:870};if(n===2){const value=JSON.parse(response.output[0].content[0].text);value.caveats=[{text:'공식 확인되지 않았다.',evidenceIds:value.facts[0].evidenceIds}];response.output[0].content[0].text=JSON.stringify(value);}return Response.json(response);}});
 if(n!==2||report.results[0].code!=='OK'||report.results[1].diagnostic?.reason!=='OFFICIAL_PROMOTION'||report.results[1].code!=='INVALID_OUTPUT')throw Error('SYNTHETIC_HISTORY_FAILED');
 console.log('SYNTHETIC_HISTORY_READY');`;
 await writeFile(join(source,'fixture.mjs'),fixture);
 const gitDir=(await exec('git',['rev-parse','--absolute-git-dir'])).stdout.trim();
 const env={PATH:process.env.PATH,HOME:process.env.HOME,GIT_DIR:gitDir};
 await exec(process.execPath,['--import','./scripts/sites-env.mjs','fixture.mjs',root],{cwd:source,env,timeout:180000,maxBuffer:65536});
 return join(root,'approval.json');
}
