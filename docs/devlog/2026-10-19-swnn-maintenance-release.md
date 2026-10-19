# Phase 9D-F.5A-R — SWNN maintenance Production release

Date: 2026-10-19 (UTC)

## Verdict

**DEPLOYED / ACCEPTANCE PARTIAL.** One authorized deployment succeeded. HTTP/service data checks passed; interactive browser, mobile, authenticated Account/Credit display, and live collection acceptance remain NOT VERIFIED. No rollback or second deployment was performed.

## Provenance and scope

- Starting and deployed canonical: `5aa8a7bf60ece594bdc7d33fb68c6a977f03eddd`.
- Deployed canonical/Sites tree: `83d25a07937cc884f97d835322928cdbd52a6536`.
- Final canonical publication adds only this release record; its commit is not deployed.
- Previous accepted runtime: canonical `69963acebeb3096c57801cbc25710cdaff94960d`, Sites `b620a92cc5fb7e52c6bd4e5fa409b8d28e3789c6`, tree `f76dfe3b52f176090a3c6001eae7b97da789f36b`.
- Fresh canonical fetch before publication still matched the deployed revision.
- Full baseline-to-target diff reviewed: 25 files. Runtime changes are confined to five F.5A collection modules: candidate-queue, metadata, processor, sources/swnn and sources/types. Other changes are evaluation tooling/tests/docs and two package commands, without dependency or build-command changes.
- No changes to app/components, schema/migrations, Credit, identity, Assistant runtime, backup, Admin, hosting config, lockfile or workflows relative to the v84 canonical baseline.

F.5A supplies WordPress REST `_links` for embedded media, preserves existing image fallback paths and bounded 15-second requests, and excludes SWNN leading `This Week` titles/weekly URL slugs before AI/persistence. Discovery-time exclusions do not consume the 12-new-article limit. Metadata-time title discovery has a defensive processor check before AI/persistence. Existing image URLs and administrator decisions are not rewritten.

## Deployment evidence

| Item | Before | After |
| --- | --- | --- |
| Site version | v84 | v85 |
| Deployment | `appgdep_6ad508d39af481918fe15da7c5338df0` | `appgdep_6ad5f84d43508191afcd984e7e0b34f3` |
| Sites commit | `b620a92cc5fb7e52c6bd4e5fa409b8d28e3789c6` | `6dc1e0737536eacce696b8aba311eb41dfbcf9bd` |
| Environment revision | 40 | 40 |
| D1 binding | DB | DB |
| Access/domain | public / holocron.kr | unchanged |
| Schema baseline | 0019 | unchanged |

Native deployment status: **succeeded**, completed `2026-10-19T11:00:48.584998+00:00`. The Sites commit directly descends from the previous tip; canonical content was mirrored via the supported source workflow and pushed normally. Source, build, package and published tree were checked.

Environment entries were compared without exposing secret values and were unchanged. The Assistant enable flag remains absent, with the unchanged runtime default OFF. No environment, secret, domain, scheduler or access-policy mutation was requested.

All 20 packaged migration files and the journal match canonical and the prior runtime. The 0019 SHA-256 remains `afaacd686ad6632fe627f961d19d90466236a8251ce55778ec4f8efe1971709a`. No new migration or ad-hoc SQL was executed. The internal hosted migration journal is not directly exposed; 0019 continuity is supported by the accepted v84 baseline, unchanged migration files and the two policy/budget tables present before and after deployment, not by a new journal inspection.

The previous archive-backed v84 version was identified as the supported Sites-only rollback target, with the same schema/environment. No rollback was needed.

## Fresh verification on the deployed source

- Twelve suites PASS: collection, backfill, image-recovery, collection-health, metadata-recovery, ai-recovery, source-settings, scheduled-collection, admin-overrides, stories, news-explorer, story-stack.
- SWNN image fallbacks and weekly exclusions use fixtures/mocks; no Provider calls.
- TypeScript PASS; build PASS; diff-check PASS.
- Lint exit 0, with the existing unused `debit` warning in `scripts/test-assistant-refund-safety.mjs`.
- The supported Sites source workflow also built the exact mirrored tree successfully.
- GitHub REST returned zero Actions runs for `5aa8a7b...`. No current-revision CI PASS is claimed. Historical browser run 39133962559 belongs to `69963ac...`.
- The known E.5B evaluation runtime-hash mismatch is an intentional integrity block after collection source changes. No evaluation manifest, approval, journal or budget was changed, and no live evaluation was repeated.

