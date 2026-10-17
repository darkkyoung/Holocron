# Phase 9D-E.2 — Controlled Production migration (post-backup gate pending)

Date: 2026-10-17 UTC. Starting and deployed runtime canonical: `4e450b2286a4090397c3d73d6e3b90cbe8af5a9e`, tree `7338e95333b724bdffe62b76da1c2f2080c0d3cb`. Direct fetch before preparation and again before publication found no concurrent changes. The documentation publication containing this record does not require another Site deployment.

**One authorized deployment succeeded as v82. Overall E.2 acceptance remains BLOCKED / awaiting authenticated post-migration v6 backup and preservation audit.** Do not treat successful publication or table presence as completed data acceptance. No second push/deploy/retry, restore, ad-hoc Production SQL, secret/access change, AI activation or real provider call was performed. Earlier E.1 and 9D blocked checkpoints remain historical evidence.

## Fresh pre-migration gate

The owner supplied the unchanged original administrator export `holocron-backup-2026-10-17T06-04-39-214Z.json`, created `2026-10-17T06:04:39.214Z`, 621,827 bytes, **v4 / 0016_account_credit_foundation.sql**. SHA-256: `ea49a2730283cef9bb02bea8ebd22dc76bb597feadf7617b05e878710623942e`. The original remains private, outside Git and deployment archives; its hash was unchanged after deployment.

Latest canonical `pnpm backup:validate <original>` and `pnpm backup:plan <original>` both exited 0. Plan reports `dryRun:true`, `executable:false`, source v4/0016 and target 0018. No restore was executed. Validation checks exact datasets/fields, uniqueness, references, identity graph, contiguous ledger sequences, requested/applied effects, original-debit bounds, wallet balance/version, per-wallet idempotency and Guest cap. Additional private auditing verified migration transfer pairs, retirement/zero balance, one first-login reward, no post-retirement writes and new reward provenance. No inconsistencies were found.

Comparison used the actual prior E.1-B original, SHA-256 `6e79f82ac472dbad8d5714eed0e52df0d6816847eeb324f5c2d66801373d1109`, not only historical counts. **Every pre-existing row and value in all fourteen datasets was preserved; only additions occurred.**

| Dataset | E.1-B checkpoint | Fresh pre-v82 baseline | Added |
| --- | ---: | ---: | ---: |
| articles | 170 | 172 | 2 |
| works | 49 | 49 | 0 |
| quizzes | 1 | 1 | 0 |
| quiz_options | 4 | 4 | 0 |
| quiz_responses | 41 | 41 | 0 |
| beta_analytics_daily_sessions | 1593 | 1601 | 8 |
| feedback_sessions | 3 | 3 | 0 |
| settings | 5 | 5 | 0 |
| article_work_relations | 45 | 45 | 0 |
| users | 1 | 1 | 0 |
| auth_accounts | 1 | 1 | 0 |
| credit_principals | 17 | 20 | 3 |
| credit_wallets | 17 | 20 | 3 |
| credit_ledger | 49 | 58 | 9 |

The nine new ledger entries are ordinary +1 rewards belonging to three new Guest wallets (three rewards / 3 CR each); prior wallets and ledger rows are unchanged. Total wallet balance is 58 CR; aggregate Account balance remains 6 CR. One migration pair and one Account first-login claim reconcile. AI spend/refund rows: zero. These additions are consistent with normal collection/visits; exact visitor identities are neither attributed nor disclosed.

All fourteen datasets fit the 5,000-row / 1 MiB SQL-JSON budgets; largest measured dataset is 399,169 bytes. The artifact fits 16 MiB. Exact table/column/settings allowlists exclude operational/security state. A limited private credential-pattern scan found zero matches; it is not a universal secret detector for free-form editorial text. Durable pseudonymous identity fields remain private. No backup payload, identifier, hash of a Guest identity, or individual ledger row is published.

## Pre-deployment state and independent checks

