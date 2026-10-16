# Phase 9C — Grounded HOLOCRON AI Assistant

Status: **Phase 9D-A retrieval/evidence foundation implemented locally; remaining generation/admission/UI phases are NOT IMPLEMENTED.**

2026-10-16 implementation checkpoint: [9D-A devlog](devlog/2026-10-16-assistant-retrieval-foundation.md). The historical design below remains the source for future phases, subject to section 0 and this note. Current schema/backup are **0016 / v4**; old proposed 0016/admission/v4 text is historical, not permission to edit an applied migration. 9D-A adds no schema or backup change. Its seven-day assistant cookie binds receipts only, with no wallet/account authority or D1 identity row. Future paid generation must use the existing Account-first/Guest-second Credit owner. No provider calls, operational admissions or UI activation occur in A. The owner reports the Site is now public; this task changes no hosting access and performs no deployment. COMING SOON remains unchanged.

Design baseline: canonical `456f4d52baab4ee349cbbd0e435534b10fcce3b9`, inspected on 2026-10-13. Public Beta has ended; the existing Site remains private/owner-only. The current `COMING SOON` launcher stays unchanged. This document authorizes no deployment, public exposure, credential provisioning, D1 mutation, migration, or provider call.

This is the authoritative implementation design for Phase 9D. [PRODUCT_SPEC.md](PRODUCT_SPEC.md) records the product summary; the implementation sequence is included here rather than in a second plan document.

## 0. 2026-10-14 Account/Credit integration note

[ACCOUNT_CREDIT_DESIGN.md](ACCOUNT_CREDIT_DESIGN.md) now defines the economy/admission layer required before Phase 9D. This note **supersedes anonymous-only admission language below where the two conflict**.

- Phase 9C.2 implements Guest/account identity and the Credit ledger first.
- AI prices are Q&A 5 CR, planner/outline 7 CR, full draft 15 CR, revision 3 CR.
- Technical failure before valid delivery is refunded; deliberate regeneration after success is a new charge.
- Network HMAC limits, concurrency controls and hard global/provider spend limits remain mandatory defense-in-depth.
- The old proposed assistant_admissions design must be re-evaluated in 9D. It must not become a second competing user-balance system; retain only temporary operational admission/cost/lease responsibilities still needed after the Credit ledger exists.
- Account creation belongs to Phase 9C.2, not inside the assistant implementation patch.


## 1. Purpose and decisions

The assistant helps readers understand HOLOCRON's archived Korean Star Wars news and helps creators plan original scripts from visibly selected Stories. It is not a general Star Wars knowledge service. Model memory is never an evidence source.

| Concern | Selected MVP design |
| --- | --- |
| Grounding | Current public 90-day D1 archive: effective titles, summaries, dates, source identities, URLs, grouping and Work links |
| Retrieval | Deterministic Work relation and title/summary retrieval; no embeddings, vector database or AI reranking |
| Retrieval unit | Story, with expandable source Articles; retain current manual grouping |
| Candidates / evidence | 12 candidate Stories; Q&A up to 6; script 1–8 explicitly selected; up to 3 Articles per included Story |
| Generation | One bounded server-side Responses API call per deliberate generate action; no per-Article calls or automatic repair/retry calls |
| Q&A | Cited factual answer blocks, evidence rows, relevant Stories and limitations |
| Script | Used Stories, cited facts, caveats, outline and optional original draft; creative narration distinguished from facts |
| Streaming | No streaming in MVP; validate complete structured output before display |
| Persistence | No chat transcript, generated answer, evidence corpus or selection history in D1 or browser storage |
| Public controls | Dedicated signed anonymous cookie, HMAC network identity, atomic temporary D1 admission ledger, weighted quotas and global spend ceiling |
| Presentation | Dedicated `/assistant` page; evidence-first forms and staged script selection; stacked mobile layout |
| Analytics | Content-free operational counts, latency and usage/cost; no new Beta Analytics tracking |
| Schema | No content schema change; one temporary admission ledger proposed for 9D only, with deliberate backup contract evolution |

Non-goals for Phase 9D itself: full article ingestion, runtime publisher fetching, browser/proxy scraping, web search tools, implementing the account system inside the assistant patch, durable conversations, uploaded documents, autonomous publishing, collection changes, new sources, a second topic matcher, or a new staging Site. No TMDB or other live research is required to answer a question.

## 2. What the repository actually provides

