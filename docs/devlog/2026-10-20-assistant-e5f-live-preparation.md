# AI E.5F — post-attribution preparation and budget continuity

Work started 2026-10-19 KST and continued into 2026-10-20 KST.
Starting canonical (fresh fetch, clean): `d449058dfa35ee6364ca7e31df37a120afff0bd3`.
Final published SHA/tree are reported after remote re-fetch; this commit includes
both the preparation and its record. No Production access/change, real Provider
call, real approval, key access or real budget reservation occurred.

## Revision and scope

New revision: **E.5F-smoke-v1**, separate `e5f-revision.json`.
Manifest SHA-256: `01eedb89946761825c4d891fda075ad27c64a2b6c736229313bb5cd2a246cbf4`.
Runtime: `a138b0b8abcea4eccfef009ca2248f581852252fedfd9d5668feb881fbc3f8f8`.
Pipeline: `54b3348e1b1c9ec6a637a71b8fc0bc25a2b6126b753d457c538a08bbac611b0a`.

E5F-P41 and E5F-P44 use the byte-identical existing P41/P44 inputs and evidence.
Corpus/cases/rubric and E.3.2/E.4/E.5B/E.5D manifests/tooling are unchanged. The
E.5D revision still fails on current runtime as intended; no hash replacement or
reuse of its remaining P44 permission. No product lib, prompt, validator, schema,
Credit policy, migration, source collection, scheduler or UI changes.

The official model page was read on 2026-10-19: snapshot
`gpt-5.4-mini-2026-03-17`, Responses/structured outputs, reasoning none and
$0.75/$4.50 per million input/output tokens match the unchanged
`gpt-5.4-mini-2026-03-17-o200k-v1` profile. Existing token/body/deadline limits,
default tier/global endpoint, store:false and single transport remain. Account
access/current billing are NOT TESTED. See the official link in E5F_HANDOFF.md.

## History and implementation

The owner's last reported history is six attempts, 158,400 micro-USD reserved,
21,489 known usage estimate, zero unknown usage. Work **did not inspect the actual
WSL files**. Synthetic histories reproduce these values with the real pinned code:

- E.3.2: 3 / 86,400 / 13,083; seven ledger rows, P07 refunded.
- E.5B: 2 / 52,800 / 6,315; five rows, P41 OK, P44 INVALID_OUTPUT/full refund.
- E.5D: 1 / 19,200 / 2,091; two rows, P41 OK/completed/5 CR, OWNER_NOT_PASS,
  REVIEWED deletion and absent body; P44 unexecuted. A repeated historical score
  reproduces ENOENT without changing the valid earlier receipts.

`scripts/assistant-e5f/history*` reads E.5D under pinned commit
`23633635fba075d148f72662a6909a1b81b63b28`; its readers inspect E.5B and E.3.2 under
their original commits. No historical Worker starts, DB copy/migration, recovery
or output reconstruction. Hashes, chains, tips, read-only D1 digests, settlements,
expirations and review/deletion receipt hashes bind the new plan. Actual inspection
is required on the owner's PC before any new authorization.

The small E.5F orchestration keeps historical code byte-identical. It reuses the
existing budget coordinator/append-fsync journal, private-file helpers, record
validation, totals/fsync helpers, rendering, local runtime/inspection and
`evaluateCase` production retrieval/receipt/admission/provider/validation/freshness/
settlement/replay path. Revision-specific scope, history and continuation decisions
are separate modules; no new economic system, schema, dependencies or generic
campaign framework.

A future separately authorized grant creates only a fresh isolated local D1 under
`<original stateDir>/mvp-smoke-e5f-v1`, not a new independent budget. Fixed approval
ID/24-hour expiry; repeated authorize cannot extend or reinitialize. The original
coordinator lock protects authorization, execution, review and deletion. History
and grant are rechecked before durable reservation. Each ID gets at most one
transport; failure, unknown response and crash do not restore attempts/reservations.

Additional proposed ceiling: **2 / 52,800 micro-USD**; aggregate **8 / 211,200**,
within original 40 / 2,000,000. No real grant was created. Separate explicit commands
run P41 then P44. P41 must be program OK/known cost/settled with intact stored,
reviewed and deleted metadata, but OWNER_NOT_PASS is preserved and does not prevent
an owner's separately chosen P44 quality check. No automatic continuation or retry.
Technical/financial/storage/expiry/lock failures STOP. Quality failure still blocks
public-release candidacy regardless of whether the other case is evaluated.

