# Phase 9D-E.2 — Controlled Production migration and post-backup audit

Date: 2026-10-17 UTC. Starting and deployed runtime canonical: `4e450b2286a4090397c3d73d6e3b90cbe8af5a9e`, tree `7338e95333b724bdffe62b76da1c2f2080c0d3cb`. Direct fetch before preparation and again before publication found no concurrent changes. The documentation publication containing this record does not require another Site deployment.

**Current status: the single v82 deployment and post-migration v6 backup/data/ledger audit passed. Overall E.2 remains BLOCKED on the uncompleted Production service regression checks described in the continuation below.**

Historical deployment checkpoint (before the post-backup attachment): **One authorized deployment succeeded as v82; authenticated post-migration backup and preservation audit were still pending.** Do not treat successful publication or table presence as completed data acceptance. No second push/deploy/retry, restore, ad-hoc Production SQL, secret/access change, AI activation or real provider call was performed. Earlier E.1 and 9D blocked checkpoints remain historical evidence.

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


## 2026-10-17 continuation — post-backup and preservation PASS; service regression gate BLOCKED

Resumed canonical was fetched directly and remained `a374272a10030edcdbc0a7d3729d7f359dbbc7c8` (the earlier deployment-record commit). Its only differences from deployed runtime `4e450b2286a4090397c3d73d6e3b90cbe8af5a9e` were documentation. No application, migration, Credit, backup or provider implementation changed in this continuation. The final record commit is a documentation-only descendant of that SHA; its exact SHA is reported after publication rather than embedded self-referentially.

### Original post-migration artifact

The owner supplied `holocron-backup-2026-10-17T08-58-15-382Z.json`, original administrator export, **v6 / 0018_account_partial_refund.sql**, `d1-read-batch`, 631,824 bytes. SHA-256: `60028e2dbaea07ebe18977c7427f28acea46e7efe54864288d5f7905c62e63d5`. Created `2026-10-17T08:58:15.382Z` / **17:58:15 KST**. This is approximately **2 h 45 m after successful deployment**, not a literally immediate snapshot; that timing limitation is preserved. No intervening backup is claimed. Both original files stayed private and unchanged.

Executed against the unmodified original with current canonical:

- `pnpm backup:validate /absolute/private/path/holocron-backup-2026-10-17T08-58-15-382Z.json` — exit 0, PASS.
- `pnpm backup:plan /absolute/private/path/holocron-backup-2026-10-17T08-58-15-382Z.json` — exit 0, PASS; source v6, target 0018, `dryRun:true`, `executable:false`.

The exact fourteen datasets/columns and five permitted settings keys pass the canonical allowlists. `assistant_admissions`, collection leases, authentication rate limits, feedback cooldowns and security settings are absent. All datasets fit 5,000 rows / 1 MiB; largest measured compact SQL-row JSON payload is 403,306 bytes, and the artifact fits 16 MiB. A limited private credential-pattern scan returned zero matches; it does not certify arbitrary free-form content as universally secret-free. No raw backup, identity value, Guest digest or individual ledger row is published.

### Row-level preservation and operational delta

The original pre-v82 artifact was rehashed and matched `ea49a2730283cef9bb02bea8ebd22dc76bb597feadf7617b05e878710623942e`. Comparison keyed each dataset by its actual primary/composite key and compared every column value, not just counts. **Every pre-existing row in all fourteen datasets is unchanged. There are zero removed rows and zero modified existing rows.**

| Dataset | Before v82 | Post v82 | Added | Removed / changed |
| --- | ---: | ---: | ---: | --- |
| articles | 172 | 172 | 0 | 0 / 0 |
| works | 49 | 49 | 0 | 0 / 0 |
| quizzes | 1 | 1 | 0 | 0 / 0 |
| quiz_options | 4 | 4 | 0 | 0 / 0 |
| quiz_responses | 41 | 41 | 0 | 0 / 0 |
| beta_analytics_daily_sessions | 1601 | 1611 | 10 | 0 / 0 |
| feedback_sessions | 3 | 3 | 0 | 0 / 0 |
| settings | 5 | 5 | 0 | 0 / 0 |
| article_work_relations | 45 | 45 | 0 | 0 / 0 |
| users | 1 | 1 | 0 | 0 / 0 |
| auth_accounts | 1 | 1 | 0 | 0 / 0 |
| credit_principals | 20 | 25 | 5 | 0 / 0 |
| credit_wallets | 20 | 25 | 5 | 0 / 0 |
| credit_ledger | 58 | 73 | 15 | 0 / 0 |

The **58 original ledger entries are exactly preserved**. All 73 entries and 25 wallets pass the canonical v6 audit: integer-safe requested/applied effects, contiguous per-wallet sequence, resulting balance, wallet version, ownership/reference graph, unique IDs and wallet/idempotency keys, original-debit refund entitlement and Guest cap. Additional private reconciliation checked retirement/zero balance, no entries after retirement, the single migration transfer pair and the single Account first-login reward. No duplicate migration/first-login claim appeared.

