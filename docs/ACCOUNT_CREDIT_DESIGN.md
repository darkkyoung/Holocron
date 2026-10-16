# Phase 9C.1 — Account & HOLOCRON Credit Design

2026-10-16 **9D-B.3 superseding policy/checkpoint:** storage capacity takes priority over refund completeness. Permitted partial refunds consume the full requested entitlement, record actual applied amounts, and forfeit the remainder permanently; ordinary rewards do not reserve wallet balance for AI. Account-only spending remains. Guest capped refunds already satisfy 0016; Assistant settlement now recognizes and reports them accurately, including zero-applied terminal entries. **Account partial refunds remain BLOCKED** because applied 0016 and historical v4/v5 audits require Account applied=requested. No trigger/schema/backup change was authorized or made. Ledger sequence slots remain protected separately. See [capacity-first reconciliation](devlog/2026-10-16-assistant-capacity-first-refunds.md). The older checkpoints below are historical and are superseded where conflicting; AI remains disabled, no Production deployment or 9D-C.

> 2026-10-16 9D-B.2 superseding checkpoint: Account AI refund balance/sequence capacity is now reserved in common mutation SQL. The Account product still has no product-level cap; this protects only the existing numeric limit. An otherwise valid credit that would take reserved capacity is rejected without consuming its idempotency/reward claim. Retrying remains subject to existing day/week/public-Quiz eligibility. No retrospective entitlement was approved or implemented, so **9D-B remains BLOCKED** on that policy decision. All prior Guest/reward/migration amounts and eligibility rules remain unchanged. [Numeric proof and exact limitation](devlog/2026-10-16-assistant-numeric-headroom.md).

> 2026-10-16 current checkpoint: 9C.2 private acceptance completed; the older implementation checkpoints below are historical. The approved 9D-B.1 initial-launch policy is **Account-only AI generation spending**. Guest earning/free retrieval and all migration/reward/ledger rules remain unchanged. Guest Q&A is deferred. Account numeric overflow can still block full AI compensation, so 9D-B remains **BLOCKED** and AI remains disabled. See [refund safety evidence](devlog/2026-10-16-assistant-refund-safety.md).

> Status: **Phase 9C.2-A/B/C implemented locally; hosted migration blocked (`incomplete input`, Site v77/v78). Secrets and pre-backup validation complete; real Google acceptance and post-migration v4 backup pending. Web Push, AI and Racing NOT IMPLEMENTED**
> Acceptance checkpoint: [hosted migration failure and resume gates](devlog/2026-10-15-private-account-acceptance.md)
> Decision date: 2026-10-14
> This document defines the current product rules for Guest identity, login, HOLOCRON Credit, AI spending, Web Push reward, and the Credit interface needed by the planned Galactic Racing feature. The foundation is described in section 11 and implemented Guest rewards in section 12; Google login/migration is implemented in section 13; Web Push, AI and Racing remain planned.

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

The implemented provider is Google OAuth with the minimum identity scope required for sign-in.

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

Initial launch requires login for all AI spending, including Q&A (approved 9D-B.1 policy). Guest Q&A remains a deferred long-term goal; its original 10 CR cap and compensation conflicts must be resolved before enabling Guest spending. This does not charge for retrieval or core News/Works/Quiz access.

A valid AI result followed by deliberate retry/regeneration is a new paid action.

## 5. AI debit and refund

AI spending must be concurrency-safe.

Preferred flow:

1. Validate the request and evidence.
2. Atomically reserve/debit required Credit.
3. Perform one bounded provider request.
4. Finalize only the matching request.
5. On qualifying technical failure, append an offsetting refund/compensation entry.

A refund of the original debit is requested when a valid result is not delivered because of technical failure, including:
- provider timeout/service failure,
- rejected malformed structured output,
- internal failure before valid delivery,
- evidence freshness conflict that discards the generated result.

Under the approved 9D-B.3 capacity-first policy, apply at most the wallet's currently available storage capacity. Record the original requested amount separately from the actual effect; a permitted partial (including zero-applied) refund is terminal, and the remainder is forfeited permanently. Do not retry that remainder after capacity becomes available. Full refunds still apply when capacity permits. No refund balance reservation or deferred reward entitlement is introduced. Account storage safety is MAX_SAFE_INTEGER, not a product cap; Guest cap remains 10. **Implementation limitation:** 0016 permits this clamp only for Guests. Account partial refunds need a separately authorized additive trigger migration and versioned backup audit contract; AI remains blocked until that gate is resolved. Sequence capacity is distinct: even a zero-applied terminal refund needs an append-only ledger entry.

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

