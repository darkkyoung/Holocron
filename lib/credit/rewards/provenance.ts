/** At most two owners: the current principal and its one audited, retired migrated Guest. */
export const rewardWalletsSql=`SELECT ? UNION SELECT g.id FROM credit_ledger migration JOIN credit_principals g ON g.id=migration.reference_id
  WHERE migration.wallet_id=? AND migration.idempotency_key='guest_migration_v1' AND migration.kind='migration'
    AND migration.reference_type='guest_principal' AND g.type='guest' AND g.retired_at IS NOT NULL`;
