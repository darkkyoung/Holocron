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
