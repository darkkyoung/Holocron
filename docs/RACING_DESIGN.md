# Galactic Racing — Product & Simulation Design

> Status: **Phase 2-D.1.1 viewer / simulator v0.8 — isolated validation; see latest measured report / NOT DEPLOYED**
> Latest decision date: 2026-11-02 KST; historical v0.1–v0.4 records retained below
> Galactic Racing is a planned fan-participation feature and Credit sink. It is intentionally separated from the core archive/AI implementation.

The historical v0.1 engine and 2D replay remain available: [9R-A](racing/9R_A_LOCAL_PROTOTYPE.md), [original balance](racing/9R_A_BALANCE.md). The separate [9R-B v0.2 prototype](racing/9R_B_LOCAL_PROTOTYPE.md) now has measured pipeline qualifying, a 10.8 km main race, a Three.js greybox broadcast, camera controls and special-DSQ ceremonies. See [40,000-race v0.2 balance](racing/9R_B_BALANCE.md). Season administration, markets, Credit, production persistence and scheduling remain unimplemented. GPU/mobile-device verification and full spatial shortcut/pit routing remain outstanding; see the prototype limitations.

## Current Phase 2-C implementation

See [v0.6 broadcast](racing/9R_PHASE2C_BROADCAST.md). B.1 continuous visual geometry is inherited; v0.6 adds actual double main-race speed,10laps,physical two-column grid,preshow/countdown and finish coverage. v0.1–v0.5 remain replayable. Server premieres,season persistence and betting are not implemented.

## Phase 2 decisions (authoritative planning)

[Phase 2-A rendering architecture](racing/9R_PHASE2A_PERFORMANCE.md) separates a
capped30FPS viewer from5Hz HUD updates without changing simulatorv0.4 outcomes.
[Phase 2-B–2-D decisions](racing/9R_PHASE2_PLAN.md) supersede older future plans:
20:00 KST qualifying,20:55 fixed prediction cutoff,21:00 fixed main start; manual
result-step timeout at most5minutes, never shifting those deadlines. v0.5 implements
physical branch shortcuts and qualifying round barriers. v0.6 implements10laps
and actual higher vehicle speed, replacing the old3–5minute goal only in that
new engine version. Fixed trackside cameras remain Phase2-D work; none of these
rules are retroactively applied to2-A records.

## Latest Phase 1 presentation decisions

The v0.4 engine, seeded outcomes and historical Golden records are unchanged.
The [Final Polish viewer](racing/9R_PHASE1_FINAL_POLISH.md) provides in-video
transport, independent qualifying/race/ceremony playlists, compact projected event
badges, a viewer-only event-driven director, finish coasting/glow, measured HUD
presets and a versioned Windows demo. [Final QA](racing/9R_PHASE1_FINAL_POLISH_QA.md)
distinguishes Chromium WebGL, SVG fallback and Windows server validation.
The following older v0.2 description is historical, not the current release status.
Actual HOLOCRON route integration, server-time premieres and season administration
remain unimplemented. The isolated shell demonstrates a persistent mini-player;
it does not claim Production navigation continuity. All displayed season schedules
are demo fixtures. No pit repair is reintroduced in v0.4.

## Latest 9R-B decisions — authoritative over older proposals

- Regular season: Monday through Sunday, seven races, every day at **21:00 KST**. Support automatic next-Monday season creation and reservation in a future phase. Prevent collisions between regular races at the same time.
- Administrators may create custom seasons with their own period, race times, track and participants, including a three-day mini-season.
- Racers can be registered, added and replaced; each season selects exactly eight. Base abilities remain identical. Registration/administration is not implemented here.
- Daily prediction defaults to first place. Special events may offer first/second/third predictions. Regular-season champion prediction closes **Wednesday 20:55 KST**. Custom seasons explicitly configure champion prediction ON/OFF and the cutoff.
- Operations should be configurable, but fairness and data-integrity protections cannot be disabled. Bets and administrator preference cannot influence seeded outcomes.
- Future public entry is the independent **🏎️ 갤럭틱 레이싱** tab at `/racing`. This phase adds no Production route.
- Qualifying: three measured time attacks per racer, round-robin pipeline starts, best valid time determines P1–P8. Grid influences starting position only.
- Main ordinary DNF/DSQ cap: two. Separately, a seeded approximately 1% podium disqualification is revealed during the ceremony. Provisional podium → exclamation → evidence → DSQ → revised ranks → official podium. Disqualified racer receives zero season points. Future Credit settlement must use only the official final result; none is implemented now.
- v0.2 points for finishers are 25/18/15/12/10/8/6/4. DNF/DSQ gets zero. This is local result data, not an implemented season ledger.


## 1. Product role

Galactic Racing is a once-per-day scheduled racing broadcast inside HOLOCRON.

