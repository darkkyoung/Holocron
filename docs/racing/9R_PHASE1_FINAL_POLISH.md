# Galactic Racing Phase 1 — Final Polish

Local prototype only. Branch `feature/galactic-racing-final-polish`, starting from
`b1a2f86cb126af3580b0ab7e40f43e720d2c7524` (v0.4 broadcast branch).
Main was fresh-fetched at `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`.
No Production, AI, D1, Migration, Credit or main changes are part of this work.

## Presentation ownership

- `player-controls.tsx`: one in-video transport for windowed and fullscreen playback,
  independent segment seek, speed/camera/HUD settings and accessible buttons.
- `watch.tsx`: existing wall-clock playback, keyboard, session recovery, independent
  replay segments, and persistent isolated shell / mini-player. Browsing the demo
  archive keeps the same mounted renderer and clock; it does not unload/reconstruct
  a player from storage. Real HOLOCRON routes are NOT integrated.
- `broadcast-director.ts`: derived viewer-only event edit list, minimum ordinary
  hold 3.5s, priority/cooldown and season-contender input (not populated by a real
  season service). Finish shots wait until the preceding finisher crosses. Near-
  simultaneous arrivals cannot all have individual held shots; share one shot.
- `scene.ts`: bounded 14/20px projected event badges, at most three, overlap rejection,
  impact fade, half-speed coast and repaired finisher glow (the old code immediately
  turned it off). The same recorded positions drive all cameras and the minimap.
- `watch.css` / `player.css`: page/playlist vs video/control/HUD responsibilities.
  The duplicate outside-video transport and fullscreen-only transport are removed.
- `serve-watch-v4.mjs` + `windows/`: exact source SHA build info and one-click
  PowerShell localhost server. Port conflicts fail before opening a browser;
  another explicit port is supported. No downloaded executable or runtime install.

## Frozen engine

`lib/racing/` is unchanged. Simulator remains `galactic-racing-0.4.0`.
Default `9rd-0`: official main race 218.5s, presentation outro 8s, race video 226.5s
(03:46). This distinction must not be confused with v0.3 or official finish times.
All outcomes, RNG, event occurrence, qualifying and official rankings are preserved.
The director only replaces the viewer's derived camera list, never the serialized
record. Historical tests remain required; no new simulator balance is implied.

## Player behavior and boundaries

- Click video, Space/K, arrows ±5s, J/L ±10s, F and Esc. Form controls own their keys.
- Hover/touch/focus reveals controls. Inactivity hides them while playing; keyboard
  focus and open settings remain usable. Reduced motion disables the fade.
- Each replay has its own start/duration/end; the end card offers the next replay.
- Fullscreen uses the browser API, with viewport fallback. Medium 1.5x / large 1.9x;
  measured bounds must be recorded separately, not inferred from this CSS value.
- Mobile 16:9 player, collapsible ranking, stacked replay and season lists.
- Seasons 1–3 are explicitly demo schedules. Only Season 1 R1 has a real seeded
  local record. Other rounds contain no fabricated winners. Winner stays hidden
  until the ceremony reveals the final result.
- This ZIP contains complete future results: replay ONLY. Server-time premieres,
  embargoed results, betting, admin seasons and actual HOLOCRON navigation remain
  NOT IMPLEMENTED. Do not deploy the static JSON as a public live service.

## Reference

The official [Gran Turismo 7 replay manual](https://www.gran-turismo.com/us/gt7/manual/replay/01)
documents target selection, replay controls and ±10s seeking. These public interaction
patterns inform the viewer; no claim is made to know its proprietary camera algorithm.
No competitor assets are used.

## Build / Windows

`pnpm racing:build:v4` creates `out/galactic-racing-phase1-v4`.
Extract the complete artifact to a NEW folder, double-click `START-RACING.bat`.
Default localhost port 43874. If occupied: `START-RACING.bat -Port 43875`.
Verify the top SHA / `build-info.json` before viewing; `?build=` mismatches show an
error. Keep the terminal open, Ctrl+C to stop. Windows managed execution policy
must not be bypassed. Batch uses process-local policy only; Group Policy prevails.

## Validation

See the accompanying final QA record for actual PASS/BLOCKED evidence, screenshot
paths, exact source SHA and ZIP hash. Local SVG fallback and cloud WebGL/SwiftShader
are separate results. Neither is a physical mobile-device GPU acceptance.
