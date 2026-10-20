# E.6A — 30-case MVP quality dataset and controlled Pilot preparation

Starting canonical, freshly fetched: `36797d08aab875b709b1a746ba1c48a2e11730a6`.
Final canonical is the commit containing this record; final SHA/tree are reported
after publication and re-fetch. No circular self-hash is embedded here.

**DATASET PREPARATION PASS / LIVE NOT AUTHORIZED.**

## Scope and preservation

Dataset/plan/tests only. No new live runner, authorization command, approval,
live revision, durable evaluation reservation, key read, Provider call, Production
request/deployment/DB write/migration, or AI activation. Disposable Miniflare
accounts, funding, admissions and mock costs exist only inside isolated tests.
Production v85 / 0019 / AI OFF is the owner's baseline, not newly measured.

Owner-reported E.3.2/B/D/F/H/J consumption remains **10 attempts / 278,400 reserved /
35,827 known usage estimate micro-USD**, unknown usage 0. E.5F P41 and E.5J P44
OWNER_PASS/reviewed/deleted, earlier P44 failures/refunds and E.5D OWNER_NOT_PASS
remain distinct. No WSL private approval/journal/D1/body/receipt was accessed or
audited. An actual PC audit is a prerequisite for a future paid batch.

Historical 46-case dataset, six MVP cases, both rubrics, public corpus and all old
manifests remain byte-identical; twelve SHA-256 bindings are checked in the new
test. Runtime and pipeline are unchanged:

- Runtime: `0559656c7679972b9996d1088a927c6acc4d763a4c5ee02e724345b870997f9b`
- Pipeline: `7f89bba635e7f44f3b4714c8cd73422d42e722d7bcf84c0f082dc2e070ccfdd1`
- Model/profile: `gpt-5.4-mini-2026-03-17` / `gpt-5.4-mini-2026-03-17-o200k-v1`
- New dataset SHA-256: `b5b18bdaae5e02aed01ff02357fdfbeb9edda6bf536e19a030fbd8846cc7254f`

## Deliverables and case decisions

- `evaluation/assistant-mvp/e6a-cases.json`: P61–P90, 18 QA / 12 Guide, 24 normal
  generation / 6 limited-response tasks. All require potential model generation
  and are NOT_REVIEWED. Six separate free controls C61–C66 are NOT semantic passes.
- `E6A_COVERAGE_MATRIX.md`: individually records the disposition of all original
  30 archive cases: 20 DIRECT_REUSE, 7 ADAPT_TO_GUIDE, 3 REPLACE. Eight original
  Full Draft cases become seven explicitly rewritten guides and one replacement;
  unsupported original request semantics remain a free C61 rejection boundary.
- `E6A_EVALUATION_PLAN.md`: frozen criteria, coverage limits, cost scenarios,
  first four IDs, sequential human decisions, retention/deletion, stop rules and
  separate requirements for a future batch runner. Existing review criteria are
  not relaxed and no existing runner is extended in E.6A.
- `scripts/test-assistant-e6a.mjs` and one package script: static bindings,
  current Retrieval/selection/Prompt/Schema + real isolated D1/HTTP/credit/replay
  mocks, content-free output summaries. No persistent state or private path input.

The source is the unchanged 2026-10-17T13:29:12.349371+00:00 public title/summary
snapshot (77 articles). The 30 tasks use **25 distinct Stories / 41 selected
Articles**. Five shared-Story pairs have different QA/Guide or normal/missing-detail
objectives; they are not represented as 30 independent Stories. Each selected
Article is inside the snapshot's 90-day window. Evaluations use the snapshot clock,
not current Production freshness. No new news or guessed Works relations were added.

Each case freezes exact currently selected Article IDs/order (maximum three per
Story), omitted count, attributed allowed claims, exact supports, mandatory caveats,
forbidden claims, speaker/certainty/date-number/citation rules and expected behavior.
P67/P71/P75/P79/P80/P82 require particular care with omitted or irrelevant members;
P79 cannot use the unselected official IMAX dates. Snapshot ambiguities such as
P67's project labels and P87's published/scheduled language remain attributed,
not repaired with model memory.

## Cost proposal and first batch

First proposed batch, in order: **P84 ← P42 (QA), P66 ← P43 (QA), P65 ← P45
(Guide), P81 ← P46 (Guide)**. Their MVP questions/instructions/selected Stories
are preserved and verified. Maximum **4 / 105,600 micro-USD**, historical total
**14 / 384,000**. No approval is created; each answer must be reviewed before
continuation, and critical/semantic/settlement/storage uncertainty stops the batch.

