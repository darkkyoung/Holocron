# 2026-10-15 — Google Login and Guest→Account Migration

> Phase 9C.2-C: local/canonical implementation acceptance complete. Private deployment, hosted migration and real Google/browser acceptance pending.
> Starting canonical: `ec9e1b0602bf772b92e2d43018ba435200f3ba6b` (`Implement Guest Credit rewards`).

## Problem → design

A/B already supply the separate signed Guest identity, five durable Account/Credit tables, append-only ledger, atomic mutations and Guest rewards. C reuses those structures. Beta/Quiz participation remains independent from Credit ownership, and neither public identity can authenticate the administrator.

An Account may import one Guest only. Reading “migration unused” in JavaScript and then writing a transfer would let phone and PC import both balances. The transaction must choose one winner at the database's unique Account claim; a losing Guest must remain spendable after logout. Existing attendance/Quiz claims must also follow the winner without copying or rewriting history.

## Official protocol review

Checked current first-party documentation on 2026-10-15:

- [Google OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect): server authorization code flow, state, nonce, exact redirect, ID-token signature/issuer/audience/expiry, stable subject instead of email.
- [Google OIDC API reference](https://developers.google.com/identity/openid-connect/reference): endpoints, minimal openid scope and error handling.
- [Live discovery](https://accounts.google.com/.well-known/openid-configuration): authorization `https://accounts.google.com/o/oauth2/v2/auth`, token `https://oauth2.googleapis.com/token`, JWKS `https://www.googleapis.com/oauth2/v3/certs`, RS256 and S256 support.
- [Google PKCE documentation](https://developers.google.com/identity/protocols/oauth2/native-app): 43–128-character verifier, base64url SHA-256 S256 challenge. The live OIDC discovery independently advertises support.
- [Web-server OAuth guidance](https://developers.google.com/identity/protocols/oauth2/web-server): confidential server code exchange and exact registered redirect URI.

The registered callback must be **`https://holocron.kr/api/auth/google/callback`**, matching the existing Site's confirmed custom domain. Requests from another origin fail closed. Real Google console configuration and browser flow were not available/verified.

## Implementation

`lib/identity/google` owns start/validation/exchange and orchestration; routes only call the service and return bounded redirects. Every start generates independent 256-bit state, nonce and verifier. S256 binds the authorization request to the server exchange. A signed ten-minute HttpOnly cookie protects those temporary values and an exact public return-path allowlist. State/duplicate parameters/callback origin/optional response issuer are checked before exchange. Google supplies the one-time authorization-code replay boundary; no automatic exchange retry or token cache exists.

Only `openid` is requested, with online access. There is no email/profile/YouTube scope, userinfo request or refresh-token request. Bounded HTTPS responses disallow redirects, have a ten-second timeout and 64 KiB maximum. ID-token verification imports the matching RSA public JWK from the fixed Google endpoint and verifies RS256 before trusting claims. It checks issuer, audience, optional azp, issue/expiry time, nonce and bounded subject. Tokens, codes, provider responses and cookies are never logged or persisted by application code. The maximum Google subject length is 255; the provider input and v4 field validator now agree with that documented bound.

The identity repository conditionally creates one random internal user, unique Google linkage, Account principal and zero wallet in one D1 batch. Repeated or concurrent first logins converge on that same mapping. Provider data persisted: `google`, `provider_subject`, internal `user_id` and creation time only.

`__Host-holocron_account` contains only internal uid/version/iat/exp authenticated by a dedicated domain-separated HMAC key, with 30-day Secure/HttpOnly/Lax/Path=/ attributes. Account resolution reloads user/principal/wallet from D1. Invalid Account cookies cannot fall back to Guest. The same owner resolver serves visit and Quiz. Logout is same-origin POST; it clears browser Account/receipt cookies without modifying any wallet or the remaining Guest cookie. Stateless sessions have no individual server revocation; expiry and secret rotation are the documented boundaries.

## Migration and concurrency

`prepareMigrationMutation()` composes server-owned amount SELECTs through the existing Credit insert/cap/trigger engine. It does not create another ledger.

One login batch:

1. Insert Account `guest_migration_v1` with the current active Guest balance from SQL (or zero if no Guest). The unique wallet/key chooses the winner.
2. Only that batch's newly inserted Account entry can authorize Guest `guest_migration_out_v1`, with the exact negative incoming amount.
3. Retire only the Guest with that new outgoing entry and zero wallet.
4. Insert `account_first_login_v1` +3, idempotently.
5. Check the paired effects/retirement and mandatory claims inside the transaction. A missing/ignored conditional effect or overflow invokes an SQL error and rolls everything back.
6. Read the final balances and safe result in the same batch.

Zero-balance migration consumes the opportunity and retires the eligible Guest. No-Guest login consumes a zero-effect Account claim. Retry after a lost response returns the existing result. Concurrent Guest activity either precedes the batch and is included in the exact amount, or encounters the retired Guest and cannot mutate it. Two Accounts cannot drain the same Guest twice.

**Mandatory phone/PC test:** two real local Guest wallets at 5, two independently validated RSA-signed OAuth flows for one subject, concurrent callbacks. Exactly one Account at **8 CR**, one incoming claim, one +3 claim; winner Guest **0/retired**, loser **5/active**. Both issued sessions resolve the same Account. Loser receives `already_migrated` and safe remaining balance 5; its cookie is preserved, and later retries cannot import it into that Account.

## Reward continuity and UI

The Account migration entry references the winning Guest principal. Shared indexed reward SQL consults the Account and that one retired Guest; old ledger entries stay unchanged. Current-week date keys are unioned/deduplicated, retaining streak progress and preventing a second same-day payment. Migrated correct/wrong Quiz claims remain consumed even with a new Beta browser identity. Existing response uniqueness, correct-answer authority, explanation/percentages and atomic response/reward rollback remain intact. Account rewards have no product cap; Guest behavior remains 10 CR and one-time first/opening bonuses.

The existing disclosure shows Guest or Account balance, attendance, Google login/logout and bounded migration receipts (+3 first login, transferred amount, or losing Guest balance). Migration feedback appears outside the collapsed disclosure. No email/name/internal IDs are returned. Native details/summary and Escape focus behavior remain, with flexible narrow layout and 44px action targets. React/static/client contract tests are not actual browser/mobile QA.

## Validation

- **40/40 `test:*` scripts PASS**.
- New `test:google-account`: **252 assertions**; real Miniflare D1, real Web Crypto RSA signatures with synthetic keys, protocol/error/session cases, Account creation, mandatory two-device race, zero/no-Guest/uncapped migration, concurrent Guest changes, two-account competition, rollback on failed/ignored steps, overflow and lost-response recovery, reward owner/claim continuity, HTTP handlers and actual migrated-row backup validation/dry plan.
- Existing foundation **102**, Guest rewards **220**, extended Credit UI **31**, backup **825**, Quiz **63** assertions pass. All existing collection/scheduler/admin auth/rate limit/News/Stories/Works/Featured Work/feedback/Beta/navigation/copy/roadmap regressions pass.
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`: **PASS**. Manual final diff review completed. Client build contains no Account secret/provider-secret configuration or signing implementation.
- No schema/migration/dependency change. Backup stays **v4 / 0016**; exact v1/v2/v3 readers remain tested. OAuth/security columns are rejected by the exact v4 contract. No real historical artifact was revalidated or restored.
- No Web Push, AI provider, Racing, account deletion or new analytics work.

## Hosted boundary / NOT TESTED

Existing Site was rechecked: version **76**, owner-only/custom access with only the owner, `https://holocron.kr`. A/B remain undeployed. No fresh authenticated administrator pre-migration backup was supplied, so the explicitly required backup gate blocks A+B+C deployment, not local implementation. No Sites mirror commit/version, live migration, credential provisioning or hosted D1 mutation was made. No new Site, access reopening or origin/history change.

**NOT TESTED:** real Google consent/code exchange/login, Google console redirect configuration, private gateway callback preservation, hosted secrets/log policy, hosted migration/concurrency/balances/rewards/auth smoke tests, current pre/post-migration live backups, actual desktop/375px/390px rendering/touch/keyboard/multiple-tab browser behavior. The Sites skill requires skipping managed browser QA when control-browser is unavailable; no alternate browser/server was installed or improvised. Local RSA/D1/React tests do not replace these checks.

## Next

**Phase 9D — Grounded AI Assistant Implementation.** The shared owner resolver and single Credit ledger are ready for a separately authorized grounded AI implementation; no provider integration is activated here. Web Push and Racing remain planned independent work.

## Changed files

- `.env.example`
- `README.md`
- `app/api/auth/google/callback/route.ts`
- `app/api/auth/google/start/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/credit/visit/route.ts`
- `app/api/quiz/route.ts`
- `components/credit/client.ts`
- `components/credit/guest-credit-status.css`
- `components/credit/guest-credit-status.tsx`
- `docs/ACCOUNT_CREDIT_DESIGN.md`
- `docs/BACKUP_RESTORE.md`
- `docs/DEPLOYMENT.md`
- `docs/DEVLOG.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ROADMAP.md`
- `docs/devlog/2026-10-15-google-login-account-migration.md`
- `lib/backup/credit-validation.ts`
- `lib/credit/account-login.ts`
- `lib/credit/repository.ts`
- `lib/credit/rewards/http.ts`
- `lib/credit/rewards/policy.ts`
- `lib/credit/rewards/provenance.ts`
- `lib/credit/rewards/repository.ts`
- `lib/credit/rewards/service.ts`
- `lib/identity/account-session.ts`
- `lib/identity/config.ts`
- `lib/identity/current-owner.ts`
- `lib/identity/google/flow.ts`
- `lib/identity/google/http.ts`
- `lib/identity/google/protocol.ts`
- `lib/identity/google/service.ts`
- `lib/identity/login-notice.ts`
- `lib/identity/repository.ts`
- `lib/identity/signed-cookie.ts`
- `lib/quiz/credit-response.ts`
- `package.json`
- `scripts/test-google-account.mjs`
- `scripts/test-guest-credit-ui.mjs`