It is not a conventional player-controlled racing game. The intended experience is a lightweight live sports broadcast:

- users return at a known time,
- make one Credit prediction,
- watch the same race together,
- follow a seven-race weekly season,
- replay completed races later.

Racers, vehicles, planets, and tracks should be original fictional designs. Space-racing genre conventions may inspire the tone, but noncommercial fan status must not be treated as automatic permission to copy protected names/designs.

## 2. Weekly season

One season contains **7 daily races**.

- 8 racers compete across the season.
- Every race has its own winner.
- Season standings use an F1-like points championship.
- Highest season score after Race 7 wins the championship.
- Exact per-position points remain a tuning parameter before implementation.

Two prediction markets:

1. Daily race winner.
2. Season champion.

One account selects one racer in each market.

Maximum stake: **30 CR per market entry**.

Guest identities cannot participate.

## 3. Daily schedule — KST

| Time | State |
| --- | --- |
| 00:00 | Daily winner prediction opens |
| 20:00 | Qualifying broadcast begins |
| 20:55 | Daily prediction closes |
| 20:58 | Main-race preshow begins with default120s setting |
| 20:59:55 | Final5s countdown, included in preshow |
| 21:00:00 | Official race starts; manual holds cannot postpone it |
| After finish | Result, standings, payout, Replay |

Regular-season champion prediction closes **Wednesday 20:55 KST**. Custom-season availability and cutoff are explicit administrator settings (future implementation).

The future winner does not exist before the race-generation step. The administrator does not choose or know the winner in advance.

## 4. Pari-mutuel prediction model

Use a **pool-based** model rather than fixed bookmaker odds.

- Crowd stake distribution creates favorites and underdogs.
- Popular racers produce lower expected payout multiples.
- Lightly selected racers produce higher expected payout multiples.
- Pre-close displayed odds are provisional.
- Final payout parameters lock with the market.

Exact pool retention/Credit-sink percentage is not fixed yet. It must be tuned through economy simulation so Racing consumes excess Credit over time without feeling punitive.

Credit remains non-cash and non-transferable. Public copy should prefer **우승 예측 / 시즌 챔피언 예측** rather than presenting the feature as real-money wagering.

## 5. Qualifying

Qualifying uses deterministic seeded lap simulation; the v0.2 measured pipeline replaces the v0.1 seeded shuffle for new meetings only.

- All eight racers have the same baseline performance rules.
- Qualifying changes only the starting grid.
- P1 begins ahead of P2, and so on.
- No hidden +3%/+2% direct win-stat buff is added.

Grid position itself is the advantage: less early traffic and less recovery distance.

## 6. Simulation philosophy

Do not use heavyweight authoritative rigid-body physics to determine the result.

The server performs one bounded deterministic race simulation and emits a timeline.

Conceptual racer state:
- route/progress,
- speed modifier,
- current position,
- damage/state,
- pit/penalty state,
- Ultimate state.

Collision/body contact is an authoritative event/state transition. The 3D client visually acts it out.

This keeps 8-racer interaction cheap.

## 7. Fairness and deterministic result

At race start:

1. Generate race seed.
2. Persist immutable race identity, seed/commitment metadata, simulator version, and start time.
3. Run the bounded simulation once.
4. Persist result and event timeline.
5. Never reroll an inconvenient outcome.

The same seed + simulator version must reproduce the same result for diagnostics.

## 8. Good events

Candidate classes:
- slipstream / clean line,
- boost,
- shortcut success,
- favorable track event,
- Ultimate.

Good-event probability may be **mildly rank-weighted** so lower positions receive somewhat more comeback opportunity.

The weighting must stay weak enough that P8 is not predictably favored. P1 can still get good luck; P8 can still get none.

## 9. Ultimate

Ultimate is a strong but unreliable comeback mechanic.

- Lower positions have a higher activation chance.
- Activation is never guaranteed.
- Duration is random.
- Power is random.
- It can create a dramatic charge toward P1.
- It never guarantees winning.
- A racer may trigger it and still fail to win.

Ultimate also protects against bad events. Intended feel: around **60–70% resistance against ordinary bad-event pressure while active**, while Major outcomes remain meaningfully dangerous. Exact per-tier resistance is tuned by simulation, not assumed from prose.

## 10. Bad events

Severe race-ending outcomes are part of Major; there is no separate Critical tier.

### Minor
- small contact,
- driving mistake,
- minor mechanical glitch,
- failed/slow start.

Effect: small slowdown/time loss.

### Medium
- external attack,
- racer body contact,
- side/low-speed wall collision,
- spin,
- light vehicle damage,
- pit stop for repair.

Effect: meaningful time loss and possible large position change without normally ending the race.

### Major
- frontal wall impact,
- accumulated collision/body-contact damage,
- large random vehicle failure,
- shortcut failure causing a near-DNF crash,
- severe penalty,
- DNF or DSQ.

