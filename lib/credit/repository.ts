import {CreditError,type CreditCommand,type CreditOwner,type CreditResult,type Wallet} from './types';
import {rewardWalletsSql} from './rewards/provenance';
import {GUEST_CREDIT_CAP,MAX_CREDIT_INTEGER,validateCommand,validateOwner} from './policy';

type Entry={id:string;operation:string;kind:string;requestedAmount:number;appliedAmount:number;resultingBalance:number;referenceType:string|null;referenceId:string|null;originalEntryId:string|null};
const walletSql=`SELECT w.principal_id AS principalId,p.type,w.balance,w.version FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id WHERE w.principal_id=? AND p.retired_at IS NULL`;
const entrySql=`SELECT id,operation,kind,requested_amount AS requestedAmount,applied_amount AS appliedAmount,resulting_balance AS resultingBalance,reference_type AS referenceType,reference_id AS referenceId,original_entry_id AS originalEntryId FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?`;

/** Prepared ledger INSERT for a caller-owned D1 transaction. Optional eligibility gate is
 * trusted server SQL only, never request input; existing wallet/ledger guards still apply. */
export function prepareCreditMutation(database:D1Database,command:CreditCommand,entryId:string,now:Date,gate?:{sql:string;bindings:(string|number|null)[]}){
  validateCommand(command);
  const signed=command.operation==='debit'?-command.amount:command.amount;
  return prepareMutation(database,command,entryId,now,`SELECT ?${gate?` WHERE (${gate.sql})`:''}`,[signed,...(gate?.bindings??[])],false);
}

/** Server-owned eligibility SELECT, evaluated inside the caller's D1 batch. Never accept SQL from a request. */
export function prepareRewardMutation(database:D1Database,command:Omit<CreditCommand,'amount'|'operation'|'kind'>,entryId:string,now:Date,input:{sql:string;bindings:(string|number|null)[]}){
  const reward:CreditCommand={...command,amount:1,operation:'credit',kind:'reward'};
  validateCommand(reward);
  return prepareMutation(database,reward,entryId,now,input.sql,input.bindings,true);
}

/** Internal migration capability: amount is selected from D1 within the caller's atomic batch. */
export function prepareMigrationMutation(database:D1Database,command:Omit<CreditCommand,'amount'|'operation'|'kind'>,entryId:string,now:Date,input:{sql:string;bindings:(string|number|null)[]}){
  const mutation:CreditCommand={...command,amount:1,operation:'credit',kind:'migration'};
  validateCommand(mutation);
  return prepareMutation(database,mutation,entryId,now,input.sql,input.bindings,false,true);
}

function prepareMutation(database:D1Database,command:CreditCommand,entryId:string,now:Date,inputSql:string,inputBindings:(string|number|null)[],reward:boolean,migration=false){
  const applied=`CASE WHEN input.amount>0 AND p.type='guest' THEN min(input.amount,${GUEST_CREDIT_CAP}-w.balance) ELSE input.amount END`;
  return database.prepare(`WITH input(amount) AS (${inputSql})
    INSERT INTO credit_ledger (id,wallet_id,sequence,operation,kind,idempotency_key,requested_amount,applied_amount,resulting_balance,reference_type,reference_id,original_entry_id,created_at)
    SELECT ?,w.principal_id,w.version+1,${migration?"CASE WHEN input.amount=0 THEN 'claim' WHEN input.amount<0 THEN 'debit' ELSE ? END":reward?"CASE WHEN input.amount=0 THEN 'claim' ELSE ? END":"?"},?,?,input.amount,${applied},w.balance+(${applied}),?,?,?,?
    FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id CROSS JOIN input
    WHERE w.principal_id=? AND p.retired_at IS NULL AND w.version<${MAX_CREDIT_INTEGER}
      ${reward?`AND input.amount>=0 AND NOT EXISTS (SELECT 1 FROM credit_ledger WHERE wallet_id IN (${rewardWalletsSql}) AND idempotency_key=?)`:''}
      AND (input.amount>=0 OR w.balance>=-input.amount)
      AND (input.amount<=0 OR p.type='guest' OR input.amount<=${MAX_CREDIT_INTEGER}-w.balance)
      AND NOT EXISTS (SELECT 1 FROM credit_ledger WHERE wallet_id=w.principal_id AND idempotency_key=?)
      AND (?<>'refund' OR EXISTS (
        SELECT 1 FROM credit_ledger original WHERE original.id=? AND original.wallet_id=w.principal_id AND original.operation='debit'
          AND input.amount<=-original.applied_amount-COALESCE((SELECT SUM(requested_amount) FROM credit_ledger WHERE original_entry_id=original.id),0)
      ))
    ON CONFLICT(wallet_id,idempotency_key) DO NOTHING`)
    .bind(...inputBindings,entryId,command.operation,command.kind,command.idempotencyKey,command.reference?.type??null,command.reference?.id??null,command.originalEntryId??null,now.toISOString(),command.owner.principalId,...(reward?[command.owner.principalId,command.owner.principalId,command.idempotencyKey]:[]),command.idempotencyKey,command.operation,command.originalEntryId??null);
}

export async function readWallet(database:D1Database,owner:CreditOwner):Promise<Wallet>{
  validateOwner(owner);
  try{
    const wallet=await database.prepare(walletSql).bind(owner.principalId).first<Wallet>();
    if(!wallet)throw new CreditError('OWNER_UNAVAILABLE');
    return wallet;
  }catch(error){if(error instanceof CreditError)throw error;throw new CreditError('UNAVAILABLE');}
}

export async function mutateCredit(database:D1Database,command:CreditCommand,now=new Date()):Promise<CreditResult>{
  validateCommand(command);
  const entryId=crypto.randomUUID();
  const statements=[prepareCreditMutation(database,command,entryId,now),database.prepare(entrySql).bind(command.owner.principalId,command.idempotencyKey),database.prepare(walletSql).bind(command.owner.principalId)];
  let results:D1Result[];
  try{results=await database.batch(statements);if(results.length!==3||results.some(result=>!result.success))throw new Error();}
  catch{throw new CreditError('UNAVAILABLE');}
  const entry=results[1].results[0] as Entry|undefined,wallet=results[2].results[0] as Wallet|undefined;
  if(!wallet)throw new CreditError('OWNER_UNAVAILABLE');
  if(!entry){
    if(command.operation==='debit'&&wallet.balance<command.amount)throw new CreditError('INSUFFICIENT_BALANCE');
    if(command.operation==='refund'&&wallet.version<MAX_CREDIT_INTEGER&&(wallet.type==='guest'||command.amount<=MAX_CREDIT_INTEGER-wallet.balance))throw new CreditError('INVALID_REFUND');
    throw new CreditError('OVERFLOW');
  }
  const signed=command.operation==='debit'?-command.amount:command.amount;
  if(entry.operation!==command.operation||entry.kind!==command.kind||entry.requestedAmount!==signed||entry.referenceType!==(command.reference?.type??null)||entry.referenceId!==(command.reference?.id??null)||entry.originalEntryId!==(command.originalEntryId??null))throw new CreditError('IDEMPOTENCY_CONFLICT');
  return {status:entry.id===entryId?'applied':'duplicate',entryId:entry.id,requestedAmount:entry.requestedAmount,appliedAmount:entry.appliedAmount,resultingBalance:entry.resultingBalance,currentBalance:wallet.balance,capped:entry.requestedAmount>entry.appliedAmount};
}
