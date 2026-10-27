# SWNN source-category Other exclusion

Starting canonical: `8d28ee71b906688ded4df23f96e9f31f94d8ea89`, tree `3abadb9a08cb3f80ea1277b4900e26f1ac969234`. Fresh Git fetch and the GitHub main ref agreed. This change is canonical-only, not a Production release.

## Public metadata evidence and limits

On 2026-10-27, ordinary read-only GETs to the existing primary endpoint `https://www.starwarsnewsnet.com/feed` and current monthly endpoint `https://www.starwarsnewsnet.com/2026/10/feed/` both returned HTTP 403 in Work. Web retrieval was also unable to read these feeds. The first-party `https://www.starwarsnewsnet.com/category/other` page is indexed as **Other Archives**, but opening its body returned 403 too.

This establishes an indexed first-party category, not a fresh raw-feed sample. The current live `<category>` representation, use of CDATA/entities, multi-category items, and RSS-versus-HTML agreement remain **NOT VERIFIED**. No cookies, alternate proxy, header impersonation, or access-control workaround was used. Production's earlier 403 evidence is unchanged.

Tests below are explicitly synthetic RSS fixtures, not purported SWNN captures. The implementation acts only on explicit RSS item category values actually received; it never assigns Other from a title, description, URL slug, internal Korean category, or absence of source metadata. No HTML/REST taxonomy fallback or additional request was added. A successful future authorized feed observation should confirm the raw representation; missing category metadata continues through the existing policy and does not constitute a verified non-Other classification.

## Implementation

- `Candidate.sourceCategories` is optional, transient source metadata. It is separate from the persisted HOLOCRON category (including `기타`). No API, database, Migration 0020, or Backup v10 change.
- The shared RSS parser reads direct item `<category>` text, handles XML entities and CDATA, and retains multiple values. CDATA literal markup, comments, and nested article content cannot masquerade as category elements. Atom parsing is unchanged.
- `mergeCandidateMetadata` unions known values from both discoveries. An empty later feed cannot erase a known category; both Primary-to-Archive and Archive-to-Primary combinations retain Other. Existing discovery request/candidate bounds remain unchanged.
- Only the SWNN adapter's `excludeCandidate` uses these values: `trim().toLowerCase() === 'other'`. Partial strings, prose, Korean `기타`, and other source adapters do not trigger this rule. Existing This Week title/slug exclusion remains in the same predicate; one candidate counts once.
- The existing shared `queueSourceCandidates` invokes the predicate after URL/known-record checks and before processing slots, WordPress/media/HTML enrichment, AI topic assignment, and D1 insert. `sourceExcluded` supplies existing reporting. No duplicate filter was added to discovery or processor.
- Known stored articles continue to count as duplicates. This change does not delete, reclassify, regroup, or edit them, including manual overrides and images. Existing image recovery remains independent and unchanged.

## Validation

`pnpm test:swnn-category`: **17 scenario groups PASS**, real discovery/queue/processor/repository with isolated Miniflare D1 and a Mock AI boundary. Covers exact/mixed-case/whitespace categories, CDATA, decimal/hex XML entities, multiple categories, missing categories, prose and partial-string negatives, nested markup, empty XML elements, every other adapter, This Week, and duplicate-category union in both normal and historical discovery.

Primary and monthly endpoints each exercise both normal and historical modes. Other-only candidates produce **zero processing attempts, metadata fetches, AI calls, and article inserts**. Fifteen excluded candidates followed by thirteen valid candidates still allocate all twelve processing slots to valid candidates, leaving one deferred. Mock AI's Korean `기타` result is stored normally. An already stored Other candidate with administrator overrides remains byte-for-byte unchanged in D1. External/Provider outbound: **zero**.

Related regressions PASS: collection, backfill, metadata-recovery, image-recovery, automatic-swnn-images (including 403/429 failure classification, conditional writes, cursor, lock/cache and 3-article/10-request/30-second bounds), collection-health, scheduled-collection, source-settings, admin-overrides.

TypeScript PASS. Lint: zero errors; existing unrelated unused `debit` warning in `scripts/test-assistant-refund-safety.mjs`. Build PASS. Final diff check PASS.

## Existing articles and operations

An authoritative list/count of stored SWNN Other articles is **NOT DETERMINED**, not zero. The existing D1 schema does not retain source taxonomy, and the live feeds/article taxonomy could not be read. Internal `기타` is not a substitute. No Production article scan was used to infer categories and no existing-article mutation is included.

Production remains outside this change: no deployment, forced collection, image reprocessing, Credit/Account changes, Provider calls, AI activation, Migration/Restore, MAINTENANCE change, or Output Log Probe operation. Production baseline last confirmed by the previous release is v94 / environment 62 / AI OFF / MAINTENANCE.
