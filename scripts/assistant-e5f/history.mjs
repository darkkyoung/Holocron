import {mkdtemp,rm,symlink,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fail} from '../assistant-eval/budget.mjs';
export const E5D='23633635fba075d148f72662a6909a1b81b63b28';
const exec=promisify(execFile);
export async function historyReader(){
 const root=process.cwd(),dir=await mkdtemp(join(tmpdir(),'holocron-e5f-history-'));
 try{
  await exec('git',['archive',E5D,'--output='+join(dir,'source.tar')]);await exec('tar',['-xf','source.tar'],{cwd:dir});await rm(join(dir,'source.tar'));
  await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');
  await copyFile(join(root,'scripts/assistant-e5f/history-worker.mjs'),join(dir,'history-worker.mjs'));
  const {stdout:gitDir}=await exec('git',['rev-parse','--absolute-git-dir']);
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','SystemRoot'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  env.GIT_DIR=gitDir.trim();
  return {async read(path,mode='audit'){
   try{const {stdout}=await exec(process.execPath,['--import','./scripts/sites-env.mjs','history-worker.mjs',mode,path],{cwd:dir,env,timeout:120000,maxBuffer:65536});const r=JSON.parse(stdout);if(r.error)fail('HISTORY_AUDIT_FAILED');return r;}catch{fail('HISTORY_AUDIT_FAILED');}
  },close:()=>rm(dir,{recursive:true,force:true})};
 }catch{await rm(dir,{recursive:true,force:true});fail('PINNED_HISTORY_UNAVAILABLE');}
}
