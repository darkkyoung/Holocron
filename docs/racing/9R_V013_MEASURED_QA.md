# v0.13 measured QA and delivery acceptance

Acceptance is **PARTIAL overall**: the engine and cinematic implementation are complete, but stable hardware-GPU30FPS is NOT VERIFIED and the old frequency of consecutive-Ultimate comeback entertainment is not preserved by the newly requested narrow window. No Production approval is implied.

| Identity | SHA |
|---|---|
| Fresh canonical main | `93646c066aaf8a33f1a7c062f8404dd7cd7b211e` |
| Parent v0.12 QA | `ec27555df7e1d9b37f815a98632846bbabec08e6` |
| First v0.13 engine implementation / policy freeze | `a4bc3c7a32293bb25a90bf0b0775ff6fc10b14f1` |
| Measured cinematic / six-minute performance build | `c02da0dee404a0995fe1ef902068939e687fdcfc` |
| Final delivered execution, fullscreen height correction | `9f3c8916b3a106c6feb8e882ffd48bcfc56bca99` |
| Measurement-only helper correction | `119f451aec7e2df0d069c8e872a3de56159565f1` |

Branch: `feature/galactic-racing-v013-final-lap-cinematic`. Final report commit and tree are the branch head published after this document; the executable has its own immutable build SHA. Do not confuse documentation commits with execution builds.

- v0.1–v0.13 regression / Golden, TypeScript, lint, app build, independent demo build and diff-check: PASS on cinematic build. Final HUD delivery also passed these checks (run42572182594).
- v12 full-record hashes20: PASS. v13 contracts:1227 phases/locks,16784 GAP samples,20 emergency checks, forced activeDSQ/outsideDSQ/activeDNF policies PASS.
- Local browser launch: BLOCKED by runtime Unix socket permission; no bypass. Actual browsers run in isolated Linux/Windows GitHub Actions instead.
- User hardware Windows GPU30FPS and physical mobile devices: NOT VERIFIED. Viewports are emulated; GPU is SwiftShader.
- Pilot1000: Hyper24/29 conditional wins82.76% (small sample); Gold154/244 wins63.11%;0/1/2 activation counts697/296/7. This is not the final holdout.
- Production/main/DB/Migration/Credit/AI/operational scheduler changes:0. Phase3 operating implementation:0.

## Independent frozen-engine result (complete)

Local and Linux CI produced identical JSON and official aggregate digest `fb9fc73f7d3651b03ea880d05d90bcc5202ca37b53a816c7080fbfa46d28ed39` for `13holdout-0..39999`. No tuning used these Seeds. Later presentation fixes do not change engine blobs or this result.

| Metric | v0.13 |
|---|---:|
| Gold conditional official win | 6722/10171 = 66.0899% |
| Gold conditional official podium | 8411/10171 = 82.6959% |
| Hyper conditional official win | 992/1138 = 87.1705% |
| Hyper win Wilson95 | 85.1017–88.9892% |
| Hyper conditional official podium | 1051/1138 = 92.3550% |
| Hyper share | 1320/13169 = 10.0235% |
| 0 / 1 / 2 launches | 27115 / 12601 / 284 |
| Own88–90 /90–94 /94–96% | 1263 /9997 /1909 |
| Outside-window / spacing errors | 0 /0 |
| Hyper one-lap lead over ANY live opponent | 0 observed |
| Max actual jump | 1079.95m |
| Conservative extra-distance upper bound | 2578.5732m, not final lead |
| Max observed lead over any live opponent | 3108.0368m |
| Mean / p95 race duration | 362.8538 /369.75s |
| Special podium DSQ | 392/40000 = .98% |
| Winner did not use Ultimate | 76.18% |
| Mean leader changes | 40.8162 |

Conditional denominator is prelaunch P5–P8, RACING, own88–96%; official final results include specialDSQ. Historical v12 Hyper80.12% /Gold55.79% used70–95%, so these percentages are **not the same cohort**. Gold and Hyper physical parameters did not change. Hyper target70% and Wilson lower bound70% both pass this sample. No winner was reassigned.

An important experience tradeoff remains: zero-activation races increased to67.7875%, and two-activation races fell to.71%. The narrow late window plus18s spacing makes Hyper→Gold reversals much rarer. This is not hidden by reporting only the strong conditional win rate.

## Lap-length comparison (1000 separate Seeds per setting)

