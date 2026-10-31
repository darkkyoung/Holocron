# 9R-B — deterministic v0.2 / local 3D broadcast

Date: 2026-10-31. Branch: `feature/galactic-racing-9r-b`.
Base main: `93646c066aaf8a33f1a7c062f8404dd7cd7b211e` / tree `9ae882149edb6d46f1c95b845e453e3323f6cf99`.

## Run (no credentials, DB, Provider or Production)

From the repository root, with Node 22+ and the existing project toolchain:

```sh
pnpm install --frozen-lockfile
npm ci --prefix prototypes/galactic-racing-v2 --ignore-scripts
pnpm racing:prototype:v2
```

Open `http://127.0.0.1:4173/`. The server generates an immutable meeting once, then serves only fixed GET/HEAD resources. It does not expose a race-generation POST. Use `--seed NAME --port 4174` to generate another local record on a new server startup. Camera and playback controls never submit requests that change a result.

```sh
pnpm racing:build:v2
pnpm test:racing
pnpm test:racing:v2
pnpm racing:balance:v2 40000 /tmp/9rb-new-balance.json
```

The build is static in `out/galactic-racing-v2/`; serve this directory over local HTTP (not `file://`). `race.json` and `special.json` are immutable replay artifacts, not a mutable secondary database. The browser imports playback only, never the simulator. The default ordinary example is `9rb-0`; the special-DSQ example is a separate seed `9rb-150`, found by bounded deterministic enumeration, not an override of a winner or DSQ outcome.

## Engine and version boundary

- `galactic-racing-0.1.0` remains available through its old simulator and scripts. Its exact integrator was extracted into `lib/racing/integrator.ts`; the old defaults and RNG streams are unchanged. The original Golden Test and 512 full/summary pairs pass. Old 9R-A reports were not rewritten.
- `galactic-racing-0.2.0` uses the same bounded event engine and equal-stat racers, with **1,080,000 cm / 10.8 km**, three 3.6 km laps. The 250 ms simulation step and independent seeded streams remain. Section pace changes are identical for every racer. Grid spacing is 12 m; grid affects initial position only.
- Qualifying computes 24 actual sampled laps, three round-robin rounds with the same seeded launch order. Starts are at least 8 seconds apart; a racer starts the next attempt only after finishing + 6 seconds. Other racers remain on track. Best valid time sets the grid, seeded launch order breaks ties. Three invalid laps place the racer at the back without inventing a time.
- Per qualifying lap, at most one incident: invalid 2.5%, off-track 5.5%, wall 6%, glitch 8%. This is substantially below main-race incident pressure. No collision simulation or grid performance buff.
- Separate ceremony RNG selects a special DSQ with 1% probability and one provisional podium racer uniformly. Ordinary DNF/DSQ stays capped at two. `official` is the authoritative post-DSQ result: promoted ranks, disqualified racer last with zero points. Provisional results remain intact for replay.
- The offline JSON contains the complete result. Delayed revelation is presentation, not secrecy against inspecting the replay file. Production suspense/persistence would need a separately authorized server delivery design.

## Presentation

One original greybox circuit, low-poly cars, camera-facing helmet-character billboards, barriers, hazard gates, pit apron, start/finish gantry and podium. Arc-length mapping follows recorded progress; it cannot influence simulation. Fixed lateral lanes allow pass-through overtakes. Damage shakes the car; pit/retirement moves it off the racing line; slipstream/boost show trails; Ultimate adds a ring and stronger trail. These are expressions of timeline state, not a second physics race.

Six-second auto-camera windows prioritize finish, Ultimate, accidents, pit, lead changes and drafting. Final straight and optional season-contender points affect camera selection only. Manual tracking covers all eight racers. There is no season backend in this phase. A qualifying camera favors advanced active laps with a projected personal/overall timing opportunity; completed lap times alone appear in the live table.

The UI supports play/pause, 0.5–8×, keyboard timeline seeking, stage jumps, event jumps, replay, timing/results table and JSON download. Hidden tabs pause. Normal ceremony: provisional podium → final podium. Special ceremony: provisional → 10s exclamation → 14s evidence panel → 20s DSQ/reclassification → 28s final podium. Final timing tower and table both use official classification.

## Actual browser QA and limitations

Tested in the provided isolated Chrome using actual component iframes of **1440×900 and 360×800 CSS pixels**. The desktop iframe is displayed at 0.9 scale to fit the host browser. This is CSS viewport QA, not a physical mobile-device test.

The environment explicitly reports WebGL unavailable (`GL_VENDOR/GL_RENDERER=Disabled`). Consequently the app uses Three.js SVGRenderer to project the **same scene, camera and recorded coordinates**. It does not play a substitute video or simulated screenshot. GPU/WebGL performance and physical mobile GPU/touch behavior remain **NOT VERIFIED**. SVG has painter-order limitations, uses always-visible 2D billboard symbols and omits the large ground plane; native WebGL keeps depth testing, textured sprites and the ground plane.

Known prototype limits:

- No audio, detailed crash animation, real driver art, production hosting, season administration, betting or Credit settlement.
- Shortcut outcomes retain the existing speed/penalty event model; a separate spatial branching shortcut is not implemented. Pit events use local roadside stops, not navigation around a full pit-entry/exit spline. The visible pit apron is greybox scenery. These are incomplete spatial details, not claims of a complete racing game.
- Auto camera cuts are discrete (minimum six seconds), not cinematic blended paths. SVG rendering is functional, not a GPU performance benchmark.
- The scene is a compressed visual representation of the authoritative 3.6 km lap. Race distance and duration come from simulation, not visual scale.
- One of 40,000 races lasted 305.5 seconds: 3–5 minutes is a balance target, not a hard cutoff that truncates a legitimate race.
- Static client bundle exceeds Vite's 500 kB warning threshold; Three.js is isolated to this prototype and not imported by Production app routes.

Screenshots in `screenshots/9r-b/` are real browser captures, labeled with the fallback renderer. See [balance report](9R_B_BALANCE.md) and [development record](../devlog/2026-10-31-racing-9r-b.md).
