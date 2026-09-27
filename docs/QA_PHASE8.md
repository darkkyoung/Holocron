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

The production value was not configured at the time of this local validation. Deployment and the real Discord delivery test remain blocked until the owner configures it in Sites. The value must not be pasted into chat or committed.

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

## Pending production validation

- Configure the Discord production secret in Sites.
- Deploy the additive migration and application build.
- Verify the feedback dialog at desktop, 375px, 390px, and 768px.
- Verify keyboard focus, Escape, close, pending, error, and success states.
- Send `HOLOCRON Phase 8A production test` and confirm it reaches the dedicated Discord channel.
- Verify `/admin/analytics` redirects unauthenticated visitors and renders for an authenticated administrator.
- Generate controlled QA News/Works traffic and confirm the expected D1 aggregates.
- Re-run production smoke checks for `/`, `/works`, `/admin/login`, `/admin`, scheduler, and collection state.

No physical-device QA has been performed.
