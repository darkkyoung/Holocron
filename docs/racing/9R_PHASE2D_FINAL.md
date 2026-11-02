# Phase 2-D Final — isolated v0.9 candidate

Source: main `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`, D.1.1 branch `767765dcf199569ae264f4f89608a46f4937cd52`; new branch `feature/galactic-racing-phase2d-final`. No main, Production, DB, Credit, AI, Provider or operating schedule changes.

## Stage A: causal Ultimate policy

The old integrator accepts an optional dynamics policy; absence preserves v0.1–v0.8 draws and outputs. v0.9 has a separate RNG namespace and Ultimate stream. No final outcome or profile information enters the policy. Official results still come from integrated distance, finish time and the existing DSQ reclassification.

At most one activation per racer, two per race, with 18 seconds between launches. Eligibility: RACING, not stopped, own progress 35–80%, at least 0.8 lap remaining. Per eligible tick probability is 0.00015 + 0.01 × ((rank−1)/7)². Gold: 2.2–3.2× for 6–11 seconds; Hyper: 10% candidate share, 3.4–4.2× for 8–11 seconds. A 0.75-second envelope avoids immediate full-power onset/termination. Ordinary incident resistance 95%, major resistance remains 25%; existing damage is not repaired and retirement rules remain active. These are prototype balance parameters, not fixed victory probabilities.

Conditional KPI is measured ONLY on activations starting at P5–P8, own progress 35–80%, at least two laps remaining and RACING. Podium/win use official FINISHED results after special DSQ. Mean gain includes all such outcomes, including retirement/disqualification. Rank-conditioned activation counts are not per-opportunity probabilities.

Initial 1,000-race pilot (lower powers/durations): 67.58% podium / 33.91% wins, below target. Second 2,000-race pilot: 83.57% / 48.06%. The final acceptance batch uses 40,000 distinct fixed seeds `9ru-0..39999` and reports sample size, Wilson intervals, retirement, timing and identity/grid wins. No post-hoc result editing.

Gold/Hyper effects are pooled per-car meshes: sonic ring, energy aura, long streaks and outline. They use recorded timestamps and pure elapsed-time functions, with reduced-motion flash suppression. No additional RAF, dynamic lights, unbounded particles or postprocessing. Camera launch attention is brief; subsequent selection uses observed competition. HUD shows current rank gain, never future results.

Local proof: 100 detailed full/summary pairs, geometric step bounds, 20 frozen v0.9 official payload hashes; all historical tests and D.1.1's 20 full v0.8 hashes. Browser/render acceptance is separately reported; compilation is not visual proof.

## Stage B implementation gate

Profiles live only in browser localStorage under a dedicated demo key. They are validated allowlisted fields, keyed by stable racer ID; unknown birth/species/home/team/biography stay empty. A separate information button opens a native modal without pausing playback; track buttons retain their camera function. Local admin supports edit, HTTPS image preview/fallback, save and bounded JSON import/export. Browser storage denial/corruption is reported. Profiles never enter the simulator, result payload or server.

New v0.9 ceremony presentation: overview 0–4s, P3 entry 4–9s, P2 9–14s, P1 14–19s, winner 19–24s, group celebration 24–30s, normal official display 30–40s. Special case: reveal at30s, evidence34s, DSQ/reclassification40s, re-award sequence44–74s, final74–84s. One `ceremonyState` disclosure clock serves the scene, text and checkers. The existing 10s coast, top-three 5s spotlights and provisional result screen remain before this sequence. No official race or qualifying record changes.

Podium uses existing billboard textures, a three-level SF stage, deterministic camera movement and one bounded 32-instance celebration effect. Reduced-motion disables the latter. Camera/presentation reference: EA's [F1 25 advancements deep dive](https://www.ea.com/games/f1/f1-25/news/f1-25-advancements-deep-dive), its publicly described motion-driven podium cameras; no source assets, logos, audio or private algorithms copied.

Stage B local test: profile validation, failed storage reads, 20 Stage A official-payload hashes, entry order, disclosure boundaries, DSQ 0 points and arbitrary seek order PASS. See `9R_PHASE2D_FINAL_MEASURED_QA.md` for the separate actual-browser, Windows, performance and artifact evidence; these are not inferred from compilation.