Full 30-new scenario: 18 QA / 12 Guide, 748,800 additional, cumulative 40 attempts /
1,027,200 reserved, **zero retry slots**. Conditional 28-new + two historical
results: 696,000 additional, cumulative 38 / 974,400, two slots left. The 24-new
scenario (16 QA / 8 Guide): 576,000 additional, cumulative 34 / 854,400, six slots
left; its six free controls do not replace six untested model-quality tasks.
Global 40 / 2,000,000 is unchanged. Reservations are not billing amounts.

Historical success is not automatically counted: P61/E.5F P41 has a later runtime
change, P74/E.5J P44 has comparable current runtime/input but private receipts were
not inspected. Both bodies were deleted. Do not restore/rescore them or double count.
Separate owner adoption requires input/evidence/revision/rubric/receipt comparison.

Review uses the original nine MVP dimensions, with QA 7/8 N/A. All applicable
dimensions 2 and critical=false are required for OWNER_PASS. Prior 46-case 85%
normal completion and MVP 100% gates are compared explicitly; aggregate readability
means cannot waive individual failures or critical findings. Limited-response
tasks need useful safe partial handling, not blanket refusal.

## Verification results

All commands below ran on the **current working runtime**, with zero live calls.

| Check | Result |
|---|---|
| `test:assistant-e6a` | PASS: 30 actual retrieval/preparation dry-runs, 30 mock generation paths (29 OK / P82 insufficient), 6 free controls, 5/7 CR, insufficient refund, replay/ledger audit, seven corrupt-dataset rejection mutations, historical byte hashes and budget arithmetic |
| `test:assistant-p44-grounding` | PASS: 57 scenarios, 18 full P44 mock paths, 7 completed / 11 refunded, P41 5 CR, public API/UI/copy contracts; two semantic gaps explicitly remain |
| `test:assistant-grounding-negation` | PASS: 196 cases |
| `test:assistant-attribution` | PASS: 20 structural rejections, 40 paraphrases, 18 deterministic rejections; 36 prompt-only semantic limitations and 2 known embedded-denial over-rejections are reported, not hidden |
| `test:assistant-generation` | PASS: 1,596 assertions |
| `test:assistant-provider` | PASS: 84 assertions |
| `test:assistant-retrieval` | PASS: 519 assertions |
| `test:assistant-admission` | PASS: 263 assertions |
| `test:assistant-refund-safety` | PASS: 586 assertions |
| `test:assistant-headroom` | PASS: 1,173 assertions |
| `test:credit-policy` | PASS: 262 assertions |
| `test:assistant-ui` / `test:assistant-workspace` | PASS: 35 / 117 assertions; SSR/injected handlers, not browser visual QA |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS: zero errors, existing unused `debit` warning in refund-safety test |
| `pnpm build` | PASS |
| `git diff --check` | PASS |

Initial test-development failures were in new assertions: raw query punctuation
versus the existing normalized HTTP query, a prompt phrase assertion, and a lint
variable name. They were corrected in the new test only; product contracts and
existing tests were not weakened. The date-only assumption required a substantive
evidence correction: the sole date-only snapshot article has no overlapping peer,
so `orderUncertain=false`. C66 now verifies date precision and explicitly observes
that a first-report assertion is not rejected in that single-article setting.
It does **not** claim DATE_ORDER rejection or semantic safety. Existing synthetic
overlapping-date regression remains separate.

Frozen historical execution suites and prior live campaigns were not rerun;
their files and current runtime hashes are unchanged. No API schema probe, real
model output review, current Production data check, WSL history audit or browser
visual test was performed. Mock excerpts are transport fixtures, not example
gold-quality answers and never count as semantic OWNER_PASS.

## Limits and next step

Source/exact span checks do not prove entailment. Speaker swaps, new facts in
CreativeNote, ambiguous quotation and incomplete summaries still require human
review. The archive snapshot lacks exhaustive genuine rumor/in-talks, multi-speaker
quotation, headline-only, English and adversarial coverage. Existing synthetic
security tests remain supplementary, never disguised as public archive tasks.
Thirty tasks and two historical successes do not authorize public AI release.

The owner's first key-free check after a clean fast-forward is
`pnpm test:assistant-e6a`; this runs only static/Mock tests and does not audit private
history. The next Work may prepare a bounded batch runner after owner review of
P84/P66/P65/P81 and the criteria. Live requires a new fixed revision, actual PC
history audit and separate explicit scope/budget/expiry/retention approval.

**Real Provider calls 0. Live approvals 0. Production changes 0.**
