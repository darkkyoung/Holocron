# Phase 2 decisions — 2026-11-01 KST

These user decisions supersede older planning, but are **not implemented by 2-A**.
Phase 2-A preserves simulator v0.4 (3 laps, recorded outcomes, 250ms ticks).

## 2-B — shortcut geometry and qualifying

- Replace 50–120m SHORTCUT progress jumps with actual branch entry, separate path
  and merge on tracks that support a shortcut. Judge seeded success only upon
  reaching that section; slightly favor lower positions. Do not retroactively
  rewrite v0.4 records. A current jump is a recorded event, not a renderer defect.
- Eight racers × three rounds, overlapping starts within each round. Wait for
  every racer in that round, announce results, then begin the next round.
- New best time: yellow 2-second emphasis then fade. Not-started racers grey.
- Qualifying director: rear/front/side/wide.

## 2-C — fixed schedule and main race

- Qualifying broadcast **20:00 KST**, predictions/betting close **20:55 KST**,
  main start **21:00 KST**. Never move these due to manual progression.
- Separate qualifying/main preshows. Qualifying result steps support manual or
  automatic progression; manual inaction advances after **at most five minutes**.
  This timeout cannot delay/advance 21:00 or change the 20:55 cutoff.
- Default direction: ten laps, administrator per-race lap count; abandon the
  3–5-minute restriction in that future engine version. Increase actual simulated
  vehicle speeds, not playback rate. Two columns × four staggered rows, countdown.
- Postfinish slowdown and approximately five seconds of coverage per finisher.

## 2-D — presentation and operations

- Fixed trackside rotating cameras; retain event priorities. Highlight the auto
  director's current racer on the minimap. Bottom-right previous/next racer and
  comma/period tracking shortcuts.
- Benchmark public F1 25 podium entrance/celebration/camera patterns.
- Ranking profile button: name, birthdate, species, hometown, affiliation,
  description and image. All base racer abilities remain identical.

No season administration, betting, Credit or production scheduler is implemented
by this plan. Main, Production, AI, DB, migrations and operational data are untouched.

## Phase 2-B implementation record

See [v0.5 spatial branch and three-round broadcast](9R_PHASE2B_SHORTCUT_QUALIFYING.md).
Local automatic/manual gates do not modify the fixed 20:00 / 20:55 / 21:00 KST schedule. Phase 2-C speed/lap/grid and Phase 2-D operations remain deferred.

## Phase 2-C

[Implementation and evidence](9R_PHASE2C_BROADCAST.md): v0.6 uses10laps and actual higher main-race speed, a physical staggered grid, local configurable preshow and separate broadcast finish coverage. Fixed20:00/20:55/21:00 KST policy remains a virtual-clock contract, not a deployed scheduler. Phase2-D remains deferred.

## Phase 2-C.1 feedback refinement

C.1 delivered the isolated v0.7 candidate: a versioned 24m grid lead-in fixes P1's
front crossing the stripe while preserving all historical v0.6 records. Three
qualifying rounds use 15s cooldowns with results after 3s and manual waits only
after the cooldown. Preshow introductions are P8→P1. Post-finish coverage is now
10s free coast followed by **only provisional P1/P2/P3**, 5s each, superseding the
older all-finisher spotlight wording above. DNF and spatial lane decorations
remain pure presentation. See [C.1 implementation](9R_PHASE2C1_BROADCAST.md) and
[measured report](9R_PHASE2C1_MEASURED_QA.md). Fixed KST times and the Phase 2-D
boundary remain unchanged; no Production scheduler or Credit integration exists.

## Phase 2-D.1

[v0.8 TV replay](9R_PHASE2D1_TV.md) raises actual qualifying pace to main-race
base speed, preserves8s launches/15s cooldowns, adds fixed rotating trackside
lenses, replay-state-preserving seek, compact countdown and official finish flags.
Side tracking is retained for manual/legacy use only. Profiles, podium upgrades,
server premieres, season administration and Credit remain Phase2-D.2 or later.
