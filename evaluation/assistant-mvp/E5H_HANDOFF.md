# E.5H — single P44 handoff

**PREPARATION / LIVE NOT AUTHORIZED.** Work creates no real approval or reservation,
reads no key and makes no Provider/Production request. Mock authorizations below
refer only to disposable test data. Do not run E.5F again or modify its manifest.

## Fixed scope

`e5h-revision.json` is a separate **E.5H-p44-v1** revision. External ID **E5H-P44**
maps to the unchanged P44 case, question, Story/article, claims and nine-dimension
rubric. The new isolated local D1 is at
`<original approval.stateDir>/mvp-p44-e5h-v1`; internal budget case ID P44 belongs to
that new revision, not a replay of an old request. No P41, P07, rest or repeat mode.

| Budget | Attempts | Reserved micro-USD | Known usage estimate |
| --- | ---: | ---: | ---: |
| Required E.3.2 history | 3 | 86,400 | 13,083 |
| Required E.5B history | 2 | 52,800 | 6,315 |
| Required E.5D history | 1 | 19,200 | 2,091 |
| Required E.5F history | 2 | 52,800 | 6,450 |
| Required historical total | 8 | 211,200 | 27,939 |
| Proposed E5H-P44 | at most 1 | at most 33,600 ($0.0336) | unknown until execution |
| Proposed aggregate ceiling | 9 | 244,800 ($0.2448) | not a billing ceiling |

The original 40-attempt / 2,000,000 micro-USD global ceiling remains. No new 40-call
campaign. Reservation is conservative and never reclaimed for refund, failure,
timeout, lost response or lower actual usage. Unknown usage is explicitly counted.
This is an Assistant evaluation-process estimate, not an account-wide billing cap.

Model/profile remain `gpt-5.4-mini-2026-03-17` /
`gpt-5.4-mini-2026-03-17-o200k-v1`. Local integrity verifies the fixed price contract
($0.75 input / $4.50 output per million), 33,600 reservation and current runtime.
No account/model-access probe is made. Existing strict Responses request, store:false,
no tools/stream/background/conversation, one transport and body/deadline limits apply.
Neither store:false nor local deletion promises Provider ZDR.

## Historical audit — before any new authorization

The reader extracts the exact E.5F commit
`1512d95de440db812c4b051dcc9a7372f2333ccc`, verifies its own revision, and uses its
original grant/checkpoint/review functions. Its historical readers in turn inspect
E.5D at 2363363, E.5B at be6965a and E.3.2 at 684dcc5. E.5G is not substituted for
those runtimes. No private DB copy, migration, recovery or output reconstruction.

The original approvals/expirations, journal chains/tips and read-only D1 digests
are bound into the plan. Require eight attempts, the exact totals above, no unknown
usage/unsettled admissions; 7/5/2/5 ledger entries in the four historical stores.
The prior E.5D OWNER_NOT_PASS receipt is retained, never upgraded.

E.5F requires P41 OK/completed/5 CR/2,284 usage estimate, OWNER_PASS score with
matching stored/reviewed/REVIEWED-deletion receipts and no body. P44 must be
INVALID_OUTPUT/failed/4,166 usage estimate with 7 CR debit and full linked refund,
no stored body or fabricated review. The old journal has no detailed outputDiagnostic;
OFFICIAL_PROMOTION/path remains owner-reported evidence, not independently recovered
from that journal. Exact bytes and receipts are rechecked; missing/corrupt/unexpected
history blocks the handoff. Do not edit originals to make them fit these expectations.

Work tested synthetic histories only. The user's WSL originals must pass this audit.
Expired old approvals are evidence, not authority; no old expiry or planToken is reused.
Inspection creates no new evaluation directory, approval, reservation or Worker.
Original read-only auditors may hold the existing transient coordinator lock and
SQLite may update shared-memory read marks; no DB/WAL rows or immutable records are
written. Close other evaluation processes before inspection.

## WSL — run only this key-free inspection now

Open Ubuntu on Windows 11:

```bash
cd ~/projects/holocron-eval
git status --short
git fetch origin main
git log --oneline HEAD..origin/main
```

Stop for local edits or unexpected upstream changes. With a clean, reviewed checkout:

```bash
git merge --ff-only origin/main
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm assistant:eval:e5h inspect --prior "$HOME/holocron-eval-private/approval.json"
```

Expected initial status: `PLAN_ONLY_LIVE_NOT_AUTHORIZED`, historical 8 / 211,200 /
27,939, zero unknown usage, E.5F P41 OWNER_PASS/deleted and P44 INVALID_OUTPUT/refund7.
Check new revision/hash, P44-only scope and proposed 9 / 244,800 aggregate ceiling.
Only safe counts/hashes/status may be shared; do not share private files or bodies.

