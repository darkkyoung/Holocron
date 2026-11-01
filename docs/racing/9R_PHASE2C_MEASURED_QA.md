# Phase 2-B.1 + 2-C — measured release evidence

Date: 2026-11-01. Isolated prototype only. Production/main/DB/Migration/Credit/AI/Provider changes: **zero**.

## Source and deliverable identity

- User's Phase2-B base: `017270506fbd313b1b4258943710d95aff421e1b`.
- B.1 inherited branch head: `1eb49be9546b9eda15848485cdc0fad57f27b4c6`; its validated runtime is `af6b71c7e406c95f099e451c32ce30899db7b162`.
- Development branch: `feature/galactic-racing-phase2c-broadcast`.
- v0.6 runtime candidate: `03a44843e55b21b45a0e0ddf07d4dc4648a2b126` / tree `c84b9ce82c751a28362124c36230e5f0acebae7f`.
- Final workflow: https://github.com/darkkyoung/Holocron/actions/runs/41281977453
- Main remains `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`.

This document's commit is report-only; the Windows ZIP identifies the **runtime** commit above, not the later report commit. Artifact hashes, final job status and browser measurements are recorded in [the downloaded evidence](evidence/phase2c-03a4484.json). Do not infer a successful test from workflow existence.

## B.1: root cause and scope

The old sampled polyline supplied a constant tangent within each segment, jumping by up to23.986 degrees at a boundary. The inherited B.1 change uses precomputed cubic Hermite positions and derivatives on the main and branch paths. Position and tangent agree at sample boundaries, the closed-lap seam, shortcut entry and merge. Vehicles and tracking cameras consume the same geometry. There is no history-dependent smoothing delay, official distance modification or new random state.

The dedicated test was rerun before Phase2-C. Near-boundary direction differences are at most0.0063 degrees on the main route and0.0006 on the branch. Maximum deviation from the old polyline is0.1206/0.0099 **render units**, respectively. These epsilon-boundary measurements are not a claim that every30FPS motion frame turns by that small angle. Intended collision/damage shaking remains.

Fixed-time seek comparisons and actual playing pose samples cover the high-curvature corner in all three Chromium viewports. A recorded desktop WebM accompanies PNG captures. User Windows GPU smoothness and subjective motion acceptance remain separate from these software-browser checks.

## v0.6 behavior

| Owning files | Responsibility |
| --- | --- |
| `lib/racing/v5/track.ts` | Inherited B.1 continuous rendering geometry |
| `lib/racing/v6/config.ts`, `simulator.ts`, `lap-times.ts` | New versioned rules, authoritative start positions, actual lap timing |
| `lib/racing/v6/broadcast.ts`, `lib/racing/v2/playback.ts` | Pure preshow/race/finish presentation timeline and virtual schedule |
| `lib/racing/v5/shortcut.ts`, shared type files | Optional new-origin support with historical zero-offset behavior |
| `scene.ts`, `track.ts`, `minimap.tsx`, `watch-hud.ts` | Geometry/camera/grid, origin synchronization and lap display |
| `watch.tsx`, `season-playlist.tsx`, `player.css` | Clip boundaries, race clock, compact broadcast status and current-record labels |
| `race-settings.tsx`, `race-worker.ts` | Local settings and off-thread creation of a new immutable record |
| `scripts/test-racing-v6.mjs`, `scripts/racing/*-v6.mjs`, `benchmark-rendering.mjs` | Integration/balance/spatial/browser/resource evidence and exact demo packaging |
| `.github/workflows/racing-phase2c.yml` | Linux Chromium evidence and Windows launcher validation |

- Main-race base travel doubles from1200 to2400cm per250ms:48 to96m/s before section and event modifiers. Replay defaults to1×. Qualifying retains its existing speed,24 measured attempts and three round barriers.
- Default10laps/36km; presets3/5/10/15 and integer custom1–30. Limits scale with actual laps. Lap crossing times are recorded from the same authoritative travel integration, including shortcut traversals.
- Actual longitudinal start gap24m per rank,48m per same-column row. Lateral lanes alternate±6 render units; all eight cars fit the road. The start origin moves8% onto a straight. The physical shortcut stays in place; entry and merge progress shift consistently with the new origin.
- Preshow60/90/120s (default120), including the final5s countdown. Actual3D track/corner/branch tours and racer/grid shots precede the gun. Cars remain at tick0 until it; official race clock starts0 then. Player time includes presentation footage.
- Existing finish crossing shots, half-speed visual coast and glow remain. Only actual finishers receive five-second spotlights. An eight-second provisional classification precedes the existing specialDSQ and ceremony. Presentation never rewrites official results.
- Local settings create a new immutable record in a Worker. They do not alter the previous record or persist an operating season. Existing auto/manual qualifying controls and one-time five-minute fallback remain.
- Pure virtual-clock tests preserve20:00 qualifying,20:55 cutoff,20:58 default preshow,20:59:55 lights and21:00 gun. This is **not** an operating server scheduler or synchronized live premiere.