- Supported Sites reads: **active public v81**, deployment `appgdep_6ad0dac51a3c8191b62ed78d2522afac` succeeded, environment revision **40**. Existing Admin/Google/Guest/Account/scheduler secret names are registered. No `HOLOCRON_ASSISTANT_*` setting exists; absence keeps the flag OFF. Values were not printed or changed.
- Binding **DB**: 17 user tables, no omitted identifiers; all five Account/Credit tables exist, `assistant_admissions` absent. Internal migration journal, index definitions and trigger SQL are not exposed. The v4 marker is an application contract, not direct journal proof. No supported evidence contradicted the accepted 0016 baseline.
- The supported source helper fetched the existing Sites repository and found latest tip `de0366b58342f4a24c8e333112ee63e953465861`, matching v81. No unrelated-history operation, origin change or force push occurred. Automatic publish-on-push was **false**, with no active publication window.
- Scheduled collection run [39002927544](https://github.com/darkkyoung/Holocron/actions/runs/39002927544), created `2026-10-17T04:32:06Z` before the fresh backup, completed successfully; its production-trigger step succeeded. This work did not dispatch collection or change its configuration. Continuous source health is not inferred.
- Browser QA [38927671755](https://github.com/darkkyoung/Holocron/actions/runs/38927671755) was rechecked as successful on `c272f1e...`. Current runtime differs from that revision only in four documentation files. Its previously verified Chromium 156 result remains 14 passed / one genuine-visibility skip, plus one disabled-state pass. No new Chromium run or Production browser acceptance is claimed here.

All **51 non-browser test suites** were rerun from current package.json with `pnpm <test-script>` and passed. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` and `git diff --check` also passed (55 commands, all exit 0). Lint retains the pre-existing unused-variable warning. Migration/parser, Credit foundation, Guest rewards, Google Account/runtime, admission/recovery/headroom, backup and Account partial-refund tests were included. The partial-refund suite again proved the real local D1 clean chain, populated upgrade, four-statement parser, rollback/interruption guard and versioned audits. These local checks do not prove hosted transaction boundaries.

The Sites checkout was content-mirrored from the exact canonical commit; its staged and final source tree matched `7338e95333b724bdffe62b76da1c2f2080c0d3cb`. Its separate build also passed. The installer helper initially could not directly execute a non-executable checked-in shell script; running the same existing installer through `bash scripts/sites-env.sh -- bash scripts/install-pnpm.sh` succeeded, with no source/mode/lockfile changes. This was a local preparation issue, not a hosted migration failure or deployment retry.

## Single publication and migration evidence

| Item | Verified result |
| --- | --- |
| Sites parent | `de0366b58342f4a24c8e333112ee63e953465861` |
| Normally pushed Sites commit | `cc83f568c11a7bcfe10a15d67b49c22c50e24770` |
| Runtime canonical / tree | `4e450b2286a4090397c3d73d6e3b90cbe8af5a9e` / `7338e95333b724bdffe62b76da1c2f2080c0d3cb` |
| Saved version | **82**, `appgprj_6aa6b548ff20819191ecfb6ed6837cd6~appgver_dcd4efc293308191ab8817dc9ac57790` |
| Deployment | `appgdep_6ad311e52b588191a0165d8d96252f48`, **succeeded**, no failure message |
| Terminal update | `2026-10-17T06:13:12.358325+00:00` |
| Environment / audience | revision **40**, still **public**, no Assistant settings |
| Live custom domain | `https://holocron.kr`, active v82 |
| Local package | 1,898,560 bytes, SHA-256 `7dd03092a28b153130942eadce3a979f193acdd5df157eb2ad3c1deb4e0e434e` |
| Native saved archive content hash | `sha256:080aacbbcb253e862ce9aa9202f8b07b67f5251d5d201a399807d3d9e13c3773` (platform-reported metadata, distinct from local tar-byte hash) |

Before saving, packaged SQL bytes were compared to source. Approved hashes were unchanged:

- 0016: `4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea`
- 0017: `24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16`
- 0018: `765c35b257ff7e4e4a732eca692e71db8758c42f6d956a92e775f6a6bc58b2e2`

The packaged journal retained consecutive entries 0–18 and ordered 0017 before 0018. No backup, `.env`, `.env.local` or `.dev.vars` file was packaged. The Sites storage contract applies pending migrations before Worker upload; the single normal deployment completed successfully. Immediately afterward the supported DB overview returned **18 tables**, including the newly present **assistant_admissions** and every pre-existing table, with zero omitted identifiers. This is direct table-presence evidence for 0017, plus successful normal deployment evidence for the packaged 0017/0018 chain. Individual hosted migration logs, internal journal rows and the installed 0018 trigger body are **not directly inspected**; do not mislabel inventory as that proof.

0018 changes only the Account refund applied-effect branch. No application SQL repair, historical-row edit, manual trigger removal or direct Production SQL was performed. The temporary guard and rollback limitations remain as reviewed in [E.1](2026-10-16-production-migration-preflight.md). A code rollback is not D1 rollback; no automated restore is available or authorized.

## Immediate post-backup gate — awaiting owner attachment

The Work browser's existing administrator login check showed the login form, not an authenticated session. No password/cookie was requested or extracted. After successful deployment the owner was asked immediately to use the existing **D1 백업 다운로드** control and attach the unchanged JSON privately. No post-migration artifact has yet been obtained in this checkpoint.

Required next artifact: fresh **v6 / 0018_account_partial_refund.sql**, fourteen datasets. Filename/hash/counts, validate/plan, post-migration wallet/ledger audit and pre/post row preservation: **PENDING / NOT TESTED**. The pre-backup is not relabeled as v6. The marker alone will not prove the internal journal/trigger body.

Resume by validating/planning that original with current canonical, then compare all pre-existing keys and values against the fresh pre-v82 artifact. Existing 58 ledger entries must be unchanged. Reconcile any new wallet balance/version with valid appended entries; explain live collection, analytics and other legitimate mutable-state changes. Any unexplained deletion/edit, audit error or incomplete artifact means STOP without retry/restore/ad-hoc SQL.

Public News/Works/Quiz/Roadmap, protected Admin, real Google/Guest/Account UI and rendered COMING SOON / disabled API acceptance are deferred until the post-backup safety gate passes. AI OFF is verified from unchanged server configuration and reviewed default-false code, not claimed as a new rendered browser result. No fake Account/Quiz/Credit data was inserted and no real provider call was made. Physical mobile, virtual keyboard, screen reader, real provider quality and genuine visibility remain outside completed acceptance.

**Do not deploy again for this documentation or automatically retry v82.** Only the authorized read-only backup/data checks and subsequent non-destructive existing-service acceptance remain. AI/provider enablement and any incident repair still require separate authorization.