Phase 9C.1 was documentation only. Phase 9C.2-A implements the internal foundation below. Phase 9C.2-B now connects Guest rewards and public balance/attendance UI; C now connects Google login and migration (section 13).

Phase 9C.2 should implement Guest identity, Google login, the ledger, balance projection, migration, reward claims, and atomic spend/refund primitives before Phase 9D exposes paid AI generation.

Before implementation:
- fetch current canonical main,
- re-read AGENTS.md,
- use additive Drizzle migrations,
- define backup-version evolution,
- verify current OAuth/provider requirements,
- test idempotency and concurrent debit behavior against local D1 semantics.


## 11. Phase 9C.2-A implementation contract — 2026-10-14

Foundation implemented and locally tested; private deployment/migration acceptance remains pending. B now calls this foundation through explicit public mutations (section 12); new wallets still start at **0 CR** before reward application, including during repeated creation. `/credits` remains the TMDB attribution page.

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

`createGuest()` is an explicit internal mutation that issues a credential and creates a zero wallet. `resolveGuest()` is read-only and never creates a wallet, accepts a Beta/Quiz cookie, or replaces invalid credentials silently. Missing/invalid configuration, tampering, expiry, unknown identities and retired principals fail closed. Its result is an internal owner handle, never a browser-provided owner ID. Public POST routes enforce same-origin protection and construct business inputs server-side. No test route is shipped.

`lib/identity/repository.ts` supports account creation with a zero wallet, idempotent wallet creation, generic provider lookup and exclusive provider attachment. Fixtures test the `google` provider name without contacting Google. C adds sign-in, token exchange and user sessions (section 13).

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


## 12. Phase 9C.2-B — Guest rewards implementation — 2026-10-14

Implementation/local validation complete; hosted acceptance and actual mobile/browser verification pending. Next: **Phase 9C.2-C — Google Login + Guest→Account Migration**.

- Explicit `POST /api/credit/visit`, after the public chrome mounts, resolves or creates the dedicated Guest. GET/render, admin, internal routes and jobs never award Credit. The request must be same-origin JSON `{}` (bounded to 1024 bytes); owner/amount/date/key/cap are not accepted.
- The zero wallet receives distinct `guest_first_visit_v1` +1, `opening_first_visit_v1` +1 and today's attendance +1 on its first eligible visit: **3 CR total**. No generic daily-visit reward exists. A reward-batch failure preserves the newly issued cookie so retry can reuse that zero wallet.
- KST uses `Asia/Seoul` and server time. Monday starts a new seven-day board. `attendance:<week>:<date>` uniquely consumes the day, including when applied amount is zero. Only seven indexed current-week keys are read. Missing a day breaks the streak; no retrospective claim endpoint exists. Days 1–6 give +1; the seventh consecutive day gives **+5 total** (11 requested per complete week). The Sunday +5 decision checks the preceding six claims inside the mutation batch.
- `prepareRewardMutation()` adds server-owned eligibility/amount selection to the **same** ledger INSERT/cap/trigger implementation. It does not introduce a second wallet or cap calculation. The API returns actual requested/applied effects and public attendance state, never internal owner IDs or raw identity.
- Quiz keeps its Beta/browser response identity. `lib/quiz/credit-response.ts` batches a prospective reward guarded by absence of a response and authoritative D1 option/publication state, response insertion, an invariant guard and result reads. A correct first response consumes +3; a wrong response consumes a zero-effect claim. The original response uniqueness and the per-Credit-owner Quiz key independently prevent repeat payment. The whole batch commits or rolls back. A defensive guard aborts if a new reward exists without its exact response. Existing historical responses never receive retroactive rewards.
- The public header adds an in-flow Guest balance/attendance disclosure with native keyboard interaction, Escape/return focus, visible focus, 44px actions and a seven-column flexible board. `/credits` stays TMDB attribution. Quiz displays actual applied Credit, cap truncation or no reward, while preserving answer/explanation/percentages/refresh restoration.
- Browser Web Locks serialize initial cookie issuance across tabs; same-tab calls share the pending promise. This is an initialization aid, not ledger authorization. Browsers without Web Locks report Credit unavailable instead of creating competing identities. With no Guest credential, independent direct HTTP clients cannot be recognized as one Guest; cookie reset remains the approved limitation. No fingerprint or credential in local/session storage was added.
- Credit failures display unavailable/retry state rather than a fabricated zero. Archive content and existing Quiz result reads remain usable. A new Quiz submission waits for valid Guest initialization and fails without storing a response if the atomic Credit operation fails; retry is safe.
- Schema and backup remain **0016 / v4**. Reward/zero-claim rows validate with the existing v4 contract; no 0017, new durable table, dependency, OAuth, migration, Web Push, AI or Racing implementation.

