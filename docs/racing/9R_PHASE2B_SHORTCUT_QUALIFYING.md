# Phase 2-B — v0.5 spatial shortcut and qualifying broadcast

Base: `f74f5ed093cf6615516441e183771731fdbccb33`, Phase 2-A.
Branch: `feature/galactic-racing-phase2b-shortcut-qualifying`.
Main/Production/DB/Credit/AI untouched. No Provider calls.

## Implementation

- `lib/racing/v5`: new version `galactic-racing-0.5.0`. Existing v0.1–v0.4 rules and golden fixtures remain. The shared integrator has an optional physical-travel adapter; historical calls take their unchanged path. The existing v0.4 ceremony/result assembly is reused through `v2/meeting.ts` without changing its RNG or output.
- Vesper branch: main-route arc-length samples are fixed from the existing Catmull-Rom track, with a tangent-aligned, arc-length-sampled cubic branch at 20% → 40% of each lap. The same samples drive simulation geometry, cars, cameras and minimap. No new physics engine. Main-equivalent ranking progress increases continuously according to actual route length; the old instantaneous shortcut distance reward is disabled only in v0.5.
- At each real entry crossing: independent seeded stream per racer; success probability 42% at P1 through 52% at P8. Failure keeps the main route without forced accident. Entry/result/merge events and fractional timestamps are recorded. A successful racer retired before merge remains on that route; no fabricated merge.
- Track can disable branches. No branch events on the main-only track. Qualifying always uses the main route.
- Qualifying reuses the lap-time engine: 10s preshow, 3 × 8 staggered starts, 12s results after **all eight** finish, 10s final grid. Round start order remains round robin. Each valid personal best highlights for 2s plus 0.6s fade derived from record timestamps, including replay/seek.
- Precomputed qualifying camera cues: chase/front/side/wide, incident/new-best/record-pace/last-finisher priority, 4s minimum hold and 8s routine coverage. No director sorting in the render loop.
- Local manual results pause the playhead and use a five-minute wall-clock deadline. Manual click and timeout share an idempotent gate. Seeking resets only local presentation gates, never Seed/results. Continuous playback selects the next existing replay, without recomputing a meeting.
- Fixed future schedule is 20:00 qualifying / 20:55 cutoff / 21:00 race KST. A pure schedule contract test verifies it. Local presentation has **no operational scheduler, authentication, persistence or distributed state**.

## Preserved performance contract

Single RAF, maximum 30FPS, HUD 5Hz, 250ms simulation samples with interpolation. Static branch geometry is built once. No new rendering loop or per-frame React state. Branch membership has at most 24 records per meeting.

The user-reported Phase 2-A RTX 4070 SUPER result (29.999 average FPS, 33.6ms p99 at 1278×719) is historical hardware evidence, **not a v0.5 measurement**. Its fullscreen resolution was not established. New CI measurements explicitly identify SwiftShader.

## Local deterministic/balance evidence

`pnpm test:racing:v5`: 200 full/summary meetings, 1,385,336 physical segment checks; no nonphysical position jump. Replay highlights, no-branch track, round barriers, grid, ordinary retirement cap, special DSQ, five-minute/idempotent gates, fixed schedule PASS.

`pnpm racing:balance:v5`: 40,000 seeds `9re-0..9re-39999`.
Digest: `0ea476a5c416424dc610cc2b73df7fd9b63e5e09aed04e23c683912f2af348fb`.

| Metric | v0.5 |
|---|---:|
| Race seconds mean / p05 / p50 / p95 | 216.4395 / 210.5 / 216.25 / 223 |
| Racer win-rate range | 12.0725–12.6875% |
| P1 / P8 grid wins | 13.1325% / 11.3375% |
| Branch decisions / successes / failures | 949,137 / 444,774 / 504,363 |
| Completed merges / successful entries retired first | 444,000 / 774 |
| Mean same-pace branch traversal advantage | 2.9406s |
| Observed success at P1 / P8 entry rank | 41.7830% / 51.7743% |
| Qualifying average length | 451.3133s |
| Round barrier / grid violations | 0 / 0 |
| 0 / 1 / 2 ordinary DNF+DSQ | 31,743 / 7,484 / 773 |
| Special podium DSQ | 387 / 40,000 = 0.9675% |

The advantage metric compares the completed shorter section against the longer section at the same measured pace, not a causal whole-race win benefit. The 40k run retains summaries; spatial continuity is separately checked against full frames in 200 races. Historical v0.4 P1≈13.13% / P8≈11.21% is a different-seed/rule comparison, not a paired causal experiment. The small grid advantage remains; no racer stat differs.

## Running / delivery

- `pnpm racing:watch:v5` or `pnpm racing:build:v5`.
- Windows CI artifact `galactic-racing-v5-demo`: extract into a new folder; run `START-RACING.bat`. For occupied port use `START-RACING.bat -Port 43875`. Launcher fails closed instead of opening an older server. Compare Build Info SHA with the report.
- Select qualifying, automatic/manual presentation and continuous playback. Developer performance JSON remains available. The default seed is `9re-0`, 218.75s race; special DSQ is a separate seeded replay.
- CI workflow `.github/workflows/racing-phase2b.yml` performs historical regressions, v5 tests/40k, type/lint/build, actual Chromium screenshots, same-run Phase 2-A/v5 performance, and Windows launcher checks. A later QA report records actual results; workflow presence is not PASS.

## Deferred / limits

No 10-lap setting, faster base speed, revised grid, operational preshow/scheduler/season/auth/Credit, Production integration or player profiles. Three laps and v0.4 base speeds remain. Windows hardware GPU v0.5 performance requires user measurement; Linux software-renderer measurements do not certify it. No real mobile OS keyboard/device certification.

The first narrow branch candidate was rejected during road-width review because it overlapped the main road too much. The final wider branch has a length ratio of 0.805558 and static clearance from scenery; its 40k results above supersede that preliminary candidate. The first Chromium run exposed a QA seek quantization assumption: requesting round 2 start +100ms rounded to 14ms before the start on the 250ms slider. QA now uses +500ms and validates the actual phase; the phase contract was not relaxed.