## Defects found through actual image review

The first CI images revealed two presentation defects despite the earlier automated assertions passing: portrait fullscreen framed the circuit beyond the fixed fog distance, hiding most of the track; the countdown camera clipped the rear starting slot. The final candidate frames the bounds of all eight grid cars and adapts fog distance to the camera. New assertions check every projected grid position and fullscreen fog visibility. No simulator or recorded result changed for these fixes.

Earlier review also corrected a playlist's stale3-lap caption and separated the displayed race clock from the120s preshow. These are included in the final runtime, not post-delivery instructions.

## 40,000-race balance

Deterministic seeds `9rf-0..9rf-39999`; digest `c3b879f2b85440f12afa3a09b8ee0c30413daf5419b1ea05dbdbac12b0274e06`. The complete JSON contains counts and definitions.

| Metric | v0.5 historical | v0.6 |
| --- | ---: | ---: |
| Main laps | 3 | 10 |
| Mean official duration |216.439s|362.335s|
| Mean duration / lap |72.146s|36.233s|
| Duration p05 / median / p95 |see v0.5 evidence|356.25 /362.25 /369.25s|
| Duration min / max |see v0.5 evidence|349.75 /381s|
| P1 win rate |13.1325%|13.6750%|
| P8 win rate |11.3375%|10.2825%|
| P1–P8 gap |1.795pp|3.3925pp|
| Individual racer win range |12.0725–12.6875%|12.300–12.980%|
| Special podium DSQ |0.9675%|1.025% (410)|
| Ordinary retirements0/1/2 |31743/7484/773|26951/10905/2144|
| Same-pace branch traversal advantage |2.9406s|1.4885s|

Grid P1..P8 wins:13.675,13.8225,13.57,12.865,12.615,12.0525,11.1175,10.2825%. Grid influence increases with the deliberately wider start spacing; it is not hidden compensation. Equal racer parameters remain. This sample does not establish perfect fairness or guarantee an individual outcome.

Shortcut entries3,129,603; successes1,468,434; failures1,661,169. Observed success by entry rank is about41.97% atP1 and52.02% atP8. Traversal advantage compares the branch with its longer main path at the same measured pace; it is not a counterfactual whole-race win benefit. Mean leader changes40.9447/race. Longer time exposure increases ordinary retirement probability; the cap of two remains.

All40,000 summaries check qualifying round barriers, final-grid correspondence and finished-racer lap timing. Full-frame spatial continuity is a separate100-meeting test, not40,000 stored timelines. Existing v0.1–v0.5 golden/result fixtures are not edited. The v5 shortcut helper receives an optional origin offset defaulting tozero; historical callers retain their old contract.

## Tests and limits

The final workflow runs historical v0.1–v0.5, v0.6,40k balance, corner continuity, capped RAF/HUD lifecycle, Phase1 player/polish, TypeScript, Lint, application Build, independent demo Build and diff-check. Existing nonblocking unused-variable Lint and bundle-size warnings are not new clean-warning claims.

Chromium covers1440×900,390×844 and360×800: three camera angles, seek roundtrips, real advancing corner poses, shortcut entry/mid/merge, grid/preshow/countdown,10lap and final-lap scenes, finish/spotlights, classification/DSQ/ceremony, qualifying results and final grid, fullscreen/large HUD, local3lap/60s regeneration and horizontal overflow. External requests are blocked. Mobile viewport testing is not real Android/iOS device testing.

The benchmark uses headed Linux Chromium under Xvfb with **SwiftShader**, not Windows hardware. It compares the frozen B.1v5 runtime withv6 in the same job. Different official race records mean event/camera complexity can differ at matched scenario names. Per-scene FPS, p50/p95/p99, lower5%FPS, >33.3/>50ms fractions, main-thread work, draws, triangles, actual canvas pixels and heap are retained. A30FPS cap assertion is **not** a30FPS performance pass.

Resource testing uses120s baseline and360s v6 playback, seeks and repeated normal/special record replacements. It checks retirement of old contexts and stable resource counts in the replacement scene. This is not a multi-hour soak or a fully uninterrupted ten-lap Windows run. Heap growth after warmup must be reported rather than silently equated to leak-free operation.

## Windows use and remaining acceptance

Extract the exact CI demo ZIP into a new folder; run `START-RACING.bat`. If an old server occupies the default port, use `START-RACING.bat -Port 43875`. The launcher fails closed on collision and checks build identity. Verify `PHASE 2-C`, `galactic-racing-0.6.0` and runtime SHA above in Build Info. No Node installation is required for the packaged PowerShell server.

Select main-race replay to see the120s preshow/countdown and10laps at1×. Local settings below the player create a new race. Qualifying and ceremony remain independently selectable; continuous playback joins the phases. Developer controls export actual performance JSON. Record both normal and fullscreen canvas resolution, renderer/GPU and frame statistics on Windows.