| Current owner | Observed behavior and design consequence |
| --- | --- |
| `db/schema.ts`, `lib/news.ts` | Articles store title/title override, Korean summary, URL, source, publication date, category, status/override and topic/override. There is no full body, claim-confidence field or Article revision counter. |
| `lib/news/presentation.ts` | `displayArticleTitle()` applies the title override. Use this effective title for evidence and assistant search; do not revive the superseded title in an answer. |
| `lib/news/stories.ts` | `buildStories()` projects published Articles within 90 days, grouped by persisted `topic`; earliest representative and date-only ordering uncertainty are already defined. Reuse it. |
| `lib/admin/repository.ts` | Manual grouping/status changes persist the effective field and its override. Read current effective fields; do not reclassify or independently reinterpret overrides. |
| `lib/news-work/repository.ts`, `projection.ts` | Linked Article–Work relations produce the union of Work IDs across a Story's public members. Manual exclusions remain authoritative. `RelatedStory` previews are not full evidence bundles. |
| `lib/news-work/matcher.ts` | Existing normalized title/season matching can identify explicit Works. Ambiguous seasons intentionally remain unresolved. Reuse its pure matching behavior, not relation-writing services. |
| `lib/news/explorer.ts` | Existing public search is a simple substring filter, not a natural-language or semantic search engine. Assistant ranking needs its own small, pure retrieval function. |
| `lib/collection/source-settings.ts` and repository | Disabled known sources disappear from public projection; unknown legacy source labels currently remain visible. Preserve this visibility rule and label unknown identities unclassified. |
| `lib/news/archive.ts`, `lib/public-cache.ts` | Public snapshots use 60-second caches. `loadArchive()` can return seed fallback on empty/unavailable D1. It must not be the assistant's evidence loader. |
| `lib/works/*` | Work metadata and the Featured Work hero are presentation features. Use read-only Work choices for disambiguation, not seed-capable archive/management loaders. Work synopsis is not news confirmation. |
| `lib/collection/openai.ts` | Collection currently uses Chat Completions for Korean title/summary processing; summaries are short independent fact summaries. A headline-only processing flag is not preserved as an Article evidence-quality field. Do not assume all summaries contain full reporting detail. |
| `lib/admin/session.ts`, `lib/admin/login-rate-limit-*` | Admin auth is separate. Existing network HMAC and atomic SQL security patterns are useful precedents, not public assistant credentials or shared quotas. |
| `lib/beta/anonymous-session.ts`, `lib/feedback/*` | Feedback uses an unsigned anonymous UUID cookie and temporary cooldown state. That cookie alone is insufficient protection for a paid public endpoint. Do not join assistant identity to feedback or quiz history. |
| `lib/collection/run-repository.ts` | Collection uses owner-checked leases. Reuse the ownership principle, never the collection lock itself. |
| `components/news/ai-assistant-placeholder.tsx` | Current launcher opens a dismissible `COMING SOON` dialog. No assistant input, API or execution exists. |
| `docs/BACKUP_RESTORE.md` | v3 uses marker `0015_featured_work_metadata.sql`, nine allowlisted datasets and five settings keys. Operational/security state and environment secrets are excluded. |

D1 remains the runtime authority. The assistant reads archive data; it never calls collection, seeding, relation association/backfill, moderation, or administrator write functions.

## 3. User flows

### Archive Q&A

1. Open **AI 도우미 → 아카이브에 질문하기**. Explain: `최근 90일의 공개된 HOLOCRON 제목과 요약을 근거로 답합니다. 원문 전체나 인터넷 전체를 검색하지 않습니다.`
2. Enter a question and optionally choose a Work/category/date/source filter. Search is deterministic and makes no provider call.
3. Show up to 12 Story results before generation, including title, representative date, source count and expandable source rows. Show the top six proposed evidence Stories; allow reducing or changing that set within the six-Story limit.
4. Click **선택한 소식으로 답변**. Reload selected evidence from D1, then make one generation call if it is sufficient and unchanged.
5. Display cited answer blocks, limitations and source rows. Keep the retrieved list visible; never present related but unused Stories as citations.

No matching evidence means no provider call. Display `현재 HOLOCRON 아카이브에서는 이 질문을 뒷받침할 충분한 소식을 찾지 못했습니다.` Offer query editing and original links on any separately labelled nearby results. Never silently fill gaps with general knowledge. If evidence exists but cannot support the requested answer, the generated contract can also return `insufficient_evidence` without factual answer blocks.

`지금까지` means only the displayed archive window. A request for all historical official announcements must disclose that this archive cannot establish completeness. No claim that an announcement does not exist anywhere follows from an empty local result.

### Script planner

1. **영상 대본 구성하기** accepts a topic and optional style/length instructions.
2. Search and display Story candidates, initially **none selected**. Each selection is a Story, not one checkbox per outlet.
3. The user checks 1–8 Stories, expands their sources as needed, and opens **선택한 소식 확인**. Show exact evidence Articles, omitted-source counts, archive window and an optional **대본 초안 포함** checkbox.
4. Click **구성안 만들기**. Only server-reloaded selected Stories can become evidence. If selection changed, require a new review instead of silently substituting Stories.
5. Display **사용한 소식 → 근거가 있는 핵심 사실 → 보도 간 차이 / 주의할 점 → 영상 구성안 → 대본 초안**. A draft is optional within the same call, not an automatic second request.

Changing selection or draft options after generation marks the old result as belonging to the previous selection. A new explicit generation consumes quota. A request for a ten-minute script cannot override output bounds; explain that MVP provides a short draft, not promise a duration that the available facts cannot support.

## 4. Public projection, retrieval and bounded reads

### Read-only authoritative snapshot

In 9D, factor a strict read-only snapshot facility from the existing News reads. Keep the current public page fallback unchanged. The assistant facility must return an explicit error on D1 failure, never seed data, and return an empty archive as empty.

Use one consistent read batch containing source settings, bounded public Article rows, read-only Work choices and linked relations. Use current published state, `filterArticlesByEnabledSources()`, `buildStories()` and `projectNewsWorks()` as the shared projection. Do not expose review, excluded or disabled-source members through supporting-source lists. Relations with `state=excluded` are not evidence links. Keep current date parsing/representative semantics; this phase does not change the archive policy.

Initial safety guards: at most 2,000 eligible Article rows, 500 Works, 10,000 relevant relation rows and 4 MiB combined SQL row payload. Use count/byte guards and limit-plus-one checks; overflow returns `ARCHIVE_CAPACITY`, never successful truncation that splits a Story. No unbounded `list()` call or per-Story SQL loop. The archive is currently small, but these are explicit ceilings, not measured Production capacity claims.

Assistant retrieval and generation use uncached authoritative reads. They do not add another corpus cache or change the existing 60-second News/Works caches. Phase 9D must verify primary-consistent D1 reads if read replication is enabled; a potentially stale replica is not adequate for the final visibility check.

### Deterministic query policy