All five new principals are Guests. Each has exactly three +1 ordinary reward entries (first visit, opening, KST attendance) and balance/version 3. All fifteen new entries were created after v82 succeeded, between `06:13:53.103Z` and `06:35:16.924Z`; they explain the entire +15 CR aggregate delta. Total balance is 73 CR; existing Account balance remains **6 CR**, unchanged. The ten new analytics rows have valid first/last timestamps within the backup interval and positive page-view counts. These records are consistent with normal public visits; no assertion identifies the visitors or attributes them to a particular operator. No new Account, Quiz response, AI spend or refund exists in this delta. Production Account partial/zero refund execution is therefore **NOT TESTED**, not inferred from a zero-refund ledger.

### Supported Production checks and limits

The Sites skill/native read-only operations were used; no source credential, mirror, save-version or deployment operation was requested in this continuation.

| Check | Observed evidence |
| --- | --- |
| Current Site | Active **public v82**, `https://holocron.kr`; no version/access change |
| Environment | Revision **40**, no `HOLOCRON_ASSISTANT_*` names; reviewed deployed configuration enables only exact `true`, so **OFF** |
| Schema inventory | **18 tables**, DB binding, no omitted/truncated names; all legacy and five Account/Credit tables remain |
| Operational admissions | Supported table read returned **zero rows**, `has_more:false`, no truncation |
| Admin protection | Real cloud browser navigation to `/admin` redirected to `/admin/login` and rendered the ID/password form; no credentials entered or login submitted |
| Admin export | Owner-supplied v6 artifact validates; supports export availability at its timestamp, not an agent-authenticated Control Room session |
| Assistant routes | Real browser GET to `/api/assistant/retrieve` and `/api/assistant/generate` returned safe `METHOD_NOT_ALLOWED` JSON; no prompt, receipt, provider call or Credit mutation |
| Account preservation | Existing user/provider linkage, migration history and Account 6 CR unchanged; not a fresh Google-login/UI test |
| Scheduler | GitHub still reports run `39002927544` success, created before v82. No post-v82 scheduled run is present in the latest listing; post-v82 scheduler execution remains NOT TESTED |

GET method rejection does **not** prove POST disabled behavior. Live rendered News launcher/COMING SOON, News/Works/Quiz/Roadmap interactions, Credit panel, real Google login/logout and authenticated management interactions remain **NOT TESTED** in this continuation. The user's latest instruction prohibits Production data changes: reviewed code automatically POSTs `/api/credit/visit` from public Header hydration, and News/Works/Quiz also POST `/api/analytics/view`. Those full-page browser visits were deliberately not made. The available cloud-browser surface does not expose request interception or a per-context no-JavaScript mode for preventing these writes. No browser setting or application code was changed to bypass this limitation.

A separate, no-JavaScript HTTP GET to `/assistant` was denied with **HTTP 403, Cloudflare error 1010** (safe diagnostic only). One diagnostic read confirmed that result; no fingerprint/header/network workaround or request loop was attempted. This is a failure of that HTTP client path, **not proof that the public Site is down**; the cloud browser's administrator and API GET checks succeeded. Actual Assistant POST fail-closed verification and rendered COMING SOON cannot be claimed from this failed HTTP request.

The existing normal migration-before-Worker success, verified package hashes, new table presence, v6 export and valid post-v82 ordinary Credit writes are consistent with successful 0017/0018 application. Internal hosted journal rows, migration transaction boundaries and installed trigger SQL remain unavailable to supported inspection. A backup marker alone is not their proof. No direct SQL was used to fill that gap.

### Validation, decision and remaining gate

The deployed runtime has no code changes since this E.2's already-completed **51/51 regression suites**, lint, TypeScript and build passes; original log results were rechecked. Those are local results, not live-service acceptance. This continuation reran both backup commands, private full-row and ledger audits, `pnpm test:backup`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` and `git diff --check`: all passed (the same pre-existing lint warning remains). Earlier blocked records remain historical. The post-backup contains no observed integrity failure.

**Data preservation / post-backup / Credit audit: PASS. Overall E.2: BLOCKED on remaining Production service acceptance, not FAILED and not a migration retry request.** No further deployment or migration is needed or authorized for closing this verification gap. The next action is either supported browser inspection that prevents mutating background requests, or explicit operator approval/evidence for ordinary existing-service visits with their documented natural reward/analytics effects. Any such resumed inspection must remain separate from AI generation, Quiz submission, new test Account creation or artificial Credit manipulation. Do not weaken the latest no-data-change restriction by assumption.

This continuation performed **zero Production data mutations, deployments, migrations, restores, secret/access changes, AI activations or real provider calls**. Canonical documentation publication only; Sites commit remains `cc83f568c11a7bcfe10a15d67b49c22c50e24770`, runtime tree `7338e95333b724bdffe62b76da1c2f2080c0d3cb`. No second Site deployment for this record. Physical mobile, virtual keyboard, screen reader, genuine visibility transitions, real provider quality, post-v82 Google auth and Production refund-boundary exercises remain untested. Do not start the next phase.
