# D1 backup and restore foundation

D1 remains the runtime source of truth. This is a manual, versioned logical export,
not a second database. No restore executor, upload/apply route, automatic backup,
external storage or environment-secret export exists.

## 2026-10-16 B.3 compatibility checkpoint

No format, marker, dataset, validator or planner changes: v1–v5 retain exact historical contracts, current canonical v5/0017 includes fourteen durable datasets and excludes `assistant_admissions`. Existing Guest requested/applied capacity-clamped refunds already validate. Account partial refunds do **not** satisfy v4/v5 ledger audits; tests explicitly reject an otherwise balanced such artifact. A future authorized trigger change therefore needs a deliberately versioned backup contract, preserving historical validation. None was made here.

B.3 supersedes the older refund/retention descriptions below: a legally recorded refund consuming the full requested entitlement is terminal even if its applied amount is smaller or zero. Its forfeited remainder is not an outstanding obligation. Cleanup may delete its operational row after generation expiry (48 hours from creation), at most 100 expired rows per admission; durable ledger amounts and replay protection remain. Missing settlement entries, including unsupported Account overflow, remain pending and must not be purged. Lazy cleanup does not guarantee physical deletion at exactly 48 hours. Sequence reservations remain; balance reservations were removed. Operational-loss/restore limitations below are unchanged. [B.3 evidence](devlog/2026-10-16-assistant-capacity-first-refunds.md).

## Download

Sign into the HOLOCRON administrator account on the existing Site. The owner reports the Site itself is now public; the backup route remains administrator-only.
In Control Room, use **D1 백업 다운로드** under DATA BACKUP. The browser sends
`POST /api/admin/backup` with the existing signed HttpOnly admin session and same
origin. The route performs only reads, validates the complete artifact, and returns
an attachment. Failures show a message and return no backup attachment. Public or
unauthenticated requests are denied on the server. No request SQL, table selector,
filter or uploaded payload is accepted.

Responses (including errors) use `Cache-Control: private, no-store`, `Vary: Cookie`
and `X-Content-Type-Options: nosniff`. Successful responses are UTF-8 JSON with a
filename-safe UTC `holocron-backup-...json` attachment name. JSON is downloaded as
a Blob, not rendered in the page.

## Artifact v5 (canonical), with historical v1/v2/v3/v4 support

- `format`: `holocron-d1-backup`
- `version`: `5` (independent of the migration marker)
- `application`: `HOLOCRON`
- `createdAt`: UTC ISO timestamp at export request start, before the D1 batch
- `schema.latestMigration`: `0017_assistant_admissions.sql`
- `consistency`: `d1-read-batch`
- `tables`: raw SQL column names and values, including nullable columns
- `counts`: exact row count for every included dataset, including empty datasets

No checksum, signature or HMAC is used. Validation is not authorization or proof
of provenance. The marker describes the application schema contract, not a read
of D1 migration history. Tests compare the explicit fields and marker against all
current migrations; future schema changes must deliberately revise this contract.

## Data classification

| Included table | Purpose | Ordering |
| --- | --- | --- |
| articles | All statuses, content and manual overrides | id |
| works | Works archive and references | id |
| quizzes | Quiz definitions | id |
| quiz_options | Quiz choices and answers | quiz_id, position, id |
| quiz_responses | Historical participation | quiz_id, session_hash |
| beta_analytics_daily_sessions | Beta records | period, day, route, session_hash |
| feedback_sessions | Existing pseudonymous session/admin history | session_hash |
| settings | Only the five keys below | key |
| article_work_relations | Automatic links and authoritative manual links/exclusions | article_id, work_id |
| users | Internal user ID and creation time | id |
| auth_accounts | Minimal provider linkage, no OAuth tokens/profile | provider, provider_subject |
| credit_principals | Guest digest or internal account ownership; retirement | id |
| credit_wallets | Materialized balance and ledger sequence | principal_id |
| credit_ledger | Append-only requested/applied effects, idempotency and references | wallet_id, sequence |

