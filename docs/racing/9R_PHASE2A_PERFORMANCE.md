# Phase 2-A — frame scheduling and rendering performance

Local-only work from `fb600e51d9c8022b82f867511d915793770d9a9a` on
`feature/galactic-racing-phase2a-performance`. Fresh main was
`93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. No Production/main/AI/DB/Credit changes.
See `9R_PHASE2_PLAN.md` for future decisions; none changes the v0.4 simulator here.

## Confirmed bottlenecks and changes

Before: React `setInterval(80)` both advanced the wall clock and invoked Three.js
via an effect, limiting regular drawing to about 12.5Hz. Every render built a
reverse camera array, filtered all past race events (unused by the viewer),
updated the complete scene graph twice, allocated temporary vectors and sorted
all badges. Static barriers were 240 separate meshes/materials.

After:

- `render-loop.ts` owns one cancellable RAF and the wall-clock position; a 30FPS
  cap is separate from the 250ms authoritative simulation tick. Fractional
  30Hz deadlines prevent the previous last-callback anchoring from turning
  75Hz into 25FPS, 144Hz into 28.8FPS or 165Hz into 27.5FPS. Deterministic clock
  tests cover 60/75/90/120/144/165Hz (not hardware performance claims). One
  draw is permitted per slot/callback; missed slots are discarded. Slow rendering
  skips visual frames, never slows time or advances the simulation. Existing
  position interpolation is reused. No timer fallback creates fake frames.
- React HUD updates at most every 200ms (5Hz), plus explicit seeks and state/end
  changes. Scene lifetime depends on the meeting only, not React frame state.
  Pause, rate, camera and segment controls configure the same clock. Hidden tabs
  suspend drawing; the current elapsed position is used when visible again.
- `frameAt` extracts the historical frame lookup without allocating past events.
  `playbackAt` still returns the original complete event API. `cameraAt` uses
  binary search over the same sorted cues. Outputs/records remain unchanged.
- `track.ts` uses vertex-lit Lambert materials for the untextured greybox instead
  of per-pixel PBR. Lights, colors, geometry and simulation remain; rendered
  shading is simpler, so screenshots are rechecked. It bakes static world
  transforms into material batches for WebGL; a
  flat floor needs two triangles, not a 48×48 grid. SVG retains its painter-order
  geometry. No track path, event, speed or result is altered.
- `scene.ts` reuses vectors and racer indices; only dynamic car matrices update
  each frame. Badge content/priority sorting changes only when state/focus changes.
  Only active projected badges update transforms; width/height are cached by
  ResizeObserver, and impact age no longer filters event history every frame.
- Disposal cancels RAF, disconnects resize/visibility listeners and releases
  geometry/material/texture/renderer resources and explicitly loses retired WebGL
  contexts. Three.js internal fallback textures otherwise survive renderer disposal
  until browser context reclamation. Event-only counters were found unreliable
  after detached canvases/GC; the corrected benchmark keeps weak references and
  counts only contexts that still exist and report `isContextLost() === false`. Diagnostics use fixed 900-sample
  arrays, not an unbounded per-frame history. No canvas is recreated by HUD updates.

## Measurement contract

`scripts/racing/benchmark-rendering.mjs` compares a separately built pinned Phase1
worktree with the candidate in the same Chromium process and viewport. It counts
actual WebGL color clears (render submissions), intervals, draw calls and triangles;
CDP supplies task/script CPU time and heap. This is not a display-panel photometric
measurement or a direct GPU timer. SwiftShader is explicitly labelled software.

Nine windows: start8, corner, draft/boost, Ultimate, external incident, auto cuts,
manual side, fullscreen/large HUD, qualifying maximum overlap. Each window warms
for 1.2s, then samples 8s. Cold shader compilation is excluded. The full GUI regression
separately covers all three manual angles, minimap, seeking, fullscreen, ceremonies,
DSQ, background-tab return and desktop/mobile layouts.

Report average/median/p05 FPS, frame p50/p95/p99, literal fraction over 33.3ms,
and over 50ms. A nominal 30FPS interval is 33.333ms, so the strict 33.3ms fraction
alone must not be called a dropped-frame rate. Task ms/s is main-thread activity;
GPU-process utilization/VRAM and physical Windows GPU performance are NOT VERIFIED.

Retained memory uses explicit test-only GC before checkpoints. Before repeats
12×10s; after repeats36×10s (six minutes), with a meeting/renderer switch every
third cycle. This separates sampled non-GC heap values from retained heap and resource
counts; it does not measure every transient allocation peak. Record-file bytes are reported separately. It does not prove a future
ten-lap engine or unlimited-duration leak freedom. Cold shader compilation and
`forBroadcast` director construction are outside the warmed frame samples.
The latter still scans event history while building its edit list once per
meeting, so longer future records can increase load-time CPU even though it is
not in the 30FPS loop. Recorded frames still occupy
memory proportional to record length; only viewer telemetry is fixed-size.

The existing SHORTCUT distance discontinuity is still in v0.4 data. A jump at that
recorded event is not repaired by inventing different motion/results in 2-A.

## Windows hardware acceptance, without installation or network

1. Extract the whole delivered ZIP into a new folder; run `Demo/START-RACING.bat`.
   Confirm **PHASE2-A / player2.0**, exact code SHA and simulator0.4.0.
2. Use Chrome with its normal hardware-acceleration setting. Keep the tab and
   video visible; minimize/background/offscreen throttling is a different test.
3. Open the collapsed developer performance panel below the replay. It returns
   the video to view and shows an optional diagnostic overlay. Reset measurements,
   play for 30–60s, then download JSON. For fullscreen/large HUD: reset first,
   enter fullscreen, play 30–60s, pause, leave fullscreen, then download. Repeat
   manual side. If browser download automation is unavailable, copy the visible
   JSON; no app account, production service or Provider is needed.
4. Test default race around 0s, 35s, 70s, 100s and the event shortcuts; test qualifying.
   Compare with the previous ZIP under the same viewport, zoom, power mode and GPU.
5. Chrome Task Manager/DevTools can identify software vs hardware acceleration.
   Report CPU/GPU model, Chrome version, viewport/DPR and power mode alongside JSON.
   A 30FPS cap is not a guarantee of 30 measured FPS; distinguish frame intervals from
   render submission CPU time. No real Provider or application account is involved.
6. On port collision use `START-RACING.bat -Port 43875`.
   Do not run an older server's URL or bypass managed Windows execution restrictions.

Run unit/regression checks with the existing racing scripts plus
`node scripts/test-racing-render-loop.mjs`. Build with `pnpm racing:build:v4`.
The Phase2-A Actions workflow builds the baseline itself, runs actual Chromium
before/after measurements (headed Chromium under Xvfb, plus retained headless
  comparison evidence), packages the exact tested demo, and tests the Windows
server's SHA/port-conflict handling. Final measured results are recorded separately.

Context disposal follows the public [Khronos WEBGL_lose_context specification](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/). Live-context counts and heap measurements are still reported separately from actual GPU-driver memory, which is not measured here.

Final measurements and acceptance decision: [9R_PHASE2A_MEASURED_QA.md](9R_PHASE2A_MEASURED_QA.md).
