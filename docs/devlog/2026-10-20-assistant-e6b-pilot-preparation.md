# Phase 9D-E.6B — controlled four-case pilot preparation

Date: 2026-10-20 UTC. Starting canonical: `b6cde3c50542b20a79264c593104729edbe2ca26`.
Verdict: **PILOT PREPARATION PASS / LIVE NOT AUTHORIZED**.
The final canonical commit is the commit introducing this record (no self-referential SHA).
Production owner baseline v85 /0019 /Assistant OFF was not accessed or changed.

## Scope and architecture

`E.6B-pilot4-v1` fixes order P84 (QA), P66 (QA), P65 (Guide), P81 (Guide), each one
explicit command and one maximum attempt. External IDs have the `E6B-` prefix.
No execution of P41/P44/other E6A cases, batch loop, retry, reset, repair or automatic
continuation is exposed. P84/P65 share some articles and are different mode tests,
not independent article samples.

Historical E.5J source is pinned to `36797d08aab875b709b1a746ba1c48a2e11730a6`.
Its official auditors recursively check the earlier frozen revisions. E6B extends
the existing bounded byte seal to J's store and verifies J's reviewed/deleted
OWNER_PASS receipts and completed 7 CR debit. It requires the aggregate owner
baseline 10 attempts /278,400 reserved /35,827 known usage micro-USD /unknown 0.
E.5D OWNER_NOT_PASS, E.5F OWNER_PASS, prior P44 invalid/refund records are preserved.
Rejected diagnostic text absent from historical journals is not reconstructed.
Actual owner WSL files were **not** read; successful disposable synthetic audits do
not substitute for the required later PC audit.

Existing budget journal, original coordinator lock, fsync, local Miniflare D1,
HTTP evaluation pipeline, replay audit, pinned reader, bounded output storage,
terminal formatter, strict CLI parser and privacy cleanup are reused. Historical
modules/manifests are unchanged. New modules own only revision/history binding,
four-case settlement/order, review requirements and composite checkpoints; there
is no new general campaign framework or runtime dependency.

The previous one-case runner permits only OK and Planner scoring. E6B adds the
necessary independent contract without changing historical semantics:

- QA scoring explicitly uses N/A for rubric dimensions 7/8; Guide uses all nine.
- P66 OK or validated INSUFFICIENT_EVIDENCE can be reviewed. Insufficient evidence
  has known usage and a full 5 CR refund/failed admission, not a technical failure.
  It receives no automatic semantic pass. Unsupported blanket refusal is still an
  owner quality issue. Other cases' unexpected limited responses stop the pilot.
- Each execution verifies the new admission, 5/7 CR debit, funding and refund link
  against actual local D1, then runs existing wallet/ledger/replay audits.
- E6B journal checkpoints bind a composite hash of the local D1 digest **and all
  review file bytes**, rather than only D1. The new approval declares this versioned
  contract. No old journal format or checkpoint meaning is altered.
- Score writes an immutable review receipt, deletes the body, fsyncs and appends a
  new composite checkpoint. Next-case permission requires known expected program
  result, OWNER_PASS, reviewed deletion receipt, absent body and matching seal.
  Receipt/body edits, even after body deletion, cannot silently unlock continuation.
- Crash between review/delete/checkpoint is fail-closed. Privacy deletion remains
  available after expiry/source changes, but unreviewed deletion does not unlock
  execution. There is no automatic repair or Provider re-call to recreate output.

New future authorization is fixed to 4 /105,600 micro-USD, cumulative 14 /384,000,
within original global 40 /2,000,000. Expiry is issue time +24h, repeat authorize
cannot extend it. Old expired approvals are evidence only. No live approval was
created. Disposable mock authorizations are test fixtures, not paid permission.

## Integrity

