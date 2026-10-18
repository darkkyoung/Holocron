# Phase 9D-F.2 — Collection reliability and hidden latest Stories

## Evidence and scope

Starting canonical main: `40dc31804cb3d14be3cb13441057472737f21c8c`.
This is canonical implementation/local verification, **not a Production fix deployment**.
No collection POST, live AI request, article mutation, migration, secret change or source activation was performed.

Read-only supported Sites Article/settings projections on 2026-10-18 showed six enabled sources (StarWars.com, SWNN, THR, Deadline, Variety, Forbes); Collider remained disabled. No Credit/auth/user rows or backup were read for this investigation. The reported manual run completed on 2026-10-18 with SWNN 18 discovered / 18 duplicates / 0 inserted. That is consistent with already-stored URLs, not proof of discovery failure.

### The two reported articles

Both are stored, Korean-localized, `published`, with no status/title/topic override on the individual row:

| Article | Public source URL | Stored publication UTC | Existing Story anchor |
| --- | --- | --- | --- |
| Jon Watts developing another series | https://www.starwarsnewsnet.com/2026/10/jon-watts-was-reportedly-developing-another-star-wars-series-earlier-this-year.html | 2026-10-16 21:41:44 | 2026-09-27 film/director reporting, seven published members |
| Biddy Blas actor interview | https://www.starwarsnewsnet.com/2026/10/biddy-blas-actor-talks-bring-star-wars-galactic-racer-character-to-life-and-becoming-an-internet-sensation.html | 2026-10-16 20:17:56 | 2026-10-02 game score/launch reporting, six published members |

The first timestamp is October 17 in Korea. `buildStories` groups by stored topic, chooses the oldest representative, and sorts by that representative. These later articles therefore do not create latest standalone cards. This is a verified stored-grouping/presentation explanation; it is **not** evidence that RSS omitted them, URL normalization conflated them, or they are review/excluded. The historical AI response that chose those topics is unavailable, so its exact reasoning is unconfirmed. Some older film members have manual grouping overrides; none were changed.

Existing incorrect grouping remains in Production and requires an explicit editorial split through the existing admin workflow if desired. This task does not silently rewrite it. Live public browser/cache rendering was not independently tested; the explanation uses actual stored rows plus the current projection implementation.

## First-party source checks

Bounded public GETs (15-second timeout, no access-control bypass) and current parsers:

| Source | Observed primary | Supplemental check / limitation |
| --- | --- | --- |
| StarWars.com | HTTP 200, 46 unique index candidates | Some cards have no date; existing article metadata enrichment/review remains necessary. Current index is not a complete 90-day archive. |
| SWNN | HTTP 200, 9 RSS items including both reported articles | October page 1 and page 2 responded; page 2 contains older items. Public WP REST also contains both URLs/dates. No discovery REST request added because RSS already has these articles. |
| THR | HTTP 200, 10 feed items; newest observed Oct 9 | October article sitemap HTTP 200, Star Wars URLs present. Feed age alone does not prove missing reporting. |
| Deadline | HTTP 200, 12 feed items; newest observed Sep 27 | October article sitemap HTTP 200; no `star-wars` slug observed. Complete keyword-free coverage is not established. |
| Variety | HTTP 200, 10 feed items; newest observed Oct 16 | October article sitemap HTTP 200, Star Wars URLs present. |
| Forbes | HTTP 200, 122 news-sitemap candidates (not all relevant) | Existing Paul Tassi author RSS timed out in this probe. Source coverage remains limited; no retry or bypass. |

These are point-in-time responses, not an assurance that upstream feeds contain every article. Actual production processing of newly fetched candidates was not executed. Fixture `scripts/fixtures/collection-2026-10-18.json` records public title/URL/date/image projections and endpoints; descriptions are explicitly synthetic. It contains no private database export. Parser envelopes in tests are reconstructed, not claimed to be complete raw response captures.

## Corrections

