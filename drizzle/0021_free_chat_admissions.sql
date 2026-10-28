-- Rebuild only the operational admissions table. Execute as one D1 migration transaction.
-- Copy BEFORE recreating reservation triggers: historical monthly costs must not double.
--> statement-breakpoint
DROP TRIGGER "assistant_month_budget_guard";
--> statement-breakpoint
DROP TRIGGER "assistant_month_reserve";
--> statement-breakpoint
DROP TRIGGER "assistant_cost_identity_guard";
--> statement-breakpoint
DROP TRIGGER "assistant_month_reconcile";
--> statement-breakpoint
DROP TRIGGER "assistant_security_policy_insert";
--> statement-breakpoint
DROP TRIGGER "assistant_security_policy_immutable";
--> statement-breakpoint
CREATE TABLE `assistant_admissions_new` (
	`request_id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`session_hash` text NOT NULL,
	`network_hash` text NOT NULL,
	`input_hmac` text NOT NULL,
	`owner_token` text NOT NULL,
	`principal_id` text,
	`debit_entry_id` text,
	`weight` integer NOT NULL,
	`reserved_cost_micros` integer NOT NULL,
	`actual_cost_micros` integer,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`lease_expires_at` integer NOT NULL,
	`expires_at` integer NOT NULL, security_policy text NOT NULL DEFAULT 'edge-v1' CHECK(security_policy IN ('edge-v1','account-v1')),
	FOREIGN KEY (`principal_id`) REFERENCES `credit_principals`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "assistant_hashes" CHECK(length("assistant_admissions_new"."session_hash")=64 AND length("assistant_admissions_new"."network_hash")=64 AND length("assistant_admissions_new"."input_hmac")=64),
	CONSTRAINT "assistant_cost" CHECK(typeof("assistant_admissions_new"."reserved_cost_micros")='integer' AND "assistant_admissions_new"."reserved_cost_micros" BETWEEN 0 AND 2000000 AND ("assistant_admissions_new"."actual_cost_micros" IS NULL OR (typeof("assistant_admissions_new"."actual_cost_micros")='integer' AND "assistant_admissions_new"."actual_cost_micros" BETWEEN 0 AND "assistant_admissions_new"."reserved_cost_micros"))),
	CONSTRAINT "assistant_action" CHECK((action='chat' AND weight=1 AND principal_id IS NOT NULL AND debit_entry_id IS NULL) OR ("assistant_admissions_new"."action"='retrieve' AND "assistant_admissions_new"."weight"=0 AND "assistant_admissions_new"."principal_id" IS NULL AND "assistant_admissions_new"."debit_entry_id" IS NULL AND "assistant_admissions_new"."state"='completed' AND "assistant_admissions_new"."reserved_cost_micros"=0) OR ("assistant_admissions_new"."action" IN ('qa','planner','draft') AND "assistant_admissions_new"."weight"=IIF("assistant_admissions_new"."action"='qa',1,4) AND "assistant_admissions_new"."principal_id" IS NOT NULL AND "assistant_admissions_new"."debit_entry_id" IS NOT NULL)),
	CONSTRAINT "assistant_free_chat" CHECK(action<>'chat' OR (security_policy='account-v1' AND state<>'refund_pending' AND reserved_cost_micros>0)),
	CONSTRAINT "assistant_state" CHECK("assistant_admissions_new"."state" IN ('started','completed','failed','refund_pending')),
	CONSTRAINT "assistant_time" CHECK(typeof("assistant_admissions_new"."created_at")='integer' AND typeof("assistant_admissions_new"."lease_expires_at")='integer' AND typeof("assistant_admissions_new"."expires_at")='integer' AND "assistant_admissions_new"."created_at">=0 AND "assistant_admissions_new"."expires_at">"assistant_admissions_new"."created_at")
);
--> statement-breakpoint
INSERT INTO assistant_admissions_new SELECT * FROM assistant_admissions;
--> statement-breakpoint
DROP TABLE assistant_admissions;
--> statement-breakpoint
ALTER TABLE assistant_admissions_new RENAME TO assistant_admissions;
--> statement-breakpoint
CREATE INDEX `idx_assistant_created` ON `assistant_admissions` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_assistant_session` ON `assistant_admissions` (`session_hash`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_assistant_network` ON `assistant_admissions` (`network_hash`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_assistant_expiry` ON `assistant_admissions` (`expires_at`);
--> statement-breakpoint
CREATE TRIGGER assistant_month_budget_guard BEFORE INSERT ON assistant_admissions WHEN NEW.action<>'retrieve' BEGIN
 SELECT RAISE(ABORT,'assistant_month_budget_exhausted') WHERE NOT EXISTS (SELECT 1 FROM credit_policy_revisions) OR NEW.reserved_cost_micros>
 (SELECT json_extract(policy_json,'$.monthlyLimitUsd')*1000000 FROM credit_policy_revisions ORDER BY version DESC LIMIT 1)
 -COALESCE((SELECT reserved_micros-reconciled_reserved_micros+actual_micros FROM assistant_monthly_costs WHERE month=strftime('%Y-%m',(NEW.created_at/1000)+32400,'unixepoch')),0);
END;
--> statement-breakpoint
CREATE TRIGGER assistant_month_reserve AFTER INSERT ON assistant_admissions WHEN NEW.action<>'retrieve' BEGIN
 INSERT INTO assistant_monthly_costs VALUES(strftime('%Y-%m',(NEW.created_at/1000)+32400,'unixepoch'),NEW.reserved_cost_micros,
 IIF(NEW.actual_cost_micros IS NOT NULL,NEW.reserved_cost_micros,0),COALESCE(NEW.actual_cost_micros,0),1,IIF(NEW.actual_cost_micros IS NOT NULL,1,0))
 ON CONFLICT(month) DO UPDATE SET reserved_micros=reserved_micros+excluded.reserved_micros,
 reconciled_reserved_micros=reconciled_reserved_micros+excluded.reconciled_reserved_micros,actual_micros=actual_micros+excluded.actual_micros,
 attempts=attempts+1,known_attempts=known_attempts+excluded.known_attempts;
END;
--> statement-breakpoint
CREATE TRIGGER assistant_cost_identity_guard BEFORE UPDATE ON assistant_admissions BEGIN
 SELECT RAISE(ABORT,'assistant_cost_identity_immutable') WHERE NEW.created_at<>OLD.created_at OR NEW.reserved_cost_micros<>OLD.reserved_cost_micros
 OR NEW.action<>OLD.action OR NEW.debit_entry_id IS NOT OLD.debit_entry_id
 OR (OLD.actual_cost_micros IS NOT NULL AND NEW.actual_cost_micros IS NOT OLD.actual_cost_micros);
END;
--> statement-breakpoint
CREATE TRIGGER assistant_month_reconcile AFTER UPDATE OF actual_cost_micros ON assistant_admissions
 WHEN NEW.action<>'retrieve' AND OLD.actual_cost_micros IS NULL AND NEW.actual_cost_micros IS NOT NULL BEGIN
 UPDATE assistant_monthly_costs SET reconciled_reserved_micros=reconciled_reserved_micros+NEW.reserved_cost_micros,
 actual_micros=actual_micros+NEW.actual_cost_micros,known_attempts=known_attempts+1
 WHERE month=strftime('%Y-%m',(NEW.created_at/1000)+32400,'unixepoch');
 SELECT RAISE(ABORT,'assistant_month_missing') WHERE changes()<>1;
END;
--> statement-breakpoint
CREATE INDEX idx_assistant_principal ON assistant_admissions(principal_id,created_at);
--> statement-breakpoint
CREATE TRIGGER assistant_security_policy_insert BEFORE INSERT ON assistant_admissions
WHEN NEW.security_policy='account-v1'
BEGIN
 SELECT CASE WHEN NEW.action='retrieve' OR NEW.network_hash<>printf('%064d',0)
 OR NOT EXISTS(SELECT 1 FROM credit_principals WHERE id=NEW.principal_id AND type='account' AND retired_at IS NULL)
 THEN RAISE(ABORT,'invalid_account_admission') END;
END;
--> statement-breakpoint
CREATE TRIGGER assistant_security_policy_immutable BEFORE UPDATE ON assistant_admissions
WHEN NEW.security_policy<>OLD.security_policy OR NEW.principal_id IS NOT OLD.principal_id OR NEW.network_hash<>OLD.network_hash OR NEW.session_hash<>OLD.session_hash
BEGIN SELECT RAISE(ABORT,'assistant_identity_immutable'); END;
