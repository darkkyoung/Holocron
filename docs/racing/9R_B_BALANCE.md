# Galactic Racing v0.2 — 40,000 race balance

Executed 2026-10-31, no DB/network/Provider. Raw reproducible report: [9r-b-balance.json](9r-b-balance.json).
Seeds `9rb-0` through `9rb-39999`. Digest over qualifying standings, official results and race events:
`e521412be726db8de04e41cf9f72124e393edb5f74d03b3f61859fa86bea3773`.

| Metric | Result |
|---|---:|
| Main race mean | 249.417 s |
| p05 / median / p95 | 237.75 / 248.75 / 263.50 s |
| Min / max | 222.75 / 305.50 s |
| Within 180–300 s | 39,999 / 40,000 (99.9975%) |
| Qualifying mean | 299.087 s |
| Mean leader changes | 23.9357 |
| Ultimate events | 69,754 (1.74385/race) |
| Official winners who used Ultimate | 6,955 (17.3875%) |
| Ordinary DNF / DSQ events | 27,964 / 8,572 |
| Races with 0 / 1 / 2 ordinary eliminations | 13,889 / 15,686 / 10,425 |
| Special podium DSQ | 375 (0.9375%) |
| Drafting rank crossings, first 200 full timelines | 16,731 |

Drafting crossing means an adjacent-frame rank reversal while the overtaking racer was drafting and both racers remain racing. It can count a repeated back-and-forth battle multiple times; it is **not** proof that drafting alone caused an overtake, nor 16,731 distinct battles. Event activation totals likewise include renewals. All 40,000 races contribute other metrics; only the explicit 200-race subset contributes the full-frame crossing measurement.

| Starting grid | Official win rate |
|---|---:|
| P1 | 13.1875% |
| P2 | 13.1850% |
| P3 | 13.1300% |
| P4 | 13.0375% |
| P5 | 12.6350% |
| P6 | 12.1550% |
| P7 | 11.7000% |
| P8 | 10.9700% |

| Racer | Official win rate |
|---|---:|
| r1 | 12.5475% |
| r2 | 12.4425% |
| r3 | 12.4400% |
| r4 | 12.4650% |
| r5 | 12.3800% |
| r6 | 12.9175% |
| r7 | 12.5950% |
| r8 | 12.2125% |

The front/rear grid spread is 2.2175 percentage points, narrower than the historical 9R-A 6.648-point spread (15.455% vs 8.807%). These versions also differ in qualifying, spacing and distance, so this is not a controlled causal experiment. Equal racer parameters and rotated update order remain; the largest identity deviation from 12.5% is 0.4175 points (~2.5 marginal binomial standard errors, before accounting for eight comparisons). This sample does not establish structural racer favoritism or exact equality. No per-racer correction/buff was added.

Longer race distance raises event exposure. Two ordinary eliminations occur in 26.0625% of races; the cap is respected, but retirements are not rare. This is a playtest tuning consideration, not hidden as a fully balanced release. The special DSQ observation is consistent with the configured 1% probability. The main-race duration target is met by all but one sample without forcibly ending or reordering that outlier.

Reproduce into a NEW file (the script uses exclusive creation to preserve historical reports):

```sh
pnpm racing:balance:v2 40000 /tmp/9rb-reproduction.json
```

No 9R-A historical output or Golden value was modified.