Historical v1 artifacts retain their exact eight-dataset contract and marker
`0013_loving_silver_fox.sql`. Both CLI commands validate and inspect v1 unchanged.
The actual verified v1 artifact remains valid. New canonical exports emit v5; a v1
artifact containing the new dataset is rejected rather than silently redefined.
V2, v3, v4 and v5 validation reject orphan Article/Work references, duplicate composite keys,
invalid state/origin, and automatic exclusions (only manual exclusions are valid).

### Featured metadata and historical restore plans

V3 Works rows add nullable TEXT `creator_credit`, `principal_cast`, `synopsis`, and `release_context`. Cast is a validated JSON array (maximum eight unique nonblank names, each at most 100 characters). Other limits follow the protected Works editor (240/1,500/120 characters). The additive migration does not populate or replace existing Works.

Historical v2 retains marker `0014_article_work_relations.sql`, its exact nine datasets and the old Works row shape. Historical v1 retains marker `0013_loving_silver_fox.sql` and its exact eight datasets. Validation and serialization select definitions by artifact version; new columns in old versions are rejected.

Dry-run plans for v1/v2 explicitly report `workMetadataDefaults` with all four new columns set to null. V1 also plans zero article-work relations; v2 preserves its relation rows. V3 preserves saved metadata and relations. No restore executor or Production restore is introduced. All versions retain the same settings allowlist and operational/security exclusions. Historical v3 retains marker `0015_featured_work_metadata.sql`, its exact nine datasets and Featured metadata. V4 adds five Account/Credit datasets, validates their foreign/unique references and ledger effects, and preserves zero-row foundation exports. No real historical artifact is changed.

| Excluded table | Reason |
| --- | --- |
| collection_locks | Stale leases must never be replayed |
| admin_login_rate_limits | Temporary authentication security state |
| feedback_rate_limits | Temporary cooldown state |

No dynamic table discovery/export is performed. All table and column names are
server-owned constants. Unknown future tables/columns require explicit review.

### Every known settings key

| Key | Class | Backup |
| --- | --- | --- |
| public_site_copy_v1 | A: durable product configuration | Include |
| public_roadmap_copy_v1 | A: durable product configuration | Include |
| collection_sources_v1 | A: durable product configuration | Include |
| collection_schedule_v1 | A: durable schedule configuration | Include |
| beta_analytics_start_at | B: durable Beta project record | Include |
| collection_schedule_state_v1 | C: last execution state | Exclude |
| metadata_recovery_cursor_v1 | C: recovery cursor | Exclude |
| collection_maintenance_editorial_v1 | C: maintenance marker | Exclude |
| collection_source_health_v1 | D: regeneratable observability | Exclude |
| last_collection | D: regeneratable observability | Exclude |
| admin | Legacy security configuration, outside durable product state; present in live D1 | Exclude |
| admin_identity_v2 | Legacy security identity documented in README | Exclude |

The ten active source keys are classified above. The legacy `admin` key was also
observed in live D1; its value is not inspected, printed or exported by the backup
implementation. Unknown keys are excluded by default. Settings queries read only
allowlisted values, never the entire settings table. Missing allowlisted keys are
valid and retain their absence, so application defaults continue to apply.

## Completeness, memory and consistency

Current pre-implementation live data was approximately 161 articles, 49 works,
1 quiz, 4 options, 41 responses, 1,533 analytics rows and 3 feedback sessions.
The largest dataset (analytics) was roughly 384k JSON characters.

One fixed `D1Database.batch()` contains a count/byte-budget query and guarded row
query for each of the fourteen datasets (28 read statements total). D1 documents
batch statements as a transaction, executed sequentially and non-concurrently:
https://developers.cloudflare.com/d1/worker-api/d1-database/#batch

