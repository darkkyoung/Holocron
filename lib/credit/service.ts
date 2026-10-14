import {mutateCredit,readWallet} from './repository';
import type {CreditMutation,CreditOwner} from './types';

/** Server-internal primitives; authorization and business eligibility belong to the calling service. */
export function creditService(database:D1Database){
  return {
    getBalance:(owner:CreditOwner)=>readWallet(database,owner),
    credit:(input:CreditMutation)=>mutateCredit(database,{...input,operation:'credit'}),
    debit:(input:CreditMutation)=>mutateCredit(database,{...input,operation:'debit'}),
    refund:(input:Omit<CreditMutation,'kind'>&{originalEntryId:string})=>mutateCredit(database,{...input,kind:'refund',operation:'refund'}),
    // Zero-effect durable claim for future first-wrong Quiz / empty migration claims.
    claim:(input:Omit<CreditMutation,'amount'>)=>mutateCredit(database,{...input,amount:0,operation:'claim'}),
  };
}
