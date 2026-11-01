# Phase 2-D.1.1 — viewer-only broadcast polish

Base branch `feature/galactic-racing-phase2d1-tv`, fresh HEAD
`881b96f212290fd465e5cebad9ffd641d8414eca`. Work branch
`feature/galactic-racing-phase2d11-broadcast-polish`. Main remains
`93646c066aaf8a33f1a7c062f8404dd7cd7b211e` (full canonical hash recorded in final QA).

Simulator **galactic-racing-0.8.0** unchanged. Twenty complete seeded meeting JSON
hashes were frozen from the unmodified base worktree before testing. They include
frames, events, lap times, qualifying, grid, official results and old camera data.
The viewer derives a separate edit list; no source record is mutated. No 40k
engine rebalance is needed for these presentation-only changes.

`competition-director.ts` selects subjects using only observed frames and event
prefixes: top-four proximity, observed gains, relative speed, geometric shortcut
potential and known incidents. Low-rank minor/boost events cannot cause a cut.
Ultimate only earns priority with actual gain or closing and plausible contention.
Remaining distance/current speed estimates finish approach. No final outcome,
future frame, future passage success or special DSQ selects a subject.
`v8/camera.ts` reuses coverage windows to choose framing independently. Editing
is outside RAF. Manual owner+auto-angle shares the bounded per-owner TV plan;
fixed angles remain available. 1–8 use immutable roster order/identity; comma/
period use current ranking; slash and AUTO clear owner and restore auto-angle.

Qualifying predicts finish approaches from past sampled progress and current
pace, publishes record improvement only after finish, and shows wide results
from cooldown+3s through result end. Finished racers coast visually while the
round completes; this appends no official samples/laps. R1/R2/R3/BEST table is
masked by each run's finish time. BEST uses completed valid laps only. Unified
right HUD distinguishes round completion /8 from the former total /24.

Larger lights sit lower in the upper center. The supplied image showed the HUD
overlap but no orange countdown rectangle; placement follows the written request
and browser geometry checks, not a claimed exact annotated-image match.

Track 3.6km, speeds, 10laps, grid, ultimate parameters, all results, fixed KST
20:00 /20:55 /21:00 and local hold contracts are preserved. No Production/main/
DB/Credit/AI/Provider changes. Ultimate v0.9, profiles/podium D.2 and service
operations Phase3 remain separate, unstarted tasks.

Validation results are recorded in the final measured QA document after CI.
