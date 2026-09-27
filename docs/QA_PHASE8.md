# HOLOCRON Phase 8 QA

## Scope

This record covers Phase 8A only:

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

## Remaining QA

- Verify the feedback dialog at 375px, 390px, and 768px in a resizable browser and complete physical-device QA.
- Verify pending, error, and success presentation through the public UI; the success path was verified at the production endpoint and Discord acceptance boundary.
- Verify `/admin/analytics` rendering in an authenticated administrator session. Authentication guards, report aggregation, and the protected API are covered deterministically; the unauthenticated production redirect is verified.
- Confirm the test message visually in the dedicated Discord channel if channel read access is available. Server-side validation confirms Discord accepted the webhook, but this environment cannot read the channel back.
- Complete the remaining Phase 8 beta checklist before the public-beta release decision.

No physical-device QA has been performed.
