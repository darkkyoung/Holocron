# HOLOCRON Galactic Racing — Phase 1 Broadcast v0.4

**Scope:** local-only spectator / replay prototype. **Production: unchanged.**  
**Git branch:** `feature/galactic-racing-phase1-broadcast-v4`  
**Simulator version:** `galactic-racing-0.4.0` (older v0.1/v0.2/v0.3 remain reproducible).

## User-facing changes

1. Fullscreen HUD size: **Small 1.15×, Medium 1.5×, Large 1.9×**. Windowed size: Small .85×, Medium 1×, Large 1.3×. Timing tower, lap indicator and minimap use a common size multiplier. Native browser fullscreen is preferred; an in-page, viewport-filling fallback works if the browser blocks that API. Large HUD timing tower scrolls to avoid hiding the lower-left map.
2. Replay controls: click an unobstructed portion of the video to pause/resume. **Space/K**, **J/L ±10s**, **left/right arrows ±5s**, **F** fullscreen. The buttons, camera selections and slider remain available. No timeline seek restrictions are claimed for the later live-premiere service.
3. Video clock: wall-clock based and continues across browser tab hiding. The browser cannot paint an unloaded page, so the local demo saves its playback state in **sessionStorage** and resumes at elapsed position upon returning/reloading. This is *not* a persistent global mini-player across other Holocron routes. A true cross-route background player requires shared app-shell architecture in a later integration phase.
4. Camera: **rear/chase, front-looking-back, side** manual tracking, with locally selected racer. Automatic view retains the recorded event-priority cues and adds front-facing finish shots using deterministic presentation cues; no known proprietary Gran Turismo camera code was copied.
5. Upper-right lap counts; **lower-left positional track minimap** with 8 local markers, selected racer ring and qualifying mode. All position data originates from the frozen server-seed result / interpolated replay.
6. Head-up event cue: small camera-facing symbols with **no text padding**, triggered by existing BOOST / SLIPSTREAM / ULTIMATE / incident states. Placeholder graphics can later be swapped without simulation changes.
7. Post-finish: for **8 seconds** after the last official finisher, finished cars visibly coast at **half their crossing speed**, with cyan glowing outlines. The authoritative RaceRecord stays clamped at the finish and is never altered; this is presentation only. DNF/DSQ cars do not become finishers.
8. Qualifying errors are less frequent and less punishing; race penalties are milder, boost and drafting become more useful. No PIT system returned.

## v0.4 balance — 40,000 seeded offline races

This dataset was generated after reducing v0.4 starting gridGap to **800** (the v0.3 baseline remains intact).

| Metric | v0.4 result |
| --- | --- |
| Mean race | **220.514 s** (3m 40.5s) |
| Min / max | **207.75 / 238.0 s** |
| Within 3–5min | **40,000 / 40,000** |
| P1 win | **13.1275%** |
| P8 win | **11.2075%** |
| P1–P8 advantage | **1.9200 percentage points** |
| Special podium DSQ | **383 / 40,000 = 0.9575%** |
| 0 / 1 / 2 ordinary eliminations | **22,825 / 13,396 / 3,779** |
| Average lead changes | **37.14** — still potentially visually hectic; camera should not cut on every pass |
| Paid API/provider calls | **0** |

The result is a probabilistic balance sample rather than a guarantee for every future seed. The actual race is deterministic per seed, and racer base abilities remain equal.

## Build and inspect

```bash
pnpm install --frozen-lockfile
npm ci --prefix prototypes/galactic-racing-v2 --ignore-scripts
pnpm test:racing
pnpm test:racing:v2
pnpm test:racing:v3
pnpm test:racing:v4
pnpm racing:build:v4
pnpm racing:watch:v4
```

Watch the independent local server on `http://127.0.0.1:4173/`.

The build-only command produces `out/galactic-racing-phase1-v4` for ZIP distribution. Its JSON contains complete offline future results, so **do not deploy this prototype JSON as a real prediction/betting endpoint**.

## Release boundaries

- No Production Site, D1, migration, Credit Ledger/Wallet, OpenAI API or Canonical main changes.
- Future **LIVE PREMIERE** needs a separate server-authoritative time/visibility policy. Viewer pausing and catch-up must not reveal pre-race results or affect settlement. Local replay keyboard seeking must not be silently reused in live mode.
- Cross-route mini-player, season scheduler, real archive and roster/credit settlement remain future phases.
- Screenshot QA uses isolated Chromium/SwiftShader, **not physical mobile GPU hardware**.
- This phase does not reproduce Gran Turismo's undisclosed camera director. It implements three requested angles and local deterministic event/final-straight priorities.
