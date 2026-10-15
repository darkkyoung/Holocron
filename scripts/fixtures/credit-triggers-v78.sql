-- Exact trigger suffix from canonical 6946cf12d6ba344b87eb16ff177cfaa2a433382a; regression fixture only.
-- Reviewed SQLite triggers supplement generated tables: Drizzle has no trigger schema DSL.
CREATE TRIGGER credit_wallet_zero BEFORE INSERT ON credit_wallets
WHEN NEW.balance<>0 OR NEW.version<>0
BEGIN SELECT RAISE(ABORT,'credit_wallet_must_start_zero'); END;
--> statement-breakpoint
CREATE TRIGGER credit_principal_immutable BEFORE UPDATE ON credit_principals
WHEN NEW.id IS NOT OLD.id OR NEW.type IS NOT OLD.type OR NEW.guest_key_hash IS NOT OLD.guest_key_hash OR NEW.user_id IS NOT OLD.user_id OR NEW.created_at IS NOT OLD.created_at OR (OLD.retired_at IS NOT NULL AND NEW.retired_at IS NOT OLD.retired_at)
BEGIN SELECT RAISE(ABORT,'credit_principal_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER credit_ledger_guard BEFORE INSERT ON credit_ledger
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id
    WHERE w.principal_id=NEW.wallet_id AND p.retired_at IS NULL
      AND NEW.sequence=w.version+1
      AND NEW.applied_amount= CASE WHEN NEW.requested_amount>0 AND p.type='guest' THEN min(NEW.requested_amount,10-w.balance) ELSE NEW.requested_amount END
      AND NEW.resulting_balance=w.balance+NEW.applied_amount
      AND (p.type<>'guest' OR NEW.resulting_balance<=10)
  ) THEN RAISE(ABORT,'credit_ledger_state_invalid') END;
  SELECT CASE WHEN NEW.operation='refund' AND NOT EXISTS (
    SELECT 1 FROM credit_ledger original
    WHERE original.id=NEW.original_entry_id AND original.wallet_id=NEW.wallet_id AND original.operation='debit'
      AND NEW.requested_amount<=-original.applied_amount-COALESCE((SELECT SUM(requested_amount) FROM credit_ledger WHERE original_entry_id=original.id),0)
  ) THEN RAISE(ABORT,'credit_refund_invalid') END;
END;
--> statement-breakpoint
CREATE TRIGGER credit_wallet_guard BEFORE UPDATE ON credit_wallets
WHEN NEW.principal_id IS NOT OLD.principal_id OR NEW.created_at IS NOT OLD.created_at OR NOT EXISTS (
  SELECT 1 FROM credit_ledger e WHERE e.wallet_id=OLD.principal_id AND e.sequence=OLD.version+1
    AND NEW.version=e.sequence AND NEW.balance=e.resulting_balance
    AND NEW.balance=OLD.balance+e.applied_amount AND NEW.updated_at=e.created_at
)
BEGIN SELECT RAISE(ABORT,'credit_wallet_requires_ledger'); END;
--> statement-breakpoint
CREATE TRIGGER credit_ledger_apply AFTER INSERT ON credit_ledger
BEGIN
  UPDATE credit_wallets SET balance=NEW.resulting_balance,version=NEW.sequence,updated_at=NEW.created_at WHERE principal_id=NEW.wallet_id;
END;
--> statement-breakpoint
CREATE TRIGGER credit_ledger_no_update BEFORE UPDATE ON credit_ledger
BEGIN SELECT RAISE(ABORT,'credit_ledger_append_only'); END;
--> statement-breakpoint
CREATE TRIGGER credit_ledger_no_delete BEFORE DELETE ON credit_ledger
BEGIN SELECT RAISE(ABORT,'credit_ledger_append_only'); END;
--> statement-breakpoint
CREATE TRIGGER credit_wallet_no_delete BEFORE DELETE ON credit_wallets
BEGIN SELECT RAISE(ABORT,'credit_wallet_audit_required'); END;
