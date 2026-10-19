# E.5F — post-attribution smoke preparation

**PREPARATION ONLY / LIVE NOT AUTHORIZED.** No new approval, real reservation or
Provider call has been made by this implementation. Production stays outside this
runner. Obtain a separate explicit owner decision before authorization or key use.

## Scope and frozen evidence

`e5f-revision.json` pins the E.5E runtime and pipeline, shared evaluation tools,
and E.5F orchestration (including reused E.5D helpers). It does not replace E.4,
E.5B or E.5D manifests. E5F-P41/P44 map to the identical P41/P44 corpus, input,
selected articles and nine-dimension rubric. Internal budget IDs remain P41/P44
inside the new revision-bound directory, never replays of previous paid requests.

| Scope | Attempts | Reserved micro-USD | Known usage estimate |
| --- | ---: | ---: | ---: |
| E.3.2 historical | 3 | 86,400 | 13,083 |
| E.5B historical | 2 | 52,800 | 6,315 |
| E.5D historical | 1 | 19,200 | 2,091 |
| Required historical total | 6 | 158,400 | 21,489 |
| E5F-P41 proposed maximum | 1 | 19,200 | unknown until execution |
| E5F-P44 proposed maximum | 1 | 33,600 | unknown until execution |
| Proposed new scope | 2 | 52,800 ($0.0528) | not a billing estimate |
| Proposed aggregate ceiling | 8 | 211,200 ($0.2112) | not a billing ceiling |

Global ceiling remains 40 attempts / 2,000,000 micro-USD. No fresh 40-attempt grant.
Failures, timeouts and lost responses consume the full reservation. Unknown usage
is explicitly counted, never called zero. Credit refunds do not restore API budget.

