# v0.12 Hyper Phantom Warp — implementation contract

Main: `93646c066aaf8a33f1a7c062f8404dd7b211e` (unchanged).
Source v11: `1a4032964b2c97472b05dce32d81d2f635d4e5af`.
Branch: `feature/galactic-racing-v012-hyper-phantom-warp`.
Frozen final engine/runtime: `0f8802e2c994e0c445d8a7021f75cefba7af13b2`.
Runtime Tree: `1724cdcd33559b63a0fdbdaa927518a75b3c19af`.
See [measured QA](9R_V012_MEASURED_QA.md) for final delivery and limitations.

## Ownership

- `lib/racing/v12/ultimate.ts`: version-specific Hyper parameters; reuses the
  v11 late launch policy unchanged.
- `lib/racing/v12/simulator.ts`: v12 Seed/version and assembly, no duplicate engine.
- `lib/racing/v10/ultimate.ts`: optional motion policy with historical defaults;
  explicit jump and actual duration records. Old versions do not enable the governor.
- `integrator.ts`: optional read-only pre-step callback. No historical caller
  supplies it. Shared current positions are read before any racer advances.
- `lib/racing/v12/presentation.ts`: pure replay-time phase/opacity/effect cursor.
- `phantom-effects.ts`: pooled sonic ring and16 road-following streaks, deterministic
  burst/arrival camera. No extra RAF, lights, post-process or particle allocation.
- `scene.ts`: simultaneous body/billboard alpha, projected framing, disposal.
- Worker/build scripts expose v12 and actual replay Seeds. The1ms seek slider
  permits inspection of the125ms fade; physics stays250ms, rendering capped30FPS,
  HUD remains5Hz.

## Physical and visual contract

Requested jump20–30% of a3.6km lap (720–1080m), one250ms6x physical burst,
then2.5–3.0x afterburn for up to5s. No future winner/classification is an input.
Gold stays2.2–3.2x/6–11s with its original ramp/resistance/rendering.
The v11 own-progress70–95% windows, max1/racer,max2/race,18s spacing and10% Hyper
selection remain unchanged. No activation is forced.

A safe main-road staging guard finishes any existing shortcut before the burst.
It never resets branch ownership. Staging may wait at normal speed up to8s, then
cancels. Sequence:250ms acceleration,125ms fade,375ms hidden route transit,
250ms return. Afterburn starts at the end of return. Finish/DNF/DSQ/safety limits
truncate actual effect and subject-lock intervals.

The burst is integrated once and the jump commits once at its recorded Tick.
Official frames/rank/GAP do not jump early. Only while body and billboard are
invisible does the effect cursor interpolate recorded endpoints along the road.
This is not additional official movement. All alpha, streaks and camera poses are
functions of replay time. A cancelled jump cannot hide a stationary racer.
Old v10/v11 records retain the old wormhole renderer.

## Live-field safety governor

The first candidate tested only the nearest live contender. A broader40k audit
found13 Hyper effects leading a trailing live racer by at least one lap. That
candidate is rejected; its81.90% result is historical development evidence only.
The raw rejected batch and expanded safety report remain in evidence/.

The final policy reads a common pre-step snapshot and caps Hyper jump destinations
at the slowest other RACING/FINISHED racer’s progress plus0.85lap. Reaching the
bound ends the remaining Hyper boost. The15% margin must exceed a maximum single
physical step, or configuration is rejected. No racer is moved backward, no
finished time/result is edited, and Gold is untouched. `leadLimited`, `endReason`
and the actual end Tick make the change auditable and Seek-reproducible.
The rule is identical for all racer IDs and uses no betting/profile information.

## Tuning and independent evidence

Original2k Pilot A/B/C conditional Hyper wins:70.39/77.63/80.26%.
B was the middle-strength tested candidate and was confirmed on8k development
Seeds. The final B+governor Pilot was487/597=81.57%, Wilson78.27–84.48%, with
zero full-lap leads against any live opponent. This exceeds the optional72–75%
target; it is not described as meeting that narrower range.

The corrected candidate was frozen before `12verify-0..39999`, disjoint from
`12pilot-` and the rejected/debugging `12final-` population. Final independent
Hyper conditional wins:2249/2807=80.12%, Wilson78.60–81.56%; Gold55.79%.
Hyper share9.90%; all-live-opponent lap leads0. No final data was used to retune.
See evidence/v012-balance.json and v012-freeze-manifest.json. Duplicate local/CI
execution of the same Seeds proves reproducibility, not another40k independent
statistical observations. Any later physics retuning requires another holdout.

## Verification boundary

Historical v0.1–v0.11 contracts/Golden results are preserved;20 pinned full v11
Meeting hashes match. New tests exercise original failure Seeds, late launches,
GAP prefix-only knowledge, lock/Seek, terminal clipping and all supported lap counts.
Actual browser and exact ZIP status are in the measured report; compilation alone
is not visual acceptance. Windows hardware-GPU30FPS is NOT VERIFIED.
Production/main/D1/Migration/Credit/Provider/operating server/Phase3 changes:0.
