# Phase 2-C.1 — broadcast feedback, new v0.7 grid

Base branch `feature/galactic-racing-phase2c-broadcast`, fresh head
`82392109f3055e011eef25b15e05a511f4916fb8`. Main remains
`93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. Work branch:
`feature/galactic-racing-phase2c1-broadcast`.

## Why a new simulator version
P1 previously had authoritative progress zero, and its body was centered on that
coordinate. Its 2.75-render-unit nose crossed the 4-unit timing stripe. It was
not camera perspective. v0.7 adds a 2400cm lead-in to **all eight** authoritative
starting coordinates. Grid markings and camera bounds use the identical lead-in.
The line and finish distance do not move. P1's front clears the upstream stripe
edge by 5.65 render units. Everyone travels 24m farther than the same-position
v0.6 grid; a new version/RNG namespace and 40k balance are therefore required.
This is not presented as a visual patch with unchanged new outcomes.

The shared assembly keeps the v0.6 profile byte-equivalent. Ten full-meeting
hashes generated from the frozen base cover qualifying samples, race frames,
events, lap times and official results. Historical v0.1–v0.6 tests remain intact.

## Owning modules
- `v7/simulator.ts`: versioned grid clearance; reuses v6 assembly and rules.
- `v7/presentation.ts`: pure-time qualifying coast/camera/DNF decoration.
- `v6/broadcast.ts`: optional C.1 presentation policy, P8→P1 introductions.
- `visual-lanes.ts`: bounded 28-pair spatial overlap computation; no history/RNG.
- Existing scene/watch/panels consume these projections, never rewrite records.

Qualifying retains its v0.6 per-attempt lap samples, durations, incidents, validity,
ties and grid. Only inter-round broadcast delays grow12→15s, shifting later
launch timestamps. During those15s all eight coast at half their measured pace;
after3s the results appear. No new laps are recorded. Manual holds occur **after**
the15s, keep the last result frame, and release once on confirmation or300s.
Holding is intentionally a still result frame; continuing wait-time motion is optional.

Main preshow tours occupy30%, introductions60%, final grid10% (last5s lights).
All60/90/120s durations introduce P8→P1. No final grid is exposed in qualifying
preshow. Official finish is followed by10s coast, then provisional P1/P2/P3 for5s
each with front/side/chase shots, then classification and unchanged DSQ ceremony.

DNF red holds1s and fades over0.7s to dark grey, evaluated from event time on each
HUD update. DSQ is distinct. Returning to an earlier timestamp restores the
correct state rather than restarting a CSS animation.

Passing offsets activate only for nearby, similarly directed cars, fade with
spatial separation and are bounded±6.2render units even on the narrow branch.
Stable grid-order tie breaking prevents side flips during an overtake; it is not
a permanent per-racer lane. The start retains its two lanes, blending over6s.
A dense pack widens the camera slightly. Eight cars cannot all fit abreast on an
18-unit branch; residual billboard occlusion in extreme packs is not represented
as physical collision avoidance. The official progress/physics remain unchanged.

The single30Hz-capped RAF and200ms HUD interval are unchanged. No new textures or
geometry are required by lane/DNF/cooldown changes. Actual FPS and resources must
be measured, and SwiftShader is not Windows hardware evidence.

## Safety and evidence
No Production/main/DB/Migration/Credit/AI/Provider operations. Fixed future KST
20:00/20:55/21:00 contract retained; no operational scheduler or Phase2-D features.
CI executes historical regressions, v7 integration, presentation contracts,
40k balance, TypeScript/Lint/Build, actual Chromium3viewport/seek/motion QA,
headed before/after performance against delivered03a4484, and Windows launcher.
Status and downloadable identity are recorded only after execution in the measured report.
