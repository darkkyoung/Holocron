# Phase 9D-F.1 — Dynamic Credit Policy release preflight

Starting canonical: `86a7799b4d9c9b277ddca976c18ef84766b5023e`, fetched from remote main with a clean tree. Final revision is the commit containing this record. **NO-GO for Production execution: actual new Chromium acceptance and fresh authorized operational evidence remain pending.** This is a prepared release gate, not a deployment or migration authorization.

## Evidence boundary

No Production request, Site inventory, D1 query/export, secret inspection, deployment, hosted migration or Provider call was performed. Historical v83 / 0018 / v6 / AI OFF evidence is recorded in `2026-10-17-credit-guide-header-login.md`; it is not a fresh observation. The old evaluation campaign and E.4 manifests/budgets are untouched. No product code, migration bytes, schema, backup contract or provider configuration changes in F.1.

## Browser preparation — NOT EXECUTED

Reused `Assistant browser QA (isolated)` (`.github/workflows/assistant-browser-qa.yml`), manual dispatch only, contents:read, Ubuntu/Chromium, actual Vinext React app, synthetic local D1, artifacts outside the Vite watched tree and existing hydration smoke gate. Added synthetic Admin credentials in the ephemeral local `.dev.vars`; these are deliberately public test values, not reusable Production credentials. No provider key is configured.

The new `credit-policy` project depends on the existing acceptance project, runs one worker/no retries, and exercises:

- Real Admin login/session/API against local D1. 375×824, 390×824, 1440×824 rendering, hydration via read-only refresh, change preview/cancel/save, confirmed revision, document/control bounds, >=44px controls and preview/saved screenshots.
- Real unauthenticated GET/POST rejection, login-page redirect, foreign-origin CSRF rejection, invalid warning/limit rejection and stale revision conflict. Refresh shows the actual winner; no save retry.
- Synthetic cumulative USD21/1000-attempt monthly row (not real calls), default USD30/20 warning, lowering limit to20, zero remaining and blocked state without losing historical usage. Restores the fixture limit through the normal policy API.
- Stale quote UI with network-boundary mocked generation: first409, refreshed9CR quote, no automatic second request, deliberate second request with new UUID/version. Backend zero-debit/admission/provider guarantees are separately exercised by real local D1 generation tests.
- Direct actual local API Full Draft rejection; existing guide UI and full regression remain required.

Existing browser payload exact-key assertion now includes `policyVersion`; this aligns with the accepted API rather than removing the exact-shape check. Existing Assistant/News tests remain intact. Test discovery finds 38 enabled-project tests (including the existing genuine visibility test which may skip) plus the separate disabled-state test. Discovery is **not execution**.

Local Playwright launch failed because Chromium headless-shell revision1248 is not installed. The connector exposes run inspection/rerun tools, but no new workflow_dispatch capability. No browser PASS, screenshots, run ID or visual claim is fabricated. No new infrastructure/dependency was added. Actual physical devices, virtual keyboard and screen reader are NOT TESTED.

Owner action after this commit is on main: GitHub → Actions → **Assistant browser QA (isolated)** → **Run workflow** → branch **main** → Run. Confirm the run's head SHA, all smoke/acceptance/credit-policy/disabled steps and regression checks; inspect `assistant-browser-qa-<run_id>` screenshots/traces/report. Share the run URL. If main advances with substantive code, review that difference before treating its results as this release. Do not deploy while this gate is pending or failed.

## 0018 → 0019 / backup review

0019 SHA-256: `afaacd686ad6632fe627f961d19d90466236a8251ce55778ec4f8efe1971709a`.

- Additive two-table policy/month history plus guards/triggers. No edits to0016–0018, no historical ledger rewrite. Seed QA5 / guide7 / Guest1 / opening1 / daily1 / Day7 total5 / Quiz3 / Account3 / monthly30 / warning20.
- Policy CAS writes and subsequent reward/admission SQL use D1 current state. In-flight debit amount is read from its immutable ledger entry, not a later price. The old quote rejects before mutation.
- Monthly reserve and Credit debit are atomic; verified actual usage reconciles once. Unknown timeout/failure cost retains reservation even after Credit refund/admission cleanup. Late settlement belongs to admission's KST month. UTC USD2 daily limit remains separate and unchanged.
- Real local D1 tests cover clean chain, populated0018 upgrade, existing ledger equality, exact Wrangler splitter, rollback at every split boundary, concurrent reservation/save, policy updates, refunds and audits. Local batch rollback is **not proof of the hosting platform's migration orchestration or Worker publication order**.
- v6 keeps14 datasets and its historical audits. v7 adds only policy revisions/monthly costs (16total), checks policy previous-value chain/defaults and monthly counters; admissions/security state remain excluded. Validate/plan are read-only local operations; no restore executor exists.

## Establish pre-0019 Assistant cost coverage (required before GO)

