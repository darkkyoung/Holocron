# E.5H — single P44 live preparation (2026-10-20)

**PREPARATION PASS / LIVE NOT AUTHORIZED.**

## Source and scope

Starting canonical: `bcadc2caf8b3431c50addc5c5bfbb10f3cfbd4aa` (fresh fetch).
The final canonical commit/tree are the commit containing this record, verified
against remote after publication; no circular self-hash is embedded here.

E.5G runtime and product code are unchanged. Production v85 / 0019 / Assistant OFF
is the owner-provided baseline, not newly measured in this Work. No Production
request, deployment, migration, key read, real authorization or Provider call.

New independent revision: **E.5H-p44-v1**, external case **E5H-P44** only. It maps to
unchanged P44 / Story `fd8da8c4-fab2-4391-a39d-b7660ee582ce` / Article
`078ec48d-ef8f-4bb0-9fa2-128e78354f3e`. Corpus/cases/rubric and previous manifests,
readers, approvals and journals are not rewritten.

- Manifest SHA-256: `6d0b72bff34711a30bb15067713991b426f9df8515c44ee2e302d6a68738d33f`
- Runtime: `4acff96e580e6a320608a2053a35528e50c4406e5bcfdde5a6ac13b4cc062781`
- Pipeline: `9c842bfb6deb434fdd0121cdafbc76f1cf3f60a42fec895de6c32337d2a9cc3e`
- Handoff tooling: `386399799953ed6b6e23faa3c213c962463de5015dc7c606dc790f3d71c38632`
- Model/profile: `gpt-5.4-mini-2026-03-17` /
  `gpt-5.4-mini-2026-03-17-o200k-v1`.

The loader checks runtime/pipeline/shared/new-tool hashes and the existing model,
profile, cost/token contract. It does not probe account/model availability or change
prices. Old E.5F integrity remains intentionally incompatible with E.5G.

## Minimal implementation and reuse

Added `scripts/assistant-e5h/{revision,history,history-worker,state,execute,review,cli}.mjs`,
new manifest, two synthetic test files, two package commands and
[evaluation/assistant-mvp/E5H_HANDOFF.md](../../evaluation/assistant-mvp/E5H_HANDOFF.md).
No new dependency, migration, product prompt/validator, UI or collection change.

E.5F scope, external IDs and sequential behavior are fixed in its historical source.
Changing those modules or disguising H as an F execution would change their meaning.
A small H-specific coordinator binds one case and the new historical audit, while
reusing existing budget/lock/journal/fsync, private-file readers/writers, local D1,
inspect/audit, evaluateCase, generation, Provider transport and Credit settlement.
The unchanged Planner score gate and result renderer are reused. No generic campaign
framework or new refund implementation. Historical scripts remain byte-identical.

## Historical continuity

The new reader runs the official E.5F revision/grant/checkpoint/review functions under
`1512d95de440db812c4b051dcc9a7372f2333ccc`; its readers recursively use their own pinned
E.5D/E.5B/E.3.2 code. Current E.5G is never substituted for an old runtime. Every plan
binds original approval hashes/expiry, journal chain/tip, read-only D1 digests and
review receipt hashes. Audit rechecks detect changes during inspection and before
transport. Subprocess environments do not forward credentials.

Required history, based on the owner's report and reproduced with synthetic data:

| Revision | Attempts | Reserved micro-USD | Known usage estimate | Ledger rows |
| --- | ---: | ---: | ---: | ---: |
| E.3.2 | 3 | 86,400 | 13,083 | 7 |
| E.5B | 2 | 52,800 | 6,315 | 5 |
| E.5D | 1 | 19,200 | 2,091 | 2 |
| E.5F | 2 | 52,800 | 6,450 | 5 |
| Total | 8 | 211,200 | 27,939 | 19 across isolated stores |

Require zero unknown usage and no unsettled admissions. E.5D OWNER_NOT_PASS is
preserved. E.5F P41 requires program OK, 5 CR, usage 2,284, OWNER_PASS, matching
stored/reviewed/REVIEWED-deletion receipts and absent body. E.5F P44 requires
INVALID_OUTPUT, failed settlement, usage 4,166, 7 CR debit and linked full refund,
no retained body and NOT_REVIEWED. The old journal does not persist detailed
OFFICIAL_PROMOTION/path: that detail remains owner-reported, not reconstructed.

This Work has **not audited the user's WSL originals**. Synthetic fixtures do not
certify those originals. Missing, corrupt, unexpected, modified or unresolved history
blocks a future real authorization; no repair/reset or body recovery is implemented.

## Proposed permission and budget