Initial field safety target with 8 racers:
- usually 0–1 DNF/DSQ,
- 2 is possible but uncommon,
- no more than **2 of 8** in the initial simulator.

This is a cap, not a guarantee that someone is eliminated.

## 11. Map-specific event tables

Each environment can adjust event weights cheaply.

Examples:
- desert: sandstorm, heat, canyon shortcut, raider-style external attack,
- frozen: ice slip, ice tunnel shortcut, falling ice,
- industrial: cargo hazard, machinery, maintenance tunnel, magnetic boost.

These are configuration weights, not another physics engine.

## 12. Track library and reuse

User-facing target: roughly **14–20 distinct-feeling variants**, not 20 independent expensive 3D maps.

Construction model:

~~~text
Base Geometry
× Environment / Skin
× Direction Variant
~~~

Variety sources:
- Normal,
- Reverse,
- Mirror,
- selected Reverse + Mirror,
- environment skins,
- map event tables,
- obstacle/shortcut configuration.

### Reverse overlays

When a Normal track has one-way geometry, Reverse can activate lightweight additional pieces:
- ramps,
- bridge blocks,
- slopes,
- connector platforms,
- alternate gates.

Conceptually: **Base Track + Reverse Overlay**.

The daily eligible track/variant is selected randomly.

## 13. Art direction — 2D racer on 3D vehicle

Preferred style:
- simple/low-poly 3D vehicle,
- low-poly 3D track/background,
- hand-drawn 2D racer mounted visibly on the vehicle,
- racer billboard always faces the current broadcast camera.

Because everyone watches the same broadcast camera, the 2D art never needs to expose a thin paper edge. It remains readable in pack shots and closeups.

Textures/decals can make simple geometry look richer without heavy geometry.

## 14. Broadcast and Replay

The authoritative race is computed once. Viewers do not each simulate a separate outcome.

Server output conceptually contains:
- race id,
- start time,
- seed/simulator version,
- compact racer motion/state timeline,
- event timeline,
- result,
- camera cues.

At 21:00 every viewer derives current playback from:

~~~text
current time - race start time
~~~

A viewer joining late enters the same race at the corresponding point.

Replay starts the same authoritative timeline from zero. A recorded video file is not required.

## 15. Broadcast camera cues

Events can drive the automatic camera:
- starting grid,
- leader follow,
- battle for position,
- Ultimate,
- crash/spin,
- pit entry,
- external attack,
- shortcut,
- final straight,
- finish.

The goal is to make a simple simulator feel like a coherent sports broadcast.

## 16. Performance strategy

The simulator should be cheap. Asset/render weight is the larger risk.

Guidelines:
- 8 racers,
- bounded simulation steps,
- spline/route progress rather than full vehicle dynamics,
- event-driven collisions,
- current track lazy-loaded,
- low-poly geometry,
- compact textures/decals,
- bounded particles,
- no multiplayer rollback/prediction stack.

Map event tables, rank weights, Ultimate rolls, and DNF caps are tiny numerical operations compared with full physics.

## 17. Testing and tuning

Before visual polish, build a headless simulator and run large offline Monte Carlo batches.

Measure:
- winner distribution,
- qualifying-position advantage,
- comeback frequency,
- Ultimate activation by rank,
- Ultimate win conversion,
- Minor/Medium/Major counts,
- DNF/DSQ distribution,
- pit-stop frequency,
- map-specific event bias,
- season-point concentration,
- Credit inflation/deflation.

The objective is **unpredictable but believable**.

## 18. Reliability and transactions

When implemented:
- market close is server-enforced,
- stake debit is atomic/idempotent,
- one account has one racer per market,
- payout is idempotent,
- void/cancelled races refund through the Credit ledger,
- exactly one authoritative result is generated per scheduled race,
- no normal administrator reroll path exists,
- result/Replay remain available after live time.

Racing is its own domain and must not be coupled to News collection or AI generation.

## 19. Implementation order

1. Headless qualifying/race simulator.
2. Credit stake/payout model with test data.
3. Simple 2D debug replay proving determinism/live sync.
4. One low-poly 3D broadcast track with 2D billboard racers.
5. Camera/event presentation.
6. Season standings + champion market.
7. Track variant system + map event tables.
8. Expand visual library toward 14–20 distinct-feeling variants.
9. Mobile/performance/accessibility QA.

Galactic Racing is an independent implementation track and must not destabilize core archive or AI launch work.

## Phase 2-B / simulator v0.5

The versioned local prototype now models a spatial branch with entry-time seeded decisions and three qualifying rounds separated by all-finished result presentations. See [implementation and limitations](racing/9R_PHASE2B_SHORTCUT_QUALIFYING.md). Historical v0.1–v0.4 replay contracts remain unchanged. This is not a Production season or betting service.

