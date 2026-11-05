# Galactic Racing v0.11 — late Ultimate and GAP correction

2026-11-05. Local/isolated prototype only. Production, canonical main, D1,
Migration, Credit, AI and Phase 3 implementation are outside this work.

## Source and implementation

- Fresh main: `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`.
- Start: `7b7766d7cd2b2e0edb7143363eb284ff5a7276bb` (accepted runtime `8a975b3`).
- Branch: `feature/galactic-racing-v011-late-ultimate-gap`.
- Initial implementation: `42bc7788ca709750ee31deea4bb0e8b47f9c0a6b`.
- Validated Windows/runtime SHA: `100df3dded520f6bb24d3b5fef4e4c347eb8d9f3`; Tree: `9fecd27370d99bdee336ccc7452f88dfcc16b20b`.
- Final CI: [42022916127](https://github.com/darkkyoung/Holocron/actions/runs/42022916127), both Linux and Windows jobs **SUCCESS**. The final documentation-only commit records these existing results; it does not rebuild or replace this runtime.

v0.11 has its own `galactic-racing-0.11.0` namespace. `lib/racing/v11/`
changes launch eligibility only. The accepted v0.10 Gold and wormhole dynamics
are reused through an explicit launch-rule argument; v0.10's original default
rule remains. Twenty full v0.10 meeting hashes are pinned to the previously
published contract and compared, not overwritten. Previous v1–v10 tests remain.

## Changed responsibilities

- `lib/racing/v11/{ultimate,simulator}.ts`: new policy and namespace; shared `v10` dynamics accept an explicit launch rule with the original v10 default retained.
- `lib/racing/gap.ts`: immutable passage-time index and leader-relative display query.
- `prototypes/galactic-racing-v2/{watch.tsx,race-worker.ts,player.css}`: version dispatch, HUD-only GAP and portrait-fullscreen timing visibility.
- `scripts/test-racing-v11.mjs`, `scripts/racing/{balance-v11,load-v11,qa-gap,screenshot-v11}.mjs`: frozen-history proof, fresh balance, timing correctness and actual UI checks. Existing browser harness is reused with an explicit v11 option.
- `scripts/racing/{serve-watch-v11,build-watch,benchmark-rendering}.mjs` and `.github/workflows/racing-v011-correction.yml`: labeled standalone package, known examples and Linux/Windows validation.

No track, speed, lap-count, Gold/Hyper power, profile, podium/DSQ, Phase3 design, production application API or data files were changed.

## Late launch policy

Eligibility is the racer's own official cumulative progress before the step,
not the leader's lap, video time or visual coast. New launches are allowed in
`[0.70, 0.95)` only. For ten laps this means laps 8, 9 and the first half of 10.
At exactly 95% and later there is no new launch. Existing active effects may
continue until their effective recorded end or terminal status.

| Own progress | Multiplier on existing rank-weighted chance |
|---|---:|
|70%–exclusive80%|0.30|
|80%–exclusive90%|1.60|
|90%–exclusive95%|0.65|
|Outside these windows|0|

The previous base chance and rank bias remain. Minimum remaining laps is zero,
so the old 0.8-lap restriction cannot block the final window. This relative rule
also applies to 1/3/5/15/30-lap races. There is no forced activation. Per-racer
maximum one, per-race maximum two, the 18-second launch gap and 10% Hyper draw
are unchanged. Gold power/duration and Hyper bounded jump/afterburn are unchanged.
Official finish/DNF/DSQ trims the active interval and broadcast lock as before.

## GAP TO LEADER contract

`lib/racing/gap.ts` owns presentation timing. A memoized index is built once for
an immutable race; React's approximately 5Hz HUD looks up eight racers, using at most two binary passage queries per trailing racer.
It is not in the Three.js RAF and never calls or changes the simulator.

1. Select the latest confirmed 250ms frame, including official rank and status.
2. Select that frame's leading RACING/FINISHED racer.
3. For each trailing racer, find its first passage and the leader's first passage
   at the same cumulative progress. Display the nonnegative difference in seconds.
4. Ordinary motion is linear between recorded anchors. Successful shortcut
   entry/merge times and equivalent-distance boundaries insert exact anchors.
5. A wormhole inserts its `from` and `to` positions at the same official jump
   tick. Every skipped progress point belongs to that instant; it is never
   smeared into an artificial high-speed segment or distance/speed estimate.
6. Finishers use their official finish-time difference. A full cumulative-lap
   deficit uses `+1 LAP` / `+N LAPS`. DNF/DSQ retain their explicit labels.
7. A point behind the leader's initial grid position has no observed leader
   passage: show `—` until a shared measured point exists. Missing/negative/
   nonfinite measurements are not fabricated. Rounded equal gaps can show `+0.00s`.

Every lookup is bounded by confirmed time. The index can contain later anchors
from this local replay JSON, but cannot use an anchor newer than the queried
frame. Prefix-only tests remove future frames, passages, jumps and finish times
and require identical results. This is a display-time contract, not a claim
that the local demo JSON prevents future-result inspection; Phase 3 still owns
server-side selective disclosure. Special DSQ is read only by the existing
ceremony reveal path. Qualifying keeps lap times and R1–R3 highlighting.

At a stationary position the first-passage difference stays fixed until the
racer advances. This is the requested same-point passage metric; it is not a
live distance/instantaneous-speed approximation. Display precision is 0.01s,
with underlying 250ms recorded-motion interpolation and millisecond finish times.

## Verification status

Local PASS: all v0.1–v0.10 simulator regressions, corner continuity, C.1/D.1/D.1.1/final presentation, render-loop, Phase1/polish, TypeScript, lint, app build, standalone build and diff-check. Lint retains the pre-existing unrelated Assistant unused-debit warning; no AI code was edited.

The new v11 domain contract passes 100 default-lap meetings, 30 additional settings meetings (1/3/5/10/15/30), 20 full repeat hashes, 10 full/summary comparisons, 105,872 GAP rows and 1,312 Ultimate lock/seek samples. Twenty v10 **complete meeting JSON** hashes match the previously published baseline, including qualifying, events, timing and official results. Engine output is versioned, not overwritten.

Local Playwright execution is BLOCKED by the missing supported headless-shell1248. This is not a browser PASS; actual CI Chromium/Windows results are documented below.

Domain coverage includes hand-calculated timing, initial staggered grid,
lead changes, shortcut entry/merge, wormhole before/at/after, exact finish,
full-lap deficit, retirement, prefix noninterference and out-of-order seeks.
Synthetic lapped/DSQ browser fixtures are clearly labeled; they are not saved
Seed results or balance samples. Actual default, Hyper and special-DSQ seeds
also run through the unchanged HTTP-built player in Chromium.

## New 40,000-race balance

Fresh v11 full-frame run: `node scripts/racing/balance-v11.mjs 40000`, Seeds `11lu-0..39999`. Source `42bc7788`; no engine changes in subsequent presentation candidates. Raw report: [v011-balance.json](evidence/v011-balance.json), SHA-256 `066c8713fcf3746d94e56aa83d6f3e2f3e808e4024ee13fb054cfee918eb191e`. Race-result digest `2ec82f22012d6846e66c081f22cc493bc185f4ea6d0f0325e38bf12b92e4a945`. CI run42020631247 independently completed the new forty-thousand-race full-frame step. Its downloaded audit artifact13414595978 contains **byte-identical** balance JSON with the same SHA-256 as the local fresh run. UI-only iterations check the full lib/racing tree, audit/loader sources and report bytes before reusing this newly executed v11 audit. The duplicated run is a reproduction, not an additional40,000 independent Seeds.

| Launch lap (10-lap race) | Count | Share of 32,683 activations |
|---|---:|---:|
|1–7|0|0%|
|8|5,467|16.7274%|
|9|22,833|69.8620%|
|10 (before95%)|4,383|13.4106%|
|At/after95%|0|0%|

0/1/2 activations: **14,177 / 18,963 / 6,860 races** (35.4425% / 47.4075% / 17.15%); average **0.817075/race**. Gold29,377 (89.8846% of activations); Hyper3,306 (10.1154%).

| Official final outcome | Sample n | Podium | Win | Mean final rank gain |
|---|---:|---:|---:|---:|
|All Gold activators|29,377|85.0087%|61.2928%|4.3554|
|All Hyper activators|3,306|66.6667%|35.2087%|3.3436|
|Eligible late P5–P8 Gold|25,513|82.9224%|56.9866%|4.6768|
|Eligible late P5–P8 Hyper|2,832|61.3347%|27.5071%|3.5410|
|Combined eligible late P5–P8|28,345|80.7656%|54.0413%|4.5633|

Combined conditional podium22,893/28,345 (Wilson95%80.3026–81.2202%); wins15,318/28,345 (53.4606–54.6209%). The Hyper subgroup is weaker than Gold; its preserved power is not tuned to force a target outcome. Mean rank gain at effect end is Gold4.5884 / Hyper3.6655; final classification can subsequently differ. Winners without Ultimate52.075%.

Grid P1→P8 win percentages: **12.795 / 12.810 / 12.9225 / 12.855 / 12.9825 / 12.140 / 11.9225 / 11.5725**. Racer-ID r1→r8:12.6125/12.250/12.410/12.630/12.610/12.3075/12.495/12.685. Equal base attributes remain.

Race duration mean362.2605s, median362s, p05–p95356–369.25s, min348.5/max385s. Mean lead changes39.8696. General DNF11,708 and DSQ3,538 **racer events**, not race probabilities; special DSQ388/40,000=0.97%. Maximum general retirements2 per race. Lap/qualifying sequence errors0.

Hyper maximum jump719.96m; one canceled entry (no jump). Conservative jump+afterburn extra-distance bound1,199.52m, below3,600m; observed one-lap leads during Hyper0. Its largest observed lead over a live contender1,461.16m. These are different metrics; neither is a claim of universal causal gain. Shortcut/Ultimate overlaps10,485.

Reproducible demo Seeds: `11lu-0` Gold in laps9 and10; `11lu-31` Hyper in lap10; `11lu-81` general DNF plus specialDSQ; `11lu-13` P8 Ultimate winner.

All figures use fresh v0.11 Seeds. No v0.10 balance report is reused as a v0.11
result. Conditional late-race KPI is P5–P8, own progress70%–exclusive95%, RACING
at activation, with no minimum remaining-lap condition. Official special-DSQ
reclassification is included. This denominator differs from the old midrace
35%–80% / two-laps-remaining KPI and is not a paired causal comparison.

## Browser iteration findings

The first presentation candidate, CI42021886407/ad37c83, passed the full desktop and390px mobile v11 suites, then failed a360px **dynamic QA read**: the timestamp and rendered row strings were read in two separate cross-process calls and straddled a5Hz update. The test now reads both in one browser JavaScript task; no timing result, tolerance or simulator was changed. The final full candidate rerun42022916127 passes both platforms. Preserved screenshots from the earlier attempt were inspected but are not substituted for final-build acceptance.

The browser review also confirmed the old mobile stylesheet hid the entire tower in portrait fullscreen. A compact fullscreen tower now shows GAP beneath the Ultimate caption and above the minimap; normal mobile retains its expandable below-video timing table. The fullscreen QA checks visibility, canvas bounds and minimap separation.

## Browser, performance and package

**Linux Chromium156.0.8078.4 / headless / SwiftShader: PASS** on runtime100df3d, CI42022916127. Actual1440×900,390×844,360×800; fullscreen medium/large HUD; zero external network requests and page errors. The same job's v10 browser regression also passes all three viewports.

GAP checks are separate from engine statistics: **25 comparisons per viewport (75 total)** across default11lu-0, special11lu-81 and Hyper11lu-31. They cover start, first leader change, successful shortcut entry/merge, actual recorded finish, DNF, Hyper before/jump/after, rewind equality and active playback. Three additional explicitly synthetic lapped+DSQ fixtures show+2LAPS andDSQ in the actual component. They do not enter any official race/balance output. Each active-playback assertion atomically reads HUD timestamp and all eight displayed values, then compares confirmed timing. [Raw Chromium report](evidence/v011-chromium-qa.json).

Actual Gold pose samples124/204/204 and Hyper89/152/152 (desktop/390/360); target-lock, movement, wormhole phases, out-of-order Seek and manual override/AUTO return assertions pass. Profile save/import/image fallback, qualifying result disclosure, continuous playlist, specialDSQ reveal/reaward and reduced-motion regressions pass. Inspected final-build screenshots show the lap9Gold, lap10Hyper, seconds/leader labels and portrait fullscreen GAP with no minimap intersection. Narrow/normal mobile keeps expandable timings outside the16:9 picture.

Final Chromium archive SHA-256`8d0c22d8ef39146e52571439ce905a5d7d4614230630623163429843ae506346`,72,389,925bytes; [Actions artifact13412907778](https://github.com/darkkyoung/Holocron/actions/runs/42022916127/artifacts/13412907778). Downloaded bytes were checked before inspecting images and motion records. It contains separate v10/v11 folders, with final runtimeSHA visible in the v11 screenshots.

### Measured performance and limitations

Linux Xvfb headed Chromium156.0.8078.4, **software SwiftShader**. Same browser/viewports compare frozen v10 runtime8a975b3 against final v11 runtime100df3d. Each scene samples8seconds. These are different versioned race records/default Seeds, not a controlled attribution of every drawcall change to GAP. The raw report includes CPU main-thread/script time, canvas dimensions, over33.3ms ratios, GPU identification and heap: [v011-performance.json](evidence/v011-performance.json).

|Scene|Before → after mean FPS|After median / p05 FPS|After p50/p95/p99 ms|After >50ms|Median draws/triangles|
|---|---:|---:|---:|---:|---:|
|preshow-grid|17.36 → 21.47|21.60/19.49|46.3/51.3/67.8|8.82%|100/9018|
|start-8|18.71 → 19.01|19.84/14.33|50.4/69.8/81.8|52.35%|42/8218|
|normal-corner|16.35 → 18.83|19.72/14.06|50.7/71.1/98.1|53.33%|36/8264|
|draft-boost|18.67 → 18.39|19.49/13.77|51.3/72.6/103.4|57.82%|40/8194|
|ultimate|17.78 → 18.89|19.57/14.25|51.1/70.2/82.3|60.00%|28/8140|
|incident|18.85 → 17.91|18.98/14.56|52.7/68.7/78.0|88.73%|61/8558|
|auto-cuts|18.18 → 17.66|18.32/13.95|54.6/71.7/94.3|80.85%|47/8422|
|manual-side|17.89 → 18.39|19.80/14.08|50.5/71.0/88.5|56.85%|18/7948|
|last-lap|20.72 → 18.87|20.08/14.01|49.8/71.4/77.9|48.00%|45/7250|
|finisher-spotlight|18.17 → 17.79|18.69/14.22|53.5/70.3/94.9|86.52%|68/10862|
|fullscreen-large|11.84 → 12.56|12.99/8.26|77.0/121.1/174.5|94.00%|60/8328|
|branch-route|18.64 → 17.96|18.87/14.27|53.0/70.1/79.9|83.22%|57/8434|
|qualifying-overlap|18.87 → 18.93|20.00/14.45|50.0/69.2/78.4|49.67%|49/7434|
|qualifying-results|19.56 → 19.53|20.70/14.49|48.3/69.0/75.5|31.41%|100/9018|
|trackside-pan|17.84 → 17.53|18.12/13.18|55.2/75.9/95.5|76.26%|61/8426|
|podium-celebration|29.98 → 30.10|30.30/27.93|33.0/35.8/47.0|1.25%|21/292|
|special-dsq|29.94 → 29.97|30.30/22.03|33.0/45.4/56.7|2.93%|19/164|

**Stable30FPS is NOT demonstrated on this software renderer.** The scheduler's30FPS ceiling and single-RAF/HUD5Hz regressions pass; short actual GL-clear measurements around30.1FPS can reflect completion jitter, not an uncapped loop. Fullscreen p99 worsened135.1→174.5ms despite mean11.84→12.56FPS; this mixed workload is not a blanket performance PASS. Actual Windows hardware GPU performance remains **NOT VERIFIED**. The user can measure their GPU with the shipped JSON exporter.

After360seconds with12 record swaps: one live WebGL context, one canvas, eight badges, buffers358/textures12 at like-for-like freshly reset scenes, and old context IDs released. Resource-count cleanup assertions PASS. GC heap13.842MiB initially→15.904MiB at120s→16.524MiB at360s; additional0.620MiB after warm-up means long-term heap stability is not proven. The1,693,202-byte race file is stored record size, not heap usage. This is repeated playback/Seek/swaps, not one uninterrupted complete10-lap viewing.

The after record is a Gold example, so this performance run does not provide a new v11 Hyper phase-specific FPS sample. Hyper's actual dynamic rendering, lock and Seek are verified by Chromium/Windows functional QA; numerical Hyper GPU performance is not inferred from v10 figures.

Performance archive2,992,677bytes, SHA-256`f22f14224de95030f3228e228c4b1a74e24a58f5df1027fd55835a30f7168282`, [artifact13413717594](https://github.com/darkkyoung/Holocron/actions/runs/42022916127/artifacts/13413717594).

### Actual Windows Chrome and exact delivery

**Windows Chrome156.0.8078.80 / win32 / SwiftShader: functional PASS.** The installed `C:\Program Files\Google\Chrome\Application\chrome.exe` renders the exact Linux-built artifact in job127240859391. Desktop1440×900, mobile390×844 and narrow360×800 all pass, with25 actual GAP comparisons per viewport plus a separately labeled synthetic lapped/DSQ fixture. Active-playback timestamp/row comparisons, leader changes, shortcut entry/merge, Hyper jump, finish, DNF and rewind checks pass. Gold dynamic pose samples are192/204/204. All viewports report zero external requests; profile storage, continuous replay transitions, fullscreen and reduced-motion checks pass. [Raw Windows report](evidence/v011-windows-qa.json).

Final Windows screenshots were inspected directly: desktop official finish gaps, narrow fullscreen/large-HUD timing and minimap separation, and Hyper jump/exit. The non-fullscreen large tower remains scrollable when all eight rows do not fit; the expanded timing table also exposes all racers. Screenshot presence alone is not the dynamic proof: recorded position samples, lock/phase assertions and QA video accompany these images.

Windows launcher checks pass: expected execution SHA, occupied43874 fails closed, and alternate43875 serves the new demo. Windows Chrome here is software rendered, **not** the user's RTX4070SUPER or other hardware-GPU performance acceptance. Windows QA archive:47,140,764bytes, SHA-256`b194946e9d2ded09e544dc832aaa9faff5d310232d2c6ddda3db9bab11cfb37d`, [artifact13414885470](https://github.com/darkkyoung/Holocron/actions/runs/42022916127/artifacts/13414885470). It includes actual screenshots and recorded video.

Delivered file: **`Galactic-Racing-v0.11-100df3d-Windows.zip`**,572,257bytes. It is the original downloaded Actions ZIP, **not a local re-archive**. Local SHA-256 and GitHub artifact digest match exactly:

`c5b36c5250f218467132453d468f5dd07621ef62fab39c5ac90027c89a317ca1`

[Exact demo artifact13413722693](https://github.com/darkkyoung/Holocron/actions/runs/42022916127/artifacts/13413722693). Build-info contains runtime100df3dded520f6bb24d3b5fef4e4c347eb8d9f3, `dirty:false`, `galactic-racing-0.11.0`, default11lu-0 and race355000ms. The extracted default race SHA-256 is `1cdca049d5dc1b6c595e36354cafa041a78ca69605405a7387665df10b0a1409`. Artifact links require GitHub access and currently expire2026-12-05; the user delivery includes this same ZIP and selected QA videos/captures. [Delivery identities](evidence/v011-delivery.json).

The standalone player retains single RAF, maximum30FPS scheduling, HUD5Hz,
250ms official Tick, timestamp seek and local manual/automatic camera controls.
Measured software WebGL and real Windows hardware GPU are reported separately.

Node24.22.1/Linux CPU-only timing microbenchmark: one index contains11,456 points from1,421 frames, built in6.9166ms;100,000 HUD queries averaged5.8989µs/query. This is not browser FPS or hardware GPU acceptance. [Raw timing](evidence/v011-gap-cost.json).
The v0.10 profile, podium/DSQ, Phase3 design and launcher contracts are preserved.

## Windows quick check

1. Extract the final ZIP into a **new folder**. Run `START-RACING.bat` and confirm `v0.11 FINAL CORRECTION`, `galactic-racing-0.11.0` and the execution SHA in the build strip.
2. If43874 is occupied by an older demo, this launcher fails closed. Run `START-RACING.bat -Port 43875` from the same folder. Do not mistake an already-open old browser tab for the new build.
3. Default `11lu-0` has Gold on laps9/10. The local example selector offers `Hyper Wormhole · 11lu-31`; the specialDSQ button uses11lu-81. Race tower shows GAP; on a narrow normal view expand `경기 순위 · GAP TO LEADER`. Qualifying retains lap-time results.
4. Use Space/K and progressbar to play/pause/Seek. Numbers1–8 select a racer; `/` or AUTO restores automatic Ultimate lock. The developer performance panel exports measured JSON. For user hardware acceptance, collect normal and fullscreen separately with GPU name and actual canvas dimensions.

The packaged BAT calls the tested PowerShell server. CI launch checks are distinct from an Explorer double-click under a user's local Windows security policy.

Production/main/DB/Migration/Credit/AI/operating-server mutations: **0**.
No Phase 3 implementation or production deployment is authorized by this report.
