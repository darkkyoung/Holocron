# Phase 2-D.1 — executed evidence (candidate)

BaseC.1 `59d032dc6df71f2a1b575961b1e594ad29503e0c`; main freshly fetched at
`93646c066aaf8a33f1a7c062f8404dd7cd7b211e`. Only Racing branch
`feature/galactic-racing-phase2d1-tv` is modified. Initial candidate is d132c4d;
final runtime, CI and delivery identity will be recorded after validation.

## Local executed checks
Historical v0.1–v0.7 regressions PASS, including old C.1 presentation and
10 frozen full v0.7 JSON hashes. v0.8 integration PASS:100 full meetings,
1,160,168 physical segments,1/3/5/10/15/30lap settings, ordinary retirement cap,
seed/capture equivalence, official lap timing and schedule. No old golden changed.
TypeScript, lint, app build, standalone build and diff-check PASS. Lint has the
existing unused`debit` warning in unrelated assistant refund tests; chunk-size
warnings remain. No unrelated assistant file was changed.

The initial local Playwright official download returned a truncated/non-ZIP
archive. It was not replaced with an untrusted mirror. Actual Chrome evidence
comes from supported CI, with renderer type reported rather than assumed.

## 40,000 v0.8 games
Executed`9rf-0..39999`; digest
`2df9c28b4d0c141f524ceb51716b2b3c4ad0a4ff401d65b092d3d7cad8958011`.
Mean main362.60906875s; p05/median/p95356.5/362.5/369.5s; range349.25–383.5s.
Mean qualifying lap37.88812418s; whole qualifying broadcast346.6591724s.
Among960,000attempts:9,510invalid(0.990625%),95,994incidents(9.999375%),
zero incidents scheduled beyond the lap, zero round barrier/grid/completed-lap
errors. All3rounds completed. Main grid P1–P8 win percentages:
13.9475/13.8425/13.6625/13.1725/12.425/12.0275/10.9625/9.96.
Racer wins12.145–12.835%; base abilities equal. SpecialDSQ413(1.0325%).
Ordinary retirements0/1/2:26991/10893/2116; DNF11623, DSQ3502.
Leader changes1,641,645(total),41.041125/game. Shortcut entries3,128,683,
success1,467,058, failure1,661,625; incomplete successful passages1191due to
retirement. No probability depends on bets or administrator preferences.

v0.7 mean main362.61350625s,P1/P813.755/9.945%; v0.8 gap3.9875percentage
points versus3.8100. Small observed change, not proof of identical distributions;
new qualifying and race RNG namespace means comparisons are not controlled
causal estimates. Physical continuity uses the separate100full-frame meetings,
not a false claim that40k summary runs retain all render positions.

Representative same seed`9rf-0`: qualifying mean75.778→37.928s, total460.862→
347.172s. Eight-second launch gaps unchanged, preserving overlap without packing
all8into a much shorter launch interval. Cooldown15s/result12s are unchanged.

## Camera math versus browser evidence
Six lenses clear all sampled main/branch road centerlines by at least28.93render
units, at height32above the maximum27-unit canyon blocks. This is a clearance
check, not a blanket claim that every conceivable projection has no occlusion.
Coverage rejects sampled aim velocities above90degrees/s before playback.
Twenty default10lap meetings sampled109,213fixed-shot frames at30Hz; maximum
centerline aim speed80.15degrees/s. Explicit cuts and visual passing offsets are
excluded from that number and need actual dynamic browser inspection.
Mean edit-list preparation on this local runtime98.84ms/record; not a GPU benchmark.
Historical records, official progress and results are not modified by camera edits.

## Pending final evidence
Actual browser screenshots, live pose checks, before/after FPS, heap/resource
soak, Windows launcher, exact CI artifact digest and final GO decision are pending.
No stable30FPS or user hardware acceptance is asserted by these local tests.
Production/main/DB/Migration/Credit/AI/Provider changes:0.
