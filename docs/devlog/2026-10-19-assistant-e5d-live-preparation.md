# AI E.5D — independent live preparation and owner review handoff

Date: 2026-10-19. Verdict: **PREPARATION PASS / LIVE NOT AUTHORIZED**.

Starting canonical, freshly fetched: `77236f002431c1dab68e775324e9c0b084e8ecc2`,
clean. This commit contains the final preparation source and record; its published
commit/tree are reported after remote re-fetch. No Production access, deployment,
D1 mutation/migration/restore, key read, actual Provider call, real approval or real
budget reservation was performed. Production v85 / 0019 / Assistant OFF is the
supplied baseline, not a newly inspected environment.

## Scope and implementation

The new `scripts/assistant-e5d/` modules separate revision integrity, pinned
historical read-only inspection, state/coordinator, single-case execution, private
result review and CLI. They reuse existing budget fsync/chain/lock, private-file
checks, historical journal sequence validation, local Miniflare runtime, official
read-only D1/backup/ledger inspection, `evaluateCase`, and the actual
retrieve/receipt/select/admission/generate/grounding/settlement/replay path.
No production or shared evaluation module was changed. No dependency was added.

`E5D-P41` and `E5D-P44` reuse exactly P41/P44 input/evidence. Original case IDs
remain internal to the unchanged pipeline and budget module; the new scope's
revision-bound config and external IDs distinguish these runs from prior attempts.
No P07, Full Draft, rest, repeat, automatic retry or continuation exists.

Historical inspection runs the E.5B source at
`be6965ab058291b107b5767201e400386829e5c7`, which uses the original E.3.2 reader
at `684dcc5f2af3c706b994c1c73373fa6231ed7c84`. No private database is copied or
migrated. The old schema lacks today's admission `charged_credits` column; its
actual debit/refund entries, journal metrics and settled admission are audited
under the historical schema instead. The reader checks completed P41, failed P44,
exact 5/7 charges and full 7 refund, original configuration/chain/tips, schema,
local digest/checkpoint, counts, costs and absence of unsettled admissions.

Real PC history remains **NOT VERIFIED by Work**. The required owner-side values
are 3 + 2 attempts, reserved 86,400 + 52,800 = 139,200 micro-USD, usage estimate
13,083 + 6,315 = 19,398, unknown usage zero, old/new ledger counts 7/5. These are
user-reported evidence and were reproduced synthetically, not obtained from the
owner's WSL files. Old semantic reviews remain uncompleted; no P41 answer was
recovered and the actual rejected P44 cause remains unknown.

The read-only plan binds both approval hashes, both journal tips, both local
digests, historical expiry and the new revision. A future explicit authorization
creates `<original stateDir>/mvp-smoke-e5d-v1` once, with isolated current-schema
synthetic D1 and a fixed new 24-hour grant. It never extends an old approval or
rewrites its journal/DB. The original coordinator lock prevents concurrency;
history, new grant, revision and journal are rechecked immediately before a durable
reservation. An incomplete start/attempt cannot be retried. Refunds never reclaim
attempts or reservations; unknown usage stays separate from known estimates.

Proposed new limits: P41 once/19,200 and P44 once/33,600 micro-USD; additional
2/52,800, aggregate 7/192,000, within the unchanged global 40/2,000,000 ceiling.
These are **not approved spend**. Real authorization/execution remain owner actions
following a new explicit approval. Local commands record intent; they do not defend
against a malicious operator rewriting code and all files.

## Review and failure visibility

Only validated public envelopes are saved, outside Git, at most 60,000 bytes,
0700 directory / 0600 exclusive file, with case/revision/timestamps. Fsync is followed
by existence, JSON, identifier, hash, size and exact 24-hour expiry checks.
Separate body-free metadata records stored, failed storage, owner scores and deletion.
List reports missing, expired, corrupt and deleted states without printing answers.
An explicit interactive-terminal view formats Korean content, fact/evidence links,
caveats and source URLs; it refuses non-TTY/CI output.

Successful generation/settlement is not sufficient for human-review readiness.
Storage failure keeps financial finish/checkpoint and adds a durable terminal
`OUTPUT_STORAGE_FAILED` journal marker, blocking any further execution even if the
separate failure receipt could not be written. No regeneration repairs a missing
file. Owner review uses unchanged rubric dimensions (0/1/2/NOT_REVIEWED, critical
flag); the conservative per-case continuation gate requires applicable dimensions
2 and no critical finding. Q&A guide-only dimensions are not applicable. Scores
never originate from an AI judge. Scoring deletes the body immediately. P44 requires
P41 program OK, verified storage, owner PASS and recorded deletion/file absence;
it still needs its own explicit command.

