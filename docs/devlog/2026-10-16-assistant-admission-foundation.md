# Phase 9D-B — Atomic admission and Credit spend foundation

Date: 2026-10-16. Starting canonical main, freshly fetched: `6276ce913cfc9eddd9ff603d5880336285770342` (`Implement grounded archive retrieval and evidence receipts`). Canonical is the source of truth. This record belongs to the implementation commit; the exact final remote SHA is reported after normal push/refetch, rather than embedding a self-referential commit hash.

**Status: foundation implemented; full 9D-B acceptance BLOCKED by two existing Guest full-refund conflicts.** This is not a completed Guest spending product. No 9D-C work, generate endpoint, provider, assistant workspace, secret provisioning, Site deployment or Production SQL. The owner's public access change remains in effect; no hosting access was inspected or changed. Default flag remains false and the launcher remains COMING SOON. 9C.2 acceptance and identity/ledger invariants remain intact.

## Architecture and atomicity

- `limits.ts`: fixed Q&A 5 CR / weight 1, Planner 7 / weight 4, Full Draft 15 / weight 4. Revision remains reserved, rejected by this phase's action validator.
- `cost.ts`: required server-injected profile; token ceilings and integer micro-dollar rates, conservative BigInt ceiling arithmetic. No real model, provider price or fallback profile. Usage exceeding the validated ceilings is rejected, never silently discounted.
- `abuse-identity.ts`: dedicated `HOLOCRON_ASSISTANT_ABUSE_SECRET` (no real value provisioned). Domain-separated HMACs for session, normalized input and network identity. Only Cloudflare Request metadata plus `CF-Connecting-IP` is accepted; forwarded headers alone are insufficient. Tests explicitly inject synthetic identity. Current and previous UTC-day hashes preserve the rolling network window across midnight. Raw addresses are neither persisted nor logged.
- `admission-sql.ts` / `repository.ts`: parameterized conditional SQL admission and transactional settlement. No Worker-local quota map or JavaScript read/calculate/insert quota race.
- `credit.ts`: existing `prepareCreditMutation()` ledger INSERT with an optional trusted, internal SQL eligibility gate. No alternative wallet, changed cap, changed refund policy or trigger weakening. The D1 SQL still checks active owner, version, balance, original debit, idempotency and existing audit invariants.
- `admission.ts`: internal, disabled-by-default orchestration. Reuses the signed assistant session and `resolveCurrentCreditOwner()` (Account first, otherwise existing Guest). Reloads receipt-selected authoritative evidence before debit. Rejects unknown properties, caller prices/owners, revision and mismatched receipt modes. Input HMAC binds current owner, session, normalized query/filters, selected full-Story fingerprints and reviewed cost profile; no selected IDs or text are stored.
- `http.ts` / `config.ts`: free retrieval quota integration only, with the same disabled flag, safe private errors, `Vary: Cookie` and bounded 60-second `Retry-After`. Routes remain thin. Snapshot SELECTs remain read-only; the separate admission operation writes only operational metadata.

One D1 batch performs bounded cleanup, computes rejection, conditionally inserts the admission, executes the existing **gated** Credit debit, checks a SQL abort invariant, and reads the result. The invariant calls an invalid JSON expression on an inconsistent admission/debit pair, aborting the transaction. A zero-row conditional INSERT is explicitly a rejection, not successful admission or a thrown transaction error. A missing/no-op debit after an accepted admission aborts the entire batch. Ordinary quota, replay or insufficient-balance rejection has no new debit/admission. Batch rollback and a simulated lost response after commit are tested with real D1.

The request ID is unique in the operational table; spend uses `assistant:spend:<requestId>:<keyedInputHmac>` and durable `assistant_request` correlation in the existing ledger. Completed/cleaned-up generation IDs cannot initiate a second debit, even across owners, because the immutable ledger remains a replay fence. The keyed input digest in the existing durable idempotency key also rejects changed input/owner after operational cleanup. This is minimal audit/replay correlation, not stored query text or evidence history; no network/session digest is added to the ledger. A new lookup index on `(reference_type, reference_id)` avoids scanning the entire ledger for this fence. Existing rows/data are unchanged.

## Operational schema, quotas and settlement

New additive migration: `0017_assistant_admissions.sql`. One operational table (15 fields), four operational indexes and one ledger correlation lookup index. Six Wrangler-split statements, LF, no CASE token or new trigger. 0000–0016 are unchanged, including all Credit safety triggers. The 0016 SHA-256 remains `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea`. This respects the v77/v78 hosted parser incident and v79 correction; no hosted parser experiment occurred here.