Proposal only: one P44 attempt, maximum **33,600 micro-USD ($0.0336)**, cumulative
**9 attempts / 244,800 micro-USD**. Original global 40 / 2,000,000 remains binding.
Usage estimate is not a bill. Refund, timeout, malformed/lost response or lower usage
never restores an attempt/reservation; unknown usage is counted explicitly.

Key-free inspect creates no new evaluation state or authorization. Only a future
explicit owner authorization creates the new fixed ID/24-hour grant and isolated
`<original stateDir>/mvp-p44-e5h-v1` D1. Repeated authorization never extends it.
The original coordinator lock serializes mutations. Every transport revalidates the
old histories, new grant/hash/expiry, journal tip, revision and both budget limits.
Reservation is fsynced before the single transport. Crash/partial initialization,
missing checkpoint, storage failure and repeated case execution stop without retry.
This records local operator decisions; it is not protection against an operator
rewriting the program itself.

## Review and retention

Only validated public result envelopes are stored, <=60 KB, directory 0700/file0600,
exclusive creation/fsync followed by JSON/hash/size/case/revision/time verification.
Storage failure preserves actual Credit/budget settlement and returns terminal STOP.
Rejected/raw Provider output is never retained. A successful save is not quality PASS.

Local TTY-only view renders Korean prose and sources. Nine existing rubric dimensions
and critical flag are preserved. Score records OWNER_PASS/OWNER_NOT_PASS once and
immediately deletes only the body. Stored/reviewed/deleted receipts, journal and D1
remain. Duplicate score is refused. Maximum retention is 24 hours; expired bodies
cannot be read/scored and must be explicitly deleted as unreviewed. No background
purge is promised. Metadata-only list/delete remain usable after revision/expiry changes.

Known E.5G semantic gaps remain: speaker changes, invented facts in creativeNote,
unsupported prices in caveats can pass program validation. If observed, the owner
must record NOT_PASS. Official nonexistence is not equivalent to missing information
in a selected summary. The new handoff does not repair or reinterpret past P44 failures.

## Validation

E.5H integrated test: **190 assertions PASS**, exit 0. Actual Provider outbound ZERO.
The runtime/manifest were revalidated after the test and the original E.5F loader
still returns expected `E5F_INTEGRITY_FAILED`.
The test uses isolated Miniflare D1, synthetic historical outputs and mock transport,
not recovered responses. It builds history using the pinned official execution and
review paths, checks unchanged original snapshots and tests tamper/missing state,
fixed grant expiry, lock contention, durable reservation, only-P44 scope, success,
refund, replay, lost/unknown usage, crash, retention/hash/storage failure and deletion.

Fresh **current-runtime** checks completed:

| Check | Result |
| --- | --- |
| P44 grounding full-path suite | 51 scenarios; 17 P44 mocks + Q&A 5 CR; 7 unsafe rejections/refunds; 3 known semantic gaps |
| Grounding negation | 196 PASS |
| Attribution | 50 paraphrases, 19 deterministic rejections, 45 semantic limitations, 2 known over-rejections; expected assertions PASS |
| Generation | 1,596 assertions PASS; 5/7 CR, replay, refund, public API privacy |
| Provider | 84 PASS; Node/workerd mock, one-call/timeout/body/schema contract |
| Retrieval | 516 PASS; receipt/evidence freshness |
| Admission | 263 PASS |
| Refund safety | 586 PASS |
| Headroom | 1,173 PASS |
| Credit policy | 262 PASS; monthly/daily budget and v7 contracts |
| TypeScript | PASS |
| Lint | 0 errors; 1 pre-existing unused `debit` warning |
| Build | PASS |
| Diff check | PASS |

Historical frozen behavior is exercised by the new synthetic history fixture/readers,
not relabeled as testing the latest validator. No full historical/UI/CI rerun was
needed for unchanged product/UI. No Windows/WSL real private-state audit, real model
access/quality, actual owner TTY session or Production behavior was tested here.

## Owner handoff / next decision

After clean-checkout fresh fetch/fast-forward and dependency verification, the first
key-free command is:

```bash
pnpm assistant:eval:e5h inspect --prior "$HOME/holocron-eval-private/approval.json"
```

Follow E5H_HANDOFF and stop after inspecting history/revision/scope/budget. A separate
owner decision is still required for one live P44, grant expiry and private retention.
Work created no real approval, reserved no real budget and made **ZERO actual Provider
calls / ZERO Production changes**. A future one-case success is limited evidence,
not AI launch approval. Repeated P44 failure calls for structural review, not endless
new revisions or unapproved retries.
