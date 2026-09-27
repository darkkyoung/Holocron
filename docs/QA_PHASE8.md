# HOLOCRON Phase 8 QA

## Scope

This record covers Phase 8A and the Phase 8B-1 final-beta QA pass:

- public `메모 남기기` feedback flow,
- administrator-only Beta Analytics,
- additive D1 schema changes,
- security and regression checks.

It does not complete Phase 8, change the Site audience, or begin Phase 9.

## Analytics capability decision

ChatGPT Sites automatically provides Site-level unique visitor and page-view analytics in its management UI. The current Sites tools and documentation do not expose those values as an application API or stable data source for `/admin/analytics`. HOLOCRON therefore uses a minimal first-party D1 aggregate for its in-product administrator view and does not add a third-party tracker.

Measurement model:

- public routes only: News `/` and Works `/works`,
- client-side event after an actual page mount, so prefetch does not count,
- one random first-party HttpOnly cookie per browser,
- SHA-256 of that random identifier stored in D1,
- per-period, per-day, per-route page-view counter,
- `방문` is one anonymous browser per Korean calendar day and scope,
- no raw IP, user-agent, ChatGPT identity, email, or account identifier,
- QA period remains separate from a beta period selected by the administrator.

## Feedback architecture

`FeedbackDialog` sends JSON to `/api/feedback`. The route validates the body and page, applies a one-minute anonymous-browser cooldown, and calls Discord from the server with `allowed_mentions.parse` empty. The message contains only the feedback text, submission time, route context, and `HOLOCRON Beta Feedback` label. Feedback text is not written to D1.

The production environment variable is:

```text
HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL
```

The production value is configured in Sites as a secret. Its value is not committed, logged, or exposed to client code.

## Deterministic validation — 2026-09-27

- `pnpm test:feedback`: 23 assertions passed.
- `pnpm test:beta-analytics`: 23 assertions passed.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed.
- All pre-existing `test:*` suites passed, including the 48-assertion scheduled-collection regression.

Feedback coverage includes valid input, whitespace/over-limit rejection, malformed/non-JSON/non-POST requests, missing secret, Discord failure/success, disabled mentions, and client-side secret absence.

Analytics coverage includes News/Works route acceptance, admin/API exclusion, Korean-day aggregation, QA/beta period separation, News/Works totals, anonymous visit totals, duplicate React-effect prevention, and authenticated/unauthenticated administrator API behavior.

## Security review

- The Discord webhook is read only in the server route.
- No webhook value is committed, logged, returned, or included in the client component.
- Missing Discord configuration fails closed.
- Discord failures are returned as failures rather than false success.
- Discord mentions are disabled.
- `/admin/analytics` calls the existing `requireAdminSession` guard.
- `/api/admin/analytics` uses the existing administrator session and same-origin protection for mutations.
- Analytics persistence contains no raw IP, user-agent, or account identity.
- Existing administrator, scheduler, OpenAI, and TMDB secret paths are unchanged.

## Production validation — 2026-09-27

- Sites version 39 deployed from mirror commit `102d713266b51d4e1257bc9d2fcfe23b8237f396` with environment revision 24.
- The additive migration created `beta_analytics_daily_sessions` and `feedback_rate_limits` in production D1.
- The production feedback endpoint accepted `HOLOCRON Phase 8A production test` with HTTP 200 / `{\"ok\":true}`. The endpoint returns success only after Discord accepts the webhook request; no Worker error was recorded for the validation window.
- The public News and Works pages expose the `메모 남기기` entry. The dialog opened with its label, 1,000-character count, close control, and disabled empty-submit state; Escape closed it.
- Controlled News and Works analytics requests from one anonymous session returned HTTP 200. Production D1 recorded one News view, one Works view, and two all-route views for that session in period `qa` on the Korean day `2026-09-27`.
- No `beta_analytics_start_at` setting exists, so validation traffic remains outside the future beta baseline.
- `/admin/analytics` redirected an unauthenticated request to `/admin/login`. `/`, `/works`, and `/admin/login` returned HTTP 200, and recent Worker error logs were empty.
- The Site audience remained the pre-existing `public` access policy (revision 2, updated 2026-09-21); Phase 8A did not change access.

