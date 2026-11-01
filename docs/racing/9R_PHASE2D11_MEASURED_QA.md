# Phase 2-D.1.1 — executed evidence (2026-11-02 KST)

Base `881b96f212290fd465e5cebad9ffd641d8414eca`; runtime candidate
`b5187e0fe0b41cac92cb2f747fdf476282095f16`; simulator remains
`galactic-racing-0.8.0`. No main / Production / DB / Credit / AI / Provider writes.

## Official results and local checks
Twenty complete seeded meeting hashes match the independently loaded base worktree exactly. Default
race JSON SHA256 remains `8c819bef2fd73311fc6ba6de72f6bf86809556b64e53071d1f1bc8f8cacccc51`.
No engine, config, track, shortcut, grid, ultimate parameter or RNG was edited.
Historical v0.1–v0.8 regression passed; the v0.8 suite covers 100 full meetings,
1,160,168 physical segments, lap settings 1/3/5/10/15/30 and summary/frame parity.
C.1, seed hashes, render-loop cap/HUD 5Hz / one RAF, seek and old production schedule
contracts passed. TypeScript, lint, app/standalone builds and diff-check passed.
An old HUD string assertion was updated from R1 to ROUND 1; no numerical golden
was changed. Existing unrelated unused-debit lint warning and chunk-size warning
remain. Local browser launch was BLOCKED by missing executable; actual browser
QA uses the supported CI environments below.

The prior 40,000 v0.8 balance remains applicable to unchanged engine code; this
phase did not rerun or falsely count another 40k campaign.

## Changed responsibilities

| Files | Responsibility |
|---|---|
| `prototypes/galactic-racing-v2/competition-director.ts` | observed competition selects subjects; precomputed cues outside the render loop |
| `broadcast-director.ts`, `lib/racing/v8/camera.ts` | apply viewer edit and existing trackside coverage; separate owner from angle |
| `lib/racing/v2/playback.ts`, `scene.ts` | presentation-only qualifying coast and auto-angle plumbing |
| `watch.tsx`, `watch-hud.ts`, `player-controls.tsx` | one held-time HUD, roster keyboard selection, automatic-angle controls |
| `qualifying-panel.tsx`, `player.css` | disclosed round table, yellow BEST, responsive HUD and lights |
| `serve-watch-v8.mjs` | distinct Phase 2-D.1.1 build identity and Windows instructions |
| `test-racing-d11.mjs`, `screenshot-v8.mjs`, workflow | frozen hashes, editorial cases, dynamic browser checks and exact artifact delivery |

The first candidate CI exposed an old HUD-text assertion; it was corrected to
the new label, then the full final suite reran. Mobile timing subtext and the
manual-hold round label were corrected before freezing the final runtime. Only
that final runtime is delivered. No simulator version bump or 40,000-race rerun
was necessary because no official rule or result changed.

## Editorial selection quality
Separate subject selection from framing. Candidates use observed rank, gap,
relative speed, observed position gain, current events and 75% of geometric
shortcut potential. Result data, future frames and secret DSQ are excluded.
Prefix-truncation tests confirm the selector does not require future records.
This is a small explicit editorial heuristic, not an optimizer or victory predictor.

20 matched seeds: P7/P8 non-finish coverage falls from 19.8045% to 0.3331%.
This measures low-rank airtime, not proof every former low-rank shot was useless.
The small CI contract compares raw old subject cues (20.0266%); the published
19.8045% comparison independently loads the actual old delivered framing and
collapses consecutive identical views. These are different denominators/cue
sets, not conflicting results.
Actual cuts/min 10.984→10.260; mean view hold 5.381→5.755 seconds. Exact before/after edit counts and framing durations are in
`evidence/phase2d11-director-comparison.json`; consecutive identical views collapse.

Observed examples (race-relative milliseconds):
- 9rf-0,122250: P2 close competition, TOP FOUR BATTLE.
- 9rf-7,252250: P4 r7 shortcut contender, merge TV station.
- 9rf-1,24000: P7 r1 MINOR does not displace P3 r4 overtake coverage.
- 9rf-0,196000: P6 ultimate activation does not immediately take priority;
  at201000 that racer qualifies for ULTIMATE CHASE as the observed chase develops.
- 9rf-0,184000: leading r4 major/external incident gets contender coverage.
- 9rf-0,348000: leader finish approach, with later remaining finishers eligible.
These are observed editorial cases, not changes in event probability or outcome.