- SWNN normal rolling discovery queries page 1/2 of the current month and, when the 14-day window crosses a month, page 1/2 of the previous month. Previously only the oldest month was selected. Current-month first; maximum four supplemental requests, otherwise two. Other adapters retain their two-request normal cap; historical cap remains six.
- Primary fetch/parse failure no longer prevents permitted supplemental discovery. Partial paths retain an explicit failure/limited status. If primary and every supplemental path fail, source failure is explicit. Feed/sitemap parsers reject HTML/error formats rather than silently treating them as empty feeds.
- Stop archive requests at the 100-new-candidate cap; later pages cannot add beyond it. Expired dates are rejected in rolling discovery, while uncertain dates still reach existing review validation.
- Automatic topic matching now receives bounded summary/date context and explicit event distinctions. Only topics anchored within seven days of the incoming article are eligible; the earliest published member anchors the window, preventing chains of updates from extending it indefinitely. Missing/invalid dates fail closed to a new topic. The existing output validator rejects a model-selected topic outside this set.
- This conservative automatic window prevents the observed older groups from absorbing the two article types. It can separate genuinely late reporting; the existing manual merge remains available. It cannot prove semantic equivalence within seven days. No historical regrouping, representative/order change or manual override change.
- Admin run report distinguishes new URL candidates and already stored published/review/excluded articles, explains that published articles may be inside an existing Story, and exposes limited coverage during normal collection too.
- Primary/supplemental failures mark the run partial and source health warning; total source failure marks the run failed and scheduled endpoint returns HTTP 502. Authentication, schedule gate, shared lock and cache invalidation remain. The Actions workflow itself is unchanged; HTTP failure now cannot masquerade as successful collection.

## Cost and preservation

At most two additional public RSS requests on SWNN month-boundary runs; none on single-month runs. Existing 15-second fetch timeout, 12 new articles/source, deduplication before AI, 25-second collection AI deadline and one collection processing call/article remain. No AI reprocessing of known URLs. Topic context adds at most 160 summary characters plus a date for each of at most 100 eligible candidates; actual token/cost impact was not measured with a provider and is not claimed zero. No new provider call type, dependency or source.

No schema, 0016–0019, backup v7, Credit/Account, Assistant generation/evaluation manifest, source enablement or schedule changes. This does not resolve or approve the separate 0019 hosted deployment gate. Production remains unchanged; AI activation is not part of this task.

## Verification

- Executable collection tests: captured A/B metadata, distinct normalized URLs, old-primary supplementation, primary failure recovery, complete access failure, malformed response format, month/year boundaries, candidate ceiling, automatic grouping eligibility and rejection of an ineligible model topic.
- Shared processor tests: known published/review/excluded URLs skip insertion/AI; diagnostics distinguish their states; review and AI failure policies remain.
- Shared run/route tests: manual service executes `runCollection('manual')` and invalidates cache; scheduler executes the same runner under existing authentication/schedule rules; partial vs total failure observable; lock regression retained.
- Full validation results recorded after completion below.

NOT TESTED: live collection AI semantic quality, new Production collection/storage, rendered admin browser, hosted runtime behavior after this change, complete upstream coverage. No paid provider calls were made.

### Final local results

- All 59 registered `test:*` commands were attempted: 57 PASS, 2 FAIL. Of the 58 non-browser suites, **57 PASS / 1 FAIL**. All collection, backfill, source settings, scheduled collection, health, metadata/image/AI recovery, localization, archive/Story/presentation, admin/auth, current Credit/Account/Assistant/Backup regressions passed. Targeted tests were rerun after the final assertions; scheduled/manual suite has 82 assertions.
- Unrelated historical `test:assistant-evaluation-revision` failed its existing `expiresAt - ceil(file.mtimeMs) <= 86400000` assertion at line 124 in the frozen implementation checkout (`2ec1a2b…`). Neither the test nor its implementation/campaign/retention contract was changed. This execution does not establish why the filesystem/clock comparison exceeded the bound. Do not report a full-suite green result.
- `test:assistant-browser` failed before browser scenarios: local `/assistant` HTTP 500, `D1_ERROR: no such table: settings`; static favicon served HTTP 200. The isolated browser database was not initialized by this bare package command. No browser acceptance is claimed; no Production fallback or browser infrastructure change was attempted.
- `pnpm lint`: PASS, existing unused `debit` warning in refund-safety test only. `pnpm exec tsc --noEmit`: PASS. `pnpm build`: PASS. `git diff --check`: PASS.
- Real provider calls: ZERO. Production collection/deployment/mutation: NONE. No workflow dispatch performed.

Canonical correction is ready for review; Production is unchanged. Deployment remains separately authorized and subject to the existing 0019/v7 release preflight. The historical test failure and browser NOT TESTED scope remain explicit, rather than turning this into an unrelated evaluation or deployment task.