| Laps | Mean seconds | 0 /1 /2 launches | Hyper | Terminal before full visual return |
|---|---:|---|---:|---:|
| 1 |38.2035|975 /25 /0|4|4|
| 3 |110.3713|873 /127 /0|22|22|
| 5 |182.5018|809 /191 /0|23|23|
| 10 |362.8238|668 /324 /8|38|3|
| 15 |543.4588|576 /398 /26|50|1|
| 30 |1086.8705|404 /460 /136|56|0|

The last column counts official terminal timestamps before the planned return, so it is a required terminal interruption, not an engine freeze or phantom finish. Three/five-lap full cinematics and two-Ultimate exchanges are limited under the requested unchanged policy. Default10laps remains. A **separate, unimplemented** future experiment could compare shorter lap-specific spacing (e.g.6s at3laps,9s at5laps) against18s, with new balance/overlap tests and explicit policy approval. v13 does not apply this proposal or force launches.

## Additional frozen-engine audit

The same official digest was independently reproduced by CI run42565696514. Extra reporting did not change any physical engine blob. Ordered double activations: Gold→Gold230, Hyper→Gold26, Hyper→Hyper5, Gold→Hyper23. **No Hyper-leading → Gold official comeback win was observed in this40k holdout.** This remains allowed by physics, but a demonstrated10-lap case is NOT VERIFIED under the narrower window; it is not manufactured for the demo.

All70 cancelled Hyper entries were recorded safe-entry timeouts. There is no extra random failure draw.251/1320 Hyper records reached an official terminal state before the planned visual reveal; their cinematic must truncate. One activation-tick DNF occurred in the holdout (Gold). Separate frozen-policy case13edge-6110 provides Hyper activation-tick DNF, while13edge-4919 proves P1 DNF can interrupt another racer's active Gold.

## Actual browser review and honest failure history

