# HOLOCRON
Korean Star Wars news archive. Vinext + Cloudflare Worker + D1.

## Operations
The initial deployment is owner-private. Configure the server-only `HOLOCRON_ADMIN_USERNAME`, `HOLOCRON_ADMIN_PASSWORD`, and `HOLOCRON_ADMIN_SESSION_SECRET` values, then open `/admin/login`. Login is verified server-side and management pages and APIs require the signed, HttpOnly administrator session cookie. Missing configuration fails closed. Legacy `settings.admin`, `admin_identity_v2`, and ChatGPT identity rows are not authorization inputs.

Collection is manually initiated from the admin screen. The seven-source pipeline uses the StarWars.com news index, five public RSS feeds, and the Forbes news sitemap through explicit adapters. Each source and article is isolated, normalized URLs are skipped incrementally, and only the first 12 new candidates per source are processed in one run; remaining candidates are reported and picked up by later runs. No access restriction bypass or paid content extraction is attempted.

StarWars.com and Star Wars News Net are trusted franchise sources. Collider, The Hollywood Reporter, Deadline, Variety, and Forbes must explicitly mention Star Wars in feed or page metadata. Articles older than 90 days are dropped. Review and Character Spotlight content is placed in the recoverable review queue before AI processing, as are missing or ambiguous publication dates, metadata failures, invalid Korean AI output, and unavailable OpenAI processing. A one-time, override-safe maintenance pass also moves legacy published editorial items to review, but never changes an explicit administrator publish decision. It runs on the first authorized administrator-state load as well as collection, then records a completion marker. Source-level counters and failures are stored in `last_collection`; source markup can still change and require adapter maintenance.

Configure `OPENAI_API_KEY` as a hosted secret via the OpenAI Developers plugin; optional `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Never place keys in the client or repository. The initial six articles are manually researched Korean summaries, not API-generated. Runtime AI uses only available article metadata, returns bounded Korean summaries, and matches an existing topic only for the same event. It does not summarize a full article when only metadata is available.

Topic merging/splitting and exclusions persist in D1. Automatic processing never overwrites `topic_override` or `status_override`. The earliest known timestamp in a topic is its representative; full timestamps are normalized to UTC, while date-only values remain date-only because their time is unknown. Franchise is stored separately (`star-wars`) for future expansion; no other franchise feed is active.

Initial SWNN card uses an explicitly labeled related official Ahsoka image because the source page's own image metadata could not be retrieved. Article/image copyright remains with the original publishers.

## Validation
Run `pnpm test:collection`, `pnpm test:admin-overrides`, and `pnpm test:stories` for deterministic domain regressions. Live API summarization requires a configured server-side key. No scheduled collection is configured. New migrations are generated with Drizzle and shipped with the build.
