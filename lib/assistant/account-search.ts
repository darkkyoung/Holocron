import {prepareCreditMutation,readWallet} from '../credit/repository';
import {admissionHmac} from './abuse-identity';
import {accountBinding,searchAccount} from './account-access';
import {admissionClock,admissionFailure,requestId} from './limits';
import {retrieveArchive} from './service';
import {validateRetrieval} from './validation';
import {sealSearch,openSearch} from './search-recovery';
import {AssistantError} from './types';
import type {AdmissionDependencies} from './admission';
export const SEARCH_LIMITS={accountMinute:10,globalMinute:200,globalDay:2000,capacity:10000,leaseMs:60000,resultMs:600000,tombstoneMs:172800000} as const;
export type AccountSearchResult=Awaited<ReturnType<typeof retrieveArchive>>&{credit:{charged:0|1};requestId:string;resultExpiresAt:number};
type Row={request_id:string;principal_id:string;input_hmac:string;owner_token:string;state:string;result_cipher:string|null;charged:0|1;lease_expires_at:number;result_expires_at:number};
async function read(db:D1Database,id:string){return db.prepare('SELECT * FROM assistant_searches WHERE request_id=?').bind(id).first<Row>();}
/** Attempt admission precedes archive work; debit happens ONLY with durable result readiness.
 * Transaction loss is resolved by retrying the same UUID. Never retry with a fresh UUID. */
