# Phase A — free chat and AI pricing

Starting canonical: `325500b3abee1eabe0030b54635d02c0a6a2a2f8` / tree `12efb7a954fcd4c96e127288e92e8fc8e0925fca`, fresh-fetched before work. AGENTS.md read. Canonical/local implementation only; no Production operations, Provider calls, live Credits, migration execution or restore. Last reported Production remains v97/env66/OFF/MAINTENANCE/0020/v10; not a new observation.

## Contracts

| Path | New search | Generation | Failure |
| --- | --- | --- | --- |
| Account general chat | none | 0 CR, action `chat` | no debit or refund; actual cost reconciled or unknown reservation retained |
| Archive Q&A | 0 CR | active policy, target 1 CR | original debit refunded under existing full/partial/pending protection |
| Planner | 0 CR | active policy, target 7 CR | existing 7 CR refund/reconsent |

`qaCredits` is NOT silently changed. Migration 0019 still seeds its historical 5 CR policy. The UI quotes the server's current policy, and revision mismatch still rejects with PRICE_CHANGED. Local integration calls the real `savePolicy` API to append revision 2 with qaCredits=1/plannerCredits=7. Production needs its own separately approved policy revision before activation.

Free chat reuses the existing Account principal, HMAC, UUID, owner-token CAS, lease, daily/monthly cost reservation and settlement. A new explicit `chat` action has zero charge and NULL debit ID. It never invokes Credit mutation/refund, including a failed response or expired lease. It retains the same Q&A model/cost profile; no prompt/output contract changes. Paid paths still require a real debit.

Only successfully admitted free-chat requests count toward Account/KST-day maximum 5. Provider failure, invalid output, cancellation or lost response after admission consume a slot. Authentication/validation/budget/quota rejection before admission and replay of the same UUID do not consume another slot. All existing weighted hourly/daily/global/concurrency and cost caps additionally apply. A second device uses the same Account quota. Regeneration requires a new explicit free request confirmation, consumes one slot and has no payment consent. Unknown processing state stays blocked.

A free chat has no permanent ledger tombstone. Its content-free Admission record is therefore retained instead of deleted by operational cleanup, so an old UUID cannot silently call Provider again. **The unchanged 10,000-row Admission capacity is a hard fail-closed upper bound.** Retained free chats count toward it; when full, new Admissions stop. There is no automatic deletion/reset or infinite storage promise. Capacity and unknown reservations must be reviewed before launch; do not purge records to restore service without a separately reviewed replay-preserving procedure. Prompt/answer text is never persisted in Admissions.

Free searches keep authentication, frequency/global caps, the encrypted 10-minute result, Receipt and existing two-day operational recovery horizon. They write no ledger entry. Old encrypted paid search results return their original charged=1; original debit/tombstone is preserved. Old recovered results never silently trigger a new generation; explicit manual generation continues to validate the Receipt and current policy.

## Schema and backup

`0021_free_chat_admissions.sql` rebuilds only assistant_admissions. It copies all columns before reinstalling monthly reserve triggers, preventing historical costs being counted twice. Existing six triggers and five indexes are reinstated; FK and original paid CHECK constraints remain. Chat additionally requires account-v1, NULL debit ID, weight 1, positive cost reservation and no refund_pending state. Old migrations 0016–0020 are untouched. Apply as one normal D1 migration transaction only.

Backup v11 identifies 0021. Durable dataset count stays 16. v1–v10 migration markers and allowlists retain their historical meaning. Free operations, encrypted searches, authentication secrets and the consumed diagnostic marker remain excluded. Monthly actual/unknown costs and policy history remain included. Restore plans are still non-executable and require separate approval.

## Verification actually run

- Isolated Account UI hook → API client → HTTP → D1 → Mock Responses → settlement PASS: zero-balance chat, same-ID and double-click protection, explicit free regeneration, Q&A 0+1, Planner 0+7, missing evidence 0/no Provider, paid reconsent, invalid-output refund, unknown refund recovery, daily KST boundary, same Account/new session quota, concurrent final slot and monthly cap.
- 0020→0021 real Miniflare D1 PASS: forced migration rollback, all existing rows/trigger/index definitions preserved, FK check, invalid chat rows rejected, old paid-search encrypted recovery, old 5 CR pending debit refunded 5 after new 1 CR policy, free expired-lease failure/no refund, v11 ledger audit. Clean schema installation covered by Account/Admission tests.
- Packaged Worker PASS: no trusted CF metadata, real signed synthetic Account sessions, 0 CR search + 1/7 generation, zero-balance chat, replay, four content-free diagnostic events, administrator headers, full refund and wallet/ledger audit. All transports are intercepted Mock; no external Provider calls.
- Admission 265, Generation 1,628, Refund 586, Headroom 1,173, Credit policy 262, Credit foundation 103, Backup 942, Workspace 185, Provider 94, Retrieval 640, component SSR 35 assertions PASS. Historical paid fixtures intentionally continue testing 5/7 CR old policy.
- TypeScript, ESLint, production build and diff-check PASS; pre-existing unused-variable warning in test-assistant-refund-safety remains (zero lint errors).
- Chromium visual run **BLOCKED in this environment**: pinned Playwright browser download returned an invalid/truncated ZIP; no browser binary available. The 1440/360 fixture/check is supplied but no visual success/screenshots are claimed. React component rendering and actual handler/HTTP/D1 integration above were executed, not substituted with Production claims.

## Changed responsibilities

- admission-sql / admission / repository / limits: explicit free action, KST quota, no-debit settlement, retained UUID proof.
- account-search: free readiness commit, unchanged historical recovery.
- schema / 0021 / migration journal / backup format+validator: additive new contract, preserved old records.
- use-assistant-session / workspace: free-chat price/consent and zero-balance access; free search; server-policy paid quote. Copy/IME/layout/Provider untouched.
- existing integration tests and bounded new migration/browser checks: updated intended pricing assertions without dropping security or historical paid tests.

No live pricing/availability claims follow from these Mock results. Production state was not read or changed.
