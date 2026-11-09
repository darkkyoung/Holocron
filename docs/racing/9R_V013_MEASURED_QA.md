# v0.13 measured QA — work in progress

This is a checkpoint, not acceptance. Final report will replace this checkpoint after isolated Linux/Windows CI and independent40k complete.

- Parent QA SHA: ec27555df7e1d9b37f815a98632846bbabec08e6.
- First implementation SHA: a4bc3c7a32293bb25a90bf0b0775ff6fc10b14f1.
- Local TypeScript / lint / app build: PASS (one pre-existing unused-variable warning in unrelated assistant test).
- v12 full-record hashes20: PASS. v13 contracts:1179 phases/locks,16288 GAP samples,12 emergency checks, forced activeDSQ/outsideDSQ/activeDNF policies PASS.
- Local Chromium: BLOCKED by runtime Unix socket permission. No bypass attempted. Isolated CI actual Chromium/WindowsChrome QA pending.
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
