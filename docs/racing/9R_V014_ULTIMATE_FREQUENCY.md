# Galactic Racing v0.14 — Ultimate frequency rebalance

Isolated branch `feature/galactic-racing-v014-ultimate-frequency`, parent v0.13 `d0ea1f3839b12ce853258ae954f911d4aa9901ae`. Fresh remote `main` was `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. No Production or Phase 3 operational implementation.

## Versioned physical policy

The official engine version is `galactic-racing-0.14.0`. The v0.13 final-lap eligibility `[.88,.96)`, weights `.35 / 1.6 / .65`, individual progress, Gold/Hyper physical parameters, per-racer once and per-race twice limits, equal abilities, ordinary/special DSQ rules and cinematic timing are inherited. Only the stochastic launch weights and the global spacing differ. The new first-launch chance multiplier is **3.2**, second-launch chance multiplier **1.6**, and minimum spacing **10 seconds**. Each eligible racer still receives its independent seeded draw at a simulation tick. No launch is guaranteed, selected in advance, backfilled or chosen based on the winner. A second launch can occur during the first one's physical effect; neither movement is delayed or cancelled to satisfy a camera cue.

The optional `firstChanceScale` and `secondChanceScale` fields in the common launch rule default to one. Earlier versions do not supply them. Both the RNG namespace and the result version differ in v0.14. Gold power/duration/ramp, Hyper jump/afterburn/governor and track geometry remain the prior version's code and constants. Earlier replay records are dispatched to their historical version. V0.13 full-record hashes are checked against the committed 20-case fixture.

## Pilot selection before the independent holdout

Each row ran **3,000 separate `14pilot-` Seeds**, with distinct prefixes per candidate. Percentages are zero/one/two official launches. This is a comparison sample, not a replacement for the frozen independent 40,000.

| Cooldown | First × | Second × | 0% | 1% | 2% | Physical overlaps |
|---:|---:|---:|---:|---:|---:|---:|
| 8 s | 3.0 | 1.2 | 30.53 | 60.03 | 9.43 | 41 |
| 8 s | 3.2 | 1.3 | 29.90 | 60.33 | 9.77 | 38 |
| 6 s | 3.0 | 1.0 | 32.07 | 58.07 | 9.87 | 51 |
| 9 s | 3.0 | 1.4 | 30.93 | 60.40 | 8.67 | 11 |
| **10 s** | **3.2** | **1.6** | **28.07** | **62.30** | **9.63** | **15** |
| 12 s | 3.4 | 1.8 | 25.93 | 64.87 | 9.20 | 0 |

The chosen 10-second policy kept one launch comfortably above 60% in the pilot, two near 10%, and allowed observable but less frequent physical overlap than 6–8 seconds. Parameter constants were frozen before `14holdout-0..39999` ran. No holdout outcome is used to select a different parameter set.

## Broadcast overlap rule

The official race and events are unchanged by camera decisions. Automatic coverage priority is viewer manual choice > P1 DNF emergency > newer Hyper's three-second recorded pre-roll > newer physically active Ultimate > normal competition director. At the later activation, the older cinematic picture is preempted, and the older participant becomes visible under its ordinary official display state; its **official boost continues**. A newer Gold launch takes the picture at its start. The previous subject's official physics never stops. `cinematicState` and the target lock derive this order solely from recorded start/end times, so Seek and replay pick the same subject. A P1 DNF can interrupt either. This is a finite, deterministic presentation preemption rather than a second rendering loop.

This local replay contains the entire sealed record. The Phase 3 streaming client must disclose a pre-roll no earlier than its permitted T−3-second point and must never send future results or special DSQ ahead of their release. This branch adds no operating server, market or release endpoint.

## Test boundary

`scripts/test-racing-v14.mjs` exercises 400 versioned meetings, twenty historical v0.13 hashes, seeded full replay, a physical-overlap case and chronological/Seek/manual camera decisions, and six lap settings. `scripts/racing/balance-v14.mjs` audits the independent frozen 40,000 and official classification, window, spacing, capped count, Gold/Hyper, lap records, jump/shortcut and one-lap lead. `compare-laps-v14.mjs` uses separate 1,000-Seed samples for each lap length. `screenshot-v14.mjs` captures actual WebGL browser poses and video with desktop/mobile viewports and a later launch preemption; software rendering must not be reported as a Windows hardware-GPU benchmark.
