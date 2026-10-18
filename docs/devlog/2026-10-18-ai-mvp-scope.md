# AI MVP scope correction — Q&A and video structure guide

Starting canonical: `2ec1a2b05862f7ccb4a9b7426c59f14268411e02`, independently fetched with a clean tree. The final publication is the commit containing this record. Canonical only: no Production access/deployment, secret operation, actual Provider call or activation.

## Product decision and reuse

The owner's current launch scope is **아카이브 Q&A — 5 CR** and **영상 구성 가이드 — 7 CR**, using the existing Planner. Full Draft is excluded; this is not a response to a proven cause of historical P07 rejection. No attempt was made to fix/retry P07 or the separately recorded First Jedi issue.

The existing request → deterministic retrieval → selected Story/receipt review → Account admission/debit → bounded provider → validation/freshness → settlement pipeline remains. The guide uses facts/caveats/outline, normally 3–5 short sections when supported by the evidence. It suggests ordering, focal points, uncertainty and closing-question direction; the user writes their own narration. No duration/completeness promise, new facts, quotes or lengthy script. `draft:[]` remains schema-compatible and the existing validator rejects unsolicited draft content for a non-draft request.

Changes:

- `lib/assistant/generate-validation.ts`: public request validation requires `includeDraft:false`; `actionFor`, used at the start of `generateArchive`, independently refuses draft/unknown modes before Account lookup/admission. Existing `INVALID_REQUEST`/400 envelope is reused while the disabled feature still fails with its existing unavailable response. No new endpoint or flag.
- `lib/assistant/prompt.ts`: append fixed guide-only instructions. Q&A's instruction string is byte-for-byte unchanged. Schema, support spans, certainty/date/number checks, injection defenses, token/body/deadline bounds and pinned profile are unchanged. No schema migration.
- `components/assistant/assistant-workspace.tsx`, `contracts.ts`: remove draft state/control/15 CR choice; both modes send false. Keep search/filter/selection state, stale-result labeling, receipt handling, explicit UUID per action, Account gate, Credit refresh and cancellation/refund disclosures.
- `components/assistant/assistant-result.tsx`: guide headings, grounded facts under each section, attributed section copy; remove draft rendering/copy. Escaping, safe source links, certainty labels, caveats and old-result copy suppression remain.
- `app/assistant/page.tsx`: description uses the guide name. No CSS redesign, navigation or other page changes.
- Current generation/UI/workspace and existing browser scenarios updated to the approved scope. Browser readiness uses the renamed mode button; three added result/copy/overflow scenarios cover 375, 390 and 1440 px. Existing seven-width and disabled-state checks remain.

Historical `draft` action/cost types and lower-level ledger/refund/audit contracts remain for historical data/settlement. There is no public alternate admission endpoint; current generation rejects draft before those lower-level operations. No data deletion or old transaction reinterpretation.

## Evaluation history and hash boundary

The user-reported original smoke remains P01/P05 program-valid, P07 `INVALID_OUTPUT` with 15 CR full refund, **3 real attempts / 86,400 reserved micro-USD / 13,083 usage-estimated micro-USD**, semantic review incomplete. This task did not inspect the user's PC campaign and did not reset, extend or rewrite any approval, journal, local D1 or budget.

Previous frozen candidate pipeline: `62bf4041d3e3952f609a4cf300964a3f8752b0c2860128f3ba18523e4c48dfa4`.

Current MVP pipeline: `9dee4e8e45f83bd0bf6e8b0176c4a3721cf70444d380d083c933e0e6641a92b1`.

The frozen manifest, public corpus, cases, rubric, diagnostic-transition manifest and `scripts/assistant-eval/*` are unchanged. Their integrity check intentionally rejects the current product revision (`CORPUS_INTEGRITY_FAILED`) before an evaluation can begin. Do not manually update hashes or use the old live P07/rest commands. New Q&A/guide evaluation criteria and same-history budget/authorization treatment require a separate decision.

Four suites inherently assert historical Draft and the frozen campaign contract. `test-frozen-assistant-evaluation.mjs` runs those preserved assertions against exact Git revision `2ec1a2…` in a disposable checkout with installed dependencies and synthetic temporary local D1. It takes only four allowlisted test names; there is no live/evaluation command option or PC state path. It does not fetch or alter the main checkout/campaign. Tests are labeled **HISTORICAL MOCK REGRESSION**, not current MVP acceptance. The browser workflow fetches full history so this pin is available in CI. Current generation/provider/admission/Credit/UI suites still run against current code; generation explicitly verifies old evaluation remains fail-closed. No assertion was removed to make historical Draft seem supported today. No mtime/retention assertion change was necessary in this environment.

## Validation and limits

- All registered non-browser `test:*`: **55/55 PASS** (51 current-product suites + 4 explicitly historical evaluation suites).
- `pnpm test:assistant-generation`: **1,431 assertions PASS** on the final focused rerun. Current real Miniflare D1 generation verifies Q&A 5 CR, guide 7 CR, one injected call, replay, stale evidence, invalid output, deadline/cancellation, full/partial/zero compensation and ledger audit. Direct Draft HTTP requests touch no database binding; direct generation-service requests create no admission/debit/provider attempt. Both Q&A and guide Guests return login-required. Frozen evaluation mismatch also rejects before evaluation execution.
- Actual workspace handler tests: **109 assertions PASS**; React SSR/contract tests: **33 assertions PASS**. These are not browser visual acceptance.
- Historical evaluation / output diagnostics / revision / clock: **301 / 315 / 167 / 68 assertions PASS**, against the named historical implementation only. No live P07 re-evaluation occurred.
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`: PASS; lint retains only the pre-existing refund-safety unused-variable warning.
- `actionlint 1.7.7 .github/workflows/assistant-browser-qa.yml`: PASS. Workflow remains manual-only, contents-read, isolated local D1 and synthetic API responses; no deploy/secrets/collection workflow changes.
- `pnpm exec playwright test --config browser-qa/playwright.config.mjs --list`: **31 scenarios discovered**, not executed. Local Chromium launch reports its executable missing. Available GitHub tools do not expose workflow dispatch. No new browser infrastructure was created, and no actual new Actions run is claimed.

Current 375/390px and desktop rendered guide, physical-device, virtual-keyboard and screen-reader acceptance: **NOT TESTED**. Existing CSS was preserved, and real-browser scenarios are prepared, but neither SSR nor old Actions success is visual evidence for this revision. To run the prepared check: GitHub → Actions → **Assistant browser QA (isolated)** → Run workflow → branch **main**. Review the tested SHA and artifacts; this does not deploy Production.

Current real-model Korean guide usefulness/conciseness and semantic accuracy: **NOT TESTED**. A passing mock verifies the execution contract and fixed instructions, not that a model will always produce useful concise sections. Next step is a separately reviewed Q&A/guide evaluation scope with explicit authorization/budget reconciliation, preserving the already consumed campaign history. No AI launch or E.3 quality PASS is declared.

Protected comparisons: no changes to D1 schema/migrations 0016–0018, backup v6, Credit/Google identity policy, receipt signing, retrieval ranking, output validator/schema, provider/model profile or dependency lockfile. Production remains untouched and AI defaults OFF / COMING SOON. Actual Provider calls: **ZERO**.
