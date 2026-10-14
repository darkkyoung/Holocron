import {CreditError,type CreditCommand,type CreditOwner} from './types';
export const GUEST_CREDIT_CAP=10;
export const MAX_CREDIT_INTEGER=Number.MAX_SAFE_INTEGER;
const kinds=new Set(['reward','ai_spend','refund','race_stake','race_payout','migration','admin_adjustment']);
export function boundedIdentifier(value:unknown,max=200):value is string{
  return typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()===value&&!/[\u0000-\u001f\u007f]/.test(value);
}
export function validateOwner(owner:CreditOwner){
  if(!owner||!boundedIdentifier(owner.principalId))throw new CreditError('INVALID_INPUT');
}
export function validateCommand(command:CreditCommand){
  validateOwner(command.owner);
  if(!['credit','debit','refund','claim'].includes(command.operation)||!kinds.has(command.kind)||!boundedIdentifier(command.idempotencyKey)||!Number.isSafeInteger(command.amount)||(command.operation==='claim'?command.amount!==0:command.amount<=0))throw new CreditError('INVALID_INPUT');
  if(command.reference&&(!boundedIdentifier(command.reference.type,64)||!boundedIdentifier(command.reference.id)))throw new CreditError('INVALID_INPUT');
  if(command.operation==='refund'?!boundedIdentifier(command.originalEntryId):command.originalEntryId!==undefined)throw new CreditError('INVALID_INPUT');
}
