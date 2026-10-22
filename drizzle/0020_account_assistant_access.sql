-- Explicit account policy: zero network hash means NOT OBSERVED, never an Account hash.
ALTER TABLE assistant_admissions ADD COLUMN security_policy text NOT NULL DEFAULT 'edge-v1' CHECK(security_policy IN ('edge-v1','account-v1'));
--> statement-breakpoint
CREATE INDEX idx_assistant_principal ON assistant_admissions(principal_id,created_at);
--> statement-breakpoint
CREATE TABLE assistant_searches (
 request_id text PRIMARY KEY NOT NULL,
 principal_id text NOT NULL REFERENCES credit_principals(id),
 input_hmac text NOT NULL CHECK(length(input_hmac)=64),
 owner_token text NOT NULL,
 state text NOT NULL CHECK(state IN ('started','completed','failed')),
 result_cipher text,
 charged integer NOT NULL DEFAULT 0 CHECK(charged IN (0,1)),
 debit_entry_id text,
 created_at integer NOT NULL,
 lease_expires_at integer NOT NULL,
 result_expires_at integer NOT NULL,
 CHECK(charged=0 OR (state='completed' AND debit_entry_id IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX idx_assistant_search_principal ON assistant_searches(principal_id,created_at);
--> statement-breakpoint
CREATE INDEX idx_assistant_search_created ON assistant_searches(created_at);
--> statement-breakpoint
CREATE TRIGGER assistant_search_debit_guard BEFORE INSERT ON credit_ledger
WHEN NEW.reference_type='assistant_search'
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM assistant_searches s JOIN credit_principals p ON p.id=s.principal_id
  WHERE s.request_id=NEW.reference_id AND s.principal_id=NEW.wallet_id AND p.type='account' AND p.retired_at IS NULL
   AND s.state='completed' AND s.charged=1 AND s.result_cipher IS NOT NULL AND s.debit_entry_id=NEW.id
   AND NEW.operation='debit' AND NEW.kind='ai_spend' AND NEW.requested_amount=-1 AND NEW.applied_amount=-1
   AND NEW.idempotency_key='assistant:search:'||s.request_id
 ) THEN RAISE(ABORT,'invalid_search_debit') END;
END;
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