This implementation does not invent `BEGIN`/`COMMIT` support in the Worker API,
open separate paginated reads, or acquire/mutate a collection lock. Counts and
rows are read in one batch. Relationships are checked before returning the file.
It exports state visible to that batch, not a historical database restore point;
`createdAt` is a request timestamp, not an exact database snapshot timestamp.
It does not coordinate external systems, caches, publisher images or secrets.

Each dataset has a hard limit of **5,000 rows and 1 MiB of SQL JSON row bytes**.
The SQL guards check both before returning row payloads. `LIMIT 5001` is a defense
in depth, never a successful truncation: observed counts must equal exported rows.
The final artifact is limited to 16 MiB (JSON escaping can increase byte size).
If a guard, count check, D1 request, relation check or serialization limit fails,
the entire export fails explicitly. No partial artifact is labelled valid.
If the project outgrows these limits, implement a reviewed streaming/consistent
export design; do not silently lift the Worker memory safeguards or truncate.
D1 limits: https://developers.cloudflare.com/d1/platform/limits/

## Privacy and secrets

Provider subject identifiers, Guest digests and Credit history are private pseudonymous account data. Raw Guest identifiers, signatures, cookies, signing secrets, OAuth tokens and profiles are absent. Backups must remain private; possessing a Guest digest does not authenticate a session. Existing session hashes, generated nicknames/tags, quiz choices and aggregate
Beta records are included; these remain pseudonymous data requiring private
storage. No new raw IP, cookie, email, name or browser fingerprint is collected.
Do not publish or commit a real backup. No payload is logged by export, validation
or dry-run. This is a logical DB export, not a backup of external feedback delivery
or externally hosted image bytes.

The exporter receives only the D1 binding. It never reads environment values.
`OPENAI_API_KEY`, deployment `OPENAI_MODEL`, `HOLOCRON_ADMIN_USERNAME`,
`HOLOCRON_ADMIN_PASSWORD`, `HOLOCRON_ADMIN_SESSION_SECRET`,
`HOLOCRON_SCHEDULER_SECRET`, `HOLOCRON_GUEST_SIGNING_SECRET`,
`HOLOCRON_ACCOUNT_SESSION_SECRET`, `HOLOCRON_GOOGLE_CLIENT_ID`, `HOLOCRON_GOOGLE_CLIENT_SECRET`, `TMDB_API_READ_ACCESS_TOKEN`, GitHub/Cloudflare/Sites
credentials and tokens are not backed up. Existing session verification still
uses the server-side session secret through the unchanged authentication module.
The export is not a generic content-secret scanner: administrators must not put
credentials inside article text or durable public copy/configuration.

## Validate and dry-run

```sh
pnpm backup:validate /absolute/path/holocron-backup.json
pnpm backup:plan /absolute/path/holocron-backup.json
```

These local Node scripts share the pure TypeScript validator. They read only the
provided file and output counts/metadata or a plan, never the row payload. Neither
command connects to D1. Validation rejects malformed JSON/envelopes, unsupported
versions/schema markers, missing or extra datasets/columns, invalid field types,
missing or duplicate primary keys, unique article URLs/feedback tags, forbidden
settings, count mismatches, orphan quiz options/responses, and options belonging
to a different quiz. It preserves existing content rather than applying today's
UI business rules to historical records.

## Future restore semantics — NOT IMPLEMENTED

The pure `buildRestorePlan()` describes **FULL_DURABLE_STATE_REPLACE**. It emits
no executable SQL and has no DB dependency. Delete quiz responses before options
and quizzes; delete article-work relations before Articles/Works and insert them
after both parents. A v1 dry-run targeting the current schema explicitly plans
**zero article-work relations**: a future full replacement would clear any target
relations, including manual decisions, because v1 predates them. The plan preserves
the source version/marker and separately identifies the target schema and this
compatibility warning. It never manufactures or modifies the v1 input artifact.
Only allowlisted settings form the replacement
scope, including removing a currently present durable key if absent in backup.
Excluded/unknown settings are never blindly deleted as part of this plan.

