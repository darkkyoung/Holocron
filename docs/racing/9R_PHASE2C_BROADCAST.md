# Phase 2-B.1 + 2-C — v0.6 race broadcast

Working branch: `feature/galactic-racing-phase2c-broadcast`.
Base: B.1 `1eb49be9546b9eda15848485cdc0fad57f27b4c6`, descendant of user-provided B `017270506fbd313b1b4258943710d95aff421e1b`.
Main is not merged or modified. No Production, DB, Migration, Credit, AI or Provider operations.

## B.1 inherited evidence before C

Existing official run 41277832878 succeeded at runtime `af6b71c7e406c95f099e451c32ce30899db7b162`. Re-executed corner test locally: old boundary jump23.986°, new main0.0063° / branch0.0006°, maximum geometry drift0.1206/0.0099 render units. Smooth Hermite geometry is a pure function of recorded progress; no frame-history camera lag. New v6 browser QA explicitly compares seek poses and samples actual playing motion. Actual Windows GPU subjective inspection remains separate.

## Responsibilities and rules

- `v6/config.ts`: 10laps default, integer1–30 local setting,3/5/10/15 presets. Base step2400cm/250ms vsv5 1200: actual96m/s vs48m/s before section/event multipliers. Player remains1×. Tick250ms unchanged. Tick/event capacities scale by laps.
- `v6/simulator.ts`: existing integrator, shared events, physical branch, three-round measured qualifying and official ceremony assembly. No new physics/RNG engine. Qualifying retains established pace; main race alone doubles speed. Durations of boosts/penalties remain real seconds, so higher speed intentionally covers more distance during those effects. No hidden racer stat differences.
- Starting line advances8% around the same rendered loop onto the long straight. Physical longitudinal grid gap24m per rank, alternating lateral lanes±6 render units. Same column48m, eight slots. Actual simulation frames and renderer agree. Shortcut entry/exit change to12%/32% of this new origin while using exactly the same physical branch and ratio. Historical configs omit this optional offset and retain their original path.
- `v6/broadcast.ts`: pure timeline. Preshow60/90/120s, final5s are countdown, never extra time. Cars remain at tick0 until race gun. Official race time starts0 at gun. Eight-second finish coast,5s peractualfinisher,8s provisional classification, then existing specialDSQ/ceremony. DNF/DSQ never receive finisher spotlight. Visual coasting never modifies official progress/results.
- Local settings generate a **new record in a Worker**. Current record remains until successful generation. No automatic regeneration, no server/admin authentication or persistence. Existing record is never edited.
- Single capped30Hz RAF, HUD200ms, fixed900metric samples preserved. Motion probe is opt-in `?motion=1` for QA only. Performance JSON includes actual canvas dimensions as well as CSS dimensions.

## Schedule contract (not a deployed scheduler)

20:00 KST qualifying /20:55 prediction cutoff /21:00 official start.120s preshow begins20:58, countdown20:59:55. Virtual-clock contract gives fixed schedule precedence over a manual hold. No betting system or operational scheduler is implemented. Local replay controls can pause/seek; they are not a synchronized premiere. Existing qualifying manual gates still expire once after300000ms.

## Evidence status

Measured evidence and runtime/CI identity are recorded in [the Phase2-C QA report](9R_PHASE2C_MEASURED_QA.md). Workflow/code existence alone is not PASS. Software SwiftShader measurements cannot certify30FPS on Windows RTX4070SUPER. v0.1–v0.5 golden records must remain unchanged.
