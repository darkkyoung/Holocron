# Phase 9D-B.2 — Numeric refund headroom

Starting canonical, fetched at task start: `6b6174ebfdd31ee3e02215ac48c8a8bf926cf714` (`Restrict AI spending to Accounts and harden refund recovery`). Remote main was unchanged from the supplied checkpoint. Final canonical is the commit containing this entry; its SHA and remote/tree verification are reported after push, avoiding a self-referential hash in the commit.

**Numeric refund capacity: locally verified. Overall Phase 9D-B: still BLOCKED on reward entitlement after a rejected time-limited claim.** This is not authorization to enable AI or start 9D-C. No provider, generation endpoint, assistant UI, Production deployment/migration/SQL/restore, new Site, secret, access or Sites-history change. The owner-reported public Site continues running its previously deployed code. COMING SOON and the disabled default remain unchanged.

## Root cause and considered alternatives

B.1 correctly preserved unresolved obligations but allowed other credits to use capacity freed by an AI debit. Account MAX → debit 5 → reward 1 left only four numeric units for a five-unit refund. The finite ledger sequence independently needs one future slot per refund. Neither limit can be dismissed as unlikely.

All legitimate Credit writers were reviewed: generic credit/debit/refund/claim, visit/attendance, Quiz, first-login +3 and Guest migration. They converge on `prepareMutation()` in `lib/credit/repository.ts`. The chosen change adds one common SQL predicate there, so every Account mutation checks the same authoritative D1 state as its INSERT. No JavaScript read/check/write or UI authorization is used.

Alternatives rejected:

- Check only the AI service: later rewards/migration could still consume reserved capacity.
- Check balance/sequence in JavaScript: distributed races remain.
- Lower the Account product cap, clamp Account rewards/refunds, or remove audit triggers: violates the protected contract.
- Alter 0016 or rewrite/add migrations for new triggers: unnecessary for supported repository-owned writes and not authorized without deployment/schema review.
- Add a second wallet, widen numeric storage, or write completion/reward-obligation ledger conventions: unnecessary for the numeric predicate and would expand the Credit/backup/product contract.
- Automatically backdate or retain unpaid rewards: an unapproved entitlement decision; this portion remains blocked below.

## Numeric invariant and atomic transitions

Let `M=9007199254740991`, `B` be the Account balance, `V` its ledger version, `L` the sum of outstanding AI debit amounts, and `N` the number of outstanding refund entries. Supported states preserve:

```text
B + L <= M
V + N <= M
```

Liabilities derive from `assistant_admissions` joined to the **actual** same-wallet `ai_spend` debit and assistant request correlation. Started, refund-pending, expired leases and falsely failed labels without full compensation all count. A verified full refund removes liability regardless of a stale operational label. Successful completion releases liability through the existing owner-token/state CAS; no output text or second balance is stored. A full-refund proof is shared with failure finalization and cleanup, rather than reimplemented.

| Mutation | Balance/liability effect | Version/reserved-slot effect |
| --- | --- | --- |
| New AI debit `p` | `B−p`, `L+p` | `V+1`, `N+1`: needs two remaining slots plus existing reservations |
| Full correlated refund `p` | `B+p`, `L−p` | `V+1`, `N−1`: consumes its own reserved slot |
| Other credit/debit/zero claim | Existing signed effect, liability unchanged | `V+1`, `N` unchanged |
| Valid completed result | Balance unchanged, corresponding liability released | Version unchanged, corresponding slot released |

The common INSERT checks the post-mutation state using subtraction from `M`. SQLite performs integer arithmetic; JS never computes a near-limit balance or sum. A single balance plus signed input is at most `2*M`, well inside SQLite's integer range. Supported admission capacity/prices bound liability aggregation; an invalid database causing a SQLite aggregate overflow fails the batch closed, never wraps into permission. The original safe integer, nonnegative balance, Guest cap, active-owner, sequence, refund entitlement and append-only triggers remain active and unchanged.

Only a full original-debit refund with the canonical request/key/reference and `refund_pending` state can consume its reservation. An unrelated/partial refund cannot take it, even if it could otherwise fit. A generic caller cannot invent an assistant-correlated debit without the matching admission/entry/key. Fixed prices are still set by the existing assistant service/repository; the headroom module reserves the actual signed amount and does not duplicate the price table.

A denied AI prepared debit leaves zero rows; the existing atomic admission/debit invariant **aborts the whole D1 batch**, removing the prospective admission. No rejected request obtains a provider-capable handle. Duplicate keys and replay fencing remain unchanged. Positive mutations that cannot fit return no new ledger row, never a zero-paid Account claim. Existing login/Quiz batch invariants preserve their all-or-nothing behavior.

## Positive effects and retry behavior

