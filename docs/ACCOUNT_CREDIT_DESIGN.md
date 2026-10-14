# Phase 9C.1 — Account & HOLOCRON Credit Design

> Status: **DESIGN ONLY / NOT IMPLEMENTED**
> Decision date: 2026-10-14
> This document defines the current product rules for Guest identity, login, HOLOCRON Credit, AI spending, Web Push reward, and the Credit interface needed by the planned Galactic Racing feature. It authorizes no migration, OAuth setup, deployment, or public exposure.

## 1. Product intent

HOLOCRON Credit is a **non-cash, non-transferable internal utility point**.

It exists to:
- bound expensive AI usage,
- reward lightweight recurring participation,
- provide a durable internal economy for future fan-participation features.

Credit is not money.

- No cash purchase at launch.
- No cash-out.
- No transfer/trading between users.
- No external prize redemption.
- No conversion to a financial instrument.
- Core archive reading remains free.

Do not reward raw time-on-site, scrolling, mouse movement, or unlimited article clicks.

## 2. Identity model

### Guest

A Guest is an opaque browser-bound identity.

- Random secure Guest identifier.
- Server-trusted balance/reward state.
- Cookie deletion, another browser, or another device can create a new Guest.
- Perfectly preventing cookie resets is not a product goal.
- Do not add invasive fingerprinting merely to stop small-scale Guest farming.

Guest balance cap: **10 CR**.

### Logged-in account

The first planned provider is Google OAuth with the minimum identity scope required for sign-in.

- Google login is identity only.
- Do not request YouTube scopes merely because users arrive from YouTube.
- YouTube subscribe/like/view actions are not Credit rewards.
- Internal user ID must not be the Google provider ID.
- Login preserves eligible Credit/account state across browsers/devices.

Logged-in account balance cap: **no product-level maximum**.

### Guest → account migration

Guest balance may be merged into an account **once per account**.

- Migration must be idempotent.
- A later Guest identity cannot repeatedly import new balance into the same account.
- The ledger records the one-time migration claim.

## 3. Credit earning rules

There is **no separate generic daily activity-credit ceiling**. Each reward has its own server-side claim limit.

| Activity | Credit | Claim rule |
| --- | ---: | --- |
| Guest first visit | **+1** | Once per Guest identity |
| Account first login | **+3** | Once per account |
| Opening / first-visit commemorative bonus | **+1** | One-time; not a recurring daily-login reward |
| Weekly attendance Day 1–6 | **+1/day** | At most once per KST day |
| Weekly attendance Day 7 | **+5** | Seventh consecutive daily check-in of the weekly board |
| Daily Quiz — first submitted answer correct | **+3** | First submission only |
| Daily Quiz — first submitted answer wrong | **0** | Later retries never create the reward |
| Web Push — first successful enable | **+1** | Logged-in account only; once per account |

The weekly attendance board is intentionally game-like: six +1 steps followed by a +5 seventh-day reward.

Quiz Credit does not change the current Quiz result behavior. The reward layer separately checks the first submitted answer and an idempotent reward key.

Small Guest-cookie farming does not justify invasive fingerprinting. Expensive AI still uses network/global safety controls.

## 4. Credit spending rules

| Action | Credit |
| --- | ---: |
| Grounded Archive Q&A | **-5** |
| Script Planner / composition / outline | **-7** |
| Full script draft | **-15** |
| Revision of an existing generated result | **-3** |
| Web Push configuration | **0** |
| Galactic Racing daily-winner prediction | User-selected stake, **1–30 CR** |
| Galactic Racing season-champion prediction | User-selected stake, **1–30 CR** |

High-cost script functionality should require login. Guest Q&A remains possible while the 10 CR cap naturally bounds accumulation.

A valid AI result followed by deliberate retry/regeneration is a new paid action.

## 5. AI debit and refund

AI spending must be concurrency-safe.

Preferred flow:

1. Validate the request and evidence.
2. Atomically reserve/debit required Credit.
3. Perform one bounded provider request.
4. Finalize only the matching request.
5. On qualifying technical failure, append an offsetting refund/compensation entry.

Full refund applies when a valid result is not delivered because of technical failure, including:
- provider timeout/service failure,
- rejected malformed structured output,
- internal failure before valid delivery,
- evidence freshness conflict that discards the generated result.

No refund applies merely because a valid result was delivered and the user wants a different answer/style.

Credit is not the only abuse control. Network limits, concurrency limits, and a hard application/provider spend ceiling remain mandatory.

## 6. Web Push

Web Push is planned as an account feature.

- Enabling it costs 0 CR.
- First successful account-level enable grants +1 CR.
- Disable → enable cycles do not grant more Credit.
- Disabling later does not claw back the earned +1.
- Notification consent remains separate from login and Credit.

A future Notification Pass was discussed but is **not part of the approved pricing table**.

## 7. Ledger principles

Do not implement Credit as only a mutable balance.

Use an append-only or equivalently auditable ledger with idempotent entries. Conceptual fields:

- ledger entry id,
- subject type (guest/account),
- subject id,
- amount,
- reason/kind,
- reward or request key,
- related Quiz/AI request/race/market when applicable,
- created timestamp.

Representative unique keys:

- guest_first_visit_v1
- account_first_login_v1
- opening_first_visit_v1
- attendance:<week>:<day>
- quiz_correct:<quiz-id>
- web_push_first_enable_v1
- guest_migration_v1:<account-id>
- AI request idempotency key
- Race stake/payout idempotency key

Balance may be derived from the ledger or maintained transactionally as a cache, but the ledger remains the auditable explanation of every balance change.

## 8. Racing integration requirements

Account Credit must support Galactic Racing without redesign.

Required transaction types:
- stake debit,
- rejected/voided stake refund,
- winning payout,
- season-market payout,
- race cancellation refund,
- explicit administrative correction.

Racing is account-only. One user selects only one racer per market.

The payout model is pari-mutuel/pool-based: crowd stake distribution creates favorites and underdogs. Exact pool retention/Credit-sink percentage is a Racing tuning parameter, not fixed here.

## 9. Privacy, security, and backup boundary

Durable account/Credit state:
- internal user record,
- provider linkage identifier needed for login,
- Credit ledger,
- derived/current balance,
- one-time migration/reward claims,
- durable notification preferences when implemented.

Operational/security-only state:
- OAuth state/nonce,
- sessions,
- rate-limit windows,
- HMAC network hashes,
- temporary provider admissions/reservations after retention,
- locks/leases.

No raw IP belongs in the Credit ledger.

When implementation adds durable account/Credit tables, backup contracts must deliberately evolve. Operational/security rows, secrets, and transient locks remain excluded.

## 10. Implementation boundary

Phase 9C.1 is documentation only.

Phase 9C.2 should implement Guest identity, Google login, the ledger, balance projection, migration, reward claims, and atomic spend/refund primitives before Phase 9D exposes paid AI generation.

Before implementation:
- fetch current canonical main,
- re-read AGENTS.md,
- use additive Drizzle migrations,
- define backup-version evolution,
- verify current OAuth/provider requirements,
- test idempotency and concurrent debit behavior against local D1 semantics.
