# Phase 9D-C — Grounded generation foundation

Date: 2026-10-16. Starting canonical, fetched before implementation: `016dcb05b2141b2e8f849e3b472e96b18b4a57fc` (`Support capacity-first Account refunds with versioned audits`). The commit containing this record is the implementation checkpoint; its final canonical SHA is reported after normal publication/refetch rather than embedded recursively in its own contents.

Scope is canonical implementation and local mocked-provider acceptance only. Production is not deployed or queried. Previously accepted hosted baseline remains 0016/v4 according to the owner; canonical 0017/0018 have no hosted acceptance. Existing public Site access is unchanged. AI defaults disabled, News launcher remains COMING SOON, no workspace UI, Revision or 9D-D work.

## Decision and architecture

Reuse A's primary-only archive reads, public projection, signed session receipts and whole-Story fingerprints, and B's Account identity, atomic admission/debit, quotas, leases, cost reservations, ledger-backed capacity-first refunds and recovery. No second wallet, identity, SQL spending path, schema, migration or backup version.

| Boundary | Files / responsibility |
| --- | --- |
| HTTP | `app/api/assistant/generate/route.ts`, `lib/assistant/generate-http.ts`: method/origin/content/body guards, safe errors, dependency wiring |
| Request | `generate-validation.ts`: exact public shape, canonical selection/preferences, server action resolution |
| Orchestration | `generation.ts`: preflight → existing admission → one provider call → validation → final primary reload → settlement |
| Configuration | `generation-config.ts`, `provider-profile.ts`: dedicated server-only settings and one reviewed model/cost allowlist |
| Prompt/budget | `prompt.ts`, `token-budget.ts`: fixed instruction, untrusted JSON evidence, actual local BPE counts and byte/token limits |
| Provider | `provider.ts`: fixed native-fetch Responses endpoint, one attempt, deadline/body/usage guards |
| Output | `output-schema.ts`, `output-validation.ts`: shared strict schema, citation/support/fact validation and D1-owned response metadata |
| Existing integration | `admission.ts`: pre-debit bounded-preparation hook and preference HMAC; `receipts.ts`: return archive window; `types.ts`/`http.ts`: safe codes |

Retrieval config remains independent from provider credentials. Its transitive Assistant imports are statically checked for provider access, in addition to the existing real-D1 no-outbound/read-only tests. The earlier A-era whole-directory ban on provider configuration was updated to this boundary now that C explicitly authorizes a separate provider module; global no-console/no-browser-storage/no-direct-run checks remain.

## Official provider review (2026-10-16)

Candidate: **`gpt-5.4-mini-2026-03-17`**, profile **`gpt-5.4-mini-2026-03-17-o200k-v1`**, standard processing with explicit `reasoning.effort=none`. Official model documentation lists Responses, structured outputs, 400,000 context / 128,000 output limits, the pinned snapshot and $0.75 input / $4.50 output per million tokens (cached input $0.075, deliberately not credited in reservations). It is a compatibility/cost candidate, not a Korean-quality acceptance result. No key, account model-access check or live API call was used.

The old GPT-4.1-mini page is now marked deprecated. GPT-6 Luna is cheaper ($0.10/$0.50 per million), but the inspected page exposes an unversioned model and the reviewed official `tiktoken` mapping does not establish its local tokenizer mapping. Do not choose an unknown tokenizer or silently substitute a cheaper model. GPT-5 mapping explicitly uses `o200k_base`; this gives the selected snapshot a reviewable pinned configuration and local runtime test. No listed GPT-5.4-mini retirement was found in the inspected deprecation page; availability, lifecycle and pricing must be rechecked before a separately authorized real-provider gate.

Primary sources inspected:

- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/models/gpt-4.1-mini
- https://developers.openai.com/api/docs/deprecations
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://github.com/openai/openai-node/blob/main/src/resources/responses/responses.ts
- https://developers.openai.com/api/docs/guides/token-counting
- https://github.com/openai/tiktoken/blob/main/tiktoken/model.py
- https://developers.openai.com/api/docs/guides/your-data
- https://github.com/dqbd/tiktoken/blob/main/js/README.md

