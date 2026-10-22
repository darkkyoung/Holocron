# SWNN / Forbes collection health investigation

Starting canonical: `b70fd2cb5472428f325289ce1a86e14a6a516f73` (tree `00b68a2c5eef7c8359ec90cdd4697662432ae9b8`). Separate from the Control Room navigation commit. No Production deployment, DB writes, manual collection, Scheduler dispatch or Provider call.

## Evidence and limits

The owner reported the 2026-10-22 08:23 KST run: SWNN discovered 9, inserted 0, backfill failures 2, consecutive failures 13; Forbes discovered 510, inserted 0, backfill failures 2, consecutive failures 7.

Read-only Production settings confirm the SWNN figures at `2026-10-21T23:23:46.550Z`, primary 9 / backfill 0 and `보완 탐색 2건 실패`. The bounded settings response truncates later source details, so the Forbes full snapshot was not independently reread. No arbitrary SQL or alternate privileged endpoint was used to recover it. Two bounded Worker log reads (24h, errors first, then surrounding events) contained no collection invocation; they do not prove no run occurred. GitHub's workflow-specific run URL was rejected by the connected read API, so no Actions execution log is claimed.

Code confirms that `sourceFailure || primaryFailure || backfillFailures > 0` increments the combined failure streak. Two consecutive failures are DANGER. No-new-article alone is not failure: successful discovery of already-known URLs remains healthy. The generic backfill error in the last SWNN record is chosen only when no primary/source error was reported. Discovery produced endpoint + sanitized error strings, but `processSourceCandidates` retained only their count. Existing run/Health persistence therefore cannot reconstruct the past failing HTTP request(s).

### Bounded external probe (Work container, NOT Production)

One ordinary GET per URL, existing `HolocronNews/2.0 (news metadata reader)` User-Agent, 15s timeout, no credentials, proxy changes or retries. UTC `2026-10-22T04:35:05Z`–`04:36:15Z` (13:35–13:36 KST).

| Path | Status / parse | Redirect/final URL |
|---|---|---|
| SWNN `/feed` | 200, RSS XML, 9 items | same |
| SWNN `/2026/10/feed/` | 200, RSS XML, 9 items | `/2026/10/feed` |
| SWNN `/2026/10/feed/?paged=2` | 200, RSS XML, 9 items | `/2026/10/feed?paged=2` |
| SWNN `/2026/09/feed/` | 200, RSS XML, 9 items | `/2026/09/feed` |
| SWNN `/2026/09/feed/?paged=2` | 200, RSS XML, 9 items | `/2026/09/feed?paged=2` |
| `www.forbes.com/news_sitemap.xml` | 200, XML urlset | same |
| `feeds.forbes.com/sites/jimdobson/feed/` | 403 | same |
| `feeds.forbes.com/sites/joshweiss/feed/` | 403 | same |

The author URLs were derived from existing publicly sourced Forbes article URLs, without copying private account data. A bare 403 does not identify anti-bot, geo restriction or origin policy. No alternate URL or bypass was attempted.

**SWNN historical Production failure cause: UNKNOWN.** Current external RSS parsing works; possible historical HTTP/timeouts are not established. **Forbes historical Production failure cause: UNKNOWN; current Work author-feed HTTP 403 is CONFIRMED only for this probe.** It is consistent with supplemental-path failure but not proof of all seven historical failures. The exact Production redirect/status/response for either source was not retained.

## Minimal confirmed-code fix

No source adapter/endpoints/parser/request limits changed. SWNN's four rolling archive-request maximum, Forbes's two rolling author feeds, existing historical bounds, duplicate protection, weekly-roundup exclusion, metadata enrichment and automatic image recovery are preserved.

`processor.ts` now retains at most 4 backfill error summaries, each <=300 characters, and includes them in the source report. These originate in Discovery's existing fixed HTTP/timeout/request-or-parser categories plus adapter-selected public URLs; response bodies, request headers and arbitrary caught error messages are not added.

`health.ts` adds optional stage diagnostics within the existing operational v1 snapshot: explicit primary/backfill outcome, request count, bounded error summaries and separate most-recent success times. Combined streaks, overall danger thresholds and last fully healthy time are unchanged. A whole-source throw with incomplete request statistics is labeled backfill UNKNOWN, never invented as successful. Old rows remain readable with details marked unretained; no retrospective success times or split historical streaks are fabricated.

The Health panel shows primary RSS/Sitemap vs supplemental discoveries, complete/partial supplemental failure, primary failure, disabled source, last success per path, and the combined nature of the failure counter. Repeated Backfill failures remain DANGER, never silently HEALTHY. Zero new articles is not displayed as a fetch failure.

No D1 schema/migration, durable backup contract or settings allowlist changed. `collection_source_health_v1` remains excluded operational state. New diagnostics are written only by the existing normal runner after a future separately approved deployment; this Work did not write Production state.

## Validation

Current synthetic tests cover primary success/backfill403, inverse primary503/backfill success, all-source failure, HTTP429/timeout/malformed feed, safe error categories, bounded requests/reasons, repeated DANGER/recovery, old snapshot roundtrip, disabled isolation and success timestamps. Actual SWNN/Forbes adapters + discovery + processor with known URLs produce zero insertions / zero AI work while preserving diagnostic reasons. Existing mocks/local SQLite suites cover new ingest, duplicates, source isolation, weekly exclusion and image recovery.

PASS: collection-health, collection, backfill, metadata/image/automatic-SWNN-image recovery, scheduled collection, source settings, admin auth/rate-limit/overrides/UX, AI recovery, stories/story-stack/news-explorer/news-work, backup, Racing, site visibility, Account Assistant, Quiz, Works, Google Account, Guest rewards, announcement. TypeScript / lint / build / diff-check PASS; lint has one unchanged unused-test-variable warning. Browser tests use real components with synthetic state, not Production source observations.

## Follow-up

Production remains v89 / environment55 /0020, AI OFF / PUBLIC. Post-release v10 backup preservation audit is still pending and is not replaced by these tests. Complete that audit and obtain a separate deployment approval before shipping this code. At the next normal scheduled collection, retained stage errors can establish the exact failing paths/status category without a forced collection. Existing sources remain enabled according to their original settings. Do not claim the external collection incidents are fixed until actual normal-run evidence supports it.
