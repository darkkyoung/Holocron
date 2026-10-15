# Phase 9C.2 private deployment and real-account acceptance

## Production migration splitter correction

The first owner-only deployment (Site v77, 2026-10-15) failed before publishing with `incomplete input: SQLITE_ERROR`. The live database overview immediately afterward still contained the previous tables and none of the five new Account/Credit tables. No browser reward acceptance was started.

Local reproduction with the pinned Wrangler 4.92.0 `unstable_splitSqlQuery` produced 21 statements instead of the intended 19: `NEW.applied_amount=CASE` did not match the splitter's whitespace-delimited CASE recognizer. It ended `credit_ledger_guard` early. SQLite rejected that exact fragment with `incomplete input`.

The unapplied 0016 migration now has one additional space before CASE. This preserves SQL semantics, all tables, indexes, triggers, bounds and atomicity. No previously applied migration was changed. The foundation regression suite now executes the actual Wrangler-split statements and checks the statement count against Drizzle breakpoints before exercising ledger concurrency, rollback and identity invariants.

Guest and Account signing secrets were independently generated and set through the existing Site's secret mechanism; their values are not stored in source or this log. Google configuration remains server-side. Real Google login and hosted acceptance are still pending at this checkpoint. Phase 9D has not started.

## Hosted retry remains blocked

Canonical fix: `3f2d415942a7dfecd9aa3eeaa81c60853196668b`. All 40 `test:*` scripts, lint, `tsc --noEmit`, build and diff-check passed after the correction; foundation now has 103 assertions. The source tree was mirrored onto the latest existing Sites history (commit `3ed2b54ffbc96a7ee4a222781aab7ab77cc316d8`); both trees were `70c5757d342598e772321be30078b0a4135fb97f`. The packaged 0016 SQL was checked for the correction.

Site v78 nevertheless failed with the same `incomplete input: SQLITE_ERROR` at 2026-10-15T11:34:46Z. The local splitter defect is demonstrated and fixed, but **is not a confirmed complete explanation or fix for the hosted failure**. A subsequent read-only overview again exposed none of `users`, `auth_accounts`, `credit_principals`, `credit_wallets`, `credit_ledger`. The connector does not expose the actual migration journal or failing SQL statement, so the exact hosted parsing path and journal state remain unverified. Do not claim a successful migration or old-row preservation from this table inventory alone.

| Attempt | Site version | Deployment ID | Result |
| --- | --- | --- | --- |
| Original A+B+C | 77 | `appgdep_6ad0b85bdafc8191a2a847387833d4e8` | Failed: incomplete input |
| Splitter correction | 78 | `appgdep_6ad0ba4bc4708191a5bfce32cb1419a5` | Failed: incomplete input |

Project: `appgprj_6aa6b548ff20819191ecfb6ed6837cd6`. v78 version ID: `appgprj_6aa6b548ff20819191ecfb6ed6837cd6~appgver_6f8a26e04ab88191b04223390e70d607`. Environment revision 40; all four identity configuration names are secret-backed. Existing owner-only access is unchanged. Last successful publication remains v76.

## Accepted pre-migration evidence

The owner-provided authenticated Production export `holocron-backup-2026-10-15T05-28-10-357Z.json` passed canonical `backup:validate` and `backup:plan`. It is v3, marker `0015_featured_work_metadata.sql`, 572681 bytes, SHA-256 `6b6c7cf817d4b944d45f781690020ede2b32723643a4587ae39d2f750ee03b27`. Provenance relies on the owner's fresh administrator download plus export metadata; the marker is an application contract, not a direct read of the D1 migration journal. Exact allowlists and credential-pattern checks passed; excluded transient/security tables were absent.

| Dataset | Pre-migration rows |
| --- | ---: |
| articles | 163 |
| works | 49 |
| quizzes | 1 |
| quiz_options | 4 |
| quiz_responses | 41 |
| beta_analytics_daily_sessions | 1556 |
| feedback_sessions | 3 |
| settings | 5 |
| article_work_relations | 41 |

## Stop point and resumption requirements

No further deployment attempt, ad-hoc Production SQL, restore, fake Quiz submission or reward/browser acceptance was performed after the second failure. No post-migration/post-QA v4 backup exists from this run. Guest/reload, real Google login, migration, first-login +3, attendance deduplication, logout/relogin, desktop/mobile QA and Production ledger audit are **NOT TESTED**.