New future server configuration names: `HOLOCRON_ASSISTANT_PROFILE` and `HOLOCRON_ASSISTANT_OPENAI_API_KEY`. Existing dedicated signing/abuse secrets and Account/Guest session configuration are reused only in their respective boundaries. No fallback to collection `OPENAI_MODEL` or `OPENAI_API_KEY`. Unknown/missing profile/key fails closed before debit. No values were provisioned, inspected, logged or committed.

## Responses and token contract

Fixed `https://api.openai.com/v1/responses`, native Worker fetch, `store:false`, `background:false`, `stream:false`, no tools, `tool_choice:none`, no prior-response/conversation linkage, strict JSON schema, disabled truncation. Manual redirects are rejected, never followed. No SDK retry, repair, remote token-count call or secondary generation. Q&A provider deadline 30 seconds / service deadline 35; script 45 / 50. Both response headers and body are bounded; provider JSON body limit 128 KiB. Safe failures include timeout, cancellation, 429/5xx, invalid JSON/shape/model, refusal, incomplete/output exhaustion and invalid usage.

The repository had no tokenizer. Added exactly pinned `js-tiktoken@1.0.21` (pure JavaScript; `lite` plus only `o200k_base` ranks, with its `base64-js` dependency), rather than a guessed characters-per-token rule or handwritten BPE. No Node/WASM/CDN requirement in production. A module-local immutable vocabulary is reused; user content is not cached. Twelve fixture vectors generated with official Python `tiktoken==0.12.0` `encode_ordinary` match in Node and actual workerd, including Korean, emoji, combining characters and special-token-looking untrusted strings. Python is a scratch reference tool only, not an application dependency.

Selected Story bounds: Q&A 6 / script 8; at most 3 Articles each (18/24). Complete evidence JSON ≤12,000 tokens, whole serialized provider request (including instructions, schema, field names and data) plus 1,024 framing allowance ≤16,000 tokens, serialized input ≤48 KiB. Q&A output ≤1,600 / script ≤4,800 tokens. No silent evidence truncation. Final server-built public response ≤64 KiB, including citations and refund metadata. Unknown tokenizer/profile pairs fail closed.

Local BPE counts are exact for the reviewed text encoding, **not an invoice-exact accounting of OpenAI's hidden schema/role framing**. The explicit allowance and maximum-profile reservation are conservative admission controls, not proof of external billed usage. Reported usage outside the profile is rejected and its cost remains conservatively unknown/reserved. No cheaper cached-input assumption is used. Reservations are integer micro-dollars: Q&A **19,200 ($0.0192)**; planner/draft **33,600 ($0.0336)**. Known valid usage reconciles through existing cost settlement; unknown attempts retain reservation. The existing $2/day cap is an application-admitted estimate, not a provider-invoice guarantee.

## Public contract and grounding

`POST /api/assistant/generate` accepts exactly `requestId`, `mode`, `receipt`, `selectedStoryIds`, `instructions`, `includeDraft`. Mode `qa` requires empty instructions and false draft; script permits bounded style instructions and optional draft. Unknown properties, client price/model/provider URL, invalid selections and malformed combinations fail. Input ≤16 KiB including chunked bodies, same-origin/fetch-site policy, private no-store / Vary: Cookie on all outcomes. No CORS enablement.

Server resolves Q&A=5 CR, planner=7 CR, full draft=15 CR as a single action. No Revision. Account ownership is resolved before provider preparation and revalidated by existing admission and atomic SQL; Guest gets LOGIN_REQUIRED, no admission/debit/provider. Instructions and draft choice are canonicalized into existing keyed request-input identity along with owner, session, action, selected fingerprints, query/filters and cost profile. Reused IDs with changed input conflict; concurrent/in-flight requests never get another debit/provider attempt.

Fixed Korean grounding instructions are separate from one bounded user JSON data message. Titles, administrator overrides, summaries, question and style text remain untrusted data. Only selected public Article projection fields enter the prompt, with no URLs, cookies, private Account data, IP, hashes or operational rows. Server validates citation URLs before admission, then maps opaque model evidence IDs back to current D1 metadata after final freshness verification. No model URL is accepted.

