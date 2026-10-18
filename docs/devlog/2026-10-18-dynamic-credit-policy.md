# Dynamic Credit Policy & Assistant Monthly Budget — canonical-only

Starting canonical: `684dcc5f2af3c706b994c1c73373fa6231ed7c84` (fresh remote main fetch). The final publication is the commit containing this record; no Production tree was mirrored. This entry supersedes fixed **amounts**, not historical transactions, eligibility, ownership, refund or evaluation records.

## Boundaries and choices

- `/admin/credit-policy` reuses the existing signed Admin session. Control Room has a normal anchor. Authenticated read returns no-store data. Mutation is explicit same-origin POST, JSON <=4 KiB, exact fields, server validation and expected-version CAS. UI shows current value, field's last application time, proposed diff and an explicit save confirmation. Only confirmed response updates stored values. Conflicts/ambiguous responses require refresh; no automatic retry.
- New `credit_policy_revisions` is one append-only history/current-policy source. Version 1 is the reviewed default seed; each admin revision links the exact previous JSON and records time/actor. No separate wallet or generalized economic rules engine. No updates/deletes, no retroactive claims, no Admin balance editor.
- AI price bounds: integer 1–100 CR. Reward bounds: integer 1–10 CR. Monthly limit/warning: integer 1–1,000 USD, warning <= limit. Defaults QA 5 / guide 7; Guest first 1 / opening 1 / normal attendance 1 / Day 7 total 5 / Quiz first-correct 3 / first Account login 3; monthly limit 30 / warning 20. Zero, negatives, fractions, extra fields and excessive values fail closed.
- Amount reads occur in the existing D1 mutation SQL, not a Worker cache. Guest cap remains 10. KST Mon–Sun attendance and all original idempotency/Quiz/migration keys are unchanged. Day 7 is the total for that day. Existing Account login notices report the actual applied first-login amount; OAuth protocol/session code is unchanged.
- `/api/credit/visit` includes only the public policy revision, prices and reward amounts in its existing response. The single existing Credit client feeds Header and Assistant; no second initialization/store or policy-triggered visit loop. Loading has no invented price/reward. Previously displayed values refresh through existing status refresh/visibility/settlement flow. A rejected stale quote refreshes status and waits for explicit user action.

## Price, admission, settlement

`policyVersion` accompanies the displayed server quote. Omission means the original version 1 only (legacy clients cannot silently accept changed pricing). Server resolves the actual price; client price/model/URL fields remain forbidden. The version/price is bound into idempotency input and rechecked by the atomic admission SQL. Any policy revision change conservatively requires reconfirmation, including decreases and reward-only changes.

A policy save racing admission either precedes the admission and rejects the old quote, or follows a committed old-price debit. No read/check/write debit race. The debit row itself is the immutable charge snapshot; refunds and success accounting read that row, never the new policy or static action price. Full/partial/zero capacity-first settlement, requested entitlement consumption, sequence reservation, lease/owner-token CAS and exactly-once behavior remain. Full Draft's public request remains rejected before admission/provider use; historical 15 CR records retain their meaning.

A real D1 regression exposed `meta.changes === 1` as unsuitable after adding settlement triggers: D1 includes trigger changes. Completion now tests whether the guarded UPDATE changed any row. Replays/owner-token failures still change zero rows; completion-vs-failure and lost-response tests remain in place.

## Durable monthly accounting

`assistant_monthly_costs` stores KST `YYYY-MM` aggregates: gross reservation, reconciled reservation, verified actual micro-USD, admitted count and usage-known count. Charged estimate = gross reservation − reconciled reservation + verified actual. All are bounded integer counters. History cannot be deleted or reduced.

Admission's transaction checks current monthly policy, reserves monthly maximum cost and debits Credit together. D1 triggers cover insertion/reconciliation; rollback removes the entire attempted mutation. Verified usage can replace a reservation once; null/invalid usage, timeout, cancellation and lost provider response retain conservative reservation. Credit refund never releases an unknown external cost. Late usage belongs to the original admission month. Cleanup of operational admissions cannot erase monthly aggregates. Budget reductions below spent amount block only new generation. Warning is informational, limit is enforced. Free retrieval remains separate.

UTC daily **USD 2** limit, request/concurrency quotas, fixed provider profile, token limits, no-retry policy and AI feature flag are unchanged. This tracks Assistant estimates, excluding collection AI/other API/Cloudflare/domain spend; it is not a guarantee about total OpenAI account billing, taxes or external activity.

## Additive schema / backups

`0019_credit_policy_budget.sql` adds two tables, policy guards and monthly accounting triggers. It neither edits nor replaces 0016/0017/0018. Parser-safe, CASE-free SQL is checked using the exact installed Wrangler splitter against real local Miniflare D1. Clean 0000–0019, populated 0018 upgrade, and rollback at every split-statement boundary are tested. Drizzle 0019 snapshot matches the schema: isolated `drizzle-kit generate` reports no further schema changes.

