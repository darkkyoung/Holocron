CREATE TABLE `assistant_admissions` (
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
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`principal_id`) REFERENCES `credit_principals`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "assistant_hashes" CHECK(length("assistant_admissions"."session_hash")=64 AND length("assistant_admissions"."network_hash")=64 AND length("assistant_admissions"."input_hmac")=64),
	CONSTRAINT "assistant_cost" CHECK(typeof("assistant_admissions"."reserved_cost_micros")='integer' AND "assistant_admissions"."reserved_cost_micros" BETWEEN 0 AND 2000000 AND ("assistant_admissions"."actual_cost_micros" IS NULL OR (typeof("assistant_admissions"."actual_cost_micros")='integer' AND "assistant_admissions"."actual_cost_micros" BETWEEN 0 AND "assistant_admissions"."reserved_cost_micros"))),
	CONSTRAINT "assistant_action" CHECK(("assistant_admissions"."action"='retrieve' AND "assistant_admissions"."weight"=0 AND "assistant_admissions"."principal_id" IS NULL AND "assistant_admissions"."debit_entry_id" IS NULL AND "assistant_admissions"."state"='completed' AND "assistant_admissions"."reserved_cost_micros"=0) OR ("assistant_admissions"."action" IN ('qa','planner','draft') AND "assistant_admissions"."weight"=IIF("assistant_admissions"."action"='qa',1,4) AND "assistant_admissions"."principal_id" IS NOT NULL AND "assistant_admissions"."debit_entry_id" IS NOT NULL)),
	CONSTRAINT "assistant_state" CHECK("assistant_admissions"."state" IN ('started','completed','failed','refund_pending')),
	CONSTRAINT "assistant_time" CHECK(typeof("assistant_admissions"."created_at")='integer' AND typeof("assistant_admissions"."lease_expires_at")='integer' AND typeof("assistant_admissions"."expires_at")='integer' AND "assistant_admissions"."created_at">=0 AND "assistant_admissions"."expires_at">"assistant_admissions"."created_at")
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_created` ON `assistant_admissions` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_assistant_session` ON `assistant_admissions` (`session_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_assistant_network` ON `assistant_admissions` (`network_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_assistant_expiry` ON `assistant_admissions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_credit_ledger_reference` ON `credit_ledger` (`reference_type`,`reference_id`);