# HOLOCRON — accelerated early-December 2026 release plan

> Product-owner priority updated 2026-11-09 KST. **Target first public integrated launch: 2026-12-07 (Monday)**, with an initial controlled preview around Dec 05–06 if independently accepted. **Dec 12–14 is a recovery buffer, not a routine target**. The older Dec 24–31 launch recommendation is superseded as the primary goal. This document is a plan, NOT approval to change main, Production, Sites, D1, Credit/Wallet/Ledger, Provider, AI OFF, or a live schedule.

## 1. Historical delivery velocity (GitHub commits, KST dates approximate)

| Week | Actually completed in source/QA | Important distinction |
| --- | --- | --- |
| Oct 12–18 | Works↔News integration, Featured Work, Account/Credit foundation, Guest/Google login, Assistant retrieval/provider/UI implementation & regression | Feature work and selected controlled deployments; not all AI calls authorized |
| Oct 19–25 | Assistant policy/quality/fail-closed work, collections/admin maintenance, first isolated 8-racer deterministic simulator (Oct 22) | Racing not a live service |
| Oct 26–Nov 1 | Archive/chat refinements, Racing 3D player, Windows demo, v0.4–v0.8 broadcast/shortcut/qualifying/camera/30FPS structural work | Very fast versioned implementation, not operational season/market |
| Nov 2–8 | Racing v0.9–v0.12 Ultimate, podium, hyper-warp, GAP, independent 40k simulations, Chromium/Windows artifacts | Real QA for isolated builds, NOT a D1/server/security deployment |
| Nov 9 onward | v0.13 Final Lap cinematic & DNF work in ChatGPT Work | Work reported in progress, not accepted or deployed |

**Interpretation:** from first source commit Oct 22 to v0.12 final Nov 6 ≈15 calendar days. Repeated Work/CI cycles are fast. However Phase3 live schedule, race-publication security and Production DB provenance are a different risk class; four-week target requires no further scope expansion.

## 2. Early-December integrated launch definition

**HOLOCRON public website + Galactic Racing operational spectator release** (not a passive local ZIP and not just COMING SOON):
- existing functional News, Works, Quiz, search/feedback, basic admin and reliable collector, using approved deployed schema;
- `/racing` in real HOLOCRON navigation, public responsive 3D Racing viewer with v0.13 accepted engine, 8 racers, official leaderboard/GAP, shortcut, Gold/Hyper, finish/DSQ/podium, individual profiles and replay;
- real **regular weekly seasons Monday–Sunday, seven races**, fixed **20:00 KST qualifying / 21:00 KST race** with 20:55 cutoff contract reserved (do not display a live market if unavailable); admin has safe minimum scheduling/reconciliation, one race result per slot, no normal reroll;
- server-time-based shared broadcast with correct late joining, reconnect and replay; **future results/Ultimate/DSQ must not be released to unprivileged viewers before the authorized watermark**; client-side hiding of a complete meeting JSON is NOT enough;
- optional custom seasons may be staged after first regular-season operational acceptance if they threaten the Dec 7 deadline, but the real public release must identify missing controls accurately.

**NOT a Dec 7 blocker:** Credit predictions/market/payout, sponsored micro-advantage, racer cosmetic unlock funding, paid chat subscriptions and paid emotes, premium calendar, Windows/Android/iOS standalone apps. These are separate later milestones; existing Credit wallet and user accounts must not be damaged.

**AI Assistant:** may launch only if provider model/api terms, explicit web-service use rights, privacy, budget/rate limits, grounding/quality and controlled backend call pass. Ajou University's Sep 2026 announcement advertises **8,000 credits per person per month, not 8,000 tokens**; only portal web usage is documented. A personal student allotment must NOT be assumed to be a public website's API quota. Verify with `ajoullm@ajou.ac.kr` and issue #3. Do not delay the combined web/Racing launch merely because the university API permission remains unavailable; AI stays OFF/COMING SOON unless independently approved.

## 3. Compressed weekly critical path

