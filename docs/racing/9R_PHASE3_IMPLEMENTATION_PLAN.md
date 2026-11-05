# Galactic Racing Phase 3 — staged implementation and acceptance

2026-11-05. **Design only; no Phase3 implementation or Production authorization.** Architecture: `9R_PHASE3_ARCHITECTURE.md`. Local v0.10 acceptance does not qualify the current complete-JSON prototype for live betting/broadcast.

## Delivery sequence and entry gates

| Phase | Dependency / deliverable | Complexity and main risk | Required evidence | Production authority |
|---|---|---|---|---|
|3-A domain/data|Approved integration baseline; frozen seasons/races/rosters/version registry, stage generation API, commitments, SQL draft/migrations in isolated DB|High: version preservation, seed fairness, schema drift|Old-engine Goldens, schema constraints, clean/upgrade fixtures, same-input retry hashes|Separate approval; none granted here|
|3-B administration|3-A; regular/custom seasons, scheduling, roles/commands/audit, profiles|Medium-high: rerolls, privileged disclosure, slot conflicts|RBAC/CSRF/CAS/race-condition tests, seven-race creation idempotency|Separate deployment and operational approval|
|3-C broadcast/security|3-A and3-B; server clock, immutable slices, withheld future state, public player shell|High: cache leaks, timestamps, missed jobs, manual holds|Adversarial early-fetch tests, fake-clock schedule, reconnect/load/latency tests|Separate infra/secret/scheduler/public-visibility approval|
|3-D predictions/settlement|3-A/B/C proven; economy/terms approval and Credit capacity contract|Very high: partial debit, overflow, duplicate settlement and restore liabilities|Isolated D1 financial fault-injection + ledger audit and dry-run settlement rehearsal|Separate finance/policy/market opening approval; launch remains NO-GO|

3-A and3-B may ship internally with Racing public/market flags OFF after authorization.3-C can run spectator-only without3-D, reducing financial risk.3-D must never be enabled merely because the UI can show a prediction form. No new engine feature is a prerequisite for financial safety; pin an accepted version.

## Phase 3-A work packages

1. Reconcile source/main/free-AI0020 branch and actual deployment schema. Record a baseline decision; do not cherry-pick unreviewed Credit changes. Inventory journal, trigger definitions and immutable backup originals through approved management interfaces. If access remains unavailable, complete isolated design work but block Production.
2. Define bounded domain schemas: timezone-aware schedule conversion,8distinct entrants, track/engine content hashes, laps1..30, points/tie-break revision and custom season rules. Validate all settings before freezing.
3. Split versioned qualifying and main generation entrypoints, retaining the monolithic offline adapter. Prove stage composition matches old full records with pinned entropy. No old Golden updates. Separate the main seed from publicly revealed qualifying data.
4. Implement single-generation input manifest, entropy commitment and immutable outputs in an isolated runner. Decide after-close preparation versus strict-start generation with fixed delay, and independently auditable entropy source. Approval gate before live use.
5. Implement repository constraints/CAS and durable result/audit manifests. Generated SQL must be reviewed against real D1 behavior, including zero-row writes, trigger failures and batch rollback. No hand-created production tables.
6. Extend backup schema in a new version only when schema finalized. Preserve v1–v12 contracts; include durable racing liabilities later without exposing private seeds or credentials. Validate oversize rejection and matching private-object manifest.

Acceptance examples: duplicate season jobs produce one season/seven races; custom3-day season valid;7/9racers rejected; same regular-slot collision rejected; sealed profile edit cannot affect results; changed engine hash rejected; exact seed replay retained across restarts; timeout retry reproduces identical output; conflicting output quarantined; no caller can choose a seed after seeing a result; retired racer history remains resolvable.

## Phase 3-B work packages

1. Reuse current server admin authentication, not LOCAL DEMO ADMIN. Add least-privilege racing roles and audit every mutation; ordinary operations staff cannot inspect sealed outcomes/entropy.
2. Draft/publish regular and custom season screens with explicit KST/UTC times, validation and preview. A separate “seal” review fixes entrants, versions, economics and market deadlines.
3. Reservation command: unique regular slot and broadcast window conflict checks; safe retries. Next-season automatic job creates draft deterministically, publishes only a validated roster.
4. Per-race controls show state, latest error, lease and hashes. Retry means same committed inputs; no “regenerate until acceptable” button. Cancellation is audited and moves dependent markets to refund-required state, not deletion.
5. Profile/track management creates revisions; current season snapshots stay unchanged. Image validation/remote loading policy must be reviewed for server-side fetch safety before adding any image proxy.

