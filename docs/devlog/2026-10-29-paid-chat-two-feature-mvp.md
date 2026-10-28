# Phase A.1 — paid chat and two-feature MVP (2026-10-29 KST)

Starting canonical main was fresh-fetched: `4a45fac9558e886948e88c86ab2bd3073366253d`, tree `92dbc7e22a387e687c77fa7aa80aee4ac6e31bb2`. AGENTS.md read. This is canonical/local implementation only. Production was not inspected or modified. Last user report remains v97 / environment66 / AI OFF / MAINTENANCE / migration0020 / backupv10, not a new verification.

## Result and scope

| Public feature | Search | Generation | Regeneration |
| --- | --- | --- | --- |
| General AI chat | no search | shared `qaCredits`, launch target1 CR | separate explicit same-price consent |
| News Q&A | 0 CR | shared `qaCredits`, launch target1 CR | separate explicit same-price consent |
| Video planner | public retrieve API blocked | public generate API blocked before DB/debit/Provider | unavailable |

The user sees two tabs: 일반 AI 채팅 / 뉴스 Q&A. General chat is explicitly labeled as general knowledge, not verified latest news. Both quotes use the actual server policy; no client-only 1 CR price is invented. The administrator editor explains that changing qaCredits changes both modes together. Planner's 7 CR policy and internal service/schema/prompt/validation/rendering tests are preserved. Full Draft remains blocked. Copy, Regenerate, composer, IME protection, scrolling and styling are retained.

Production's historical 5 CR policy was not changed. Local integration uses the official append-only savePolicy operation to create revision2 with qaCredits=1 and plannerCredits=7. Stale policy versions fail PRICE_CHANGED. Old 5 CR requests still refund their original 5 CR; old paid searches still recover the original charged=1 response without a new charge.

## Paid chat, settlement and retention

The distinct receipt-free `chat` action remains, but now uses the same positive-price atomic Admission/Debit/Refund code as Q&A. There is no free settlement branch or fake Receipt/Evidence/Ledger entry. HMAC includes the paid contract identity and actual policy version/price; UUID, owner-token CAS, Account identity, concurrency and replay controls remain.

Each successful admission consumes one of five Account/KST-day chat slots, including Provider failure, invalid output, cancellation and loss after admission. Rejected authentication/validation/balance/budget/quota checks and duplicate UUIDs do not consume another slot. Cross-device sessions share the same Account cap. Existing hourly/global, UTC daily cost and KST monthly cost limits remain in addition.

Zero balance now blocks chat before Provider. Provider costs are still reserved before invocation, reconciled from usage when known, and conservatively reserved when unknown. Credit refund does not erase Provider cost. Unknown Credit settlement blocks new client payment intent and the Admission is retained. Settled success and ledger-proved refunds can leave the operational table after retention; the immutable Ledger then blocks the same UUID permanently. No automatic retry or retention exception for newly paid chat remains.

## Additive migration and backup

All migrations 0016–0021 are byte-for-byte unchanged. We cannot prove that published 0021 has never been applied in another persistent environment, so **0022 is additive**; no historical file was rewritten. It rebuilds the active Admission CHECK to require a real debit ID for chat, and permits the shared refund_pending state. All prior paid rows, six triggers, five indexes and FK behavior are preserved. Monthly triggers are installed after copying rows, preventing duplicate cost reservation.

If 0021 free-chat rows exist, a nonterminal row blocks 0022 transactionally. Terminal rows are copied, with their exact old content-free fields, to immutable `assistant_legacy_free_chats`. This fixed migration-only population cannot receive new runtime inserts/updates/deletes and does not consume active Admission capacity. It preserves replay proof and prior quota/cost evidence without retaining a second free settlement implementation. Current-day counters include those records; monthly actual/unknown reservations are unchanged. This legacy history is deliberately not purged; new paid chat has no analogous indefinite Admission retention.