Rows contain request/action, three keyed digests, a random worker ownership token, principal/debit correlation, weight, reserved/optional actual micro-dollar cost, state and creation/lease/expiry timestamps. They contain no wallet balance, raw browser cookie/IP, prompt, query, evidence, selected Story list, answer, provider response, OAuth identity or secret.

Limits: session 5/hour and 12/UTC day; network 30/hour and 80/day; global 200/day; admitted estimated budget 2,000,000 micro-dollars/day. Q&A weight 1, scripts 4. One active request per session **and principal**, three globally; 60-second leases. Retrieval separately allows session 10/minute, network 40/minute, global 200/minute, with no Credit resolution or mutation. Rolling windows are `(now-window, now]` for normal monotonic server time; future-dated existing rows are conservatively counted rather than releasing quota on clock rollback.

Lease expiry releases concurrency only. Started/pending requests retain conservative budget even across UTC days until resolved. Failed calls keep admission units. Known validated usage records actual estimated cost; unknown usage retains the full reservation. This is an application admission estimate, not an external invoice guarantee. There is no provider retry or background queue.

Duplicate active IDs return `REQUEST_IN_PROGRESS`, completed/expired records `RESULT_NOT_RETAINED`, and changed identity/input `REQUEST_CONFLICT`. Same input cannot call a provider twice through successful admission. No answers are retained. Owner-token compare-and-set makes success/cancellation races converge; late completion cannot complete an expired request or touch a newer lease. Explicit lazy recovery refunds expired work without invoking a provider. Successful committed completion is immutable; repeated success/failure cannot refund it. Actual HTTP delivery ambiguity and output/freshness validation remain 9D-C responsibilities and are not claimed as tested here.

Failure/cancel/recovery atomically transitions to `refund_pending`, prepares the existing linked refund only with full available headroom, and marks `failed` only after a complete matching refund exists. Concurrent calls append at most one refund. Success appends no refund. No historical entry is edited/deleted. All settlement functions are internal; no live public spending path exists.

## Hard Guest compensation blockers — reproduced, not waived

1. Guest 10 → AI debit 5 → reward 4 → balance 9. The protected Credit service's normal refund of 5 applies only **1** due to cap 10, while recording requested 5. This consumes refund entitlement without full recovery. The new orchestration instead writes **no partial refund** and returns `refund_pending`, balance still 9. If headroom later exists, a recovery attempt can refund all 5 exactly once; that does not satisfy an immediate-full-refund product guarantee.
2. Guest 10 → AI debit 5 → Account login transfers remaining 5 and grants first-login 3, then retires the Guest. The original debit belongs to the retired wallet. Existing refund rules cannot credit that wallet or redirect its linked refund to the Account. Result: Account 8 and `refund_pending`, not a claimed refund. Concurrent debit/login tests accept only the serial outcomes: migration first rejects the spend (Account 13), or spend first leaves the documented pending compensation (Account 8).

No migration/identity/cap/historical-ledger redesign was authorized or implemented. **Minimum safe product proposal for separate approval:** restrict initial paid AI to Accounts and keep Guest spending unavailable until a compensation policy is approved. This changes the requested Guest eligibility, so it is only a proposal, not silently implemented. If Guest Q&A is mandatory, a separately reviewed policy must define both capacity reservation during rewards and auditable compensation after retirement; cross-wallet transfer or cap-exempt refunds cannot be improvised under current guards.

Terminal retrieval rows expire after 10 minutes, terminal generation rows after 48 hours, cleanup at most 100 rows/admission, hard capacity 10,000 with fail-closed rejection. **Retention gate also remains blocked:** unresolved `started`/`refund_pending` rows are deliberately not purged at 48 hours, because discarding an unsettled debit would hide the obligation. This safety exception is not described as compliance with unconditional 48-hour retention. Recovery/policy must resolve it before live generation. No cron or permanent user history is introduced.

## Backup v5 / migration readiness

Canonical exports v5 with `0017_assistant_admissions.sql`; deployed Production remains its prior v4/0016 contract. Exactly the same 14 durable datasets and Credit audit checks as v4. Historical v1/v2/v3/v4 keep their exact markers, shapes and validator/CLI/dry-run support. `assistant_admissions` is explicitly excluded from export and restore plans. No restore executor. Future restore must quiesce AI and resolve outstanding spends before removing operational state; a durable ledger alone does not establish whether an uncertain provider output was delivered.

Clean 0000–0017 and upgrade from populated 0016 are locally exercised. New schema is locally migration-tested, **not authorized for Production deployment**. A later deployment needs separately authorized gates, fresh authenticated Production backup/validate/plan, hosted migration verification, immediate post-migration backup and legacy preservation. No Production backup was requested or consumed in this canonical-only phase.

## Validation record

