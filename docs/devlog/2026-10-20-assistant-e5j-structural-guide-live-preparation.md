# E.5J — structural guide single-case live preparation (2026-10-20)

Starting canonical, freshly fetched: `909afb183d786b8277d77968995534c2cbc07479`.
Final canonical is the commit containing this record; the final report records its
SHA/tree after re-fetch. No circular self-hash is embedded here.

## Scope and evidence boundary

**PREPARATION PASS / LIVE NOT AUTHORIZED.**

Preparation only. No real Provider calls, key reads, live approvals/reservations,
Production requests, deployments, DB writes/migrations or AI activation. Disposable
synthetic approvals/reservations are test fixtures, not authority to spend.
Production v85 / 0019 / AI OFF is the owner's baseline, not newly measured.

Owner-reported history: E.3.2 3 / 86,400 / 13,083; E.5B 2 / 52,800 / 6,315;
E.5D 1 / 19,200 / 2,091; E.5F 2 / 52,800 / 6,450; E.5H 1 / 33,600 / 4,416
(attempts / reserved / known usage estimate, micro-USD). Total **9 / 244,800 /
32,355**, unknown usage 0. Work did not access the owner's WSL originals.
E.5D P41 OWNER_NOT_PASS and E.5F P41 OWNER_PASS/reviewed/deleted remain distinct.
E.5F/H P44 failures and full 7 CR refunds are not upgraded or erased.
E.5H diagnostic OFFICIAL_PROMOTION at caveats[1].text is owner-reported; the old
journal does not retain this detailed diagnostic or raw response. No reconstruction.

## Implementation

- New `evaluation/assistant-mvp/e5j-revision.json`: **E.5J-p44-v1**, only **E5J-P44**,
  one attempt / 33,600 micro-USD; aggregate ceiling **10 / 278,400**, with original
  40 / 2,000,000 global ceiling unchanged. This is a proposal, not approval/billing.
- New `scripts/assistant-e5j/` adapters use E.5H's single-case coordinator, execution,
  CLI and review functions. Small dependency factories in five E.5H modules avoid
  copying these implementations. E.5H default identity remains; historical execution
  and audit use its archived original source, never today's factored modules.
- New history worker extracts exact **6fc7ac7b4ebbbd111ddcc16775fe0d1343501b0a** and
  uses its official revision/grant/checkpoint/review functions. Its original readers
  recurse through pinned E.5F/E.5D/E.5B/E.3.2. Require nine calls/exact totals, linked
  debit/refund/settlement, complete D1 ledger audits, journal/hash/digest bindings,
  no pending/unknown usage, expected past review/deletion and absent failed body.
  E.5H's review folder must be absent/empty, not populated with invented receipts.
- New J-only bounded byte seal: a fresh full pinned audit is bracketed by content/
  path/mode snapshots of the original approval, budget/local D1 and B/D/F/H stores.
  Rechecks during that context compare these bytes, including WAL and review receipts,
  under the original coordinator lock. No persisted cache or mtime-only trust; no
  symlinks, at most 2,048 entries / depth 10 / 64 MiB file / 256 MiB total. SQLite
  `.sqlite-shm` read marks are excluded; new J state is not part of old history.
  This prevents recursively launching every archived auditor inside the Provider
  deadline. Initial full audit still uses official pinned code on every command.
- New independent local state `<original stateDir>/mvp-p44-e5j-v1`. Original lock,
  fixed one-time grant ID/24-hour validity, exclusive files, fsync-before-transport,
  no retry/repeat/reset, expiry/history/revision/journal checks and ceilings reused.
- Only validated public result envelopes can be retained, with 0700/0600 permissions,
  size/hash/JSON/revision checks and 24-hour access limit. Owner must delete within
  the retention deadline; no background deletion is claimed. `score` records one
  nine-dimension owner verdict and deletes only the body. All nine applicable scores
  2 and critical=false are required for OWNER_PASS. Missing reviews never pass.
- `package.json` adds `assistant:eval:e5j` and `test:assistant-e5j` only; no dependency.
  New synthetic history fixture and handoff regression use archived real auditors
  and isolated Miniflare D1 with mock Responses. Existing historical test scripts,
  corpus/cases/rubric and all prior manifests are unchanged.

No `lib/`, UI, schema/migration, policy, model/profile or product behavior change.
The two E.5I semantic counterexamples (speaker reassignment, creativeNote fabricated
facts) remain human-review failures even if program validation accepts them.

## Revision and Provider schema

