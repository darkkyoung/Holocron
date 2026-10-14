# 2026-10-14 — Account / Guest / Credit Foundation

> Phase 9C.2-A: implementation and local validation complete; private deployment/migration pending.
> Starting canonical: `1ebbf47f5fe5162c8f1b216d9a15079c4d87a6ea`.
> Planning history: [Credit Economy and Galactic Racing](2026-10-14-credit-and-galactic-racing.md). That planning record is preserved unchanged.

## Problem → decision

Phase 9C.2-B could not start because canonical contained only the Account/Credit design. A mutable balance alone could neither explain changes nor prevent duplicate rewards and concurrent overspending. Reusing the existing unsigned Beta/Quiz cookie would also conflate participation identity with long-lived Credit ownership.

A therefore adds only foundation: a separate cryptographic Guest credential, minimal internal users/provider links, one principal/wallet abstraction and an immutable ledger. Public rewards, Google OAuth, Guest migration, AI, notifications and Racing remain unimplemented. The existing `/credits` route is still attribution, not a wallet.

## Identity and data model

Five additive tables: `users`, `auth_accounts`, `credit_principals`, `credit_wallets`, `credit_ledger`. Internal user IDs are random and independent of provider subjects. Provider `(provider, subject)` is unique. Each Guest digest/account maps uniquely to one principal and stable wallet. The principal can later be retired without rewriting history.

Guest credentials contain a 256-bit random identifier and bounded timestamps authenticated with HMAC-SHA256. `__Host-holocron_guest` is HttpOnly/Secure/SameSite=Lax. Only a domain-separated digest reaches D1. A dedicated `HOLOCRON_GUEST_SIGNING_SECRET` has no fallback and is documented by name only. No live secret was provisioned. Missing configuration fails closed when a Guest operation is invoked; existing pages do not invoke it.

Creation starts at 0 CR, while resolution is read-only. Account/provider repository fixtures use fake subjects and never call Google. There is no public creation, mutation, balance or test endpoint.

## D1 atomicity and races

The repository uses parameterized `INSERT … SELECT` to calculate the mutation against current wallet/principal state. A reviewed SQLite trigger validates the effect and updates the wallet within the same statement. A D1 batch includes mutation and result reads. Unique wallet/key and wallet/sequence constraints protect idempotency and audit ordering. A mismatched replay is rejected; a matching replay returns the original effect and current balance. Raw D1 failures become bounded domain errors.

The Drizzle-generated `0016_account_credit_foundation.sql` and snapshot/journal introduce no destructive schema operation. Explicit trigger SQL supplements the generated table definitions because the schema DSL does not describe triggers. Normal ledger updates/deletes and unbacked wallet writes are blocked. Refunds append compensations referencing an earlier same-wallet debit; total requested refund entitlement is bounded even across different keys.

Guest credit uses the stored principal type and never exceeds 10. Requested and applied amounts are separate: even +0 at cap consumes the key. Account balances can exceed 100, with safe-integer overflow protection only. Insufficient debit changes neither balance nor history.

Official D1 semantics consulted on 2026-10-14:
- [D1 batch transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/): failure rolls back the batch.
- [D1 SQL statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/): supported SQLite/trigger environment.

The tests execute the actual migration and repository in local Miniflare D1, not a JavaScript wallet mock. Concurrent calls cover same-key credit, wallet creation, distinct credits at cap, distinct debits and competing refunds. A valid mutation followed by a deliberately failing SQL statement rolls back the ledger and wallet. A simulated lost response after actual commit is recovered by the same idempotency key without double credit.

## Backup v4

V4 keeps the nine v3 datasets and adds all five durable tables. The validator checks relationships, nullable unique identities, per-wallet sequence continuity, cap/refund effects and final ledger/balance agreement. Privacy-sensitive provider subjects and Guest digests stay within authenticated private backups. Raw Guest credentials, signatures, secrets, IPs and operational state are not exported.

Exact v1/v2/v3 formats and markers remain supported. Historical dry-run plans warn that restoring an older full snapshot would start Account/Credit datasets empty and remove target Credit history. Append-only triggers mean any future real restore needs a separately reviewed maintenance procedure and replay from zero wallets; no executor or guard-disabling endpoint exists.

## Validation

- All **37 `test:*` scripts PASS**.
- Credit foundation: **102 assertions**, actual local Miniflare D1.
- Backup: **825 assertions**, including v1/v2/v3/v4 validation/plans, read-only export and route integration.
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`: PASS.
- Existing Quiz, News/Stories, Works/Featured Work, auth/rate limit, scheduler, source settings, collection/recovery, feedback, Analytics, Site Copy, Roadmap and public navigation regressions pass.
- No new dependency, OAuth/provider request, public reward route, UI change or rewrite of planning history.

## Hosted acceptance boundary

The existing Site was inspected as owner-only/private, version 76. Read-only database overview showed existing archive/Quiz/Beta tables and no Credit tables. The source helper opened its existing internal history without changing origin. No source mirror was pushed and no deployment or D1 mutation was performed.

Deployment instructions require a current pre-migration backup through the authenticated administrator flow. The available environment tool redacts the administrator password/session secret, so this run could not authenticate that download. It did not generate/bypass admin credentials, assemble a misleading paginated backup, use ad-hoc SQL, or substitute the previously closed historical v1 artifact. Live migration state and a current validated pre-migration backup must be obtained before deployment.

**NOT TESTED:** private deployment, hosted migration/concurrency, pre/post-migration live backup validation, browser/private page/auth smoke checks and physical-device behavior. No fake live account/wallet/reward data was created. Zero new rows remain the expected outcome when foundation-only deployment is eventually completed.

## Next phases

**Next: Phase 9C.2-B — Guest Credit Rewards.** Use the existing primitives and zero-effect claims; gate Quiz first-response eligibility and Credit claim in one atomic boundary. Add KST attendance policy and the small responsive balance/attendance interface without redefining Beta identity.

9C.2-C adds Google login/user sessions and one-time Guest→Account migration. Its transaction must guard both owner claims, debit/credit together and retire the Guest. 9D adds AI admission and technical-failure refund behavior, including Guest cap interaction. 9R adds market rules and simulation independently. No behavior from these phases was pulled into A.
