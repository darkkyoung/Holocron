import {pathToFileURL} from 'node:url';
import {createCli as sharedCli} from '../assistant-e5h/cli.mjs';
import * as state from './state.mjs';
import {stateDigest,programAccepted} from './state.mjs';
import * as fixed from './revision.mjs';
import * as review from './review.mjs';
import {execute} from './execute.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {acquireBudgetLock,openBudget,fail} from '../assistant-eval/budget.mjs';
// Reuse the strict argument parser, safe local terminal rendering and privacy
// deletion path. E6B alone owns its composite checkpoint and sequential gate.
export function createCli(s=state,runCase=execute){
 const shared=sharedCli({...s,...fixed,...review,execute:runCase,conflictCode:'E6B_CONFIGURATION_CONFLICT',integrityCode:'E6B_INTEGRITY_FAILED',stopCode:'E6B_STOP'});
 async function run(args=process.argv.slice(2),environment=process.env){
  const o=shared.parse(args);if(o.command!=='score')return shared.run(args,environment);
  if(o['--confirm']!=='RECORD_OWNER_REVIEW_AND_DELETE')fail('EXPLICIT_REVIEW_REQUIRED');
  const x=await s.context(o['--prior']);let lock,budget;
  try{lock=await acquireBudgetLock(x.approval.stateDir);await s.recheck(x);const g=await s.grantFor(x),checked=await s.checkpoint(x,g),r=checked.runs.find(r=>r.id===o['--case']);
   if(!r||!programAccepted(r.id,r.finish))fail('PROGRAM_PASS_REQUIRED');
   if(r.reviewed)fail('REVIEW_ALREADY_RECORDED');
   const scored=await review.score(x.directory,g,r.id,(await readPrivateJson(o['--scores'])).value);
   budget=await openBudget(x.directory,g,{heldLock:lock,requireExisting:true});await budget.checkpoint(await stateDigest(x.directory,checked.local),checked.local.ledger.ledgerEntries);return scored;
  }finally{await budget?.close();await lock?.close();await x.reader.close();}
 }
 const additional=new Set(['CASE_ORDER_REQUIRED','PREVIOUS_OWNER_PASS_REQUIRED','SETTLEMENT_MISMATCH']);
 return {parse:shared.parse,run,safeFailure:e=>additional.has(e?.message)?{status:'BLOCKED',code:e.message,next:'STOP_PRESERVE_HISTORY_NO_RETRY'}:shared.safeFailure(e)};
}
export const {parse,run,safeFailure}=createCli();
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const r=await run();console.log(JSON.stringify(r,null,2));if(r.status?.startsWith('STOP'))process.exitCode=1;}catch(e){console.error(JSON.stringify(safeFailure(e)));process.exitCode=1;}}