Phase2-D implementation can proceed conditionally after functional evidence is complete. **Production release and guaranteed30FPS are NO-GO until hardware performance and user motion acceptance are verified.** Production integration, persistent administration/seasons, shared server clock, live publication safety, trackside fixed cameras and Credit settlement remain outside this prototype.

## Final executed result — 2026-11-01

Both final CI jobs **PASS**: Linux124775562424 and Windows124780003223. Runtime `03a44843e55b21b45a0e0ddf07d4dc4648a2b126`; no CI rerun was used to hide a failed assertion. Earlier candidates were superseded by concrete presentation fixes.

| Check | Result |
| --- | --- |
| B.1 path/seek/motion and v0.1–v0.5 regressions | PASS |
| v0.6 full/summary, settings and spatial integration | PASS;100 meetings /1,156,960 physical segments |
|40,000 balance / finished lap timing / qualifying barriers / grid | PASS;0 timing, barrier or grid errors |
| TypeScript / Lint / app Build / demo Build / diff-check | PASS; one existing nonblocking Lint warning |
| Chromium156.0.8078.4,1440×900 /390×844 /360×800 | PASS;0 page errors,0 external network requests |
| Actual fullscreen canvas sizes |1440×900 /390×844 /360×800 |
| Captures |81 original PNGs + desktop WebM +3 motion JSONs + browser report |
| Windows launcher, exact SHA, collision denial, alternate port | PASS |
|30FPS cap, single RAF,5Hz HUD | PASS structural regression |
| Stable30FPS in measured SwiftShader environment | **FAIL / target not achieved** |
| Actual Windows GPU and mobile OS device performance | **NOT VERIFIED** |

The selected original captures were opened and inspected, including the repaired portrait fullscreen, complete grid bounds, corner, branch entry/merge, preshow/final grid, final lap/finish/spotlights/podium/DSQ and both mobile widths. Portrait wide overview necessarily makes the cars small; manual tracking remains available. The countdown panel partially overlays the front slots, but none of the eight projected car positions is outside the viewport. Placeholder art and HUD occlusion are not claimed to be final broadcast artwork.

### Actual frame measurements

Same-job software-renderer comparison;8s per scenario. Normal actual canvas1023×575; fullscreen1440×900. GPU string:ANGLE Vulkan1.3 SwiftShader Device(Subzero). FPS columns are measured, not configured caps.

| Scenario | B.1v5 averageFPS | v6 averageFPS | v6 median / lower5%FPS | v6 frame ms p50/p95/p99 | v6 >50ms |
| --- | ---: | ---: | ---: | ---: | ---: |
|start-8|10.15|15.34|16.31/12.17|61.3/82.2/94.7|95.9%|
|normal-corner|12.11|13.75|14.04/10.50|71.2/95.2/117.8|93.6%|
|branch-route|12.06|12.75|13.12/8.60|76.2/116.3/162.5|89.1%|
|qualifying-overlap|15.12|14.77|15.72/11.59|63.6/86.3/95.5|96.6%|
|fullscreen-large|8.62|8.64|8.64/7.31|115.7/136.8/195.5|97.1%|

All v6 scene averages range8.64–16.59FPS in this environment. Most frames exceed33.3ms; see exact fractions in the JSON. Branch p99 and fullscreen p99 worsen despite similar averageFPS, so an across-the-board performance improvement is **not** claimed. These are software-renderer results, not evidence of a Windows RTX4070SUPER regression or pass.

For the normal-corner scenario, main-thread task time changes53.12→46.50ms per wall second, draws33→18 and triangles7222→7960. Fullscreen draws26→59 and triangles7948→8144 reflect different versioned race/camera content. Raw per-scenario metrics are retained instead of attributing all changes to one optimization.

Six-minute v6 replay/12 record replacements: post-GC heap10,769,324→14,988,344 bytes; after cycle6 it grows by612,384 bytes, then cycles33→36 are14,992,200→14,988,344. Each replacement ends with1 live context,1 canvas,8 badges,358 buffers and12 textures; old contexts are retired. This bounded observation is not a long-duration no-leak guarantee. Serialized main record1,792,195 bytes versus baseline1,160,543 bytes is stored timeline size, not JS heap.

### Exact downloadable build

CI artifact `galactic-racing-phase2c-v6-demo`, ID13073772610,590,552 bytes. Downloaded ZIP SHA-256:

`54c102909f93cad09da9c42b7eb3673e2bcfca299598e29af9e6d6d4c3bc8350`

The ZIP digest matches GitHub's artifact digest; its build-info has the runtime SHA above and `dirty:false`. Windows CI consumed this same artifact. Default Seed `9rf-0` has5:59 official race duration; preshow/finish footage makes the main replay8:50. Other seeded records legitimately have different durations. Actions artifacts expire2026-11-15; the delivered user download is separately retained.

**Phase2-D: CONDITIONAL GO for isolated feature work. Full success/production readiness: NO-GO pending actual Windows GPU30FPS and user corner-motion acceptance.** No production publication, account, season, wagering, database or provider operations were performed.
