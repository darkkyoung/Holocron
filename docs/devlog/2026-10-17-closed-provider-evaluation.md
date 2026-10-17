# Phase 9D-E.3.1 — Closed provider evaluation preparation

Starting canonical, fetched independently: `51ab0dcbca4078a1f473071a2199f1d3c12bace2`. The implementation commit containing this record is the final canonical checkpoint (SHA reported after publication/refetch, avoiding a self-referential commit). Scope: executable isolated evaluation and local mock acceptance only. **No Production deploy/mirror, schema/backup/Credit/Google/UI change, real provider call, key provisioning or AI activation.** Existing public v83 / 0018 / backup v6 / AI OFF is the previously accepted operational checkpoint; it was not redeployed or re-audited here. Earlier E.2 and UI limitations remain historical evidence.

## Implementation / reuse

- `scripts/assistant-eval/local-runtime.mjs`: isolated Miniflare D1, exact unchanged migration chain, existing identity and Credit services, in-memory v6 validator plus complete ledger sequence/balance audit. Optional private persistent local state permits recovery; missing state after a paid attempt fails closed.
- `evaluate.mjs`: existing `handleRetrieve`, signed receipt/selection reload, production prompt/budget, `handleGenerate`/`generateArchive`, atomic admission/debit, one injected provider transport, existing structured output/final primary reload/settlement, terminal replay verification. No alternate wallet, prompt, ranking or inference endpoint.
- `transport.mjs`: contract check and explicitly synthetic mock response; the production `callResponses` module still parses/validates the HTTP envelope. Same pipeline can use native fetch after separate live approval. Bounded stream observation extracts usage only; raw response is not logged/persisted.
- `budget.mjs`: outside-repository private hash-chained journal, exclusive coordinator lock, serialized append/fsync-before-dispatch reservations. Config/corpus/rubric/pipeline binding; conservative aggregate accounting survives resume, unknown usage and Credit refunds. Corrupt/truncated/missing required state stops. A crash lock is not automatically stolen.
- `run.mjs`: default dry-run, explicit mock, separately gated live smoke/rest, sequential execution, no automatic retries. Free/pre-call controls precede paid cases so they can be verified before exhausting the shared cap. Completed or ambiguous attempts are skipped on resume; only explicit repeat creates a new budgeted attempt.
- `corpus.mjs`, `import-public.mjs`: allowlisted public projection and exact manifest checking; offline extraction of a deliberately downloaded public page, no JavaScript execution or admin access.
- `review.mjs`, `rubric.json`: unfilled manual score template, required dimensions, normal usefulness vs negative safety, severe-error launch blockers. No model judge or semantic PASS from schema/mock success.
- `evaluation/assistant/*`, `package.json`, focused test and minimal status documentation. No production dependencies added.

## Public evidence and review provenance

Formal read-only **GET https://holocron.kr/** completed at **2026-10-17T13:27:59.682590Z** (download file timestamp); allowlisted snapshot extraction/serialization timestamp **2026-10-17T13:29:12.349371Z** is the corpus's `capturedAt` and frozen evaluation clock. Page payload declared `initial:false`. Public Newsroom Story projection: **45 Stories, 77 Articles**. Source response SHA-256: `f2a289acea3787fe0bbb080f87843968530859a92ce23578a88f708c6b803240`.

Only effective title, summary, ID/topic, source label, date, category and public URL enter evaluation D1. The raw HTML is not committed. A preliminary published-only `/api/news` read returned 89 Articles; it was rejected as a corpus source because it does not apply the same source/window projection. No Production backup, user/auth row, Credit ledger, Guest hash or secret was obtained for this corpus. No collection or publisher request was triggered.

Corpus `public-home-2026-10-17-v1`, SHA-256 `acd78cd254bc8bb716bbf4f3bafb87bd6e2d3e1dab4618f8b63faff4bc9cce48`. Case/rubric/current Assistant source hashes are in `manifest.json`; future approval must match all four. Public pages expose Story-level Work unions, not original Article–Work rows or the full season catalog. Public cases therefore test lexical retrieval of the captured evidence, not exact current Production Work-filter parity. Synthetic explicit Work/season/ambiguity fixtures exercise the existing matcher/relations without inventing historical Production links. Ordinary public caching and archive summary quality remain limitations; this is not a current primary-D1 snapshot or external-source truth audit.