Cinematic execution `c02da0d`: run[42567742672](https://github.com/darkkyoung/Holocron/actions/runs/42567742672) passed Linux Chromium156.0.8078.4, Windows Chrome, historical regressions and the frozen40k audit. Linux actual WebGL2/SwiftShader captured all eight cinematic phases dynamically at0.5/1/2x on1440×900,390×844 and360×800; fullscreen motion also captured every phase. Cancellation, P1DNF, interrupting P1DNF and activation-tickDNF were dynamically exercised at all three viewport sizes. Camera/opacity/world positions were logged from rendered frames, including official movement while hidden. Profile, GAP, manual/AUTO, Seek, pause, reduced-motion, qualifying and specialDSQ checks are in the raw report.

The final visual review caught a partly hidden P8GAP at fullscreen largeHUD. The final execution candidate changes only the fullscreen timing tower height allowance by10 unscaled CSS pixels; a new browser assertion requires all eight rows and separation from the minimap at1440×900. Final delivery run[42572182594](https://github.com/darkkyoung/Holocron/actions/runs/42572182594): Linux PASS including the new eight-row fit/minimap-clearance assertion; Windows PASS on Chrome156.0.8078.80 / win32 / SwiftShader, including the identical downloaded executable ZIP and final fullscreen fit assertion.

Initial arrival framing made the returning car too small; the measured cinematic build uses bounded12–48degree zoom and actual current-position tracking. Inspected static images and frames from the actual186.68s Linux desktopWebM show charge, body+billboard fade, held departure, road-following camera flight, arrival hold, reappearance, smoke and orange mechanical shockwave. The QA recording includes intentional Seek/settings operations; it is not an edited advertisement. Dynamic JSON is authoritative for precise timing rather than wall-time estimates from a contact sheet.

Earlier run42564334458 failed a Windows GAP DOM-read timeout; root cause was not conclusively established. Later Windows runs passed. An intermediate2x software rendering run missed a short fade sample and was marked PARTIAL; the final cinematic run observed it. These results do not guarantee every slow device will render every125ms effect. Missing samples are never counted as visual PASS.

The physical engine remains exactly the frozen eight-file manifest. Later changes only adjust framing, terminal-camera precedence, retirement caption priority, local Hyper highlight entry(T−3s), QA measurement and the final fullscreen height. A finish long after its cinematic cannot interrupt a later Gold lock. Highlight entry includes the whole charge rather than jumping directly to physical activation.

## Performance and resources

Measured browser: Chromium156 / Linux Xvfb / ANGLE SwiftShader software rendering. The following main-run numbers are from `c02da0d`, before the final one-line HUD height correction; geometry, shaders, engine and renderer loop are identical in the final candidate. They are **not Windows hardware-GPU results**. Eight-second samples; version seeds differ, so this is not a controlled identical-frame causal comparison.

| Scene | v12 avgFPS | v13 avgFPS | v13 median / low5FPS | v13 p50 /p95 /p99 ms | >50ms | Draws /triangles |
|---|---:|---:|---|---|---:|---|
| Normal corner |19.51|18.42|19.76 /13.21|50.6 /75.7 /94.1|56.85%|51 /8220|
| Gold Ultimate |18.13|18.24|18.69 /14.37|53.5 /69.6 /88.7|71.03%|43 /8312|
| Fullscreen large |12.41|11.75|11.85 /9.64|84.4 /103.7 /130.6|96.77%|51 /8208|
| Podium |30.02|29.90|30.49 /22.99|32.8 /43.5 /51.6|2.10%|21 /292|
| SpecialDSQ |30.00|29.93|30.12 /20.79|33.2 /48.1 /56.8|3.78%|19 /164|

Stable30FPS in this software renderer: **FAIL**.30FPS cap/single applicationRAF/HUD5Hz contracts: PASS. Windows hardware stable30FPS: NOT VERIFIED. Main-thread task/script time for normal v13:74.61/41.06ms per second; fullscreen48.72/25.20. Full counters,33.3ms threshold and phase samples are in `evidence/v013-performance.json`.

The original afterburn measurement had0frames and NaN/null statistics, so it is **INVALID**, not a PASS. The harness regenerated an already-selected Seed and could observe its old seed marker before the worker reset playback. The correction reuses that immutable record and rejects samples<2. A separate successful run[42571521618](https://github.com/darkkyoung/Holocron/actions/runs/42571521618) downloaded and verified the exact `c02da0d` demo, then remeasured both Phantom windows without changing game code:

| Window | v12 avgFPS | v13 avgFPS | v13 frames | v13 p50 /p95 /p99 ms |
|---|---:|---:|---:|---|
| Charge/burst/fade/return window |10.17|13.92|111|69.4 /98.8 /124.3|
| Afterburn window |12.94|15.23|120|60.6 /91.9 /104.8|

These separate-worker values supersede only the invalid Phantom measurement; they are not cherry-picked replacements for slower valid main-run scenes. Raw initial and remeasurement data are retained.

Six-minute replay/record-swap resource test: PASS for bounded contexts and like-for-like buffers/textures. Retained heap afterGC14,597,704→17,425,488bytes (+2.70MiB), last checkpoints17.25–17.43MB. One liveWebGLcontext, onecanvas,8badges,358buffers/12textures at equivalent fresh starts through12swaps; prior contexts lost/collected. This is six-minute evidence, not a proof of zero unbounded growth over arbitrary durations. Official record JSON1,700,015bytes is reported separately from heap.

## Reproduction / delivery contract

Extract the delivered ZIP into a new folder, then run `START-RACING.bat`. For an occupied default port, run `START-RACING.bat -Port 43875`. The launcher must fail closed instead of opening an older server. Check the top build strip and `build-info.json` for `galactic-racing-0.13.0` and the delivered execution SHA.

Open LOCAL race settings and choose `Hyper Phantom Warp · 13pilot-12`; open 주요 장면 and click ULTIMATE, then play. It starts at the three-second charge. Use1–8 for a fixed racer, comma/period to cycle, `/` or AUTO to restore current automatic priority,0.5/1/2× to inspect. `13pilot-133` is safe cancellation; `13edge-4919` is P1DNF interrupting another Gold; `13edge-6110` is Hyper activation-tickDNF; `13pilot-203` is special podiumDSQ. Profiles and local settings do not affect stored official results.

This is a sealed local replay containing future records. It is not a secure first-broadcast client, operating scheduler, market or Production service. Phase3 remains documentation only. Physical mobile devices and the user's Windows hardware GPU are not verified by viewport-emulated softwareGPUCI.

## Historical balance comparison

Both use40000 official races; RNG namespaces and activation cohorts differ. This is a version comparison, not a paired causal estimate.

| Grid | v0.12 win% | v0.13 win% |
|---|---:|---:|
|P1|12.8075|13.5350|
|P2|12.9550|13.4850|
|P3|12.7475|13.2600|
|P4|12.4675|13.0200|
|P5|12.7375|12.6100|
|P6|12.3425|11.9225|
|P7|12.0700|11.4850|
|P8|11.8725|10.6825|

| Racer ID | v0.12 win% | v0.13 win% |
|---|---:|---:|
|r1|12.5700|12.6325|
|r2|12.3475|12.6775|
|r3|12.4875|12.4325|
|r4|12.6500|12.4550|
|r5|12.4550|12.2825|
|r6|12.2450|12.3900|
|r7|12.5150|12.6125|
|r8|12.7300|12.5175|

v12 had14208/18832/6960 races with0/1/2 activations (35.52% zero,17.4% two). v13 has27115/12601/284 (67.7875% zero,.71% two). This is a material loss of consecutive-Ultimate variety under the confirmed narrow window and unchanged18s spacing. It is not fixed by secretly changing probabilities or forcing an event. A separate policy experiment would be needed if the user wants the old exchange frequency.

Mean race duration:362.2867s→362.8538s. Ordinary race-terminal event counts: DNF11591→11795, DSQ3434→3532. These are **event counts**, not the percentage of races with at least one such event. Special podiumDSQ:380→392 races (.95%→.98%). Gold/Hyper power, equal base abilities, track length and default10laps remain unchanged; the new activation window and RNG namespace can change observed outcomes.

## Natural comeback search and remaining limits

An additional fixed-policy case search over100,000 `13reversal-` Seeds found no10-lap Hyper-leading→Gold official comeback win. This was case finding, not a second independent balance holdout, and no parameters were changed afterward. `evidence/v013-reversal-search.json` records the negative result. Physics permits two activations and Hyper losses, but preserving the former natural comeback frequency is **PARTIAL / not demonstrated**. No manufactured winner or forced minimum launch was added.

Three/five-lap Hyper runs often officially finish before the full cinematic can return; the renderer correctly cuts to official finish. This protects result integrity at the cost of the full movie, explicitly PARTIAL for short-race spectacle. A separate spacing/short-cinematic policy experiment is required before promising both old frequency and the new late-window requirements.

Final deliverable/CI hashes and final Linux/Windows screenshot review are recorded in the delivery section. No functional assertion turns the unmeasured userGPU into a PASS.

## Changed responsibilities and replay semantics

- `lib/racing/v13/{ultimate,simulator}.ts`: versioned final-window policy; opt-in activeDSQ protection at the existing incident boundary. Gold/Hyper movement code is shared unchanged.
- `lib/racing/v13/presentation.ts`: cached immutable cinematic and retirement plan, physical/display-time separation, terminal truncation and priority lookup.
- `cinematic-effects.ts` / `scene.ts`: pooled charge, fade, smoke, shockwave and deterministic camera framing. Body and billboard share opacity; no new applicationRAF.
- `watch.tsx` / `minimap.tsx` / `ultimate-banner.tsx`: consistent WARP masking, current-state captions, actual3s highlight preroll, manual override and AUTO return.
- `player.css`: only fullscreen tower height corrected at final delivery; eight-row fit/minimap clearance is now asserted in the real browser.
- `scripts/racing/*v13*`, `qa-cinematic.mjs`, `test-racing-v13.mjs`: independent holdout, lap comparisons, case selection, full-record regression and actual dynamic render evidence.
- Phase3 architecture receives only the T−3 disclosure contract. No server, database, market, settlement or application-store implementation.

Presentation durations in race time: precharge3s; burst.250s; fade.125s; fixed departure2s; road flight.550s; fixed arrival2s; rematerialization.250s; follow2.2s where no terminal/emergency intervenes. On normal Hyper `13pilot-12`, T328000ms, J328750ms, reappearance332925ms, follow ends335375ms; the physical afterburn has already continued throughout. Recorded safe-entry delay can postpone the burst, but the presentation never writes T/J. Terminal status and a preceding-P1DNF interrupt the movie truthfully.

Smoke decay: cancelled recorded entry2.5s; actual retirement3.5s with first.3s mechanical shockwave. The visible mechanical depiction is not a rewritten official incident cause or a fabricated wall impact. The benchmark's probeRAF belongs only to test instrumentation, not the shipping application.

## Acceptance checklist

| Item | Result / limit |
|---|---|
| Own88–96% only, max1/racer, max2/race,18s spacing | PASS; illegal/spacing0 in40k and six lap settings |
| Gold physical policy and FX | PASS; protected blobs unchanged |
| New Hyper movie without physical freeze / duplicate jump | PASS in contract and actual cinematic browser run |
| Recorded safety cancellation / activeDNF / P1 emergency | PASS; real reproductions and frame-state logs |
| Active ordinaryDSQ protection / outside ordinaryDSQ / specialDSQ | PASS; forced policies plus actual holdout / browser podium |
| Manual choice, AUTO, Seek, pause, rates, reduced-motion | PASS in actual Linux/Windows cinematic candidate |
| v0.1–v0.12 Golden and historical replay | PASS; no historical Golden overwritten |
| Hyper conditional win>=70% | PASS87.1705%, Wilson lower85.1017% |
| Former Hyper→Gold reversal frequency | PARTIAL; none found in40k plus100k case search |
| Full movie in3/5lap races | PARTIAL; official finish must truncate |
| Stable30FPS on softwareGPU | FAIL; cap is preserved but actual rate is lower |
| User Windows hardwareGPU / physical mobile | NOT VERIFIED |
| Production changes |0 |

## Delivered artifact identity

Final execution SHA: `9f3c8916b3a106c6feb8e882ffd48bcfc56bca99`; clean build, simulator `galactic-racing-0.13.0`. `race.json`, `special.json`, `cases.json` are byte-identical to measured `c02da0d`; only the fullscreen CSS allowance changed in runtime source.

- File: `Galactic-Racing-v0.13-9f3c891-Windows.zip`.
- Exact GitHub artifact[13654880416](https://github.com/darkkyoung/Holocron/actions/runs/42572182594/artifacts/13654880416), downloaded without repacking.
- ZIP SHA256 / GitHub artifact digest: `70813b4dfc936be2e2fd2cdbf4bf96d3c02116d8a4d91d22c00b623b0a5a81c3` — identical.
- Final Linux screenshot/video artifact[13654009247](https://github.com/darkkyoung/Holocron/actions/runs/42572182594/artifacts/13654009247), SHA256 `e21b314356ba638b2786b02b3c8d278607f1080912d20a13d8cb48152dbe55a1` — downloaded digest verified.
- Frozen40k artifact[13652293332](https://github.com/darkkyoung/Holocron/actions/runs/42567742672/artifacts/13652293332), raw JSON SHA256 `a35465a2656d91930dc6f5c29016b9b198c2fae7697fa4302439632ab8d5926f`; byte-identical to committed balance evidence.
- Phantom remeasurement artifact[13652853468](https://github.com/darkkyoung/Holocron/actions/runs/42571521618/artifacts/13652853468), ZIP SHA256 `e1857364f8d33c9026a9dc2992a4780dac233d948d69d2e4aa3e44c9d872435c` verified.

The downloadable QA evidence bundle is a derived collection, distinct from the exact executable ZIP. Original full desktopWebMs and per-frame motionJSON accompany screenshots. Mobile views have dynamic rendered-position logs and screenshots, not separate mobileWebM recordings or physical-device validation. The short preview is an excerpt of the actual final Linux capture, not generated animation.

Final `9f3c891` Linux actual1x Hyper frame-interval observation (rendered-pose MutationObserver; continuous1x clock, instrumented QA): desktop201samples, average18.21FPS, median19.08,low5 9.96,p50/p95/p99 52.4/100.4/109.4ms,>50ms55.5%;390px331samples average30.05FPS and360px330samples average30.00FPS, both p95/p99 33.5ms,>50ms0. This supplements the earlier full CDP benchmark and does not turn desktop software performance into a PASS. Slight finite-window averages above30 are measurement/cadence boundary effects, not a new uncapped loop.

Final Windows screenshot/video artifact[13654987486](https://github.com/darkkyoung/Holocron/actions/runs/42572182594/artifacts/13654987486), SHA256 `2e6acbf477af9c162a2fbf2248e836dffb7476bc741fa811bbc74be99040c4fb` verified. The Windows launcher checked exact build SHA, occupied-port blocking and alternate43875. Final actual Chrome report PASS at all three viewports, all0.5/1/2x phases, fullscreen and edge cases. Desktop rate samples606/300/151; fullscreen200. Mobile/narrow rate samples660/331/166; fullscreen330 each.

Final Windows1x rendered-pose intervals (instrumented SwiftShader, not userGPU):

| Viewport | Average FPS | Median FPS | Low5 FPS | p50/p95/p99 ms | >50ms |
|---|---:|---:|---:|---|---:|
| desktop | 27.22 | 28.17 | 19.12 | 35.5/52.3/63.0 | 7.69% |
| mobile | 30.00 | 31.95 | 21.19 | 31.3/47.2/47.7 | 0.00% |
| narrow | 30.04 | 31.95 | 21.28 | 31.3/47.0/47.7 | 0.00% |

Visual review used actual final Linux and Windows raw desktop recordings, chronologically decoded frames and synchronized motion JSON. Mobile viewport screenshots and time-progressing motion records are included; no physical mobile or separate mobile video is claimed. The eight-row fullscreen correction was visually checked on both platforms. Full uninterrupted broadcast-duration playback was not separately recorded: continuous-mode boundary transitions and the full official simulation were verified.
