# Phase 2-D.1 — final executed evidence

BaseC.1 `59d032dc6df71f2a1b575961b1e594ad29503e0c`; main freshly fetched at
`93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. Only Racing branch
`feature/galactic-racing-phase2d1-tv` is modified. Runtime candidate is `f01953475b4df18f64b53f8d54843eb35c23ba87`,
tree `afbe6842fb1a7e69c585eabe5b2ea2568be47a9f`. Final CI and delivery
identity are recorded below. Earlier d132/4df candidates are
superseded, not the delivered ZIP.

## Local executed checks
Historical v0.1–v0.7 regressions PASS, including old C.1 presentation and
10 frozen full v0.7 JSON hashes. v0.8 integration PASS:100 full meetings,
1,160,168 physical segments,1/3/5/10/15/30lap settings, ordinary retirement cap,
seed/capture equivalence, official lap timing and schedule. No old golden changed.
TypeScript, lint, app build, standalone build and diff-check PASS. Lint has the
existing unused`debit` warning in unrelated assistant refund tests; chunk-size
warnings remain. No unrelated assistant file was changed.

The initial local Playwright official download returned a truncated/non-ZIP
archive. It was not replaced with an untrusted mirror. Actual Chrome evidence
comes from supported CI, with renderer type reported rather than assumed.

## 40,000 v0.8 games
Executed`9rf-0..39999`; digest
`2df9c28b4d0c141f524ceb51716b2b3c4ad0a4ff401d65b092d3d7cad8958011`.
Mean main362.60906875s; p05/median/p95356.5/362.5/369.5s; range349.25–383.5s.
Mean qualifying lap37.88812418s; whole qualifying broadcast346.6591724s.
Among960,000attempts:9,510invalid(0.990625%),95,994incidents(9.999375%),
zero incidents scheduled beyond the lap, zero round barrier/grid/completed-lap
errors. All3rounds completed. Main grid P1–P8 win percentages:
13.9475/13.8425/13.6625/13.1725/12.425/12.0275/10.9625/9.96.
Racer wins12.145–12.835%; base abilities equal. SpecialDSQ413(1.0325%).
Ordinary retirements0/1/2:26991/10893/2116; DNF11623, DSQ3502.
Leader changes1,641,645(total),41.041125/game. Shortcut entries3,128,683,
success1,467,058, failure1,661,625; incomplete successful passages1191due to
retirement. No probability depends on bets or administrator preferences.

v0.7 mean main362.61350625s,P1/P813.755/9.945%; v0.8 gap3.9875percentage
points versus3.8100. Small observed change, not proof of identical distributions;
new qualifying and race RNG namespace means comparisons are not controlled
causal estimates. Physical continuity uses the separate100full-frame meetings,
not a false claim that40k summary runs retain all render positions.

Representative same seed`9rf-0`: qualifying mean75.778→37.928s, total460.862→
347.172s. Eight-second launch gaps unchanged, preserving overlap without packing
all8into a much shorter launch interval. Cooldown15s/result12s are unchanged.

## Camera math versus browser evidence
Six lenses clear all sampled main/branch road centerlines by at least28.93render
units, at height32above the maximum27-unit canyon blocks. This is a clearance
check, not a blanket claim that every conceivable projection has no occlusion.
Coverage rejects sampled aim velocities above90degrees/s before playback.
Twenty default10lap meetings sampled109,213fixed-shot frames at30Hz; maximum
centerline aim speed80.15degrees/s. Explicit cuts and visual passing offsets are
excluded from that number and need actual dynamic browser inspection.
Mean edit-list preparation on this local runtime98.84ms/record; not a GPU benchmark.
Historical records, official progress and results are not modified by camera edits.

## Browser evidence — final runtime
Linux Chromium 156.0.8078.4 / ANGLE Vulkan SwiftShader. Functional QA PASS at
1440×900, 390×844 and 360×800, plus viewport-filling fullscreen and medium/large
HUD. External network requests and page errors: zero in every viewport.

The exact final runtime produced 172 PNG screenshots and a 69.92-second real
browser recording, with separate JSON motion probes. The images were inspected:
TV corner/straight/branch views, countdown cuts, fullscreen lights, checker,
DNF, grid and podium remain visible. Mobile standings are intentionally in the
expandable timing section; the checkered marker was inspected there too.

Pointer range click/drag, mobile touch tap and Arrow/J/L seek preserve pause or
play, rate and viewer camera. Manual result hold cannot be released by seek.
Five countdown cameras are distinct, lights accumulate 1–5 and disappear at
the gun, with all eight cars stationary beforehand. Automatic side tracking is
absent; viewer side tracking remains an explicit manual choice.

| Live TV sample | Desktop | 390px | 360px |
| --- | ---: | ---: | ---: |
| Observed seconds / samples | 2.009 / 20 | 1.933 / 20 | 1.967 / 20 |
| Distinct camera positions | 1 | 1 | 1 |
| Maximum sampled aim speed °/s | 39.53 | 39.23 | 39.51 |
| Target 10-unit height reference, px | 90.95–95.33 | 34.11–35.74 | 31.62–33.14 |

These selected motion samples prove fixed lens position with live rotation and
readable framing, not the FPS of an entire race. Seek round-trips restore the
same pose and FOV. All three round cooldown/results, five-minute virtual hold,
final grid, DNF red/grey state, finish flag and special-DSQ timing also pass.

Performance soak, Windows verification, artifact identity and final decision
are recorded below. Stable 30FPS on physical Windows hardware is NOT VERIFIED.


## Implementation boundaries

| Responsibility | Files |
| --- | --- |
| Versioned qualifying speed, existing main rules | `lib/racing/v8/simulator.ts`, optional D.1 parameters in v6 assembly/v2 qualifying |
| Fixed lenses and deterministic precomputed edit lists | `lib/racing/v8/camera.ts`, `broadcast-director.ts`, v2 playback adapter |
| Stationary lens rendering, countdown framing | `scene.ts` |
| Seek contract, local focus controls, minimap target | `watch.tsx`, `player-controls.tsx` |
| Official finish/DSQ marks and responsive lights | `watch-hud.ts`, `player.css` |
| v0.8 records and Windows package identity | `race-worker.ts`, `serve-watch-v8.mjs` |
| Integration, balance, browser, resource evidence | `test-racing-v8.mjs`, `test-racing-d1.mjs`, `test-racing-tv-path.mjs`, `screenshot-v8.mjs`, `benchmark-rendering.mjs`, dedicated CI |

For representative seed `9rf-0`, edit-list time proportions are race TV 50.00%,
front 32.40%, chase 17.60%; qualifying TV 35.72%, wide 30.24%, front 24.82%,
chase 9.22%. Automatic side tracking is zero. Collapsing adjacent identical
(target, angle, station) cues gives 64 race view changes (10.73/minute, median
hold 6s) and 45 qualifying changes (7.78/minute, median hold 8s). These are
precomputed edit-list statistics, not a claim of visual quality across all seeds.
The shortest race hold is 411ms between close finish events; normal qualifying
holds are at least 4s. Five one-second countdown cuts are a separate start-only
sequence. Manual side remains available for compatibility.

## Delivery instructions and remaining scope
Extract the exact CI demo ZIP into a new folder. Run `START-RACING.bat` and keep
its terminal open. If port 43874 is occupied, run `START-RACING.bat -Port 43875`.
Check the top build strip against `build-info.json`; do not reuse an old server.
No Node/Python installation or account is needed for the packaged Windows demo.
v0.8 automatic spotlight shots are front/front/chase because automatic side was removed.

Use the gear for TV trackside or manual chase/front/side; previous/next and comma/
period follow current ranking. The performance JSON panel is hidden by default.
Collect at least 30 seconds at 1x, then separately measure native fullscreen with
large HUD and verify the JSON canvas resolution. No hardware 30FPS acceptance
is inherited from the older RTX 4070 SUPER v0.4 measurement.

Production scheduling, server clock synchronization, administrative persistence,
profiles, enhanced podium, betting and credit settlement remain outside this
prototype. The 20:00 / 20:55 / 21:00 KST contract is only locally tested. No
Production or canonical-main changes, database writes, migrations, credits or
OpenAI requests occurred.


## Defects found through real browser evidence
The first TV screenshots were mathematically valid but made distant cars too
small in the 360px player. A fixed-position, bounded 12–48 degree lens now uses
a deterministic distance/aspect-based zoom to frame approximately 60 vertical
render units. The camera still pans from a stationary location. A new projected
height assertion prevents accepting an unreadable mobile target. The camera
matrix is updated before badge/probe projection, and lens updates use exact
values rather than history-sensitive epsilon suppression.

The original performance harness left the qualifying clip selected for the last
race TV scenario. Each benchmark scenario now explicitly selects its correct
clip. Earlier TV-scenario numbers from that harness are not final evidence.
The fullscreen mobile light bar was moved below the enlarged lap/timer HUD and
is checked for overlap. No official simulation result changed for these fixes.

## Acceptance interpretation
- Browser screenshots and motion probes verify real rendered components; no
  synthetic image is used as QA evidence. The recording includes deliberate
  seeks and settings changes, not an uninterrupted race film.
- Touch taps are exercised in Chromium mobile viewports. Physical Android/iOS
  devices and their native keyboard/gesture behavior are NOT VERIFIED.
- Six-minute resource testing is segmented replay with record swaps, not a claim
  that every ten-lap race was watched uninterrupted on physical hardware.
- Native/fallback fullscreen is exercised at explicit canvas dimensions; the old
  user's RTX 4070 SUPER result is not transferred to this v0.8 build.
- A completed benchmark is not a 30FPS pass. Software results below 30FPS must
  remain reported as below target, with Windows hardware acceptance separate.


## Final software-renderer performance
Executed in Linux Xvfb headed Chromium 156.0.8078.4, ANGLE Vulkan SwiftShader.
Eight seconds per scenario after 1.2s warm-up; normal canvas 1023×575, fullscreen
1440×900. Frozen v0.7 runtime `df39affaaaa522139395334e78496fe157d0dce0` is the
baseline; v0.8 runtime is `f01953475b4df18f64b53f8d54843eb35c23ba87`.
Versions have different seeded scenes/event times; this is a same-run environment
comparison, not a controlled attribution of every FPS difference to the camera.

**30FPS target: NOT MET in SwiftShader. Windows hardware GPU: NOT VERIFIED.**
The cap/single-RAF/5Hz HUD contracts pass, but they do not turn low measured FPS
into a performance pass. No stable-30FPS acceptance is claimed.

| Scenario | v0.7 avg FPS | v0.8 avg / median / p05 FPS | v0.8 frame p50 / p95 / p99 ms | >50ms |
| --- | ---: | ---: | ---: | ---: |
| preshow-grid | 12.68 | 16.75 / 16.92 / 15.22 | 59.1 / 65.7 / 92.2 | 96.99% |
| start-8 | 14.47 | 12.96 / 13.18 / 10.00 | 75.9 / 100.0 / 102.8 | 98.06% |
| normal-corner | 13.19 | 13.74 / 14.71 / 11.49 | 68.0 / 87.0 / 103.4 | 97.25% |
| draft-boost | 14.35 | 12.68 / 13.26 / 9.53 | 75.4 / 104.9 / 159.8 | 96.00% |
| ultimate | 13.51 | 14.96 / 16.21 / 10.88 | 61.7 / 91.9 / 95.1 | 91.60% |
| incident | 13.40 | 13.98 / 14.68 / 10.57 | 68.1 / 94.6 / 107.3 | 94.59% |
| auto-cuts | 13.55 | 13.96 / 14.53 / 11.68 | 68.8 / 85.6 / 91.2 | 97.30% |
| manual-side | 13.92 | 13.42 / 14.04 / 10.01 | 71.2 / 99.9 / 112.8 | 94.34% |
| last-lap | 14.78 | 13.57 / 14.29 / 10.33 | 70.0 / 96.8 / 115.2 | 93.46% |
| finisher-spotlight | 13.75 | 13.48 / 13.57 / 10.62 | 73.7 / 94.2 / 102.2 | 98.13% |
| fullscreen-large | 8.42 | 9.49 / 9.51 / 8.50 | 105.2 / 117.6 / 122.6 | 100.00% |
| branch-route | 13.24 | 13.74 / 14.41 / 9.63 | 69.4 / 103.8 / 120.3 | 92.66% |
| qualifying-overlap | 15.10 | 15.16 / 16.10 / 10.33 | 62.1 / 96.8 / 110.7 | 95.83% |
| qualifying-results | 14.16 | 14.12 / 15.04 / 10.67 | 66.5 / 93.7 / 98.8 | 95.54% |
| trackside-pan | — | 12.85 / 13.28 / 10.08 | 75.3 / 99.2 / 103.6 | 98.04% |

Full evidence is `evidence/phase2d1-performance.json`, including >33.3ms ratios,
main-thread task/script duration, long tasks, draw calls, triangles and heap.
The >33.3ms metric is literal and includes timing jitter around the 33.333ms target.
Candidate main-thread task time ranges 41.53–78.68ms per wall second; median
scene draw calls 15–100 and triangles 6,892–10,430. No page errors/external calls.

Six-minute segmented replay with 12 record swaps retained one live context,
one canvas, eight event badges, 358 buffers and 12 textures at equivalent fresh
record states. Retired contexts were lost/collected. Post-GC JS heap was
10.42MiB initially, 14.03MiB after initial warm-up/swaps, and 14.67MiB at the end.
The late ~0.64MiB increase is reported, not hidden or declared proof of no leak.
The bounded test found no GPU-resource accumulation; longer heap soak remains
outside the measured interval. Record JSON shrank from 1,821,884 to 1,655,009
bytes because qualifying has fewer samples; stored record size is separate
from live renderer heap.

## Exact artifact identity
CI run: https://github.com/darkkyoung/Holocron/actions/runs/41308967164

- Demo artifact ID: `13085520116`, 541,813 bytes.
- ZIP SHA-256 / Actions digest: `fbd41afb310ce5ba58b456210c22a657a7ef7dc22edd5918f00b895eb1984bde`.
- Built source: `f01953475b4df18f64b53f8d54843eb35c23ba87`, dirty=false.
- `race.json`: `8c819bef2fd73311fc6ba6de72f6bf86809556b64e53071d1f1bc8f8cacccc51`.
- `special.json`: `9875e510b916a1e30f75122bce63563797ed0e90cf9c57ccaba6f6cce4126c3a`.
- Linux screenshot/video ZIP SHA-256: `44ac20d35ca11830d23dd1311be49942553b5ab23c47016e7cf19951a3800001`.
- Performance ZIP SHA-256: `7ef3fdc42c49ba628e87d1ccfa0c620186c88f07365d00f49358d6da96baeaab`.

Downloaded ZIP bytes were hashed against Actions metadata before extraction.
The delivered demo is that exact archive, not a local rebuild or re-ZIP. Its
normal/special records also match locally generated bytes. CI's complete 40k
balance JSON equals the local evidence exactly, including the result digest.
Windows uses this same artifact in its dependent verification job.


## Windows and final disposition
The same downloaded demo artifact passed the dependent Windows job on
Microsoft Windows Server 2025 (`windows-2025-vs2026`), installed Google Chrome
156.0.8078.48, SwiftShader. This is real Windows browser execution in CI, not a
claim of a physical Windows 10/11 GPU acceptance. All three viewports and
fullscreen checks PASS; external requests and page errors are zero. Windows
screenshots were also inspected. PowerShell startup, build SHA, occupied-port
failure and alternate-port identity PASS. The BAT delegates to that tested
PowerShell launcher; no claim of a human double-click test is made. It opens
the OS default browser, so open the printed localhost URL in Chrome if needed.

Windows artifact ID `13085283252`, digest
`4554a576addb3f8550982c37bb8b742523d891d5b563bc93386eaf86cb9f41ac`.
Final CI run `41308967164`: both Linux and Windows jobs SUCCESS.

| Acceptance | Result |
| --- | --- |
| State-preserving seek, rate/camera retention, local manual hold protection | BROWSER VERIFIED |
| Top-center lights, five start cuts, stationary pre-gun grid | BROWSER VERIFIED |
| v0.8 actual qualifying speed / three rounds / results | IMPLEMENTED + BROWSER VERIFIED |
| Six fixed lenses, deterministic zoom/pan, no auto side, local racer controls | BROWSER VERIFIED |
| Official checker / DNF / delayed special DSQ | BROWSER VERIFIED |
| 40k v0.8 balance and all v0.1–v0.7 regressions | PASS |
| TypeScript / lint / app build / standalone / diff-check | PASS (documented warnings only) |
| Linux and Windows Chrome at 1440/390/360, fullscreen HUD | PASS |
| Single RAF / cap / HUD / resource cleanup contracts | PASS |
| Stable 30FPS in measured SwiftShader environment | NOT MET |
| Physical Windows GPU 30FPS and physical mobile devices | NOT VERIFIED |
| Exact CI ZIP digest / build SHA / local record hashes | PASS |

**Phase 2-D.2: CONDITIONAL GO for isolated feature work.** Runtime functionality
and packaging are ready, but hardware 30FPS acceptance remains a condition for
any performance-complete claim. Measure the delivered build on the user's GPU
at normal and actual fullscreen canvas resolutions. The prototype is not a
Production release, and no Production/main/DB/Migration/Credit/AI/Provider or
operational-season changes were made. All later server/profile/podium features
remain deferred rather than implicitly implemented.

Only this evidence/documentation is committed after the verified runtime, with
`[skip ci]`; the delivered executable SHA remains f0195347. Final repository SHA
and tree are reported separately so a documentation commit cannot be confused
with a rebuilt demo.
