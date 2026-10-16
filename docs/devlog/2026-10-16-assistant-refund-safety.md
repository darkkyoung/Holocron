# Phase 9D-B.1 — Account-only spending and refund safety

Starting canonical, fetched before work: `d70faa8b35ca7541d512453e72d500ea721151a9` (`Implement atomic assistant admission and Credit settlement foundation`). Remote main, not the supplied historical SHA alone, was the baseline. The final canonical commit is the commit containing this entry; remote/tree verification is reported with the final commit SHA rather than a self-referential hash here.

**Acceptance status: 9D-B remains BLOCKED.** The approved Account-only policy closes new Guest spending/retirement/cap exposure, but Account numeric overflow still prevents an unconditional full-refund guarantee. Tests below pass by verifying safe behavior, including the explicit blocked outcome; they do not turn that outcome into product acceptance.

No provider calls, Production deployment/migration/SQL/restore, secret changes, Site history/access changes, launcher activation or 9D-C implementation. The owner-reported public Site continues its previous deployed code. `HOLOCRON_ASSISTANT_ENABLED` remains disabled by default; COMING SOON is unchanged. Completed 9C.2 acceptance and the existing Account/Credit system remain intact.

## Approved policy and boundary

- All initial AI generation spending is Account-only: Q&A 5, planner 7, draft 15 CR. Revision remains reserved and unimplemented. No client-provided price or owner is accepted.
- Guests retain rewards, the 10 CR cap, free retrieval and free News/Works/Quiz access. Guest Q&A is deferred, not deleted from the long-term product design.
- `requireSpendingAccount()` reuses `resolveCurrentCreditOwner()` (Account first) and the existing read-only Credit service. A valid Guest or absent owner gets safe `LOGIN_REQUIRED` / HTTP 401 before cost profile, receipt, archive, network admission or debit work.
- The read is early feedback, not the atomic authority. The admission SQL independently requires an active Account; the prepared debit's eligibility gate also joins the Account principal. Admission and debit still share the existing D1 batch plus rollback invariant. A Guest handle racing Guest→Account migration is rejected, never silently remapped to the destination Account. A signed Account session selects that Account normally.
- Existing reward amounts, first-login +3, migration claims/retirement, wallet checks, append-only ledger and audit triggers are unchanged. No second wallet, cap exception, escrow or alternate identity was introduced.

## Implementation responsibilities

| Files | Responsibility |
| --- | --- |
| `lib/assistant/credit.ts` | Account owner validation, prepared debit eligibility, shared durable full-refund proof; existing prepared Credit mutation reused |
| `lib/assistant/admission-sql.ts` | Atomic Account policy and lazy cleanup requiring full compensation for failed requests |
| `lib/assistant/admission.ts` | Early Account validation; invalid usage becomes technical failure with conservative unknown cost rather than stranding the debit |
| `lib/assistant/repository.ts` | Invalid billing telemetry cannot veto compensation; failure CAS, linked refund and terminal proof remain transactional |
| `lib/assistant/types.ts`, `limits.ts`, `http.ts` | Safe login-required code/status/message; no new generation endpoint |
| `scripts/test-assistant-refund-safety.mjs` | Real local D1 failure, concurrency, overflow, retention and ledger reconciliation evidence |
| Existing admission/retrieval suites | New policy expectations and preserved retrieval/security regression coverage |

## Settlement and recovery guarantees

With an active Account, sufficient numeric balance/sequence headroom and available D1, an ordinary technical failure/cancellation appends exactly one full refund linked to the original debit. Concurrent failure, cancellation, explicit expired-lease recovery and lost-response replay converge on that refund. A committed completion cannot later be refunded by the assistant's failure path. Late completion cannot own or release a newer request's lease.

Invalid, nonintegral, negative, nonfinite or over-budget usage/cost metadata is treated as unknown billing on the failure path. The conservative provider reservation remains counted; compensation is still attempted. A nominally valid outcome with invalid usage is failed/refunded, never delivered as completed. No repair/provider request is introduced.

`failed` requires durable proof joining the original `ai_spend` debit, same wallet, assistant request correlation and idempotent refund key, with refund `applied_amount` exactly negating the original debit. Cleanup uses the same predicate. A mutable terminal label alone is insufficient.

A D1 exception rolls the transition/refund batch back and returns the safe unavailable error; the original `started` obligation survives. A valid zero-row refund leaves `refund_pending`, never a claimed or partial refund. Explicit recovery retries the same obligation without another debit/provider call. If the refund committed but its response was lost, replay finds the durable refund and does not append another one. Temporary failure recovery passes locally; indefinite D1 unavailability cannot promise eventual settlement.

## Exact remaining blocker: Account numeric headroom

Accounts have no product-level cap, but the existing protected storage/API contract has `MAX_SAFE_INTEGER = 9007199254740991`. All balances below were established through existing Credit APIs with the original triggers enabled, not direct wallet edits:

1. Account starts at MAX; Q&A admission debits 5 → MAX−5.
2. A valid ordinary +1 reward arrives → MAX−4.
3. A technical failure requires +5. Existing overflow checks correctly reject the refund; no ledger entry is appended and the request remains `refund_pending`.
4. Seven days later it still exists and recovery is still pending. A separate legitimate local test debit of 1 creates real headroom; twelve concurrent recovery calls then append exactly one +5 refund and end at MAX. The implementation does **not** debit a user to manufacture recovery space.

The same conflict exists with unchanged Guest migration: Account MAX−12 → AI debit 5 → MAX−17 → Guest balance 10 plus first-login 3 → MAX−4. The Account remains active and the Guest retires correctly, but the full +5 refund cannot fit. New Guest generation itself is always denied, including races with migration.