## Backup and data safety

The existing private F.4 v7 original was checked again:

- Generated: `2026-10-18T18:09:01.443Z`.
- SHA-256: `e2097e564746911525b92e8d412f23624f89e1a00f2c6a1790eeba76fa004539`.
- v7 / `0019_credit_policy_budget.sql` / 16 datasets.
- Canonical `backup:validate` and `backup:plan`: both exit 0.
- This is historical backup evidence, **not a fresh predeployment snapshot**. No restore was executed.

A new export/admin-login attempt was not required for this schema-unchanged maintenance release: schema, backup, Credit and identity contracts are unchanged. The previous unsafe credential-resume problem was not retried.

Supported read-only Production article pagination was exhausted before and after deployment. Comparing every field by article ID:

| Dataset/check | Before | After | Deleted | Changed | Added |
| --- | ---: | ---: | ---: | ---: | ---: |
| Articles | 177 | 177 | 0 | 0 | 0 |
| Credit policy revisions | 1 | 1 | 0 | 0 | 0 |
| Assistant monthly costs | 0 | 0 | 0 | 0 | 0 |

Article comparison includes stored image, status and administrator override fields. SWNN remains 76 articles, four empty image URLs, six weekly articles including three published. None was recovered, excluded, deleted or regrouped.

These paginated read-only observations are not a transactional backup or a new 16-dataset preservation audit. Current wallet/ledger/Account rows were not independently re-audited. Their runtime/schema/environment paths are unchanged; historical F.4 acceptance is preserved without relabeling it as a fresh audit.

## Production acceptance

Direct no-cookie HTTP GET checks against holocron.kr, without executing JavaScript:

| Path | Observed |
| --- | --- |
| / | HTTP 200, news page HTML |
| /works | HTTP 200 |
| /quiz | HTTP 200 |
| /roadmap | HTTP 200 |
| /admin/login | HTTP 200 |
| /admin/credit-policy | HTTP 307 to /admin/login |
| /assistant | HTTP 200, COMING SOON in rendered HTML |
| /api/news | HTTP 200, 93 published articles |
| /api/scheduled/collect | HTTP 405 for GET only |

GET rejection does not prove scheduler POST authentication or successful collection. The unchanged workflow uses cron `17 * * * *`. Latest observed natural scheduled run 39218585728 succeeded at a prior revision (`be6965a...`, created 2026-10-19T07:50:23Z), before this deployment. It is not evidence of v85 collection or new article storage.

A public SWNN image URL returned HTTP 200/image/jpeg (72,469 bytes). This proves that one source image was accessible from the check environment, not that missing Production images were recovered or that browser image rendering passed.

Actual browser rendering, news detail navigation, search/filter interactions, mobile layout, login/Account balance and authenticated policy display: **NOT VERIFIED**. Normal browser initialization can POST visit rewards and analytics, which this task forbids. No automated admin login or credential recovery was attempted. HTTP/SSR checks are not browser acceptance.

Weekly exclusion: **DEPLOYED / SYNTHETIC TEST PASS / LIVE FILTER NOT YET OBSERVED**.
Image pipeline: deployed and fixture-tested; successful new Production collection/image recovery remains **NOT VERIFIED**.

## Boundaries and remaining work

- Work-initiated Production D1 data writes, migration/restore, collection POST, reward tests, quiz submissions, policy saves and image recovery: NONE.
- Actual Provider calls: ZERO. AI activation: NONE.
- Existing four missing SWNN images remain for a separately approved recovery task.
- Existing six weekly articles, including three published, remain preserved.
- Obtain normal user browser evidence for the unverified service interactions before claiming full release acceptance.
- Observe natural scheduler diagnostics for the new filter/image behavior; do not force collection merely to manufacture acceptance.
- E.5C evaluation is separate and was not started.
