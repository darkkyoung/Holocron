CREATE TABLE `auth_accounts` (
	`provider` text NOT NULL,
	`provider_subject` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`provider`, `provider_subject`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_auth_accounts_user` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`operation` text NOT NULL,
	`kind` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`requested_amount` integer NOT NULL,
	`applied_amount` integer NOT NULL,
	`resulting_balance` integer NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`original_entry_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`wallet_id`) REFERENCES `credit_wallets`(`principal_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`original_entry_id`) REFERENCES `credit_ledger`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "credit_ledger_bounds" CHECK(typeof("credit_ledger"."sequence")='integer' AND "credit_ledger"."sequence" BETWEEN 1 AND 9007199254740991 AND typeof("credit_ledger"."requested_amount")='integer' AND "credit_ledger"."requested_amount" BETWEEN -9007199254740991 AND 9007199254740991 AND typeof("credit_ledger"."applied_amount")='integer' AND "credit_ledger"."applied_amount" BETWEEN -9007199254740991 AND 9007199254740991 AND typeof("credit_ledger"."resulting_balance")='integer' AND "credit_ledger"."resulting_balance" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "credit_ledger_direction" CHECK(("credit_ledger"."operation"='credit' AND "credit_ledger"."requested_amount">0 AND "credit_ledger"."applied_amount" BETWEEN 0 AND "credit_ledger"."requested_amount" AND "credit_ledger"."original_entry_id" IS NULL) OR ("credit_ledger"."operation"='debit' AND "credit_ledger"."requested_amount"<0 AND "credit_ledger"."applied_amount"="credit_ledger"."requested_amount" AND "credit_ledger"."original_entry_id" IS NULL) OR ("credit_ledger"."operation"='refund' AND "credit_ledger"."requested_amount">0 AND "credit_ledger"."applied_amount" BETWEEN 0 AND "credit_ledger"."requested_amount" AND "credit_ledger"."original_entry_id" IS NOT NULL) OR ("credit_ledger"."operation"='claim' AND "credit_ledger"."requested_amount"=0 AND "credit_ledger"."applied_amount"=0 AND "credit_ledger"."original_entry_id" IS NULL)),
	CONSTRAINT "credit_ledger_metadata" CHECK(length("credit_ledger"."kind") BETWEEN 1 AND 64 AND length("credit_ledger"."idempotency_key") BETWEEN 1 AND 200 AND (("credit_ledger"."reference_type" IS NULL AND "credit_ledger"."reference_id" IS NULL) OR ("credit_ledger"."reference_type" IS NOT NULL AND "credit_ledger"."reference_id" IS NOT NULL AND length("credit_ledger"."reference_type") BETWEEN 1 AND 64 AND length("credit_ledger"."reference_id") BETWEEN 1 AND 200)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_ledger_key` ON `credit_ledger` (`wallet_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_ledger_sequence` ON `credit_ledger` (`wallet_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_credit_ledger_original` ON `credit_ledger` (`original_entry_id`);--> statement-breakpoint
CREATE TABLE `credit_principals` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`guest_key_hash` text,
	`user_id` text,
	`created_at` text NOT NULL,
	`retired_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "credit_principal_identity" CHECK(("credit_principals"."type"='guest' AND "credit_principals"."guest_key_hash" IS NOT NULL AND length("credit_principals"."guest_key_hash")=64 AND "credit_principals"."user_id" IS NULL) OR ("credit_principals"."type"='account' AND "credit_principals"."user_id" IS NOT NULL AND "credit_principals"."guest_key_hash" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_guest_key` ON `credit_principals` (`guest_key_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_user` ON `credit_principals` (`user_id`);--> statement-breakpoint
CREATE TABLE `credit_wallets` (
	`principal_id` text PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`principal_id`) REFERENCES `credit_principals`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "credit_balance_safe" CHECK(typeof("credit_wallets"."balance")='integer' AND "credit_wallets"."balance" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "credit_version_safe" CHECK(typeof("credit_wallets"."version")='integer' AND "credit_wallets"."version" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
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
      AND NEW.applied_amount=CASE WHEN NEW.requested_amount>0 AND p.type='guest' THEN min(NEW.requested_amount,10-w.balance) ELSE NEW.requested_amount END
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
