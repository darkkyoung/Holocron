# 2026-10-14 — Guest Credit Rewards

> Phase 9C.2-B implementation/local validation complete. Private deployment and actual browser/mobile acceptance pending.
> Starting canonical: `9aa9203391299c93665274f85ff3e7da885c9499`.
> Prior records: [Credit/Racing planning](2026-10-14-credit-and-galactic-racing.md), [Account/Credit foundation](2026-10-14-account-credit-foundation.md). Neither historical entry was rewritten.

## Problem → design

A supplied trustworthy identity and an atomic ledger, but no visitor earned or saw Credit. B wires only the approved Guest rewards into that foundation. Page GET/render remains read-only for Credit: an explicit same-origin, bounded JSON POST initializes the Guest and awards eligible visit claims after public UI mount. Admin/API/internal paths and scheduler/collection never initialize rewards.

No new table or migration was necessary. Current-week attendance can be read from seven indexed wallet/key lookups. Quiz required a batch boundary that includes both its existing response uniqueness and Credit claim, rather than committing a response before attempting a reward.

## Implementation

- Existing signed `__Host-holocron_guest` stays separate from Beta/Quiz identity. The visit POST also establishes the existing Beta cookie, without redefining its meaning. Web Locks serialize initial browser cookie issuance across tabs; D1 unique constraints enforce reward idempotency. No fingerprint, localStorage credential or client owner input.
- First visit +1 and opening +1 are once-per-Guest, distinct immutable keys. Today's attendance is separate, yielding 3 CR from the new zero wallet. There is no recurring generic daily-visit reward.
- `Asia/Seoul`, server clock: Monday starts the board; missing a day breaks the streak. Day 1–6 +1, Day 7 +5 total. A complete week's requested attendance is 11 CR. The Sunday completion amount checks all preceding six daily claims inside the same batch. Cap truncation does not erase attendance/claim consumption. No backfill path.
- `prepareRewardMutation` composes trusted eligibility SELECTs into the existing shared ledger INSERT/trigger/cap engine. It adds no alternative balance implementation.
- Quiz uses a prospective claim gated by absence of the authoritative Beta response and D1 public Quiz/choice state, then inserts that response and reads results, all in one D1 batch. The guard aborts if a fresh reward lacks its exact response, even if response insertion is unexpectedly ignored. Correct consumes +3; wrong consumes a zero-effect claim. Duplicate/conflicting submissions use the winning stored choice. Historical responses do not earn retroactively. Replacing either cookie independently cannot replay the same existing response/owner entitlement.
- Requested and applied amounts are distinct. A Guest at 9 receives only +1 of a +3 Quiz entitlement; at 10 the claim consumes +0. Later spending does not reopen it.
- One shared public header disclosure shows balance/cap, weekly days, current streak and compact reward feedback in normal document flow. Native details/summary supplies keyboard access; Escape returns focus; actions are at least 44px. Flexible seven-column CSS accommodates narrow widths without touching navigation/floating controls. Quiz retains answer/explanation/percentages/restore, adding actual reward feedback. `/credits` is still TMDB attribution.
- Error states do not invent a zero balance. A failed new reward batch retains the issued Guest cookie for retry. Failed Quiz/Credit mutation stores neither side. Result reads and archive content remain available; new submissions require the atomic reward boundary to succeed.

## Concurrency and validation

- **220 assertions** in `test:guest-rewards`: real local Miniflare D1 migrations/repositories and actual HTTP handlers (infrastructure binding injected), duplicate/concurrent visit and Quiz calls, conflicting choices, first-wrong retry, KST midnight/week/missed-day behavior, cap consumption, historical exclusion, secret/identity/error handling and real reward-row v4 validation/dry plan.
- Trigger-injected failures at ledger/response insertion, a deliberately ignored response, a later batch failure and a lost-success response exercise rollback/idempotent recovery against D1, not a wallet mock.
- **23 UI assertions**: React static render, controlled loading/error/resolved states, two module instances simulating tabs with a shared lock, and responsive/accessibility code contracts. This is not browser interaction verification.
- **39/39 test:* suites PASS**, including foundation 102, backup 825 and existing Quiz 63 assertions; collection, scheduler, grouping, News/Works, admin auth/rate limit, public navigation, analytics and other existing regressions pass.
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`: PASS.
- No new dependency/schema/migration/secret name. Backup remains v4 / `0016_account_credit_foundation.sql`; v1/v2/v3 compatibility remains covered. No restore.

## Hosted boundary / limitations

Existing Site rechecked: owner-only/private, version 76. A is still undeployed. No fresh pre-migration administrator backup was supplied, so B's instructions require deployment to remain pending. No Sites mirror, hosted migration, secret provisioning or live data mutation was performed. Before A+B deployment, obtain/validate the current admin backup, confirm hosted migration state, configure the existing Guest-signing secret, follow the normal content mirror/deployment path, then validate a fresh v4 backup.

**NOT TESTED:** actual desktop/375px/390px browser layout and keyboard/touch behavior, physical first/multiple-tab browser visits, hosted migration/concurrency/auth/page smoke checks, pre/post live backups. Managed Sites browser tooling was unavailable; no alternate browser installation/preview was used. Web Locks support is required for safe client initialization; unsupported browsers show Credit unavailable. Uncredentialed independent HTTP requests are separate Guest identities; cookie reset remains an accepted product limitation.

No Google OAuth/login, Guest→Account transfer, Web Push, AI/provider calls or Racing was implemented. **Next: Phase 9C.2-C — Google Login + Guest→Account Migration**. It must reuse this ledger and guard migration once per account as already specified; multiple device Guests cannot each import their balances into one account.
