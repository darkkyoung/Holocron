# Phase 2-C.1 — executed evidence and delivery

## Source identity and scope

- Fresh base: `feature/galactic-racing-phase2c-broadcast` at `82392109f3055e011eef25b15e05a511f4916fb8`.
- Frozen delivered v0.6 runtime: `03a44843e55b21b45a0e0ddf07d4dc4648a2b126`.
- Work branch: `feature/galactic-racing-phase2c1-broadcast`.
- Candidate runtime: `df39affaaaa522139395334e78496fe157d0dce0`, tree `37b5afc17e076454c937041e7dec7409efb0446e`.
- Canonical main remained `93646c066aaf8a33f1a7c062f8404dd7cd7b211e` at the fresh fetch.
- No Production, D1, Migration, Credit, AI, Provider, operational season or wagering action was performed.

This is a local replay prototype. Real administrator authorization, server broadcast synchronization and production integration are not implemented by this work. The 20:00 / 20:55 / 21:00 KST future contract is unchanged.

## Seven feedback changes

| Feedback | Implementation and limits |
|---|---|
| Qualifying readability | Desktop heading 44px versus prior 22px; expanded panel, padding and hierarchy. Responsive 23px heading on narrow screens with concise three-line guidance. |
| Round cooldown | All three rounds add exactly 15s after the last official finish. Eight cars coast at half their measured qualifying pace; first 3s are unobscured, next 12s show results. Auto advances at the boundary. Manual waits after the 15s, retaining the last result frame, then releases once by button or 300s timeout. Waiting motion is optional and not implemented. |
| P1 behind stripe | Root cause was authoritative progress zero at the car center, not camera perspective. New v0.7 moves all eight starts back 2400cm; markings and framing use the same value. P1 front clears the upstream stripe edge by 5.6477 render units. |
| DNF | Recorded event time drives full red for 1s, 0.7s fade, then persistent readable grey. Seeking restores the same color; DSQ is separate. Desktop tower and mobile expanded records use the same decoration. |
| P8 to P1 | All eight introductions fit 60/90/120s preshows, after track tours and before the whole-grid shot and final five-second lights. Qualifying does not reveal the future grid. |
| Passing separation | Continuous spatial offsets use at most 28 pair checks for eight cars, bound lateral motion to ±6.2 render units, and widen dense-pack framing. No progress, speed, RNG or rank writes. Extreme eight-car packs on the narrow branch can still overlap in projection: PARTIAL, not physical collision avoidance. |
| Post-finish broadcast | Exactly 10s free coast without a forced introduction panel, then provisional P1/P2/P3 for 5s each using front/side/chase views. Actual finishers only; special DSQ remains secret until the existing ceremony reveal. |

Small mobile video shows a compact result heading; full timing rows remain below the video, or inside fullscreen. Manual holding deliberately freezes the final result frame rather than accumulating endless vehicle positions. These are explicit presentation limits.

## Official result integrity

This cannot honestly be labeled an unchanged v0.6 visual-only patch: the 24m additional start approach changes official travel. Therefore it uses `galactic-racing-0.7.0` and its own race/ceremony RNG namespace. Historical versions remain available. No golden was overwritten.

Ten full v0.6 meeting JSON hashes from the frozen base match after the shared assembly refactor, including frames, events, lap timing and official results (`evidence/phase2c1-v6-golden.json`). Qualifying retains all 24 per-attempt samples, lap durations, incidents, validity, tie-breaking and final grid. The inter-round results duration changes from 12s to 15s, so later broadcast launch/finish timestamps intentionally shift; absolute broadcast timestamps are not claimed unchanged.

## Executed deterministic and build checks

Local historical regressions passed: v0.1 golden/reproducibility (512 pairs), v0.2 (1,492,455 assertions / 200 pairs), v0.3 (2,197 checks / 200 meetings), v0.4 (240 meetings), v0.5 (200 meetings / 1,385,336 physical segments), v0.6 (100 meetings / 1,156,960 physical segments). v0.7 integration passed 100 meetings / 1,158,320 physical segments. Existing corner, player, render-loop and Phase 1 regressions passed. C.1 presentation tests cover bumper clearance, all 15s coasts, 300s single release, reverse introductions, DNF, bounded lanes, 10s post-finish coast, top-three cameras and frozen v0.6 hashes.

