import {prepareCreditMutation} from '../credit/repository';
import {creditService} from '../credit/service';
import {resolveCurrentCreditOwner} from '../identity/current-owner';
import {GUEST_CREDIT_CAP} from '../credit/policy';
import type {CreditCommand} from '../credit/types';
import {AI_ACTIONS,admissionFailure,type GenerationAction} from './limits';
/** Initial-launch policy only. Guest earning/retrieval/migration are unchanged.
 * This read is early feedback; the SQL admission and debit gates independently enforce it. */
export async function requireSpendingAccount(db:D1Database,request:Request,secrets:{account?:string;guest?:string},now:number){
  const owner=await resolveCurrentCreditOwner(request,db,secrets,now);
  if(!owner)admissionFailure('LOGIN_REQUIRED');
  if((await creditService(db).getBalance(owner)).type!=='account')admissionFailure('LOGIN_REQUIRED');
  return owner;
}
export const spendKey=(requestId:string,inputHmac:string)=>`assistant:spend:${requestId}:${inputHmac}`;
/** Correlated with assistant_admissions. A terminal failure requires durable proof of
 * the entire original debit's compensation, not merely a mutable operational label. */
export const fullAssistantRefundSql=`EXISTS (
  SELECT 1 FROM credit_ledger refund JOIN credit_ledger debit ON debit.id=assistant_admissions.debit_entry_id
  WHERE refund.original_entry_id=debit.id AND refund.wallet_id=debit.wallet_id AND debit.wallet_id=assistant_admissions.principal_id
    AND debit.operation='debit' AND debit.kind='ai_spend' AND debit.reference_type='assistant_request' AND debit.reference_id=assistant_admissions.request_id
    AND refund.operation='refund' AND refund.kind='refund' AND refund.idempotency_key='assistant:refund:'||assistant_admissions.request_id
    AND refund.applied_amount=-debit.applied_amount
)`;
export function spendCommand(principalId:string,action:GenerationAction,requestId:string,inputHmac:string):CreditCommand{
  return {owner:{principalId},amount:AI_ACTIONS[action].credits,operation:'debit',kind:'ai_spend',
    idempotencyKey:spendKey(requestId,inputHmac),reference:{type:'assistant_request',id:requestId}};
}
export function prepareAssistantDebit(db:D1Database,principalId:string,action:GenerationAction,requestId:string,token:string,entryId:string,inputHmac:string,now:number){
  return prepareCreditMutation(db,spendCommand(principalId,action,requestId,inputHmac),entryId,new Date(now),{
    sql:`EXISTS (SELECT 1 FROM assistant_admissions a JOIN credit_principals p ON p.id=a.principal_id
      WHERE a.request_id=? AND a.owner_token=? AND a.debit_entry_id=? AND p.type='account' AND p.retired_at IS NULL)`,bindings:[requestId,token,entryId],
  });
}
/** Never let the existing Guest clamp consume a refund's entitlement partially. */
export function prepareAssistantRefund(db:D1Database,row:{principal_id:string;action:GenerationAction;request_id:string;owner_token:string;debit_entry_id:string;input_hmac:string},now:number){
  const amount=AI_ACTIONS[row.action].credits;
  return prepareCreditMutation(db,{...spendCommand(row.principal_id,row.action,row.request_id,row.input_hmac),operation:'refund',kind:'refund',
    idempotencyKey:`assistant:refund:${row.request_id}`,originalEntryId:row.debit_entry_id},crypto.randomUUID(),new Date(now),{
    sql:`EXISTS (SELECT 1 FROM assistant_admissions a JOIN credit_wallets w ON w.principal_id=a.principal_id JOIN credit_principals p ON p.id=w.principal_id
      WHERE a.request_id=? AND a.owner_token=? AND a.state='refund_pending' AND p.retired_at IS NULL AND (p.type<>'guest' OR w.balance<=${GUEST_CREDIT_CAP}-?))`,
    bindings:[row.request_id,row.owner_token,amount],
  });
}