| Week (KST) | Racing implementation and acceptance | Core web / AI / release |
| --- | --- | --- |
| **W1 Nov 09–15** | Finish v0.13 Work, hardware/phone smoke, freeze engine and UX; identify existing 3-A/B/C design work reusable vs missing; plan rate/cap, selective disclosure and immutable output | Freeze December web requirements; audit source vs actually deployed Sites/D1 migrations, official backup and rollback constraints; request Ajou LLM API/usage written confirmation; isolate release branch |
| **W2 Nov 16–22** | Phase3-A domain/data + Phase3-B minimum: season/race/8-racer snapshot, version manifest, admin auth/RBAC/CAS, fixed schedule, idempotent generate, isolated DB tests. Web `/racing` with completed replay | Integrate News/Works/Quiz unaffected; feature flags; public AI only behind approved provider. Integration CI and source/secret review |
| **W3 Nov 23–29** | Phase3-C server clock, separate qualifying/main sealed entropy, future-result withholding/chunking, live resume, replay, 20:00/21:00 anchors, event/DSQ disclosure tests, missed-job and concurrent-generation tests | Isolated staging, restore dry-run and content QA; real mobile/Windows GPU performance tests; auth, rate/security/API checks |
| **W4 Nov 30–Dec 06** | Freeze scope; test full 7-race virtual-clock week, early-reveal/ETag/CDN failure tests, real browser sessions, incident/cancellation fallback and season standings; fix P0 only | Launch candidate, staged config, authorized backup/journal proof, monitoring, operator runbook and owner explicit GO/NO-GO; controlled preview Dec 05–06 only if passed |
| **Dec 07** | First intended regular-season qualifying at 20:00, race at 21:00 **only if approved and validated** | Combined HOLOCRON public opening; record deployed commit, runtime/DB manifest, official time, flags and monitoring |
| **Dec 08–14** | Monitor and correct incidents, not feature creep; Dec 12–14 recovery fallback if gate slipped | AI/market and future app distribution remain separately controlled |

The schedule assumes rapid Work implementation and decisive review. If a hard DB/journal/restore/authorization/early-disclosure blocker persists, escalate immediately; do not silently deploy a complete future race JSON or create Credit liability to hit Dec 7. A safe completed-replay preview could still be launched as **explicitly labeled spectator preview** but must not be represented as a completed live-season release.

## 4. Daily gates that determine date feasibility

- By **Nov 15**: accepted/frozen v0.13 or clearly bounded remaining defects; trusted current Production schema/backup audit path chosen; self-contained Racing/public API release contract.
- By **Nov 22**: locally executable Racing domain/admin with isolated schema tests and public route. If missing, Dec 7 live-season target at high risk.
- By **Nov 29**: shared server-time player with adversarial future-outcome hiding, live/reconnect and state transitions PASS. If missing, downgrade to completed-replay preview and label honestly.
- By **Dec 04**: no unreviewed P0, confirmed production baseline, evidence-based safe deployment route. Financial/community/app scope stays gated OFF.
- By **Dec 07**: only explicit owner-approved publish or clearly report the blocker and revised date.

## 5. Credit community post-launch backlog

See `docs/HOLOCRON_RACING_POSTLAUNCH_COMMUNITY_CREDIT.md`. It includes **racer sponsorship (potential micro win-probability effect), aggregate sponsorship cosmetic milestones (car/racer design upgrade without performance-stat changes), premium real-time chat membership and paid emotes**. Sponsor performance effects are a product policy proposal, NOT approved under existing rule "bets and administrator preference cannot influence outcomes". They require publicly disclosed cap/units, future-race seed/version review and legal/game economy tests. Launch with chat/sponsorship market operations OFF.

## 6. Postlaunch desktop/mobile commitments

Intended product: HOLOCRON Windows standalone application, Android and iOS application, and optional paid desktop-visible background calendar synced with Star Wars release schedules. This is documented in Product Spec and Roadmap, and is separate from the isolated Racing Windows test ZIP. Follow-up packaging/auth/update, device QA and store approvals are not prerequisites for the Dec 7 web release.

## 7. Deployment restriction

This document modifies no Production state. Reconcile actual canonical source, installed migration journal, approved original backup, triggers/index/FK/CHECK, live server roles and current policies before any D1/public change. A code rollback alone cannot revert D1. Credit/AI/Provider integration and real scheduled races require separate explicit authority. Preserve full SHA, exact artifact digests, read-only verification and audit report per gate.
