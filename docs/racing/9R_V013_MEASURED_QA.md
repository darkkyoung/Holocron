# v0.13 measured QA — work in progress

This is a checkpoint, not final acceptance. Frozen execution candidate: `c02da0dee404a0995fe1ef902068939e687fdcfc`, CI run42567742672. Final Linux dynamic QA passes all eight phases at0.5/1/2x for all three viewports, plus fullscreen motion and mobile cancellation/DNF. Final performance and Windows are pending. Independent40k is complete.

- Parent QA SHA: ec27555df7e1d9b37f815a98632846bbabec08e6.
- First implementation SHA: a4bc3c7a32293bb25a90bf0b0775ff6fc10b14f1.
- Local TypeScript / lint / app build: PASS (one pre-existing unused-variable warning in unrelated assistant test).
- v12 full-record hashes20: PASS. v13 contracts:1227 phases/locks,16784 GAP samples,20 emergency checks, forced activeDSQ/outsideDSQ/activeDNF policies PASS.
- Local Chromium: BLOCKED by runtime Unix socket permission. No bypass attempted. Final Linux actual Chromium QA PASS; final WindowsChrome QA pending. Earlier run42565696514 passed Windows; first run42564334458 had a GAP DOM-read timeout. Do not substitute the earlier Windows result for final candidate verification.
- User hardware Windows GPU30FPS: NOT VERIFIED.
- Pilot1000: Hyper24/29 conditional wins82.76% (small sample); Gold154/244 wins63.11%;0/1/2 activation counts697/296/7. This is not the final holdout.
- Production/main/DB/Migration/Credit/AI/operational scheduler changes:0.

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

## Browser review checkpoint

Initial Linux Chromium156.0.8078.4 actualWebGL2/SwiftShader run42564334458 captured all eight cinematic phases at0.5/1/2x in1440×900,390×844 and360×800. Static images and frames extracted from the actual140s desktopWebM were inspected. Charge, translucent body/billboard, fixed departure, road flight, smoke and DNF were visible. The initial fixed arrival camera made the returning racer too small; the candidate adds a bounded12–48degree TV zoom. Final-build images and Windows status remain pending and must supersede this checkpoint.

The physical engine remains exactly the frozen eight-file manifest. Later changes only adjust framing, terminal-camera precedence, retirement caption priority, and the local Hyper highlight entry point (T−3s). A finish long after a cinematic may not interrupt a later Gold lock. The local highlight now includes the full three-second charge instead of seeking directly to activation.

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
