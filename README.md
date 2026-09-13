# HOLOCRON
Korean Star Wars news archive. Vinext + Cloudflare Worker + D1.

## Operations
The initial deployment is owner-private. Open `/admin`, sign in with ChatGPT and select the one-time initialization button. This permanently assigns the signed-in owner as the administrator and inserts the verified starter articles. Initialize before changing the Site audience to public. All management APIs enforce this stored user ID on the server and same-origin POSTs. Other identities cannot replace the admin.

Collection is manually initiated from the admin screen. Each source attempts RSS, then a bounded metadata crawl of its news index. Source blocks and failures are reported separately. No access restriction bypass or paid content extraction is attempted. Missing API credentials, publication dates, images, irrelevant content and summarization failures go into the recoverable review queue. Sources may change markup and require adapter maintenance.

Configure `OPENAI_API_KEY` as a hosted secret via the OpenAI Developers plugin; optional `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Never place keys in the client or repository. The initial six articles are manually researched Korean summaries, not API-generated. Runtime AI uses only available article metadata, returns bounded Korean summaries, and matches an existing topic only for the same event. It does not summarize a full article when only metadata is available.

Topic merging/splitting and exclusions persist in D1. The earliest known timestamp in a topic is its representative; timestamps are normalized to UTC. A date-only source cannot establish exact ordering within that day. Franchise is stored separately (`star-wars`) for future expansion; no other franchise feed is active.

Initial SWNN card uses an explicitly labeled related official Ahsoka image because the source page's own image metadata could not be retrieved. Article/image copyright remains with the original publishers.

## Validation
TypeScript and production build checked. Live API summarization requires a configured key. No scheduled collection is configured. New migrations are generated with Drizzle and shipped with the build.
