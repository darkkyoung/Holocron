import {mkdir,readdir,lstat,unlink,open} from 'node:fs/promises';
import {join} from 'node:path';
import {writeExclusive,HOURS} from './handoff.mjs';
import {readPrivateJson} from './historical-reader.mjs';
import {privateDirectory,fail} from '../assistant-eval/budget.mjs';
import {SCOPE} from './live-revision.mjs';
export async function reviewFiles(directory){
  const folder=join(directory,'review');
  try{await lstat(folder);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  await privateDirectory(folder,{existing:true});const results=[];
  for(const name of await readdir(folder)){
    if(!Object.hasOwn(SCOPE,name.replace(/\.json$/,''))||!name.endsWith('.json'))fail('UNKNOWN_REVIEW_FILE');
    const file=join(folder,name),{value}=await readPrivateJson(file);
    if(value.caseId+'.json'!==name||!Number.isFinite(Date.parse(value.createdAt))||Date.parse(value.expiresAt)-Date.parse(value.createdAt)!==HOURS)fail('INVALID_REVIEW_METADATA');
    results.push({caseId:value.caseId,createdAt:value.createdAt,expiresAt:value.expiresAt,expired:Date.now()>=Date.parse(value.expiresAt)});
  }
  return results;
}
export async function retainOutput(directory,grant,id,result){
  if(!Object.hasOwn(SCOPE,id)||!['ok','insufficient_evidence'].includes(result.status))fail('VALIDATED_OUTPUT_REQUIRED');
  const folder=join(directory,'review');await mkdir(folder,{mode:0o700,recursive:true});await privateDirectory(folder,{existing:true});
  const now=Date.now(),envelope={caseId:id,revisionHash:grant.revisionHash,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+HOURS).toISOString(),result};
  if(Buffer.byteLength(JSON.stringify(envelope))>60000)fail('REVIEW_OUTPUT_TOO_LARGE');
  await writeExclusive(join(folder,id+'.json'),envelope);
  const handle=await open(folder,'r');try{await handle.sync();}finally{await handle.close();}
}
// Deletes bodies only, immediately after review (or expiry). No journal/D1 cleanup.
export async function deleteReviewed(directory,id,confirmation){
  if(!Object.hasOwn(SCOPE,id)||confirmation!=='DELETE_RESULT_BODY')fail('EXPLICIT_REVIEW_DELETE_REQUIRED');
  const existing=await reviewFiles(directory);
  if(existing.some(r=>r.caseId===id)){
    await unlink(join(directory,'review',id+'.json'));
    const folder=await open(join(directory,'review'),'r');try{await folder.sync();}finally{await folder.close();}
  }
  return {status:'RESULT_BODY_ABSENT',caseId:id,budgetAndD1Preserved:true};
}
