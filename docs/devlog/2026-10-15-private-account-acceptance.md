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
