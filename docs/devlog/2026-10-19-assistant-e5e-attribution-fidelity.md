# AI E.5E — attribution fidelity

Date: 2026-10-19 UTC. Implementation and synthetic regression complete; **semantic reliability remains limited and live quality NOT TESTED**.

Starting canonical (fresh fetch, clean): `23633635fba075d148f72662a6909a1b81b63b28`. Final published commit/tree are reported after re-fetch; this commit contains the implementation and record.

## Evidence and decision

The owner reported E.5D P41 program OK/5 CR and read the saved Korean answer, then identified a speaker-attribution concern. Work did not inspect/copy the private answer. Tests use invented A/B/M/N examples, not the actual output. The reported six attempts / 158,400 micro-USD reserved and new P41 usage estimate 2,091 are owner evidence, not a fresh PC audit.

The current validator checks schema, selected evidence IDs, exact support substrings, source/certainty, lexical uncertainty, numbers/dates, URLs/HTML, lengths and outline references. It does **not** establish that the answer's speaker/subject/proposition matches the cited span. An exact real support span can accompany an incorrect paraphrase. The synthetic A-about-B example passes those checks before and after this change; the validator is byte-for-byte unchanged.

No reliable general speaker detector was established from these tests. Name order, one reporting verb, multiple names or string similarity would confuse indirect/nested quotations and normal paraphrases. Rather than introduce those heuristics, use the expressly permitted prompt-and-tests scope. This reduces an instructional gap; it does not demonstrate reduced model error rates.

## Changes

- `lib/assistant/prompt.ts`: two common instruction paragraphs preserve speaker, subject, proposition and outlet; distinguish direct/indirect statements and certainty; prohibit invented speakers or missing motivation/schedule/status/number/quotation details. A short correct/incorrect example allows natural paraphrase. Applies to QA and guide facts/caveats/outline; creativeNote is a composition suggestion, not evidence for new production facts.
- `scripts/test-assistant-attribution.mjs` and package command: direct current-runtime validation and wire preparation, with an outbound fetch guard. Ten bilingual synthetic categories cover speaker/subject, nested quotes, outlet attribution, possibilities, reported/official claims, differing reports, unknown/multiple speakers, negation and natural paraphrase.
- No validator, schema, model/profile, retrieval, admission, Credit, limits, output retention, UI or Production change. Full Draft stays blocked before admission. Existing strict official-source/span/certainty and uncertainty checks remain intact.

Common instructions: 525 → 783 o200k tokens, +258. Example complete wire plus existing framing reserve: QA 2,285 tokens / 5,170 bytes; guide 2,794 / 7,128. Existing 16,000-token/48-KiB limits and reservation ceilings remain unchanged. Real invoice usage is not inferred from these local counts.

## Fresh validation

| Test | Result |
| --- | --- |
| Current attribution | 50 correct prose/field checks accepted; 19 deterministic unsafe cases rejected; **45 semantically incorrect field cases still pass lexical checks**, explicitly recorded as prompt-only limitations; 2 known embedded-denial over-rejections |
| Current grounding negation | 196 PASS |
| Current generation | 1,596 assertions PASS, real local D1/mock transport, 5/7 CR debit, refund, replay, freshness, privacy, Draft pre-admission refusal |
| Current provider | 84 PASS, Node/workerd tokenizer and one-transport/body/token/deadline boundaries |
| Current retrieval | 516 PASS |
| Current admission | 263 PASS |
| Current refund safety | 586 PASS |
| Current headroom | 1,173 PASS |
| Current Credit policy | 262 PASS, daily/monthly reservations and ledger contracts |
| Historical output diagnostics | 315 PASS at `2ec1a2b05862f7ccb4a9b7426c59f14268411e02`; NOT current-runtime acceptance |
| TypeScript / build / diff-check | PASS |
| Lint | exit 0, existing unused `debit` warning in test-assistant-refund-safety.mjs |

The bad-attribution cases are limitation assertions, **not semantic PASS scores**. Deterministic rejection covers ungrounded official promotion, evidence/span, invented numbers, unsafe prose/citations and lost uncertainty. For example, embedded `공식 확인되지 않았다고 설명했다` remains conservatively rejected while the complete denial `공식 확인되지 않았다` passes; no exception was added to mask this pre-existing boundary. Current negation tests retain official/mixed-claim safety. No real Provider outbound occurred. No private PC files, keys, live approvals, Production or user balances were accessed. No UI/browser/full unrelated repository suites rerun.

## Frozen evaluation protection

Corpus, cases, rubric, all E.4/E.5B/E.5D manifests/tooling remain unchanged. Current runtime hash:
`a138b0b8abcea4eccfef009ca2248f581852252fedfd9d5668feb881fbc3f8f8`.
Current pipeline hash:
`54b3348e1b1c9ec6a637a71b8fc0bc25a2b6126b753d457c538a08bbac611b0a`.

The E.5D revision loader explicitly rejects with `E5D_INTEGRITY_FAILED`, checked without reading private state. No manifest rehash, approval extension, new approval, reservation or journal/D1/review-body change. Existing remaining P44 permission cannot authorize this changed code. Historical tests validate only their pinned code.

## Remaining gate

Speaker entailment, indirect quotation fidelity, cross-outlet disagreement and guide usefulness require a new revision and separately authorized P41/P44 evaluation with owner review of actual Korean answers and cited evidence. Carry forward all reported consumption, re-audit private originals under the approved process, and never reuse the old P44 remainder or retry automatically. This work creates no live revision/authorization. Program success is not semantic success; AI public release remains unapproved. Production v85 / 0019 / OFF is the supplied baseline and was not inspected or changed.
