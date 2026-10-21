# SWNN automatic missing-image recovery

- Starting canonical: `4cebb06e3eebf63486f53103d232794c83120f01` (fresh fetch).
- Scope: collection maintenance only; no Production access/mutation/deploy, Provider calls, schema changes, or evaluation approval changes.
- This record is published with the implementation commit. The final canonical SHA/tree are reported after remote verification, rather than embedded self-referentially here.

## Confirmed gap and limits of the diagnosis

`processSourceCandidates()` queues only new URLs. An article saved with an empty image is subsequently a duplicate, so ordinary collection never enriches it again. Manual missing-image recovery already shares the RSS/WordPress/media/HTML enrichment path. These code facts explain the missing automatic retry opportunity; they do not establish why a particular Production first lookup failed. No live SWNN request or Production collection was triggered for this work.

## Change

The shared `runCollection()` runner awaits a bounded SWNN recovery after collection and before health/report persistence and lease release. Manual and scheduled routes use this runner and already invalidate the public news cache after it returns. Disabled SWNN skips this phase. Recovery errors produce a safe report and do not discard successful collection results.

- Query only `Star Wars News Net`, empty image, published articles in the existing rolling 90-day calendar cutoff. Review/excluded articles and conflicting manual status overrides are untouched.
- Up to **3 articles/run**, **10 external requests total** (including redirects), **30-second phase deadline**. Each lookup retains the existing maximum 15-second abort signal, shortened to the remaining phase time. Same-source redirects are counted, capped at two per lookup; cross-source redirects fail safely. No automatic transport retries.
- Deadline is also capped at collection lease expiry minus **15 seconds** for D1 bookkeeping/health/report/release. Less than one second of available time skips recovery. An exhausted deadline/request budget defers work. All work is awaited; no timeout race leaves detached writes running after release.
- D1 statements themselves are platform operations and cannot be cancelled by the fetch abort signal. The phase checks deadlines before further lookup/image writes and keeps the finalization buffer; this is not a claim that a hung platform D1 operation has a hard wall-clock guarantee.
- A bounded cyclic ID cursor in the existing `settings` table (`collection_swnn_image_cursor_v1`) prevents persistent missing-image articles from starving other candidates. The cursor advances after an attempted article; no article fields are used for retry state. No migration.
- RSS is fetched once, then the existing SWNN WordPress/embedded/featured-or-attached-media/HTML paths are reused via an injected bounded fetch. Existing manual retry and other sources retain their default fetch behavior.
- The final SQL rechecks source, date, publication/manual status and `image=''`. A concurrent administrator image/status change wins. Only `image` is changed, never title/summary/topic/status/reason. No article insertion, AI processing or Story grouping is part of recovery.
- Safe aggregate counts and fixed/sanitized diagnostics appear in the existing collection report, including deferred and concurrently changed rows. No new UI.

New articles saved without images and older duplicate URLs are both eligible. This does not promise all missing images recover in one run or overcome source outages; unsuccessful eligible articles rotate into subsequent runs. Existing manual recovery remains available.

## Verification (current source, synthetic inputs)

- `pnpm test:automatic-swnn-images`: **17 scenario groups PASS**, real isolated Miniflare D1 and mock fetch. Initial missing metadata then recovery; RSS/REST/media/HTML; old stored articles; HTTP 403/429/timeout/no image; normal/manual image preservation; publication race; all-field preservation except image; cyclic progress; three-article/ten-request limits; redirects; deadline and in-flight abort; idempotency/no extra article; real D1 collection lease across manual and scheduled runs; saved report.
- `pnpm test:scheduled-collection`: **99 assertions PASS**, including both triggers retaining the same lease during recovery, concurrent-run rejection, low-lease deferral, disabled source and isolated recovery failure.
- Also PASS: image-recovery, collection, collection-health, backfill, metadata-recovery, ai-recovery, localization, admin-overrides, admin-ux, news-explorer, story-stack, public-performance, source-settings. **15 suites total** including the two above.
- Existing SWNN `This Week` exclusion/12-new-article allowance, manual image tools and news cache invalidation paths remain covered.
- TypeScript PASS; lint zero errors (one pre-existing unused `debit` warning in `test-assistant-refund-safety.mjs`); build PASS; diff-check PASS.
- Real Provider/outbound calls: **0**. No private WSL state or evaluation manifests/journals were accessed or changed. Collection `lib/` changes alter the broad evaluation runtime fingerprint; historical pinned live revisions must not be rehashed or reused for this new tree. No historical/live evaluation was run.

## Release handoff

Canonical only. Production remains unmodified by this work. The change can join the pending AI GO-LIVE runtime deployment, but the deployed tree must be this newly verified tree (or a subsequently reviewed successor), not the previous preflight tree. Retain v7 backup validation, 0019/D1/environment checks and the existing separate deployment approval. No migration, scheduler interval, Secret, Assistant/Credit/Account policy or news editorial state change is required.

After an authorized deployment, observe natural collection reports and cache-refreshed news images. Operational recovery/live UI acceptance is **NOT VERIFIED** here; do not trigger Production collection or recovery just to claim it.
