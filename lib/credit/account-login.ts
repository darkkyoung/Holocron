import {policyValueSql} from './policy-settings/repository';
import {prepareRewardMutation,prepareMigrationMutation} from './repository';
import {CreditError,type CreditOwner} from './types';
import {validateOwner} from './policy';
export const MIGRATION_KEY='guest_migration_v1';
export const MIGRATION_OUT_KEY='guest_migration_out_v1';
export const FIRST_LOGIN_KEY='account_first_login_v1';
export type LoginNotice={status:'migrated'|'already_migrated'|'no_guest';migrated:number;guestBalance:number;firstLogin:number};

/** Claim, both ledger effects, retirement and first-login reward commit or roll back together. */
export async function applyAccountLogin(database:D1Database,owner:CreditOwner,guest:CreditOwner|null,now=new Date()){
  validateOwner(owner);if(guest)validateOwner(guest);
  const migrationId=crypto.randomUUID(),outId=crypto.randomUUID(),rewardId=crypto.randomUUID(),time=now.toISOString();
  const statements=[prepareMigrationMutation(database,{owner,idempotencyKey:MIGRATION_KEY,...(guest?{reference:{type:'guest_principal',id:guest.principalId}}:{})},migrationId,now,guest?{
    sql:`SELECT w.balance FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id
      WHERE p.id=? AND p.type='guest' AND p.retired_at IS NULL
      AND EXISTS (SELECT 1 FROM credit_principals WHERE id=? AND type='account' AND retired_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM credit_ledger WHERE wallet_id=p.id AND idempotency_key=?)`,
    bindings:[guest.principalId,owner.principalId,MIGRATION_OUT_KEY],
  }:{sql:"SELECT 0 WHERE EXISTS (SELECT 1 FROM credit_principals WHERE id=? AND type='account' AND retired_at IS NULL)",bindings:[owner.principalId]})];
  if(guest){
    statements.push(prepareMigrationMutation(database,{owner:guest,idempotencyKey:MIGRATION_OUT_KEY,reference:{type:'account_principal',id:owner.principalId}},outId,now,{
      sql:'SELECT -applied_amount FROM credit_ledger WHERE id=? AND wallet_id=?',bindings:[migrationId,owner.principalId],
    }));
    statements.push(database.prepare(`UPDATE credit_principals SET retired_at=? WHERE id=? AND type='guest' AND retired_at IS NULL
      AND EXISTS (SELECT 1 FROM credit_ledger WHERE id=? AND wallet_id=credit_principals.id)
      AND EXISTS (SELECT 1 FROM credit_wallets WHERE principal_id=credit_principals.id AND balance=0)`).bind(time,guest.principalId,outId));
  }
  statements.push(prepareRewardMutation(database,{owner,idempotencyKey:FIRST_LOGIN_KEY},rewardId,now,{sql:`SELECT ${policyValueSql('accountFirst')}`,bindings:[]}));
  // A rejected/no-op conditional insert must not commit a partial transfer. SQLite evaluates only the failing branch.
  statements.push(database.prepare(`SELECT CASE WHEN
    EXISTS (SELECT 1 FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?)
    AND EXISTS (SELECT 1 FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?)
    AND NOT EXISTS (SELECT 1 FROM credit_ledger e WHERE e.id=? AND e.reference_type='guest_principal' AND NOT EXISTS (
      SELECT 1 FROM credit_ledger outgoing JOIN credit_principals g ON g.id=outgoing.wallet_id JOIN credit_wallets w ON w.principal_id=g.id
      WHERE outgoing.id=? AND outgoing.wallet_id=e.reference_id AND outgoing.applied_amount=-e.applied_amount
        AND g.retired_at IS NOT NULL AND w.balance=0))
    THEN 1 ELSE json('credit_login_invariant_failed') END AS valid`).bind(owner.principalId,MIGRATION_KEY,owner.principalId,FIRST_LOGIN_KEY,migrationId,outId));
  statements.push(database.prepare(`SELECT e.id,e.applied_amount AS amount,e.reference_id AS guestId,w.balance,
    (SELECT id FROM credit_ledger WHERE wallet_id=w.principal_id AND idempotency_key=?) AS rewardId,
    (SELECT applied_amount FROM credit_ledger WHERE id=?) AS rewardApplied
    FROM credit_ledger e JOIN credit_wallets w ON w.principal_id=e.wallet_id JOIN credit_principals p ON p.id=w.principal_id
    WHERE e.wallet_id=? AND e.idempotency_key=? AND p.type='account' AND p.retired_at IS NULL`).bind(FIRST_LOGIN_KEY,rewardId,owner.principalId,MIGRATION_KEY));
  statements.push(database.prepare('SELECT balance,retired_at AS retired FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id WHERE p.id=?').bind(guest?.principalId??''));
  try{
    const results=await database.batch(statements);if(results.some(r=>!r.success))throw new Error();
    const row=results.at(-2)!.results[0] as {id:string;amount:number;guestId:string|null;balance:number;rewardId:string;rewardApplied:number|null}|undefined;
    const remaining=results.at(-1)!.results[0] as {balance:number;retired:string|null}|undefined;
    if(!row)throw new Error();
    const migrated=!!guest&&row.guestId===guest.principalId&&!!remaining?.retired;
    const notice:LoginNotice={status:migrated?'migrated':row.id===migrationId?'no_guest':'already_migrated',migrated:migrated?row.amount:0,guestBalance:remaining?.balance??0,firstLogin:row.rewardId===rewardId?row.rewardApplied??0:0};
    return {balance:row.balance,notice,clearGuest:migrated};
  }catch{throw new CreditError('UNAVAILABLE');}
}
