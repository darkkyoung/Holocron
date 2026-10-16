# Phase 9D-A — Grounded retrieval and evidence foundation

Date: 2026-10-16. Starting canonical (fresh remote fetch): `4921de2bf714d643f7e1aca616b3714ee79469fb`.

Scope: canonical implementation and local verification only. Phase 9C.2 completed private acceptance remains intact. No Production deployment, provider call, secret provisioning, Credit operation, migration, backup evolution, workspace UI or feature activation. 9D-B/C/D are not started.

## Why a separate strict read facility

The normal public archive has a cache and a deliberate seed fallback. Neither is an authoritative grounding source. `lib/news/archive-snapshot.ts` starts a new `withSession('first-primary')` for **every** snapshot and makes its first/only call a five-statement read batch: combined count/byte budgets, Articles, Works, relevant relations and the single allowlisted source-visibility setting. SQL budget predicates suppress every row payload when any row ceiling or the combined 4 MiB SQL JSON-byte ceiling is exceeded. Limits are 2000 published-window Articles, 500 Works, 10000 relevant relations, with limit-plus-one checks and returned-count verification. Budgets conservatively include disabled-source Articles and excluded relations before applying public visibility; an oversized hidden subset can therefore cause explicit capacity failure, never partial grounding.

The batch preserves a consistent database view without a write lock, pagination, per-Story queries or a manual transaction. Cloudflare's [D1 database contract](https://developers.cloudflare.com/d1/worker-api/d1-database/) was checked on 2026-10-16: batch is transactional and first-primary directs the first session query to primary. Tests prove local batch behavior and assert the primary constraint; they do not simulate a deployed replication topology. Freshness is bounded at each completed read, not a transaction across a future provider call.

The SQL date comparison uses `julianday` to preserve actual timestamp/date-only boundary semantics instead of lexical timestamp comparison. `buildStories()` remains authoritative for grouping, effective published state, earliest representative and uncertainty. This phase preserves its current future-date policy; it does not silently add a separate archive policy. Invalid/unavailable D1 yields ARCHIVE_UNAVAILABLE; empty means empty. No seed/collection/association/write path exists. Existing public cache/fallback behavior is unchanged.

## Owners and reuse

| Module | Responsibility |
| --- | --- |
| `lib/news/rows.ts` | Existing Article entity decoder moved unchanged from news.ts; shared by old reads and strict reads |
| `lib/news/archive-snapshot.ts` | Fixed SQL allowlist, primary batch, capacity and completeness guards, public projection |
| `lib/assistant/types.ts`, `validation.ts` | Typed contracts, Unicode limits, strict keys/IDs/filters/date narrowing |
| `lib/assistant/retrieval.ts` | Pure Work resolution, reviewed lexical policy, ranking and source-filtered Story projection |
| `lib/assistant/evidence.ts` | Three-Article preview, server citation metadata, source class, truncation flags, full public-state fingerprints |
| `lib/assistant/identity.ts`, `receipts.ts` | Browser binding and opaque signed/encrypted selection receipts; reusable freshness verification |
| `lib/assistant/service.ts` | Read/retrieve/sign orchestration; verified selection reload, no embedded SQL/provider |
| `lib/assistant/http.ts`, `config.ts` | Streaming body limits, same-origin guards, safe errors/cache headers, disabled flag |
| `app/api/assistant/retrieve/route.ts` | Thin method/config/DB delegation |
| `scripts/test-assistant-retrieval.mjs` | Domain, security, actual route and real Miniflare D1 coverage |

Reuse includes `buildStories`, `displayArticleTitle`, `filterArticlesByEnabledSources`, source IDs/settings parser, `projectNewsWorks`, `storyCategories`, `buildWorkMatchIndex`, `matchArticleWorks`, `normalizeWorkText`, shared signed-cookie crypto and bounded JSON reader. Existing unbounded relation reads are not invoked; the bounded snapshot uses the same columns/state semantics and shared projection. No new dependency.

## Deterministic retrieval and evidence

Explicit Work IDs win; otherwise the current matcher resolves one Work or returns clarification. Work matching requires existing linked relations on visible members; excluded relations are never revived by text. Relevant ambiguous catalog choices are exposed without guessing a season. Work-only results use recency; residual text and people/game topics use lexical matching. No synonyms, embeddings, provider reranking or query expansion.

Policy v1 removes only `최근`, `소식`, `정리해줘`, `알려줘`, `관련`, `뉴스`, `뭐`, `있었어`; retains up to 12 unique normalized terms (two or more code points, or numeric tokens including single digits). Returned searchTerms show the actual terms. Titles use the effective override and existing entity decoding. Article score is full term phrase in title +10, distinct title terms +2 and summary terms +1. Story score/coverage come from its best-scoring member (coverage breaks equal member scores), never the sum of outlet scores; ties then use representative date descending and topic code-point lexical order. Source filters precede Story projection; category/date filters use that projection's representative.

At most 12 candidates, each representative plus up to two supporting public Articles, prioritizing previously unrepresented sources, relevance, date and ID. Omitted count is explicit. Title/summary previews cap at 200/600 Unicode code points and explicitly mark legacy truncation. DTOs exclude images, full text, hero metadata and internal moderation fields. URLs come only from D1, must be HTTP(S), no credentials/control characters and <=2048 characters; unsafe URLs become null. Text remains untrusted data, not HTML or executable instructions. No UI renderer is introduced.

Source class distinguishes official channel, specialist, media, contributor and unclassified; default claim certainty stays `unclear` even for StarWars.com. No class asserts an official announcement or independent corroboration. No generation-level entailment/citation validation is claimed in A.

## Receipt/session contract

