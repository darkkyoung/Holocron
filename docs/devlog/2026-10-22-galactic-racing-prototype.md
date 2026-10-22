# Phase 9R-A — Galactic Racing prototype

Date: 2026-10-22. Verdict: **LOCAL PROTOTYPE IMPLEMENTED / SYNTHETIC VERIFIED / NOT DEPLOYED**.

## Source and scope

- Fresh canonical main: `aff8cd0ea14e2e1a30df6af4af493d875985d363`, tree `587da04bc1f94b9622ae005c3260a953206f0856`.
- Final commit/tree are the canonical commit containing this record; resolve with `git log -1 --format='%H %T' -- docs/devlog/2026-10-22-galactic-racing-prototype.md`. A self-referential commit hash is not embedded in its own content.
- Read `AGENTS.md`, Racing design, Roadmap and Product Spec before implementation. Existing source contained design only, so no engine was replaced.
- Added only the Racing domain, standalone local tooling/viewer, targeted tests, balance evidence, and narrow design status updates. Root package scripts add three commands; existing app/dev/build commands and all dependencies/lockfiles remain intact.

## Implemented

`lib/racing/` separates record/config, PRNG/qualifying, event transitions, authoritative integration and pure replay. Eight original racers have equal base performance. Qualifying changes only initial distance; seeded streams and stable integer progress reproduce the entire result/events/timeline. One frozen record is generated before the local server listens. Replay never calls the simulator.

Implemented slipstream, boost, shortcut success/failure, Minor/Medium/Major, pit repair, time penalty, terminal DNF/DSQ and one rank-weighted Ultimate per racer. Combined retirement cap is two. Tick/event bounds fail closed. No market, odds or winner override enters the engine. Prototype qualifying is a seeded permutation, not simulated qualifying laps.

`prototypes/galactic-racing/` is a separate React/SVG broadcast with position, rank, speed, lap/progress, events, leader battle, Ultimate/accident state, final classification and Play/Pause/Replay/speed/scrub controls. The main application has no Racing route or launcher. Original geometric vehicles and one original circuit are code-drawn, with no borrowed protected assets.

Local command: `pnpm racing:prototype`; URL `http://127.0.0.1:4173/`. Default seed `vesper-007` is an illustrative demo, not the balance sample. Full instructions: [local prototype](../racing/9R_A_LOCAL_PROTOTYPE.md).

## Balance evidence

40,000 races (`mc-v1-0..mc-v1-39999`), [raw aggregate/config](../racing/9r-a-balance.json), [interpretation](../racing/9R_A_BALANCE.md):

- Grid P1 win 15.455%; P8 win 8.8075%; lower-half combined 42.8075%.
- Identity win rates 12.275–12.785% under randomized qualifying, with no artificial equal-win constraint.
- Retirements 0/1/2: 50.080% / 36.270% / 13.650%; no cap violation.
- 50,045 Ultimate activations; activator win conversion 10.445%, not a causal effect estimate or a guaranteed comeback.
- Mean duration 167.136s; maximum 833 ticks / 208.25s; max 264 events. Engine caps: 2,400 ticks, 12,000 events.
- Every adverse mechanic had observed subsequent rank losses in the first 1,000 races. Overlapping-event observation is not a causal experiment.
- Result/event stream SHA-256: `de12b8189004be7c5271e8f051acdd9304718de43fb92b7bf4b058473c12edd5`.
- Initial 10,000 was a prefix pilot, not an additional independent dataset. No probabilities were tuned after inspecting it.

## Validation

- `pnpm test:racing`: PASS. Entire-record golden; seed/version rejection; immutable nested records; 512 full/summary pairs; all event kinds; caps, monotone progress, terminal retirements, finish order; controlled Ultimate rank/resistance and cap fallback; replay purity; fixed HTTP resources, byte digest, POST/Host/path rejection. Unseeded RNG and external fetch throw during domain tests.
- `pnpm racing:balance 40000 docs/racing/9r-a-balance.json`: PASS, 40,000 offline races.
- TypeScript `pnpm exec tsc --noEmit`: PASS.
- `pnpm lint`: PASS, zero errors, one pre-existing unused `debit` warning in `scripts/test-assistant-refund-safety.mjs`.
- `pnpm build`: PASS through the official bounded Vinext build. Existing application routes unchanged; no Racing engine/viewer in application output.
- Existing regression PASS: News Work, Works, Quiz, Google Account, Guest Rewards, Announcement, Automatic SWNN Images, Scheduled Collection, Assistant UI, Assistant Workspace, Public Navigation, Backup; Credit Policy 262 assertions on real isolated Miniflare D1.
- Chromium local QA: eight-racer grid and moving positions/ranks, pause, 4× playback, keyboard scrub to finish, final standings and replay with same seed/digest/results PASS. [Screenshot](../racing/9r-a-viewer.jpg).
- The managed preview mounts its checkout as its execution root and requires its container interface. QA selected the Racing dev entrypoint temporarily and restored the original `dev` script; no hosting manifest or source deployment was changed. The normal CLI stays loopback-only. WebCrypto is not required for local replay: the displayed server digest is an offline consistency check, not an authentication claim.
- Browser download-event automation timed out; handler-level bytes/hash/attachment verified. Narrow/mobile touch and screen-reader devices NOT VERIFIED. Responsive layout and labelled keyboard controls are implemented.
- `git diff --check`: PASS.

## Preservation and limits

Production deployments **0**, Production D1 operations **0**, Provider calls **0**. No secret, credit policy, scheduler, SWNN, migration, backup contract, AI prompt/validator/network diagnostic, evaluation manifest/approval/journal or user data changed. Production v88 and AI OFF are left as previously established, not re-audited here.

New `lib/racing/` files may change broad historical runtime source hashes. No historical evaluation manifest was rehashed or approval reused. No live evaluation was run.

The result is a usable local prototype, not a released prediction economy or production fairness certificate. Process-local freezing plus a byte digest does not replace future durable write-once storage and seed commitment. One abstract track, no 3D physics/season. The next step is owner pacing/fun review, then versioned tuning; account/credit/market and scheduler work remain separate approvals and implementation stages.