1. Normalize query with the existing NFKC/case/space conventions. Validate explicit filters against current server-owned Work IDs, categories and source IDs. Dates may narrow, never widen, the current 90-day window.
2. An explicit Work ID takes precedence. Otherwise, run the existing Work matcher against the query as text. One unambiguous match proposes that Work visibly. Multiple matches or ambiguous series/seasons return `clarification` with Work choices; do not guess a season.
3. For a resolved Work, require a linked Work relation on a public Story member. A manual exclusion is not circumvented by text matching. If no linked Stories exist, report that and offer a separate user-selected general search.
4. Without a Work match, search effective titles and summaries. People such as Jon Watts and games such as Galactic Racer need this path; do not invent Works entries for them.
5. For text relevance, use a versioned small list of Korean request filler terms (`최근`, `소식`, `정리해줘`, `알려줘`, `관련`, `뉴스`, `뭐`, `있었어`) after normalization, keeping at most 12 distinct non-filler tokens of two or more characters. Keep names/numbers; do not infer synonyms or certainty from the query. Show editable search terms. If no meaningful token or Work remains, ask for a more specific query.
6. Work-only requests rank their linked Stories by representative recency. For a Work plus residual search terms, and for general topic requests, require at least one term/phrase match. Score each Article: 10 for the complete normalized search phrase in effective title, 2 per distinct term in title, 1 per distinct term in summary. A Story score is the maximum member score, not a sum that rewards outlet duplication. Tie-break by matched-term coverage, representative date descending, then `topic` lexical order. Category/date filters apply to the representative; source filters narrow visible member Articles before projection.
7. Return 12 Stories maximum. No AI reranking, hidden broadening or new grouping. A fixed, reviewed token policy is intentionally less capable than semantic search; empty/irrelevant results lead to query refinement, not invented answers.

Examples: `아소카 시즌 2` can resolve the explicit season relation; `아소카` can require clarification; `스타파이터 ... 공식 정보` retrieves the relevant Work but the word `공식` does not make a claim official; person/game queries use text matching. The UI can remove a nonmatching qualifier from the search terms only through an explicit user edit. Do not hardcode unverified IDs or promise those example topics currently have archived results.

### Story identity and evidence selection

There is no durable Story table. `storyId` in this API is the existing opaque `topic` string; do not require UUID syntax. It can change after administrator merge/split. Article and Work IDs are also validated opaque strings (nonblank, maximum 200 characters), then checked against D1.

For each selected Story, include its representative and up to two more public Articles, prioritizing a different source and then text relevance/date/id. Expose exactly which Articles will be used and how many were omitted. Multiple sources do not imply independent corroboration. No model claim may cite an omitted Article. If the requested question requires omitted detail, disclose the limited bundle rather than claim completeness.

Send only effective title (maximum 200 characters), summary (600), Article ID, source ID/display label, publication date, category, Story reference and ordering-uncertainty flag. Preserve the current decoder for stored HTML entities. Overlong legacy text is visibly marked truncated; do not send hidden full text. URLs are server-side citation metadata and need not enter the model input. Image URLs and Work hero metadata are not factual evidence.

Keep at least one Article for every selected Story. If the selected bundle exceeds budget, return `EVIDENCE_TOO_LARGE` and ask the user to reduce selection; do not silently discard a selected Story or cut sentences until qualifiers disappear.

## 5. Freshness and selection receipts

Retrieval returns an opaque signed receipt valid for ten minutes, bound to the dedicated anonymous session, normalized query, filters, candidate IDs, evidence policy version and each candidate's content fingerprint. It is integrity protection, not authorization to trust client content. Use a domain-separated HMAC from the assistant server secret.

Fingerprints cover sorted public member IDs, effective titles, summaries, URLs, source labels, dates, status, topic, linked Work IDs and relevant Work names, plus the projection/policy version. Include all public members, even members omitted from the bounded model bundle, so a changed selection is detectable without a new revision column.

Generation verifies the receipt and subset membership, reloads D1, rebuilds the projection and compares selected fingerprints. Unknown, expired, merged, split, hidden, edited or no-longer-linked selection yields `EVIDENCE_CHANGED` with no provider call. Do not follow a deleted topic to an inferred replacement. The user re-runs search and confirms the new selection.

After the provider returns, re-read authoritative selected state and compare again before sending output. If visibility or content changed in flight, discard output and return the same conflict state; the provider call may already have cost money. The response includes `asOf` for the final check. No long-lived response cache or service-worker caching is allowed.

This bounds freshness at response time; it cannot revoke text already copied or displayed in another browser. Returning to an inactive assistant tab or regenerating must revalidate selection; stale output is marked outdated rather than represented as current. There is no claim of a transaction spanning D1, the provider and the browser.

## 6. Evidence, source identity and certainty

| Source identity | Display class | Meaning |
| --- | --- | --- |
| StarWars.com | 공식 채널 | First-party channel; only a supported explicit announcement can be called an official announcement |
| Star Wars News Net | 팬·전문 매체 | Specialist reporting; neither automatically confirmed nor automatically rumor |
| Collider, The Hollywood Reporter, Deadline, Variety | 언론 보도 | Attribution to that outlet, not a universal confidence score |
| Forbes | 언론·기고 | Retain attribution; contributor publication is not official franchise confirmation |
| Unknown legacy label | 분류 미확인 | No inferred authority or certainty |

Derive display classes from existing stable source identities, not model guesses or client fields. This is assistant presentation policy; it does not change collection source configuration.

Claim certainty is a separate output property: `explicit_announcement`, `attributed_report`, `explicit_speculation`, or `unclear`. Default to attribution/unclear. An official identity alone cannot promote inference into announcement. A secondhand summary saying an official statement exists may be described as that outlet's report, not as independent inspection of the missing original statement. Preserve `논의 중`, `보도에 따르면`, `예정`, negation and conflicting dates.

Use `선택한 아카이브 근거에서는 공식 발표를 확인할 수 없습니다`, not `공식 발표가 없습니다`. Use `복수 매체가 보도했습니다` only with distinct source evidence, and never imply the reports are independent. `orderUncertain` prevents claims about who broke a story first.

Consolidate repeated propositions about the same subject/event/time into one fact carrying all relevant evidence references. Different details remain distinct facts. Contradictory dates, casting status or certainty remain attributed alternatives with a caveat referencing both sides. Newer publication alone does not prove a correction; use a superseding claim only when the evidence says it supersedes the earlier report.

