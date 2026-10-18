# Phase 9D-E.4 — Bounded MVP live evaluation preparation

Starting canonical, freshly fetched: `e89b61dc162190bd47f20456fb2bedb73d6bd07a`. Final canonical is the commit containing this record, verified and reported after publication. Scope: isolated preparation only; no Provider/key/Production/UI activity.

## Decision and implemented scope

Current MVP is Q&A 5 CR and video structure guide 7 CR. Reused existing public corpus, `evaluateCase`, local Miniflare D1, production retrieval/receipt/admission/generation/validation/freshness/settlement and the existing budget coordinator. All old `scripts/assistant-eval` files and frozen manifests/cases/rubric remain byte-identical. No new platform, schema, prompt, validator, provider/profile, policy or dependency.

Added `evaluation/assistant-mvp/{cases,rubric,manifest}.json`, README, small `scripts/assistant-mvp/{fixture,prior,run}.mjs`, focused test and package commands. Six public cases P41–P46: Q&A normal/comparison/limited evidence and Guide normal/comparison/limited evidence. Two proposed smoke cases P41/P44, four later owner-gated cases; four mock-only rejection controls. Work prepared criteria before new live output; owner review pending. Corpus remains the 2026-10-17 public projection, not a new Production snapshot. Exact provenance, hypotheses, allowed/forbidden claims and review criteria are in the evaluation folder.

Maximum planned reservation is $0.1584, within proposed 6/$0.20. User-reported previous consumption is 3/$0.0864 reserved, $0.013083 usage estimate; actual PC audit still pending. Read-only prior inspection validates approval/journal/ledger correspondence and refuses different history. Synthetic test reconstruction is explicitly separate from user PC evidence. Expired approval is reported; no deadline changes, R1 continuation or P07 retry.

**Preparation is executable; live execution remains BLOCKED** pending actual PC reconciliation, new owner scope/deadline/retention authorization and the small locked carry-forward handoff described in the README. Current `--live` always rejects before any runtime/key access. Existing generic budget cannot accept modified approval configuration; silently creating a fresh unrestricted campaign would violate the user's aggregate limit. Rather than add speculative campaign infrastructure, this revision stops at the requested no-spend preparation boundary. A successful audit alone never authorizes live calls. Both future smoke results require owner review before rest.

## Observed local findings

- First mock ordering exhausted six paid reservations before negative controls; the existing coordinator correctly refused a seventh preflight reservation even though a control would not send. Run controls first, as the original runner does. No budget rule changed.
- Synthetic historic fixture initially used a wrong Planner weight (2 instead of current 4); corrected fixture to match the unchanged domain policy.
- Read-only SQLite inspection updates WAL shared-memory read marks. The preservation assertion excludes only `-shm`; database/WAL, approval/journal bytes and repeated logical audit digest must remain identical. No production or historic user files were involved.
- Mock output is a simple valid support excerpt/outline. Passing it cannot establish Korean/guide usefulness or a meaningful 3–5-section result; semantic reviews remain NOT TESTED.

## Validation

All **12 focused suites PASS** (8 current-code suites including the new MVP test, plus 4 explicitly historical evaluation suites pinned to `2ec1a2b05862f7ccb4a9b7426c59f14268411e02`). New MVP: **94 assertions PASS**, six mock paid-path attempts / 158,400 reserved micro-USD, four zero-attempt controls, 16 local ledger entries audited. Default dry-run: zero paid-path attempts. Current generation 1,431; provider 84 (including real workerd tokenizer/transport checks); retrieval 513; admission 263; refund safety 586; account partial refund 233 assertions PASS; Credit foundation suite PASS. Historical evaluation/diagnostics/revision/clock: 301/315/167/68 assertions PASS. These historical passes are not current MVP content acceptance.

`pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`: PASS. Lint retains the previously existing refund-safety unused-variable warning, no new errors. UI was not changed, so no browser rerun or unrelated whole-repository suite rerun was added. Protected-path diff confirms no changes to `lib`, `app`, `components`, schema/migrations, old evaluation code/fixtures or dependency lockfile.

Tests use no real key and block global outbound fetch. They cover all six current HTTP/service paths, four rejection controls, exact 5/7 CR settlement, malformed output/full refund/safe diagnostics, reservation exhaustion/resume, old expired state audit, unchanged historic files, corrupt/missing/locked/changed approval rejection and secret-free reports.

Production deployment/access/migration/restore: NOT PERFORMED. Provider calls: ZERO. AI activation: NOT PERFORMED; OFF/COMING SOON untouched. Existing browser run 39103825416 at e89b61d is user-provided evidence (30 PASS/1 SKIP plus disabled); not rerun or independently reclassified here. No real semantic quality, provider access/pricing account verification, hosted Worker or actual PC campaign acceptance claimed.
