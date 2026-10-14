# Phase 9C.1 — Account & HOLOCRON Credit Design

> Status: **Phase 9C.2-A foundation implemented; rewards, Google login/migration, Web Push, AI and Racing NOT IMPLEMENTED**
> Decision date: 2026-10-14
> This document defines the current product rules for Guest identity, login, HOLOCRON Credit, AI spending, Web Push reward, and the Credit interface needed by the planned Galactic Racing feature. The approved Phase 9C.2-A implementation adds the foundation described in section 11; other product behavior remains planned.

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

Phase 9C.1 was documentation only. Phase 9C.2-A now implements the internal foundation below; it introduces no user-facing reward or login flow.

Phase 9C.2 should implement Guest identity, Google login, the ledger, balance projection, migration, reward claims, and atomic spend/refund primitives before Phase 9D exposes paid AI generation.

Before implementation:
- fetch current canonical main,
- re-read AGENTS.md,
- use additive Drizzle migrations,
- define backup-version evolution,
- verify current OAuth/provider requirements,
- test idempotency and concurrent debit behavior against local D1 semantics.


## 11. Phase 9C.2-A implementation contract — 2026-10-14

Foundation implemented and locally tested; private deployment/migration acceptance remains pending. Next: **Phase 9C.2-B — Guest Credit Rewards**. No public route calls this foundation yet; new wallets start at **0 CR**, including during repeated creation. `/credits` remains the TMDB attribution page.

| Durable table | Responsibility |
| --- | --- |
| `users` | Random internal user ID and creation time; no email/name/profile |
| `auth_accounts` | Unique `(provider, provider_subject)` → internal user; no OAuth tokens |
| `credit_principals` | One Guest digest or one internal user, exclusive by CHECK; unique identity mapping, optional retirement |
| `credit_wallets` | Principal ID is the stable wallet ID; balance, sequence version and timestamps |
| `credit_ledger` | Immutable per-wallet sequence, operation/kind, unique idempotency key, requested/applied amounts, resulting balance, bounded reference and original-debit reference |

Migration: `0016_account_credit_foundation.sql`, with Drizzle-generated table/index/check definitions and metadata. Reviewed SQLite triggers supplement the generated SQL because Drizzle has no trigger DSL. They initialize wallets at zero, prevent principal identity/type substitution, validate ledger effects/refunds, update balances and prohibit ordinary history edits/deletes. No existing table or row is rewritten.

### Guest credential and identity API

`lib/identity/guest-crypto.ts` issues a 256-bit random identifier with version, issue/expiry timestamps and HMAC-SHA256 authenticity. The dedicated `__Host-holocron_guest` cookie is Secure, HttpOnly, SameSite=Lax, Path=/, with a 180-day lifetime. D1 stores only a domain-separated SHA-256 digest of the random identifier; it does not store the cookie, signature or raw identifier. Web Crypto verifies signatures. The dedicated `HOLOCRON_GUEST_SIGNING_SECRET` must have at least 32 bytes and has no fallback. Configuration is evaluated only when an identity operation is invoked.

`createGuest()` is an explicit internal mutation that issues a credential and creates a zero wallet. `resolveGuest()` is read-only and never creates a wallet, accepts a Beta/Quiz cookie, or replaces invalid credentials silently. Missing/invalid configuration, tampering, expiry, unknown identities and retired principals fail closed. Its result is an internal owner handle, never a browser-provided owner ID. Future public POST routes must establish same-origin protection and construct business inputs server-side. No test route is shipped.

`lib/identity/repository.ts` supports account creation with a zero wallet, idempotent wallet creation, generic provider lookup and exclusive provider attachment. Fixtures test the `google` provider name without contacting Google. Actual sign-in, token exchange and user session issuance remain Phase 9C.2-C.

### Atomic Credit operations

`lib/credit/service.ts` exposes internal `getBalance`, `credit`, `debit`, `refund` and zero-effect `claim` operations over one repository. Amounts are positive safe integers for credit/debit/refund; only explicit `claim` accepts zero. Kind/reference/idempotency metadata is bounded. The schema uses a bounded kind string rather than a closed DB kind enum, allowing future Racing kinds without a ledger redesign.

A prepared `INSERT … SELECT` computes the effect from the current authoritative wallet and principal. The insertion and its balance-update trigger are one SQL statement. The repository batches that statement with original-entry and wallet reads. D1's transaction boundary rolls back all effects on failure; there is no JavaScript read/calculate/write window. The unique `(wallet_id, idempotency_key)` constraint independently protects retries. An existing key with different operation/amount/references is rejected. An identical retry returns the original entry/effect and current balance, including after an ambiguous response failure.

Guest positive mutations, including refunds, are clamped to 10 from the stored principal type. A `requested +3 / applied +0` ledger entry still consumes its claim. Later spending cannot revive it. Accounts can exceed 10 and 100; only `Number.MAX_SAFE_INTEGER` overflow and nonnegative balance are storage limits. Insufficient debit creates no entry and no balance change. New entries are compensations; normal code never edits/deletes an old entry.

Refunds reference an earlier debit of the same wallet. Total requested compensation across different refund keys cannot exceed that debit's applied magnitude, so changing the refund key cannot over-refund. Guest cap may truncate compensation; its requested entitlement remains consumed. Future AI reservation/refund policy must account for intervening Guest earnings while maintaining the approved 10 CR invariant, rather than promise a balance above 10. No AI workflow is implemented here.

### B / C / 9D / 9R readiness

- B can use zero-effect claims for ineligible first responses and fully capped rewards. `prepareCreditMutation()` permits composing the same ledger insert inside a caller-owned D1 batch. B must gate Quiz reward eligibility on authoritative first-response insertion inside that boundary; a separate save-response then credit sequence is not sufficient. Attendance dates/streaks can be reconstructed from bounded weekly claim keys/references without a second ledger.
- C can reserve the account's fixed `guest_migration_v1` claim and the Guest's fixed migration-out claim in one batch, append a Guest debit and account credit, then retire the Guest principal. Guard both claims and exact source balance in that transaction; any failure must roll back both sides. An empty migration can consume a zero-effect claim. This is a design for C, not an implemented transfer API. Both new/existing accounts keep one stable wallet and historical Guest entries remain intact.
- 9D can use a request-key debit followed by a bounded compensating refund. Evidence eligibility, delivery/refund policy, network/global admission and provider calls are not part of A.
- 9R can use the same debit, positive credit and original-debit refund primitives. Stake limits, eligibility, markets and payouts are not implemented, and payout credit is not capped at 30 for accounts.

### Backup/privacy and validation

Backup v4 includes all five new durable tables plus the nine v3 datasets. It checks identity/reference relationships, sequence continuity, requested/applied cap behavior, compensation bounds and ledger/wallet equality. Historical v1/v2/v3 formats remain exact and supported. Old-artifact dry-run plans explicitly warn that full replacement would initialize Account/Credit state to zero; no restore executor exists.

Provider identifiers and Guest digests are pseudonymous account data and make backups sensitive. Restrict backups to the administrator and private storage. Secrets/raw credentials, OAuth sessions/state, raw IP and operational security state are excluded. Future account deletion must unlink provider identity and deliberately handle retained ledger/audit records; ordinary principal retirement is not a claim of complete personal-data erasure. Full erasure/restore requires a separately reviewed maintenance procedure compatible with append-only guards; no deletion UI is added here.

The foundation suite uses actual local Miniflare D1, including simultaneous duplicate credits, wallet creation, cap credits, distinct debits, refunds, rollback and ambiguous-success retries. Production concurrency and migration/backup acceptance must be reported separately; local success is not Production verification.
