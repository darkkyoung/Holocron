/** Internal owner handle. Never construct from an HTTP body/query parameter. */
export type CreditOwner={principalId:string};
export type CreditKind='reward'|'ai_spend'|'refund'|'race_stake'|'race_payout'|'migration'|'admin_adjustment';
export type CreditOperation='credit'|'debit'|'refund'|'claim';
export type CreditReference={type:string;id:string};
export type CreditMutation={owner:CreditOwner;amount:number;kind:CreditKind;idempotencyKey:string;reference?:CreditReference};
export type CreditCommand=CreditMutation&{operation:CreditOperation;originalEntryId?:string};
export type Wallet={principalId:string;type:'guest'|'account';balance:number;version:number};
export type CreditResult={status:'applied'|'duplicate';entryId:string;requestedAmount:number;appliedAmount:number;resultingBalance:number;currentBalance:number;capped:boolean};
export type CreditErrorCode='INVALID_INPUT'|'UNAVAILABLE'|'OWNER_UNAVAILABLE'|'INSUFFICIENT_BALANCE'|'OVERFLOW'|'IDEMPOTENCY_CONFLICT'|'INVALID_REFUND'|'REFUND_CAPACITY';
export class CreditError extends Error{
  constructor(public readonly code:CreditErrorCode){super(`Credit operation failed: ${code}.`);}
}
