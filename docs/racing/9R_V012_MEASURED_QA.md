# Galactic Racing v0.12 — final verification (in progress)

This report distinguishes completed simulation evidence from pending browser
acceptance. No Production, main, D1, Migration, Credit, Provider or Phase3
implementation operation is authorized or performed.

## Source and reproducibility

Main remains93646c066aaf8a33f1a7c062f8404dd7b211e.
Start v11:1a4032964b2c97472b05dce32d81d2f635d4e5af.
New engine commit:4a683b37d8918f1c0d073557477b63d831428253.
The first implementation checkpoint preserved the frozen candidate before the
independent audit finished. Later changes concern rendering/testing only.
Runtime and final report SHAs, final Tree and ZIP identity: pending QA.

## Independent acceptance population

40,000 complete10-lap races:12final-0 through12final-39999. These Seeds are disjoint
from12pilot-0..7999. No final observation was used to adjust engine parameters.
Full frames are generated, audited and discarded per race; summary evidence is
`evidence/v012-balance.json`. SHA256:
`8d88e9bc5afc20d380a3a35f750744d36e939a97ff2322a0b4ac9f7b54ed2080`.

Conditional denominator: recorded pre-activation rankP5–P8, own official progress
70%≤p<95%, activated while RACING. Win/podium use final official classification,
including specialDSQ. Cancellation, subsequent retirement and loss remain in
the denominator. Wilson interval is for observed wins, not a guaranteed per-race
probability or a hardware/performance claim.

| Conditional outcome | v11 published baseline | v12 independent audit |
|---|---:|---:|
| Gold samples |25,513|25,548|
| Gold official wins |56.99%|14,124 /25,548 =55.28%|
| Gold official podium |82.92%|21,227 /25,548 =83.09%|
| Hyper samples |2,832|2,873|
| Hyper official wins |27.51%|2,353 /2,873 =81.90%|
| Hyper official podium |61.33%|2,715 /2,873 =94.50%|
| Hyper win Wilson95 |not used as candidate criterion|80.45–83.27%|
| Gold mean final rank gain |see original evidence|4.665|
| Hyper mean final rank gain |see original evidence|5.341|

Minimum70% and Wilson lower≥70% PASS. Observed81.90% is above suggested72–75%,
not represented as hitting that narrower tuning target. The frozen intermediate
candidate was chosen before holdout evaluation. Do not cherry-pick a lower/higher
final batch. Gold's own policy is unchanged; its observed rate can change because
Hyper and the versioned RNG affect competitors. This is not a paired causal study.
The v11 baseline comes from its archived40k report, not a new v11 rerun.

| Activation measure | Result |
|---|---:|
|0 /1 /2 activations per race|14,222 /18,757 /7,021|
|No activation race share|35.555%|
|Total activations|32,799 (0.820 per race)|
|Gold /Hyper activations|29,463 /3,336|
|Hyper share|10.171%|
|Lap8 /9 /10 activations|5,487 /22,994 /4,318|
|Lap1–7 or own≥95% new activation|0|

## Bounded physical effect and visualization

Gold's2.2–3.2x,6–11s,ramp,resistance and rendering effects remain unchanged.
Shared v11 launch policy is reused. Hyper's requested jump is20–30% of a lap,
720–1080m, clamped to the finish. Burst is one250ms physical6x step. Afterburn is
2.5–3x for5s, terminal-event clipped. Ordinary and severe incident rules persist.

Visual sequence after safe staging:250ms acceleration,125ms fade,375ms invisible
route transit,250ms return. Both vehicle material and2D billboard fade. The
streak follows the road, not a straight chord. Staging on a shortcut can wait up
to8s at ordinary speed; timeout cancels the jump. Cancellation is not secretly
replaced with a win. The hidden cursor is visualization only; official jump/GAP
change once at the recorded tick. A cancelled jump cannot hide the racer.

| Distance/integrity measure | Result |
|---|---:|
|Actual jump maximum|1,079.97m|
|Mean jump (all3,336 Hyper, including cancellations)|871.87m|
|Afterburn same-step extra physical mean /max|796.44m /1,034.82m|
|Burst same-step extra physical mean /max|114.01m /134.14m|
|Conservative total extra bound maximum|2,578.59m <3,600m lap|
|Observed maximum lead over nearest other live contender during effect|2,513.36m|
|Hyper effects with≥1lap lead over nearest live contender|0|
|Cancelled Hyper jumps|109|
|Lap count /finish time /branch ownership /nonfinite errors|0 /0 /0 /0|

The extra-physical measures compare the identical step's noise/pace/damage with
and without power; they are not a counterfactual whole-race rerun. The bound
includes shortest-road conversion. The lead statistic compares the nearest
other RACING/FINISHED contender, not every lapped or already retired racer.
Zero observed errors in40k is evidence, not a proof over all possible Seeds.

## Checks and remaining evidence

Local26 commands passed: v1–v12 domain/Golden tests, broadcast/player contracts,
corner continuity, TypeScript, lint, application build, diff-check and standalone
build. v11 pinned full-meeting hashes20/20 match. Current v12 contract checks108
meetings +30 lap-setting meetings (1/3/5/10/15/30laps),11,064 lock samples,
34,304 GAP samples,65 phase assertions and20 full-meeting reproducibility hashes.

Local Chromium156 could not launch due socket permission. No local visual PASS
is claimed. CI Linux Chromium and Windows Chrome results, captures, video,
WebGL resources, exact ZIP, launcher and final clean tree are pending.
Windows user hardware GPU stable30FPS is NOT VERIFIED.

Real pilot cases used by the demo:12pilot-2 Gold win,12pilot-6 HyperP7→P1,
12pilot-4 HyperP8→P2,12pilot-0 noUltimate,12pilot-72 Hyper+shortcut,
12pilot-19 safety cancellation,12pilot-79 last-lap Hyper,
12pilot-81 finishes during afterburn,12pilot-630 retires AFTER Hyper,
12pilot-88 specialDSQ. They are actual v12 records, not fabricated wins.
The additional fixed-candidate record search found12final-15329 (DNF at the
activation tick, no burst or jump) and12final-38475 (DSQ during afterburn).
Their real records are in evidence/v012-terminal-cases.json. All subsequent
frames retain the terminal status and identical progress; lock/effects end at
that event.12pilot-630 remains explicitly a retirement AFTER the effect.
Browser checks for the newly found cases are pending.

## Field-level distribution

GridP1→P8 win percentages:12.930,12.7475,13.020,12.7575,12.415,12.195,11.980,11.955.
RacerIDr1→r8:12.7175,12.495,12.4575,12.7675,12.5925,12.350,12.145,12.475.
All racers still share basic statistics; no profile, bet or selected winner is
an engine input. Observed grid advantages and sampling variation are disclosed,
not erased with result adjustments.
Mean race362.2576s (median362s,p05 355.75s,p95 369.5s,range348–386.5s).
Mean leader changes39.5983.49.1375% of winners used no Ultimate.
11,703 ordinaryDNF and3,620 ordinaryDSQ among320,000 starts (3.6572% and1.1313%).
SpecialDSQ415/40,000 races=1.0375%; race ordinary elimination cap2 is checked.
Aggregate official/events/laps/jumps/path digest:
`a5cc4a3775ba6732ed8b76cf96d082a10181ec7f1d99c0363f6a5b4c47e9e2d0`.
