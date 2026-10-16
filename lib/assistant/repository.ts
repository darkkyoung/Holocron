import {AI_ACTIONS,ADMISSION_LIMITS as L,admissionClock,admissionFailure,requestId,type GenerationAction} from './limits';
import {AssistantError,type AssistantCode} from './types';
import {admissionDecision,cleanupSql,type AdmissionInput} from './admission-sql';
import {prepareAssistantDebit,prepareAssistantRefund,terminalAssistantRefundSql,assistantRefundMatchSql} from './credit';
export type AdmissionRow={request_id:string;action:GenerationAction|'retrieve';session_hash:string;network_hash:string;input_hmac:string;owner_token:string;
  principal_id:string|null;debit_entry_id:string|null;weight:number;reserved_cost_micros:number;actual_cost_micros:number|null;
  state:'started'|'completed'|'failed'|'refund_pending';created_at:number;lease_expires_at:number;expires_at:number};
export type RefundSettlement={requested:number;applied:number;forfeited:number;full:boolean};
type SettlementRow=AdmissionRow&{refund_requested:number|null;refund_applied:number|null};
const settlementReadSql=`SELECT assistant_admissions.*,refund.requested_amount AS refund_requested,refund.applied_amount AS refund_applied
  FROM assistant_admissions LEFT JOIN credit_ledger debit ON debit.id=assistant_admissions.debit_entry_id
  LEFT JOIN credit_ledger refund ON ${assistantRefundMatchSql} WHERE assistant_admissions.request_id=?`;
