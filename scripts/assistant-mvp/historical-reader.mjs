import {mkdtemp,rm,symlink,writeFile,readFile,lstat} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {HISTORICAL} from './live-revision.mjs';
import {hash,fail,privateDirectory,readBudget} from '../assistant-eval/budget.mjs';
const exec=promisify(execFile);
// Use the official frozen inspector with its matching 0018 schema/validator.
// No Worker starts, no D1 migrations, and no copy of the private DB is made.
export async function historicalReader(){
  const root=process.cwd(),directory=await mkdtemp(join(tmpdir(),'holocron-history-reader-'));
  try{
    await exec('git',['archive',HISTORICAL,'--output='+join(directory,'source.tar')],{cwd:root});
    await exec('tar',['-xf','source.tar'],{cwd:directory});
    await rm(join(directory,'source.tar'));
    await symlink(resolve('node_modules'),join(directory,'node_modules'),'dir');
    await writeFile(join(directory,'read-history.mjs'),`
      import {readFile} from 'node:fs/promises';
      import {inspectPrior} from './scripts/assistant-mvp/prior.mjs';
      import {inspectLocal} from './scripts/assistant-eval/inspect-local.mjs';
      const corpus=JSON.parse(await readFile('evaluation/assistant/public-archive.json','utf8'));
      try {
        const result=process.argv[2]==='audit'?await inspectPrior(process.argv[3],corpus):await inspectLocal(process.argv[3],corpus.capturedAt);
        console.log(JSON.stringify(process.argv[2]==='audit'?result:{localDigest:result.digest,unsettled:result.unsettled}));
      } catch { console.log(JSON.stringify({error:'HISTORICAL_AUDIT_FAILED'}));process.exitCode=1; }
    `);
    async function call(mode,path){
      let stdout;try{({stdout}=await exec(process.execPath,['--import','./scripts/sites-env.mjs','read-history.mjs',mode,path],{cwd:directory,timeout:60000,maxBuffer:65536,env:{...process.env,HOLOCRON_EVAL_OPENAI_API_KEY:'',OPENAI_API_KEY:''}}));}
      catch{fail('HISTORICAL_AUDIT_FAILED');}
      try{return JSON.parse(stdout);}catch{fail('HISTORICAL_AUDIT_FAILED');}
    }
    return {audit:path=>call('audit',path),local:path=>call('local',path),close:()=>rm(directory,{recursive:true,force:true})};
  }catch{await rm(directory,{recursive:true,force:true});fail('PINNED_HISTORY_READER_UNAVAILABLE');}
}
export async function readPrivateJson(path){
  await privateDirectory(dirname(path),{existing:true});const s=await lstat(path);
  if(!s.isFile()||s.isSymbolicLink()||s.size>65536||(s.mode&0o077))fail('PRIVATE_FILE_REQUIRED');
  const raw=await readFile(path,'utf8');try{return {value:JSON.parse(raw),hash:hash(raw)};}catch{fail('INVALID_PRIVATE_JSON');}
}
export function priorBinding(report){
  if(report.status!=='PRIOR_AUDIT_PASS_LIVE_BLOCKED'||!report.expired||report.prior?.attempts!==3||report.prior.reservedMicros!==86400||report.prior.usageEstimateMicros!==13083||report.prior.ledgerEntries!==7)fail('PRIOR_STATE_DIFFERS_STOP');
  return {approvalFileHash:report.approvalFileHash,journalTip:report.journalTip,localDigest:report.localDigest,expiresAt:report.expiresAt,...report.prior};
}
// Repeat the immutable bindings while holding the original coordinator lease.
export async function recheckPrior(path,binding,reader){
  const a=await readPrivateJson(path),journal=await readBudget(a.value.stateDir,a.value),local=await reader.local(a.value.stateDir);
  if(a.hash!==binding.approvalFileHash||journal.tip!==binding.journalTip||local.localDigest!==binding.localDigest||local.unsettled)fail('PRIOR_STATE_CHANGED');
  return a.value;
}