`__Host-holocron_assistant`: random 256-bit browser binding, seven-day signed Secure/HttpOnly/SameSite=Lax/Path=/ cookie. Invalid, duplicate or expired credentials rotate; they cannot reuse the old receipt. It creates **no D1 identity or wallet**, grants no account authority and reads no Google identity. Account-first/Guest-second ownership remains solely in the existing Credit resolver for later paid work. A dedicated browser binding satisfies the design's cross-session receipt requirement without making an alternate balance system.

`HOLOCRON_ASSISTANT_SIGNING_SECRET` is dedicated, minimum 32 bytes, no fallback to Account/Guest/Admin/Google/Scheduler/provider keys. No real value was provisioned. Tests use synthetic injected secrets only. Purpose-separated HMAC-SHA256 signs the session and derives distinct receipt integrity/encryption keys. Receipts use AES-GCM plus domain-separated HMAC so the client receives an opaque token, not an encoded query transcript. Queries/selections/fingerprints exist only in that response token and request memory; they are not persisted in D1, browser storage, logs or the session cookie.

Ten-minute receipt binds version, session digest, normalized request (mode/query/filters), candidate IDs and fingerprints. Fingerprints include **all public Story members**, even omitted and source-filtered members; full effective titles/summaries, raw source URLs, source identities, dates/category/status/topic, every relevant relation including manual exclusions/provenance, and relevant Work IDs/names/season metadata. Sorted IDs make them independent of SQL row order.

`reloadSelectedEvidence` verifies signature/session/time before a fresh primary read. `verifySelectedEvidence` verifies nonempty mode-bounded distinct subset membership and fingerprints, returning EVIDENCE_CHANGED for edited/hidden/removed/merged/split/relinked evidence or changed catalog filters. It never maps an old topic to a replacement. Future pre-call and post-call checks can each use the same primary-reloading function; no provider workflow is implemented here. Already delivered text cannot be revoked by this mechanism.

## HTTP/config contract

`POST /api/assistant/retrieve` accepts exactly `{mode,query,filters}`, mode `qa|script`, <=500 Unicode query characters. Filters: optional opaque workId/category (nonblank, <=200 code points, no control characters); sourceIds 1–7 distinct existing source IDs; optional dateFrom/dateTo in canonical UTC `YYYY-MM-DDTHH:mm:ss.sssZ`, within the current 90-day interval and correctly ordered. Dates are instants (date-only values must be converted explicitly by a future UI); they never widen the archive.

Responses: ready / clarification / insufficient_evidence, candidates, workChoices, resolvedWork, editable searchTerms, proposedStoryIds, receipt (null except ready), archiveWindow and request asOf. Q&A proposes top six; script proposes none. 16 KiB request body bound is enforced while reading, including chunked input; 64 KiB serialized response overflow fails with EVIDENCE_TOO_LARGE instead of silently dropping a Story. No content-length trust. Exact same-origin Origin is required; Fetch Metadata, when present, must say same-origin. No permissive CORS. Supported method/error responses all use private,no-store and Vary: Cookie; unsupported methods return 405/Allow:POST. Errors never echo text, SQL, cookies, secrets or raw exceptions.

`HOLOCRON_ASSISTANT_ENABLED` must be exactly `true`; absence/false fails closed before D1/session issuance. A valid dedicated secret is also required. This task does not set either production value. There is no UI activation: COMING SOON and all existing pages remain unchanged. Distributed retrieval admission/rate limits belong to 9D-B; this un-deployed foundation must not be enabled publicly before that work and a separate review.

## Validation

Results: **43/43 test:* suites PASS**, including new `test:assistant-retrieval` (**450 assertions** on its final run). All 42 pre-existing suites passed, including Credit, identity/Google, backup, collection/scheduler, News/Works and COMING SOON regressions. The full suite run was followed by a final targeted rerun after the filtered-representative category and missing-D1 safe-error refinements.

Commands: every `test:*` entry executed as `pnpm <script-name>` (43 entries), then final `pnpm test:assistant-retrieval`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`: **PASS**. Lint has no warnings. Build includes only the disabled retrieval API; no assistant workspace/generation route. No assistant signing configuration or receipt crypto is included in client assets. Final diff review confirms existing launcher, schema/migrations, Credit/identity, backup and scheduler implementation files are unchanged. No dependency/lockfile change. Runtime tests use real local Miniflare D1 with the complete existing migration chain and only synthetic fixtures; no Production SQL or backup was used. They check full batch consistency during concurrent atomic changes, zero rows written by retrieval, limits and no partial Story, privacy/visibility, query/filter/ranking rules, evidence bounds/source classes, forged/expired/cross-session/stale receipts, pre/post-reload reuse, chunked bodies, HTTP errors and actual route/config delegation.

## Operational boundaries / NOT TESTED

- Schema impact NONE; no 0017 or edits to 0016. Backup remains v4 / 0016; no restore work.
- Credit impact NONE. Provider calls ZERO. No model/pricing decision or API-key reuse is needed for this non-provider scope.
- Production deployment, native Site version creation, secret writes, public activation and access changes: NOT PERFORMED.
- Owner reports Site access changed from owner-only to public on 2026-10-16 and attributes previous scheduler HTTP 401 to the owner-only gateway. This task neither changes scheduler/auth/workflow nor independently establishes successful scheduled collection. Separate operational follow-up only.
- NOT TESTED: deployed D1 replication/primary routing, production retrieval, browser/mobile/keyboard UI, actual model grounding, distributed rate/concurrency controls, Credit spend/refund, hosting request-log retention and private AI acceptance. There is no assistant workspace UI to claim tested.
- Recommended next work package: separately authorized 9D-B, reviewing operational admission against the existing Account/Credit system and v4/0016 schema. It is not started here.