A current empty admission table, zero dashboard, absent key, backup marker or today's OFF flag alone cannot prove no deleted historical cost. v6 intentionally excludes admissions. Obtain authorized, timestamped platform deployment/environment history spanning Assistant-capable runtimes, showing OFF throughout; review dedicated Assistant configuration history without disclosing values. Corroborate with a complete validated fresh Credit ledger (all historical `ai_spend` entries, if any) and supported platform execution/usage records. The approved production pipeline must debit before dispatch, so preserved debit history is useful independent evidence; unrelated collection/evaluation API usage is not Assistant monthly usage.

If any historical spend/activation exists, reconcile retained admissions against durable spend/refund history and supported Assistant-specific usage evidence, including unknown/lost calls. A refunded debit still represents a possible external charge. If costs were deleted or evidence coverage is incomplete, **STOP**. Do not set missing usage to0, manually populate a guessed opening balance, relax the guard or rerun migration. Request a separately reviewed correction/coverage decision. The user's PC evaluation3calls are not Production costs and cannot be imported as such.

## Controlled execution checklist — separate owner approval required

1. Obtain explicit authorization for supported read-only Production inventory and natural page-visit effects before inspection. Record Site ID/version/deployment ID/runtime canonical provenance, latest Sites tip, environment revision/AI OFF, D1 binding and supported migration evidence. Do not request passwords/cookies. Unexpected0019/partial application or unknown0018 status: STOP.
2. Owner uses existing authenticated **D1 백업 다운로드** (`POST /api/admin/backup`) immediately before change. Secure private original **v6/0018**, filename/time/SHA256. Do not publish rows or auth/Guest identifiers. Run canonical `pnpm backup:validate <private-file>` and `pnpm backup:plan <private-file>`; both must PASS. Marker is app contract, not journal proof.
3. Capture private row-key/value baseline of all14 datasets, particularly users/auth links, principals/retirements, wallets/balance/version, ledger requested/applied/sequence/idempotency/refunds, Quiz responses and manual Article/Work data. Record safe counts/hash only. Audit cost coverage as above. If concurrent operating changes make baseline stale, obtain a new export rather than assume no changes.
4. Verify exact reviewed tree/migration hash and fresh Sites tip; review full delta from deployed runtime. Preserve independent histories, origin, existing public Site/secrets/scheduler. Confirm the supported hosting route applies **0019 successfully before exposing the compatible Worker**. New rewards require0019 even AI OFF. If the platform cannot demonstrate this ordering or migration transaction behavior, STOP; do not publish first or substitute ad-hoc SQL.
5. Only with explicit later migration/deployment approval: normal content-level mirror onto latest Sites tip, normal push and the one approved supported deployment. Capture0019 logs/result, deployment ID, runtime/tree and table/trigger evidence available through supported tools. No automatic retry after failure/ambiguity, no trigger removal or repair SQL. No unrelated-history merge/rebase/force push/new Site.
6. After confirmed success, verify Admin default policy/revision and UI, AI OFF/COMING SOON, protected endpoints and public News/Works/Quiz/Roadmap. Observe existing Account/Credit and natural permitted visits only. Do not create Accounts, submit Quiz answers or change prices/rewards merely to test Production. Use local tests plus preserved historical entries for destructive/one-time reward cases; clearly mark unexercised live behavior.
7. Immediately download a fresh private **v7/0019** via the same authenticated export; SHA256, validate/plan PASS, exactly16datasets. Verify default policy revision and expected monthly backfill; no operational/security export. Failure to obtain or audit it blocks acceptance.
8. Compare every old row by stable key and value against v6. Existing ledger entries must be byte/value-preserved; new entries must explain wallet deltas/versions/sequences, caps/refunds/idempotency. No unexplained deletions. Mutable archive/analytics/attendance changes must be tied to legitimate concurrent operations, not dismissed as count growth. Compare all14 legacy datasets plus audit both new datasets. Record actual outcomes, never infer from marker alone.

Failure anywhere: stop further mutation/deploy/retry, preserve safe platform evidence, report impact and seek separate incident approval. **Code rollback is not D1 rollback.** Logical backup is not an automatic restore or recovery-time guarantee. No restore/ad-hoc SQL/guard bypass is authorized. If platform partly applies0019, do not assume local rollback proof means hosted rollback occurred.

## Local validation / decision

Fresh local run: **58/58 non-browser suites PASS**, including the explicitly pinned historical evaluation/0018 suites (not current live-model acceptance). Credit policy262 assertions, editor18, current migration/parser, generation/grounding/admission/refund/Guest/Account and backup regressions PASS. `pnpm lint` PASS with the known unused `debit` warning only; `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`, JavaScript syntax/test discovery and expression-aware `actionlint` PASS. Browser execution and current Production state/backups/cost coverage remain pending, regardless of local test results. No E.4 execution or manifest change; frozen live-evaluation gate remains closed on changed product pipeline.

**Decision: NO-GO for actual Production migration/deployment approval at this checkpoint.** Next action is the single manual browser QA run, then separately authorized read-only inventory/fresh backup/cost-history verification. Once those gates and platform ordering are evidenced, present the exact reviewed tree and controlled0019→runtime→v7 plan for owner approval. This task performs none of those Production changes.