Citations appear beside every factual answer block/fact, e.g. `[1], [2]`. A source row contains effective title, source, stored publication date, original URL and Story context. The server assigns numbers in first-use order and resolves all citation metadata from D1. The model returns opaque evidence IDs, never trusted links. Allow only valid absolute HTTP/HTTPS source URLs without credentials/control characters; render escaped text, no model HTML, no automatic URL fetching. External anchors use appropriate `rel` protection. Invalid URLs cannot become clickable evidence; if this leaves a fact unsupported, reject it.

Do not quote or reconstruct full articles. Generate short independent Korean factual synthesis and an original script. Creative hooks, transitions, opinions and predictions must be labelled creative, never smuggled into a fact. Requests to reproduce an entire source receive a bounded summary with source links.

## 7. Contracts and hard bounds

Names follow existing camelCase TypeScript/domain conventions. These are proposed contracts, not code added in Phase 9C.

### Client requests and server envelopes

`POST /api/assistant/retrieve` accepts only `{ mode, query, filters }`, where `mode` is `qa | script`; filters may contain one `workId`, one category, up to seven source IDs and an explicit date range within the public window. Return `{ status, candidates, workChoices, receipt, archiveWindow, asOf }`. Status is `ready | clarification | insufficient_evidence`. Candidates include `storyId`, representative presentation, source count, bounded evidence preview and omitted count. No receipt is issued for non-ready results.

`POST /api/assistant/generate` accepts only `{ requestId, mode, receipt, selectedStoryIds, instructions, includeDraft }`. The query/filters come from the verified receipt. `instructions` is script-only, `includeDraft` is false for Q&A. Reject duplicate/unknown IDs, unknown properties, invalid combinations and selection outside the receipt. Never accept client titles, summaries, URLs, model names, provider endpoints or certainty labels as grounding.

Responses use a discriminated envelope: `{ status: 'ok' | 'insufficient_evidence', mode, result, evidence, usedStories, relatedStories, warnings, archiveWindow, asOf }`, or `{ status: 'error', error: { code, message, retryAfterSeconds? } }`. `evidence`, `usedStories`, `relatedStories`, archive boundaries and timestamps are assembled by the server. All responses, including errors, use `Cache-Control: private, no-store` and `Vary: Cookie`; GET is not a generation endpoint. Do not place prompts in URLs.

### Provider output versus public output

The provider receives a strict JSON schema for the selected mode. Reject extra properties and out-of-range arrays/strings. Public results exclude internal validation support spans.

| Mode | Provider result shape |
| --- | --- |
| Q&A | `status`, `answer` (up to 8 factual blocks, each `{text, evidenceIds, certainty, supports}`), `limitations` (up to 5 short strings) |
| Script | `status`, `facts` (up to 16 `{factId,text,evidenceIds,certainty,supports}`), `caveats` (up to 8 `{text,evidenceIds}`), `outline` (up to 6 `{heading,factIds,creativeNote}`), `draft` (up to 12 `{kind,text,factIds}` segments) |

`supports` identifies an evidence ID, the `title` or `summary` field, and a short exact support span (at most 160 characters) from that field. It is an internal grounding check, not a displayed publisher quotation. Each factual block must have at least one valid evidence ID and matching span; all referenced IDs must be in the selected bundle. `factIds` must resolve to returned valid facts. `draft.kind` is `fact | creative`; factual segments require fact IDs, creative segments cannot introduce new claimed facts. An insufficient result has empty answer/facts/outline/draft and a bounded limitation explaining the gap. Draft is empty when not requested.

Server validation checks shape, bounds, citations, support-span membership and source/announcement eligibility. It rejects unknown IDs, missing references and unsupported official-source promotion. **These checks cannot prove semantic entailment or detect every invented statement.** A matching substring is not a truth proof. Conservative prompts, attribution, failure states and a reviewed adversarial evaluation set are required before launch; no document promises zero hallucinations.

### Launch limits

| Item | Limit |
| --- | --- |
| Client JSON body | 16 KiB, enforced while reading even without `Content-Length` |
| Query / script instructions | 500 / 1,000 Unicode characters; trim; reject oversized input rather than silently truncate |
| Candidates / selected Stories | 12 / Q&A 1–6, script 1–8 |
| Articles per selected Story | 3; maximum 18 Q&A or 24 script Articles |
| Model evidence fields | Title 200, summary 600 characters; no article body |
| Evidence / complete input | 12,000 / 16,000 tokens, plus 48 KiB serialized input byte ceiling |
| Output tokens | Q&A 1,600; script 4,800 |
| Public prose | Q&A factual text total 2,000 characters; script facts/caveats/outline total 3,000, draft total 4,000 |
| Serialized response | 64 KiB, including server citation metadata; evidence URLs at most 2,048 characters |
| Provider timeout / service deadline | Q&A 30 / 35 seconds; script 45 / 50 seconds |
| Provider calls | Zero for retrieval/clarification/no evidence; at most one per admitted generation; no automatic retry |

Character limits use one shared Unicode counting utility, not inconsistent browser/server assumptions. Enforce both text and token bounds. Phase 9D must use a Worker-compatible local tokenizer for the selected model profile, counting instructions, schema, user text, evidence and a documented framing allowance. Unknown tokenizer/profile combinations fail configuration validation. A model's large context window is not permission to send a larger bundle. Review bundle size and tokenizer overhead before adding any dependency; none is added in this phase.

If the provider hits its output limit, refuses or returns invalid structured output, do not display partial unchecked prose. Keep source selection and return a specific error/insufficiency state. Do not repair by issuing another hidden model call.

## 8. Prompt boundary and server security

Construct a fixed developer/system instruction block server-side: answer in Korean, archive-only, preserve attribution/uncertainty, no unsupported details, no external knowledge/tool use, cite only supplied evidence IDs, separate creative narration, obey output schema and return insufficient evidence when necessary.

