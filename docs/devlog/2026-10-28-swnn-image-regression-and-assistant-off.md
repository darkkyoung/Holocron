# 2026-10-28 — SWNN missing-image incident and Assistant OFF boundary

## Scope

Owner-supplied visual evidence and existing public canonical code were reviewed. This is a **documentation-only incident record**; no Production DB, article, scheduler, image, environment, Credit, Provider, source code, or deployment was changed. The screenshot itself is not committed.

Canonical application base at review: `4d298a32581dd6826e23c582688755ea917310ec` (the separate documentation commit will change main SHA/tree, not the application runtime).
Last owner-reported Production baseline: **v96 / environment revision 64 / AI OFF / MAINTENANCE**, Migration 0020 / Backup v10. The later canonical chat UI/Provider compatibility commit has not been reported deployed.

## User-visible symptom (2026-10-28 KST)

The owner supplied a screenshot of the HOLOCRON news archive showing at least two Star Wars News Net cards dated **2026-10-27**, with **HOLOCRON ARCHIVE** rather than a thumbnail:

- Game category: **‘나이트 오브 더 올드 리퍼블릭’ 심층 분석 3부 공개**.
- Animation category: **성우 에릭 바우자, 46세로 별세… ‘영 제다이 어드벤처’ EB-3 목소리 연기**.

These are visible UI strings, not an independent factual verification of the articles. Older SWNN cards lower in the same screenshot have images. Current `components/news/story-card.tsx` renders the placeholder when `article.image` is empty; the screenshot is consistent with missing stored image URLs. **Neither specific row's `image` column nor per-article retry history was freshly read from Production here.** The visible Korean game/animation category is an internal category, not evidence of the publisher's raw RSS `Other` taxonomy.

The owner's concern is that newly imported SWNN stories still appear without an image and that automatic retry may not work from initial collection. The screenshot **does not by itself prove that no retry occurred**.

## Established implementation

- Initial SWNN candidates go through RSS image extraction, WordPress post/featured/attached-media metadata and article HTML fallback. If all paths fail, a published article may be stored with `image=''`. This does not prove that any particular new article followed each path.
- Shared `runCollection()` awaits `recoverAutomaticSwnnImages()` **after collection**, before final saved report and lock release, provided SWNN was enabled. This handles newly inserted published empty-image rows as well as older ones.
- Automatic recovery considers only recent 90-day published SWNN rows whose `image` is empty (with status-override protection). It processes at most **3 articles / 10 external requests including redirects / 30 seconds** per run, with a lease buffer and cyclic cursor. A skipped, time-exhausted, queued, or source-inaccessible article can remain blank. It does not promise immediate image recovery.
- `lib/collection/image-recovery.ts` reuses the same source metadata endpoints, so re-querying cannot inherently resolve an upstream HTTP 403.
- Manual `retryArticleImage` also uses the metadata lookup path. Existing **이미지 URL 수정** is distinct: an operator can set a verified public representative image URL for a specific article and verify actual browser rendering.
- `HOLOCRON_ASSISTANT_ENABLED=false` governs the user-facing Q&A/Planner AI assistant. `app/api/scheduled/collect/route.ts` and `lib/collection/run.ts` do **not** gate SWNN image recovery on this flag. Collection summaries use a separate `OPENAI_API_KEY`/`OPENAI_MODEL` configuration; the image recovery itself performs no Assistant Q&A/Planner Provider call. AI OFF must **not** be treated as the cause of missing thumbnails.

## Prior Production evidence — NOT a fresh run for these two rows

The owner supplied a read-only `/api/manage` `last_collection` report for the scheduled run finishing **2026-10-27T13:15:38.114Z (22:15:38 KST)** on v94:

- SWNN automatic image recovery: **3 candidates / 0 recovered / 0 missing metadata / 3 failures / 0 deferred / 0 unchanged**.
- Aggregate diagnostics: WordPress REST **HTTP 403** and article HTML **HTTP 403**.
- Classification correction shipped with v94 now distinguishes access failures from successful no-image lookups.
- These are **aggregate** diagnostics and are not necessarily attached to either new 2026-10-27 card. A current v96 per-run result was not retrieved in this review.

Other earlier investigations observed public SWNN WordPress/HTML metadata HTTP 200 from a Work environment; that does not prove Production Worker access. The cause of Production 403 (publisher/CDN policy, egress difference, or another cause) remains **UNKNOWN**.

## Verdict

**VISUAL MISSING-IMAGE SYMPTOM CONFIRMED; LIVE AUTO-RETRY FOR THESE TWO ARTICLES NOT VERIFIED.**

The auto-recovery implementation exists and previously ran; prior Production reports showed zero successful recovery and upstream HTTP 403. This is not evidence of missing code or a consequence of Assistant OFF. The same symptoms could persist while the code behaves exactly as implemented.

Do **not** claim restored thumbnails, a fixed 403, successful v96 image recovery, or a newly proven per-article cause.

## Next bounded investigation / acceptance

1. **Read-only first:** inspect latest `last_collection` (run time, SWNN source enabled, automatic image summary and aggregate diagnostics), and the two article rows' `id`, `url`, `published`, `status`, `status_override`, and `image` without exposing user or secret data.
2. Check image candidate count, cyclic cursor and eligible query from `lib/collection/repository.ts`; identify **selected/failed/deferred/not-yet-selected** only where actual evidence supports that attribution. The existing aggregate report may be insufficient to reconstruct any given article's history.
3. Verify a publisher-permitted image metadata path is reachable **from Production** before changing enrichment logic. Do not use credential reuse, impersonation, unapproved proxies or anti-bot bypass. Do not repeatedly force collection to manufacture evidence.
4. If legitimate Production access remains denied, treat automatic extraction as **externally blocked**, keep explicit failure reporting, and use the existing **이미지 URL 수정** after independently verifying each representative image and checking the card in the browser. Consider a small admin view for empty image counts/failed source diagnostics only if separately requested.
5. Preserve v95 SWNN source-category `Other` forward-only filter, prior weekly exclusions, manually edited images, Credit, Account, Assistant, Backup v10, Migration 0020 and existing collection bounds. An internal category of `게임`/`애니메이션` must not be confused with original `Other` taxonomy.
6. Track Assistant independently. Its newer chat UI and Provider parsing improvement were committed but not yet reported Production-deployed; current owner-reported flag remains OFF. No new paid acceptance or AI ON is authorized by this incident log.

## Operational boundary

This record authorizes **no** source patch, Production deploy, forced collection, metadata recovery POST, manual image write, Credit change, Provider call, Migration/Restore, visibility change, or consumed diagnostic probe reset. Historical Acceptance or source metadata is not rewritten. The owner can approve an image repair or independent Assistant release in a later step.

References:
- `docs/devlog/2026-10-21-swnn-automatic-image-recovery.md`
- `docs/devlog/2026-10-24-swnn-image-recovery-classification.md`
- `docs/devlog/2026-10-27-swnn-other-category-exclusion.md`
- `docs/devlog/2026-10-28-chat-provider-compatibility.md`