At MAX, an additional +1 with no intervening spend correctly rejects as overflow. MAX → debit 5 → immediate refund 5 succeeds. Concurrent reward/refund has only the serialized valid outcomes: refund first rejects the later overflow reward, or reward first retains the unresolved refund. Wallet/ledger integrity remains intact in both.

**This is a remaining hard acceptance blocker, not a waived test or a full-refund PASS.** Available headroom may never return. The finite ledger sequence bound is another pre-existing storage limit; no 9-quadrillion-entry history was constructed and no triggers were disabled to simulate it. It also precludes an unqualified forever-refund claim.

Smallest safe proposal for separate review: define refundable-headroom reservation across **every** positive Credit path (including rewards and Guest migration), plus ledger sequence handling, before enabling spending; alternatively review a compatible wider numeric storage/API contract. Either affects protected Credit/product rules beyond the approved Account-only policy. Neither is implemented here. No reward suppression, new Account product cap, overflow bypass, cross-wallet compensation or historical mutation was silently added.

## Precise retention and limitations

- Retrieval expiry remains creation +10 minutes; generation expiry remains creation +48 hours. The 60-second active lease releases concurrency only, not quota, budget or refund obligations.
- Expired terminal rows are eligible for lazy deletion during a later admission, maximum 100 rows per admission. No traffic means no cleanup; sustained backlog may delay deletion. **There is no unconditional 48-hour physical deletion guarantee.**
- `started` and `refund_pending` rows are never deleted merely because their lease/record expiry passed. Failed rows require the durable full-refund proof before cleanup. Unexpired rows are never evicted to make room.
- Explicit internal recovery must be invoked; there is no new cron, background queue or guaranteed recovery scan. Unresolved records may remain indefinitely and count toward the 10,000-row capacity (which fails closed), as well as conservative outstanding cost accounting.
- A deliberately corrupted `failed` label without a refund is retained by cleanup; arbitrary operational corruption is not claimed to be automatically repaired. Tests use temporary local fault triggers/state fixtures only; Production repair SQL is not provided.
- Operational state remains excluded from backups. Ledger durability alone cannot reconstruct whether uncertain output was delivered. Quiesce AI and settle obligations before any separately reviewed restore; operational loss during unresolved spending is not a supported recovery guarantee.

## Migration and backup invariants

No schema or migration change. 0017 remains additive/unapplied to Production; v5 still has exactly fourteen durable datasets and preserves v1/v2/v3/v4 validation/dry-run contracts. `assistant_admissions` remains excluded. No restore executor.

- 0016 SHA-256: `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea` (unchanged).
- 0017 SHA-256: `24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16` (unchanged).
- The admission suite applies the clean 0000–0017 chain and upgrades from 0016 against real Miniflare D1 using the pinned Wrangler splitter. The new safety suite also applies the complete chain and validates/plans a real v5 export after the edge cases.
- All eight existing Credit triggers remain enabled; direct wallet mutation and ledger deletion still abort. Full per-entry sequence/resulting-balance reconciliation uses BigInt, including MAX-sized balances, followed by the existing backup ledger validator.

## Validation evidence

Full regression: **45/45 `test:*` suites PASS**, plus lint, TypeScript, build and diff-check PASS. No failures were waived. No Production acceptance is inferred from local tests.

| Focused suite | Assertions / evidence |
| --- | --- |
| `test:assistant-refund-safety` | **705 PASS**, real Miniflare D1; all-action concurrent Guest denial, service/atomic defense, migration races, exact Account costs, concurrent refund, SQL abort/zero-row/lost-reply recovery, invalid usage, lease/completion races, lazy retention and actual numeric blockers |
| `test:assistant-admission` | **263 PASS**, atomic debit/admission, duplicate/changed/cross-owner replay, insufficient funds/rollback, quotas/cost/leases/capacity, clean migration chain and 0016 upgrade |
| `test:assistant-retrieval` | **448 PASS**, strict snapshot, retrieval/evidence/receipts, HTTP/security and free admission |
| `test:backup` | **832 PASS**, exact v1–v5 contracts, excluded state, durable ledger validation and dry-run-only plan |
| `test:credit-foundation` | **103 PASS**, original Credit invariants and real D1 audit/concurrency |
| `test:guest-rewards` | **220 PASS**, unchanged rewards, migration provenance/cap/security |
| `test:google-account` | **263 PASS**, unchanged Account/login/migration rules |
| `test:credit-migration-parser` | LF, 19 statements, 8 original triggers, full chain and 84 cap-equivalence cases |

The new safety suite reconciles every generated wallet and every ledger sequence/resulting balance (BigInt) and validates a v5 export containing those real local rows. This includes still-pending refunds: a valid ledger audit proves accounting consistency, **not** successful compensation of an unresolved obligation. All eight original Credit triggers remain present, direct wallet mutation/ledger deletion fail, and outbound provider call count is zero.

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
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

## Explicit NOT TESTED / not performed

Real provider calls and provider delivery handoff; hosted D1 migration/failure behavior; Production Credit/refunds/backup/restore; browser/mobile assistant UI; operational loss recovery; guaranteed eventual settlement under permanent D1 outage or permanently exhausted numeric headroom; actual ledger-sequence exhaustion. Scheduler health was not reverified or modified. No secrets were provisioned and no Site access was inspected or changed.

Next action is a separately reviewed resolution of the numeric refund guarantee, followed by revised 9D-B acceptance. **9D-C NOT STARTED; 9D-B NOT COMPLETE; Production NOT DEPLOYED.**
