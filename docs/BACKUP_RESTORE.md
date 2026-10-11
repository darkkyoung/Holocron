# D1 backup and restore foundation

D1 remains the runtime source of truth. This is a manual, versioned logical export,
not a second database. No restore executor, upload/apply route, automatic backup,
external storage or environment-secret export exists.

## Download

Sign into the existing private Site, then the HOLOCRON administrator account.
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

## Artifact v1

- `format`: `holocron-d1-backup`
- `version`: `1` (independent of the migration marker)
- `application`: `HOLOCRON`
- `createdAt`: UTC ISO timestamp at export request start, before the D1 batch
- `schema.latestMigration`: `0013_loving_silver_fox.sql`
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
query for each of the eight datasets (16 read statements total). D1 documents
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

Existing session hashes, generated nicknames/tags, quiz choices and aggregate
Beta records are included; these remain pseudonymous data requiring private
storage. No new raw IP, cookie, email, name or browser fingerprint is collected.
Do not publish or commit a real backup. No payload is logged by export, validation
or dry-run. This is a logical DB export, not a backup of external feedback delivery
or externally hosted image bytes.

The exporter receives only the D1 binding. It never reads environment values.
`OPENAI_API_KEY`, deployment `OPENAI_MODEL`, `HOLOCRON_ADMIN_USERNAME`,
`HOLOCRON_ADMIN_PASSWORD`, `HOLOCRON_ADMIN_SESSION_SECRET`,
`HOLOCRON_SCHEDULER_SECRET`, `TMDB_API_READ_ACCESS_TOKEN`, GitHub/Cloudflare/Sites
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
and quizzes; insert quizzes before options and responses. Other durable tables
have no schema dependencies. Only allowlisted settings form the replacement
scope, including removing a currently present durable key if absent in backup.
Excluded/unknown settings are never blindly deleted as part of this plan.

A future implementation must validate the backup and target schema, show a
dry-run, require explicit operator confirmation, pause conflicting writers under
a reviewed procedure, create a fresh safety backup, atomically replace durable
state, establish fresh operational state without replaying old locks/rate limits,
invalidate caches, and verify integrity and product behavior. No Production
restore button, restore API, SQL executor or destructive restore exists today.