**STOP here.** Request separate owner approval for the exact revision, one P44
attempt, maximum $0.0336 reservation, fixed 24-hour grant and <=24-hour validated
output retention. This preparation does not grant spending authority.

## Future owner workflow — requires that separate decision

The implemented CLI commands are `inspect`, `authorize`, `run`, `list`, `view`,
`score`, `delete`. Every command requires the original absolute `--prior` path.
There is no arbitrary stateDir, history override, repeat, reset or retry switch.

| Later operation | Required explicit control |
| --- | --- |
| authorize | fresh E.5H `--plan`; `--confirm AUTHORIZE_E5H_P44_ONCE` |
| run | `--case E5H-P44`; `--confirm EXECUTE_E5H_P44_ONCE` |
| view | same case; `--confirm SHOW_PRIVATE_RESULT`; interactive local terminal only |
| score | same case; absolute private `--scores` file; `--confirm RECORD_OWNER_REVIEW_AND_DELETE` |
| delete | same case; `--confirm DELETE_RESULT_BODY` |

Authorization creates a fresh fixed ID once, with 24 hours from issuance, under the
original coordinator lock. Repetition cannot extend expiry or repair a partial
initialization. Each transport rechecks historical bindings, current revision,
authorization hash, expiry, journal tip and ceilings; reservation is durable/fsynced
before transport. Crash/partial state is terminal STOP with consumed reservations.
One case can never be sent again by this CLI, even after an unsuccessful response.

After separate authorization, use only the existing dedicated private injection for
`HOLOCRON_EVAL_OPENAI_API_KEY` in the local evaluation process. No automatic env-file
loading, collection-key fallback, Production secret, key-in-argument or chat entry.
This handoff intentionally ends its copyable execution instructions at inspect;
Work has not injected a key, authorized or executed a real case.

## Output and human review

Only a validated public result envelope can be retained. Private directory 0700,
file 0600, <=60,000 bytes, exclusive create, fsync, read-back JSON/hash/size/case/
revision/creation/expiry verification. Raw or rejected Provider output is not stored.
Stored/storage-failed/reviewed/deleted receipts are separate from body and budget.
Only `view` prints Korean guide prose and source links, in a local interactive TTY;
normal reports/inspect contain metadata, never the answer or prompt.

Program OK + saved file is **not semantic PASS**. Compare every claim and source
using the unchanged nine rubric dimensions (0/1/2/NOT_REVIEWED, plus critical flag).
All nine 2 and no critical finding is OWNER_PASS. Otherwise OWNER_NOT_PASS. No judge
model and no automatic quality decision. Pay particular attention to E.5G's known
lexical gaps: changed speaker, invented facts in creativeNote, unsupported prices in
caveats. If present, score the relevant dimensions as failures even when program OK.
Check reporting versus direct speech, actual uncertainty versus nonexistence, prices,
booking/dates, natural Korean, useful normally 3–5 sections, and fact/creative separation.

`score` records the owner verdict once, then immediately deletes only the body.
Repeated score fails REVIEW_ALREADY_RECORDED; never change a failed score to pass.
Keep stored/review/deletion receipts, approvals, budget and D1. `list` distinguishes
exists/integrity/expiry/storage/review/deletion. If storage fails after settlement,
usage and Credit outcome remain; STOP without regenerating a body. If removal is
interrupted, finish with explicit body deletion, not another score or Provider call.
At 24 hours delete an unreviewed body and leave NOT_REVIEWED. No background deletion
is promised. List/view/delete remain available after source or approval expiry;
expired bodies cannot be viewed/scored. A failed/absent body is never recovered.

## Outcomes and stop conditions

- Program PASS + OWNER_PASS: one-case evidence only. Next step is broader quality
  coverage; no automatic AI release or additional paid evaluation.
- Program PASS + OWNER_NOT_PASS: retain safe scores/type summary, delete body and
  stop. Do not claim model reliability.
- INVALID_OUTPUT: verify full 7 CR refund/settlement and consumed attempt/reservation;
  no raw output storage and no retry. Repeated failure warrants structural review,
  not an endless sequence of new revisions.
- Unknown usage, incomplete settlement, storage/hash failure, journal/history
  mismatch, expired grant or lock failure: STOP and preserve evidence. No force
  unlock, reset, manual journal rewrite or private DB repair command is supplied.

Finish by inspecting budget/Credit and listing body deletion. Production v85/0019/
Assistant OFF, News scheduler, Credit settings and all historical stores remain
outside this evaluation. GitHub publication is not deployment.
