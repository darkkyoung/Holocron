# Phase 9D-D — Grounded AI workspace, canonical-only

Date: 2026-10-16. Starting canonical fetched before work: `23f43ed9b96f835b4fea587206b5fd676d5fb338` (`Implement bounded grounded generation with provider validation`), with a clean working tree. The commit containing this record is the final implementation checkpoint; its SHA is verified after publication and reported separately, rather than recursively embedded in its own contents.

Scope: local UI implementation and tests only. The owner reports that the existing Site is publicly accessible; neither its deployed runtime nor access policy was changed. The Production baseline remains a previously deployed version without hosted 0017/0018 acceptance. `HOLOCRON_ASSISTANT_ENABLED` stays off by default; on the existing public Site the News launcher continues to say **COMING SOON**. No hosted SQL/migration, Site mirror/deployment, secret provisioning, billable provider call or AI activation occurred.

## Boundaries and decisions

| Layer | Responsibility |
| --- | --- |
| `app/assistant/page.tsx` | Dynamic server flag check, existing shell/Header/Footer and public filter *options* only; disabled direct access renders no functional workspace and does not read the archive. Public archive options use existing `loadArchive`; they are never generation evidence or authorization. |
| `app/page.tsx`, `app/newsroom.tsx`, News launcher | Pass the server-owned flag through existing News UI. Off retains the original COMING SOON dialog; on uses a normal anchor to `/assistant` as required by the existing Vinext/Sites navigation convention. |
| `assistant-workspace.tsx` | In-memory interaction state, explicit search/selection/generate actions, Account Credit display, cancellation, freshness and focus/live announcements. No SQL, ranking, prompt, provider or price authority lives here. |
| `contracts.ts`, `api-client.ts` | Erased API return types, supported filter/date shape and displayed price labels; same-origin credentialed POST to the existing A/C endpoints. The server remains authoritative for action, price, ownership, debit and result. |
| `story-selection.tsx`, `assistant-result.tsx`, CSS | Native checkbox selection, bounded Article/source review, server-numbered citations, certainty and creative/factual distinctions, attribution-preserving copies, responsive dark archive styling. |
| `lib/assistant/service.ts` | Adds authoritative Work names to retrieval candidates from the *same primary D1 snapshot* for visible relation context; the receipt fingerprint/retrieval ranking and all stored data remain unchanged. |

Q&A proposes the first six server-proposed Story IDs, lets users remove or refine selection and charges 5 CR only on explicit Account generation. Script begins with zero Stories, allows 1–8 explicitly chosen Stories, and sends one 7 CR Planner or one 15 CR Full Draft action. Revision remains unimplemented. Retrieval is free, while server quotas still apply. Browser request IDs are fresh UUID v4 values per deliberate action; there is no automatic replay after timeout or cancellation, no client-authoritative evidence, model, URL or price, and no hidden second draft request. The existing APIs enforce receipt binding and authoritative D1 freshness.

The selected bounded Article rows disclose effective title, source class/label, publication date, category, omitted counts, uncertainty and validated original links. The response displays server citation numbers, claim certainty, caveats and limitations; unused Stories are labeled separately. React escapes all untrusted/model text. Source-free copy is unavailable: answer, facts, outline and draft copies include their referenced Article titles/URLs and the 90-day archive limitation. The result is marked stale after inactivity; paid regeneration requires explicit retrieval/selection review after changed search conditions or `EVIDENCE_CHANGED`. Failed refresh retains the previous visible query, filters and selected evidence, but marks the old receipt stale and blocks spend until a successful explicit search. There is no HMAC implementation in the browser.

The UI shows the configured provider disclosure before paid generation without promising provider-side zero retention. The current workspace, question, selected Stories, instructions and result live only in React state: no localStorage/sessionStorage/IndexedDB, saved transcript, URL prompt or AI-specific analytics. The shared Credit client supplies the displayed balance, and refreshes it after a confirmed server settlement. Guest retrieval remains available, while generation is nonactionable without Account login. The server still rechecks ownership. On failure the UI distinguishes known full/partial/zero-applied refund from pending or unknown settlement; a browser AbortController cannot prove provider billing stopped or a refund occurred. `RESULT_NOT_RETAINED` and in-flight duplicate errors do not auto-submit again. A new explicit action can incur another charge.

## Local checks and limits

Focused React server-rendered tests and real component event-handler simulations inject the existing endpoint response contracts; they verify Q&A/script selection, exact request payloads and cookie policy, fresh ID, errors, stale/expired selection, cancellation, safe links/escaped text, copies and capacity-first refund wording. Static CSS contracts cover the 820px single-column breakpoint, narrow mobile stacking, roughly 44px touch targets, visible focus and reduced motion. The full repository regression result and assertion counts are recorded below after execution.

**NOT TESTED:** actual rendered browser/device inspections at 1440, 820, 390, 375 and 360px, virtual keyboard and screen-reader behavior; local CSS/SSR checks do not prove visual layout or focus behavior in a browser. No real provider quality/retention evaluation, hosted 0017/0018 migration, post-migration backup, Production ledger spend/refund, Production browser acceptance or public AI activation. The status is local UI implementation only, not whole-Phase-9D Production readiness. A later authorized gate must obtain a fresh Production backup, migrate through the normal hosted path and validate v6/0018 and preserved legacy rows *before* any live AI acceptance, then separately decide on feature activation.

### Executed gates

| Check | Result |
| --- | --- |
| All package.json `test:*` scripts, sequential `pnpm <script>` | **51/51 PASS**, including News/Works/Quiz/Google/backup/migration/Credit and prior Assistant suites |
| `pnpm test:assistant-ui` | **30 assertions PASS**: actual React SSR, disabled direct route, enabled two-mode route, Story/evidence/result rendering, attribution/privacy, static mobile/focus contracts |
| `pnpm test:assistant-workspace` | **84 assertions PASS**: real component handlers, exact same-origin API bodies, selection/price/identity, failed-refresh retention, stale evidence, cancellation and settlement with injected fetch |
| `pnpm test:assistant-retrieval`, `pnpm test:assistant-generation`, `pnpm test:assistant-provider` | PASS, including existing real local Miniflare D1 and injected-provider/workerd coverage (not new browser or live-provider evidence) |
| `pnpm lint` | PASS, zero errors; one pre-existing unused-variable warning in `scripts/test-assistant-refund-safety.mjs:27` |
| `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check` | PASS; build includes dynamic `/assistant` |

Protected migration files 0016–0018, backup v6, Credit settlement, identity and provider profile/config were not changed. No new migration or credentials. The public Site's deployed launcher remains disabled; the canonical launcher only links to the workspace if the server flag is explicitly enabled in a future authorized environment. The 1440/820/390/375/360px rendered viewport and keyboard/screen-reader checks remain **NOT TESTED** because no local browser engine was available. SSR and CSS checks are evidence of markup/policy, not visual acceptance.
