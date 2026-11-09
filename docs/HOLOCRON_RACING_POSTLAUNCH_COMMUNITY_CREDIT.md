# HOLOCRON Galactic Racing — post-launch Credit and community roadmap

> Product-owner concept confirmed 2026-11-09. This is **future backlog and evaluation**, NOT feature implementation, algorithm approval, economic-policy approval or Production/Wallet/Ledger change. **Core HOLOCRON + Racing public launch target is Dec 07, 2026 without this feature.**

## 1. Racer sponsorship via HOLOCRON Credits

**Owner clarification 2026-11-09 — SPONSORSHIP IS NOT BETTING.** Users spend HOLOCRON Credits to support a chosen racer, **not to predict a winner or receive winnings**. Sponsored Credits do not become a race prediction stake, odds pool, payout or refundable wager. Sponsorship exists to create identity, fandom, community milestones and a tiny visible influence. Correctly label it as a planned **Credit-consuming supporter contribution**.

### Target micro-influence scale (not yet implemented or approved)

The owner's explicit example is **50 supporters × 10 CR = 500 CR → +0.01 percentage points (pp) of win probability for that racer**. This establishes an initial *proposed linear conversion*, rather than the previous ambiguous “0.001%” unit:

```text
Nominal sponsorship bonus (percentage points)
  = min(aggregate eligible sponsorship CR × 0.00002, configured per-racer cap pp)
```

| Aggregate contribution | Nominal proposed bonus |
| ---: | ---: |
| 100 CR | +0.002 pp |
| 500 CR | **+0.010 pp** |
| 1,000 CR | +0.020 pp |
| 5,000 CR | +0.100 pp |
| 10,000 CR | +0.200 pp |
| 50,000 CR | +1.000 pp |
| 100,000 CR | +2.000 pp, **before hard cap** |

Thus reaching +1.0 **percentage point** requires **50,000 CR** at this conversion, not merely a few thousand. For example, a baseline 12.50% win probability would change nominally to 12.51% after 500 CR, a practically tiny difference. The owner's final `N%` ceiling is **not fixed**. Explore **+1 to +2 pp** as *candidate caps*, confirm with user/independent simulation before publication. These numbers are proposal scale, not an exact causal guarantee from an 8-racer physical simulation.

### Owner decision — race-level effect, season-level cumulative supporter total (2026-11-09)

**A sponsorship is assigned to one explicitly identified upcoming race and one racer.** The tiny official win-probability modifier is calculated **only from the eligible sponsorship CR collected for that racer in that specific race**, snapshot and locked before the immutable race outcome is generated. It resets to zero for the next race. No accumulated sponsorship from previous races or previous seasons is carried over into the next race's probability effect.

**The same valid sponsorship amount is separately summed into that racer's season support total for community presentation and cosmetic milestones, with NO second probability effect.** Show all three dimensions without double counting: `this race CR` (reset each race), `this season CR` (sum of that season's race contributions), and optional `all-time CR` (historical support / collectible cosmetics). A new season starts its visible season total at zero while keeping verified history/previously unlocked cosmetics according to a published policy.

Example:
- Race 1: 50 fans × 10 CR = **500 CR** donated to Racer A → proposed bonus **+0.01 percentage points** for **Race 1 only**.
- Race 2: fans contribute **1,200 CR** to the same Racer A → **+0.024 pp** for **Race 2 only**, **not +0.034 pp**.
- After Race 2: Racer A's **season cumulative support = 1,700 CR**; this is meaningful for sponsorship rankings and cosmetic-unlock progress, **not a cumulative win bonus**.

Every contribution creates **one** atomic Credit debit but can populate separate race/season read models; it must never create a second spend or a second gameplay effect. Lock / cancellation/refund policy must be explicit (e.g. donations after a race cutoff are not accepted into that race; do not silently reassign them). Race cancellation must preserve or reverse season-cumulative statistics consistently with the approved refund policy.

**Economy inflation protection:** enforce a hard **per-racer per-race** bonus cap (candidate +1–2 pp remains unapproved), and separate owner/transaction rate and amount ceilings. A rich user or large fan group cannot bypass the cap; no auto-stacking across races. Season cumulative and all-time cosmetic totals must never silently influence next-race odds.

**Potential measurable resolution issue:** at +0.01 pp, even 40,000 independent races imply only roughly four additional wins *in expectation* versus a 0-boost baseline; 40,000-race Monte Carlo cannot reliably confirm such a tiny empirical increase. Validate the implementation's exact parameter/cap in code and use much larger or common-random-number paired runs with uncertainty bounds to estimate official win-probability impact. Physical route/progress integrator may not deliver a linear increase in *actual* win rate from a linear weight; do not promise exact percentage gains without evidence.

### Fairness and market separation

- **Fundamental identity:** Sponsorship is **not betting**, has **no predicted result**, no winner/loser payouts, and users receive no financial/credit return merely because their racer wins. The contribution buys supporter participation and/or progress toward transparent, **cosmetic-only** milestones; disclose whether it is irreversible and when refund applies for cancellation.
- **Potential future prediction market remains separate.** Its credits, pool, deadline, payout and result integrity must be independently modeled. If prediction markets coexist, prohibit opportunistic sponsorship after a market freeze or seed commit that affects a scheduled outcome. Declare transparent snapshot and market interaction policy; no arbitrage or hidden advantage.
- Existing `docs/RACING_DESIGN.md` says that every driver's base attributes are identical and that bets/admin preferences cannot influence outcomes. Sponsor-linked changes require a **consciously approved versioned policy revision** and plain-language disclosure of a minuscule *sponsor modifier* distinct from base driver ability. Do not silently assert equal official win probabilities once donation-weighted effects exist.
- The eventual implementation may use a bounded rank-neutral, racer-specific stochastic event tweak **defined before generation**, not a post-hoc winner choice. No future-state peeking, result edits, rerolls, manipulated ranks or administrative allocation of outcomes.
- **No sponsorship-related boost is implemented or authorized in this document.** Start with cosmetic-only sponsorship if any probability/legality/market fairness issue remains unresolved.
- Real transactions must use the existing atomic/idempotent Credit Wallet/Ledger, with separate `racing_sponsorship` semantics, proper receipts, donation-window and cancellation/refund policy, abuse protections, amount and rate limits and secured original-debit linkage.
- Independent tests: probability cap/inflation boundaries, per-account and per-racer aggregation, 0-effect and max-effect parity, malicious concurrency, replay determinism, no outcome foreknowledge, grid/ID fairness, baseline results, thousands-to-millions of paired simulations as appropriate, economy conservation and the non-betting user experience. Confirm applicable law/store/consumer terms before allowing credits to buy a chance influence.

**Open decisions (future):** hard per-racer per-race cap (candidate +1–2 pp); precise pre-race eligibility cutoff; canceled-race sponsorship/refund and season-total handling; lifetime vs season cosmetic milestone persistence; coexisting prediction-market disclosure. **Per-race win modifier and separate season support accumulation are decided.**

## 2. Community-funded visual upgrades (no performance increase)

Accumulate sponsorship Credits into per-racer **season support totals and transparent public progress bars**, summing contributions from each race while **never applying season totals as another race win modifier**. At disclosed milestones unlock administrator-reviewed:
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