Runtime: `0559656c7679972b9996d1088a927c6acc4d763a4c5ee02e724345b870997f9b`.
Pipeline: `7f89bba635e7f44f3b4714c8cd73422d42e722d7bcf84c0f082dc2e070ccfdd1`.
Model/profile: `gpt-5.4-mini-2026-03-17` /
`gpt-5.4-mini-2026-03-17-o200k-v1`; fixed local contract 750,000 input and 4,500,000
output micro-USD per million tokens, planner reservation 33,600. No model-access probe.
Manifest SHA-256: `d4fd9a612ac897d6fa720cb7b4e39574e0386f1b40fb12905c4fb6c9dcff5f79`.
Handoff SHA-256: `6c02caee3a7686637e12ed01466e927da0265d92193b0a79cb67050c2df383ad`.
The unchanged base tooling hash and corpus/cases/rubric hashes are in the manifest.

Actual prepareProviderInput is exercised through retrieval/receipt/generation, not a
handwritten wire substitute: Responses text.format strict:true, required caveats,
maxItems:0; empty provider array succeeds, nonempty array fails ARRAY_LENGTH and
refunds. `guideCaveats()` fills the public `{text,evidenceIds}[]` only after validation.
Stored/viewed output is the public envelope with these notices, not raw wire JSON.

Static [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs)
checked 2026-10-20: supported array properties include maxItems; fine-tuned models
have additional restrictions. This is document evidence only, not actual account
schema acceptance, model availability or semantic quality. No schema test API call.

## Validation

Current-runtime and historical fixture execution are reported separately; no
historical manifest is rebound. Initial full-audit testing caught an incorrect read
of `charged_credits` from the raw read-only admissions projection (that name is a
runtime joined alias, not a stored column). Removed that invalid comparison; the
actual 7 CR debit is still checked through the admission's linked ledger entry,
finish metrics and full refund linkage. No product/database change or weakened
ledger check. A subsequent test harness failure closed the reusable audit context
too early during manifest-tamper cleanup; fixed the test lifetime, without relaxing
HISTORY_CHANGED. Final `pnpm test:assistant-e5j` rerun exited 0: **234 handoff
assertions + 9 history-seal boundaries PASS**. No unresolved test failure.

The first unbounded repetition of archived audit startup in the test harness was
stopped and separated into full pinned-audit integration plus reusable-audit boundary
checks. Production performs a new full audit per command; within a command, the
real content seal is checked before dispatch. Tests use that same seal for tamper
checks, not a fake successful historical result.

Current-runtime regression results (all mock/no real Provider):

| Check | Result |
| --- | --- |
| E.5J historical/handoff | 234 assertions PASS; full pinned nine-attempt audit, true current execution, real seal rechecks, tamper/expiry/lock, 7 CR/refund/replay, storage/review/delete; 9 separate seal boundaries PASS |
| E.5I P44 structural guide | 57 scenarios PASS, 18 full mocks; 7 completed / 11 refunded; two semantic limitations explicitly retained |
| Current grounding negation | 196 assertions PASS |
| Attribution | 40 valid accepts, 18 deterministic rejects, 20 structural caveat rejects; 36 semantic limitations / 2 conservative over-rejections recorded |
| Generation | 1,596 assertions PASS; real isolated D1, 5/7 CR, replay, privacy |
| Provider | 84 assertions PASS; Node + workerd, strict schema/token/body/deadline |
| Retrieval / Admission | 519 / 263 assertions PASS |
| Refund safety / Headroom | 586 / 1,173 assertions PASS |
| Credit policy | 262 assertions PASS |
| UI / Workspace | 35 SSR/static / 117 injected-API assertions PASS; no visual browser QA |
| TypeScript | `pnpm exec tsc --noEmit` exit 0 |
| Lint | exit 0; one pre-existing unused `debit` warning in refund-safety test |
| Build | `pnpm build` exit 0 |
| Diff check | `git diff --check` exit 0 |
| Protected files | Product runtime/UI/migrations and all old evaluation manifests/corpus/cases/rubric byte-unchanged |

The historical integration executes original pinned auditors on synthetic histories;
it is not a rerun of all historical frozen suites and not a private-PC audit. No new
GitHub Actions/browser/live account verification was performed.

## Owner handoff and remaining gate

[E5J_HANDOFF.md](../../evaluation/assistant-mvp/E5J_HANDOFF.md) gives clean checkout,
fresh fetch/fast-forward, dependency check and key-free inspect. Copyable instructions
stop there. Actual original WSL history must match before a separate owner decision
on revision, one P44 attempt, $0.0336 reservation, 24-hour grant and retention.
No live authority is created by this commit, inspect or program PASS.

If the new structural contract still fails in the one later authorized call, stop
and review generation strategy/output contract/quality goals rather than continuing
an indefinite series of single-case live revisions. One successful case does not
approve AI release. Real model behavior/quality, actual WSL and browser visual QA
remain NOT TESTED in this Work. GitHub publication is not Production deployment.
