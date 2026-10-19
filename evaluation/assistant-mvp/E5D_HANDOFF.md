# E.5D — independent two-case preparation

Status: **PREPARATION ONLY / LIVE NOT AUTHORIZED**. This document and code do not
approve spend, create an owner's authorization, or enable Production AI.

## Fixed scope and evidence

`e5d-revision.json` pins the E.5C runtime, pipeline, existing evaluation tooling,
and the new `scripts/assistant-e5d` tooling separately. E.4 `manifest.json`, E.5B
`live-revision.json`, public corpus, cases and rubric are unchanged. External IDs
`E5D-P41` and `E5D-P44` map to the original P41/P44 inputs/evidence; the reused
pipeline/journal stores P41/P44 inside the **new revision-bound scope**. They are
not replays or recovered outputs of the old attempts.

| Scope | Attempts | Reserved micro-USD | Usage estimate micro-USD |
| --- | ---: | ---: | ---: |
| E.3.2 historical prerequisite | 3 | 86,400 | 13,083 |
| E.5B historical prerequisite | 2 | 52,800 | 6,315 |
| Historical total | 5 | 139,200 | 19,398 |
| E5D-P41 proposed | 1 | 19,200 | unknown until execution |
| E5D-P44 proposed | 1 | 33,600 | unknown until execution |
| Proposed aggregate ceiling | 7 | 192,000 | not a billing ceiling |

Historical unknown-usage attempts must be zero. Global ceiling remains 40 attempts /
2,000,000 micro-USD. All failures/timeouts/lost replies consume reservations; Credit
refunds do not reclaim API budget. Unknown usage is counted separately, never priced
as zero. Reservations are conservative limits, not OpenAI account-wide billing guarantees.

