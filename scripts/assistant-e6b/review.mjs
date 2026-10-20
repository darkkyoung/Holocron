import {readdir,lstat,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createReview} from '../assistant-e5h/review.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {writeExclusive} from '../assistant-mvp/handoff.mjs';
import {hash,fail,privateDirectory} from '../assistant-eval/budget.mjs';
import {syncDir} from '../assistant-e5d/state.mjs';
import {SCOPE,internal,accepted} from './revision.mjs';
const base=createReview({SCOPE,internal});
export const {readOutput,retain,storageFailure,list,remove}=base;
export {render} from '../assistant-e5d/review.mjs';
const file=(dir,id,event)=>join(dir,'review',`${id}.${event}.json`);
async function optional(p){try{return (await readPrivateJson(p)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export function validateScores(id,v){
 internal(id);const qa=['E6B-P84','E6B-P66'].includes(id);
 if(!v||Object.keys(v).sort().join()!=='critical,scores'||typeof v.critical!=='boolean'||!Array.isArray(v.scores)||v.scores.length!==9||v.scores.some((s,i)=>qa&&[6,7].includes(i)?s!=='N/A':![0,1,2,'NOT_REVIEWED'].includes(s)))fail('INVALID_REVIEW_SCORES');
 return !v.critical&&v.scores.every(s=>s===2||s==='N/A')?'OWNER_PASS':'OWNER_NOT_PASS';
}
// Bound to the durable pilot checkpoint, including bodies. No receipt can be
// replaced after deletion to turn a failed review into permission to continue.
export async function reviewHash(dir){
 const folder=join(dir,'review');try{await lstat(folder);}catch(e){if(e.code==='ENOENT')return hash('[]');throw e;}
 await privateDirectory(folder,{existing:true});const names=(await readdir(folder)).sort(),rows=[];
 if(names.length>20)fail('REVIEW_INTEGRITY_FAILED');
 for(const n of names){if(!Object.keys(SCOPE).some(id=>['body','stored','reviewed','deleted','storage-failed'].some(k=>n===`${id}.${k}.json`)))fail('REVIEW_INTEGRITY_FAILED');
  const p=join(folder,n),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)||s.size>60000)fail('REVIEW_INTEGRITY_FAILED');await readPrivateJson(p);rows.push([n,hash(await readFile(p)),s.mode&0o777]);}
 return hash(JSON.stringify(rows));
}
export async function reviewedPass(dir,g,id){
 const s=await optional(file(dir,id,'stored')),r=await optional(file(dir,id,'reviewed')),d=await optional(file(dir,id,'deleted'));
 if(!s||!r||!d)return false;
 for(const [v,event] of [[s,'stored'],[r,'reviewed'],[d,'deleted']])if(v.caseId!==id||v.event!==event||v.revisionHash!==g.revisionHash)fail('REVIEW_INTEGRITY_FAILED');
 if(!/^[a-f0-9]{64}$/.test(s.bodyHash)||r.bodyHash!==s.bodyHash||r.reviewer!=='owner'||d.reason!=='REVIEWED'||Date.parse(s.expiresAt)-Date.parse(s.createdAt)!==86400000||![r.at,d.at].every(t=>Number.isFinite(Date.parse(t)))||Date.parse(r.at)<Date.parse(s.createdAt)||Date.parse(r.at)>=Date.parse(s.expiresAt)||Date.parse(d.at)<Date.parse(r.at)||r.verdict!==validateScores(id,{scores:r.scores,critical:r.critical}))fail('REVIEW_INTEGRITY_FAILED');
 if(await optional(file(dir,id,'body'))||await optional(file(dir,id,'storage-failed')))fail('REVIEW_INTEGRITY_FAILED');
 return r.verdict==='OWNER_PASS';
}
// Caller holds the original coordinator lock, verifies the old checkpoint and
// appends a new composite checkpoint after both immutable receipts are durable.
export async function score(dir,g,id,value){
 internal(id);if(await optional(file(dir,id,'reviewed')))fail('REVIEW_ALREADY_RECORDED');
 const verdict=validateScores(id,value),output=await readOutput(dir,g,id),s=await optional(file(dir,id,'stored'));
 if(!accepted(id,output.result.status.toUpperCase()))fail('PROGRAM_PASS_REQUIRED');
 await writeExclusive(file(dir,id,'reviewed'),{caseId:id,event:'reviewed',revisionHash:g.revisionHash,bodyHash:s.bodyHash,at:new Date().toISOString(),reviewer:'owner',...value,verdict});await syncDir(join(dir,'review'));
 await remove(dir,g,id,'DELETE_RESULT_BODY');return {caseId:id,status:'REVIEW_RECORDED_BODY_DELETED',verdict};
}
