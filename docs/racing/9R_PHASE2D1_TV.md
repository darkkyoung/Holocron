# Phase 2-D.1 — v0.8 qualifying and TV replay

Base: `59d032dc6df71f2a1b575961b1e594ad29503e0c` on C.1, fresh-fetched with main
`93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. Work branch
`feature/galactic-racing-phase2d1-tv`. No main or Production operation.

## Versioned simulation
v0.8 reuses the race integrator/settings and v0.7 24m grid clearance. Qualifying
now uses baseStep2400cm/250ms (96m/s before modifiers), equal to main race, rather
than1200. New version namespace owns qualifying launch order, form and incidents;
incidents are scheduled at7.5–25s instead of15–50s to remain inside the shorter
lap. Penalty durations remain1–2real seconds, unchanged: qualifying and race
rules remain distinct. Eight-second launches, three all-finished round barriers,
15s cooldowns, manual300s timeout and best-valid-lap ranking are unchanged.
Historical wrappers keep all defaults and RNG unchanged. Ten frozen full v0.7
records supplement existing v0.1–v0.7 regression; no golden overwritten.

## Replay and broadcast
Ordinary pointer/touch/keyboard seek preserves playing, pause, speed and viewer
camera. Seeking the end stops. Explicit case/settings/playlist contracts remain.
A held manual presentation cannot be released or have its deadline reset by
scrubbing. This remains local replay, not an operational premiere controller.

A compact top-center five-light bar and five one-second grid shots are pure
functions of record time. Cars stay at tick0 until the same official gun; fixed
20:00/20:55/21:00KST virtual schedule is unchanged. No audio is present.

`v8/camera.ts` owns six elevated fixed trackside stations, deterministic coverage
selection and edit-list adaptation. Each candidate window samples the path every250ms and rejects lens motion above90degrees/s before rendering. Geometry uses the existing smooth Hermite
road/branch. Edit decisions run once at record installation; binary/constant-time
cue lookup and one fixed-lens lookAt run during playback. Invalid coverage falls
back to front/chase/wide. Existing event target priorities are reused, with branch entry/merge added for v0.8. Side
tracking remains a manual/legacy option, never v0.8 auto. Long coverage holds
split into roughly5–7s shots; finish shots retain precise existing event timing.
A WeakMap owns bounded manual edit lists for each record; old record plans are
collectible. No history-dependent camera lag or new renderer/dependency. A bounded 12–48 degree, distance-derived TV lens keeps roughly 60 render units in the vertical frame (aspect-adjusted in portrait). Lens position stays fixed; zoom is seek-independent. Browser QA checks at least 20 pixels of projected target height on mobile.

Previous/next buttons and comma/period use current displayed official ordering;
input controls retain their keyboard behavior. Auto focus is highlighted on the
minimap. Checkered marks derive from official finishMs; DNF never gets one, and
specialDSQ replaces the mark only at existing20s reclassification, not earlier.

## Validation status
[Executed evidence](9R_PHASE2D1_MEASURED_QA.md) records successful Linux Chromium
and Windows Chrome functional QA of the same CI artifact. Local browser install
failed with a corrupt official Playwright download; no untrusted mirror was used.
SwiftShader measured below 30FPS. Hardware Windows 30FPS remains NOT VERIFIED.
No Production, DB, migrations, Credit, AI, Provider, season or scheduler changes.
Phase2-D.2 profiles/podium/operations remain deferred.