| Path | Rejection behavior | Retry boundary |
| --- | --- | --- |
| Generic Credit credit/claim/debit | `REFUND_CAPACITY` when existing numeric bounds permit the operation but reservation blocks it; no new key/entry | Same key may retry when actual capacity is available; existing true numeric exhaustion still reports OVERFLOW |
| Attendance | Existing safe unavailable/retry result; no date key or zero-paid Account entry | Same KST day/week still eligible; later dates do not backfill |
| Correct/wrong first Quiz answer | No reward/zero claim and no response commit if the required ledger write is blocked | Original first answer remains eligible while the Quiz is public |
| Account login / Guest migration | Existing batch invariant rolls back incoming credit, outgoing Guest effect, retirement and first-login claim together | Same migration/login may retry; first-winner and once-per-account rules unchanged |
| Assistant technical failure | Full compensation uses reserved capacity; failure/duplicate/lost-response recovery remains idempotent | Retry after transient D1 availability; no new debit/provider call |

Guest Credit behavior bypasses the Account reservation predicate and retains its 10 CR cap, rewards and migration semantics. Guest AI admission remains LOGIN_REQUIRED. Future legitimate Credit writers must use the shared prepared mutation boundary; arbitrary ad-hoc SQL, operational corruption or a concurrent old-code writer are outside the supported guarantee. No Production SQL path was added.

After a failed request is refunded back to MAX, a further reward may still encounter the **original** numeric overflow limit. Recovery does not promise that unrelated rewards always fit. It does promise that already-reserved AI refunds are not displaced by those writes.

## Remaining product gate — reproduced with real D1

No rejected attempt consumes an idempotency or reward claim, and same-window retries pass. That alone is not the requested guarantee of preserved time-limited entitlement:

1. At KST 2026-10-16 23:59:59.500, an Account at MAX−5 with a pending five-unit AI refund attempts attendance. It is explicitly rejected without a claim.
2. The AI successfully completes at 23:59:59.750, releasing capacity. There is no refund obligation left.
3. At 00:00:00.500 the next visit earns only October 17's +1. October 16 remains missed and its streak is not preserved. The existing API only computes today's key; no durable record proves the earlier eligibility.
4. A Sunday fixture with six real prior attendance claims reproduces the analogous loss of Sunday +5 eligibility across the Monday week reset.
5. A Quiz answer blocked before completion writes neither response nor reward. If the administrator unpublishes that Quiz before retry, its original eligibility cannot be recovered either.

These are explicit **blocked acceptance outcomes**, not passed reward-preservation requirements. The tests pass by reproducing and reporting them. No backdated client timestamp, extra reward, automatic queue, deferred entitlement table or changed first-answer rule was introduced.

**Minimum product decision needed:** decide whether a capacity-rejected attempt creates a durable reward entitlement. Preserving that entitlement requires separately reviewed storage/settlement rules retaining the original server date, amount, streak and Quiz first-answer/publication eligibility across retries; balance/sequence capacity and backup implications must be included. Alternatively the owner would need to explicitly approve that rejected attempts earn no entitlement and remain retryable only while their original eligibility window remains open. That exception is **not** assumed or approved by this implementation. Under the current zero-lost-entitlement requirement, 9D-B cannot be COMPLETE.

## Migration, compatibility and retention

No schema, numeric type, migration or backup code change; no 0018/v6. 0016 and 0017 remain byte-identical:

- 0016 SHA-256 `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea`.
- 0017 SHA-256 `24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16`.

0016 parser tests still verify LF, 19 statements, eight original triggers and cap/guard equivalence. 0017 remains LF/six splitter statements/no CASE/new trigger, and clean 0000–0017 plus populated 0016 upgrade pass locally. No hosted migration bytes changed, so no assumption that 0017 is absent in every hosted environment was used to justify editing it. Hosted state was not queried or modified.

**The new Credit runtime requires canonical 0017 even when AI is disabled.** A 0016-only database fails new writes closed, explicitly tested; it does not silently disable reservation checking. Credit/Google/reward test fixtures now apply 0017 before exercising their unchanged invariants. The migration-upgrade fixture seeds a valid old ledger entry through 0016's original triggers before applying 0017, then verifies preservation. The old deployed Site still runs its old code; any later deployment must follow the separately authorized migration-before-publication path. This is not a claim that new runtime code supports unmigrated 0016.

Backup v1–v5 contracts, fourteen durable datasets, Credit audit and dry-run-only planning remain unchanged. `assistant_admissions` is still excluded. Operational loss while obligations are outstanding is not a supported restore/recovery path.

