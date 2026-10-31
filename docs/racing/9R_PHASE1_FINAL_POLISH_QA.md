# Phase 1 Final Polish — executed QA / 2026-10-31

## Identity and scope

- Fresh main: `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`, tree `9ae882149edb6d46f1c95b845e453e3323f6cf99`.
- Base broadcast branch: `b1a2f86cb126af3580b0ab7e40f43e720d2c7524`, tree `b8ee136c778a720dc2c037e264a32cdc9902a6fe`.
- Work branch: `feature/galactic-racing-final-polish`.
- Tested executable source: `f6c91d1095a808281bf61f86c9618c8bccb8d6f1`, tree `ed1f1d34727cab4de96cf5252405328b90133492`.
- Final documentation commit is a descendant of that executable source. It does not rebuild or relabel the ZIP.
- Simulator: **galactic-racing-0.4.0**. No `lib/racing/` changes. Main and Production untouched; D1/Migration/Credit/Provider operations: **0**.

## Observable result

[Actions run 41210623190](https://github.com/darkkyoung/Holocron/actions/runs/41210623190)
completed successfully for the tested source. Jobs: `replay-and-ui`,
`balance-40000`, `windows-launcher` all SUCCESS. Download its
`galactic-racing-v4-demo` and `galactic-racing-v4-screenshots` artifacts as the
alternative delivery route. Artifacts may require GitHub login and have retention limits.

The user ZIP contains the **downloaded CI demo artifact**, not a later local rebuild.
The screenshots artifact contains 42 actual browser PNGs plus `browser-report.json`.
WebGL screenshots were downloaded and visually inspected, including a contact sheet.
No generated artwork substitutes for QA screenshots.

## Feedback matrix

| Requirement | Implementation / observed status | Evidence or boundary |
|---|---|---|
| In-video transport, progress/time/speed/settings | IMPLEMENTED / BROWSER VERIFIED | 1440, 390, 360 Chrome; no duplicate transport below video |
| Click/keyboard, editable-control exclusion | IMPLEMENTED / BROWSER VERIFIED for K, arrows, J/L, Space, F/Esc | CI checks seek and playback; manual Chrome confirms Space and fallback Escape. Mobile physical double-tap remains NOT VERIFIED |
| Hover/touch/focus, inactivity fade | IMPLEMENTED / PARTIAL browser verification | Settings/focus remain usable; touch-device gesture and autohide timing need physical-device acceptance |
| Separate qualifying/race/ceremony | IMPLEMENTED / BROWSER VERIFIED | Independent start, progress and end; 4:56 / 3:46 / 0:20 default videos |
| Mobile vertical content order | IMPLEMENTED / BROWSER VERIFIED | 390×844 and 360×800, no horizontal overflow, collapsible ranking |
| Fullscreen HUD presets | IMPLEMENTED / BROWSER VERIFIED | Actual measured dimensions below; native-or-fallback automation plus manually inspected fallback |
| Compact event badges | IMPLEMENTED / BROWSER VERIFIED | Front view at 70s: visible event; 14px frequent / 20px priority, max 3, overlap rejection/fade |
| Minimap / selected racer | IMPLEMENTED / BROWSER VERIFIED | 8 markers, bottom-left, resize and manual selection; desktop and mobile screenshots |
| Manual rear/front/side | IMPLEMENTED / BROWSER VERIFIED | All three views, source timeline unchanged |
| Automatic broadcast | IMPLEMENTED / BROWSER VERIFIED for observed scenes | Event priorities, 3.5s ordinary hold, repeat cooldown; real season-points integration NOT IMPLEMENTED |
| Finish sequence / half-speed coast / glow | IMPLEMENTED / BROWSER VERIFIED | First three arrival frames and post-race screenshot; exact half speed covered by engine regression |
| v0.4 mistakes/boost balance | PRESERVED / offline VERIFIED | No event or speed rules changed; 40k result identical |
| Browser-tab continuity | IMPLEMENTED / BROWSER VERIFIED | Background another tab for 1.2s, observed >1s timeline advance |
| Same-tab navigation | PARTIAL / isolated demo BROWSER VERIFIED | Archive shell keeps same mounted player/clock. Actual HOLOCRON route integration NOT IMPLEMENTED |
| Live premiere vs replay | Replay IMPLEMENTED; premiere NOT IMPLEMENTED | Static demo includes future results; no production timing/embargo server |
| Seasons / R1–R7 | IMPLEMENTED demo / BROWSER VERIFIED | Season 3 has seven disabled rounds; no fabricated winners. Backend NOT IMPLEMENTED |
| Exact build / Windows ZIP | IMPLEMENTED / Windows server VERIFIED | CI exact SHA, occupied port fails, alternate port works. Physical Windows Chrome manual use NOT VERIFIED |
| Ceremony / special DSQ | IMPLEMENTED / BROWSER VERIFIED | Default ceremony and seeded `9rd-41` DSQ, developer controls collapsed |

The default first two finishers are only 88ms apart. They share a shot rather than
pretending that two individually held cuts can occur in 88ms. The director moves
to subsequent finishers after the preceding arrival. Official outcomes and finish
timestamps remain separate from the 8-second presentation outro.

## Browser environment and measurements

CI: Playwright 1.64.0, Chrome Headless Shell **156.0.8078.4**, Chromium build 1248,
Linux SwiftShader / **WebGL 2**. External requests are blocked; **0** attempted.
All three viewports report **0 page errors**, and document scroll width equals
viewport width (1440, 390, 360). This is not physical Android/iOS testing.

Managed cloud Chrome additionally tested the exact local source at actual responsive
iframe viewports. That environment has no GPU, so its visibly labelled **SVG 3D**
fallback and viewport fullscreen were inspected separately. SVG depth/character
appearance is degraded compared with WebGL; the primary visual evidence is the CI
WebGL set. Neither result proves arbitrary consumer-GPU performance.

Desktop fullscreen 1440×900, actual CI DOM bounds (pixels):

| HUD | Medium | Large |
|---|---:|---:|
| Ranking width / height | 207 / 430.5 | 262.2 / 545.3 |
| Ranking bottom | 508.5 | 623.3 |
| Lap width / height | 125.04 / 79.5 | 158.38 / 100.7 |
| Minimap width / height | 187.5 / 129 | 237.5 / 163.4 |
| Minimap top / bottom | 679 / 808 | 644.6 / 808 |

Large ranking-to-map clearance is **21.3px**. Cloud font metrics yielded **6.1px**
clearance, also non-overlapping. Portrait mobile intentionally hides the overlay
ranking; users expand the separate ranking section. On 360×800 large fullscreen,
minimap is 171×117.8 at x12/y602.2, bottom720; lap HUD fits inside the viewport.

Important screenshot names in `QA/webgl/`: `desktop-race.png`, `mobile-race.png`,
`narrow-race.png`, `desktop-fullscreen-medium.png`, `desktop-fullscreen-large.png`,
`desktop-chase.png`, `desktop-front.png` (event), `desktop-side.png`,
`desktop-finish-1.png` through `-3.png`, `desktop-coasting.png`,
`desktop-ceremony.png`, `desktop-special-dsq.png`, `desktop-season3.png`.

## Tests actually executed

| Check | Result |
|---|---|
| v0.1 Golden and 512 full/summary pairs | PASS |
| v0.2 1,492,455 assertions / 200 pairs | PASS |
| v0.3 2,197 checks / 200 pairs | PASS |
| v0.4 240 deterministic meetings / half-speed coast | PASS |
| Existing Phase 1 UI regression | PASS; obsolete stage-tab assertion updated for the intentional player replacement |
| New viewer director / 100 immutable records | PASS; minimum ordinary hold and sequential finish cues, 116 near-simultaneous arrivals share shots |
| 40,000 deterministic simulations | PASS locally and CI |
| Chromium 1440×900 / 390×844 / 360×800 | PASS, WebGL 2 required by test |
| Windows PowerShell server / exact SHA / port collision / alternate port | PASS, windows-latest CI |
| TypeScript / application build / standalone Vite build | PASS |
| Lint | PASS, 0 errors; 1 pre-existing unused `debit` warning in unrelated assistant test |
| Diff check | PASS |

An earlier CI run failed because a fractional finish timestamp was rounded down by
the 250ms range input, so the assertion sampled the preceding authoritative tick.
The browser test now seeks the first recorded tick at or after the finish. No result
or engine timestamp was changed. The final run above is the passing run.
Build warnings include the large Three.js bundle and GitHub action Node-version
deprecation; they are not hidden as test failures or claimed resolved.

## Balance: same engine, reproduced results

Seeds `9rd-0..9rd-39999`; digest
`8091ca167cdc847e3b8609ffa04afc4a62ad7e448c8c111c093825fd0cc6b7f1`.
Mean **220.5144375s**, median220.5, p05=214, p95=227.5, range207.75–238.
All40,000 within3–5minutes. P1wins **13.1275%**, P8 **11.2075%**;
racer win rates12.3125–12.7175%. SpecialDSQ383 (**0.9575%**).
Ordinary eliminations0/1/2:22825/13396/3779. Mean lead changes37.14085;
Ultimate69,996events. Draft-associated adjacent-frame passes27,606 across the
200 full-timeline subset; this is association, not proof of causal overtakes.
These reproduce the previous v0.4 baseline, not a newly tuned engine.
Full counters are in `9R_PHASE1_FINAL_POLISH_BALANCE.json`.

## Windows use and remaining release work

Extract the whole ZIP into a **new folder**. Open `Demo/START-RACING.bat`; keep its
terminal open. If the default browser is not Chrome, open the displayed localhost
URL in Chrome. Confirm SHA starts **f6c91d1095a8**, simulator0.4.0 and race03:46.
If port43874 is occupied, run `START-RACING.bat -Port 43875` from the Demo folder.
It fails before opening an occupied old server. No Node/Python installation needed.
Corporate execution restrictions are a BLOCKER; do not bypass them.

Remaining: physical Windows Chrome/GPU and touch gestures; actual HOLOCRON App
Shell integration; server-time premiere and protected results delivery; real season
backend. No Production release is authorized or claimed. This is a usable isolated
replay prototype, not a completed public racing service.