TypeScript, lint, application build, standalone demo build and diff-check passed locally. Lint retains one pre-existing unused `debit` warning in the unrelated assistant refund test; no unrelated source was edited. The 30FPS cap/single RAF/200ms HUD contract passes, but this is not a measured 30FPS performance claim.

Earlier candidate CI failures were retained rather than called PASS: the first browser assertion sought 9999ms into a 250ms-step range, which rounded to the legitimate 10000ms spotlight boundary; the second sought 100ms before DNF and rounded to the event itself. Browser tests now use representable pre-boundary positions (9750ms and event−250ms). Pure timeline tests still test exact 9999ms and event−1ms. The Windows-only QA fixture server was also corrected to use the native path separator; POSIX and Windows boundary checks pass. Visual review also moved the countdown panel away from P1 and shortened mobile introduction text without shrinking the requested hierarchy.

## 40,000-game balance

Executed seeds `9rf-0` through `9rf-39999`; digest `71d3836a8aa42d66d4152182b2c9cf1eb2430dfb67bd3df5be52eda76332e8bf`. Full report: `evidence/phase2c1-v7-balance.json`.

| Metric | v0.6 prior report | v0.7 |
|---|---:|---:|
| Mean official race | 362.33469s | 362.61350625s |
| P1 win rate | 13.675% | 13.755% |
| P8 win rate | 10.2825% | 9.945% |
| P1−P8 gap | 3.3925 percentage points | 3.8100 percentage points |
| Special DSQ | 1.025% | 1.0325% (413) |

v0.7 duration p05 / median / p95 = 356.25 / 362.5 / 369.5s. Grid P1–P8 wins: 13.755 / 13.82 / 13.6225 / 13.2475 / 12.325 / 11.9125 / 11.3725 / 9.945%. Racer win rates range 12.2325–12.8775%; all base abilities remain equal. A versioned RNG changes race samples, so the observed gap change is not attributed solely to the 24m approach.

There were 3,128,290 shortcut entries, 1,465,184 successes, 1,663,106 failures, 1,463,863 merges and 1,321 interrupted by retirement. Mean completed branch traversal saving against the longer route at the same measured pace is 1.48854s; it is not a causal whole-race winning advantage. Average leader changes: 40.9668. Ordinary retirement counts 0/1/2: 26,831 / 10,978 / 2,191; maximum remains two. Across all 40k summaries, qualifying barrier errors, grid errors and completed-lap errors were zero. Physical-position continuity is separately checked in the 100 full-frame meetings, not falsely attributed to summary-only 40k output.

## Browser, performance and artifact verification

Final runtime Linux Chromium UI step PASS in workflow https://github.com/darkkyoung/Holocron/actions/runs/41291938656. Chromium 156.0.8078.4 with ANGLE/Vulkan SwiftShader, not hardware GPU. Actual viewports 1440×900, 390×844, 360×800 all pass; fullscreen canvas sizes are those same viewport dimensions. The enlarged intro measures 747.36×336.17px / 44px heading on desktop and 280.80×145.41px / 23px heading at 360px, with no clipped text. Page errors and external requests are zero.

Actual advancing samples cover the corner, qualifying cooldown behind the result overlay, and post-finish free coast. Seek roundtrips compare full car/camera poses. The browser also tests all three round overlays, auto progression, manual release after cooldown, accelerated 300s expiry, DNF pre-event/red/grey/backseek, reverse introductions, all three spotlight angles, special DSQ, local 3-lap/60s generation, large/medium fullscreen and horizontal overflow. Per-viewport JSON is in `evidence/phase2c1-chromium.json`. The 49.76s WebM is a QA walkthrough with seeks, not an uninterrupted full race or a Windows hardware performance capture.

Reviewed actual PNGs show readable result rows, P1 clear of the stripe and countdown panel, visible red/grey DNF, and distinct spotlight angles. The comparison bundle labels the previous 03a4484 countdown as historical BEFORE evidence; other after captures are not misrepresented as paired pre-change measurements.

Both final jobs completed successfully: Linux124804790839 and Windows124810549440. The exact artifact IDs, sizes, SHA-256 digests and runtime identity are recorded in `evidence/phase2c1-delivery.json`.


## Final runtime performance and resource results

