# Phase 9D-B.4 — Account partial refunds and final local acceptance

Date: 2026-10-16. Starting canonical, freshly fetched: `a6e82edbf166d15d1b074fd79968f72841543541` (`Reconcile capacity-first refunds without weakening Credit audits`). Remote main matched the supplied checkpoint. Final canonical SHA is reported after publication/refetch; the commit containing this record identifies the tested tree without a self-referential hash.

**Status: Phase 9D-B local implementation acceptance COMPLETE under the approved Account-only, capacity-first contract. Production acceptance remains pending and is not claimed.** The owner explicitly authorized the next additive 0018 migration and backup v6. Prior B/B.1/B.2/B.3 failures remain unchanged in their original records. No provider, generation endpoint, Assistant UI, Production deployment/migration/SQL/restore, secret, Site, access-policy or Sites-history changes. AI defaults disabled and the launcher remains COMING SOON. 9D-C NOT STARTED.

## Root cause and approved scope

0016's `credit_ledger_guard` requires every Account effect to equal requested amount. That conflicts with the approved capacity-first refund policy near MAX_SAFE_INTEGER. B.3 correctly allowed ordinary rewards to consume actual wallet capacity but could not record a legal Account partial/zero refund. Treating an absent entry as settled, reducing the requested entitlement, or globally relaxing old backup validators would corrupt the accounting contract. None is used.

The approved change is limited to Account **refunds**: applied amount equals `min(requested, MAX_SAFE_INTEGER-currentBalance)`. Requested amount remains the original eligible compensation. Its entire amount consumes original-debit entitlement even when applied is smaller or zero; the difference is forfeited permanently. Ordinary Account rewards/credits remain exact or reject at the numeric boundary. Account has no product-level balance cap. Guest cap remains 10; Guest AI generation still fails with LOGIN_REQUIRED before admission/debit. Guest rewards and free retrieval remain available.

## Versioned trigger replacement

Actual canonical journal ended at 0017. `pnpm exec drizzle-kit generate --custom --name account_partial_refund` generated `0018_account_partial_refund.sql`, its snapshot and journal entry. The new snapshot differs only in migration identity/parent; no table/column schema changes. Applied 0016 and existing 0017 were not rewritten.

The existing CASE-free effect expression gains exactly one nested `iif` branch:

```sql
iif(NEW.requested_amount>0 AND p.type='guest',
    min(NEW.requested_amount,10-w.balance),
    iif(NEW.operation='refund' AND p.type='account',
        min(NEW.requested_amount,9007199254740991-w.balance),
        NEW.requested_amount))
```

Tests compare the entire replacement guard to 0016 after substituting this one expression: no other guard text changes. Same-wallet ownership, active principal, sequence, resulting balance, Guest cap and original-debit requested-entitlement checks remain. CHECK constraints, wallet application and direct-mutation guards, ledger update/delete prohibition and the other seven original triggers remain unchanged. No historical rows are edited.

The v77/v78 incomplete-input incident and successful CASE-free v79 fix informed the migration. Exact pinned Wrangler **4.92.0** splitting produces **four** complete statements, LF only, uppercase BEGIN, zero CASE tokens:

1. Create a temporary BEFORE INSERT guard that aborts Credit writes.
2. Drop the old `credit_ledger_guard`.
3. Create the reviewed replacement guard.
4. Drop the temporary guard.

The complete file is applied as one D1 batch in local migration tests. Injected failure after each of all four boundaries rolls back trigger DDL and preserves durable/operational data. The temporary guard additionally blocks writes if a runner stops between individually committed statements; real D1 tests exercise every prefix. Successful completion leaves exactly the original eight trigger names. This avoids an unguarded write window without weakening any Credit invariant. It does not promise automatic repair/retry for an interrupted hosted runner: such a partial runner failure stays fail-closed and requires platform diagnostics through a separately authorized deployment process. Hosted Sites migration behavior was not exercised.

Source SHA-256:

- 0016 unchanged: `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea`
- 0017 unchanged: `24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16`
- 0018: `765c35b257ff7e4e4a732eca692e71db8758c42f6d956a92e775f6a6bc58b2e2`

