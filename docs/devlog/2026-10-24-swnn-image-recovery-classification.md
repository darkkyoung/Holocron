# SWNN image recovery: access failures and missing metadata

Date: 2026-10-24 KST (implementation/checks on 2026-10-23 UTC).
Starting canonical: `1648a3b0670c9d848694618c20739c1723ccd9ca`, tree `757ba1a7a187a3d38c00df529622ffdf743302ba` (fresh fetch and GitHub ref agree).

## Evidence and limits

The owner supplied the Production `last_collection` result for the natural run ending **2026-10-23T15:07:39.459Z**: automatic SWNN recovery selected 3 articles, recovered 0, reported 3 missing, 0 failed and 0 deferred. Its aggregate diagnostics include WordPress REST HTTP 403 and article HTML HTTP 403. SWNN is enabled; article `fd107d34-4e3c-400f-905c-84008f50ce84` has `image=''`.

This confirms that automatic recovery ran and encountered access refusals. It does **not** identify the upstream blocking rule, establish that every candidate hit both failures, or reconstruct this article's initial or later individual lookup history. Existing aggregate reports must not be rewritten as per-article evidence. The report has no per-article history and `last_collection` is overwritten by later runs.

Read-only Work-network checks from the preceding investigation (2026-10-23T16:14:52Z–16:17:55Z) found:

- The existing primary RSS returned 200; the target item carried no image metadata.
- The existing slug-based WordPress REST request returned 200 with featured/embedded/Yoast image metadata. The existing `enrichSwnnFromWordPress()` parser extracted the image.
- The article's normal redirect to `www` and HTML returned 200 with `og:image`.

These are **Work egress observations, not Production access tests**. They do not override the owner-observed Production 403s. No new Production-accessible metadata route has been established. No new fallback, alternate hostname, proxy, credentials, User-Agent impersonation, access-control bypass or transport retry was added. Automatic image availability remains unresolved when the published feed omits images and the existing metadata endpoints refuse the Production Worker.

## Reproduced code defect and minimal change

The existing enricher catches optional REST/HTML failures so collection can continue. Automatic recovery previously treated the resulting empty image as `missing`, regardless of the diagnostic. Against starting source, a mock RSS success + REST 403 + HTML 403 in isolated Miniflare D1 produced **missing 1 / failed 0**, reproducing the classification defect without claiming to reproduce the exact historical article response.

The shared enrichment diagnostic now carries a typed reason (`NO_IMAGE`, `HTTP_ERROR`, `TIMEOUT`, `PARSE_ERROR`, `REQUEST_ERROR`, `INVALID_URL`). Only fixed messages and validated HTTP status codes are emitted; exception bodies, URLs, article text, request headers, cookies and Secrets are not copied. Invalid WordPress JSON shapes are parsing errors rather than empty post lists. Other sources retain their collection/fallback behavior; their HTML diagnostics gain the same classification.

Automatic recovery uses per-article lookup state and the following mutually exclusive outcomes:

| Result | Meaning |
|---|---|
| 성공 | An existing lookup path supplied an image and the guarded image update succeeded. An earlier optional-path failure does not override success. |
| 미발견 | All required attempted lookup paths completed normally but supplied no image. |
| 실패 | No image was recovered and a lookup failed (HTTP, timeout, parse, request/URL), or processing/storage failed. |
| 변경 없음 (저장 조건 불일치) | An image was found but the final conditional update no longer matched, including a concurrent manual image or editorial status change. |
| 이월 | The phase deadline/request budget prevented completion; remaining work stays eligible for a future collection. |

A failed shared RSS fetch/parse means incomplete lookup coverage: unresolved candidates are failures, not proven image absence. Its diagnostic stays explicitly **aggregate**, not an attributed HTTP error for every article. Per-article failure state is reset so a failed article cannot contaminate the next one.

Reports retain existing count fields, add explicit storage-condition wording, and cap deduplicated aggregate diagnostics at six lines with operational failures before ordinary missing metadata. They do not promise a full error history. Using the tenth request is no longer automatically classified as deferral if that final lookup actually completed; a denied additional lookup is deferral. Internal budget exhaustion is not mislabeled as an upstream timeout.

