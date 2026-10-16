import {prepareCreditMutation} from '../credit/repository';
import {GUEST_CREDIT_CAP} from '../credit/policy';
import type {CreditCommand} from '../credit/types';
import {AI_ACTIONS,type GenerationAction} from './limits';
export const spendKey=(requestId:string,inputHmac:string)=>`assistant:spend:${requestId}:${inputHmac}`;
export function spendCommand(principalId:string,action:GenerationAction,requestId:string,inputHmac:string):CreditCommand{
  return {owner:{principalId},amount:AI_ACTIONS[action].credits,operation:'debit',kind:'ai_spend',
    idempotencyKey:spendKey(requestId,inputHmac),reference:{type:'assistant_request',id:requestId}};
}
export function prepareAssistantDebit(db:D1Database,principalId:string,action:GenerationAction,requestId:string,token:string,entryId:string,inputHmac:string,now:number){
  return prepareCreditMutation(db,spendCommand(principalId,action,requestId,inputHmac),entryId,new Date(now),{
    sql:'EXISTS (SELECT 1 FROM assistant_admissions WHERE request_id=? AND owner_token=? AND debit_entry_id=?)',bindings:[requestId,token,entryId],
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