function settlement(row:SettlementRow){
  const {refund_requested:requested,refund_applied:applied,...admission}=row;
  const refund:RefundSettlement|null=requested!==null&&applied!==null
    ?{requested,applied,forfeited:requested-applied,full:requested===applied}:null;
  return {...admission,refund};
}
async function batch(db:D1Database,statements:D1PreparedStatement[]){
  try{const results=await db.batch(statements);if(results.length!==statements.length||results.some(r=>!r.success))throw new Error();return results;}
  catch{throw new AssistantError('ADMISSION_UNAVAILABLE',503);}
}
function validateInput(i:AdmissionInput){
  requestId(i.requestId);requestId(i.ownerToken);admissionClock(i.now);
  for(const hash of [i.sessionHash,i.networkHash,i.previousNetworkHash,i.inputHmac])if(!/^[a-f0-9]{64}$/.test(hash))throw new AssistantError('INVALID_REQUEST',400);
  if(!Number.isSafeInteger(i.reservedCostMicros)||i.reservedCostMicros<0||i.reservedCostMicros>L.dailyMicros)throw new AssistantError('INVALID_COST_PROFILE',503);
  if(i.action==='retrieve'){
    if(i.principalId!==null||i.debitEntryId!==null||i.credits!==0||i.weight!==0||i.reservedCostMicros!==0)throw new AssistantError('INVALID_REQUEST',400);
  }else if(!Object.hasOwn(AI_ACTIONS,i.action)||!i.principalId||!i.debitEntryId||i.credits!==AI_ACTIONS[i.action].credits||i.weight!==AI_ACTIONS[i.action].weight||i.reservedCostMicros===0)throw new AssistantError('INVALID_REQUEST',400);
}
/** Every statement is in ONE D1 transaction. A zero-row insert cannot secure Credit. */
export async function insertAdmission(db:D1Database,input:AdmissionInput):Promise<AdmissionRow>{
  validateInput(input);
  const {sql,bindings}=admissionDecision(input),generation=input.action!=='retrieve';
  const statements=[db.prepare(cleanupSql).bind(input.now),db.prepare(`${sql} SELECT error FROM decision`).bind(...bindings),
    db.prepare(`${sql} INSERT INTO assistant_admissions (request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,state,created_at,lease_expires_at,expires_at)
      SELECT request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,?,now,now+?,now+? FROM i CROSS JOIN decision WHERE error IS NULL`)
      .bind(...bindings,generation?'started':'completed',generation?L.leaseMs:0,generation?L.generationRetentionMs:L.retrievalRetentionMs)];
  if(generation){
    statements.push(prepareAssistantDebit(db,input.principalId!,input.action as GenerationAction,input.requestId,input.ownerToken,input.debitEntryId!,input.inputHmac,input.now));
    // Both directions checked: this must ABORT, not merely return a false/zero result.
    statements.push(db.prepare(`SELECT IIF(
      (EXISTS (SELECT 1 FROM assistant_admissions WHERE request_id=? AND owner_token=?)) =
      (EXISTS (SELECT 1 FROM credit_ledger WHERE id=? AND wallet_id=? AND operation='debit' AND kind='ai_spend' AND applied_amount=?)),1,json('assistant_atomicity_failed')) AS ok`)
      .bind(input.requestId,input.ownerToken,input.debitEntryId,input.principalId,-input.credits));
  }
  statements.push(db.prepare('SELECT * FROM assistant_admissions WHERE request_id=?').bind(input.requestId));
  const results=await batch(db,statements),error=(results[1].results[0] as {error:AssistantCode|null}|undefined)?.error;
  if(error)admissionFailure(error);
  const row=results.at(-1)!.results[0] as AdmissionRow|undefined;
  if(!row||row.owner_token!==input.ownerToken)admissionFailure('ADMISSION_UNAVAILABLE');
  return row;
}
export async function readAdmission(db:D1Database,id:string){
  const result=await batch(db,[db.prepare(settlementReadSql).bind(requestId(id))]);
  const row=result[0].results[0] as SettlementRow|undefined;
  return row?settlement(row):undefined;
}
/** Owner-token CAS prevents late/duplicate workers changing a completed outcome. */
export async function completeAdmission(db:D1Database,id:string,token:string,actual:number|null,now:number){
  admissionClock(now);requestId(id);requestId(token);
  if(actual!==null&&(!Number.isSafeInteger(actual)||actual<0))throw new AssistantError('INVALID_COST_PROFILE',503);
  const results=await batch(db,[db.prepare(`UPDATE assistant_admissions SET state='completed',actual_cost_micros=?,lease_expires_at=0
    WHERE request_id=? AND owner_token=? AND state='started' AND lease_expires_at>? AND (? IS NULL OR ?<=reserved_cost_micros)`)
    .bind(actual,id,token,now,actual,actual),db.prepare('SELECT * FROM assistant_admissions WHERE request_id=? AND owner_token=?').bind(id,token)]);
  const row=results[1].results[0] as AdmissionRow|undefined;
  return {completed:results[0].meta.changes===1,row};
}
/** Failure/cancel/recovery all converge here; successful delivery is immutable. */
export async function failAdmission(db:D1Database,id:string,token:string,now:number,actual:number|null=null){
  admissionClock(now);requestId(id);requestId(token);
  const row=await readAdmission(db,id);
  if(!row||row.owner_token!==token||row.action==='retrieve')admissionFailure('REQUEST_CONFLICT');
  // Billing telemetry cannot veto compensation. Unknown/invalid usage keeps the
  // reservation; it does not leave a failed request falsely in the started state.
  const knownActual=actual!==null&&Number.isSafeInteger(actual)&&actual>=0&&actual<=row.reserved_cost_micros?actual:null;
  const results=await batch(db,[db.prepare(`UPDATE assistant_admissions SET state='refund_pending',lease_expires_at=0,
    actual_cost_micros=COALESCE(actual_cost_micros,?) WHERE request_id=? AND owner_token=? AND state='started'`)
    .bind(knownActual,id,token),prepareAssistantRefund(db,row as AdmissionRow&{action:GenerationAction;principal_id:string;debit_entry_id:string},now),
    db.prepare(`UPDATE assistant_admissions SET state='failed' WHERE request_id=? AND owner_token=? AND state='refund_pending'
      AND ${terminalAssistantRefundSql}`)
      .bind(id,token),
    db.prepare(settlementReadSql).bind(id)]);
  const settled=results[3].results[0] as SettlementRow|undefined;
  if(!settled)admissionFailure('RESULT_NOT_RETAINED');
  return settlement(settled);
}