Shared schema requires every declared property and rejects unknown properties. Q&A exposes bounded answer facts with evidence IDs, certainty and exact title/summary support spans, plus limitations. Script exposes fact IDs, caveats, outline and optional draft. Every cited ID must belong to the selected bounded Articles and have a matching nonempty exact support span; fact references must resolve. Unsupported IDs, obvious invented numbers/dates, malformed spans, HTML/links, unsupported official promotion, certainty stripped from qualified source context and false date-only priority are rejected. A source label alone is not an announcement; multiple sources are not independent verification.

Factual draft blocks conservatively repeat referenced validated fact text exactly (joined by a single space), preventing unvalidated factual elaboration in the draft. Creative narration stays separately typed, without fact IDs or obvious date/announcement assertions. Script insufficient-evidence uses empty facts/outline/draft and caveats with empty evidence IDs to explain inability to answer; Q&A uses empty answer and nonempty limitations. Both settle as technical/non-delivery failure with actual compensation. Internal support spans are removed from the public result; D1-owned citations, used/related Story rows, omitted counts, archive window and limitations remain visible in the response contract.

These checks **do not prove semantic entailment**, detect every contradiction or eliminate cleverly phrased invention/prompt injection. Regex certainty guards are conservative and can reject legitimate phrasing. Outline/caveat/creative meaning still needs reviewed real-model evaluation. Future UI must render all content/citation labels as escaped text. No unvalidated model prose is returned, but structural validity must never be represented as factual certainty.

## Settlement, recovery and delivery limits

Preparation and input safety precede the existing one-batch admission/debit. Provider output is validated, then selected authoritative primary D1 state is reloaded and fingerprints rechecked (including omitted members). Hidden/edited/merged/split/relinked evidence is discarded. There is no remapping or stale fallback. Result is remapped against that final projection, size-checked, then settled with matching owner-token CAS.

Valid completion retains its charge. Failure uses B.4 durable capacity-first refunds: requested/applied/forfeited/full are returned honestly. A recorded partial or zero effect is terminal, never topped up later. No balance reservations, ordinary reward changes, ledger edits or competing refund logic. Lost provider replies/unknown usage retain conservative cost. Provider cancellation cannot prove billing stopped.

Success returns `credit:{charged,refund}`; failure after admission adds safe `credit:{settlement,refund}`. Settlement may be failed/refund_pending/completed/unknown. A lost admission commit reply has unknown settlement and zero provider attempts; an expired request can later recover. If D1 fails during compensation, no refund is invented. Existing internal `recoverExpiredGeneration` resumes from durable proof when D1 becomes available. No new scheduler, public recovery endpoint or automatic replay call is added. Interrupted requests require that internal recovery path; unresolved obligations remain retained until settled, not silently deleted. Terminal generation cleanup eligibility is 48 hours, retrieval ten minutes, lazy cleanup max100 per admission; no exact-time deletion guarantee.

D1 finalization and HTTP delivery are **not one transaction**. Completed means validated result ready, not proof that the browser received it. Lost settlement replies are reconciled using durable completed/refund proof. After committed valid completion, abort/response loss does not refund; same-ID retry yields RESULT_NOT_RETAINED and cannot call/charge again because no answer is stored. Deliberate new request is a new charge. No full external-world guarantee during permanent infrastructure outage. Provider fetch is abortable; D1 critical writes are awaited and checked before/after, not abandoned blindly. A stalled D1 write/compensation can exceed the nominal service deadline. Evidence may change after the final authoritative read; no cross-provider/database/browser atomic snapshot is claimed.

## Privacy

No prompts, questions, selected-Story history, evidence or output are persisted by the new layer in D1/browser storage/logs. Only existing content-free operational/cost records and authoritative Credit entries are written. No raw provider error/response logging. Test secrets/network identities are explicitly synthetic. `store:false` does **not** promise zero provider retention: official data documentation describes abuse monitoring retention and separate prompt-cache behavior; no ZDR eligibility is assumed. The future operator must review retention before any authorized real call.

