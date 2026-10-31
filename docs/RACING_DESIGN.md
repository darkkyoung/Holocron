# Galactic Racing — Product & Simulation Design

> Status: **9R-B v0.2 LOCAL 3D BROADCAST IMPLEMENTED; GPU QA PENDING / NOT DEPLOYED**
> Latest decision date: 2026-10-31 (9R-B); earlier design retained below
> Galactic Racing is a planned fan-participation feature and Credit sink. It is intentionally separated from the core archive/AI implementation.

The historical v0.1 engine and 2D replay remain available: [9R-A](racing/9R_A_LOCAL_PROTOTYPE.md), [original balance](racing/9R_A_BALANCE.md). The separate [9R-B v0.2 prototype](racing/9R_B_LOCAL_PROTOTYPE.md) now has measured pipeline qualifying, a 10.8 km main race, a Three.js greybox broadcast, camera controls and special-DSQ ceremonies. See [40,000-race v0.2 balance](racing/9R_B_BALANCE.md). Season administration, markets, Credit, production persistence and scheduling remain unimplemented. GPU/mobile-device verification and full spatial shortcut/pit routing remain outstanding; see the prototype limitations.

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
| 20:00 | Qualifying generated and published |
| 20:00–20:55 | Post-qualifying prediction window |
| 20:55 | Daily prediction closes |
| 21:00 | Race starts |
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