Resume by fetching canonical remote main and obtaining the failing statement/parser details and actual migration journal through supported Sites diagnostics. Reproduce the hosted failure before another minimal canonical correction plus regression tests. Do not remove audit triggers, weaken ledger atomicity, or migrate from a runtime request to bypass the failure. If significant time/data changes have elapsed, refresh the official pre-migration backup and revalidate it. Only after successful normal deployment/migration, obtain and validate/plan the immediate v4 backup and compare old datasets before starting real browser acceptance. Phase 9D remains out of scope.

## CASE-free parser correction — subsequent local-only checkpoint

Starting canonical was re-fetched as `6946cf12d6ba344b87eb16ff177cfaa2a433382a`. The v78 bytes were LF-only (110 LF, zero CR), SHA-256 `6d7c3a0f30252bc2843139e9828bcd126425cebcc886cfaf66e0ba41235df944`. All eight trigger BEGIN tokens were uppercase. Seven triggers contained only BEGIN/END; `credit_ledger_guard` contained BEGIN, CASE, CASE, END, END, CASE, END, END. The pinned Wrangler 4.92.0 splitter already returned 19 statements; ordinary SQLite and local Miniflare foundation tests passed before editing.

The remaining hypothesis is that a different hosted splitter confuses the unparenthesized SELECT CASE END guards with the trigger's END. This is consistent with the reported [Cloudflare issue 4727](https://github.com/cloudflare/workers-sdk/issues/4727), but is **not a demonstrated diagnosis of this Site's server-side parser**. The exact v78 trigger suffix is retained as `scripts/fixtures/credit-triggers-v78.sql`, not as an executable migration. The fixture demonstrates local acceptance of the historical hosted hazard and also reproduces the earlier 21-fragment whitespace defect.

Only the still-unapplied 0016 guard was changed:

- The two `SELECT CASE WHEN condition THEN RAISE(ABORT,message) END` statements become `SELECT RAISE(ABORT,message) WHERE condition`. Both evaluate RAISE only when the same predicate is true; false/NULL predicates do not abort. The same ABORT strings and statement order remain.
- The nested Guest cap CASE becomes three-argument `iif(condition,min(requested,10-balance),requested)`, preserving true/false/NULL branch selection. This removes all three CASE tokens, not merely the two outer ones. [SQLite documents iif](https://www.sqlite.org/lang_corefunc.html#iif) as equivalent to CASE with short-circuit evaluation. Local D1 comparisons cover 84 input combinations, including NULL and safe-integer bounds.
- No trigger, check, index or table was removed; ledger-to-wallet application and transaction boundaries are unchanged. Migrations 0000–0015 and the migration journal are unchanged. No 0017 was added.

New focused suite `test:credit-migration-parser` checks LF, uppercase BEGIN, no CASE in any trigger, exactly 19 Wrangler statements, complete real Miniflare D1 application, all eight trigger names, and the full 0000–0016 chain from a clean DB. Differential executions of the exact old and corrected trigger bodies verify zero-wallet enforcement, invalid state/cap/refund rejection, valid ledger application, append-only protection, direct wallet mutation/deletion blocking, exact abort messages, balances and ledger parity. Existing foundation/rewards/account suites retain concurrency, rollback, idempotency and migration coverage.

Final migration SHA-256: `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea`; 19 migration statements / eight trigger statements, LF-only. Another upstream report ([15690](https://github.com/cloudflare/workers-sdk/issues/15690)) describes a remote multi-statement request ending with a trigger; its relevance to Sites is unverified. No speculative trailing SQL workaround was added.

Validation result: all **41** `test:*` suites PASS, including foundation 103 assertions, Guest rewards 220, Google account 252, and the new focused parser suite. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, and `git diff --check` all PASS. Ordinary SQLite complete migration application also PASS. No remote parser success is claimed.

### Retry gate

No v79/deployment/Production SQL was attempted in this correction task. Sites still reports owner-only access, latest saved v78, and no five Account/Credit tables in the live inventory. The last successful publication remains v76. The connector exposes user tables only, not the actual migration journal. No dedicated non-Production remote D1 target or Cloudflare API token is configured in this execution environment, so the remote parser path was NOT TESTED.

The user's gate explicitly requires reconfirming that 0016 is not journaled/applied; table absence and the app backup marker cannot substitute for that journal read. The pre-backup remains the accepted earlier v3 export, but its current freshness and current legacy row counts were not re-established in this task. Before the single controlled retry, obtain supported journal diagnostics and a fresh admin backup (or verified unchanged legacy data), run validation/plan, then mirror the final canonical tree to the latest existing Sites tip. After success, immediate v4 backup validation/plan and legacy row checks precede all Guest/Google acceptance. Phase 9D remains unstarted.

## v79 controlled retry and real Google acceptance — 2026-10-15

Starting canonical: `9ac378b2939a6567759af0aa7822ec32928628f6` (re-fetched). The fresh administrator backup `holocron-backup-2026-10-15T12-42-01-063Z.json` was v3 / `0015_featured_work_metadata.sql`; canonical validate and plan PASS. SHA-256 `62e3936063b66907053a54169243ae59600ea7b25746288e3a1c17c6cca61a00`. Exact allowlists and credential-pattern checks PASS. Pre-retry read-only inventory lacked all five Account/Credit tables. v76 was last successful; v77/v78 failed before publication. The owner expressly accepted this converging operational evidence despite the unsupported direct Sites journal read.

ONE CASE-free migration retry succeeded as owner-only **v79**, deployment `appgdep_6ad0cad1e2908191961b3e2fe7ffe984`, published 2026-10-15T12:45:26Z. Sites commit `db9a4f90d46d09053126a3a440cb70805ca9b59c` mirrored canonical tree `0cff3763ac1d22219b0b0f3aea0843e68e41c5f7` onto existing history. Packaged 0016 SHA-256 `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea`: 19 statements, 8 triggers, zero CASE, LF-only. All 41 local test suites and lint/tsc/build/diff-check passed; focused Miniflare parser test passed again. No ad-hoc SQL or weakened invariant.

Before browser acceptance, all five tables were present and the immediate `2026-10-15T12:46:29.023Z` export passed validate/plan as v4 / `0016_account_credit_foundation.sql`. SHA-256 `17dfb6a7b2986e07b83c8982e67bb89750a891301146fcfa8016345add5da16a`. The journal itself remains unqueried; successful deployment, schema and export marker are the operational evidence.

| Legacy dataset | Fresh pre | Immediate post |
| --- | ---: | ---: |
| articles | 166 | 166 |
| works | 49 | 49 |
| quizzes | 1 | 1 |
| quiz_options | 4 | 4 |
| quiz_responses | 41 | 41 |
| beta_analytics_daily_sessions | 1558 | 1562 |
| feedback_sessions | 3 | 3 |
| settings | 5 | 5 |
| article_work_relations | 42 | 42 |

All legacy rows were preserved with exact values; analytics gained four rows, with every old row retained. Immediate new-table baseline: users 0, auth_accounts 0, principals 2, wallets 2, ledger 6, both wallets 3 CR. These Guest rows predate intentional agent public QA; their precise visit source is unproven and they were not removed.

Real browser Guest first visit displayed 3 CR and reload retained 3 CR; same-day attendance marked complete. The browser was not explicitly reset/incognito. Real Google selection, phone verification and consent reached callback, but returned `login=failed`, still Guest 3 CR, users 0. The first request exceeded the 600-second OAuth lifetime; a fresh request then failed within about 295 seconds, ruling out expiration as the sole explanation. The fresh callback was a 303, ~6 ms, with no error-level diagnostic because the route swallowed the exception. No further blind login attempts.

A minimal canonical diagnostic correction now reports **fixed stage names only** (`callback_target`, `oauth_cookie_missing`, `oauth_cookie_invalid`, `oauth_parameters`, `provider_exchange`, or `account_completion`). It preserves all rejection conditions and the generic public error; never logs request/URL/cookie/code/token/provider response/identity values or exception objects. Regression tests cover stage classification, generic redirect/cookie clearing, no DB mutation and no secret leakage. This is observability for an unresolved real login failure, not a claim to have fixed its root cause. Any later publication is an application diagnostic update, not another migration parser experiment; applied 0016 must remain unchanged.

Phase 9C.2: migration complete, **real-account acceptance blocked pending diagnosis**. Guest→Account transfer, first-login +3, account attendance deduplication, logout/relogin, final ledger audit and final post-QA backup are not yet complete. Phase 9D has not started.