A future implementation must validate the backup and target schema, show a
dry-run, require explicit operator confirmation, pause conflicting writers under
a reviewed procedure, create a fresh safety backup, atomically replace durable
state, establish fresh operational state without replaying old locks/rate limits,
invalidate caches, and verify integrity and product behavior. No Production
restore button, restore API, SQL executor or destructive restore exists today.


## Account/Credit restore boundary (v4)

V4 validation checks provider/user/principal/wallet links, nullable unique identity keys, exact wallet sequence continuity, nonnegative safe integer effects, Guest cap 10, same-wallet original-debit refund bounds and ledger/wallet equality. A zero-applied capped credit is still a consumed entry. V1/v2/v3 remain valid with their original markers/shapes; their full-replacement plans explicitly describe ZERO new Account/Credit datasets and warn about clearing any target Credit history. This is never silently executed.

Credit audit triggers intentionally prohibit normal ledger edits/deletes and wallet balance assignment. A future restore executor must use a separately approved exclusive maintenance procedure to handle these guards, recreate zero wallets, replay validated entries by per-wallet sequence and verify the resulting balances/versions. Plain insertion of a nonzero wallet is not a supported runtime path. Delete ordering is ledger → wallet → principal → user (provider links before user); insert ordering is the reverse dependency order. No such executor or guard-disable route exists.

Phase 9C.2-A private deployment and live v4 export acceptance are pending a current authenticated pre-migration backup. The previously accepted historical v1 artifact is not revalidated as a separate task; deterministic v1/v2/v3 regression fixtures remain in the normal suite.

C keeps **v4 / 0016** and the same fourteen datasets/settings allowlist. Account/provider/migration ledger rows are durable. Provider subjects accept the OIDC maximum of 255 characters; all historical v1/v2/v3 contracts stay exact. Account sessions, OAuth state/nonce/PKCE verifier, login receipts, authorization codes, ID/access/refresh tokens and secrets never enter D1 or export. Deterministic tests validate a snapshot containing actual locally migrated ledger rows and reject added security/token fields. No live backup/restore acceptance is implied.


## Phase 9D-B operational state exclusion

9D-B.2 changes neither migration bytes nor v1–v5 validation/export/plan contracts. Numeric refund liability is derived from the existing operational admission plus its durable debit/refund proof; it is not a second wallet or a new exported dataset. Operational state must still not be discarded while obligations remain. The restore limitation below continues to apply even though new supported Credit writes now preserve refund headroom. See [B.2 numeric and reward-policy status](devlog/2026-10-16-assistant-numeric-headroom.md).

Canonical v5 changes only the migration marker to `0017_assistant_admissions.sql`; the same fourteen durable datasets and Credit ledger audit rules are preserved. Historical v4 remains exactly `0016_account_credit_foundation.sql` with its existing fields. Production has not received this phase and continues its prior v4 export. No old artifact is relabeled.

`assistant_admissions` is excluded from export and dry-run restore: keyed abuse identifiers, quota/cost reservation, request/lease and settlement state are temporary operations, not user history. Do not replay these rows. Before any separately reviewed restore, quiesce AI and resolve outstanding spends; do not discard unresolved compensation while claiming recovery. Under 9D-B.1, new spending is Account-only, but Account numeric headroom can still block full refunds (see the [refund safety devlog](devlog/2026-10-16-assistant-refund-safety.md)); no live generation is enabled. Expired terminal rows are cleaned lazily, at most 100 per admission; started/refund-pending obligations are retained beyond 48 hours until resolved, potentially indefinitely. Failed terminal cleanup additionally requires durable proof of a full linked refund. Operational loss/restore while obligations remain is not a supported recovery path; the durable ledger does not establish valid delivery. No restore executor or Production restore was implemented. 9D-B.1 changes neither v5 nor the historical v1–v4 contracts.