## Phase 8B-1 final beta QA — 2026-09-27

Canonical checked: `9fbcf932f224e4ab3ce3cd16a8a65581178dc873`. Production remains Sites version 40. A production configuration issue was found and fixed during this QA: `HOLOCRON_ADMIN_SESSION_SECRET` had been configured as a normal environment variable. It was replaced with a new secret value, marked secret, and version 40 was redeployed with environment revision 25. Existing administrator sessions were intentionally invalidated. No Site audience, application code, schema, beta marker, or Phase 9 work changed.

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Desktop at approximately 1366px | PASS | Production browser measured 1363×936px. News and Works document widths were 1348px, so neither had horizontal overflow. Header, cards, source rail, AI placeholder, grouped-story explanation, feedback dialog, Featured Work, Works grid, and metadata were visible. |
| Desktop at approximately 1440px | NOT TESTED | The available production browser exposed no viewport-resize capability. |
| 375px | NOT TESTED | No actual 375px viewport was available; do not treat deterministic tests as visual mobile proof. |
| 390px | NOT TESTED | No actual 390px viewport was available. |
| 768px | NOT TESTED | No actual 768px viewport was available. |
| Physical-device QA | NOT TESTED | No physical device was used. |
| News stacked cards | PASS (desktop / deterministic) | Production contains one-source cards and a three-source story. Expanding the current three-source story exposed The Hollywood Reporter, Variety, and Deadline original links. `test:story-stack` and `test:stories` cover one/two/multi-source behavior, earliest confirmed representative selection, and no invented precision. Mobile first-tap behavior remains NOT TESTED at a real mobile viewport. |
| Works interaction and destination resolver | PASS (desktop / deterministic) | Featured Work and normal Works cards expose semantic expandable controls in production. `test:works` covers first activation, keyboard/Escape behavior, shared destination resolver, upcoming official link, recent movie cinema dialog, non-movie/archive Disney+, missing official fallback, and HTTPS cinema links. The current production catalog has no `recent` group, so a live cinema dialog was not fabricated by mutating data. Mobile execution remains NOT TESTED. |
| Release-date regression | PASS | `test:works` confirms separate year/month/day inputs, exact/month/year/unknown storage, existing-value splitting, precision value retention, incomplete-input preservation, and invalid real-date rejection. The native date input is absent from the form. |
| Feedback dialog | PASS (non-sending UI / deterministic) | News now exposes a prominent CTA beside the latest-story cards, while Works retains its header entry. Production News dialog has a labelled textarea, 0/1,000 counter, disabled empty submit, close control, focus, and close path. `test:feedback` covers pending/success/error/cooldown/1000-character/server-only webhook behavior. No extra Discord message was sent. |
| Discord real delivery | PASS | The prior Phase 8A production test returned success from Discord and the owner visually confirmed receipt of `HOLOCRON Phase 8A production test` in the dedicated channel. |
| Administrator unauthenticated protection | PASS | Production `/admin`, `/admin/works`, and `/admin/analytics` redirect to `/admin/login`; `/api/admin/analytics` returns 401. A deliberately invalid login redirects with `error=1`. |
| Correct admin login, session attributes, logout | PASS | Production browser completed the actual administrator login through the secure credential entry flow, reached `/admin`, then logged out. Subsequent `/admin/analytics` access redirected to `/admin/login`. Source and `test:admin-auth` additionally cover signed HttpOnly/Secure/SameSite=Lax session behavior. |
| Authenticated `/admin/analytics` render | PASS | Production `/admin/analytics` rendered after real login: QA MODE notice, start-beta control, Today/Yesterday/Period total/News/Works metrics, and daily traffic table were visible. The beta start marker remained unset. |
| Analytics privacy and period separation | PASS | Only News and Works mount the tracker. D1 stores random-cookie SHA-256 hashes, Korean-day route aggregates, and page-view counts; no raw IP, user-agent, fingerprint, or account identity is stored. Production rows remain in `qa`; `beta_analytics_start_at` is absent and was not created. |
| Administrator override persistence | PASS | `test:admin-overrides` (24 assertions) verifies merge, split, exclude, restore, topic/status overrides, and automatic-collection precedence without production mutation. |
| Seven-source collection | PASS | `test:collection` and `test:source-settings` pass. Production setting remains six active sources with Collider off; the latest natural scheduled run completed successfully with source isolation and no source was changed for QA. |
| OpenAI failure fallback | PASS | `test:ai-recovery` (13 assertions) passes unavailable, malformed, and processing-failure recovery behavior. Production key was not changed. |
| Scheduler regression | PASS | Workflow cron remains `17 */6 * * *`; authenticated POST, shared runner, D1 lease, manual runner, GET 405, and unauthenticated POST 401 are verified. Production `last_collection` records a successful natural scheduled run on 2026-09-27 05:25 UTC with 6 active sources. |
| Secrets audit | PASS after fix | No tracked real `.env` file; production client bundle contains neither webhook URL nor protected-key names. Discord mentions remain disabled. All production sensitive values are now marked secret, including the replaced admin session signing key. |
| Copyright / attribution | PASS (beta risk review) | Public News UI identifies original sources and does not display full article text. Footer identifies HOLOCRON as an unofficial fan project, states no Lucasfilm/Disney affiliation, and attributes article/image rights to original owners. This is a product-risk review, not legal advice. |
| Accessibility smoke | PASS (desktop / deterministic) | Semantic links/buttons, keyboard-reachable cards, labelled feedback textarea, dialog close labels, AI placeholder dialog, grouped-source controls, and Escape paths are present. Narrow-viewport accessibility remains NOT TESTED. |
| Runtime / console | PASS | No HOLOCRON Worker errors in the recent production window. Browser console showed only errors from the cloud-browser extension, not from HOLOCRON code. |
| Automated full regression | PASS | All 18 current `test:*` suites passed: stories 13, admin overrides 24, collection 30, AI recovery 13, localization 19, admin auth 22, admin UX 15, source settings 36, story stack 12, works 65, works catalog 36, TMDB importer 28, season posters 16, season catalog maintenance 10, AI placeholder 14, scheduled collection 48, feedback 23, and beta analytics 23. `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` also passed. |