- Manifest SHA-256: `53da64f461044af30dc1147de06518a73e21cdb58f4743be4184faca303d3074`
- Dataset: `b5b18bdaae5e02aed01ff02357fdfbeb9edda6bf536e19a030fbd8846cc7254f`
- Runtime: `0559656c7679972b9996d1088a927c6acc4d763a4c5ee02e724345b870997f9b`
- Pipeline: `7f89bba635e7f44f3b4714c8cd73422d42e722d7bcf84c0f082dc2e070ccfdd1`
- Model/profile: `gpt-5.4-mini-2026-03-17` / `gpt-5.4-mini-2026-03-17-o200k-v1`

The separate `e6b-revision.json` binds the corpus/cases/rubric, dataset and reused/new
tooling. E6A dataset/protected file hashes are checked on load. Current profile
prices and exact per-mode reservations are verified locally. Product runtime,
Provider schema, prices, prompts, migrations, API/UI and all old manifests remain
byte unchanged. No real Provider availability/schema probe was performed.

## Verification

| Check | Result |
|---|---|
| E6B integration | PASS: exact frozen ten-attempt history and corrupted-receipt rejection; four current executions, durable reservations, 5/7 CR, replay, scope/order/expiry/lock gates, P66 partial and insufficient/refund paths, Guide invalid/refund, OWNER_PASS/NOT_PASS/critical/unreviewed gates, score/body/D1 tampering, duplicate score, expiry/deletion receipts, storage/unknown/timeout/interruption STOP; real outbound 0 |
| E6A dataset | PASS: unchanged dataset, 30 current preparation/Mock paths and six separate free controls |
| Current Grounding / Attribution / P44 structural caveats | PASS |
| Current Generation / Provider / Retrieval / Admission | PASS |
| Current Refund Safety / Headroom / Credit Policy | PASS |
| Current Assistant UI / Workspace | PASS (SSR/injected-handler tests, not visual browser QA) |
| TypeScript | PASS |
| Lint | PASS, zero errors; one pre-existing unused `debit` warning in refund-safety test |
| Build | PASS |
| Diff check | PASS |

Current runtime regression suites are separate from the **frozen historical**
E.3.2/B/D/F/H/J mock executions and read-only audits in the new integration test.
No historical manifest or frozen runner was changed. No live quality claim follows
from synthetic OWNER_PASS score fixtures. No real account Provider request, WSL
private audit, Production check or browser visual inspection was performed.

The first new test failed because it read `unknownUsageAttempts` from the basic
reservation totals instead of the existing inspection totals. The assertion now
checks `inspect`'s known/unknown usage report. A deliberate disposable DB corruption
probe must remove the synthetic wallet guard before simulating on-disk corruption;
the unchanged guard otherwise correctly prevents the illegal update. This is only
a test fixture mutation, never a recovery/override command in the CLI. The product
runtime, security checks and historical test criteria were not weakened.

## Owner handoff and limits

`evaluation/assistant-mvp/E6B_HANDOFF.md` provides clean fetch/fast-forward,
dependency check, E6A Mock and key-free E6B inspect, then explicitly stops for a
separate owner approval. It documents implemented later CLI arguments without
instructing this Work to authorize or call. Inspect reads the trusted original
stateDir and creates no new state/approval/worker/reservation. Historical readers
may use transient locks/SQLite read marks; durable histories must remain unchanged.

Validated public envelopes only, private 0700/0600, size/hash/JSON/revision/expiry
checks, max24h retention and immediate post-review deletion are preserved. No raw
Provider responses, rejected bodies, keys or prompts are stored in journal/CI.
There is no background deletion daemon while WSL is stopped: the owner must
perform timely cleanup. Expired output cannot be viewed/scored or unlock the next
case. Review metadata remains without the body.

Speaker attribution, meaning/entailment, creative-note factual invention and
usefulness require human review. Mock excerpts prove contracts, not quality.
The frozen 2026-10-17 archive is not current Production. Four pilot successes do
not approve the rest of the 30-case dataset or Production AI. All later live
activity requires an actual PC history audit and explicit revision/scope/budget/
expiry/retention approval.

**Real Provider calls: 0. Live approvals: 0. Production changes: 0.**