export async function accountSearch(db:D1Database,request:Request,raw:unknown,deps:AdmissionDependencies):Promise<AccountSearchResult>{
 const clock=deps.now??Date.now,now=admissionClock(clock());
 if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
 const owner=await searchAccount(db,request,deps.identitySecrets?.account,now);
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AssistantError('INVALID_REQUEST',400);
 const {requestId:rawId,...payload}=raw as Record<string,unknown>,id=requestId(rawId),input=validateRetrieval(payload,now);
 const hash=await admissionHmac(deps.abuseSecret,'account-search-v1',JSON.stringify({owner:owner.principalId,input}));
 const binding=await accountBinding(owner.principalId,deps.secret),aad=owner.principalId+':'+id+':'+hash;
 let previous=await read(db,id);
 if(previous){
  if(previous.principal_id!==owner.principalId||previous.input_hmac!==hash)admissionFailure('REQUEST_CONFLICT');
  if(previous.state==='completed'){
   if(previous.result_expires_at<=now||!previous.result_cipher)admissionFailure('RESULT_NOT_RETAINED');
   return openSearch<AccountSearchResult>(previous.result_cipher,deps.secret,aad);
  }
  if(previous.state==='failed')admissionFailure('RESULT_NOT_RETAINED');
  if(previous.lease_expires_at>now)admissionFailure('REQUEST_IN_PROGRESS');
 }
 const wallet=await readWallet(db,owner);if(wallet.balance<1)admissionFailure('INSUFFICIENT_BALANCE');
 const token=crypto.randomUUID(),L=SEARCH_LIMITS,day=Math.floor(now/86400000)*86400000;
 // Cleanup is bounded. A durable debit tombstone in the ledger blocks UUID re-use
 // even after operational request rows are removed. Never discard an active lease.
 const admission=await db.batch([
  db.prepare('UPDATE assistant_searches SET result_cipher=NULL WHERE request_id IN (SELECT request_id FROM assistant_searches WHERE result_expires_at<=? AND result_cipher IS NOT NULL LIMIT 100)').bind(now),
  db.prepare("DELETE FROM assistant_searches WHERE request_id IN (SELECT request_id FROM assistant_searches WHERE created_at<? AND lease_expires_at<=? LIMIT 100)").bind(now-L.tombstoneMs,now),
  db.prepare(`INSERT OR IGNORE INTO assistant_searches(request_id,principal_id,input_hmac,owner_token,state,created_at,lease_expires_at,result_expires_at)
   SELECT ?,?,?,?,'started',?,?,? WHERE
   NOT EXISTS(SELECT 1 FROM credit_ledger WHERE reference_type='assistant_search' AND reference_id=?)
   AND (SELECT count(*) FROM assistant_searches)<${L.capacity}
   AND (SELECT count(*) FROM assistant_searches WHERE principal_id=? AND created_at>?)<${L.accountMinute}
   AND (SELECT count(*) FROM assistant_searches WHERE created_at>?)<${L.globalMinute}
   AND (SELECT count(*) FROM assistant_searches WHERE created_at>=?)<${L.globalDay}
   AND NOT EXISTS(SELECT 1 FROM assistant_searches WHERE principal_id=? AND state='started' AND lease_expires_at>?)`)
   .bind(id,owner.principalId,hash,token,now,now+L.leaseMs,now+L.resultMs,id,owner.principalId,now-60000,now-60000,day,owner.principalId,now),
  // Only a verified matching expired attempt can resume; no charge existed at this point.
  db.prepare(`UPDATE assistant_searches SET owner_token=?,lease_expires_at=?,result_expires_at=? WHERE request_id=? AND principal_id=? AND input_hmac=? AND state='started' AND lease_expires_at<=?
   AND NOT EXISTS(SELECT 1 FROM assistant_searches WHERE principal_id=? AND state='started' AND lease_expires_at>?)`)
   .bind(token,now+L.leaseMs,now+L.resultMs,id,owner.principalId,hash,now,owner.principalId,now),
 ]);
 if(admission.some(r=>!r.success))admissionFailure('ADMISSION_UNAVAILABLE');
 previous=await read(db,id);
 if(!previous) {
  if(await db.prepare("SELECT 1 FROM credit_ledger WHERE reference_type='assistant_search' AND reference_id=?").bind(id).first())admissionFailure('RESULT_NOT_RETAINED');
  admissionFailure('ADMISSION_LIMIT');
 }
 if(previous.owner_token!==token)admissionFailure('REQUEST_IN_PROGRESS');
 let committing=false;
 try{
  const found=await retrieveArchive(db,input,binding,deps.secret,now),charged=found.status==='ready'&&found.receipt&&found.candidates.length?1:0;
  const result:AccountSearchResult={...found,credit:{charged},requestId:id,resultExpiresAt:now+L.resultMs};
  const cipher=await sealSearch(result,deps.secret,aad),entryId=crypto.randomUUID(),finish=admissionClock(clock());
  if(finish>=now+L.leaseMs)admissionFailure('LEASE_EXPIRED');
  const statements=[db.prepare(`UPDATE assistant_searches SET state='completed',result_cipher=?,charged=?,debit_entry_id=?,lease_expires_at=0 WHERE request_id=? AND owner_token=? AND state='started' AND lease_expires_at>?`).bind(cipher,charged,charged?entryId:null,id,token,finish)];
  if(charged)statements.push(prepareCreditMutation(db,{owner,operation:'debit',kind:'ai_spend',amount:1,idempotencyKey:'assistant:search:'+id,reference:{type:'assistant_search',id}},entryId,new Date(finish),{
   sql:"EXISTS(SELECT 1 FROM assistant_searches WHERE request_id=? AND owner_token=? AND state='completed' AND debit_entry_id=?)",bindings:[id,token,entryId],
  }));
  // ASSERT aborts the whole D1 transaction when debit or owner CAS failed.
  statements.push(db.prepare(`SELECT IIF(EXISTS(SELECT 1 FROM assistant_searches WHERE request_id=? AND owner_token=? AND state='completed' AND result_cipher=?)
   AND (?=0 OR EXISTS(SELECT 1 FROM credit_ledger WHERE id=? AND wallet_id=? AND applied_amount=-1)),1,json('search_atomicity_failed')) AS ok`).bind(id,token,cipher,charged,entryId,owner.principalId));
  committing=true;
  await db.batch(statements);
  return result;
 }catch(error){
  // Never overwrite a possibly committed result after a lost D1 response.
  if(!committing)await db.prepare("UPDATE assistant_searches SET state='failed',lease_expires_at=0 WHERE request_id=? AND owner_token=? AND state='started'").bind(id,token).run();
  throw error;
 }
}
