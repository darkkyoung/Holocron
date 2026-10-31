# Galactic Racing Phase 1 — Video-first broadcast UI

**Status:** isolated local presentation prototype, **not deployed**. Source branch:
`feature/galactic-racing-phase1-watch-ui`.

## References and intent

The Phase 1 player uses the **content hierarchy** of a watch page: main 16:9 video, title, compact actions, selectable replay episodes, and a season playlist nearby. It does not copy YouTube assets, icons or proprietary UI. The 3D broadcast HUD favors the sparse *race timing / position / lap* style of Gran Turismo over large developer overlays.

This is a continuation of Racing 9R-B.2, not a replacement of the v0.1/v0.2 engines or v0.3 pit-free results. Static local 3D replay and the provider-independent seed/result contract are unchanged.

## View features

- **LAP n / 3**, pinned in the upper-right during the race. In auto camera it follows the leader; manual tracking follows the selected racer and labels the source. A finished racer remains at lap 3. Pipeline qualifying shows **R1 / 3, R2 / 3, R3 / 3** based on actual starts rather than assuming all previous-round laps have finished.
- Time / stage at top left. Compact desktop top-eight positions; on portrait mobile the full timing is below the player in a collapsed details panel. No floating 'CAM AUTO' or extraneous race-control text boxes.
- Low-cost **camera-facing event badges** above racers: draft, boost, Ultimate, accident, external hazard and slowdown. The same existing recorded events and motion flags drive the badge; no model, RNG or win outcome depends on it. Icons/textures are local Canvas/SVG, not fetched assets.
- Replays remain independent: qualifying / race / ceremony, with per-session start, replay, seek and stop. The provisional ceremony and official post-DSQ outcomes are labeled.
- On desktop the player shares a watch-page layout with a right-hand **replay episode** list and **season playlist**. Portrait mobile keeps the 16:9 video at the top and moves lists below.
- Sample weekly seasons appear as **시즌 1 / 시즌 2**, each R1–R7 at 21:00 KST and sample dates. Only Season 1 R1 uses this demo's actual immutable result; all other rounds explicitly say **경기 기록 없음**, are disabled and do not fabricate winners or stored calendar entries.
- Fullscreen remains available; replay speed defaults to 2× locally. Temporary local special-DSQ seed switch is hidden under a collapsed demo-only settings area, not below the podium episode.

## Local commands

Using the existing repository dependencies plus the isolated prototype package:

```bash
pnpm install --frozen-lockfile
npm ci --prefix prototypes/galactic-racing-v2 --ignore-scripts
pnpm racing:watch
```

Open `http://127.0.0.1:4173/`. Static release for offline inspection:
`pnpm racing:build:watch` → `out/galactic-racing-watch/` → local HTTP server.

Testing: `pnpm test:racing`, `pnpm test:racing:v2`, `pnpm test:racing:v3`, `node scripts/test-racing-phase1-ui.mjs`, app lint/typecheck/build, then `node scripts/racing/screenshot-phase1.mjs` against the built local fixture. CI uploads the standalone demo and desktop/mobile browser screenshot artifacts.

## Explicit limits

- The two visual sample seasons are **not** real persistent seasons. Actual user-facing season creation, reservation, racer registry and standings still require 9R-C/backend. The client must eventually render trusted scheduled/finished race states; it must not invent results.
- Native WebGL running in a cloud software renderer does **not** prove GPU performance on physical mobile devices.
- The local demo bundle contains the entire qualifying, race and ceremony outcomes. Production must restrict future outcome exposure to the correct time window; it must never reveal the result to prediction clients prematurely.
- Racing UI is still **outside the HOLOCRON Production app**. No /racing public route, D1 migration, Credit bets, live Provider calls or Production publication are authorized.
- No new art assets or copyrighted competitor screenshots are included. The stylized episode thumbnails are simple CSS sketches; richer real-frame captures can be added once a persistent replay archive exists.
