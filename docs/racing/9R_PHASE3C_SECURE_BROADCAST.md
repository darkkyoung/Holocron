# Phase 3-C: isolated server-authorized broadcast

Base: PR #5 c761cc1cf7a02f32500e0548c7acadaa1a724087. No deployment configuration, operational database migration, public stage secrets or change to engine rules.

## Viewing contract

Open /racing for the most recently started qualifying session, or /racing?race=<sealed race ID>. The viewer renders a lightweight Vesper track map, official sampled positions, standings, qualifying, grid/preshow, effects and the podium. This is a minimum live viewer, not the 3D offline replay player. Refresh and reconnect resample server time. The viewer never estimates the official clock from the PC wall clock. When disconnected it retains its last frame and labels it stale. Only finalized races support replay cursors and the completed-race archive. Replay uses elapsed monotonic time for playback, but the server validates the cursor. No playback request changes official state.

Public Vinext route → private snapshot service binding → isolated D1 and private encrypted R2. The gateway passes only the query string to a fixed service URL, never viewer credentials or clock headers. Only bounded, explicitly projected fields leave the reader; no manifest, seed, ciphertext references, race length derived from a future outcome, or full record. The internal cache holds at most two decoded immutable stage records per bucket; cached records are projected again using the request's approved time. Do not expose the reader, vault or beacon namespaces over public routes. No SSE or WebSocket publication path is installed. Premiere projection uses no-store on success and error, including CDN-specific headers. No shared-CDN certification is implied.

Qualifying samples are truncated to elapsed time; only completed valid laps count. Final grid becomes visible at the grid announcement. Preshow starts at officialStart−120s; it uses qualifying only. Main generation remains prohibited until officialStart. Before private commit the route reports WAITING; once ready the viewer joins at server elapsed time. Hyper charge opens at T−3000ms, Gold at T; no future endpoint/power/outcome. The podium uses the existing ceremony release clock: provisional, investigation, evidence, reclassification, podium re-entry, final. Points and unrestricted archived seeking require both durable FINAL state and the final time boundary. Entrant identities are read from the sealed manifest, never today's profile directory.

## Isolated adapters

Runner entry lib/racing-broadcast/runner.ts: scheduled delivery derives due work from server time, retaining the 3-A lease and same-input retry. Bind only RACING_ISOLATED_DB, RACING_PRIVATE_OBJECTS (private R2), RACING_SEAL_KEY (private AES-256 secret), RACING_BEACON (read-only to runner) and RACING_BEACON_PUBLIC_JWK. Each contribution is an ECDSA/P-256 SHA-256 signature over canonical {ref,value}; wrong reference/key/signature or absence fails closed. Signer is separate and not present in either viewer bundle or runner. The test authority is synthetic: independent public beacon selection, attested rounds, key custody/rotation, non-equivocation and operational approval remain outstanding. The reader needs no entropy binding. App route requires RACING_BROADCAST_READER service binding; disabled without it.

No live cron was installed. Production tick granularity, delivery jitter, staging auth, actual CDN/cache behavior, resource ceilings and multi-region capacity need independent verification. The current reader decrypts the entire private artifact on its first read. Before high-concurrency launch benchmark isolate memory and consider authenticated private time chunks instead. On missing entropy or missed grid, do not fabricate a race. On irrecoverable incident retain existing audit and cancellation procedures.

## Reproduce

With locked root/prototype dependencies: run node --import ./scripts/sites-env.mjs scripts/test-racing-phase3c-runner.mjs for Miniflare D1/R2/KV, strict schedule, signature and latency; node scripts/test-racing-phase3c-http.mjs for real loopback HTTP; append --browser for installed Chrome on Ubuntu/Windows. The browser uses the actual viewer and gateway/reader over HTTP against private curated fixtures; not a hosted production test. After pnpm build, run node scripts/test-racing-phase3c-assets.mjs. CI archives timing samples and browser screenshots.

Latency epochs use a controlled scheduled delivery at the official start. Cold reader means first decoded-artifact cache miss, warm reader means the next viewer in the same isolate; neither is a measured production process cold start. Report cumulative elapsed to milestones, including independent contribution and verified seed, simulation, encrypted output, private write, readback verification, commit, and response. Cron queue lag and real provider/network RTT are excluded. 21:00:00 exact first moving frame is PARTIAL by design. Earlier sealed generation after 20:55 would need a separately approved entropy, operator-access and disclosure policy; it is not enabled.

Release gates: journal/backup verification and separate restore drill remain BLOCKED. No operating migration, main merge, Credit, AI, prediction market or production scheduler. Until deployment gates pass, an explicitly approved read-only finalized replay can use the same allowlist, sealed mapping and FINAL checks with the live route disabled; do not expose offline full JSON or represent that fallback as live.

### Run an integrated local broadcast

Install the repository's pinned dependencies. From the repo root run:

    node --import ./scripts/sites-env.mjs scripts/racing/preview-phase3c.mjs

Open the printed loopback URL. This generates a real sealed ten-lap meeting using temporary Miniflare D1, private R2 and signed test contributions. The isolated clock initially points five seconds before the two-minute preshow; qualifying has already been generated. Pass --qualifying to start at the beginning of qualifying instead. Closing the process discards the rehearsal. --smoke accelerates the wait to the official start and verifies the first frame over HTTP; it never speeds up or reseeds the actual race. The actual application HTML/RSC and service binding are separately exercised with test-racing-phase3c-shell.mjs.

In the isolated reader, setting RACING_BROADCAST_MODE to final-only disables live snapshots even for explicit race IDs. Archived playback still uses the same DTO; no raw replay is downloaded.
