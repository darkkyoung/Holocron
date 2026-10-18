import {prepareCreditMutation} from '../credit/repository';
import {creditService} from '../credit/service';
import {resolveCurrentCreditOwner} from '../identity/current-owner';
import type {CreditCommand} from '../credit/types';
import {admissionFailure,type GenerationAction} from './limits';
/** Initial-launch policy only. Guest earning/retrieval/migration are unchanged.
 * This read is early feedback; the SQL admission and debit gates independently enforce it. */
export async function requireSpendingAccount(db:D1Database,request:Request,secrets:{account?:string;guest?:string},now:number){
  const owner=await resolveCurrentCreditOwner(request,db,secrets,now);
  if(!owner)admissionFailure('LOGIN_REQUIRED');
  if((await creditService(db).getBalance(owner)).type!=='account')admissionFailure('LOGIN_REQUIRED');
  return owner;
}
export const spendKey=(requestId:string,inputHmac:string)=>`assistant:spend:${requestId}:${inputHmac}`;
export {terminalAssistantRefundSql,assistantRefundMatchSql} from '../credit/refund-headroom';
export function spendCommand(principalId:string,_action:GenerationAction,requestId:string,inputHmac:string,credits:number):CreditCommand{
  return {owner:{principalId},amount:credits,operation:'debit',kind:'ai_spend',
    idempotencyKey:spendKey(requestId,inputHmac),reference:{type:'assistant_request',id:requestId}};
}
export function prepareAssistantDebit(db:D1Database,principalId:string,action:GenerationAction,requestId:string,token:string,entryId:string,inputHmac:string,now:number,credits:number){
  return prepareCreditMutation(db,spendCommand(principalId,action,requestId,inputHmac,credits),entryId,new Date(now),{
    sql:`EXISTS (SELECT 1 FROM assistant_admissions a JOIN credit_principals p ON p.id=a.principal_id
      WHERE a.request_id=? AND a.owner_token=? AND a.debit_entry_id=? AND p.type='account' AND p.retired_at IS NULL)`,bindings:[requestId,token,entryId],
  });
}
/** Capacity-first policy: preserve the requested amount and let protected Credit SQL
 * determine the applied effect. Account partial effects require migration 0018. */
export function prepareAssistantRefund(db:D1Database,row:{principal_id:string;action:GenerationAction;request_id:string;owner_token:string;debit_entry_id:string;input_hmac:string;charged_credits:number},now:number){
  return prepareCreditMutation(db,{...spendCommand(row.principal_id,row.action,row.request_id,row.input_hmac,row.charged_credits),operation:'refund',kind:'refund',
    idempotencyKey:`assistant:refund:${row.request_id}`,originalEntryId:row.debit_entry_id},crypto.randomUUID(),new Date(now),{
    sql:`EXISTS (SELECT 1 FROM assistant_admissions a JOIN credit_wallets w ON w.principal_id=a.principal_id JOIN credit_principals p ON p.id=w.principal_id
      WHERE a.request_id=? AND a.owner_token=? AND a.state='refund_pending' AND p.retired_at IS NULL)`,
    bindings:[row.request_id,row.owner_token],
  });
}