Executed final workflow, headed Chromium 156.0.8078.4 under Linux Xvfb, ANGLE/Vulkan SwiftShader. Normal canvas 1023×575; fullscreen 1440×900. Each scenario is sampled for 8s. These are actual rendered-frame intervals, not the configured cap. Baseline is frozen v0.6 runtime 03a4484 with its default seed; candidate is v0.7 df39affa with default 9rf-4. Version, record, event and camera content differ, so the comparison does not isolate the CPU cost of one code change.

| Scene | v6 avg FPS | v7 avg FPS | v7 median / lower5% FPS | v7 frame ms p50 / p95 / p99 | v7 >50ms |
|---|---:|---:|---:|---:|---:|
| preshow-grid | 12.91 | 16.73 | 16.98 / 15.17 | 58.9 / 65.9 / 122.6 | 95.5% |
| start-8 | 14.30 | 14.73 | 15.38 / 10.18 | 65.0 / 98.2 / 122.2 | 92.3% |
| normal-corner | 14.01 | 13.23 | 13.81 / 9.82 | 72.4 / 101.8 / 139.9 | 92.4% |
| draft-boost | 15.68 | 14.20 | 14.93 / 10.86 | 67.0 / 92.1 / 117.6 | 96.4% |
| ultimate | 14.52 | 13.44 | 14.25 / 10.41 | 70.2 / 96.1 / 115.0 | 94.4% |
| incident | 14.27 | 13.43 | 14.06 / 10.64 | 71.1 / 94.0 / 95.6 | 97.2% |
| auto-cuts | 13.11 | 13.62 | 14.37 / 10.59 | 69.6 / 94.4 / 112.5 | 95.4% |
| manual-side | 13.89 | 13.96 | 14.56 / 10.47 | 68.7 / 95.5 / 131.2 | 94.5% |
| last-lap | 14.40 | 14.81 | 15.70 / 10.11 | 63.7 / 98.9 / 103.6 | 93.2% |
| finisher-spotlight | 12.62 | 13.68 | 14.73 / 10.52 | 67.9 / 95.1 / 122.4 | 95.4% |
| fullscreen-large | 8.81 | 8.55 | 8.58 / 7.33 | 116.6 / 136.4 / 143.9 | 97.1% |
| branch-route | 13.03 | 13.20 | 13.64 / 10.37 | 73.3 / 96.4 / 106.3 | 98.1% |
| qualifying-overlap | 15.26 | 14.92 | 16.08 / 11.09 | 62.2 / 90.2 / 119.5 | 94.1% |
| qualifying-results | 17.02 | 14.11 | 15.27 / 10.04 | 65.5 / 99.6 / 105.3 | 94.6% |

**Stable 30FPS in the measured software environment: FAIL / target not achieved.** Scenario averages range 8.55–16.73FPS. The preserved cap, single RAF and 5Hz HUD are structural PASS, not a substitute for this result. Compared with this baseline, normal corner and qualifying results are slower; no overall performance improvement is claimed. Qualifying results now include eight moving cars rather than the old still result stage. Actual Windows RTX4070SUPER 30FPS remains **NOT VERIFIED**; the historical Phase2-A acceptance is not transferred to this version.

Normal-corner main-thread task time changes 42.22→52.46ms per wall second, median draws 18→35 and triangles 7,960→8,046. Fullscreen changes 34.35→40.20ms/s, draws 59→46 and triangles 8,144→8,172. Exact script work, >33.3ms fractions, long tasks, all scenarios and canvas/GPU strings are in `evidence/phase2c1-performance.json` and the downloaded raw performance artifact. Different viewed records prevent attributing every difference to lane computation.

The candidate completed 360s replay with 36 seek/play cycles and 12 record replacements. Every checkpoint retains exactly one current WebGL context, one canvas, eight badges, 358 buffers and 12 textures; all retired contexts are gone. Post-GC heap changes 10,848,600→15,403,336 bytes, with 14,733,452 at cycle6 and 15,360,024 at cycle33. That is another 669,884 bytes after cycle6 and 43,312 during the final three cycles. The GPU resource check passes; slow retained-heap growth is reported, not called a proven absence of leaks. Multi-hour soak and an uninterrupted hardware-GPU race remain unverified. Serialized normal record size 1,821,884 bytes is distinct from runtime heap.

## Exact Windows demo identity