**46 pre-annotated cases: 30 public archive + 16 synthetic adversarial/control cases**. Q&A 32, Planner 5, Full Draft 9. Every case records selected Story/allowed Article IDs, allowed claims, caveats/attribution, forbidden claims, expected generation/clarification/insufficiency/pre-call rejection. Six tasks are expected to stop before a provider; 40 are eligible for one attempt. Multi-source/omitted-member, people/game, thin evidence, conflicting dates, date-only ordering, official-source promotion, malicious title/summary/instructions, unsupported details and fact/creative separation are represented. Criteria were authored/reviewed by **Work**, before any live output; they are **not owner/human-reviewed**. Six additional public topics were added during harness preparation to ensure thirty actual archive tasks; no live-output-based answer-key tuning occurred.

## Official provider recheck — 2026-10-17

No model/profile/prompt/cost change: **`gpt-5.4-mini-2026-03-17`**, profile **`gpt-5.4-mini-2026-03-17-o200k-v1`**.

- Official model page lists this snapshot, Responses and structured outputs, reasoning `none` support, 400k context/128k output, uncached input **$0.75** and output **$4.50** per million tokens. Cache discount is not credited to reservations. No matching mini retirement notice was found in the reviewed deprecations page; this is not a future availability or account-access guarantee.
- Responses reference defines explicit `service_tier:default` as standard pricing/performance. The actual served tier may differ according to the reference; a first authorized smoke must inspect real behavior. No account/key access was tested.
- Strict schema guide supports the required closed objects/required fields and the used schema subset for this non-fine-tuned model. Strict JSON and support spans do not prove semantic entailment.
- Official `openai/tiktoken` current `model.py` maps the GPT-5 prefix to `o200k_base`. Existing pinned `js-tiktoken@1.0.21` and production count/whole-JSON + 1,024 framing allowance remain unchanged. Existing workerd reference-vector suite is included. Official token-counting guidance warns local counts can differ due to schema/framing/model details; there is no extra token-count API request.
- Native Worker-compatible fetch remains the existing transport; this evaluator's orchestration is Node + actual Miniflare D1, not a hosted runtime proof.
- `store:false` does not grant ZDR. Standard API abuse monitoring may retain data up to 30 days; no account-specific retention entitlement was verified. No background/conversation/tools/streaming/repair call.

Primary sources actually read:

- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/deprecations
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/token-counting
- https://developers.openai.com/api/docs/guides/your-data
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/reference/resources/responses/methods/create.md (direct read; web renderer could not display its Markdown content)
- https://raw.githubusercontent.com/openai/tiktoken/main/tiktoken/model.py

## Calls / cost / later approval

Exact production maxima reserve **$0.0192 Q&A / $0.0336 script**. Three initial smoke calls (P01/P05/P07) reserve **$0.0864**. All 40 expected attempts reserve **$0.9696**; any 40-call mixture is bounded by **$1.344** under this profile. Proposed owner authorization remains **at most 40 attempts and $2 aggregate estimated admitted cost**, including smoke and explicit re-evaluations. It is not yet granted. No assumed tax/invoice guarantee or provider-cost refund from Credit compensation.

The next call's maximum is checked before generation and recorded durably before external dispatch. Full reservations are retained even with known lower usage; actual estimated usage is separately recorded. This is stricter than refunding unused evaluation budget. Fixture identities do not reset this aggregate. Live smoke pauses before the rest; an explicit reviewed continuation is required. Technical/unexpected outcomes stop. A re-evaluation takes a slot from the same 40, so an operator cannot run the full set plus extra calls without a separate budget decision.

