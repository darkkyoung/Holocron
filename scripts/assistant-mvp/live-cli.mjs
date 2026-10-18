import {join,isAbsolute} from 'node:path';
import {inspectHandoff,authorizeHandoff,HANDOFF} from './handoff.mjs';
import {smoke} from './live-smoke.mjs';
import {readPrivateJson} from './historical-reader.mjs';
import {deleteReviewed} from './review-output.mjs';
import {acquireBudgetLock,fail} from '../assistant-eval/budget.mjs';
// Explicit codes only: an uppercase arbitrary exception is still private data.
const CODES=new Set(['INVALID_ARGUMENTS','EXPLICIT_LOCAL_AUTHORIZATION_REQUIRED','EXPLICIT_LIVE_EXECUTION_REQUIRED','DEDICATED_EVALUATION_KEY_REQUIRED',
  'HISTORICAL_AUDIT_FAILED','PINNED_HISTORY_READER_UNAVAILABLE','PRIVATE_FILE_REQUIRED','INVALID_PRIVATE_JSON','PRIOR_STATE_DIFFERS_STOP','PRIOR_STATE_CHANGED',
  'MVP_LIVE_INTEGRITY_FAILED','INVALID_SMOKE_SCOPE','EVALUATION_LOCKED','PLAN_CHANGED','HANDOFF_CONFIGURATION_CONFLICT','HANDOFF_APPROVAL_EXPIRED',
  'INCOMPLETE_OR_CHANGED_LOCAL_STATE','INVALID_HANDOFF_JOURNAL','SMOKE_ALREADY_STARTED_STOP','SMOKE_CASE_NOT_AUTHORIZED','HANDOFF_BUDGET_STOP',
  'EVALUATION_BUDGET_STOP','BUDGET_CONFIGURATION_CONFLICT','INVALID_BUDGET_JOURNAL','INCOMPLETE_BUDGET_JOURNAL','LOCAL_SCHEMA_MISMATCH','JOURNAL_TIP_CHANGED',
  'EVALUATION_POLICY_CHANGED','UNSETTLED_LOCAL_ADMISSIONS','UNKNOWN_REVIEW_FILE','INVALID_REVIEW_METADATA','UNEXPECTED_REVIEW_FILES','REVIEW_OUTPUT_TOO_LARGE',
  'EXPLICIT_REVIEW_DELETE_REQUIRED','EVIDENCE_CHANGED','SETTLEMENT_AUDIT_FAILED','REPLAY_AUDIT_FAILED','LOCAL_DATABASE_INSPECTION_FAILED']);
export const safeFailure=error=>({status:'BLOCKED',code:CODES.has(error?.message)?error.message:error?.code==='ENOENT'?'REQUIRED_PRIVATE_STATE_MISSING':error?.code==='EEXIST'?'INCOMPLETE_HANDOFF_INITIALIZATION':'HANDOFF_STOP',next:'STOP_PRESERVE_AUTHORIZATION_JOURNALS_AND_D1_NO_RETRY'});
export function parse(args){
  const [command,...rest]=args,o={command};
  const fields={inspect:['--prior'],authorize:['--prior','--plan','--confirm'],smoke:['--prior','--confirm'],delete:['--prior','--case','--confirm']}[command];
  if(!fields||rest.length!==fields.length*2)fail('INVALID_ARGUMENTS');
  while(rest.length){const k=rest.shift(),v=rest.shift();if(!fields.includes(k)||Object.hasOwn(o,k)||!v||v.startsWith('--'))fail('INVALID_ARGUMENTS');o[k]=v;}
  if(fields.some(k=>!o[k])||!isAbsolute(o['--prior']))fail('INVALID_ARGUMENTS');return o;
}
export async function run(args=process.argv.slice(2),environment=process.env){
  const o=parse(args),path=o['--prior'];
  if(o.command==='inspect')return inspectHandoff(path);
  if(o.command==='authorize')return authorizeHandoff(path,o['--plan'],o['--confirm']);
  if(o.command==='smoke'){
    if(o['--confirm']!=='EXECUTE_P41_P44_ONCE')fail('EXPLICIT_LIVE_EXECUTION_REQUIRED');
    return smoke(path,{key:environment.HOLOCRON_EVAL_OPENAI_API_KEY});
  }
  // Body deletion must remain possible after expiry, or a later source revision.
  // It never initializes state or removes budget/history. No key is read.
  const {value:a}=await readPrivateJson(path),lock=await acquireBudgetLock(a.stateDir);
  try{return await deleteReviewed(join(a.stateDir,HANDOFF),o['--case'],o['--confirm']);}finally{await lock.close();}
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
  try{const report=await run();console.log(JSON.stringify(report,null,2));if(report.status==='STOP_UNEXPECTED_RESULT'||report.status.startsWith('BLOCKED'))process.exitCode=1;}
  catch(error){
    // Never surface arbitrary provider/OS exception messages or private paths.
    console.error(JSON.stringify(safeFailure(error)));process.exitCode=1;
  }
}
