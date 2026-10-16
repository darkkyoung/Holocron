# Phase 9D-B.3 — Capacity-first refund reconciliation

Date: 2026-10-16. Starting canonical, freshly fetched: `1e11abacb49c5741c117781d05b977db1405106b` (`Reserve numeric Credit capacity for outstanding AI refunds`). Remote main matched the supplied checkpoint. Final SHA is reported after normal canonical publication/refetch; the commit containing this record identifies the final tested tree without a self-referential hash.

**Status: authorized compatible changes implemented; Phase 9D-B remains BLOCKED on Account partial-refund schema/audit authorization.** No real provider, generation endpoint, assistant UI, Production deployment/migration/SQL/restore, secret, Site, access-policy or Sites-history change. AI remains disabled and COMING SOON. Account-only generation stays enforced in service and atomic admission/debit; Guest earning, free retrieval and core News/Works/Quiz remain unchanged. 9D-C NOT STARTED.

## Investigation and policy reconciliation

The approved B.3 policy supersedes B.1/B.2 full-compensation priority. Storage capacity wins; requested and applied refund amounts differ when necessary. A permitted partial refund consumes the entire requested entitlement, permanently forfeits the difference, and is terminal/idempotent even when applied=0. Later capacity must not cause an additional refund. Ordinary rewards must not reserve wallet balance for AI.

Applied 0016 already supports this for Guests: positive effects use `min(requested,10-balance)`. The refund guard consumes **requested** amounts against the original same-wallet debit, independently of actual applied amounts. Thus Guest balance 8/request 5 produces applied 2, balance 10, forfeited 3; balance 10/request 5 produces applied 0 and forfeited 5. Both still need a ledger entry and advance the wallet version. Guest AI admission remains denied; the Assistant compatibility fixtures use explicitly synthetic legacy admissions with audited debits, not a new Guest spending path.

For Accounts, 0016 instead requires **applied=requested**, with safe integer CHECK constraints on the resulting balance. The repository rejects a positive request exceeding actual numeric room. Account MAX → debit 5 → reward 1 now correctly allows the ordinary reward, but a requested 5/applied 4 refund is rejected by the unchanged `credit_ledger_state_invalid` trigger. At zero room it is likewise not recorded. A missing entry is not an authorized terminal forfeiture: it remains `refund_pending`, with refund metadata null, and cannot be cleaned as settled. This is the explicit incomplete Account gate, not a product PASS or claimed full refund. Ordinary full Account refunds still work when room exists.

Changing requested to 4, inventing a zero claim, bypassing the trigger, editing historical ledger entries or marking an unrecorded refund settled would lose the approved accounting/audit semantics. None was done. Historical B/B.1/B.2 findings remain unchanged in their original devlogs.

## Code boundaries

- `lib/credit/refund-headroom.ts`: removes balance liability arithmetic entirely. `refundSequencePredicate()` keeps only sequence capacity reservation and authorized request correlation. Shared `assistantRefundMatchSql`/`terminalAssistantRefundSql` prove an entire original requested entitlement was consumed by the correctly linked, keyed refund; applied amount may be smaller under existing guards. A mutable failed label alone is insufficient.
- `lib/credit/repository.ts`: all existing prepared Credit writers share the transactionally evaluated sequence predicate, not a JS balance check. Existing actual balance/overflow, Guest cap, idempotency, refund eligibility and audit-trigger checks remain. `REFUND_CAPACITY` now concerns reserved sequence slots, never reserved balance.
- `lib/assistant/credit.ts`: removes the obsolete Guest full-room-only refund gate. Uses the original request price, key and original debit linkage through existing Credit preparation. Account-only admission/debit checks are unchanged.
- `lib/assistant/repository.ts`: failure CAS/refund/terminal proof/read remain one D1 transaction. `readAdmission()` and failure settlement derive `{requested, applied, forfeited, full}` from the durable correlated ledger, not a new balance or operational accounting copy. No entry yields `refund:null`.
- `lib/assistant/admission.ts`: internal settlement returns that explicit refund accounting. Recovery sees the same ledger result; terminal partials are never retried. No provider or public generate endpoint exists.
- `lib/assistant/admission-sql.ts`: failed-row cleanup accepts proven terminal partial/zero refunds as well as full refunds. Missing proof remains protected.
- Focused tests update B.2 expectations to the approved policy and explicitly reproduce the remaining Account blocker. No identity/reward/Quiz source implementation was changed.

## Rewards, migration and sequence capacity

Ordinary credits, attendance, Quiz claims, first-login +3 and Guest migration now use all actually available Account balance capacity. No deferred entitlements or retroactive claims were added. Tests verify same-day duplicate protection, attendance across KST midnight, Sunday +5, Quiz reward before unpublication, first-login idempotency, migration/first-login atomicity and racing refunds. A real Account overflow still rejects rather than consuming a claim; a migration batch that cannot fit rolls back transfer, retirement and first-login together.

Sequence is a separate finite storage resource: even a zero-applied terminal refund needs an append-only entry. For N unresolved Account debit obligations, the common mutation guard preserves one slot each. A new AI debit needs its own entry plus a future settlement slot. Only the original request-correlated refund consumes its reserved slot; unrelated smaller refunds cannot consume its entitlement. Committed completion releases its reservation, and a verified terminal refund releases its own. Expired leases and failed labels without proof retain the reservation.

The predicate uses subtraction from MAX_SAFE_INTEGER and bounded row counts; no balance+liability sum or JS read/check/write. At sequence exhaustion unrelated writes fail closed without claims. This is an underlying audit storage limit, not a new user Credit cap. It does not promise reward entitlements beyond actual sequence capacity. Sequence boundaries are exercised by the **production SQL predicate on real D1 with hypothetical wallet version inputs and a BigInt oracle**, alongside real admitted obligations. No quadrillions of historical ledger rows, forged wallet versions, or disabled audit triggers are claimed.