## Phase 2-C.1 — historical v0.7 broadcast candidate

v0.7 preserves v0.6's ten laps, actual higher speed and spatial shortcut while
moving all eight authoritative starts 24m behind the previous positions to clear
the timing stripe. It is a new result namespace, not a rewritten v0.6 replay.
Qualifying keeps its measured attempts and adds 15s of visual cooldown after each
round (results from +3s); manual waiting begins after that cooldown. Main preshow
introduces P8→P1. The final race coast lasts 10s, followed only by provisional
P1/P2/P3 spotlights of 5s each, then the unchanged DSQ ceremony. DNF decoration
and bounded visual passing lanes do not rewrite results. See
[implementation](racing/9R_PHASE2C1_BROADCAST.md) and
[executed evidence and remaining limits](racing/9R_PHASE2C1_MEASURED_QA.md).
Production integration and Phase 2-D are not performed here.

## Phase 2-D.1 — historical v0.8 local candidate

[v0.8](racing/9R_PHASE2D1_TV.md) uses the same basic speed for qualifying and main
race, with distinct seeded qualifying rules and preserved historical records.
Fixed trackside TV cameras and replay controls are viewer presentation only.
Production synchronization, operations and Credit remain unimplemented here.

## Phase 2-D.1.1 viewer-only polish

See [implementation](racing/9R_PHASE2D11_BROADCAST.md) and [executed QA](racing/9R_PHASE2D11_MEASURED_QA.md). Competitive subject selection and framing are separate; direct roster keys and owner+automatic-angle viewing are local. Unified qualifying HUD, time-masked round records and wide cooldown results do not change the v0.8 engine. Future ultimate redesign is not included.

## Phase 2-D Final candidate (v0.9, isolated)

See `docs/racing/9R_PHASE2D_FINAL.md`. v0.9 versions the actual Ultimate policy; historical v0.1–v0.8 results remain frozen. Local-only racer profiles and a time-derived SF podium are presentation concerns. Conditional comeback statistics must state activation eligibility and denominator; they are not universal winning odds. No Production, Credit, scheduler or admin-auth integration is included. Regular timing remains qualifying20:00, predictions close20:55, race21:00 KST.


## v0.10 acceptance and Phase 3 design checkpoint (2026-11-05)

The isolated v0.10 branch replaces Hyper acceleration with a bounded official wormhole jump; Gold launch and power policy is preserved. Full Ultimate target locks and R1–R3 direct best-cell highlights are viewer behavior. See `racing/9R_PHASE2D_V010_FINAL_QA.md` for measured gates.

Phase3 planning is now specified in `racing/9R_PHASE3_ARCHITECTURE.md` and `racing/9R_PHASE3_IMPLEMENTATION_PLAN.md`. They distinguish earlier seed-at-start language from the proposed separately committed qualifying/main entropy and after-close private preparation. That generation-time decision still requires Phase3 approval; fixed20:00/20:55/21:00KST contracts do not change. No operational backend, new migration, market or deployment is implemented by these design documents.

## v0.11 final correction — current isolated candidate (2026-11-05)

New Ultimate launches use the racer's own cumulative progress **70% to before95%**: low70–80%, high80–90%, reduced90–95%. In ten laps, laps1–7 have no launches; laps8/9/early-to-mid10 are eligible. No minimum remaining-lap rule blocks the final window; zero-Ultimate races remain valid. v0.10 Gold power/duration, bounded Hyper wormhole and duration-long subject lock remain unchanged. The changed launch timing has a new `galactic-racing-0.11.0` namespace; historical v0.1–v0.10 results are preserved.

Main-race timing replaces speed with **GAP TO LEADER**, derived from the same cumulative-point passage times in confirmed official frames, with exact shortcut/jump anchors, lap deficits, official finish differences and retirement status. This is a HUD-only index; qualifying keeps lap times. See [fresh40k statistics, actual browser acceptance and Windows package](racing/9R_V011_FINAL_CORRECTION.md). Phase3 documents remain plans only; no Production, main, DB, migration, Credit, AI or operating-server change is included.

## v0.13 Final-Lap Cinematic candidate (isolated)

The new version uses own progress88–96%, preserves accepted Gold/Hyper motion and adds active-Ultimate ordinary-DSQ protection. Hyper's3s charge and delayed cinematic reappearance are display-only; official jump/normal movement/finish continue unchanged. Leader P1 DNF can override automatic Ultimate coverage; viewer manual selection remains highest priority. See [implementation boundary](racing/9R_V013_FINAL_LAP_CINEMATIC.md) and [measured QA](racing/9R_V013_MEASURED_QA.md). All historical versions remain; default ten laps and fixed KST schedules remain. No Production, Credit, Phase3 operations or platform-app release work is included.
