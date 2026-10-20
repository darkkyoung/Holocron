# E.5G — P44 grounding hardening

2026-10-20. Starting canonical, fresh fetched and clean:
`1512d95de440db812c4b051dcc9a7372f2333ccc`.
The published commit contains this record; final SHA/tree are reported after remote
re-fetch, rather than placing a self-referential commit hash in this file.

**Bounded implementation and synthetic regression PASS; overall verdict:
PARTIAL / REMAINING VALIDATOR LIMITATION. Real model quality NOT TESTED.**

## Evidence and investigation

The owner reports E.5B and E.5F P44 both rejected at grounding /
OFFICIAL_PROMOTION / `$.caveats[0].text`, with full 7 CR refunds. No rejected body
exists here. The same path does not establish the same wording or prove either
was a false positive. No output recovery or new rejected-output retention was added.
E.5F P41 OWNER_PASS is owner evidence from one case, not general QA acceptance.

The frozen P44 input was read unchanged: the Savi's Workshop video-guide query,
Story `fd8da8c4-fab2-4391-a39d-b7660ee582ce`, article
`078ec48d-ef8f-4bb0-9fa2-128e78354f3e`, captured public corpus
2026-10-17T13:29:12.349371+00:00. The stored title/summary describe visual-effect
upgrades at Disneyland/Walt Disney World; they do not supply price, booking
availability, schedules or an explicit official announcement. No external page,
private output or expanded factual summary substitutes for that fixture.

Existing checks:

- QA answer/facts: exact selected support substring, IDs/citations, source class,
  certainty, lexical uncertainty, numbers/date order. Official promotion requires
  explicit official-source support and explicit_announcement certainty.
- Guide caveats: valid references and safe prose, plus the official-claim detector;
  **no support-span or general entailment/number check**.
- Outline: fact references, safe prose and official-claim detector. Creative notes
  are not established factual evidence. Historical draft fact text must exactly
  concatenate facts; creative boundaries remain stricter. MVP Draft remains blocked.
- QA limitations and insufficient-evidence caveats have their existing separate
  prose/status checks. This change does not claim to close every free-prose gap.

`hasOfficialClaim` recognizes limited complete adjacent denials. It conservatively
rejects source-scoped uncertainty and embedded quotations because they contain an
announcement mention without its narrow denial ending. A supported indirect denial
also rejects. Conversely, lexical acceptance of `공식 발표는 없었다` does not prove
that an announcement is absent in reality. No lexical rule proves attribution or
semantic entailment.

## Before-edit reproduction and bounded change

Before modifying product code, the new current-source test ran on starting main
with a temporary `--baseline` mode (exit 0). The retained test table contains those
observed before/after decisions; the published command checks current behavior.
All outputs are synthetic, not either rejected P44 answer.

| Caveat editorial classification (24 cases) | Before | After |
| --- | ---: | ---: |
| CORRECT_ACCEPT | 2 | 6 |
| CORRECT_REJECT | 11 | 12 |
| FALSE_POSITIVE | 5 | 1 |
| FALSE_NEGATIVE | 2 | 1 |
| SEMANTICALLY_UNDETERMINED | 4 | 4 |

Separate supported indirect-denial probes remain false positives in fact, QA and
caveat positions (three probes). The existing attribution suite's two corresponding
fact/QA over-rejections are unchanged.

Changes:

1. `prompt.ts`: only GUIDE_INSTRUCTIONS gains a short paragraph. Caveats should
   explain actual uncertainty and selected-summary limits, identify missing
   price/booking/schedule information, and avoid asserting either the existence or
   absence of an official announcement not supplied by the source. Caveats are not
   emptied. Common grounding and the QA prompt are byte-identical.
2. `official-claim.ts`: `hasOfficialClaim` is unchanged. A small caveat-only wrapper
   recognizes complete anchored Korean source-scope sentences, e.g. `기사 요약만으로는
   별도의 공식 발표 여부를 판단할 수 없다` and `공식 확인 여부는 선택된 자료에서
   확인할 수 없다`. It permits no arbitrary subject, quote or additional clause inside
   the exception. Each other sentence is still checked; an earlier denial cannot
   exempt a later official claim. Positive `확정됐/되었/했다/했습니다` also rejects in
   caveats, closing the reproduced comma-separated denial + confirmed-booking gap.
3. `output-validation.ts`: only the successful guide caveat branch uses the wrapper.
   QA/facts/certainty/outline/draft keep the original detector and source gates.
4. `test-assistant-p44-grounding.mjs`, package command and this record. No new dependency,
   schema, evaluation CLI, manifest, retention mechanism or public diagnostic field.

This intentionally does **not** allow arbitrary indirect/nested quotations, English
scope paraphrases, double negatives or ambiguous embedded claims. Some safe wording
still over-rejects. The new confirmation check can also conservatively reject quoted
confirmation-denial wording; it is not a Korean parser. Whole-sentence templates do
not establish that a claimed information gap is itself factually accurate.

## Full current P44 mock path