Dedicated key input: after separate approval, secure OpenAI Platform picker when available (the Codex picker entry point is not exposed in this session), or owner secret-manager process injection as `HOLOCRON_EVAL_OPENAI_API_KEY`. The runner never reads collection keys or env files itself; key presence without explicit live mode/valid external approval is inert. No key was inspected, created, provisioned, printed or used in this work.

Optional output-review proposal, **approval pending**: only validated public response envelopes, private outside-repository 0700/0600 files, delete after review and within 24 hours. No raw provider payload, user identity or permanent transcript; no Git/CI upload. Explicit purge command and startup expiry cleanup are implemented; there is no background exact-time deletion guarantee while the machine is stopped. Content-free cost journal must remain for resume/reconciliation. A result lost before approved capture cannot be silently regenerated; its consumed reservation remains. Rejected raw output is not retained, which limits diagnosis of semantic over-rejection.

## Verification

The complete 46-case mock run: **39 validated successful results, one provider-returned insufficient result with full local refund, one retrieval clarification, one retrieval insufficiency, Guest LOGIN_REQUIRED, insufficient balance and two stale/invalid-selection rejections**. Exactly **40 mock transport attempts**, **ZERO real provider calls**, **87 local append-only ledger entries** and full wallet/sequence/v6 audit. Max prepared input: **2,988 tokens**, evidence **760 tokens**, serialized input **7,380 bytes**. The mock's token usage is synthetic; these are not real model latency/quality measurements.

During harness development, a replay assertion initially expected terminal replay before freshness; the real service correctly rejected an edited receipt first with EVIDENCE_CHANGED. The harness expectation now follows that existing ordering and still checks zero additional calls/debits. The expanded corpus initially exhausted the 40-call cap before later free rejection controls; controls now run before paid tasks. Another failure test correctly hit existing shared-network quota when repeatedly using the same synthetic case identity; independent failure scenarios now use distinct synthetic identities, without changing any production limit. These were harness issues, not product fixes.

All 52 non-browser suites (the 51 existing suites plus the new evaluation suite) passed. Lint, TypeScript, build and diff-check passed; lint retains only the existing unused `debit` warning in refund-safety tests. Final focused assertion totals are recorded below. Actual live Korean semantic quality, API access, invoice/usage compatibility, hosted Worker/provider networking, owner manual criteria review and output-retention approval are **NOT TESTED / pending**. Existing Chromium evidence remains tied to its earlier UI revision; UI/physical device QA was not repeated or claimed here. Production remains untouched, AI defaults OFF / COMING SOON. E.3 production/real-model acceptance is not complete.

Final checks on the published implementation tree:

| Command / gate | Observed result |
| --- | --- |
| `pnpm assistant:eval` | 46 cases prepared; zero generation debit, zero transport attempts |
| `pnpm assistant:eval --mock` | 46 cases, 40 fake transport attempts, 87 local ledger entries; audit PASS |
| `pnpm assistant:eval:review --template` | 46 unscored rows; no invented semantic scores |
| Every `package.json` `test:*` script except `test:assistant-browser`, run sequentially with `pnpm run <name>` | **52/52 PASS**, including unchanged regressions |
| `pnpm test:assistant-evaluation` (included above) | **301 assertions PASS**, actual local D1; real outbound ZERO |
| Existing `test:assistant-generation` / `test:assistant-provider` | 1,422 / 84 assertions PASS; provider suite includes workerd tokenizer vectors |
| `pnpm lint` | PASS, zero errors; one pre-existing refund-safety warning |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS |
| `git diff --check` | PASS |

The focused suite also exercises the live transport branch with an injected fake fetch and synthetic key while blocking real outbound. Both successful and validated insufficient responses reach the optional review capture. This is still mock testing, not a live API call. Missing budget history with surviving generation admissions fails closed; missing local D1 after a recorded attempt also stops. No product, migration, backup, workflow, dependency or UI file changed.

**E.3.1: READY for separately authorized bounded live evaluation.** Pending prerequisites are dedicated secure key injection, exact model/profile and aggregate call/cost approval, and the optional private validated-output review/24-hour deletion approval. The three-call smoke must be reviewed before continuing. No E.3 real-model or Production acceptance is claimed.