## Validation evidence

**Final local acceptance: COMPLETE. All 49/49 `test:*` suites and lint / TypeScript / build / diff-check passed.** New suites exercise actual Miniflare D1 with the complete 0000–0018 chain and protected ledger triggers; provider transport uses test doubles only. Actual workerd tests intercept all outbound traffic.

- Generation: retrieve → cookie/receipt → select → Account Q&A/planner/draft; exact 5/7/15 debit and one call; Guest/insufficient/no-evidence/ambiguous/forged/expired/config/oversized-input failures before provider; duplicate/concurrent IDs; changed preferences; during-call title/summary/visibility/topic/relations changes; exact citations/supports, invalid official claims/uncertainty, malicious input as data; refusal/JSON/token/body/usage/429/5xx/timeouts; 64 KiB final result guard; cancellation, lost admission/completion replies, D1 refund outage and idempotent recovery; Account full/partial/zero refunds; exact BigInt balance/version/sequence audit and v6 export exclusions.
- Provider: 12 official token vectors in Node/workerd; budget ceilings and schema exactness; safe/unsafe official claims, conflicting qualified dates, missing uncertainty and date-only priority; native Worker one-call fetch, no redirect following, header timeout and slow-body timeout. Test-only shortened timers are not production timeout changes. Worker test bundle 2,351,907 bytes / 1,147,669 gzip bytes; this is the focused test bundle, not a hosted deployment measurement.
- First full pass found the old retrieval whole-directory prohibition of provider key configuration. It was not waived: generation config was separated, retrieval transitive imports and global privacy checks now express the intended boundary, then the final regression was rerun.

### Final executed gates

| Check | Result |
| --- | --- |
| Every package.json `test:*` script, invoked as `pnpm <script-name>` sequentially | **49/49 PASS** |
| `pnpm test:assistant-generation` | **1,422 assertions PASS**, real local D1 + injected provider |
| `pnpm test:assistant-provider` | **84 assertions PASS**, including actual workerd |
| `pnpm test:assistant-retrieval` | **510 assertions PASS** |
| Existing admission / refund-safety / headroom / Account-partial-refund | **263 / 586 / 1,173 / 233 assertions PASS** |
| `pnpm lint` | PASS, zero errors; one pre-existing unused `debit` warning in `test-assistant-refund-safety.mjs:27` |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS, generate route included |
| `git diff --check` | PASS |
| Protected migration/schema/backup/Credit/Identity/launcher comparison with starting canonical | Unchanged |

The 49 suites include all existing News/Works/Quiz/Google/backup/migration/Credit suites; no negative acceptance was waived. Headroom suite's 532 synthetic sequence/balance boundary cases remain explicitly SQL-level simulations, not MAX-length historical ledgers. New generation ledger audits use actual complete local histories. Backup remains v6/0018 with historical v1–v5 audits intact. No real provider call occurred. No remaining **local 9D-C** acceptance blocker was reproduced; real-provider/hosted/UI gates below remain uncompleted and separately authorized.

## Explicitly not tested / future authorization

No real provider call, billable usage, actual API account/model access, live Korean quality, full semantic grounding evaluation or 30 reviewed real-archive evaluation tasks. No Production deployment, SQL, migration0017/18, real backup, secrets, site access change, live Google/Guest/browser QA or scheduler-health claim. No public UI, mobile/accessibility acceptance or Phase9D-D. Hosted Worker CPU/memory/cold-start limits were not measured; the real workerd compatibility test is not hosted capacity acceptance. No automatic recovery guarantee during persistent D1 outage or proof of browser delivery.

Before any future activation: separately authorize real-provider evaluation against reviewed archive tasks (including severe hallucination/citation/injection gates), recheck model lifecycle/pricing/token behavior and retention, then separately authorize fresh backup + hosted0017/18 + immediate v6 backup/data-preservation acceptance. A separately requested 9D-D may implement the evidence-first UI; this task does not start it.
