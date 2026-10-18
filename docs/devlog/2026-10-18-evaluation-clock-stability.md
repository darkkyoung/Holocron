# R1 local mock regression — receipt clock stability

Starting canonical: `564eef08db6078cd20e494875581de12902e50a7`, independently fetched. Publication SHA is the commit containing this record; no self-referential SHA is embedded. No live Provider request, key operation, PC campaign modification or Production access occurred.

## Evidence and uncertainty

The user reported a failure on WSL2 Ubuntu 24.04.3, Node 24.22.0 / pnpm 11.25.0. `test:assistant-evaluation-revision` stopped in `verifyReceipt`, through preparation in `evaluateCase`, while entering the **fourth baseline** (`const expired = await baseline()`). The deliberate `Date.now` expiry override appears **after** that awaited baseline and inspection/application. There is no earlier test override of `Date.now`. The supplied stack cannot identify whether P01, P05 or P07 was being prepared. The user's real campaign inspect/apply/p07 did not run; no additional live call is reported.

On Work's Node 24.19.0 / pnpm 11.25.0, the unchanged test passed once (167 assertions). This does not invalidate the PC failure. Inspection found a concrete harness vulnerability: synthetic archive time was `corpus.capturedAt + Date.now() - start`. A wall correction between receipt issuance and verification could therefore make a just-issued receipt future-dated or expired. A backwards second boundary can also rotate the signed assistant session because its issued-at is in seconds.

Before editing the harness, controlled P01 executions against real local Miniflare D1 adjusted only the test wall clock after successful retrieval. All three rejected in the actual receipt/evidence path before a provider attempt:

| Synthetic wall correction | Observed issued/expiry condition | Binding |
| --- | --- | --- |
| -1 ms | issued > verification time | same |
| -1,000 ms | issued > verification time | changed |
| +600,000 ms | expires <= verification time | same |

These are **synthetic reproductions of a confirmed harness defect**, not recovered evidence of the PC event. No actual PC clock correction, Node/Miniflare incompatibility, WSL cause, parallelism or cleanup defect has been established. Do not request a downgrade or reinstall on this evidence. P07's historical live `INVALID_OUTPUT`, and the separately recorded First Jedi issue, are untouched and remain unresolved.

## Minimal correction and observability

- `clock.mjs`: one per-case synthetic clock anchored to the corpus, advancing by `performance.now()` elapsed milliseconds rounded down to an integer. Invalid or regressing injected monotonic sources fail closed. Explicit expiry advances remain available internally; no new CLI clock override exists.
- `evaluate.mjs`: use that clock for the existing session/receipt/service injections and measured latency. No receipt lifetime, issued-at check, signature, binding, retrieval, output validator or settlement rule changes. No automatic retry or replacement retrieval.
- `receipt-diagnostic.mjs`: on preparation rejection only, reuse the **production** signed-session and receipt verifiers at original issuance time to classify the original material. This is diagnostic validation, never a retry of generation or a successful replacement receipt. Emit fixed stage/reason, case ID, bounded millisecond differences and booleans. Invalid/unverifiable original material gets a fixed failure stage. No raw exception, receipt, cookie, signature, support text or output is retained or printed. Failure remains `EVIDENCE_CHANGED` and stops.
- CLI failures preserve this safe metadata; the revision test adds baseline ordinal and synthetic case ID before rethrowing. Public production API responses are unchanged.

Synthetic archive logical time and elapsed latency are distinct from real operator authorization and retention. `budget.mjs`, `revision.mjs` and `review.mjs` are unchanged: original `expiresAt`, journal accounting, review timestamps and 24-hour deletion deadlines still use real wall-clock time. Native provider/service timeout behavior remains in production code. A real ten-minute **elapsed** synthetic interval and the explicit expiry fixture still reject; a 35-second Q&A service interval still fails with full compensation.

Example safe diagnostic, **synthetic only**:

```json
{"baselineIndex":4,"caseId":"P01","status":"STOP","code":"EVIDENCE_CHANGED","evaluationDiagnostic":{"phase":"selected_evidence_preparation","caseId":"P01","reason":"RECEIPT_EXPIRED","issuedDeltaMs":600000,"expiryRemainingMs":0,"bindingSame":true,"receiptValidAtIssue":true}}
```

If the PC fails again, this classification is the next evidence to inspect; a single local PASS is not a claim that its unobserved root cause is proven.

## Frozen contracts and campaign preservation

Only the separately reviewed evaluation-tool manifest changes: old tool hash `dac9a63dd6de6a6d74db90602e0c3b31b5f2890eebab05675abb9389a28a58ad`, new `d82507260ae6ac2e8de99dbcc940d92b99b8a49e48b66bb3f7fe689abaf68472`.

Production pipeline candidate remains `62bf4041d3e3952f609a4cf300964a3f8752b0c2860128f3ba18523e4c48dfa4`; original approved pipeline remains `3033f845d991bbdde172d0ee01c233dfe723d4b54d5bb7589ec789f19804037c`. Production manifest, corpus/cases/rubric, dependency lockfile, model/prompt/validator, Credit policy, migrations and backup remain byte-identical.

The user has **not applied** the R1 transition. The reviewed tooling can therefore inspect the original approval/history without editing it and produce a plan for the existing R1 mechanism. A previously applied different tool revision is deliberately rejected; no migration of that authorization is silently performed. The original 167 assertions continue to check immutable approval/history, real local D1, 3 attempts / 86,400 reserved through transition, then 4 / 120,000 for one P07; replay/other cases/expiry/lost transport/refund obligations remain fail-closed. Those totals are synthetic test criteria, not a new inspection of the user's files.

## Validation

Executed on Node 24.19.0 / pnpm 11.25.0:

| Command / check | Result |
| --- | --- |
| `pnpm test:assistant-evaluation-clock` | **68 assertions PASS**, real local D1 and existing receipt/session/service checks |
| `pnpm test:assistant-evaluation-revision` | **167 assertions PASS on each of three fixed sequential executions**: two focused runs, then the full-suite run; no run-until-pass loop |
| Every non-browser package `test:*`, sequential `pnpm run <name>` | **55/55 PASS**; only `test:assistant-browser` excluded |
| Existing evaluation / output diagnostics | **301 / 315 assertions PASS**, included above |
| `pnpm lint` | PASS; existing refund-safety unused-variable warning only |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS |
| `git diff --check` | PASS |

The focused test covers fractional-to-integer clock conversion, source regression rejection, exact issued/expiry boundaries, binding rotation, wall corrections across Q&A/Planner/Draft, real elapsed expiry, the explicit expired-receipt control, service deadline/full refund, metadata redaction and local ledger/backup audit. All real outbound transports are blocked. Existing 167 revision assertions retain their meaning and include original real-wall authorization expiry, one-P07 accounting, historical ledger preservation and result-retention checks.

No browser/UI or hosted Worker acceptance is claimed. The user's Node 24.22.0 / WSL environment and real campaign remain **NOT TESTED by Work**. This is a locally verified harness correction and diagnostic handoff, not proof of the PC event's cause or an E.3.2 quality PASS.

## PC handoff — stop after inspection

```sh
cd ~/projects/holocron-eval
git status --short
git fetch origin main
git log --oneline HEAD..origin/main
git diff --stat HEAD..origin/main
# Continue only with a clean tree and the reviewed remote changes:
git merge --ff-only origin/main
pnpm test:assistant-evaluation-clock
pnpm test:assistant-evaluation-revision
# Only if both tests pass; no key required:
pnpm assistant:eval:revision inspect --approval "$HOME/holocron-eval-private/approval.json"
```

Stop on any failed command or unexpected change. Do not edit `approval.json`, journal, local D1 or state directory. `APPROVAL_EXPIRED` requires a separate explicit same-campaign deadline decision, not renewal by this fix. Preserve all consumed calls/costs. Do not execute apply or P07 in this correction step. Original result bodies retain original deletion deadlines; deleting bodies never deletes budget/D1. Work has not accessed or modified those PC files.