## Output review

Validated public envelopes only, 0700/0600, <=60 KB, fsync and read-back hash/JSON/
case/revision/expiry checks. Stored/failed/reviewed/deleted metadata are separate
from bodies and financial journal. Local interactive-terminal rendering reuses the
existing Korean answer/guide/source presentation. Nine unchanged rubric scores and
critical flag are owner judgments, never an AI judge. Scoring writes once and
immediately deletes only the body. Repeat score reports REVIEW_ALREADY_RECORDED.
Expiry remains 24 hours per body; no background deletion promise. Source/approval
expiry does not block explicit body cleanup. Storage failure preserves settled
charges and consumed reservation and blocks new execution. No rejected raw output,
key, cookie or real user transcript is logged or retained.

## Validation

Verdict: **PREPARATION PASS / LIVE NOT AUTHORIZED**. Fresh results:

| Scope | Result |
| --- | --- |
| E.5F synthetic history/local D1/mock suite | 179 assertions PASS |
| Current attribution | 50 correct field checks, 19 safety rejections; 45 semantic limitations and 2 conservative over-rejections explicitly retained, not semantic PASS |
| Current grounding negation | 196 PASS |
| Current generation / provider | 1,596 / 84 PASS; provider includes real workerd mock boundary |
| Current retrieval / admission | 516 / 263 PASS |
| Current refund safety / headroom | 586 / 1,173 PASS |
| Current Credit policy | 262 PASS |
| Historical output diagnostics | 315 PASS at 2ec1a2b; not current-runtime acceptance |
| Old E.5D loader on current source | Expected E5D_INTEGRITY_FAILED; no private state accessed |
| TypeScript / build / diff-check | PASS |
| Lint | exit 0, existing unused debit warning only |

The 179 checks cover pinned synthetic histories, original approval/file preservation,
chain/hash/D1 tampering and missing state, E.5D failed-quality/deleted-body history,
new grant scope/expiry/conflicts, coordinator contention, P41-only then explicit P44
with OWNER_NOT_PASS preserved, 5/7 debit, replay and duplicate attempts, durable
reservation at transport entry, current E.5E instructions on the wire, E.5C denial
acceptance and mixed-claim 7 CR refund, malformed/network/lost/timeout cases, unknown
usage, crash checkpoints, output write/read/hash/expiry/deletion and duplicate-score
refusal. Test branches reset only disposable synthetic copies; no owner reset API
exists. Original DB/WAL and record bytes remain unchanged (SQLite shm excluded).
Temporary synthetic histories and review bodies were removed on test completion.
The actual network guard counted zero Provider outbound; successful mocks do not
predict Korean semantic quality. Full historical E.5D suite, unrelated UI/CI and
Production acceptance were not rerun; the pinned E.5D creation/review/audit path is
exercised by the new synthetic-history integration.

## Owner next step and expanded evaluation

[E5F_HANDOFF.md](../../evaluation/assistant-mvp/E5F_HANDOFF.md) contains implemented
WSL commands. First fresh fetch/review/fast-forward a clean checkout, then run only:

```bash
pnpm assistant:eval:e5f inspect --prior "$HOME/holocron-eval-private/approval.json"
```

No key, initialization, approval, reservation or transport is involved. STOP after
that plan and request a separate explicit revision/budget/expiry/retention decision.
The code and mock authorizations do not grant real spending authority.

The old 30 public cases contain 18 QA, four Planner and eight excluded Draft tasks.
Twenty-two are format-reuse candidates; review criteria/coverage before reuse and
adapt/replace Draft cases under NEW IDs without rewriting frozen fixtures. Six E.4
MVP cases also offer candidates, with overlapping scenarios explicitly counted.
The handoff proposes later 30-task coverage and unchanged human quality/launch
criteria, separate synthetic safety controls and bounded reservation arithmetic.
Example 18 QA + 12 guides: 748,800 micro-USD for 30 new paid attempts; after the
E.5F ceiling, total 38 / 960,000, leaving only two attempts in the original global
cap. This is a proposal, not an approved expansion. All failed/unreviewed outputs
remain in denominators. Smoke cannot establish general model reliability.

Real WSL integrity, owner filesystem/runtime behavior, API account access, actual
Korean semantic quality and hosted AI acceptance remain NOT TESTED. Production
v85 / 0019 / OFF is the supplied baseline and was not inspected or altered.
