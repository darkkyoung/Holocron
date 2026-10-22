# 9R-A balance measurement

**40,000 offline races** · `galactic-racing-0.1.0` · 2026-10-22

Fixed series: `mc-v1-0..mc-v1-39999`. This measures the simulator, not human enjoyment or production wagering fairness. No Provider, database, scheduler or user accounts are involved.

## Starting-grid advantage

| Grid | Wins | Win rate | Wilson 95% interval |
| --- | ---: | ---: | ---: |
| P1 | 6,182 | 15.455% | 15.104–15.813% |
| P2 | 5,825 | 14.562% | 14.220–14.912% |
| P3 | 5,616 | 14.040% | 13.703–14.384% |
| P4 | 5,254 | 13.135% | 12.808–13.470% |
| P5 | 4,993 | 12.482% | 12.162–12.810% |
| P6 | 4,491 | 11.227% | 10.922–11.541% |
| P7 | 4,116 | 10.290% | 9.996–10.592% |
| P8 | 3,523 | 8.807% | 8.534–9.089% |

P5–P8 collectively win **42.807%**. Grid advantage is present without making last-place starts hopeless. No target of exactly 12.5% per grid or per racer is enforced. Identities, under randomized qualifying, range from 12.275% to 12.785%; their intervals all include 12.5%. This does not prove absence of every systematic bias.

## Retirements and events

| Combined DNF/DSQ | Races | Share |
| --- | ---: | ---: |
| 0 | 20,032 | 50.080% |
| 1 | 14,508 | 36.270% |
| 2 | 5,460 | 13.650% |

0–1 retirements: **86.350%**. Two retirements occur in about one race in seven; the cap is reached often enough to be visible. No race exceeds two. DNF events: 19,667; DSQ: 5,761.

| Event | Total | Per race |
| --- | ---: | ---: |
| SLIPSTREAM | 2,502,047 | 62.551 |
| BOOST | 1,341,527 | 33.538 |
| SHORTCUT | 287,032 | 7.176 |
| SHORTCUT_FAIL | 90,812 | 2.270 |
| MINOR | 777,337 | 19.433 |
| MEDIUM | 363,970 | 9.099 |
| MAJOR | 203,537 | 5.088 |
| PIT | 227,800 | 5.695 |
| PENALTY | 66,009 | 1.650 |
| ULTIMATE | 50,045 | 1.251 |

## Ultimate and lead changes

Ultimate activates **50,045** times; only **10.445%** of activators win. Winners using Ultimate: 5,227/40,000. This is a conditional observation, not an estimate of causal Ultimate advantage: trailing racers are more likely to activate it.

Activations by current rank P1–P8: 1939, 3418, 4666, 6060, 7444, 8920, 9684, 7914. Counts are not per-opportunity rates: rank 8 has fewer eligible opportunities after terminal retirements. The code explicitly increases the conditional chance from 0.1% to 0.6%.

Mean leader changes: **18.59** per race. Mean duration: **167.14s**. Lead swaps can be brief; the next human playtest should assess whether the feed feels too busy. This phase does not hide swaps or tune outcomes to a desired winner.

## Actual position losses

First 1,000 races, rank 10 seconds after each adverse event (or final frame). Overlapping events are included; this is observational and does not isolate causation.

| Event | Observations | Lost at least one place | Mean rank loss |
| --- | ---: | ---: | ---: |
| MINOR | 19,233 | 29.77% | 0.286 |
| MEDIUM | 9,130 | 65.61% | 1.441 |
| MAJOR | 4,993 | 78.91% | 2.218 |
| PIT | 5,585 | 75.09% | 1.852 |
| PENALTY | 1,643 | 78.58% | 2.113 |
| SHORTCUT_FAIL | 2,283 | 78.36% | 2.186 |

## Bounds and reproducibility

Max observed duration: 833 ticks (208.25s); configured ceiling: 2,400 ticks / 600s. Max observed events: 264; ceiling: 12,000. All 40,000 races produced at least six finishers.

SHA-256 of ordered seed/results/events stream:

`de12b8189004be7c5271e8f051acdd9304718de43fb92b7bf4b058473c12edd5`

Raw aggregate and exact configuration: [9r-a-balance.json](9r-a-balance.json). The initial 10,000-race pilot is the first quarter of this same series, not a separate independent validation. No constants were tuned after seeing the pilot.

## Next bounded playtest

Inspect ordinary and two-retirement replays, judge race length and lead-change cadence, then propose a **new simulator version** if tuning is needed. Test several track/event configurations before any season or economy integration. Keep the production seed/commitment and write-once storage design independent of market odds.