`pnpm test:assistant-p44-grounding` uses the existing evaluateCase/localRuntime
without changing either: real isolated Miniflare D1, current prompt/profile/schema,
retrieval -> selected Story -> receipt -> admission/debit -> mock Responses boundary
-> output validation -> final freshness -> settlement -> replay -> ledger/backup audit.
Only mock scenario IDs differ for network-bucket isolation; the original query,
selected Story/article, instructions and corpus remain identical. No production
quota was weakened. Reusing one network bucket originally hit the normal rate limit;
tests now use distinct synthetic scenario IDs instead of deleting admissions.

- **51 scenario checks**, including **17 full P44 paths** and one full P41 QA path.
- Seven valid guide paths: three-section guide, grounded title fact/support, nonempty
  caveat, cited evidence, creative composition suggestions, draft:[]; OK/7 CR.
- Seven unsafe paths: invented official price/booking, mixed confirmation, invented
  numeric price/date in facts, missing evidence, mismatched support. INVALID_OUTPUT,
  failed settlement and requested/applied 7 CR, zero forfeited, full refund.
- Three deliberately bad full-path outputs **still complete lexical validation**:
  changed speaker, invented fact in creativeNote, numeric price in caveat. These are
  semantic limitations, NOT successful quality cases. Thus 10 total program-completed
  P44 paths include three known bad outputs; useful-completion quality is not inferred.
- All 17 cases use exactly one injected transport. Synthetic validated usage gives
  3,900 micro-USD each and reservation 33,600 even on refund. No live budget journal.
- Original evaluateCase checks replay: RESULT_NOT_RETAINED and no second debit/call.
- P41 current QA mock: OK/5 CR, unchanged common attribution instructions and no new
  guide paragraph. Actual Korean model quality was not tested.
- Full audit: 43 synthetic ledger rows, sequence/balance/version and backup validator
  PASS. Public error responses (including replay) omit diagnostic/reason/path and
  rejected marker; private observer still reports fixed safe diagnostics.
- Global fetch guard and Miniflare outbound guard: actual Provider outbound ZERO.

## Fresh regressions

| Current checkout | Result |
| --- | --- |
| P44 dedicated test | 51 scenarios, classification/limitations above |
| Grounding negation | 196 PASS |
| Attribution fidelity | 50 correct checks, 19 rejections; 45 semantic limitations and two embedded-denial over-rejections unchanged |
| Generation | 1,596 assertions PASS |
| Provider | 84 PASS, Node + real workerd mock boundary |
| Retrieval / admission | 516 / 263 PASS |
| Refund safety / headroom | 586 / 1,173 PASS |
| Credit policy | 262 PASS, daily/monthly budget and atomic policy/ledger |
| Assistant UI / workspace | 33 / 117 PASS, SSR/static/injected API, not browser visual QA |
| TypeScript / lint / build / diff-check | PASS; lint existing unused debit warning only |
| Historical output diagnostics | 315 PASS at frozen 2ec1a2b, NOT current-source verification |

Current generation covers 5/7 CR, Account-only admission, full/partial refund rules,
idempotency, failure/recovery/cancellation, token/body limits, freshness, kill switch,
Draft pre-admission block and private HTTP contract. No UI change or new browser QA.
Unrelated whole-repository suites and live model/hosted acceptance were not run.

## Preservation and next gate

Owner-reported totals: E.3.2 3/86,400/13,083; E.5B 2/52,800/6,315;
E.5D 1/19,200/2,091; E.5F 2/52,800/6,450 (attempts/reserved/estimated usage).
Aggregate **8 / 211,200 / 27,939 micro-USD**. Work did not access the WSL originals.
No approvals, journals, D1, reviews, deleted bodies or historical manifests were
changed. E.5F OWNER_PASS and rejected/refunded P44 remain historical outcomes.
No new live approval, spending authority, Provider call or Production access/change.

Current runtime:
`4acff96e580e6a320608a2053a35528e50c4406e5bcfdde5a6ac13b4cc062781`.
Current pipeline:
`9c842bfb6deb434fdd0121cdafbc76f1cf3f60a42fec895de6c32337d2a9cc3e`.
The unchanged E.5F loader explicitly returns E5F_INTEGRITY_FAILED, checked without
private state. Corpus/cases/rubric/tooling/handoff hashes remain unchanged. No hash
replacement or old remaining authority reuse.

After separate revision review and owner approval, a single P44-focused evaluation
(maximum reservation 33,600 micro-USD under the existing profile) is a reasonable
next diagnostic, not a public-release gate. Scope, expiry and <=24h validated-output
retention must be explicitly approved, historical usage re-audited and carried
forward. Review selected-summary limitations versus real-world absence, attribution,
guide usefulness and creative/fact separation. No retry if rejected; rejected raw
output remains unretained. QA code/common prompt were deliberately preserved, so
no additional QA paid call is automatically required by this patch. Broader semantic
coverage remains necessary before AI release. Production v85/0019/OFF is the supplied
baseline, not a new operational measurement.