Backfill covers **retained** pre-0019 admissions only. Previously deleted Assistant cost history cannot be reconstructed. Production is reported AI OFF; this task did not query it. Before hosted approval, independently establish whether any Assistant usage predates coverage. If unknown or incompatible with trustworthy monthly accounting, STOP rather than invent a zero opening balance or run ad-hoc SQL. Hosted parser/transaction/publication order is NOT TESTED here. No fallback supports running this runtime on 0018-only D1, even with AI OFF, because ordinary rewards now read policy.

Backup **v7 / 0019**, 16 durable datasets, includes policy revision chain and monthly aggregates. The original fourteen datasets are unchanged. Operational admissions, security/session state and secrets stay excluded. v1–v6 retain exact historical datasets/markers/audits, including v6-only capacity-limited Account refund acceptance (also inherited by v7). v7 validates policy values/version/previous-value chain/timestamps and monthly counters. A backup timestamp is export start, not a strict upper bound on writes committed before its read batch. Restore plans are descriptions only; older backups explicitly lack policy/month history. No restore executor or guard bypass is introduced.

## Local evidence and limits

- Dedicated `test:credit-policy`: real D1 dynamic amounts, one-time claims, Day 7 total, current/original debit, concurrent save/admission, DML rollback, competing monthly reservations, warning/limit changes, KST rollover/late reconciliation, retained unknown costs, current-price partial/zero refunds, full wallet/ledger audit, Admin auth/CSRF/size/validation and v7/historical-v6 audit.
- Generation HTTP integration: default 5/7, changed 9/11, old quote rejection with zero transport calls/debit/admission, price changed during provider work retaining original debit/refund, monthly pre-call block and all existing validation/settlement scenarios. Transport is synthetic; actual provider outbound ZERO.
- Admin editor: rendered JSX + injected state/HTTP verifies preview/cancel/save/conflict/ambiguous response/no retry, accessible labels/status. Assistant workspace regression verifies server policy display, version payload, quote refresh and explicit resubmission. This is not browser visual evidence.
- Historical 0018 migration/v6 suite runs at `684dcc5…` to preserve its exact historical schema assertions; current headroom/refund/admission/generation and new 0019 suite exercise current runtime. Frozen E.3.2 tests remain at `2ec1a2b…`; frozen E.4 tests at `684dcc5…`. These are explicitly historical regressions, not current live evaluation acceptance.
- An existing historical R1 test reproduced its fractional filesystem-mtime vs integer ISO-millisecond comparison failure. Test-only comparison now rounds mtime up to the same millisecond precision. Retention duration, frozen implementation, campaign journal and actual files on the user's PC are untouched.
- All **58/58 non-browser `test:*` suites PASS**, including six explicitly pinned historical suites above. Current focused results: policy 262 assertions; Admin editor 18; generation 1,486; admission 263; refund safety 586; numeric headroom 1,173; workspace 117; backup 929. The current product boundaries were rerun after the final settlement/explicit-price cleanup.
- `pnpm lint`: PASS (one pre-existing unused `debit` warning in `test-assistant-refund-safety.mjs`). `pnpm exec tsc --noEmit`: PASS. `pnpm build`: PASS, includes the new protected page/API. `git diff --check`: PASS. Node 24.19.0 / pnpm 11.25.0 / Wrangler 4.92.0. No dependency or workflow change.
- Initial regressions identified expected fixture updates (0019 schema, explicit public policy, v7 datasets) and the real D1 affected-row issue above. Existing assertions were preserved with version-correct fixtures; the original eight Credit triggers plus nine additive guards are checked explicitly. Failed runs were not treated as acceptance.
- Actual Chromium/physical mobile/screen reader QA of this new Admin screen: **NOT TESTED**. Existing Chromium evidence remains evidence for its original revision. Existing browser fixture responses have only been aligned to the new public policy field; no new browser infrastructure.

## Frozen evaluation impact / next approvals

No file under `evaluation/`, `scripts/assistant-eval/` or `scripts/assistant-mvp/` was changed. The user's private approval/journal/local D1 and reported 3 attempts / USD 0.0864 reservation / USD 0.013083 estimate were neither accessed nor reset.

E.4 old pipeline: `9dee4e8e45f83bd0bf6e8b0176c4a3721cf70444d380d083c933e0e6641a92b1`.
New pipeline: `c603895acecf3d13578e123e707a49d77ce63caff79e64ae7e858c934c75a2d2`.
Corpus/cases/rubric/tooling hashes are unchanged. Current frozen E.4 gate returns `MVP_INTEGRITY_FAILED` before calls. A separately reviewed updated evaluation contract must account for dynamic policy/schema and preserve prior consumed budget; no silent manifest rewrite or renewed allowance.

Separate owner authorization is required for fresh Production inventory/backup, normal hosted 0019 migration before compatible runtime publication, v7 post-backup/data audit and service acceptance. No automatic deployment, migration, SQL repair, restore, new secret or access change. Provider evaluation and AI activation are separate decisions. **Production untouched; AI OFF / COMING SOON source unchanged; real provider calls ZERO.**