Acceptance examples: stale expectedRevision409; double-click command one audit/effect; Account without admin403; altered owner in JSON ignored/rejected; CSRF rejected; retry after lost response returns same operation; regular manual start at20:59 rejected; custom manual start rejected with an open market; cancellation afterFINAL enters dispute workflow rather than overwriting results.

## Phase 3-C work packages

1. Provision only after approval: private artifact store, runner/queue/reconciliation ownership, service roles. First measure bounded simulation CPU/memory at30laps against the chosen runtime's real quotas. If a single Worker invocation is unsuitable, use a dedicated isolated job runner; do not increase public request limits blindly.
2. Server schedule reducer uses persisted UTC anchors, idempotent command log and strict market cutoff. No changes to news collection triggers. Cron wakes due work; clock arithmetic controls broadcast phase.
3. Versioned public projection strips future frames, qualifying records, future camera reasons, final results, hidden DSQ and seeds. Authorized immutable chunks plus no-store manifest; test cache behavior through an actual isolated CDN preview.
4. Player streaming adapter reuses rendering/presentation but accepts only available chunks. Buffer underrun freezes safely; reconnect uses watermark/timeline hash; arbitrary server timestamps in requests do not increase access. Local pause/replay and live-edge recovery stay separate.
5. Enforce same schedule on multiple clients with skewed wall clocks. Native background-tab throttling must not change server-authorized progress. Never transmit full local JSON as a live fallback.

### Virtual clock and disclosure matrix

| Scenario | Required result |
|---|---|
|19:59:59.999 →20:00|Q begins at stored anchor; repeat cron no duplicate|
|20:54:59.999 versus20:55:00.000|Accept only transaction evaluated before cutoff; delayed request rejected|
|Q manual hold and no operator|Auto release once after15s+at most300s; no schedule extension|
|Hold crossing hard cutoff|Main schedule takes precedence; missing validated grid triggers incident|
|20:58 with120s;20:59:55|Preshow/countdown start at anchors, official elapsed remains0|
|21:00:00 with delayed scheduler|Race phase derives from anchor; cannot restart at job-delivery time|
|Client clock±24h; forged serverNow|No future data, no deadline bypass|
|Repeated/lost/out-of-order chunks|Hash/order verified, no recompute, bounded buffer|
|DSQ before alert/evidence/verdict|No special flag/evidence/reclassified podium in APIs, cues, errors or caches|
|Authenticated admin ordinary role|Same outcome-secrecy boundary as viewer|
|Reveal boundary request in another region|Primary/watermark check; stale response can under-release only|
|Back/forward seek or reconnect|Same authorized frames and camera; no state mutation|
|Full replay download|Only after official publication; content hashes match sealed manifest|

Security regression must inspect HTTP payloads, network caches, static bundles, source maps, logs, ETags, object URLs and error shapes—not just DOM visibility. Simulate concurrent read/write/reveal requests around each millisecond boundary. A trusted release clock and content service failure must fail closed; monitoring flags missed deadlines, hash mismatches and buffer starvation.

## Phase 3-D work packages

1. Approve pool policy revision: retention/sink, min/max stake, total market and per-owner caps, no-winner handling, cancellation and exact refund semantics, championship and tie rules. Terms/age/legal/privacy review is an independent release gate; no policy numbers are silently chosen here.
2. Generalize Credit capacity reservations with Assistant compatibility. Design exact racing refund and payout obligations, integer/sequence headroom, concurrent rewards and retired-owner recovery. Existing partial-refund behavior is immutable for old history. If exact liabilities cannot be honored, do not open markets.
3. Build acceptance batch with owner/Origin/UUID, immutable pick and DB-side close predicate. Persist intent/debit/receipt atomically with strict conditional gates. Never assume a0-row INSERT threw an error.
4. Freeze market pool atclose; derive deterministic payout obligations from official FINAL hash. BigInt rational rounding; deterministic remainder; total conservation. Complete obligations in bounded, idempotent batches with durable proof.
5. Recovery worker reconciles only existing obligations and Ledger entries, never generates a new request identity. Cancel/refund and settle cannot race to double-pay. Parent terminal state requires complete evidence, not lease expiration.
6. Run dry-run settlement against synthetic seasons and compare expected Ledger/Wallet invariants. No actual user balances or operational market until a separate controlled release approval.

