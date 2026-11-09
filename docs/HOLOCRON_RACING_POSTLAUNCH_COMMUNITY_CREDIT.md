# HOLOCRON Galactic Racing — post-launch Credit and community roadmap

> Product-owner concept confirmed 2026-11-09. This is **future backlog and evaluation**, NOT feature implementation, algorithm approval, economic-policy approval or Production/Wallet/Ledger change. **Core HOLOCRON + Racing public launch target is Dec 07, 2026 without this feature.**

## 1. Racer sponsorship via HOLOCRON Credits

**User vision:** community members spend existing HOLOCRON Credits to support a chosen Galactic Racing racer. Sponsorship can make a **very, very small** contribution to the selected racer's winning probability (illustrative magnitude: **0.001%**, proportional to sponsorship amount). Supporting a racer should feel meaningful, while core driver abilities remain equal and races remain uncertain. This is only a proposal.

**Critical ambiguity to resolve before implementation:** 0.001% may mean *0.001 percentage point absolute per 1 CR*, *0.001% relative per 1 CR*, *0.001 percentage point per funding unit*, or something else. The difference is material. For illustration, +0.001 **percentage point** per CR gives +0.03 percentage points from 30 CR, but +1.0 percentage point from 1,000 CR (before any caps). Establish unit, aggregation window and hard upper bound based on Monte Carlo simulation, not arbitrary unbounded arithmetic.

**Fairness conflict:** existing `docs/RACING_DESIGN.md` says bets/admin preference cannot influence seeded outcomes and all racers have identical underlying abilities. A Credit-funded win-probability modifier is a **policy change** and potentially a paid competitive advantage (even if tiny). Do not implement it silently or claim "equal win chances" after such a change.

Requirements before any sponsor-to-win model:
- Explicitly disclosed and versioned algorithm: input amount, timing, any boost, total season/race caps, per-account cap, rounding and possible returns. Consider a bounded **public race-level probability-weighted event** instead of hidden driver-stat buffs, preserving equal base abilities.
- Separate sponsorship transactions from daily outcome prediction stakes and official prize/market pools; forbid after-cutoff donation influencing an already sealed race. No late result reweighting, no forced winners, no rerolls, no knowledge of future results.
- Analyze possible odds manipulation/arbitrage if the site later has Credit winning predictions. Candidate safest launch: **cosmetic-only sponsorship first**, competitive boost only if separately approved after legal and fairness review.
- Transactional, idempotent debit/refund rules using original Credit Wallet/Ledger with no new parallel wallet or user-input-controlled outcomes. Defined insolvency/cancellation/refund and abuse/multi-account mitigation.
- 40,000+ independent race simulation baseline vs variants: grid/ID parity, sponsorship concentration, baseline win probability changes, spending advantage, fairness, cap enforcement, seed commitment, market odd shifts, upset frequency and DNF/DSQ handling.
- No real-money wagering or cash conversion implied by Credits; separately review Korean policy, age, app-store and virtual-item sales requirements, and any platform limitations before paid/competitive mechanics.

## 2. Community-funded visual upgrades (no performance increase)

Accumulate sponsorship Credits into per-racer **transparent public progress bars**. At disclosed milestones unlock administrator-reviewed:
- New / revised 3D car skins, paint, livery, visual effects;
- 2D racer illustration/costume design upgrades;
- Optional selection or community voting on cosmetic variants.

Every visual upgrade is **cosmetic only** and must preserve identical base performance. Handle license/third-party art rights, moderation, item version/snapshot, supporter attribution privacy, quotas, and progressive download/30FPS performance before launch. Do not allow ads/large textures to harm Racing stability.

## 3. Paid live Racing chat and paid emotes

Future HOLOCRON-native real-time synchronized chat during live matches:
- **Credit-priced membership/subscription** grants chat participation during the relevant period (definition: per race/week/month, price, renewal, expiry, eligibility and cancellation TBD). Membership should not change race outcomes.
- Users may spend Credits for emotes/stickers, preferably with a published catalog, exact unit prices and clear confirmation. Paid emojis are independent of racer sponsorship and betting stakes.
- Read access to chat may be public while posting is membership-gated only after explicit product approval; determine with accessibility requirements.
- Moderation: human/automated safeguards, reporting, block/mute, message rate limits, spam/harassment/illegal content, retention limits, banned user/refund policy and administrator incidents.
- Deployment security: server authenticated identity, bounded real-time fan-out and reconnection (SSE/WebSocket/other platform-appropriate option), no direct trusted client clock, replay chat privacy policy; control cloud egress/fan-out costs.

Do NOT use the standalone local player as a production chat authority or leak full unreleased race results.

## 4. Release sequence

| Stage | Scope | Dependency |
| --- | --- | --- |
| **2026 Dec 07 core launch** | News, Works, Quiz, Galactic Racing spectator seasons/live/replay if QA/approval passes; sponsorship/chat/emotes remain OFF | Web/season/server disclosure/backup/security gates |
| **Community 1 (post-launch)** | Cosmetic-only racer sponsor Credits, progress/milestone UI, audit | Wallet/Ledger integrity, retention, visual QA |
| **Community 2** | Optional paid emotes and a limited, moderated live chat pilot | Account permissions, stream backend, moderation/privacy, prepaid debits |
| **Community 3** | Credit subscription membership and optional broader chat | Term, cancellation, renewal and customer support contract |
| **Community 4 (separately approved)** | Tiny sponsor-linked racing probability influence, if ethically/legally acceptable and statistically defensible | Disclosed model and cap; no betting market manipulation; independent Monte Carlo, result sealing, policy change approval |

No stage is granted a guaranteed deployment date by this document.

## 5. Shared safety and ownership

Credit spending must be atomic and idempotent, avoid double debit and preserve refunds/obligations. Users must not gain backstage access, future-result disclosure or seed manipulation. Preserve special podium DSQ and public results. Clearly explain that the simulator remains stochastic, and that without a separately published sponsor policy, Credits have **no effect** on official winner selection.

No changes to Production, deployed Credit ledger/policy, AI provider, actual scheduled sessions or main are authorized.