Qualifying: 75 new overall best records and 60 round-last finishers across 20 meetings
were captured in the sampled [-1500,-1000,-500,0,+250]ms crossing neighborhood.
Approach selection estimates remaining time from already-reached samples; HUD
only reveals completed records. Not every ordinary finisher forces a cut.

## Player and presentation contracts
R1/R2/R3 cells reveal only after each finish; BEST derives from completed valid
laps. Result overlays use wide camera after 3s while all 8 coast; no official lap is
added. 15s results and 300s manual timeout unchanged. Unified right HUD reports current
round completion /8. Both desktop and expanded mobile timing omit run-status text.
Number keys use stable roster order; comma/period use current ranking; slash/AUTO
clear owner. Owner+auto-angle keeps the subject, reusing the bounded per-owner
coverage plan. Fixed rear/front/side/TV remain selectable. No playback history
or runtime director optimization. Lights are larger/lower; five timed cuts and
the official gun remain unchanged. Technical corner copy becomes 연속 코너 구간.

## Browser evidence from the exact runtime

[Final runtime CI](https://github.com/darkkyoung/Holocron/actions/runs/41329775181)
uses the code SHA above. Linux functional Chromium **156.0.8078.4** passed at
1440×900, 390×844 and 360×800, including fullscreen at those exact dimensions.
All three reported zero page errors and zero external requests. The renderer is
ANGLE Vulkan SwiftShader, not hardware GPU.

Actual final images were downloaded and visually inspected: desktop R2 results,
360px fullscreen large qualifying HUD, desktop fullscreen lights, owner-auto TV
shot, and both mobile result-table layouts. The mobile inline player shows the
compact result title; the full table remains readable in the panel below.
Timer and unified round HUD do not overlap in the tested fullscreen sizes.
The supplied reference image contained no orange countdown rectangle, so exact
matching to that missing annotation is NOT VERIFIED.

Dynamic pose records independently confirm:

| Viewport | Owner samples | Owner | Angles actually observed | Cooldown movement |
|---|---:|---|---|---|
| 1440×900 | 65 | r4 throughout | front → trackside | all 8 move 29.57–30.39 scene units |
| 390×844 | 65 | r4 throughout | front → trackside | all 8 move 28.89–29.67 scene units |
| 360×800 | 65 | r4 throughout | front → trackside | all 8 move 28.87–29.65 scene units |

The 15 cooldown samples retain exactly the same wide camera position while
vehicles move; this is not a static screenshot assertion. Desktop actual QA
video (80.88 seconds, 1440×900 VP9) is included with the screenshots and motion JSON. The manual-hold HUD initially advanced to the next round; it now uses held
display time, with a browser regression added. Keyboard 1–8, comma,
period, slash/Slash, focus guards, manual fixed camera, seek/play-state, manual
hold ROUND 1, result disclosure and three HUD sizes are exercised by the same
browser test. Physical mobile OS, touch keyboard and user hardware are not
covered by viewport emulation.

| User requirement | Status | Evidence |
|---|---|---|
| Simple qualifying rows and unified HUD | BROWSER VERIFIED | desktop/mobile text assertions; three fullscreen HUD sizes |
| R1/R2/R3/BEST with no future records | BROWSER VERIFIED | each round table, invalid label contract, yellow BEST |
| Wide results with moving cooldown | BROWSER VERIFIED | final images and 15 dynamic pose samples per viewport |
| Significant qualifying finish coverage | VERIFIED in timeline | 75 record improvements and 60 round-last finishers |
| Competition-aware subjects | VERIFIED in timeline | 20-seed comparison and named cases above |
| Stable number keys and slash return | BROWSER VERIFIED | actual key events and focus guard |
| Owner + auto angle / fixed angle | BROWSER VERIFIED | stable r4 with two observed shots; fixed-angle tests |
| Larger/lower start lights | BROWSER VERIFIED | fullscreen/mobile screenshots and five timed cuts |
| Engine, ultimate, track and official results | PRESERVED | 20 full hashes; no rule-file diff; historical regressions |
| Stable 30 FPS on user Windows GPU | NOT VERIFIED | requires user's hardware measurement |

## Measured rendering and resource limits

Linux Xvfb Chromium 156.0.8078.4, ANGLE Vulkan SwiftShader, 8 seconds per scene.
Normal canvas 1023×575; fullscreen canvas **1440×900**. These are actual canvas
pixels, not just the browser viewport. Frozen baseline is runtime
`f01953475b4df18f64b53f8d54843eb35c23ba87`; candidate is `b5187e0f`.
Each scene was sampled once; these are measurements, not a statistically
controlled hardware benchmark. Changed automatic framing can change visible geometry.

| Scene | Before FPS | After FPS | After median / low 5% FPS | After frame p50/p95/p99 ms | >50ms | Draw calls / triangles |
|---|---:|---:|---|---|---:|---|
| preshow-grid | 15.57 | 16.86 | 17.01 / 15.77 | 58.8 / 63.4 / 94.5 | 96.3% | 100 / 9018 |
| start-8 | 9.52 | 14.97 | 15.60 / 11.67 | 64.1 / 85.7 / 90.0 | 97.5% | 79 / 8526 |
| normal-corner | 13.83 | 14.15 | 14.75 / 11.31 | 67.8 / 88.4 / 93.1 | 99.1% | 67 / 8392 |
| draft-boost | 12.75 | 14.66 | 15.46 / 11.59 | 64.7 / 86.3 / 92.7 | 96.6% | 79 / 8526 |
| ultimate | 15.05 | 13.93 | 14.58 / 11.40 | 68.6 / 87.7 / 98.4 | 97.3% | 43 / 8304 |
| incident | 14.22 | 14.71 | 15.36 / 10.15 | 65.1 / 98.5 / 104.9 | 93.1% | 37 / 8288 |
| auto-cuts | 14.18 | 14.19 | 14.77 / 11.64 | 67.7 / 85.9 / 104.6 | 93.8% | 65 / 8582 |
| manual-side | 13.57 | 13.68 | 14.39 / 10.85 | 69.5 / 92.2 / 101.9 | 98.2% | 44 / 8242 |
| last-lap | 13.84 | 14.79 | 15.36 / 11.78 | 65.1 / 84.9 / 91.9 | 99.2% | 24 / 7086 |
| finisher-spotlight | 13.59 | 13.64 | 14.39 / 10.32 | 69.5 / 96.9 / 112.9 | 95.4% | 66 / 10430 |
| fullscreen-large | 9.55 | 8.60 | 8.57 / 7.51 | 116.7 / 133.2 / 174.9 | 97.1% | 43 / 7954 |
| branch-route | 13.87 | 13.85 | 14.95 / 10.86 | 66.9 / 92.1 / 104.3 | 94.5% | 35 / 8252 |
| qualifying-overlap | 15.33 | 14.50 | 15.70 / 10.58 | 63.7 / 94.5 / 102.4 | 95.7% | 49 / 7434 |
| qualifying-results | 14.29 | 15.11 | 16.21 / 11.11 | 61.7 / 90.0 / 97.1 | 95.8% | 100 / 9018 |
| trackside-pan | 12.79 | 13.92 | 14.99 / 10.98 | 66.7 / 91.1 / 95.4 | 95.5% | 61 / 8414 |

Mean of the 15 scenario means: **13.46 → 14.10 FPS**. Mean main-thread work:
**59.46 → 59.79 ms/s**; script work **30.87 → 30.51 ms/s**. The fullscreen
sample regressed **9.55 → 8.60 FPS**; qualifying overlap **15.33 → 14.50 FPS**.
Do not hide these behind the aggregate. This software renderer does **not**
meet stable 30 FPS. The retained 30 FPS cap / single RAF / 5Hz HUD contracts
pass, but Windows hardware-GPU 30 FPS acceptance remains **NOT VERIFIED**.
No hardware performance guarantee or causal explanation for single-run variance is claimed.
CI precomputed TV plans averaged 136.43ms/meeting over 20 meetings, outside RAF;
94,985 sampled centerline camera frames retained the prior continuity contract.

Before soak: 120s; after soak: 360s with 12 normal/special record swaps.
The 1,655,009-byte official record size is identical. After every swap:
**one live WebGL context, one canvas, 8 badges, 358 buffers, 12 textures**.
Retired contexts were lost/collected. Post-GC heap was 10.49 MiB initially,
14.07 MiB after 60s, 14.78 MiB at 360s. There is a small retained-heap drift
(+0.71 MiB from 60s), so indefinite memory stability is not proven. No WebGL
resource accumulation was observed. All reported browser errors/external
network requests were zero. The high-speed qualifying overlap naturally has
at most 5 racers active with preserved 8s starts; all 8 coast in the result scene.

Raw results and screenshots are in the performance artifact. No new hardware
benchmark or optimization campaign was started after these measurements.

## Delivery identity

Runtime: `b5187e0fe0b41cac92cb2f747fdf476282095f16`.
Build label: `PHASE 2-D.1.1 · v0.8 · TV BROADCAST`; simulator `galactic-racing-0.8.0`.
The downloaded demo ZIP is the exact GitHub Actions artifact, **not repacked**.
Its SHA-256 equals the Actions artifact digest:
`94cff57d76b831c7e9b86539bde3ca28466c5fe1ee23d53201cf1b7341b786a7`.
Size: **543,610 bytes**; `build-info.json` reports the matching SHA and `dirty:false`.
Extracted `race.json` equals the original hash above.

| Artifact | ID | SHA-256 |
|---|---|---|
| Windows demo | 13093616964 | `94cff57d76b831c7e9b86539bde3ca28466c5fe1ee23d53201cf1b7341b786a7` |
| Chromium captures/video | 13093235182 | `be9ca70d005b45750062562df4592f42b42745178fa59a1dfdcd86f3036a625a` |
| Performance | 13093916069 | `21ce988b981e9db015493714859e7e37aad9ec33c7b7e6312ef9cfd6acef2b60` |

GitHub artifacts expire 2026-11-15; durable user downloads are supplied separately.
Extract the entire demo into a new folder. Run `START-RACING.bat`; keep its
console open. It opens the OS default browser; paste the displayed loopback
URL into Chrome if needed. Alternate port: `START-RACING.bat -Port 43875`.
The launcher does not kill an existing server. Match the on-screen SHA before testing.

## Final Windows confirmation — PASS

Both jobs in [run 41329775181](https://github.com/darkkyoung/Holocron/actions/runs/41329775181)
completed successfully: Linux `124917231641`; Windows `124922386283`.
Windows **Google Chrome 156.0.8078.48 / SwiftShader** passed 1440×900,
390×844 and 360×800 functional/visual checks and fullscreen. Actual Windows
R3 table, narrow fullscreen large HUD and desktop lights were visually inspected.
Each viewport again recorded 65 dynamic owner-auto samples, keeping r4 while
switching front → trackside, with zero page errors and external requests.

The Windows PowerShell launcher served the exact artifact, verified build SHA
and Phase label, rejected occupied port 43874, and served matching content at
43875. Chrome functional QA then used those exact unpacked demo assets through
the existing test static server. This verifies the launcher and rendering
separately; it is not a recording of a user's physical double-click session.
The BAT wrapper and invocation instructions remain included.

Windows evidence artifact: `13093267329`, SHA-256
`7d274ecbf5f8a6f52c3380bc3873d30c4e8db0660823c7db63751376ec1b37d7`.
The downloaded bytes match the Actions digest. No compiled asset was rebuilt
between CI and delivery.

## Completion decision

- **PASS / BROWSER VERIFIED:** requested viewer changes and keyboard modes,
  historical simulator regressions, official hashes, builds, exact demo identity,
  Windows launcher contracts, software-rendered desktop/mobile/fullscreen QA.
- **PARTIAL:** performance acceptance. Software measurements are disclosed;
  fullscreen was slower in this sample and the 30 FPS target was not attained.
  Six-minute WebGL resource stability passed; small heap drift and longer sessions
  remain limitations.
- **NOT VERIFIED:** physical Windows GPU 30 FPS, real mobile device/keyboard,
  exact placement against the absent orange-rectangle annotation.
- **Deferred, not started:** v0.9 ultimate rules/effects/balance, profiles/podium,
  operations/server scheduling, Production and Credit.

Next isolated ultimate phase: **CONDITIONAL GO**, subject to separate user
approval and continued performance gating; do not treat this as hardware FPS
acceptance or permission to deploy. Use the delivered performance JSON exporter
on the user's Windows GPU before declaring smooth 30 FPS for that device.
The final evidence-only commit is separate from the tested runtime and skips CI;
no runtime code is modified by that documentation commit.

## Boundaries
No hardware Windows GPU FPS acceptance, physical mobile device/keyboard or real
broadcast server validation is implied by CI. Ultimate v0.9 enhancement,
profiles/podium D.2, season/admin/credit/server work remain unimplemented here.