### Financial fault-injection matrix

| Test | Invariant |
|---|---|
|Two devices/sameAccount/sameUUID|One pick, one debit, identical receipt|
|SameUUID/different racer or amount|409, no second mutation|
|DifferentUUID/sameAccount/market|One immutable pick; no second debit|
|AnotherAccount usesUUID|Owner isolation; no receipt leak|
|Insufficient balance/policy mismatch/late request|No prediction and no debit|
|Throw after each batch statement|Whole batch rollback; no orphan intent/debit|
|Conditional debit inserts0rows|No accepted prediction; no success receipt|
|Response lost aftercommit|Same-key recovery finds one persisted debit|
|Cancel races with finalization|Only one eligible terminal policy wins CAS|
|Settlement lease expires aftercredit|Retry uses same payout key and validates proof|
|Partial batch among10k predictions|Resume remaining obligations, no re-credit|
|DSQ changes provisional winner|Only reclassifiedFINAL hash used|
|Full refund atnearMAX_SAFE_INTEGER|Exact-capacity policy proven or remain pending; never falsely complete|
|Wallet sequence exhaustion + Assistant refund|Both liabilities reserved; neither starved|
|Guest migration/Account retirement|Defined authority/recovery, no wrong-wallet payout|
|Restore olderDB + newerprivateobjects|Manifest mismatch blocks publication/settlement|
|No winner/cancelled race|Approved refund rule, integer conservation, no sink surprise|
|Forged admin payout/result|Rejected; server-derived plan only|

Run existing `test:credit-foundation`, policy, refund-headroom, partial-refund, Account identity and backup suites plus new racing transactions. Verify entire old Wallet/Ledger/policy/month-cost row hashes across migrations in isolated fixtures. Test monetary conservation independently of implementation helpers. Financial tests must assert persisted DB state, not just HTTP200.

## Migration and release sequence (future, NOT executed)

1. Fresh source/tree/deployment identity and supported read-only production audit; journal and trigger proof; record unknowns explicitly.
2. Freeze Racing/market admissions, retain AI OFF/maintenance as separately governed; audit all existing obligations. Do not alter collection or AI policy for a Racing release.
3. Approved original pre-migration export, official validation/plan, file hash/counts and recoverability drill including private-object manifests. Confirm backup size limits and available recovery permissions.
4. Isolated clean install and exact deployed-baseline→candidate upgrade; fault injection; old durable row equality and FK/trigger/check audits. Assign additive migration numbers only now.
5. Separate approval for the reviewed migration/runtime pair and permissions. Execute official platform procedure only; never manually relabel migration journal, drop financial tables or restore an old schema as an ordinary rollback.
6. Deploy with Racing/markets OFF; compare actual deployed source tree to reviewed runtime tree, verify migration journal, old data and new backup contract. Read-only spectator acceptance before market-enabled acceptance.
7. Separate approval for server scheduling/public spectator release; separately approve controlled Credit market tests and later public rollout. No all-at-once activation.
8. Failure: stop new admissions/publication, preserve liabilities and evidence, run compatible OFF runtime or forward repair. Any restore is separately approved and includes unrelated HOLOCRON data reconciliation.

## Definition of ready and current decision

**GO for a future isolated Phase3-A implementation proposal** once v0.10 product acceptance is reviewed. **NO-GO for Production integration or Credit market operation now.** Missing gates: actual installed schema/journal metadata and approved current backup; chosen source integration baseline; sealed entropy/generation architecture approval; measured runner capacity; temporal API/cache security; Credit liability/capacity redesign; economic/terms/legal review; production permissions/recovery drill.

No migration number, new backup version number, production cost budget, real schedule or secret has been assigned by this document. Phase3-A may establish contracts without activating service. Gates3-C and3-D require independent evidence and explicit approvals.