## Credit, settlement and numeric evidence

`lib/credit/repository.ts` calculates the same Account refund clamp inside its parameterized INSERT SELECT. Only refund operations bypass the full-input numeric-room check; ordinary rewards remain exact. Arithmetic subtracts from the safe integer ceiling inside SQLite, without JS read/check/write or overflow-prone liability sums. Requested amount, original linkage, idempotency and ledger-slot advancement are preserved, including applied=0.

Existing Assistant settlement needed no new state model. Its owner-token CAS, prepared refund and terminal ledger proof remain atomic. The proof requires the same wallet/original debit, canonical refund key, request correlation and full **requested** debit compensation. A missing entry remains pending; a valid partial/zero entry is terminal. Results expose `{requested, applied, forfeited, full}` from the durable ledger. Completed valid delivery cannot refund. Concurrent settlement/recovery and lost commit replies converge to one entry. A second key cannot top up forfeited Credit after later spending frees room.

| Real local D1 scenario | Requested | Applied | Forfeited | Full | Terminal |
| --- | ---: | ---: | ---: | --- | --- |
| Account MAX → debit 5 → refund | 5 | 5 | 0 | true | yes |
| Account MAX → debit 5 → reward 1 → refund | 5 | 4 | 1 | false | yes |
| Account MAX → debit 5 → reward 5 → refund | 5 | 0 | 5 | false | yes |
| Guest balance 8 → refund 5 | 5 | 2 | 3 | false | yes |
| Guest balance 10 → refund 5 | 5 | 0 | 5 | false | yes |

Guest settlement fixtures model explicitly synthetic legacy admissions; no Guest AI spending path was enabled. Refund-first and reward-first ordering, concurrent rewards/refunds, multiple unsettled operations, SQL rollback, dropped reply and expired-lease recovery pass. Populated 0017 upgrade preserves all fourteen durable datasets plus operational rows, then settles a previously blocked Account refund with applied=4. Faults after preparing partial/zero refunds roll back wallet, ledger and state together; later recovery applies exactly one terminal refund.

Ledger sequence capacity remains separate from balance capacity. Each unresolved Account AI debit reserves a future append-only entry, including zero-applied compensation. Unrelated mutations cannot consume its slot; only its authorized refund releases that reservation, or committed successful delivery ends the obligation. No arbitrary balance cap or balance reservation was added. **532 cases run the production sequence predicate in real local D1 with hypothetical wallet version/balance inputs, real admitted obligations and a BigInt oracle.** These are rigorous boundary simulations, not quadrillions of actual historical entries. Ordinary real histories are independently reconciled entry-by-entry against wallet sequence/version/balance. Actual storage exhaustion rejects new work before creating an unpayable settlement obligation under supported mutation paths.

Ordinary reward kinds, Quiz first-response claims, KST attendance across midnight/Sunday, first-login +3, Guest migration first-winner and Guest cap remain unchanged. Login/migration batches that cannot fit actual numeric storage still roll back rather than consume a claim. No deferred entitlement, retroactive claim or Account/OAuth redesign was introduced.

## Backup v6 and historical contracts

- `lib/backup/format.ts` defines v6 / `0018_account_partial_refund.sql` and retains explicit historical v5 / 0017 mapping.
- `lib/backup/credit-validation.ts` permits the new Account **refund-only** clamp for `version===6`, using BigInt reconciliation. v4/v5 continue rejecting otherwise balanced Account partial/zero effects incompatible with 0016. Versions 1–3 remain unchanged.
- The same fourteen durable datasets are exported. `assistant_admissions`, transient security state, secrets, prompts and outputs remain excluded.
- Same-wallet original-debit bounds use **requested**, not applied, amounts. Sequence continuity, resulting balance, wallet version, numeric bounds and idempotency checks remain enforced. Corrupt effects, links, sequences, duplicate entries, unsafe values and extra operational datasets are rejected.
- Dry-run planning targets 0018 and describes the source refund contract. `dryRun=true`, `executable=false`; no restore executor or restore execution exists.

