CREATE TABLE credit_policy_revisions (
 id TEXT PRIMARY KEY NOT NULL, version INTEGER NOT NULL CONSTRAINT policy_version_safe CHECK(typeof(version)='integer' AND version BETWEEN 1 AND 9007199254740991),
 policy_json TEXT NOT NULL CONSTRAINT policy_values_valid CHECK(COALESCE(json_valid(policy_json) AND json_type(policy_json)='object' AND json_type(policy_json,'$.qaCredits')='integer' AND json_extract(policy_json,'$.qaCredits') BETWEEN 1 AND 100 AND json_type(policy_json,'$.plannerCredits')='integer' AND json_extract(policy_json,'$.plannerCredits') BETWEEN 1 AND 100 AND json_type(policy_json,'$.guestFirst')='integer' AND json_extract(policy_json,'$.guestFirst') BETWEEN 1 AND 10 AND json_type(policy_json,'$.opening')='integer' AND json_extract(policy_json,'$.opening') BETWEEN 1 AND 10 AND json_type(policy_json,'$.attendanceDaily')='integer' AND json_extract(policy_json,'$.attendanceDaily') BETWEEN 1 AND 10 AND json_type(policy_json,'$.attendanceDay7')='integer' AND json_extract(policy_json,'$.attendanceDay7') BETWEEN 1 AND 10 AND json_type(policy_json,'$.quizCorrect')='integer' AND json_extract(policy_json,'$.quizCorrect') BETWEEN 1 AND 10 AND json_type(policy_json,'$.accountFirst')='integer' AND json_extract(policy_json,'$.accountFirst') BETWEEN 1 AND 10 AND json_type(policy_json,'$.monthlyLimitUsd')='integer' AND json_extract(policy_json,'$.monthlyLimitUsd') BETWEEN 1 AND 1000 AND json_type(policy_json,'$.monthlyWarningUsd')='integer' AND json_extract(policy_json,'$.monthlyWarningUsd') BETWEEN 1 AND 1000 AND json_extract(policy_json,'$.monthlyWarningUsd')<=json_extract(policy_json,'$.monthlyLimitUsd'),0)), previous_json TEXT,
 changed_at TEXT NOT NULL, actor TEXT NOT NULL CONSTRAINT policy_actor_valid CHECK(actor IN ('system','admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX credit_policy_revisions_version_unique ON credit_policy_revisions(version);
--> statement-breakpoint
INSERT INTO credit_policy_revisions VALUES ('credit-policy-default-v1',1,'{"qaCredits":5,"plannerCredits":7,"guestFirst":1,"opening":1,"attendanceDaily":1,"attendanceDay7":5,"quizCorrect":3,"accountFirst":3,"monthlyLimitUsd":30,"monthlyWarningUsd":20}',NULL,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'system');
--> statement-breakpoint
CREATE TRIGGER credit_policy_insert_guard BEFORE INSERT ON credit_policy_revisions BEGIN
 SELECT RAISE(ABORT,'credit_policy_revision_conflict') WHERE NOT EXISTS (SELECT 1 FROM credit_policy_revisions) OR NEW.actor<>'admin' OR NEW.version<>(SELECT max(version)+1 FROM credit_policy_revisions)
 OR NEW.previous_json IS NOT (SELECT policy_json FROM credit_policy_revisions ORDER BY version DESC LIMIT 1)
 OR (SELECT count(*) FROM json_each(NEW.policy_json))<>10
 OR NEW.changed_at<(SELECT changed_at FROM credit_policy_revisions ORDER BY version DESC LIMIT 1);
END;
--> statement-breakpoint
CREATE TRIGGER credit_policy_no_update BEFORE UPDATE ON credit_policy_revisions BEGIN SELECT RAISE(ABORT,'credit_policy_append_only'); END;
--> statement-breakpoint
CREATE TRIGGER credit_policy_no_delete BEFORE DELETE ON credit_policy_revisions BEGIN SELECT RAISE(ABORT,'credit_policy_append_only'); END;
--> statement-breakpoint
CREATE TABLE assistant_monthly_costs (
 month TEXT PRIMARY KEY NOT NULL CONSTRAINT monthly_period_valid CHECK(length(month)=7 AND month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(month,6,2) BETWEEN '01' AND '12'),
 reserved_micros INTEGER NOT NULL CONSTRAINT monthly_reserved_micros_safe CHECK(typeof(reserved_micros)='integer' AND reserved_micros BETWEEN 0 AND 9007199254740991),
 reconciled_reserved_micros INTEGER NOT NULL CONSTRAINT monthly_reserved_micros_safe CHECK(typeof(reserved_micros)='integer' AND reconciled_reserved_micros BETWEEN 0 AND reserved_micros),
 actual_micros INTEGER NOT NULL CONSTRAINT monthly_actual_micros_safe CHECK(typeof(actual_micros)='integer' AND actual_micros BETWEEN 0 AND reconciled_reserved_micros),
 attempts INTEGER NOT NULL CONSTRAINT monthly_attempts_safe CHECK(typeof(attempts)='integer' AND attempts BETWEEN 1 AND 9007199254740991),
 known_attempts INTEGER NOT NULL CONSTRAINT monthly_attempts_safe CHECK(typeof(attempts)='integer' AND known_attempts BETWEEN 0 AND attempts)
);
--> statement-breakpoint
-- Retained admissions only. Deleted pre-0019 costs cannot be reconstructed.
INSERT INTO assistant_monthly_costs
 SELECT strftime('%Y-%m',(created_at/1000)+32400,'unixepoch'),sum(reserved_cost_micros),
 sum(IIF(actual_cost_micros IS NOT NULL,reserved_cost_micros,0)),sum(COALESCE(actual_cost_micros,0)),count(*),sum(actual_cost_micros IS NOT NULL)
 FROM assistant_admissions WHERE action<>'retrieve' GROUP BY strftime('%Y-%m',(created_at/1000)+32400,'unixepoch');
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
CREATE TRIGGER assistant_month_no_delete BEFORE DELETE ON assistant_monthly_costs BEGIN SELECT RAISE(ABORT,'assistant_month_history_retained'); END;
--> statement-breakpoint
CREATE TRIGGER assistant_month_monotonic BEFORE UPDATE ON assistant_monthly_costs BEGIN
 SELECT RAISE(ABORT,'assistant_month_history_monotonic') WHERE NEW.month<>OLD.month OR NEW.reserved_micros<OLD.reserved_micros
 OR NEW.reconciled_reserved_micros<OLD.reconciled_reserved_micros OR NEW.actual_micros<OLD.actual_micros
 OR NEW.attempts<OLD.attempts OR NEW.known_attempts<OLD.known_attempts;
END;
