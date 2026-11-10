# Galactic Racing v0.14 — independent balance and delivery QA

This is an isolated v0.14 racing prototype. It is not a Production broadcast or Phase 3 implementation. Parent v0.13 HEAD `d0ea1f3839b12ce853258ae954f911d4aa9901ae`; fresh canonical `main` `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. The runtime SHA, Actions run and ZIP digest must be filled from the exact delivered build; a successful local simulation cannot establish Windows hardware-GPU 30FPS.

## Frozen independent holdout

`14holdout-0..39999`, 40,000 official ten-lap meetings, run once after freezing 10 s /3.2×/1.6×. Aggregate official digest: `0a6e50158cad1829a5daf9ceff1449268f259693bc70e849029e84a6639e0636`. Full counters and example records: [v014-balance.json](evidence/v014-balance.json). These Seeds were not used for the 3,000-Seed-per-candidate pilot. The historical v0.13 independent sample was 27,115/12,601/284 zero/one/two launches, or 67.79%/31.50%/0.71%.

| Ten-lap criterion | v0.14 observed | Decision |
|---|---:|---|
| Zero launches | 11,576 /40,000 = 28.94% | ≈30% goal |
| One launch | 24,559 /40,000 = 61.3975% | **PASS ≥60%** |
| Two launches | 3,865 /40,000 = 9.6625% | **PASS 8–12%** |
| Hyper share | 3,403 /32,289 = 10.539% | ≈10% goal |
| Own88–90 /90–94 /94–96% activations | 3,699 /24,508 /4,082 | Centered on90–94% |
| Hyper P5–P8 conditional official wins | 2,370 /2,873 = 82.49% | **PASS ≥70%** |
| Hyper Wilson95 lower /upper | 81.06–83.84% | **PASS lower ≥70%** |
| Hyper P5–P8 conditional podium | 2,634 /2,873 = 91.68% | Descriptive |
| Gold P5–P8 conditional official wins | 15,185 /24,560 = 61.83% | v13 66.09%; distinct Seed/cohort |
| Gold P5–P8 conditional podium | 20,369 /24,560 = 82.94% | Descriptive |
| Outside launch window /<10 s spacing /active ordinary DSQ | 0 /0 /0 | **PASS** |
| Hyper ≥1 lap lead over any live contender | 0 observed | **PASS for sample** |
| Official lap/finish, qualifying, branch/jump and nonfinite errors | 0 each | **PASS** |

Conditional denominator is prelaunch P5–P8, own progress `[88%,96%)`, actively RACING, official final rank including special DSQ. Historical v13 conditional sample has a different frequency and RNG namespace, so the 66.09% Gold number is a version comparison rather than a causal paired estimate. No physical Gold/Hyper tuning was made in v14. The shorter spacing and more launches themselves change their observed contest. The maximum recorded Hyper jump was1,080m (30% of the3.6km lap); no one-lap lead was observed. Conservative bound and actual gap are different quantities; see raw JSON.

Of the 3,865 double launches, ordered types were Gold→Gold3,067, Gold→Hyper371, Hyper→Gold380 and Hyper→Hyper47. Thirteen Hyper-leading→Gold official comeback wins were found under the audit's recorded LEAD criterion, including `14holdout-1631`. **Do not infer a count of physical cinematic overlaps from ordered launches**; the separate pilot measured fifteen overlaps in3,000. Actual browser overlap playback uses `14case-366`. Mean race duration362.35s, leader changes40.71, normal DNF events11,892, ordinary DSQ events3,399, special podium DSQ353 races (.8825%), winner without Ultimate44.735%. Grid win percentages P1–P8:12.760/12.7025/12.810/13.1725/12.295/12.240/12.1175/11.9025. Racer ID win percentages r1–r8:12.5875/12.5225/12.360/12.680/12.8225/12.2475/12.155/12.625. These are distinct versioned simulations, not modifications to old official records.

## Other lap lengths (separate 1,000 Seeds per setting)

| Laps | Mean seconds | 0 /1 /2 launch games | Hyper launches |
|---:|---:|---|---:|
| 1 | 38.21 | 885 /115 /0 | 13 |
| 3 | 110.18 | 664 /333 /3 | 33 |
| 5 | 182.30 | 470 /513 /17 | 49 |
| 10 | 362.27 | 302 /610 /88 | 67 |
| 15 | 542.68 | 166 /592 /242 | 101 |
| 30 | 1085.99 | 68 /431 /501 | 145 |

Exact one-lap values and decimals are in [v014-lap-comparison.json](evidence/v014-lap-comparison.json). The target 30/60/10 applies only to default ten laps; the 3-lap zero share is high and the30-lap two share is high with the same relative window, so shorter/longer formats are **PARTIAL for comparable spectacle**, not falsely accepted as ten-lap equivalents. All tested settings had zero window and spacing violations.

## Regression and browser release gate

- v0.1–v0.13 Golden/results remain in their versioned implementation. v14 contract checks20 historical v13 full-record hashes,400 v14 meetings, a real physical-overlap case, manual/AUTO/Seek, and1/3/5/10/15/30-lap official finish invariants; observed `PASS` locally.
- TypeScript, lint, independent static demo and application build are separate checks; evidence below is updated only after the final build.
- Actual Linux Chromium and Windows Chrome images/video, frame-time/resource comparison and exact delivered ZIP digest must be taken from the published Actions run. Software SwiftShader measurements are not the user's hardware GPU and cannot establish stable hardware30FPS.
- Example local replay Seeds: `14case-0` two Gold and a Gold win, `14case-3` Hyper win, `14case-9` no Ultimate/P1 DNF, `14case-31` special DSQ, `14case-57` Hyper loss, `14case-84` recorded safe cancellation, `14case-366` physically overlapping Gold launches, `14case-2895` Hyper→Gold official re-pass. These are v0.14 Seeds only.
- A preempted prior camera effect may be cut when a newer Ultimate activates; the older official boost and result persist. Manual choice and P1 DNF retain priority. This is recorded explicitly instead of describing both effects as fully broadcast.

The source branch does not merge into main. Site, D1, migrations, Wallet/Ledger, Credit, AI/Provider, operating seasons/betting and Phase 3 server changes: **zero**.
