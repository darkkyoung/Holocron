import {isAbsolute,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inspect,authorize,context,grantFor,checkpoint,recheck} from './state.mjs';
import {DIRECTORY,internal,ID} from './revision.mjs';
import {execute} from './execute.mjs';
import {list,readOutput,render,score,remove} from './review.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {acquireBudgetLock,readBudget,fail} from '../assistant-eval/budget.mjs';
export function parse(args){
 const [command,...rest]=args,o={command};
 const fields={inspect:['--prior'],authorize:['--prior','--plan','--confirm'],run:['--prior','--case','--confirm'],list:['--prior'],view:['--prior','--case','--confirm'],score:['--prior','--case','--scores','--confirm'],delete:['--prior','--case','--confirm']}[command];
 if(!fields||rest.length!==fields.length*2)fail('INVALID_ARGUMENTS');
 while(rest.length){const k=rest.shift(),v=rest.shift();if(!fields.includes(k)||Object.hasOwn(o,k)||!v||v.startsWith('--'))fail('INVALID_ARGUMENTS');o[k]=v;}
 if(fields.some(k=>!o[k])||!isAbsolute(o['--prior'])||o['--scores']&&!isAbsolute(o['--scores']))fail('INVALID_ARGUMENTS');if(o['--case'])internal(o['--case']);return o;
}
export async function run(args=process.argv.slice(2),environment=process.env){
 const o=parse(args),path=o['--prior'],id=o['--case'];
 if(o.command==='inspect')return inspect(path);
 if(o.command==='authorize')return authorize(path,o['--plan'],o['--confirm']);
 if(o.command==='run'){
  if(o['--confirm']!=='EXECUTE_'+id.replaceAll('-','_')+'_ONCE')fail('EXPLICIT_EXECUTION_REQUIRED');
  return execute(path,id,{key:environment.HOLOCRON_EVAL_OPENAI_API_KEY});
 }
 if(o.command==='score'){
  if(o['--confirm']!=='RECORD_OWNER_REVIEW_AND_DELETE')fail('EXPLICIT_REVIEW_REQUIRED');
  const x=await context(path);let lock;
  try{lock=await acquireBudgetLock(x.approval.stateDir);await recheck(x);const g=await grantFor(x),checked=await checkpoint(x,g),res=checked.journal.records.filter(r=>r.type==='reserve'),fin=checked.journal.records.filter(r=>r.type==='finish');
   if(!res.some((r,i)=>r.caseId===internal(id)&&fin[i]?.code==='OK'))fail('PROGRAM_PASS_REQUIRED');
   return await score(x.directory,g,id,(await readPrivateJson(o['--scores'])).value);
  }finally{await lock?.close();await x.reader.close();}
 }
 // Body access/deletion remains available after expiry/source changes. No worker,
 // initialization, original writes, or key access. Fixed directory, no path override.
 const a=await readPrivateJson(path),directory=join(a.value.stateDir,DIRECTORY),lock=await acquireBudgetLock(a.value.stateDir);
 try{
  const g=(await readPrivateJson(join(directory,'authorization.json'))).value;
  if(g.version!==ID||g.directory!==directory||g.history?.e3.approvalFileHash!==a.hash)fail('E5H_CONFIGURATION_CONFLICT');await readBudget(directory,g);
  if(o.command==='list')return {review:await list(directory,g)};
  if(o.command==='delete')return remove(directory,g,id,o['--confirm']);
  if(o['--confirm']!=='SHOW_PRIVATE_RESULT'||!process.stdout.isTTY||!process.stdin.isTTY||environment.CI)fail('LOCAL_TERMINAL_ONLY');
  process.stdout.write(render(await readOutput(directory,g,id))+'\n');return {status:'LOCAL_PRIVATE_VIEW_ONLY',caseId:id};
 }finally{await lock.close();}
}
const CODES=new Set(['REVIEW_ALREADY_RECORDED','INVALID_ARGUMENTS','CASE_NOT_AUTHORIZED','EXPLICIT_AUTHORIZATION_REQUIRED','EXPLICIT_EXECUTION_REQUIRED','EXPLICIT_REVIEW_REQUIRED','EXPLICIT_DELETE_REQUIRED','LOCAL_TERMINAL_ONLY','HISTORY_AUDIT_FAILED','PINNED_HISTORY_UNAVAILABLE','HISTORY_MISMATCH','HISTORY_CHANGED','E5H_INTEGRITY_FAILED','MODEL_PROFILE_MISMATCH','E5H_CONFIGURATION_CONFLICT','PLAN_CHANGED','INCOMPLETE_OR_CHANGED_LOCAL_STATE','HANDOFF_APPROVAL_EXPIRED','EVALUATION_LOCKED','CASE_ALREADY_STARTED','UNEXPECTED_REVIEW_STATE','DEDICATED_EVALUATION_KEY_REQUIRED','JOURNAL_TIP_CHANGED','GLOBAL_BUDGET_STOP','EVALUATION_BUDGET_STOP','EVALUATION_POLICY_CHANGED','UNSETTLED_LOCAL_ADMISSIONS','REVIEW_NOT_STORED','REVIEW_INTEGRITY_FAILED','REVIEW_EXPIRED','INVALID_REVIEW_SCORES','PROGRAM_PASS_REQUIRED','PRIVATE_FILE_REQUIRED','INVALID_HANDOFF_JOURNAL','INVALID_BUDGET_JOURNAL','BUDGET_CONFIGURATION_CONFLICT']);
export const safeFailure=e=>({status:'BLOCKED',code:CODES.has(e?.message)?e.message:e?.code==='ENOENT'?'REQUIRED_PRIVATE_STATE_MISSING':'E5H_STOP',next:'STOP_PRESERVE_HISTORY_NO_RETRY'});
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const r=await run();console.log(JSON.stringify(r,null,2));if(r.status?.startsWith('STOP'))process.exitCode=1;}catch(e){console.error(JSON.stringify(safeFailure(e)));process.exitCode=1;}}