Validation: 220 real local D1 assertions for Guest rewards/routes/Quiz concurrency/rollback/KST/cap/security and reward-row v4 validation/dry plan; 23 React render/client-lock/responsive/accessibility contract assertions. All 39 `test:*` suites pass, including foundation 102, backup 825 and Quiz 63 assertions. Browser/mobile interaction and hosted concurrency are **NOT TESTED**.


## 13. Phase 9C.2-C — Google login and Guest migration (2026-10-15)

Implemented in canonical/local code; real Google login and private A+B+C deployment remain pending. No migration beyond **0016**, no new dependency, no AI/Web Push/Racing activation.

- Google Authorization Code / OIDC uses **openid only**, state, nonce, S256 PKCE, server code exchange and RS256 signature verification against Google's fixed JWKS endpoint. Issuer, exact audience/optional authorized party, expiry, issue time and nonce are validated before the subject reaches the repository. Email/profile/YouTube scopes, offline access, userinfo and token persistence are absent. Provider subjects support Google's documented maximum 255 ASCII characters; the existing v4 validator accepts that bound without changing fields/version/marker.
- `ensureGoogleAccount()` uses conditional inserts and the unique provider mapping in one D1 batch. Repeated/concurrent subjects resolve one internal random user, principal and zero-initialized wallet. Only `google`, `provider_subject` and the internal link are persisted.
- Dedicated `__Host-holocron_account`: domain-separated HMAC, internal uid/version/iat/exp, 30 days, Secure/HttpOnly/Lax/Path=/. D1 user, active Account principal and wallet are reloaded on every sensitive request. Invalid Account credentials fail closed; admin and Guest cookies never authenticate an Account. There is no per-session server revocation table: logout clears the current browser cookie, expiry bounds other sessions, and rotating the dedicated secret invalidates all Account sessions.
- OAuth state/nonce/verifier/allowlisted return path occupy a signed ten-minute HttpOnly cookie. The callback clears it on success/error. The authorization code is single-use at Google; the application does not retry token exchange or retain any provider token. A separately signed ten-minute receipt carries only bounded migration/reward UX amounts, then the visit route clears it. These cookies never enter D1 or backup.
- Account **`guest_migration_v1`** is both the one-time claim and its incoming credit (or zero-effect claim). Guest **`guest_migration_out_v1`** is its matching debit (or zero-effect claim). The amount comes from the current D1 Guest wallet inside the batch, never an earlier JavaScript read. Account credit, Guest debit, zero-balance retirement, invariant check and **`account_first_login_v1` +3** share one transaction. A no-op/ignored step or overflow aborts the batch. Losing-device Guests remain active with their full balance and cookie. No-Guest and zero-Guest first logins also consume the Account opportunity.
- The incoming migration reference points to the retired Guest principal. Shared reward eligibility consults the Account plus that one Guest, without copying ledger history. Their current-week date-key union preserves KST attendance/streak and prevents same-day duplicates; consumed Quiz keys cannot be re-earned after migration. Account attendance and first-response Quiz use the existing pipeline without the Guest cap. Guest first/opening bonuses are not reissued to Accounts.
- The existing Credit disclosure shows Account balance, Google login/logout and signed migration feedback. Logout is strict same-origin POST and clears Account/receipt cookies only; it does not change balances or retire the losing Guest. A future explicit visit can initialize a new Guest if no active Guest cookie remains.

Official protocol sources and deployment setup are recorded in [the implementation devlog](devlog/2026-10-15-google-login-account-migration.md) and [DEPLOYMENT.md](DEPLOYMENT.md). Next: **Phase 9D — Grounded AI Assistant Implementation**.
