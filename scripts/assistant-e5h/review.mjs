import {validateScores as plannerScores} from '../assistant-e5f/review.mjs';
import {mkdir,lstat,readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import * as originalRevision from './revision.mjs';
import {syncDir} from '../assistant-e5d/state.mjs';
import {writeExclusive,HOURS} from '../assistant-mvp/handoff.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {fail,hash,privateDirectory} from '../assistant-eval/budget.mjs';
export function createReview({SCOPE,internal}){
const file=(dir,id,suffix)=>join(dir,'review',id+'.'+suffix+'.json');
async function optional(path){try{return await readPrivateJson(path);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function folder(dir){const p=join(dir,'review');await mkdir(p,{mode:0o700,recursive:true});await privateDirectory(p,{existing:true});return p;}
async function receipt(dir,id,event,data){internal(id);await folder(dir);await writeExclusive(file(dir,id,event),{caseId:id,event,...data});await syncDir(join(dir,'review'));}
async function readOutput(dir,g,id,{allowExpired=false}={}){
 internal(id);const stored=await optional(file(dir,id,'stored'));if(!stored)fail('REVIEW_NOT_STORED');
 const s=stored.value,p=file(dir,id,'body'),checked=await readPrivateJson(p),stat=await lstat(p),v=checked.value;
 if(stat.size>60000||stat.size!==s.bytes||checked.hash!==s.bodyHash||s.caseId!==id||s.revisionHash!==g.revisionHash||v.caseId!==id||v.revisionHash!==g.revisionHash||v.createdAt!==s.createdAt||v.expiresAt!==s.expiresAt||!Number.isFinite(Date.parse(v.createdAt))||Date.parse(v.expiresAt)-Date.parse(v.createdAt)!==HOURS||!['ok','insufficient_evidence'].includes(v.result?.status))fail('REVIEW_INTEGRITY_FAILED');
 if(!allowExpired&&(Date.now()<Date.parse(v.createdAt)||Date.now()>=Date.parse(v.expiresAt)))fail('REVIEW_EXPIRED');
 return v;
}
async function retain(dir,g,id,result){
 internal(id);if(!['ok','insufficient_evidence'].includes(result.status))fail('VALIDATED_OUTPUT_REQUIRED');
 await folder(dir);const now=Date.now(),envelope={caseId:id,revisionHash:g.revisionHash,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+HOURS).toISOString(),result};
 const bytes=Buffer.byteLength(JSON.stringify(envelope)+'\n');if(bytes>60000)fail('REVIEW_OUTPUT_TOO_LARGE');
 await writeExclusive(file(dir,id,'body'),envelope);await syncDir(join(dir,'review'));
 const raw=await readFile(file(dir,id,'body'));
 await receipt(dir,id,'stored',{revisionHash:g.revisionHash,createdAt:envelope.createdAt,expiresAt:envelope.expiresAt,bytes,bodyHash:hash(raw)});
 await readOutput(dir,g,id);return {caseId:id,status:'STORED_VERIFIED',expiresAt:envelope.expiresAt};
}
async function storageFailure(dir,g,id){await receipt(dir,id,'storage-failed',{revisionHash:g.revisionHash,at:new Date().toISOString(),code:'OUTPUT_STORAGE_FAILED'});}
async function list(dir,g){
 const result=[];
 for(const id of Object.keys(SCOPE)){
  const stored=await optional(file(dir,id,'stored')),deleted=await optional(file(dir,id,'deleted')),reviewed=await optional(file(dir,id,'reviewed')),failed=await optional(file(dir,id,'storage-failed'));
  let exists=false,integrity=false;try{await lstat(file(dir,id,'body'));exists=true;await readOutput(dir,g,id,{allowExpired:true});integrity=true;}catch(e){if(e.code!=='ENOENT'&&!exists)throw e;}
  if(stored&&(!Number.isFinite(Date.parse(stored.value.createdAt))||Date.parse(stored.value.expiresAt)-Date.parse(stored.value.createdAt)!==HOURS))fail('REVIEW_INTEGRITY_FAILED');
  if(deleted&&!['ALREADY_ABSENT','REVIEWED','EXPIRED_UNREVIEWED','OWNER_UNREVIEWED'].includes(deleted.value.reason)||reviewed&&!['OWNER_PASS','OWNER_NOT_PASS'].includes(reviewed.value.verdict))fail('REVIEW_INTEGRITY_FAILED');
  result.push({caseId:id,path:file(dir,id,'body'),exists,integrity,storage:failed?'FAILED':stored?'STORED':exists?'UNCONFIRMED':'NOT_STORED',expiresAt:stored?.value.expiresAt??null,expired:stored?Date.now()>=Date.parse(stored.value.expiresAt):false,deletion:deleted?.value.reason??'NOT_RECORDED',semanticReview:reviewed?.value.verdict??'NOT_REVIEWED'});
 }
 return result;
}
async function remove(dir,g,id,confirmation){
 internal(id);if(confirmation!=='DELETE_RESULT_BODY')fail('EXPLICIT_DELETE_REQUIRED');
 const p=file(dir,id,'body');let exists=false;try{const s=await lstat(p);if(!s.isFile()||s.isSymbolicLink())fail('PRIVATE_FILE_REQUIRED');exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}
 const stored=await optional(file(dir,id,'stored')),reviewed=await optional(file(dir,id,'reviewed')),deleted=await optional(file(dir,id,'deleted'));
 if(exists){await privateDirectory(join(dir,'review'),{existing:true});await unlink(p);await syncDir(join(dir,'review'));}
 if(!deleted)await receipt(dir,id,'deleted',{revisionHash:g.revisionHash,at:new Date().toISOString(),reason:!exists?'ALREADY_ABSENT':reviewed?'REVIEWED':stored&&Date.now()>=Date.parse(stored.value.expiresAt)?'EXPIRED_UNREVIEWED':'OWNER_UNREVIEWED'});
 try{await lstat(p);fail('DELETE_FAILED');}catch(e){if(e.code!=='ENOENT')throw e;}
 return {caseId:id,status:'RESULT_BODY_ABSENT',budgetAndD1Preserved:true};
}
// Planner scores use the unchanged nine-dimension E.5F gate.
function validateScores(id,value){internal(id);return plannerScores('E5F-P44',value);}
async function score(dir,g,id,value){
 internal(id);if(await optional(file(dir,id,'reviewed')))fail('REVIEW_ALREADY_RECORDED');
 const verdict=validateScores(id,value),output=await readOutput(dir,g,id),stored=(await readPrivateJson(file(dir,id,'stored'))).value;
 await receipt(dir,id,'reviewed',{revisionHash:g.revisionHash,bodyHash:stored.bodyHash,at:new Date().toISOString(),reviewer:'owner',scores:value.scores,critical:value.critical,verdict:output.result.status==='ok'?verdict:'OWNER_NOT_PASS'});
 await remove(dir,g,id,'DELETE_RESULT_BODY');return {caseId:id,status:'REVIEW_RECORDED_BODY_DELETED',verdict:output.result.status==='ok'?verdict:'OWNER_NOT_PASS'};
}
return {readOutput,retain,storageFailure,list,remove,validateScores,score};
}
export const {readOutput,retain,storageFailure,list,remove,validateScores,score}=createReview(originalRevision);
// Stateless formatting is shared; historical receipts and files are never rewritten.
export {render} from '../assistant-e5d/review.mjs';
