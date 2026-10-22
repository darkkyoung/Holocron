# Galactic Racing — Product & Simulation Design

> Status: **9R-A LOCAL SIMULATOR + 2D PROTOTYPE IMPLEMENTED / NOT DEPLOYED**
> Decision date: 2026-10-14
> Galactic Racing is a planned fan-participation feature and Credit sink. It is intentionally separated from the core archive/AI implementation.

As of 2026-10-22, the deterministic eight-racer engine and standalone local 2D replay are available: [run and inspect the prototype](racing/9R_A_LOCAL_PROTOTYPE.md), [40,000-race balance report](racing/9R_A_BALANCE.md). The season, markets, Credit, production persistence/scheduler and 3D plans below remain unimplemented. The prototype uses one original abstract circuit and seeded qualifying order, not a full qualifying lap simulation.

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
| 20:00 | Qualifying generated and published |
| 20:00–20:55 | Post-qualifying prediction window |
| 20:55 | Daily prediction closes |
| 21:00 | Race starts |
| After finish | Result, standings, payout, Replay |

Season-champion prediction is open only during the **first three days** of the seven-day season. Exact Day-3 close timestamp is finalized in implementation/configuration before launch.

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

Qualifying is random but meaningful.

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