Final local run: **44/44 `test:*` suites PASS**, followed by `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, and `git diff --check` all PASS. The new admission suite was rerun after the final shared-cap/stable-sort cleanup and still passed 254 assertions.

| Focused command | Evidence |
| --- | --- |
| `pnpm test:assistant-admission` | 254 assertions; real D1 clean 0000–0017 and populated 0016 upgrade, concurrent debits/admissions, 10/40/200 retrieval ceilings, rollback, lost commit response, replay after cleanup, leases, cancellation, refund races, privacy and v5 export |
| `pnpm test:assistant-retrieval` | 433 assertions; primary snapshot still performs zero writes, receipts/freshness, visibility, row/byte bounds, HTTP/config; separate retrieval admission is now operational |
| `pnpm test:backup` | 832 assertions; v1/v2/v3/v4/v5 validation and CLI validate/plan, exact fourteen durable datasets, exclusions and audit |
| `pnpm test:credit-migration-parser` | Protected 0016 LF, 19 statements, 8 triggers, 84 cap-equivalence cases; unchanged hash |
| `pnpm test:credit-foundation` | 103 assertions; existing concurrent ledger/wallet invariants |
| `pnpm test:guest-rewards` | 220 assertions; existing rewards/Quiz atomicity, caps and KST rules |
| `pnpm test:google-account` | 263 assertions; existing Account precedence, migration, continuity and v4 backup contract |
| `pnpm test:google-runtime` | Real local Worker fetch + RS256 checks; no live Google acceptance claimed |

The first full run exposed an old Guest rewards test fixture coupling `version:4` to the latest marker constant. The fixture now uses explicit `BACKUP_V4_MIGRATION`, preserving the historical contract; no validator relaxation. A second complete run passed all 44 suites. Google fixture was likewise pinned to its historical marker. The retrieval assertion count changes because HTTP tests now use the real admission-capable D1 binding; standalone five-read snapshot observation and zero-write assertions remain intact.

Full executed suite commands (each exit 0):

```sh
pnpm test:news-work
pnpm test:backup
pnpm test:stories
pnpm test:admin-overrides
pnpm test:collection
pnpm test:collection-health
pnpm test:backfill
pnpm test:ai-recovery
pnpm test:metadata-recovery
pnpm test:image-recovery
pnpm test:localization
pnpm test:admin-auth
pnpm test:admin-rate-limit
pnpm test:admin-ux
pnpm test:source-settings
pnpm test:story-stack
pnpm test:works
pnpm test:works-catalog
pnpm test:tmdb-importer
pnpm test:season-posters
pnpm test:season-catalog-maintenance
pnpm test:ai-placeholder
pnpm test:scheduled-collection
pnpm test:feedback
pnpm test:beta-analytics
pnpm test:title-override
pnpm test:news-explorer
pnpm test:floating-controls
pnpm test:site-copy
pnpm test:quiz
pnpm test:roadmap
pnpm test:roadmap-copy
pnpm test:public-performance
pnpm test:public-navigation
pnpm test:public-geometry
pnpm test:featured-work
pnpm test:credit-migration-parser
pnpm test:credit-foundation
pnpm test:guest-rewards
pnpm test:guest-credit-ui
pnpm test:google-account
pnpm test:google-runtime
pnpm test:assistant-retrieval
pnpm test:assistant-admission
```

Local ledger audit: wallet balance equals sum of applied ledger effects; wallet version equals entry count; every entry's resulting balance equals its cumulative sequence sum. **PASS**, including retired Guests, successful/failed operations and the deliberately reproduced capped-refund fixture. This confirms ledger integrity, not a full-refund product PASS.

Final 0017 packaged source SHA-256: `24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16`. Six local Wrangler statements; local upgrade preserves an existing setting and funded Account ledger. Hosted application remains NOT TESTED.

## Explicit NOT TESTED / next boundary

- Hosted 0017 parser/application, live D1 replicas and Worker delivery of trusted Request.cf metadata through the production framework.
- Real provider, current model/pricing/tokenizer, billing/cancellation, structured output/citation checks, HTTP delivery ambiguity or post-provider freshness. No provider credentials or calls exist in this phase.
- Production migration/backup/restore, real Credit spending/refunds, assistant desktop/mobile/browser UI; no workspace UI was added.
- Guest immediate full-refund acceptance and unconditional 48-hour cleanup are **BLOCKED**, not PASS.
- Site access remains as reported public; sharing and deployed version were untouched. Scheduler 401 was attributed by the owner to previous access restrictions; current collection health is not independently reverified and no scheduler changes were made.

Next work: resolve the specific 9D-B product compensation/retention gate, then separately authorize 9D-C bounded generation. **9D-C NOT STARTED.**