## Phase 8B-2 CTA and administrator-session QA — 2026-09-27

- Sites version 41 deployed from mirror commit `df36eaf89d7ab7c59e7c498100045303b4631791`; public access-policy revision 2 was preserved.
- News header no longer contains `메모 남기기`. A labelled left-side feedback CTA appears before the latest-card grid on desktop and becomes an in-flow block at the existing narrow breakpoint. Works retains its existing header entry.
- Production browser at 1363×936px showed the CTA, stacked-source cards, source rail, AI placeholder and archive explainer together; News and Works document width was 1348px, with no horizontal overflow. The CTA opened the existing labelled feedback dialog and its close control returned to the page.
- Real administrator login, `/admin/analytics` rendering, logout, and post-logout protection all passed through the production browser. Analytics remained in QA MODE, so no beta baseline was started.
- The available production browser still cannot set an exact 1440px, 768px, 390px, or 375px viewport. Those four visual checks remain NOT TESTED and are the only remaining final-beta QA blocker.

## Release-gate result

**Blocked** — no product-runtime failure remains. The administrator-session blocker is resolved, but actual 1440px / 768px / 390px / 375px viewport evidence has not been performed because the available production browser cannot resize. `beta_analytics_start_at` remains unset; Phase 8 is not complete and Phase 9 has not started.