- ZIP: `HOLOCRON-Racing-v07-df39affa-Windows.zip`
- Size: **587,537 bytes**
- SHA-256: `671a7251c235962cc1bf3553b9b2ad9d751f0e0d663a0af0cdcd0e14e0833475`
- CI artifact: https://github.com/darkkyoung/Holocron/actions/runs/41291938656/artifacts/13077972111
- Runtime: `df39affaaaa522139395334e78496fe157d0dce0`; Build Info `dirty:false`, `galactic-racing-0.7.0`, seed `9rf-4`.

The downloaded archive matches the CI artifact digest and size byte for byte; it was not rebuilt or re-zipped. The local and CI 40k balance JSON also match in full, not only their summary counts. The later report-only commit does not change the code inside this runtime ZIP.

Extract the entire ZIP into a new folder, then run `START-RACING.bat`. If port43874 is occupied, run `START-RACING.bat -Port 43875`; the launcher does not reuse or stop an older demo. Open the printed local URL in Chrome and check the version/SHA above. No Node/Python installation is needed. The packaged PowerShell server and browser rendering are checked separately on CI; physically double-clicking the BAT on the user's computer is not claimed as tested.

The default main race is 366.5s official time and 519.5s including preshow/finish presentation. Select qualifying for all three cooldowns; use the manual presentation selector to hold after15s. The DNF major-scene shortcut goes to race54s (main-video2:54). After the official finish, inspect10s free coast and the three5s spotlights. Existing developer performance JSON export remains available; record actual GPU and fullscreen pixel dimensions on the user's Windows machine.

## Remaining acceptance and decision

- Dense-pack/branch billboard separation is improved but **PARTIAL** in extreme projected overlaps; no physical collision solver was added.
- Manual waiting uses a still result frame after the moving15s, as allowed; it does not loop and store extra positions.
- Software-renderer30FPS target is not achieved; Windows hardware smoothness/30FPS is **NOT VERIFIED**.
- Stable WebGL counts are observed for6minutes; retained heap still grows slowly, so long-duration memory behavior is **NOT VERIFIED**.
- Local controls and replay are not production admin/server scheduling, shared live timing or Credit settlement.

**Phase2-D: CONDITIONAL GO for separately approved isolated work, with Windows hardware performance and user motion/overlap acceptance still outstanding. Guaranteed30FPS / complete product release: NO-GO on current evidence.** Phase2-D and Production were not started.


## Final Windows and acceptance matrix

Windows CI used installed Google Chrome **156.0.8078.80** with ANGLE/Vulkan **SwiftShader**. Desktop1440×900, mobile viewports390×844 and360×800 all PASS the same real render/interaction/motion/seek script. Actual fullscreen canvas matches each viewport. Page errors and page external requests:0. `evidence/phase2c1-windows-chrome.json` records the exact browser and measurements. The separately tested packaged PowerShell server passes source-SHA, label, occupied-port refusal and alternate-port checks; Chrome loads the identical CI static artifact through the isolated QA server. This is not a physical phone, the user's Windows installation, or hardware GPU acceptance. Captures were opened and reviewed, including P1/countdown, narrow intro, round results and mobile red DNF records.

| Check | Final result |
|---|---|
| Historical v0.1–v0.6 and frozen v6 complete hashes | PASS |
| v0.7 / 40,000-game balance / C.1 timeline contracts | PASS |
| TypeScript / lint / build / standalone build / diff-check | PASS (existing lint/bundle warnings noted above) |
| Linux Chromium three viewports, fullscreen, dynamic poses and seek | PASS |
| Windows Chrome same three viewports and interactions | PASS, software GPU only |
| Windows packaged server / port conflict / alternate port / source SHA | PASS |
| Delivered ZIP equals CI bytes | PASS |
| RAF30FPS cap / HUD5Hz / retired WebGL resources | PASS |
| Measured software-renderer stable30FPS | FAIL / target not achieved |
| User Windows hardware30FPS / actual phone / multi-hour heap | NOT VERIFIED |
| Complete elimination of dense-pack projected overlap | PARTIAL |

All seven requested presentation changes are implemented and browser-observed; the overlap limitation is explicit. No further source changes were made after runtime df39affa. The final commit is documentation/evidence only, intentionally skips CI, and does not relabel an untested build as the delivered binary.