The [official model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
was checked 2026-10-19: `gpt-5.4-mini-2026-03-17`, Responses, structured outputs,
reasoning `none`, $0.75 input / $4.50 output per million tokens match the profile.
Existing `gpt-5.4-mini-2026-03-17-o200k-v1` uses o200k, 16,000 input maximum and
1,600/4,800 output, default tier/global endpoint; no regional endpoint surcharge
is assumed. No account-access test was made. Existing store:false, no tools,
streaming/background/conversation, one transport, body/deadline limits remain.
`store:false` and local deletion are not Provider ZDR guarantees.

## Historical audit and authorization

The reader extracts **23633635fba075d148f72662a6909a1b81b63b28**, checks its E.5D
revision, and uses its official state/checkpoint/review inspectors. That reader in
turn checks E.5B at be6965a and E.3.2 at 684dcc5. Historical DBs are inspected through
read-only SQLite, with no Worker, migration, copy or recovery of private stores.
DB/WAL data and logical rows are preserved; SQLite shared-memory read marks may
change. Close other evaluation processes before read-only inspection.

Required: original approval hashes/expirations, chain/tips, D1 digests, settlements,
E.3.2 seven ledger rows, E.5B five, E.5D two, six attempts and exact totals above;
no unknown usage/unsettled admission. E.5D must contain only P41 OK/completed/5 CR,
OWNER_NOT_PASS review, REVIEWED deletion, matching stored/reviewed/deleted metadata
and no body; P44 must be absent. A previous duplicate-score ENOENT is not a new
attempt or evidence of corruption. The legitimate receipts are checked without
requiring or restoring the deleted body. Missing/mismatching evidence STOPs.

These hashes/digests (including receipt hashes) bind the new plan and grant.
Expired historical grants supply evidence only; no expiry is extended. The future
E.5F approval gets a new fixed ID and 24-hour validity once. Repeated authorization
never extends it or reinitializes partial state. The new local D1 is isolated at
`<original approval.stateDir>/mvp-smoke-e5f-v1`, using current schema; originals are
never migrated. Shared original `budget.lock` serializes all mutations. Historical
bindings and the active grant are rechecked under the lock and before each durable
reservation. Reservation is append+fsync before transport. Crash/partial state,
lock contention, source/history mismatch and storage failure STOP without retry.
No reset/repeat/rest/automatic continuation command exists. These local controls
record operator intent; they are not an authentication server against an operator
who deliberately modifies the code and private files.

## Independent quality decisions

Run P41 first, then inspect/read/score/delete it. P44 is a separate explicit command.
P41 must have program OK, known cost, settled Credit, intact history/checkpoint,
verified output storage, recorded owner review and body deletion. **OWNER_NOT_PASS
is preserved and may still permit a separately chosen P44 quality evaluation.**
It does not become PASS, grant public-release approval or trigger another call.
Program failure, unknown usage, incomplete settlement, missing/corrupt output,
storage failure, expiry or lock problems block continuation. After either attempt,
never repeat it to fix prose or recreate a missing file without a new decision.

## Private output and review

Only the validated public envelope is saved, under the approval-derived stateDir,
to `review/E5F-P41.body.json` or P44. Private directories 0700/files 0600, <=60,000
bytes, fsync, read-back JSON/case/revision/size/hash/creation/expiry verification.
Raw Provider payloads, keys, cookies and real user identity are not retained.
Safe stored/storage-failed/reviewed/deleted receipts are separate from bodies and
budgets. Program OK with failed storage is terminal STOP, not human-review-ready.

`list` reports existence/integrity/expiry/storage/review/deletion separately. `view`
requires an interactive local terminal (no CI/redirection) and shows Korean prose,
evidence and source links. Do not paste bodies into chat/Git/issues/artifacts.
Scores use the unchanged nine rubric dimensions: 0/1/2/NOT_REVIEWED plus critical.
QA dimensions 7/8 are not applicable. All applicable 2 and no critical finding is
OWNER_PASS; other results stay OWNER_NOT_PASS. No model judge or automatic semantic
PASS. Both modes must pass human quality review before any public-release candidacy.

`score` writes an exclusive receipt, deletes the body immediately and fsyncs the
directory. Repeated scoring refuses REVIEW_ALREADY_RECORDED and cannot change the
original verdict. If deletion fails, explicitly delete the body; do not rescore.
Retention is at most 24 hours per file, independent of authorization expiry. Delete
expired/unreviewed bodies and leave semantic review NOT_REVIEWED. No background
cleanup is promised. `list/view/delete` remain available after expiry/source changes.
Never remove budget, D1, approvals or receipts to regain an attempt.

## WSL: first run only the key-free read-only plan

Open Ubuntu on Windows 11:

```bash
cd ~/projects/holocron-eval
git status --short
git fetch origin main
git log --oneline HEAD..origin/main
```

If there are local edits or unexpected remote changes, stop and preserve them.
Otherwise:

```bash
git merge --ff-only origin/main
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm assistant:eval:e5f inspect --prior "$HOME/holocron-eval-private/approval.json"
```

No key is needed/read. Inspect creates no approval, campaign, D1 or reservation.
Check historical six-attempt totals, OWNER_NOT_PASS/deletion, new hashes and scope.
Work has not inspected your actual WSL originals. Share only safe aggregate/hash
metadata if needed, never private approval/journal/database contents.

**STOP here. Request separate authorization for this revision, two cases, $0.0528
maximum reservation, 24-hour approval and private validated-output retention.**
Do not reuse E.5D's remaining P44 permission or its plan token.

## Future owner commands — not authorized by preparation

Only after that explicit decision, use the exact fresh E.5F planToken:

```bash
pnpm assistant:eval:e5f authorize \
  --prior "$HOME/holocron-eval-private/approval.json" \
  --plan '<E5F-planToken>' --confirm AUTHORIZE_E5F_TWO_CASES
pnpm assistant:eval:e5f inspect --prior "$HOME/holocron-eval-private/approval.json"
```

Use the existing dedicated hidden-key injection in the authorized local terminal
(`HOLOCRON_EVAL_OPENAI_API_KEY`), never a collection/Production key. No automatic env
file loading. Do not place a key in chat, arguments, history or Git. Work does not
request, read, create or configure it during preparation.

```bash
pnpm assistant:eval:e5f run --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P41 --confirm EXECUTE_E5F_P41_ONCE
pnpm assistant:eval:e5f list --prior "$HOME/holocron-eval-private/approval.json"
pnpm assistant:eval:e5f view --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P41 --confirm SHOW_PRIVATE_RESULT
```

Compare every claim and source: speaker, subject, assertion, reporting outlet,
certainty, missing details and natural Korean. In a private editor prepare a 0600
score file in rubric order. Template **not a prefilled PASS**:

```json
{"scores":["NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED","NOT_REVIEWED"],"critical":false}
```

Record actual scores and critical findings, with no prose or private identifiers:

```bash
chmod 600 "$HOME/holocron-eval-private/e5f-p41-scores.json"
pnpm assistant:eval:e5f score --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P41 --scores "$HOME/holocron-eval-private/e5f-p41-scores.json" \
  --confirm RECORD_OWNER_REVIEW_AND_DELETE
pnpm assistant:eval:e5f list --prior "$HOME/holocron-eval-private/approval.json"
pnpm assistant:eval:e5f inspect --prior "$HOME/holocron-eval-private/approval.json"
```

Stop on technical/financial/storage errors. If those gates pass, decide separately
whether to evaluate P44 within the still-active grant, even if P41 was OWNER_NOT_PASS:

```bash
pnpm assistant:eval:e5f run --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P44 --confirm EXECUTE_E5F_P44_ONCE
pnpm assistant:eval:e5f view --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P44 --confirm SHOW_PRIVATE_RESULT
# Write actual scores for all nine dimensions after inspecting the guide and sources.
chmod 600 "$HOME/holocron-eval-private/e5f-p44-scores.json"
pnpm assistant:eval:e5f score --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P44 --scores "$HOME/holocron-eval-private/e5f-p44-scores.json" \
  --confirm RECORD_OWNER_REVIEW_AND_DELETE
pnpm assistant:eval:e5f inspect --prior "$HOME/holocron-eval-private/approval.json"
pnpm assistant:eval:e5f list --prior "$HOME/holocron-eval-private/approval.json"
```

Check guide evidence/attribution, uncertainty versus false official promotion,
fact/creative separation, useful normally 3–5 sections and absence of full narration.
Report both program and owner results, including failures and NOT_REVIEWED.
For expired/unreviewed bodies or interrupted deletion, body-only cleanup:

```bash
pnpm assistant:eval:e5f delete --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P41 --confirm DELETE_RESULT_BODY
pnpm assistant:eval:e5f delete --prior "$HOME/holocron-eval-private/approval.json" \
  --case E5F-P44 --confirm DELETE_RESULT_BODY
pnpm assistant:eval:e5f list --prior "$HOME/holocron-eval-private/approval.json"
```

## Later expansion — separate scope, criteria and approval

The design requires at least 30 archive-based tasks before launch. The frozen E.3.2
set has 30 public tasks: 18 QA, four non-draft guides, eight Full Draft tasks. Thus
22 are format-reuse candidates, **not 30 MVP-ready tasks**. Review each claim/citation
and coverage before reuse; adapt the eight Draft tasks into new guide IDs in a new
set (never edit frozen cases) or select other public archive scenarios. E.4's six
public MVP tasks are useful comparative candidates, but overlapping articles/tasks
must not be counted as independent coverage merely because IDs differ.

A later proposal can target 18 QA + 12 guides = 30 public tasks, with explicit
coverage for single/multiple articles, outlet conflicts, direct/indirect speech,
unknown speakers, no evidence, official status, rumor/discussion, numbers/date-only
ordering, multiple sources per Story, Korean/task usefulness, guide fact/creative
separation and needless refusals. Keep injection/security and pre-call rejection
controls separately labeled as synthetic; they do not replace archive coverage.
Freeze allowed/forbidden claims, mandatory caveats and IDs before any output.

Reserve conservatively by paid-path count: `19,200 * QA + 33,600 * guide`, plus any
explicitly authorized retries (never automatic). Thirty paid attempts at 18/12
would reserve 748,800 micro-USD. After the proposed E.5F ceiling, aggregate would
be 38 attempts / 960,000 micro-USD, leaving only two of the original 40 attempts.
This is arithmetic for review, **not a grant**; actual history must be audited and
unused/blocked cases and unknown usage reported. Free controls consume no Provider
attempt. No extra judge/model comparison. Use the unchanged rubric and launch
blocks: severe unsupported facts/fake citations/leaks, duplicate debit or inconsistent
settlement stop release. Useful-completion and safe-rejection rates must be separate;
all-refusal cannot pass. Smoke alone cannot establish general semantic reliability.