Explicit body deletion/list/view remain available after expiry or later source
changes. Approval expiry and per-output expiry are separate. There is no background
purge promise. Expired/unreviewed files must be deleted by the owner and remain
NOT_REVIEWED. No old deletion history is invented. No Provider raw response, private
identity, key, prompt or answer enters the budget/metadata logs. `store:false` and
local deletion are not Provider ZDR guarantees.

## Revision and contract

- New revision: `E.5D-smoke-v1` in **new** `evaluation/assistant-mvp/e5d-revision.json`.
- Manifest SHA-256: `c8cb558e489659a009bbb9afd19e445847a5c838911e7554112932b0f9838e4d`.
- Runtime: `8de16912f50f7d3f2aa6b97319c31212b5131e15f0dbc6220716ba6c83ac1534`.
- Pipeline: `f87a9c60e76995c99a1e779dbaa3c83b462a3bf59d7e8b9430c36588f3eb25bd`.
- New handoff tooling: `98809cdcd74eaa5a2958f82863ba9a07a56f79dfbccb30bc00ad1cb93128883e`.
- Original corpus/cases/rubric and E.4/E.5B manifests remain byte-identical.
- Model/profile unchanged: `gpt-5.4-mini-2026-03-17` /
  `gpt-5.4-mini-2026-03-17-o200k-v1`.

The [official model reference](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
was checked for the snapshot, Responses/structured output and $0.75/$4.50 per
million input/output token rates. Local profile asserts the exact model, rates and
19,200/33,600 reservation bounds. Account access and hosted/live acceptance are
not established. Existing service tier/reasoning/limits/no-tools/store:false contract
is unchanged. E.5B's expected current-runtime integrity failure remains intact.

## Validation

Final E.5D synthetic integration: **161 assertions PASS**, including the durable storage-failure STOP marker.

Fresh current-runtime results:

- Grounding negation: 196 cases PASS.
- Generation: 1,596 assertions PASS (current local D1, 5/7 charges, full refunds,
  replay/duplicate debit prevention and public diagnostic redaction).
- Provider: 84 assertions PASS, including real workerd with mock transport.
- Historical output diagnostics: 315 assertions PASS at `2ec1a2b...`;
  this is historical regression, not current model quality evidence.
- TypeScript and build: PASS.
- Lint: exit 0, only the pre-existing unused `debit` warning in
  `scripts/test-assistant-refund-safety.mjs`.
- Diff check: PASS.

The new integration uses real isolated Miniflare D1 and synthetic histories produced
under frozen E.3.2/E.5B code. It exercises prior hash/chain/D1 tampering, expiry,
wrong revisions/scopes, lock contention, immutable authorization, per-case execution,
durable-before-transport reservation, explicit review gate, 5/7 debit/refund,
replay, E.5C denial acceptance and affirmative/mixed-claim rejection, malformed/
network/timeout/lost replies, unknown usage, crash state, storage failure, body
hash/expiry/absence, score and deletion. The actual fetch boundary is guarded;
real Provider outbound is zero. Synthetic fixture restoration is test-only and is
not exposed as an owner CLI operation.

## Owner handoff and remaining gates

See [E5D_HANDOFF.md](../../evaluation/assistant-mvp/E5D_HANDOFF.md) for exact WSL
commands. Begin with clean status, fresh fetch/fast-forward and the key-free
`pnpm assistant:eval:e5d inspect --prior "$HOME/holocron-eval-private/approval.json"`.
Stop after the read-only plan. The owner's actual originals must pass audit before
requesting a new two-case budget/expiry/retention approval. Work created no real
approval, consumed no real budget and did not inspect the private PC files.

New single-case live execution, actual account/model access, real answer storage
on Windows/WSL, human semantic quality and hosted Production AI acceptance remain
NOT TESTED. Successful mocks neither establish that E.5C fixes the missing live
P44 response nor authorize AI release. No UI/browser rerun or Production operation
was added. The new commands do not change Production v85, Credit policy, collection,
0019 or Backup v7.