Model/profile remain `gpt-5.4-mini-2026-03-17` /
`gpt-5.4-mini-2026-03-17-o200k-v1`. The [official model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
was checked on 2026-10-19: Responses, structured outputs, snapshot, $0.75 input /
$4.50 output per million tokens match the pinned profile. This does not prove the
owner's API account access. Existing default service tier, reasoning none,
store:false, no tools/streaming/background/conversation, limits and single transport
are unchanged. `store:false` is not a ZDR guarantee.

## Historical and execution safety

The E.5B reader is extracted from commit
`be6965ab058291b107b5767201e400386829e5c7`; it in turn uses E.3.2's pinned
`684dcc5f2af3c706b994c1c73373fa6231ed7c84` reader. Read-only SQLite inspections
validate chain/config/tip, schema, ledger and checkpoints without starting Workers,
copying private DBs, applying migrations or recovering old admissions. E.5B must
contain P41 OK and P44 INVALID_OUTPUT/full 7 CR refund, settled, five ledger rows;
E.3.2 must match the existing three-attempt audit. Historical grants need not be
active; they provide evidence, **not new execution permission**. Original approval
hashes, fixed expiration, journal tips and D1 digests are bound into the new plan.

The new directory is derived only from the original approval's private `stateDir`:
`<stateDir>/mvp-smoke-e5d-v1`. A future explicit authorization initializes a fresh
isolated current-schema Miniflare store there; old D1 stores are never migrated.
This is not a new independent global budget. One original coordinator lock protects
all E.5D mutation/execution. Historical bindings are rechecked under that lock and
immediately before each transport. Source/grant/journal changes fail closed.

The future grant has a fixed 24-hour period set once. Repeating authorization never
extends it or reinitializes partial state. STARTED is durable before synthetic
funding; reservation is fsynced before Provider transport. A crash/incomplete journal
blocks retries and preserves consumed/unknown usage. No reset, resume-through-error,
repeat or rest command exists. Do not delete/rename state or remove a lock to retry.
A stale lock or partial state requires a separate operator investigation.

Each `run` command accepts one exact ID only. P44 also requires P41 program OK,
completed audit, verified output storage, owner PASS review, and body deletion.
A P41 success never starts P44. Both attempts together exhaust the new scope.
These local controls record operator intent; they are not an authentication server
against a malicious operator modifying code/files.

## Output and review contract

Only the service's validated public result envelope is saved to
`<stateDir>/mvp-smoke-e5d-v1/review/E5D-P41.body.json` (or P44). It includes
case/revision, creation/expiry and the validated answer, sources and Credit result.
There is no raw Provider payload, key, cookie or real user identity. Files are 0600,
directories 0700, outside Git, and output is capped at 60,000 bytes. Save is fsynced,
then existence, JSON, case/revision, size, hash and 24-hour expiry are checked.

Separate exclusive metadata receipts (`stored`, `storage-failed`, `reviewed`,
`deleted`) contain no answer/prompt/support text. `list` distinguishes stored but
missing, expired, corrupted, deleted and never stored. An absent old E.5B file has
no retroactively invented deletion receipt. If storage or verification fails,
financial settlement/checkpoint remain recorded and a terminal OUTPUT_STORAGE_FAILED
journal marker blocks further execution even if a separate failure receipt cannot
be written; no regeneration.
A crash can leave an unconfirmed body: list/delete remain available; it cannot count
as ready for review or authorize P44.

`view` prints only to an interactive local terminal (stdin/stdout TTY, no CI).
It formats Korean answer/guide, fact references, caveats, evidence summaries and
source URLs. Do not redirect, share terminal transcripts, upload bodies, or paste
answers into public reports. Inspect/run output contains metadata only.

Scores follow the unchanged nine rubric dimensions, ordered exactly as in
`rubric.json`, with 0/1/2/`NOT_REVIEWED` plus `critical: true|false`. Q&A dimensions
7/8 are not applicable. The per-case continuation gate conservatively requires
all applicable scores 2 and no critical finding; scores 0/1 or missing review stop.
This is an owner's recorded judgment, not an automatic semantic model judge.
A successful `score` records the owner review and deletes the body immediately.
If deletion fails, use the explicit delete command; P44 remains blocked until
recorded deletion and file absence. A failed/partial review never grants continuation.

Retention is at most 24 hours **per file**, independent of authorization expiry.
There is no background deletion promise. Delete unreviewed expired bodies manually;
metadata remains NOT_REVIEWED. Stop creating outputs if timely review/deletion cannot
be ensured. `list`, `view` and `delete` remain usable after grant expiry or source
revision changes. Budget journals/D1 are never deleted. Local deletion/store:false
do not guarantee Provider-side deletion/ZDR.

## WSL owner handoff — first do only this read-only plan

Open Ubuntu on Windows 11. No key is needed for these steps. Preserve local changes:

```bash
cd ~/projects/holocron-eval
git status --short
git fetch origin main
git log --oneline HEAD..origin/main
```

If clean and expected, update without force/reset:

```bash
git merge --ff-only origin/main
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm assistant:eval:e5d inspect --prior "$HOME/holocron-eval-private/approval.json"
```

The original approval determines all state paths. `inspect` does not initialize
state, create an approval/reservation, read a key, or call a Provider. It verifies
both historical stores with pinned readers and prints the new plan token/hash,
historical totals and proposed scope. Missing history, changed hashes, unfinished
settlements or a changed runtime STOP. Do not edit manifests/approval files to pass.
The real PC history was not available in Work; this step is mandatory. Retain this
report privately and present only safe aggregate/hash metadata for authorization.

**STOP HERE. Request separate E.5D live approval, exact two-case budget and private
24-hour output retention. No live authorization exists from this preparation.**
Do not reuse any E.5B token or extend the old expiration.

## Future commands — only after separate owner approval

These implemented commands are documented for a later authorized run. They were
tested only with synthetic histories and mock transport in Work.

```bash
# Replace the placeholder with this E.5D inspect's exact planToken.
pnpm assistant:eval:e5d authorize \
  --prior "$HOME/holocron-eval-private/approval.json" \
  --plan '<E5D-planToken>' --confirm AUTHORIZE_E5D_TWO_CASES
pnpm assistant:eval:e5d inspect --prior "$HOME/holocron-eval-private/approval.json"
```

Use the existing dedicated hidden-key environment injection **only in the future
authorized terminal** (`HOLOCRON_EVAL_OPENAI_API_KEY`). Do not use a Production or
collection key. The CLI does not load env files automatically. Never put a key in
chat, command arguments, history, Git, screenshots or CI. This preparation neither
reads nor requests one.

```bash
pnpm assistant:eval:e5d run --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P41 --confirm EXECUTE_E5D_P41_ONCE
pnpm assistant:eval:e5d list --prior "$HOME/holocron-eval-private/approval.json"
pnpm assistant:eval:e5d view --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P41 --confirm SHOW_PRIVATE_RESULT
```

Read the actual Korean answer and sources, compare the unchanged P41 case criteria
and rubric. In a private local editor create a 0600 score file, for example
`~/holocron-eval-private/e5d-p41-scores.json`. Schema example **not a prefilled pass**:

```json
{"scores":["NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED"],"critical":false}
```

Set actual 0/1/2 scores after review; flag any launch-blocking finding as critical.
No prose/answer or private identity belongs in the score file.

```bash
chmod 600 "$HOME/holocron-eval-private/e5d-p41-scores.json"
pnpm assistant:eval:e5d score --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P41 --scores "$HOME/holocron-eval-private/e5d-p41-scores.json" \
  --confirm RECORD_OWNER_REVIEW_AND_DELETE
pnpm assistant:eval:e5d list --prior "$HOME/holocron-eval-private/approval.json"
```

STOP on program failure, unknown cost, incomplete state, storage error, missing file
or non-PASS owner review. Do not repeat P41. Only after a passing review, successful
body deletion, and an explicit owner decision to continue within the valid grant:

```bash
pnpm assistant:eval:e5d run --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P44 --confirm EXECUTE_E5D_P44_ONCE
pnpm assistant:eval:e5d view --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P44 --confirm SHOW_PRIVATE_RESULT
# Write actual scores for all nine dimensions to a separate private score file.
chmod 600 "$HOME/holocron-eval-private/e5d-p44-scores.json"
pnpm assistant:eval:e5d score --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P44 --scores "$HOME/holocron-eval-private/e5d-p44-scores.json" \
  --confirm RECORD_OWNER_REVIEW_AND_DELETE
pnpm assistant:eval:e5d inspect --prior "$HOME/holocron-eval-private/approval.json"
pnpm assistant:eval:e5d list --prior "$HOME/holocron-eval-private/approval.json"
```

If unreviewed/expired or cleanup interrupted, explicitly delete bodies only:

```bash
pnpm assistant:eval:e5d delete --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P41 --confirm DELETE_RESULT_BODY
pnpm assistant:eval:e5d delete --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5D-P44 --confirm DELETE_RESULT_BODY
pnpm assistant:eval:e5d list --prior "$HOME/holocron-eval-private/approval.json"
```

Do not delete authorization, budget, checkpoints, metadata receipts or D1. Final
program/owner scores and missing reviews must be reported separately. Even two
successful owner reviews are a small pilot, not Production AI acceptance or release
permission. Production v85 / 0019 / AI OFF is outside this tool's scope.
