# v0.12 Hyper Phantom Warp — implementation checkpoint

Source main: `93646c066aaf8a33f1a7c062f8404dd7b211e`.
Source v11 branch: `1a4032964b2c97472b05dce32d81d2f635d4e5af`.
Branch: `feature/galactic-racing-v012-hyper-phantom-warp`.

## Frozen candidate before independent acceptance

Three candidates were compared on `12pilot-0..1999`; B was confirmed on
`12pilot-0..7999` (overlapping development data, NOT independent acceptance).
All reports are kept in evidence/v012-pilot*.json. A/B/C conditional Hyper win
rates in the 2k pilot were 70.39/77.63/80.26%. B's 8k pilot was 487/597 =81.57%,
Wilson95 78.27–84.48%, above the suggested72–75% but below no mandatory upper
limit. B is weaker than C and has a bounded gain. A's small sample gave weaker
confidence. No winner or final classification is adjusted to hit a KPI.

Candidate B is frozen: jump20–30% of lap (720–1080m), one250ms6x physical burst,
then2.5–3.0x afterburn5s. Launch frequency, late-progress weights,10% Hyper draw,
Gold2.2–3.2x/6–11s/resistance remain the v11 policy object.

Independent acceptance: `12final-0..39999`, full captured frames, parameters
frozen before the batch. No final data has been used for tuning. If physics
changes, a new disjoint acceptance namespace is required. UI-only fixes may
reuse the identical engine/script output after verifying source identity.

## Motion and rendering contract

The safe main-road staging guard completes an existing shortcut before starting
the burst; it never resets branch ownership. Staging may wait at normal speed
up to8s, then cancels. The visible sequence is250ms acceleration,125ms fade,
375ms hidden route transit,250ms rematerialization (1s total). Afterburn starts
at the end of rematerialization. Finish/DNF/DSQ truncate effects and locks.

The official burst is integrated once. The bounded jump commits once at the
recorded jump tick. Official frames/rank/GAP do not jump early. Only while the
body and billboard are fully invisible does the effect cursor interpolate the
recorded from/to distances along the road; this is not another official move.
All alpha, streak positions and cameras are functions of replay time. No new RAF,
particle allocator, light or post-processing pass is introduced. Old v10/v11
records use the old wormhole renderer and default motion policy.

The replay range now has1ms seek precision so a125ms fade can be inspected; the
simulation tick remains250ms and rendering remains capped30FPS/HUD5Hz.

## Evidence status (not final acceptance)

- v11 pinned full-meeting hashes20/20 PASS.
- v12 contracts104 meetings +30 lap-setting meetings PASS;10,608 locks,
  33,032 GAP samples;45 phase checks;20 deterministic full-meeting hashes.
- Local Chromium156.0.8078.79 launch BLOCKED by environment socket permission
  (`process_singleton_posix.cc socket(): Operation not permitted`). No local
  rendering PASS is claimed; supported isolated CI Linux/Windows QA is pending.
- Windows hardware GPU30FPS: NOT VERIFIED.
- Production/main/D1/Migration/Credit/Provider/Phase3 operations:0.

Final statistics, browser evidence, exact ZIP identity and limitations will be
recorded after completed verification, not inferred from this checkpoint.