Retention remains: retrieval expiry 10 minutes, generation terminal eligibility 48 hours, lazy cleanup at most 100 rows/admission. Unsettled obligations survive expiry. No traffic or a backlog may delay terminal cleanup; no exact physical deletion deadline is promised. Lease expiry only frees concurrency. Explicit recovery after transient D1 failure remains necessary; permanently unavailable infrastructure cannot guarantee completion. Old already-insolvent experimental state is not repaired by a new predicate; future enablement must verify a valid initial invariant and settle any legacy obligations first.

## Changed files

| Files | Responsibility |
| --- | --- |
| `lib/credit/refund-headroom.ts` | Shared full-refund proof and atomic numeric/sequence SQL predicate |
| `lib/credit/repository.ts`, `lib/credit/types.ts` | Common mutation enforcement and safe reservation-capacity error |
| `lib/assistant/credit.ts` | Reuse/re-export the shared proof; no alternate refund policy |
| `scripts/test-assistant-headroom.mjs` | New real-D1 numeric/reward/migration and SQL sequence-boundary suite |
| `scripts/test-assistant-refund-safety.mjs` | Existing safety regressions now require reward/migration rejection and full refund at MAX |
| `scripts/test-assistant-admission.mjs` | Genuine populated 0016 upgrade fixture, retaining original triggers |
| `scripts/test-credit-foundation.mjs`, `scripts/test-guest-rewards.mjs`, `scripts/test-google-account.mjs` | Run existing invariant coverage on the current canonical schema |
| `package.json` | New test command |
| `README.md`, `docs/AI_ASSISTANT_DESIGN.md`, `docs/ACCOUNT_CREDIT_DESIGN.md`, `docs/DEPLOYMENT.md`, `docs/BACKUP_RESTORE.md`, `docs/DEVLOG.md`, this devlog | Current implementation, schema prerequisite and blocked entitlement decision |

Historical 9D-B and B.1 devlogs are preserved unchanged.

## Validation

**46/46 `test:*` suites PASS**, followed by lint / TypeScript / build / diff-check PASS. No failure was waived. Passing the tests that reproduce an expired reward window is **not** a reward-entitlement acceptance PASS.

| Suite | Result |
| --- | --- |
| `test:assistant-headroom` | **916 assertions PASS**, including **532 SQL boundary simulations**; actual MAX-balance protected mutations, both reward/refund orders, multi-obligation recovery, pending retention, partial-refund rejection, retry keys, concurrent migration/refund, first-login rollback, attendance/Quiz claim integrity, explicit window-loss blockers |
| `test:assistant-refund-safety` | **574 assertions PASS**, ordinary full refunds, failure/zero-row/lost-response recovery, owner-token races, retention and unchanged triggers |
| `test:assistant-admission` | **263 assertions PASS**, admission/debit atomicity, duplicate/changed/cross-owner replay, concurrent spend, rollback, quotas/leases and clean/upgrade migration |
| `test:assistant-retrieval` | **448 assertions PASS**, unchanged grounding/receipt/HTTP behavior |
| `test:credit-foundation` | **103 assertions PASS**, existing Credit audit/concurrency/integrity checks |
| `test:guest-rewards` | **220 assertions PASS**, unchanged Guest rewards/cap/Quiz/KST rules |
| `test:google-account` | **263 assertions PASS**, login/migration/identity continuity |
| `test:backup` | **832 assertions PASS**, exact historical v1–v5 compatibility, fourteen durable datasets, exclusions and dry-run planning |
| `test:credit-migration-parser` | Unchanged 0016 bytes, LF, 19 statements, eight triggers and 84 cap-equivalence cases |

The new suite reconciles every actual local wallet: sequence continuity, version/entry count, BigInt cumulative applied effects and each resulting balance. It then exports and validates/plans the actual v5 ledger data. All original trigger definitions remain byte-identical and direct wallet-version mutation aborts. The simulated sequence boundary queries never modify real wallet/version/history. Provider calls are zero.

Exact executed commands (all exit 0):

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

## NOT TESTED / not performed

Actual MAX-length ledger history; hosted D1 concurrency/parser behavior; runtime on a mixed old/new writer deployment; Production balance/migration/backup/restore; real provider or result-delivery protocol; live browser/mobile assistant UI; deferred reward entitlement and its storage/backup design; guaranteed recovery after loss of operational state or permanent D1 outage. The 532 near-MAX sequence/balance cases are **SQL-level simulations using the production predicate**, real pending debit rows, hypothetical wallet balance/version inputs and an independent BigInt oracle. They do not forge a MAX-sized historical ledger or disable its triggers. Ordinary history, balances, concurrency and reconciliation are exercised against actual protected D1 wallets.

**Production NOT DEPLOYED. Provider calls ZERO. AI disabled / COMING SOON. Overall 9D-B BLOCKED. 9D-C NOT STARTED.**
