-- Replace only the Account refund effect. Apply the complete file in one D1 batch.
-- The temporary guard also fails closed if a runner stops between statements.
CREATE TRIGGER credit_ledger_migration_guard BEFORE INSERT ON credit_ledger
BEGIN SELECT RAISE(ABORT,'credit_migration_in_progress'); END;
--> statement-breakpoint
DROP TRIGGER credit_ledger_guard;
--> statement-breakpoint
CREATE TRIGGER credit_ledger_guard BEFORE INSERT ON credit_ledger
BEGIN
  SELECT RAISE(ABORT,'credit_ledger_state_invalid') WHERE NOT EXISTS (
    SELECT 1 FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id
    WHERE w.principal_id=NEW.wallet_id AND p.retired_at IS NULL
      AND NEW.sequence=w.version+1
      AND NEW.applied_amount= iif(NEW.requested_amount>0 AND p.type='guest',min(NEW.requested_amount,10-w.balance),iif(NEW.operation='refund' AND p.type='account',min(NEW.requested_amount,9007199254740991-w.balance),NEW.requested_amount))
      AND NEW.resulting_balance=w.balance+NEW.applied_amount
      AND (p.type<>'guest' OR NEW.resulting_balance<=10)
  );
  SELECT RAISE(ABORT,'credit_refund_invalid') WHERE NEW.operation='refund' AND NOT EXISTS (
    SELECT 1 FROM credit_ledger original
    WHERE original.id=NEW.original_entry_id AND original.wallet_id=NEW.wallet_id AND original.operation='debit'
      AND NEW.requested_amount<=-original.applied_amount-COALESCE((SELECT SUM(requested_amount) FROM credit_ledger WHERE original_entry_id=original.id),0)
  );
END;
--> statement-breakpoint
DROP TRIGGER credit_ledger_migration_guard;