New runtime requires normal 0017/0018 migration before publication even with AI disabled. Production still runs its previous deployment; the previously accepted 0016/v4 baseline was not independently inventoried here. A future authorized deployment needs a fresh validated/planned pre-migration backup, normal migration, preservation checks and immediate validated/planned post-migration v6 backup. Local export is not live Production acceptance.

## Recovery and retention limits

Retrieval expiry stays ten minutes. Terminal generation records become eligible for cleanup at their existing expiry, 48 hours from creation; cleanup is lazy and removes at most 100 expired rows per admission. This is not guaranteed physical deletion at exactly 48 hours. A proven partial/zero refund has no remaining compensation obligation. Started/refund_pending rows without durable terminal proof remain protected beyond expiry. Recovery is idempotent when D1 becomes available and the operational state is retained; no guarantee is made under permanent infrastructure outage, operational-state loss or administrative tampering. Future restore planning must quiesce AI and settle outstanding work rather than discard excluded operational obligations.

## Validation

**47/47 test:* suites PASS; lint, TypeScript, build and diff-check PASS.** All commands exited 0; no failure was waived. Earlier blocked checkpoints remain historical findings rather than being relabeled successful.

| Suite | Local evidence |
| --- | --- |
| `test:account-partial-refund` | **233 assertions PASS**; exact four-statement parser contract, clean 0000–0018, populated 0017 upgrade, migration rollback/prefix protection, partial/zero recovery and v6-only audit |
| `test:assistant-headroom` | **1,173 assertions PASS**; full/partial/zero Account and Guest settlement, reward/refund ordering/concurrency, multiple liabilities, unchanged rewards/migration and ledger audit; includes **532 simulated SQL sequence/balance cases** |
| `test:assistant-refund-safety` | **586 assertions PASS**; Guest denial, Account prices, rollback/no-op/lost-response recovery, retention, settlement races and full ledger audit |
| `test:assistant-admission` | **263 assertions PASS**; real D1 atomic concurrency, quotas/cost/leases/replay, current clean chain and upgrade from 0016 |
| `test:assistant-retrieval` | **448 assertions PASS**; unchanged grounding, receipts, free retrieval and safety |
| `test:credit-foundation` | **103 assertions PASS**; protected Credit/identity invariants |
| `test:guest-rewards` | **220 assertions PASS**; Guest cap, visit/Quiz concurrency, rollback and KST claims |
| `test:google-account` | **263 assertions PASS**; unchanged Account login, migration, identity and duplicate prevention |
| `test:backup` | **837 assertions PASS**; v1–v6 compatibility, read-only export, security, audits and CLI dry-run plans |
| `test:credit-migration-parser` | Original 0016 LF/19 statements/eight triggers, 84 cap-equivalence cases and guard parity PASS; current full chain applies |

All eight Credit triggers exist after migration, seven unchanged and the INSERT guard differing only in the approved Account refund expression. Real ledger reconciliation uses BigInt for every actual sequence/effect/resulting balance and final wallet version/balance. Audit PASS includes legitimate partial and zero entries, not merely expected rejections.

Exact completed commands:

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
pnpm test:account-partial-refund
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

The first focused backup run exposed a test-only comparison mismatch: D1 rows use null-prototype objects while structuredClone produces ordinary objects. The historical v5 equality check now compares serialized payloads, matching the existing v4 check. The validator or product behavior was not relaxed to bypass a failure.

## Explicitly NOT TESTED / not performed

- Hosted Sites parser/migration, Production D1 inventory/data, deployment and live backups.
- Real provider, generate endpoint, new UI, browser/mobile AI acceptance or real Google interactions in this phase.
- A literal MAX_SAFE_INTEGER-length ledger; sequence boundary evidence is the SQL simulation described above.
- Automatic recovery under permanent infrastructure failure, lost operational state, or a partially committed hosted migration runner.
- Scheduler health, secrets and Site access policy were not changed or reverified. Owner-reported public access is preserved.

No provider calls, Production deployment or 9D-C work occurred. No public AI activation or public launch occurred.
