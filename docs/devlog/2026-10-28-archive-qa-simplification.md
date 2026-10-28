# Archive Q&A simplification — 2026-10-28

## Scope and baseline

Fresh-fetched canonical main: `44a73795edddaef1b2bba840c465f4c81ececae3`, tree `71ab698f49b5702a4845c23c9d75dd6fdf54a8ee`. Read AGENTS.md and reused the existing search-term, retrieval and output-validation modules. No new search infrastructure, model, schema or evaluation campaign.

Production was not accessed or changed. Last user-confirmed state remains v97 / environment 66 / AI OFF / MAINTENANCE; this is not a new live verification. Real Provider calls and real Credit usage: zero. Historical INVALID_OUTPUT stage/reason/path remain UNKNOWN.

## Reproduced conditions and minimal changes

1. Conversational request words were included in core-term coverage. In an isolated archive with relevant budget reporting, `스타파이터 제작비가 얼마나 들었는지 궁금해` lost the relevant result. With a catalog-resolved work, `스타파이터 제작비에 대해 자세히 알려줄래` also lost it because the remaining request words outweighed the budget topic. Q&A now filters a small bounded vocabulary of request expressions through the existing normalization function. Both queries return the budget story; unrelated publishing, Comic Con and IMAX fixtures are not used to fill results.
2. Q&A no longer treats the franchise-only words `스타워즈`, `star`, `wars` as a sufficient core topic. Without a resolved work or specific subject it asks for clarification. Work filters, aliases, linked relations, date/category/source filters, administrator decisions and existing coverage/ranking stay intact. The existing coverage rule already permits partial matching; it was not replaced with all-keyword matching or weakened globally.
3. A synthetic Q&A answer using `1000` against evidence containing `1,000` failed with `grounding / UNSUPPORTED_NUMBER / $.answer`. Q&A now canonicalizes valid comma thousands grouping on both sides. The reverse spelling also succeeds. New amounts, dates, decimal values and malformed grouping still fail. This does not add unit conversion or claim sentence-level proof. Planner retains its original numeric contract.

The existing four-field Q&A output (`status`, `answer`, `evidenceIds`, `limitations`) and current prompt are already compact and support partial answers; no reproduced defect justified replacing either. Official-assertion, unsafe-prose, output-shape, length and unknown-evidence checks remain. No support-span system was introduced. The UI remains unchanged: natural answer followed by server-owned references.

## Local evidence

Before the implementation change, the new retrieval and formatted-number tests failed. Afterward:

- Retrieval: 640 assertions, real isolated Miniflare D1; natural Korean phrases, budget relevance, unrelated-story rejection, missing evidence, filters, work relations, snapshots and Receipt checks PASS.
- Provider/grounding: 94 assertions, Mock transport and workerd; partial Korean answer, equivalent number formatting, unsupported amounts/dates, false official assertion, invented URL and forged evidence rejection PASS. Planner formatting behavior unchanged.
- Account integration PASS: HTTP retrieval selects only the budget story; 20 CR becomes 19 after search and 14 after successful Q&A; one Mock invocation; reference URL comes from server evidence. Missing budget evidence keeps 20 CR and invokes no Provider. Existing chat 5 CR, archive Q&A 1+5 CR, Planner 1+7 CR, refund, replay, concurrency, lost-response, consent, rate-limit and budget tests PASS.
- Output diagnostic regression: 103 assertions PASS.
- Workspace/controller: 185 assertions PASS.
- Actual component server rendering: 35 assertions PASS, including safe citations. No new browser visual QA claimed; UI source did not change.
- Backup regression: 939 assertions PASS; no contract or migration changes.
- TypeScript, lint, build and diff-check PASS. Lint retains one pre-existing unused-variable warning in `scripts/test-assistant-refund-safety.mjs`; zero errors.

## Preserved boundaries and remaining verification

General chat, Planner behavior, chat UI, Provider model/profile, Account authentication, prices, Admission/refund/ledger, UUID/replay, Receipt ownership/expiry, budgets, SWNN/collection, Migration 0020 and Backup v10 are unchanged. Tests use synthetic data and Mock Provider only.

This is local correctness evidence, not real GPT or Production archive acceptance. Korean normalization is deliberately bounded and does not promise all linguistic variants. Actual archive availability, live answer quality, citations and live settlement require a separately authorized single Q&A acceptance after a separately authorized deployment. No Production deployment or AI activation is part of this change.