## Preserved boundaries

- Same recent 90-day, published-only SWNN query; empty images only; source enablement and status overrides preserved.
- Same **3 articles / 10 external requests (redirects included) / 30 seconds** per collection, maximum 15 seconds per request shortened by remaining phase time, and two same-source redirects per lookup.
- Same cyclic cursor, collection lock and 15-second lease finalization buffer. D1 operations remain platform operations and are not claimed to be forcibly cancellable.
- Same RSS → WordPress post → featured/attached media → article HTML sequence; no extra requests, retries or automatic AI processing.
- Same guarded image-only update, manual individual/batch/URL tools, cache invalidation, and shared manual/scheduled runner.
- No article insertion, title/summary/topic/status edit, reclassification or Story regrouping in recovery.
- No Migration, Backup v10 contract, Assistant, Credit, Racing, Scheduler, environment or historical evaluation changes. The transient probe marker is untouched.

## Existing manual option for the current article

Article:
<https://www.starwarsnewsnet.com/2026/10/star-wars-starfighter-budget-surpasses-the-force-awakens-before-tax-credits.html>

Public representative image linked by that article's metadata:
<https://www.starwarsnewsnet.com/wp-content/uploads/2026/08/Starfighter_Logo-scaled-e1787939259499.jpg>

A single ordinary Work HEAD request at **2026-10-23T16:50:47.514539Z** returned **200 / image/jpeg**. This does not verify Production/browser hotlink behavior.

The owner can first open the URL and verify the correct representative image in their browser, then use Control Room → the target article → **이미지 URL 수정** → paste the URL → **저장**. Existing `set-image` validates the URL, updates only the image, and invalidates the public news cache. Confirm the news card after refresh. This operation was **not executed** during this work. Repeating **이미지 재조회** uses the same metadata endpoints and may hit the same Production 403; bulk retries/forced collection are not a remedy.

For repeatable automatic recovery, SWNN must provide image metadata through an endpoint legitimately accessible from Production (or allow the existing requests through its supported operator process). Until such access is confirmed, report failures honestly and use the existing manual option where appropriate. Do not infer that this classification change solves access restrictions.

## Validation

- Starting-source regression reproduced in isolated Miniflare D1: HTTP 403 incorrectly counted as missing. Updated source: HTTP 403/429, request timeout, malformed REST/media JSON and invalid response shapes count as failures.
- `test:automatic-swnn-images`: **33 scenario groups PASS**, isolated Miniflare D1 + Mock Fetch, external/Provider outbound zero. Covers initial failure then recovery, RSS/REST/media/HTML, successful fallback after an earlier refusal, mixed article outcomes, shared RSS failure, bounded private-safe diagnostics, concurrent image/status changes, cursor rotation, exact/over request budget, total deadline/in-flight abort, lock, saved report and no duplicate article.
- PASS: image-recovery, metadata-recovery, collection, backfill (including SWNN weekly exclusions), collection-health, scheduled-collection (99 assertions), source-settings, admin-overrides, admin-ux, news-explorer, story-stack, public-performance, backup (939 assertions).
- Also PASS: ai-recovery (mock), localization, racing (512 full/summary pairs and event/immutable replay coverage). **17 relevant suites total**, including automatic recovery.
- TypeScript PASS; lint zero errors with the existing unused `debit` warning in `test-assistant-refund-safety.mjs`; build PASS; diff-check PASS.

## Release status

Canonical code/test/documentation publication only. **Production mutations/deployments/forced collection/recovery POSTs: 0. Actual Provider calls: 0. Credit changes: 0.** Production v93 / environment 62 / AI OFF / MAINTENANCE is the owner-reported baseline and was not changed by this work.

Deployment requires separate approval for the final commit/tree. After any later authorized deployment, observe the next natural collection; no manual collection should be triggered merely to claim recovery. Production automatic recovery success is **NOT VERIFIED** by these local tests. Prior Output Log Probe completion is unchanged; no marker deletion or repeat probe occurred.
