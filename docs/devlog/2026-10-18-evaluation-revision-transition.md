# E.3.2-R1 — same-campaign diagnostic transition

Starting canonical: `917d8284411d5c3552aa77d0f10fc4a44afdccf8`, fetched independently. The final SHA is the publication commit containing this record, verified against remote after publication. Scope: operator-only evaluation tooling, synthetic local tests and documentation. No real Provider call, key operation, Production access, UI/deployment, Credit policy, schema, migration, backup, model, prompt or validation-rule change.

## Preserved evidence and unknowns

The user reported WSL2 P01/P05 success and P07 `INVALID_OUTPUT` with a full 15 CR refund: three attempts / 86,400 reserved micro-USD / 13,083 usage-estimated micro-USD / seven ledger entries. Work cannot access the PC. R1 verifies those criteria against actual files when invoked there; a mismatch stops without overwriting anything. The original P07 cause and all prior semantic review remain unknown/unreviewed. New synthetic failures and a future P07 attempt are not a reconstruction of that discarded response. The separately documented `First Jedi` heuristic over-rejection remains unchanged.

## Minimal implementation

- `budget.mjs`: reusable read-only journal parser, existing-state-only open, existing coordinator lock, serialized append/fsync transition event, revision-scoped single reservation. Existing normal evaluator behavior remains, including rejection of manual approval hash replacement.
- `inspect-local.mjs`: existing local Miniflare SQLite store opened read-only, query-only transaction, integrity/schema marker check, shared production v6 validator/evaluation Credit audit. No Miniflare startup/migration/initialization or recovery during inspection. Metadata SQLite is excluded; exactly one real database is required. Missing/unsupported storage layouts fail closed.
- `revision.mjs`: fixed old/candidate hashes, frozen corpus/cases/rubric, original model/profile/40-call/$2/expiry binding; original smoke journal and durable debit/refund reconciliation; immutable original proofs, plan token, single append-only authorization. The supporting production tree is compared with the starting canonical revision. Original approval bytes and old journal prefix remain untouched.
- `revision-cli.mjs`: exact `inspect`, `apply --confirm --plan-token`, and `p07 --live` commands. No repeat/case/rest override, no new campaign, no expiry extension, no key lookup/setup. P07 reuses `evaluateCase` and the actual retrieval/receipt/admission/provider/output/freshness/settlement code, with native transport only when explicitly selected later on the PC.
- `diagnostic-transition.json`: separate reviewed tooling hash. The existing production manifest, corpus, cases, rubric and pipeline hash remain unchanged. Tool changes after planning/application require review rather than silent rebinding.

The transition record is appended to the old tip while holding the existing lock. One file is authoritative for grant and subsequent consumption; approval and D1 need no cross-file authorization rewrite. A partial append, unknown acknowledgement or abandoned lock is not automatically repaired/stolen. An intact duplicate grant is idempotent and adds no allowance. This is local operator accountability, not protection from malicious code/file editing.

A dispatch reservation references the grant digest and candidate hash. The coordinator checks both global caps and the one-P07 allowance. Before dispatch it fsyncs the reservation; failures/timeouts/unknown responses consume it. A second or concurrent invocation cannot debit/dispatch again. Valid completion also stops: no automatic rest stage. Original totals stay 3 / 86,400 through transition; a new reservation becomes 4 / 120,000. Ordinary Credit refund accounting is unchanged and never replenishes provider budget.

Inspection returns fixed safe status/reason codes, hashes, counts, original expiry and plan token. No original user identifiers, input/output text, key, support span or exception payload is reported. `outputDiagnostic` uses the existing safe observer; full/partial/zero settlement behavior is not redesigned. Unsettled obligations remain in D1 and are reported. No automatic recovery or deletion is performed by R1.

## Local verification

Synthetic histories are constructed through production services against real isolated Miniflare D1 with all existing triggers. Their usage values intentionally match the reported checkpoint for testing; they are **not PC audit evidence**. Tests cover original approval/config mismatch, manual hash changes, explicit transition, byte-for-byte prefix preservation, unchanged original debit/refund rows, duplicate/concurrent grant, stale plan, one dispatch/concurrent callers, lost response, network failure, output rejection/full refund/safe diagnostic, valid Draft, unresolved refund, expiry, missing/corrupt D1/journal, tool changes and zero real outbound. Read-only audit uses the same production v6 validator against that persisted D1. Node orchestration/SQLite inspection is not hosted Worker acceptance.

Validation on Node 24.19.0 / pnpm 11.25.0:

| Check | Result |
| --- | --- |
| All current non-browser `test:*` scripts, sequential `pnpm run <name>` | **54/54 PASS** |
| `pnpm test:assistant-evaluation-revision` (included above) | **167 assertions PASS**, real local Miniflare D1 plus read-only persisted-store inspection |
| Existing evaluation / output diagnostic suites | **301 / 315 assertions PASS** |
| `pnpm lint` | PASS; only the pre-existing refund-safety unused-variable warning |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS |
| `git diff --check` | PASS |

The regression verifies successful synthetic P07 completion (nine total ledger entries), invalid Draft and transport failure with full refund (ten entries), a zero-row refund remaining `refund_pending`, and a durable reservation with no finish. None permit another dispatch. CLI inspection/application and rejected repeated `p07 --live` arguments are exercised with synthetic state; real provider transport is blocked/injected. Tool hash: `dac9a63dd6de6a6d74db90602e0c3b31b5f2890eebab05675abb9389a28a58ad`. Source comparison confirms no changes under `lib/`, `db/`, `drizzle/`, or to the dependency lockfile, production evaluation manifest/corpus/cases/rubric. UI/browser QA was not rerun because UI is unchanged; old browser acceptance is not claimed for a new provider evaluation.

## PC handoff and limitations

Exact tested commands and stop conditions are in [evaluation README](../../evaluation/assistant/README.md#e32-r1--one-diagnostic-p07-same-campaign). Update only after reviewing a clean local tree and remote changes; inspect without a key; explicitly approve the plan token; only with a still-valid original approval and the existing hidden evaluation-key injection, invoke the single P07 command; inspect/report and stop.

The PC's original approval ID, expiry, journal and D1 were **NOT TESTED by Work**. An expired campaign cannot call the provider through this tool; it requires a separate explicit deadline decision preserving usage/history, not a new approval campaign. No extension is implemented. A changed/missing/corrupt state requires reconciliation, not reset. Actual future P07 quality, original P07 cause, live semantic scoring, hosted Worker and Production AI acceptance remain **NOT TESTED**.

Review-body retention remains at most 24 hours from original creation. Original P01/P05 bodies must be reviewed/deleted or deleted as UNREVIEWED by that deadline. Inspection/grant does not touch them. Existing purge deletes expired bodies only; reviewed bodies must be explicitly removed immediately. Budget/D1 remain. Work did not inspect/delete PC files and promises no background deletion. No real key is needed for preparation or inspection.

**R1 preparation status is separate from E.3.2 acceptance. E.3.2 remains BLOCKED pending a valid same-campaign authorization window and actual diagnostic/semantic review.** No real Provider call, Production mutation or AI activation occurred.