Send the user's bounded task and the archive bundle as distinct labelled JSON data fields at lower instruction authority. Serialize with a JSON encoder; do not interpolate Article text into instructions, raw XML boundaries, provider roles or executable templates. Treat titles, summaries, administrator overrides and user style requests as untrusted content. Database authority establishes what the archive contains, not that its text is safe as instructions or historically true.

Architectural defenses beyond prompting:

- Fixed provider host/path, model profile and output schema; no tools, browsing, function calls, code execution, dynamic fetch URLs or model-directed database writes.
- Only an allowlisted evidence DTO leaves the server. Never include environment objects, admin/session secrets, raw cookies, network identifiers, receipt signatures or operational records in prompts.
- Source selection and allowed evidence IDs are enforced by server validation, not by a model promise. Model-returned URLs, HTML and hidden instructions are never rendered or executed.
- Validate content type, body size, shape, IDs, receipt, visibility, rate budget and response. Parameterize SQL. Check same-origin `Origin` and fetch-site signals; expose no permissive CORS. These browser defenses do not replace quotas against direct HTTP clients.
- Public usage does not require admin auth and cannot invoke admin operations. Feature-disabled/missing-key/invalid-profile states reject before provider calls.
- Separate server-only assistant signing secret from admin/scheduler secrets. Provider key stays in environment bindings, never D1, URLs, browser bundles, logs or backups. Provisioning/reuse is a Phase 9D operator decision, not performed here.

Test injected `ignore previous instructions`, secret-exfiltration URLs, fake citations and malicious administrator titles as data. Boundaries reduce blast radius; the semantic output evaluation remains necessary.

## 9. Model/provider boundary and official research

Use a small server-only assistant configuration profile: enabled flag, provider/model snapshot, tokenizer, supported schema settings, input/output limits, timeout and input/output price used for reservation. UI and request payloads know only product modes. Configuration is independent of collection's `OPENAI_MODEL`; changing assistant settings must not change collection/localization behavior. Unknown profiles fail closed; do not silently fall back to another model or add retry calls.

Recommended first evaluation baseline: `gpt-4.1-mini-2025-04-14`, chosen as a small non-reasoning baseline aligned with the repository's existing model family, **not a claim that it is the newest or best model**. Phase 9D must verify actual account access, lifecycle, current price, tokenizer behavior and Korean grounding quality before enabling it. A profile change needs the same eval and cost review but no UI rewrite. Omit unsupported reasoning/temperature parameters rather than blindly sharing settings across models.

Use Responses API, strict structured outputs, `store: false`, no conversation/previous-response linkage, no background mode and no tools. Non-streaming lets the server validate citations, shape and final D1 freshness before any generated prose reaches the UI. This trades perceived speed for simpler failure handling; show bounded loading and a cancel control. Streaming is a future separate change requiring safe partial rendering and final citation handling.

Official documentation consulted on **2026-10-13**:

| Source | Verified point informing this design |
| --- | --- |
| [Text generation](https://developers.openai.com/api/docs/guides/text) | Responses is the recommended interface for new text-generation work; pinned snapshots and evals support controlled changes. |
| [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Responses supports JSON-schema output through `text.format`; use the supported schema subset and handle refusal/incomplete output. Schema correctness is not factual correctness. |
| [Streaming responses](https://developers.openai.com/api/docs/guides/streaming-responses) | Streaming is optional and uses incremental server-sent events; MVP chooses complete-response validation. |
| [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) | The documented snapshot supports Responses/structured outputs. Listed prices are $0.40 input, $0.10 cached input and $1.60 output per million tokens. Documentation listing is not proof of this deployment's account access. |
| [Data controls](https://developers.openai.com/api/docs/guides/your-data) | API data is not used for training by default. `store: false` does not imply zero provider retention; standard abuse-monitoring retention can remain up to 30 days. No zero-data-retention entitlement is assumed. |

No provider call or credential check was performed during this design phase. Recheck these time-sensitive facts during 9D. Existing collection calls are not migrated as part of the assistant implementation.

## 10. Privacy, persistence and operational metrics

No permanent chat history and no account are needed. Keep only the current query, selection and result in React memory while the page is open; no localStorage, sessionStorage, IndexedDB or transcript cookies. Reload/navigation discards that state. A follow-up is a new self-contained archive request, not a hidden conversation containing past model claims. Copy/export is an explicit user action and includes citations and the archive-window disclaimer.

Provider disclosure before generation: the entered request and selected public archive summaries are sent to the configured AI provider; HOLOCRON does not retain a conversation transcript. Explain provider retention separately and ask users not to enter personal or secret data. Do not promise that `store: false` removes abuse logs. Hosting/access-log collection and retention must also be reviewed in 9D before claiming a complete privacy guarantee.

Temporary security state is pseudonymous, not anonymous in an absolute sense. Store only the bounded ledger described below. Do not join it to feedback, Quiz, Beta Analytics or admin records. No IP, raw cookie, prompt, generated response, evidence text, selected IDs or URLs belongs in that ledger.

Emit only content-free operational events/aggregates: mode, success/error code, latency bucket, input/output usage, estimated cost and rate-limit count. No per-user analytics dashboard, request body capture, free-form provider errors, query strings, model output or network/session IDs in logs. Existing Beta Analytics remains unchanged. Use existing hosting observability with reviewed retention; do not add a generic telemetry system or permanent metrics table.

## 11. Public rate, concurrency and cost admission

### Identity and quotas

Use a dedicated seven-day signed random session cookie, proposed name `__Host-holocron_assistant`, with Secure, HttpOnly, SameSite=Lax and Path=/. Persist only a domain-separated HMAC of its random identifier. Reissue invalid/expired cookies; cookie rotation is not a defense by itself.

For public Production, derive a daily network HMAC from trusted edge `CF-Connecting-IP`, UTC day and a dedicated server secret. Never store/log the raw IP. Untrusted forwarded headers are not fallbacks. Missing trustworthy network identity fails closed for generation; local tests use explicit injected identities. Combine session, network and global limits because cookies can be reset and networks can be shared. Reset messages should explain shared-network limits without disclosing another user's activity. Daily HMAC rotation allows a boundary reset, explicitly aligned with daily quotas rather than claimed continuous tracking.

| Admission rule | Initial limit |
| --- | --- |
| Q&A / script weight | 1 / 4 units per admitted provider request |
| Session | 5 units per rolling hour; 12 per UTC day |
| Network | 30 units per rolling hour within its daily identity; 80 per UTC day |
| Global | 200 units per UTC day **and** $2 estimated provider cost per UTC day |
| Concurrent generation | 1 per session; 3 globally; 60-second owner lease |
| Retrieval, no provider | 10/session/minute, 40/network/minute, 200/global/minute |

Example: one script plus one Q&A fits the hourly session quota; three script requests consume its daily quota. Retrieval does not consume generation units. Daily reset uses UTC and the UI displays the actual local reset time. A denied request returns bounded `Retry-After`; concurrency returns busy, with no background queue. Distributed cookie/IP rotation remains possible, so the global ceiling and feature kill switch are essential.

### One proposed temporary table, only in Phase 9D

Proposed `assistant_admissions` stores `request_id` (unique), `mode`, `session_hash`, `network_hash`, optional keyed `input_hmac` for generation idempotency, `units`, `reserved_cost_micros`, nullable `actual_cost_micros`, `state`, `started_at`, `lease_expires_at`, `expires_at`. Timestamps are integer UTC values; state is `started | completed | failed | unknown`. Use indexes for session/network time windows, active leases, global day totals and expiry. HMAC input includes the normalized request so a repeated ID with altered input cannot claim the original admission; the input itself is not retained.

Admission must be one atomic conditional SQL insertion that checks all quota sums, active leases, cost reservation and capacity, with unique request-ID enforcement. Do not perform a JavaScript read-then-insert race. Confirm this behavior with real local D1 concurrency tests. No transaction remains open across a provider request. Finalize only the matching request/session owner and release its active lease; completion of an older request must not release a newer request.

Generation flow: validate and build fresh bounded evidence → atomically reserve units/cost/lease → call provider once → validate result and recheck D1 → finalize ledger → respond. If admission fails, no provider call. A known usage total can replace the reservation; unknown timeout/cancellation usage retains the conservative reservation. Failed provider attempts still consume units. Lease expiry releases concurrency, not spent units/cost. Abort cancellation is best-effort and does not prove the provider stopped billing.

Duplicate in-flight request IDs return conflict. A completed duplicate returns `RESULT_NOT_RETAINED`, since no output is stored; it must not call the provider again. A user can explicitly start a new request with a new ID and quota charge. No client automatic retry on timeout, network error or page reload.

Retention: retrieval admissions expire after ten minutes; generation admissions after 48 hours, sufficient for rolling-hour/current-day accounting. Delete at most 100 expired records per admission using the expiry index. Cap live ledger rows at 10,000 and fail closed on capacity/storage errors. Never delete unexpired records to make room or reset quotas during deploy. If expired cleanup cannot keep up, report unavailable and investigate; no new cron job is required for launch.

This is the only proposed schema addition: temporary distributed cost-control state, not durable content or conversation storage. An in-memory Map cannot enforce global Worker quotas, and existing login/feedback tables have incompatible ownership/semantics. Do not overload durable settings or the collection lock.

### Backup impact planned for 9D

If this table is approved and implemented, generate the next additive Drizzle migration (currently next would be `0016`, but fetch canonical first). Explicitly exclude the ledger from export and future restore. Because the backup contract currently fixes the latest migration marker, deliberately introduce backup **v4** with the new marker and the same nine durable datasets/v3 Works shape. Preserve exact v1, v2 and v3 validation and dry-run contracts; never relabel historical artifacts or replay operational state. Update backup documentation and regressions in that implementation commit. This phase leaves v3, marker 0015 and every migration untouched. The previously accepted real historical v1 backup does not need another acceptance run now.

### Illustrative cost envelope

Using the documented baseline's uncached prices and no tools, estimates are in USD, excluding hosting/taxes. Traffic is an example, not a forecast; cache discounts are not assumed.

| Example | Input / output tokens | Estimated cost |
| --- | --- | --- |
| Typical Q&A | 3,000 / 600 | $0.00216 |
| Typical script | 8,000 / 2,000 | $0.00640 |
| 100 Q&A + 10 scripts/day | Above averages | $0.28/day; $8.40 per 30 days |
| Maximum admitted Q&A | 16,000 / 1,600 | $0.00896 reservation |
| Maximum admitted script | 16,000 / 4,800 | $0.01408 reservation |

Reserve against the full configured maxima before the call, round up to integer micro-dollars, and treat unknown usage conservatively. The $2 daily ceiling bounds application-admitted estimated spend, not an invoice guarantee: token counting, price updates, other API users and provider billing remain external factors. Review the provider project budget as an additional operator control; do not claim an alert is a hard cap. Invalid/missing price profiles disable generation. Raising quotas requires operator review, not client input.

## 12. UX, accessibility and failure states

Phase 9D replaces the placeholder entry only after enablement with a normal `<a href="/assistant">` leading to a dedicated workspace. When disabled, keep the current `COMING SOON` behavior. News, Works, Quiz and Roadmap links and their normal-anchor compatibility remain intact. The landing page offers the two product modes, archive scope and brief privacy disclosure; no generic chat history sidebar.

Desktop: existing dark archive styling, thin dividers and yellow accent; a compact evidence column beside the answer workspace. Avoid glass, gradients and decorative AI effects. At widths below 820px use one column: query → results → selection review → output. At 390px and 360px use wrapping source rows, vertically listed selections and native expandable details; no permanent two-column split, horizontal chip rail or mandatory evidence drawer. A sticky selection action must respect safe areas and the on-screen keyboard and must not cover content/navigation.

Use real labels, native checkboxes, minimum 44px primary touch targets, visible focus and logical DOM order. Announce selection count, busy/error states with restrained live regions. Focus the new result/error heading after actions, preserve selection on errors and restore focus when closing source details. Citation links need source/title/date accessible names and backlinks where useful. Color alone does not convey certainty or selection. Test with keyboard and screen-reader semantics, not only snapshots.

While generating, disable duplicate submit, retain evidence, announce processing and offer **취소**. Browser abort requests server cancellation when possible; communicate that quota may already be consumed. Never animate unchecked model text into a streaming-looking answer. Copy controls distinguish facts/outline/draft and include references rather than dropping attribution.

| Condition | Contract/status | User behavior |
| --- | --- | --- |
| No results | 200 `insufficient_evidence` | Explain archive limitation; edit query/filters; no provider call |
| Ambiguous Work | 200 `clarification` | Choose a visible Work/season or explicit general search |
| Relevant summaries cannot answer | 200 `insufficient_evidence` | Show available sources and what is unsupported; no invented completion |
| Bad request / oversized body | 400 / 413 | Explain field or size limit; no provider call |
| Evidence exceeds budget | 413 `EVIDENCE_TOO_LARGE` | Reduce selected Stories; never silently omit one |
| Changed/expired/unknown selection | 409 `EVIDENCE_CHANGED` | Preserve query, search again, review new selection |
| Duplicate / completed request ID | 409 `REQUEST_IN_PROGRESS` / `RESULT_NOT_RETAINED` | No duplicate call; explicit new action if desired |
| Quota / concurrency | 429 `RATE_LIMITED` / `BUSY` | Show retry/reset time and retain selection |
| Provider timeout | 504 `PROVIDER_TIMEOUT` | Keep sources, allow deliberate retry; disclose possible quota consumption |
| Provider unavailable/rate-limited | 503 `PROVIDER_UNAVAILABLE` | No raw provider body; no automatic retry |
| Malformed/refused/incomplete output | 502 `GENERATION_INVALID` or bounded refusal message | Display no unchecked answer; keep evidence |
| D1 unavailable/capacity exceeded | 503 `ARCHIVE_UNAVAILABLE` / `ARCHIVE_CAPACITY` | No seed fallback or model-only answer |
| Feature/config unavailable | 503 `ASSISTANT_UNAVAILABLE` | Do not reveal missing secret names or configuration values |
| Unexpected internal error | 500 `INTERNAL_ERROR` | Generic safe message plus content-free operational error code |

## 13. Phase 9D architecture and exact sequence

Proposed paths below are responsibilities, not empty modules to create during 9C. Keep routes small; avoid a route containing SQL, prompts, ranking and provider code.

| Layer / proposed owner | Responsibility |
| --- | --- |
| `app/assistant/page.tsx`, `components/assistant/assistant-workspace.tsx` | Mode navigation and request-scoped state |
| `components/assistant/story-selection.tsx`, `assistant-result.tsx` | Visible Story selection/review; accessible cited output and copy controls |
| Existing `components/news/ai-assistant-placeholder.tsx` | Minimal feature-aware entry change; disabled behavior retained |
| `app/api/assistant/retrieve/route.ts`, `generate/route.ts` | Method/origin/body validation, cookie headers, service delegation, safe response mapping |
| `lib/assistant/types.ts`, `validation.ts` | Shared contracts and strict request/output validation; no SQL |
| `lib/assistant/service.ts` | Retrieval/generation orchestration, freshness, admission and finalization; no embedded provider prompt or SQL |
| `lib/news/archive-snapshot.ts` (new shared read facility) | Strict read-only bounded public snapshot; preserve existing public page fallback at its existing caller |
| `lib/assistant/retrieval.ts`, `evidence.ts` | Pure ranking, evidence selection, fingerprints, source labels and server citation assembly |
| `lib/assistant/prompt.ts`, `generation.ts`, `config.ts` | Fixed instruction/schema builder, single provider request and model/token/price profile |
| `lib/assistant/identity.ts`, `limits.ts`, `repository.ts` | Cookie/HMAC/receipt verification; quota policy; parameterized atomic admission/cleanup/finalization SQL |
| `db/schema.ts`, next Drizzle migration, `lib/backup/*` | Only the approved operational table and explicit backup version/exclusion evolution |
| `scripts/test-assistant-*.mjs` | Repository-style domain, integration, rate and route tests; separate reviewed model eval fixtures |

Reuse existing `buildStories`, `displayArticleTitle`, source filtering, read-only Work/relation queries, Work matching and `projectNewsWorks`. Do not fork those rules into assistant-specific implementations. Keep new snapshot limits optional to existing public callers so 9D does not silently change their behavior. Provider credentials/config, quota identity and generation orchestration stay separate from collection/admin/feedback services.

Implementation order, only after a separate Phase 9D instruction:

1. Fetch actual canonical main, re-read AGENTS and this design, inspect intervening schema/backup changes. Confirm approved operational-table need, provider account/model availability and private rollout scope. Recheck official docs/prices; no automatic deployment from this plan.
2. Implement contracts, strict read-only snapshot, deterministic retrieval/evidence and receipts with fixtures. Prove no seed fallback, write calls or hidden content. Add route-independent tests before provider integration.
3. Add dedicated anonymous identity and atomic admission ledger through one additive Drizzle migration; implement quota/idempotency/lease tests against local D1. Update backup v4/exclusions and historical v1/v2/v3 regressions together. No restore executor.
4. Implement one-call provider/config/prompt boundary, token counting and structured semantic-reference checks using mocked responses. Add full service/route integration tests that prove selected D1 data, not client metadata, reaches the provider and public citations.
5. Build the two-mode workspace, visible selection review and accessible non-streaming states behind a disabled-by-default feature flag. Keep normal public navigation and placeholder behavior until explicitly enabled.
6. Run the regression suite, lint, TypeScript, build and diff check. Perform actual desktop/390px/360px and keyboard QA. Execute the private, bounded model evaluation only with separately authorized credentials/cost budget; review grounding and privacy disclosures.
7. Review migration/backup compatibility, provider/cost limits, hosting log retention and all acceptance evidence. If authorized to deploy in 9D, use the existing Site and canonical-tree content mirror on the latest internal tip with normal push; never change Sites origin, merge unrelated histories or force push. Keep the Site private unless separately authorized to expose it. No new staging Site is implied.
8. Enable privately with low quotas, verify failure/disable behavior and observe content-free metrics. Public launch is a separate explicit operator decision after the acceptance gate. Rollback disables assistant routes/entry immediately; retain the additive operational table and let rows expire rather than perform destructive rollback.

## 14. Test and acceptance plan for 9D

| Area | Required evidence |
| --- | --- |
| Retrieval | Work relation, manual exclusion, title override, general text/person/game query, ambiguous season, stable ranking, Story dedupe, earliest/date-only uncertainty, source filters, 90-day boundary, review/excluded/disabled members never leaked |
| Read safety | D1 failure/empty data never returns seeds; strict row/byte guards; no seeding or association writes; batch consistency and primary freshness; no partial Story on overflow |
| Selection | Script initially unselected; bounded nonempty subset; forged/expired/cross-session receipts; unknown/duplicate IDs; edited, merged, split, hidden or relinked Stories before/during generation produce conflict |
| Grounding | Actual retrieve → server selection reload → prompt → service → cited response chain; malicious client fields rejected; only selected evidence IDs accepted; duplicate fact consolidation; conflicts retained; no source reputation promoted to confirmation |
| Generation | Zero calls for no evidence; exactly one for admitted generation; no retries/repair; timeout/429/5xx/refusal/malformed JSON/output limit; invalid citations/support spans rejected; failure never renders unchecked text |
| Security/privacy | Injection in title/summary/admin override and user instruction; unsafe URLs/HTML escaped or rejected; oversized chunked body, unknown properties, CSRF/CORS cases; no key/raw IP/cookie in public payloads or logs; no prompt/output in logs or persistent state; only the allowlisted prompt reaches the provider |
| Admission | Concurrent local D1 requests cannot exceed any quota/spend/concurrency cap; cookie resets still meet network/global limits; UTC boundary, rolling hour, missing edge identity, leases, late completion, cancellation, replay IDs, unknown usage reservation, cleanup/capacity and D1 outage |
| Backup/schema | Additive migration only; operational ledger/secrets excluded; v4 marker/durable counts; v1/v2/v3 unchanged validation and plans; no restore executed; no repeated acceptance of the previously closed historical backup task |
| UI/accessibility | Real desktop, 390px, 360px and on-screen keyboard; keyboard selection/review, error/live announcement, focus, citation links, copy attribution, cancel/double-submit and retained selection |
| Existing system | Full `test:*` suite, especially News/Work, stories/overrides, source settings, public caches/navigation, placeholder, auth/rate limit, scheduler, collection/recovery, backup, Works/hero, Quiz, Roadmap, Analytics and Site Copy |

A deterministic test can reject malformed references; it cannot certify that every sentence is supported. Before launch, build a manually reviewed evaluation set of at least 30 archive-based tasks spanning the four example query types, no evidence, ambiguous names, thin/headline-only summaries, conflicting sources, date-only ordering, injections, requests for unsupported official confirmation and script creativity. Annotate allowed claims, necessary caveats and evidence IDs. Review every output for unsupported specifics, lost attribution and invented citations; any severe unsupported factual claim or secret/hidden-data leak blocks launch. Track retrieval misses and improve explicit terms/UX before considering a new retrieval architecture.

Phase 9D is complete only when both modes run end-to-end against authorized real archive data, the user visibly selects script Stories, citations resolve, current overrides/visibility survive in-flight changes, quota races are tested, provider failure is safe, and actual mobile/accessibility/regression checks pass. Record real provider/model/version and results; mocked tests alone are insufficient. This document does not report those future checks as passed.

## 15. Risks and deliberate limits

- Stored summaries can be incomplete or wrong; there is no full-body verification or reliable persisted headline-only quality flag. The assistant must disclose its evidence level, preserve attribution and decline unsupported detail.
- Deterministic lexical retrieval misses aliases, spelling variants and complex Korean phrasing. Work relations and visible query refinement mitigate this; vectors/reranking remain out of scope until measured misses justify them.
- Mutable `topic` IDs cause selection conflicts after admin edits. Signed receipts plus fresh fingerprints intentionally prefer re-selection over silent remapping.
- Semantic hallucination and prompt injection cannot be eliminated by JSON schemas or matching support spans. Adversarial model evaluation and constrained publication are required.
- Network quotas can inconvenience shared networks and cannot stop every distributed attacker. Global admission cost limits, low quotas and the kill switch bound exposure.
- D1 atomic admission throughput, snapshot byte guards, tokenizer Worker compatibility, provider account access and actual Korean output quality need 9D measurement. None is assumed tested here.
- Provider prices, model lifecycle and retention conditions change. Revalidate at implementation/launch and each model profile change.
- The proposed operational migration requires deliberate backup v4 compatibility work even though no durable archive fields change. Do not overlook this when implementing rate limits.
- There is no durable answer history or reliable cross-tab recovery; this is an intentional privacy/scope choice. Already copied outputs cannot be revoked after archive edits.
- The current Site remains private. This design neither changes hosting visibility nor settles public-launch authorization.

## 16. Phase 9C completion boundary

The deliverable is this design plus the AI-only PRODUCT_SPEC update. No runtime module, API endpoint, UI behavior, schema, migration, dependency, environment variable, AI call or deployment is added. `COMING SOON` remains the actual feature state. Functional assistant acceptance, live provider evaluation, rate-limit execution and mobile assistant QA are **NOT TESTED: implementation does not yet exist**.