## Settlement, replay, recovery and retention

Valid completed delivery remains immutable and unrefunded. Concurrent failure/cancel/recovery requests use existing owner-token CAS and one canonical refund key. Ordinary full refunds, partial/zero Guest compatibility refunds, transaction rollback, SQL no-op faults and lost commit replies converge without double credit. Requested amount consumes the entire refund entitlement; a different refund key cannot resurrect forfeited capacity later. Durable spend correlation still rejects replay after operational cleanup.

Terminal generation records become eligible at their existing expiry (48 hours from creation); retrieval retains its ten-minute policy. Cleanup is lazy, max 100 expired rows per admission, and never claims deletion at exactly 48 hours. A proven partial refund has no remaining compensation obligation. Started/pending rows without a terminal entry, including unsupported Account partial refunds, remain protected indefinitely until resolved. Permanent infrastructure outages, operational-state loss or administrative tampering are not guarantees of automatic recovery. The excluded operational table must not be discarded during a future restore while settlement decisions remain unresolved.

## Minimum separately authorized proposal — NOT IMPLEMENTED

1. Add the next normal additive migration (expected **0018**, subject to a fresh canonical check) replacing only the Account **refund** applied-effect branch of `credit_ledger_guard`: `min(requested, MAX_SAFE_INTEGER-currentBalance)`. Keep ordinary Account credits exact, Guest rules, original-debit/requested-entitlement guard, wallet linkage, all CHECKs and append-only triggers. Do not edit applied 0016 or rewrite 0017. Use CASE-free trigger statements and the established splitter tests.
2. Update the common Credit refund INSERT to use that same conditional applied effect and permit bounded Account refunds even when the full requested amount cannot fit. Continue recording the original requested amount, including zero-applied refunds.
3. Deliberately version the backup contract (expected **v6/new marker**) so the new Account refund effect is legal only under that version. Keep v1–v5 validation exact; fourteen durable datasets and operational exclusions remain. The existing validator correctly rejects Account partial effects even when balance sums otherwise reconcile. Do not globally relax historical audits.
4. Add clean-chain/upgrade/parser and Account full/partial/zero/concurrent/replay/recovery/backup tests, run all gates, and separately obtain Production migration authorization and a fresh authenticated backup before any deployment.

This is a concrete proposal requiring the user's separate migration/audit authorization under B.3 requirement 9. No migration file, schema change, backup-version change or hosted experiment was created here. Partial-policy acceptance cannot be closed simply by changing Assistant state labels.

## Validation

**46/46 test:* suites PASS; lint, TypeScript, build and diff-check PASS.** No failures waived. Negative tests prove the Account conflict remains enforced; they do not make Account partial-refund implementation PASS.

| Suite | Local evidence |
| --- | --- |
| `test:assistant-headroom` | **1,122 assertions PASS**; Guest full/partial/zero terminal refunds, no later top-up, concurrent reward/refund and replay after cleanup, lost partial response, Account MAX overflow blocker, unchanged rewards/login/Quiz/attendance, full ledger audit and v5 export. Includes **532 SQL sequence/balance input simulations**, not actual MAX-length ledger history. |
| `test:assistant-refund-safety` | **582 assertions PASS**; Guest service/SQL denial, Account action prices, rollback, no-op/lost response recovery, expired leases, finalization races, unresolved retention, migration and full ledger audit |
| `test:assistant-admission` | **263 assertions PASS**; atomic concurrency, quotas/cost/leases/replay, clean 0000–0017 chain and populated 0016 upgrade |
| `test:assistant-retrieval` | **448 assertions PASS**; grounding, receipts, safety and free retrieval |
| `test:credit-foundation` | **103 assertions PASS**; original Credit/identity invariants with real D1 triggers |
| `test:guest-rewards` | **220 assertions PASS**; visit/Quiz concurrency, rollback, cap and KST rules |
| `test:google-account` | **263 assertions PASS**; unchanged login/migration/identity behavior |
| `test:backup` | **832 assertions PASS**; exact historical v1–v5 validation and dry-run planning |

All eight original Credit triggers remain present and byte-identical in local sqlite_master. Direct wallet/version mutation still aborts. BigInt reconciliation checks each actual ledger entry's sequence and cumulative resulting balance, plus final wallet balance/version. Ledger audit PASS includes legitimate Guest partial/zero entries and unresolved Account cases; audit consistency is not proof of completed compensation.

Migration source hashes unchanged:
- 0016: `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea`
- 0017: `24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16`

The parser suite verifies the established LF/19-statement/eight-trigger 0016 contract; the admission suite verifies 0017's six-statement clean/upgrade application. No hosted parser claim is made. Schema and backup changes: **NONE**. Provider calls: **ZERO**.

The first focused run found one test expectation error: a cleaned request with the same keyed input correctly returns `RESULT_NOT_RETAINED`, not `REQUEST_CONFLICT`. The assertion was corrected and a separate changed-input replay test added. The complete run below then passed; no product logic was changed to bypass that failure.

Exact commands, each exit 0:

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
pnpm test:assistant-refund-safety
pnpm test:assistant-headroom
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

## Explicit NOT TESTED / limitations

Actual Account partial/zero refund support (BLOCKED); hosted migration/parser and live D1 behavior; Production Credit/backup/restore; real provider billing/output/delivery handoff; browser/mobile Assistant UI; actual MAX-length historical ledger sequence; recovery under permanent D1 outage or loss of operational state. Scheduler health and Site visibility were not rechecked or changed. No Production acceptance is inferred from local results.
