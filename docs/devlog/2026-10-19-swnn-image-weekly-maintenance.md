# 2026-10-19 — F.5A SWNN images and weekly roundup exclusion

Starting canonical: `be6965ab058291b107b5767201e400386829e5c7`.
Scope: canonical collection maintenance only; no deployment, production writes, collection POST, provider calls, migration, or evaluation authorization.

## Evidence and remaining uncertainty

Read-only Sites database overview and paginated `articles` reads on 2026-10-19 returned 177 articles, including 76 SWNN rows. Pagination followed server-returned offsets to null; this was a live, non-transactional observation, not a new backup or a preservation audit. SWNN: 72 nonempty image URLs, 4 empty image values. All four empty-image rows were published:
- 2026-10-18T20:42:23.000Z: https://starwarsnewsnet.com/2026/10/taika-waititi-says-his-star-wars-movie-is-back-on-hiatus.html (published; empty image)
- 2026-10-18T23:00:11.000Z: https://starwarsnewsnet.com/2026/10/more-smaller-scale-star-wars-games-on-the-way-following-the-success-of-galactic-racer-and-zero-company.html (published; empty image)
- 2026-10-18T22:00:24.000Z: https://starwarsnewsnet.com/2026/10/reign-of-the-empire-from-the-ashes-novel-synopsis-revealed.html (published; empty image)
- 2026-10-19T00:00:37.000Z: https://starwarsnewsnet.com/2026/10/this-week-in-a-galaxy-far-far-away-taika-waititi-speaks-two-unreported-star-wars-projects-emerge-and-more.html (published; empty image)

This confirms missing stored image metadata for these four rows, not a broken nonempty URL or browser rendering defect. No production recovery was run. The other 72 image URLs were not all fetched; their presence is not proof of browser load success.

A bounded public GET investigation using the existing HolocronNews User-Agent found:
- The Taika article above is in the current RSS (9 items); its item has no image element.
- Original REST query: HTTP 200, 7,550 bytes, Yoast og_image present, but no embedded media.
- Same query with `_links` added to `_fields`: HTTP 200, 14,108 bytes, embedded featured media present.
- Article HTML: HTTP 200, og:image present. Referenced JPEG: HTTP 200 / image/jpeg (72,469 bytes).
- The existing Yoast and generic HTML parsers already extract that URL. Thus the collection-time failure (request failure, temporary metadata absence, or another runtime condition) is **not established** by today's responses. No source error log from that original execution was available in this investigation.
- The web retrieval tool returned inaccessible/403 for SWNN; direct ordinary GETs from the executor succeeded without credentials, proxy changes, or security bypass.

The reduced public metadata fixture `scripts/fixtures/swnn-image-2026-10-19.json` records the observation time, source URL and response SHA-256s. It contains no full article body or production row dump. Synthetic failures are explicitly separate from observed metadata.

## Minimal image corrections

WordPress documents that `_embed` plus `_fields` requires both `_embedded` and `_links`:
https://developer.wordpress.org/rest-api/using-the-rest-api/global-parameters/#_embed

Add the missing `_links` field to the existing SWNN request. This repairs an independently reproduced embedded-media contract gap; it is not claimed as the cause of the four historical blank values. Yoast, Jetpack, numeric featured-media, attached-media and article HTML fallback remain in place.

Pass the existing bounded diagnostic callback through generic HTML enrichment. A final empty image now distinguishes HTTP status, timeout, generic request/parse failure and absent/invalid image metadata. No arbitrary exception, HTML, or invalid URL is put into the new diagnostic. `imageLookupFailures` counts failed lookup stages, not unique articles: REST failure followed by HTML failure is two. Existing maximum three distinct reason strings remains.

No new external request, retry, proxy or image storage is added. Worst-case per image-less candidate remains one REST post request, at most one media request, then one HTML fallback; each keeps the existing 15-second timeout. The added response fields increased this observed post response by 6,558 bytes and can avoid the media request. Candidates with images retain their image and skip SWNN REST. Bulk recovery still updates only empty images, including its concurrent manual-edit guard. Explicit individual/manual recovery behavior is unchanged.

No UI change: blank image values already use HOLOCRON ARCHIVE. A broken nonempty image in the browser was not reproduced; browser/cache faults and remote image onError behavior remain NOT VERIFIED.

## Forward-only weekly exclusion

The SWNN adapter owns `isSwnnWeeklyRoundup` through an optional source exclusion hook:
- Leading case-insensitive `This Week`, followed by end/whitespace/punctuation.
- Last article URL slug beginning `this-week-`, including a translated display title.
- Not `This Weekend`, `This Weekday`, a later title phrase, or a parent path segment.
- No rule on StarWars.com, Variety, Deadline or any other adapter.

