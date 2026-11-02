# Galactic Racing Phase 2-D Final — measured acceptance

## Source and isolation

Started from fresh remote D.1.1 `767765dcf199569ae264f4f89608a46f4937cd52`. Canonical main remains `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. Work is confined to `feature/galactic-racing-phase2d-final`. The frozen performance baseline is the delivered v0.8 runtime `b5187e0fe0b41cac92cb2f747fdf476282095f16`.

Production/Sites, D1/Migrations, Credit/Wallet/Ledger, AI/OpenAI, real schedules and betting: zero operations. This is a local replay prototype, not an operational broadcast release. Static replay JSON necessarily contains the complete record; sealed DSQ refers to presentation timing, not secret server-side storage.

## Stage A — actual simulation, not a fixed winning outcome

Final policy and implementation: `9R_PHASE2D_FINAL.md`. 40,000 distinct deterministic seeds `9ru-0..39999`; digest `b0425f41290a3017f1620d5f94be13500f6b287682feab69ca041d576a309f93`. Local and CI aggregates agree. Full evidence is `evidence/phase2d-final-v9-balance.json`.

Conditional denominator: **51,270 actual activations** starting P5–P8, own race progress 35–80%, at least two laps remaining, officially RACING. Counts use final official classification, including special DSQ. This is not the unconditional chance of winning for an arbitrary racer.

| Metric | Result | Requested range |
|---|---:|---:|
| Official podium | 42,548 / 51,270 = **82.9881%** | 70–90% |
| Official win | 24,336 / 51,270 = **47.4664%** | 40–60% |
| Mean final rank gain, including retirement/DSQ | **4.6077 places** | about 3–5 |
| Conditional activations ending officially DSQ | 355 | included as unsuccessful |

Descriptive Wilson 95% intervals: podium 82.6604–83.3109%, win 47.0343–47.8988%. Activations in one race are correlated; these simple binomial intervals are not a clustered causal-effect estimate. No matched unactivated counterfactual is claimed.

- 58,659 launches, **1.466475 per race**. Zero/one/two launches: 4,538 / 12,265 / 23,197 races (11.345% / 30.6625% / 57.9925%). At most one per racer and two per race, separated by at least 18 seconds. Thus Gold is limited per racer, but at least one Ultimate occurs in 88.655% of these races; it is not rare at the whole-race level.
- Hyper: 6,024 / 58,659 = **10.2695%**. Gold makes up the rest. Power range 2.2–4.2×, mean 2.8133×, median 2.757×, p95 3.813×. Duration 6–11s, mean 8.6082s, median 9s, p95 11s.
- P1–P8 activation counts: 211 / 731 / 2,066 / 4,381 / 7,445 / 11,232 / 15,784 / 16,809. These are counts by rank at launch, not probabilities per eligible opportunity.
- Winners who never activated: **25.8425%**. Successful shortcut/Ultimate overlap on the same racer: 21,015 activations.
- Main-race duration mean **361.7727s**, p05/median/p95 355.5/361.5/369s, min/max 348/382.25s. Mean leader changes 31.8286.
- Normal DNF 11,611; normal DSQ 3,397; special DSQ 379 / 40,000 = **0.9475%**. Lap-count errors 0; qualifying errors 0.

| Starting grid | v0.8 prior 40k win % | v0.9 win % |
|---|---:|---:|
| P1 | 13.9475 | 12.0950 |
| P2 | 13.8425 | 12.4000 |
| P3 | 13.6625 | 12.5975 |
| P4 | 13.1725 | 12.3975 |
| P5 | 12.4250 | 12.1850 |
| P6 | 12.0275 | 12.6025 |
| P7 | 10.9625 | 12.8475 |
| P8 | 9.9600 | 12.8750 |

v0.8 mean time 362.6091s and leader changes 41.0411. These are different version namespaces/seed batches, not paired counterfactual races. The new catch-up policy flattens the grid advantage and slightly favors the back grid in this sample. Racer-ID win rates range 12.3425–12.6425%; all basic abilities remain identical.

The 40k runner stores summaries, not every animation frame. Separate detailed validation covers **100 full/summary pairs and 1,158,528 physical segments**, monotonic progress, speed-bound route movement, one-use/race caps and arbitrary-lap settings. Twenty frozen Stage A v0.9 official-payload hashes prove that profiles and podium presentation did not subsequently change qualifying, events, lap times or official classification. Historical v0.1–v0.8 contracts remain separate and unmodified.

Reproducible menu examples: `9ru-2` r6 P8→P1 Gold at tick1096; `9ru-7` r6 Hyper at672; `9ru-0` r1 lower-grid podium but not winner at888; `9ru-0` r5 successful shortcut interaction at576; special DSQ `9ru-59`. Examples always generate 10 laps / 120s preshow to match the recorded case.

### Broadcast sample inspection

At `9ru-2`, the director is on r6 from the Gold launch (P8), still on that racer at +1.25/+3/+6s; observed rank at +6s is P6. At `9ru-7`, r6 Hyper is filmed from P6 through P5 at +1.25s to P1 at +3s. At `9ru-0`, r1 launches P6 and is filmed through P4 at +1.25s to P2 at +3s. These use recorded current frames and existing competitive scoring; the policy does not read eventual winners. P4 launches are not automatically entitled to a cut: `9ru-0` r5 competes with another shortcut contender for airtime. Launch urgency is brief and subsequent competition remains in charge.

## Stage B — profile and ceremony contract

Profiles use stable IDs and allowlisted bounded fields. Unknown background information remains empty. Separate information buttons do not trigger tracking; desktop has a side dialog, mobile has a bottom sheet accessible beside each row of the expanded standings. Native modal focus, Escape and return focus are used while playback continues. LOCAL DEMO ADMIN provides localStorage save, HTTPS image preview/fallback and bounded JSON export/import; no production login/database exists. Storage is origin/port-specific; export/import JSON when moving to a different demo port. The profile image is for the information panel and preview; the track/podium continue to use the current placeholder racer billboards. An external image URL may contact the user-selected host outside QA. Profile metadata never enters physics or results.

The SF podium reuses the current placeholder billboards: P3→P2→P1 entrance, winner close-up, group celebration, explicit rank labels, pooled 32-instance confetti. Special DSQ uses one shared disclosure clock: alert30s, evidence34s, reclassify40s, re-award44–74s, final74s. Normal ceremony lasts40s, special84s. Existing 10s coast and three 5s spotlights remain before the ceremony. All camera/entry/effect positions derive from replay time, not prior playback order. Reduced-motion removes the sonic flash and podium confetti.

## Main implementation boundaries

| Files | Responsibility |
|---|---|
| `lib/racing/v9/{ultimate,simulator}.ts` | New version namespace, one-use causal acceleration and immutable activation metadata |
| `lib/racing/integrator.ts`, `v6/simulator.ts` | Optional policy hook; absent hook retains historical RNG and integration |
| `ultimate-effects.ts`, `ultimate-banner.tsx`, `competition-director.ts` | Pooled Gold/Hyper graphics and observed launch/chase coverage |
| `racer-profiles.ts`, `racer-profile-ui.tsx`, `racer-profiles.css`, `watch.tsx` | Local-only metadata validation, editing, images, separate info/track interactions |
| `v9/ceremony.ts`, `podium-scene.ts`, `ceremony-hud.tsx`, `watch-hud.ts` | Shared disclosure clock, deterministic podium camera/entry, rank labels and final DSQ priority |
| `race-worker.ts`, `race-settings.tsx`, `build-watch.mjs`, `serve-watch-v9.mjs` | Existing isolated worker and Windows launcher with reproducible cases and exact build identity |
| `test-racing-v9.mjs`, `test-racing-final.mjs`, `screenshot-v9.mjs`, workflow | Frozen results, 40k aggregates, actual browser/Windows and performance gates |

## Verification record

Final runtime **`a157afa17705c3fa837e294e01638157eeb60f9d`**, tree `c1394432e5875f4e22f1a6d0aa4cda412c8d5b77`. [CI run 41382077851](https://github.com/darkkyoung/Holocron/actions/runs/41382077851). The final report is a subsequent documentation-only commit; its SHA is not the ZIP runtime SHA.

Linux actual Chrome/Chromium 156.0.8078.4, SwiftShader, 1440×900 / 390×844 / 360×800: **PASS**. Native browser fullscreen (including narrow viewports), large HUD, keyboard roster1–8 and AUTO, playing/paused seek, profiles with playback continuing, Escape, failed-image fallback, unsafe-URL rejection, script text rendered literally, local save/reload/export/import, three qualifying results, Gold/Hyper movement and seek identity, podium entry movement, special-DSQ reveal/reaward, reduced-motion mode and actual automatic segment-end transitions all passed. External network requests were blocked; the missing-image fixture was fulfilled in memory. This is not physical mobile OS/keyboard testing.

Actual Gold motion has35 sampled poses per viewport, plus arbitrary-seek pose equality. Podium has seven recorded stage poses and a live entry movement check. The desktop QA WebM is a real 37.28-second browser recording at1440×900, not generated imagery; its25fps encoding is not a3D rendering benchmark. Segment-boundary QA does not claim one uninterrupted1× recording of the entire meeting. The long replay benchmark below is separate.

Final `a157afa` captures were opened and inspected: Gold/Hyper trails and aura, mobile profile while race remains visible, desktop podium rank labels, 360px official reaward and portrait fullscreen HUD. No overlap/clipping blocked these actions. Placeholder characters/images are intentional; no biography was invented.

Earlier candidate failures were not counted as passes: asynchronous import assertion before file-read completion; a hidden desktop-only profile locator on mobile; a fixed120ms camera-render wait that was too short on the software runner. Tests now wait for their actual postconditions. Inspection also prompted real UI fixes: mobile information buttons beside standings rows, explicit podium P1/P2/P3 marks and correct podium camera captions. No physics/record changes were made for those fixes. A later Windows job failed before page creation because Playwright's video encoder was absent; the final workflow installs the official FFmpeg component. That failed job is not counted as a browser pass.

### Executed contract and build gates

| Check | Result / scope |
|---|---|
| Historical v0.1–v0.8 | PASS, separate Golden and deterministic suites; no Golden overwritten |
| v0.9 detailed simulator | PASS, 100 full/summary pairs, 1,158,528 physical route segments; lap settings 1/3/15/30 |
| Stage B official-data invariance | PASS, 20 frozen Stage A v0.9 hashes of race/qualifying/shortcut/official/Ultimate payloads |
| 40,000-race balance | PASS for the three conditional KPI targets; whole-race rarity remains a design limitation |
| Profile security / storage | PASS, stable IDs, bounded/allowlisted JSON, bad URL rejection, literal text, unavailable/corrupt storage handling |
| Ceremony / special DSQ | PASS, entry order, one disclosure clock, 0 points, reclassification and arbitrary-seek reproduction |
| Rendering architecture | PASS, one RAF, 30FPS cap, HUD about 5Hz, 250ms simulation tick, no effect-owned RAF |
| TypeScript | PASS, `pnpm exec tsc --noEmit` |
| Lint | PASS with zero errors; one existing unrelated AI-test unused `debit` warning remains |
| Main application build / standalone v0.8 and v0.9 | PASS; standalone Vite large-chunk advisory remains |
| `git diff --check` | PASS |

### Feature completion boundaries

| Area | Status | Evidence / remaining limit |
|---|---|---|
| Causal Gold / Hyper Ultimate | IMPLEMENTED + tested | New v0.9 only; three conditional KPI targets met; no position jumps or guaranteed winners |
| Rare-event intent | PARTIAL | Hyper share is 10.27%, but at least one Ultimate appears in 88.66% of races |
| Ultimate visuals / camera / reduced motion | BROWSER VERIFIED | Actual Gold/Hyper poses, seek identity, observed comeback coverage; placeholder art retained |
| Profile view / local editor | BROWSER VERIFIED | Stable IDs, separate info/track actions, local save/import/export and image fallback |
| SF podium / special DSQ re-award | BROWSER VERIFIED | Seven stage poses, live entry movement, final reclassification and hidden-until-time policy |
| Entire replay flow | BROWSER VERIFIED for segment transitions | Qualifying→race→ceremony end transitions; not a new server-synchronized live broadcast |
| Production profiles / seasons / betting | NOT IMPLEMENTED in this phase | Explicitly outside scope |
| User Windows hardware GPU / physical mobile device | NOT VERIFIED | Hosted software-GPU functional QA does not substitute for these devices |

The local Playwright Chromium download was BLOCKED by a corrupt/empty archive after the official installer's bounded retries. Actual visual tests were therefore run in supported GitHub Actions browser environments. This is not reported as a local browser pass. There is no user GPU result for this new version.

## Actual rendering and resource measurements

Linux Xvfb headed Chromium / software SwiftShader; NOT hardware Windows GPU. Browser 156.0.8078.4. Samples 8s per scene after warmup; same runner/browser/viewports. Before: pinned delivered v0.8. After: final v0.9. Different seeds/camera timelines mean matched categories, **not identical frame workloads or a causal speedup claim**.

**Software 30FPS target: NOT MET. Physical Windows hardware GPU: NOT VERIFIED.** The CI pass verifies behavior/resource assertions, not a 30FPS claim. Existing single RAF, maximum30FPS cadence, approximately5Hz HUD and250ms simulation tick contracts pass. Full data includes the >33.3ms ratio, task/script time and heap per scenario.

| Scene | Before avg FPS | After avg / median / p05 FPS | After p50 / p95 / p99 ms | >50ms | Draws / triangles | Canvas pixels |
|---|---:|---:|---:|---:|---:|---|
| preshow-grid | 18.27 | 21.46 / 21.69 / 16.53 | 46.1 / 60.5 / 83.9 | 11.8% | 100 / 9018 | 1023×575 |
| start-8 | 18.29 | 18.32 / 18.73 / 13.95 | 53.4 / 71.7 / 94.4 | 69.2% | 79 / 8526 | 1023×575 |
| normal-corner | 18.34 | 19.10 / 19.92 / 14.99 | 50.2 / 66.7 / 86.9 | 51.3% | 62 / 8380 | 1023×575 |
| draft-boost | 19.07 | 17.95 / 18.69 / 13.57 | 53.5 / 73.7 / 106.0 | 72.0% | 78 / 8514 | 1023×575 |
| ultimate | 17.86 | 18.22 / 19.23 / 13.11 | 52.0 / 76.3 / 100.9 | 66.9% | 28 / 7926 | 1023×575 |
| incident | 18.95 | 17.52 / 18.62 / 12.50 | 53.7 / 80.0 / 91.5 | 85.0% | 39 / 8242 | 1023×575 |
| auto-cuts | 18.11 | 17.94 / 18.83 / 13.91 | 53.1 / 71.9 / 88.8 | 75.4% | 65 / 7698 | 1023×575 |
| manual-side | 17.68 | 17.15 / 17.95 / 13.04 | 55.7 / 76.7 / 92.2 | 87.5% | 37 / 8168 | 1023×575 |
| last-lap | 19.05 | 18.87 / 20.08 / 13.53 | 49.8 / 73.9 / 81.8 | 48.3% | 32 / 7076 | 1023×575 |
| finisher-spotlight | 17.63 | 17.07 / 17.76 / 13.44 | 56.3 / 74.4 / 89.2 | 91.2% | 64 / 10910 | 1023×575 |
| fullscreen-large | 11.58 | 11.63 / 11.96 / 8.89 | 83.6 / 112.5 / 144.4 | 94.6% | 35 / 8144 | 1440×900 |
| branch-route | 18.02 | 17.94 / 18.80 / 14.71 | 53.2 / 68.0 / 70.2 | 86.7% | 43 / 8254 | 1023×575 |
| qualifying-overlap | 18.64 | 18.66 / 19.92 / 14.51 | 50.2 / 68.9 / 77.9 | 52.3% | 49 / 7434 | 1023×575 |
| qualifying-results | 19.49 | 19.57 / 20.83 / 15.13 | 48.0 / 66.1 / 82.9 | 35.3% | 100 / 9018 | 1023×575 |
| trackside-pan | 18.13 | 17.59 / 18.59 / 13.19 | 53.8 / 75.8 / 97.5 | 82.9% | 76 / 8538 | 1023×575 |
| podium-celebration | — | 30.01 / 30.58 / 23.81 | 32.7 / 42.0 / 57.7 | 2.9% | 21 / 292 | 1023×575 |

Draw/triangle instrumentation includes instanced draws (the podium confetti uses one32-instance mesh). No claim is made that video recording frame rate equals render rate.

| Retained heap / record | Before | After |
|---|---:|---:|
| Repeated playback seconds | 120 | 360 |
| Record JSON bytes | 1655009 | 1701790 |
| Post-GC start heap MiB | 10.53 | 11.48 |
| Post-GC last heap MiB | 14.47 | 15.62 |

After 12 actual record replacements: 1 live WebGL context, 1 canvas, 8 event badges; same-case reset counts stay at 358 buffers / 12 textures. Retired contexts are lost/collected, and every replacement creates a new generation. This is a six-minute bounded resource test, not proof of zero leaks over unlimited sessions. Heap growth is shown above; it is not hidden or described as unchanged.

After-scenario main-thread task time range 53.2–82.0ms/s; script time 25.9–44.8ms/s. SwiftShader is software rasterization and remains the measured bottleneck context; these numbers do not isolate a hardware GPU's cost.

The developer performance JSON remains available for actual Windows GPU checks at both normal and fullscreen resolutions. Exact GPU name and canvas pixels must accompany any future30FPS acceptance.


## Final Windows and artifact acceptance

Final run41382077851: Linux job125074852973 **SUCCESS**, Windows job125081906389 **SUCCESS**. Windows installed Chrome **156.0.8078.48**, headless WebGL2 with explicitly selected SwiftShader. The Windows PowerShell static server passed SHA verification, occupied-port refusal and alternate port43875. The same Linux-built artifact was downloaded by the Windows job; no Windows rebuild substitutes different files. The BAT is the existing wrapper around that server; a physical user's Explorer double-click is not claimed.

Actual Windows functional QA passed desktop1440×900, touch-emulated390×844 and360×800, fullscreen/HUD, keyboard/seek, local profiles, continuous segment transitions, Ultimate poses and deterministic seeks, podium entries, reduced-motion and special-DSQ reaward. Windows report: `evidence/phase2d-final-windows-qa.json`. Windows Hyper, reduced-motion Gold, mobile profile and podium captures were opened and inspected. Desktop live Gold sampling spanned35.018s due to hosted-runner delays (15 of35 samples showed an active effect); the final `desktop-gold-ultimate.png` is after the effect. It is not cited as the active-Gold visual proof. Linux Gold, Windows reduced-motion Gold and Hyper captures plus motion JSON provide the applicable proof. Functional motion samples are not a hardware-FPS measurement.

The downloaded archives were retained **without repacking** and all five SHA-256 values and byte lengths were checked against the GitHub Actions API artifact digests. Full machine-readable manifest: `evidence/phase2d-final-artifacts.json`.

| Exact CI artifact | Bytes | GitHub artifact |
|---|---:|---|
| Windows demo | 570,786 | [13114169464](https://github.com/darkkyoung/Holocron/actions/runs/41382077851/artifacts/13114169464) |
| Windows Chrome captures / motion / video | 35,222,541 | [13114583749](https://github.com/darkkyoung/Holocron/actions/runs/41382077851/artifacts/13114583749) |
| Linux Chromium v0.8/v0.9 QA | 66,496,857 | [13113867959](https://github.com/darkkyoung/Holocron/actions/runs/41382077851/artifacts/13113867959) |
| Before/after performance | 2,900,073 | [13114283905](https://github.com/darkkyoung/Holocron/actions/runs/41382077851/artifacts/13114283905) |
| Balance / contracts | 5,281 | [13114985764](https://github.com/darkkyoung/Holocron/actions/runs/41382077851/artifacts/13114985764) |

Demo filename: `HOLOCRON-Phase2D-Final-v09-a157afa-Windows.zip`.

Demo SHA-256: `d41ecc31aebc022c2208636eac5d40b29e3cb9fb2d6a62fe39a4aaa13794313e`.

Build-info: clean runtime `a157afa17705c3fa837e294e01638157eeb60f9d`, simulator`galactic-racing-0.9.0`, default seed`9ru-2`, official race358.25s; built2026-11-02T03:21:15.570Z. Artifacts expire2026-12-02 on Actions; original demo and QA copies are also delivered separately. Subsequent documentation/evidence-only commits intentionally do not rebuild this verified runtime.

## Windows quick inspection and limits

Extract the exact final ZIP into a **new folder**, then run `START-RACING.bat`. Keep its terminal open. If port43874 is occupied, it must fail closed; run `START-RACING.bat -Port 43875` instead. Compare the visible build strip and `build-info.json` to runtime `a157afa17705c3fa837e294e01638157eeb60f9d`, `galactic-racing-0.9.0`, PHASE2-D FINAL. No Node/Python installation is required for the packaged static demo. Managed-machine policy still takes precedence.

Start with default `9ru-2`, choose the ULTIMATE major scene and play at1×. Local demo settings provides Hyper `9ru-7`, non-winning podium `9ru-0` and special-DSQ `9ru-59`. Switch among qualifying/race/ceremony or enable continuous playback. Use a separate information icon for profiles; LOCAL DEMO ADMIN saves only in this browser origin. `1`–`8` select fixed roster IDs, `,`/`.` cycle ranks, `/` returns to full AUTO. None changes the official result.

For a physical Windows GPU performance decision, use the developer performance JSON for at least30s of ordinary racing, Ultimate, and fullscreen/largeHUD, retaining GPU/renderer and actual canvas resolution. The earlier RTX4070SUPER Phase2-A measurement does not validate this version. No actual user hardware or physical mobile OS test is claimed here.

**Decision:** integrated prototype inspection is supported by the measured functional gates; physical-GPU30FPS and whole-race rarity are not fully accepted. Production deployment remains **NO-GO / outside authorization**. Operational authentication, persistent profile/seasons, synchronized broadcast disclosure and betting/settlement remain separate work. No follow-up phase was started.