Backup **v12 / migration0022 / 16 datasets** is the new export contract. v11 continues to identify 0021; v1–v10 are unchanged. Operational Admissions, the frozen legacy identifiers and encrypted searches stay outside export/restore, like authentication/diagnostic operational state. Monthly costs, policies and Credit history remain exported. A backup restore is not claimed to reconstruct excluded old free UUID history; restore remains separately authorized and gated.

## Verification actually executed

- Actual component form/hook → HTTP → signed Account/D1 → Mock Responses → settlement PASS: chat 1 CR, explicit additional1 consent, duplicate-click protection, no search debit; archive Q&A search0 + answer1; no-result0/no generation; failed generation refunded1; uncertain refund retained/recovered without another Provider call.
- Account/KST five admissions, failed-request quota, simultaneous final slot, new session/same Account, day boundary, zero balance, stale policy, monthly budget, signed-admin diagnostics, public Planner denial before DB/charge/call PASS.
- Existing migration test extended: clean install and 0020→0021→0022 upgrade, rollback after forced SQL failure, active-legacy rejection, exact immutable legacy row preservation, old paid rows and trigger/index/FK preservation, legacy cost/quota inclusion outside capacity, paid success/refund cleanup followed by same-UUID denial, old5 refund and old1 paid-search recovery, v12 audit PASS.
- Actual packaged Worker in Miniflare PASS: upstream without CF/IP, production Account configuration with synthetic secrets, free search/recovery + paid1 Q&A/chat, Planner API503, replay, four safe diagnostic events and administrator response headers, full refund/Wallet/Ledger audit. All six Provider transports are local Mock; external Provider calls0. Local console delivery does not claim Production log retention.

| Existing suite | Passing assertions |
| --- | ---: |
| Admission | 265 |
| Generation (Q&A HTTP + preserved non-public Planner service) | 1,612 |
| Refund safety | 586 |
| Numeric/refund headroom | 1,173 |
| Credit policy | 262 |
| Credit foundation | 103 |
| Backup | 945 |
| Workspace interactions | 185 |
| Provider | 94 |
| Retrieval | 640 |
| Assistant component SSR | 35 |
| Admin policy UI | 20 |

TypeScript, ESLint, production build and diff-check PASS. ESLint has one pre-existing unused-variable warning in test-assistant-refund-safety; zero errors. Integration/migration/packaged suites above do not report an invented assertion total.

**Chromium 1440/360 visual QA: BLOCKED.** The pinned Playwright executable is absent; the actual launch failed before opening a page. Updated isolated preview and browser checks are supplied; no screenshots or visual PASS are claimed. Component rendering, event handlers and real isolated HTTP/D1 integration were executed. Mock success is not Production GPT success.

## Main file responsibilities and release gates

- `admission.ts`, `admission-sql.ts`, `repository.ts`, `limits.ts`: paid chat uses shared price/debit/refund, bounded quota/cost and safe cleanup/replay.
- `0022_paid_chat_admissions.sql`, schema/journal: preserved history and additive paid CHECK; inactive legacy migration guard.
- `generate-http.ts`, `http.ts`: public Planner pre-DB gates; internal Planner unchanged.
- workspace/session, assistant page metadata and admin policy editor: two clear modes, accurate shared quotes and paid reconsent. No CSS redesign.
- backup format/validator: v12 marker with exact old-version compatibility.
- existing local test/preview files: intended pricing/API expectations updated while retaining internal Planner, security and historical paid tests.

Retrieval, prompts, output schemas/validators, Provider model/profile, Credit mutation/policy repositories, SWNN/collection, Racing and historical evaluation records were not changed.

See `docs/AI_PRICING_RELEASE_CHECKLIST.md`: separately approve schema/runtime deployment, audit preservation, then append qaCredits=1/plannerCredits=7 while AI remains OFF. Complete browser QA before activation. General-chat and Q&A live acceptance each need separate scoped approval. Planner remains withheld. No Production deployment, AI ON, PUBLIC switch, live Credit, real Provider request, Production SQL, migration or restore was performed.