Shared candidate queue applies it after URL/host and known-row checks, before the 12-new-article allowance and before metadata/AI/persistence. The processor checks it again if enrichment reveals a previously absent title, still before AI or persistence. A late-discovered title necessarily used metadata lookup; ordinary RSS/monthly URL/title exclusions use no processing slot.

Manual and scheduled collection both reach `runCollection` → `collect` → the same processor. Historical discovery also uses that queue/processor. Existing reports add a nonzero source-policy exclusion count; no new admin UI or setting. Review/Character Spotlight review policy, 90 days, 48-hour grouping, URL dedup, source enablement and manual decisions are unchanged.

Existing weekly rows are not touched. Read-only observation found six (three published / three excluded), rather than the older five-row snapshot:
- excluded: https://starwarsnewsnet.com/2026/09/this-week-in-a-galaxy-far-far-away-the-mandalorian-and-grogu-streaming-numbers-the-force-awakens-dethroned-and-not-much-more.html
- excluded: https://starwarsnewsnet.com/2026/09/this-week-in-a-galaxy-far-far-away-jon-watts-possibly-directing-star-wars-episode-x-mortis-gods-confirmed-for-ahsoka-season-2-and-more.html
- published: https://starwarsnewsnet.com/2026/10/this-week-in-a-galaxy-far-far-away-star-wars-publishing-announcements-new-york-comic-con-also-where-is-taika.html
- published: https://starwarsnewsnet.com/2026/09/this-week-in-a-galaxy-far-far-away-star-wars-to-be-released-in-large-formats-adria-arjonas-alternate-role-and-not-much-more.html
- excluded: https://starwarsnewsnet.com/2026/10/this-week-in-a-galaxy-far-far-away-galactic-racer-marvels-shawn-levys-new-deal-and-kathleen-kennedys-latest-spin.html
- published: https://starwarsnewsnet.com/2026/10/this-week-in-a-galaxy-far-far-away-taika-waititi-speaks-two-unreported-star-wars-projects-emerge-and-more.html

Any removal from the public archive is a separate owner decision. Neither the filter nor image investigation reclassifies these rows.

## Validation

- PASS: collection, backfill, image-recovery; includes observed metadata plus synthetic RSS/REST/embedded/media/HTML fallback, 403/429/timeout, invalid URLs, zero-post responses, fixed diagnostic privacy, successful/failed recovery, unchanged manual images and guarded bulk updates.
- PASS: primary/monthly/historical weekly exclusions have zero mocked AI and persistence calls; 12 normal candidates retain their allowance, excess normal candidate is deferred. Other sources and known rows remain unchanged.
- PASS (12 focused suites total): collection, backfill, image-recovery, collection-health, metadata-recovery, ai-recovery, source-settings, scheduled-collection, admin-overrides, stories, news-explorer, story-stack.
- Metadata-recovery initially failed its two assertions expecting only one image failure (counter and rendered report). Updated them to require both REST post-zero and HTML HTTP 403 diagnostics; all existing publication/metadata/SQL preservation assertions retained and passed.
- PASS: lint (zero errors; one pre-existing unused `debit` warning in test-assistant-refund-safety.mjs), TypeScript, build, git diff --check. No workflow changed. Whole CI and browser QA not rerun; no UI changes.
- No real Provider calls. No production browser/session initialization or production mutation.

## Evaluation revision boundary

No evaluation manifest, corpus, cases, rubric, approval, journal, PC D1, model, prompt, or validator changed. Pipeline/tooling/corpus/cases/rubric hashes remain pinned; the aggregate runtime hash includes all `lib`, so collection changes intentionally invalidate E.5B live integrity:
- pinned runtime: `5eceed3e369e8284d6c5aba448b73805c386900fad79fae9aaba77e55165e77f`
- current runtime: `53cf576efd0a20afd7bb5196d6fd6153d39bae96e929e8e547f7a6b52a6f508e`
- Direct keyless integrity check: expected `MVP_LIVE_INTEGRITY_FAILED`; no bypass or rehash.

PASS: 132 historical E.5B handoff mock assertions, real Provider outbound ZERO. The historical E.5B mock suite was validated separately at its exact `be6965a` checkout, never represented as current live evaluation acceptance. Existing user PC five-attempt history is untouched and was not re-audited here. Do not run the pinned handoff on the changed runtime or silently bless a new hash.

## Before a future deployment

Normal separate deployment approval is required. Use the existing isolated QA path if broader release validation is needed; this change has no UI or workflow change. After approved deployment, observe collection diagnostics and use the existing administrator image-retry/manual/bulk controls only with an explicit production action authorization. Confirm source accessibility from the deployed runtime; this executor's HTTP success is not that acceptance. Existing blank images and published roundups remain until separately authorized maintenance. No promise of permanent external image availability.
