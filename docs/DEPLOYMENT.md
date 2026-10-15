# HOLOCRON deployment

## Current acceptance checkpoint — 2026-10-15

**v79 migration succeeded; real-account acceptance is blocked on Google callback diagnosis.** Fresh v3/0015 backup and immediate v4/0016 backup passed validate/plan; all legacy rows were preserved and all five Account/Credit tables exist. Guest first visit/reload stayed 3 CR. Google callback returned `login=failed` both after a long authentication delay and within a fresh OAuth lifetime. v80 privacy-safe diagnostics isolated provider_exchange. Local workerd reproduced the root cause: fetch redirect:error is unsupported. Canonical now uses manual redirect handling with explicit 3xx rejection and an actual Worker-fetch regression; live acceptance must be repeated after the corrected version publishes. Do not repeat 0016, alter safety triggers or run ad-hoc Production SQL. Full deployment IDs, hashes, counts and acceptance limitations: [acceptance checkpoint](devlog/2026-10-15-private-account-acceptance.md). Phase 9D remains unstarted.

The phase-specific status paragraphs below describe their original implementation checkpoints; this current checkpoint supersedes their backup/provisioning status. Phase 9D remains out of scope.

## Scheduled collection activation

Phase 7 uses GitHub Actions as the hosted scheduler. The workflow at `.github/workflows/scheduled-collection.yml` runs at minute 17 every six hours and supports `workflow_dispatch`. It makes one authenticated HTTPS `POST` request to the canonical production `/api/scheduled/collect` endpoint. It does not check out or build the repository.

Before the workflow reaches the default branch, generate one strong random value locally and configure that exact value in both locations:

1. Sites production environment variable: `HOLOCRON_SCHEDULER_SECRET`
2. GitHub repository Actions secret: `HOLOCRON_SCHEDULER_SECRET`

Do not commit, log, or send the value in chat. The production endpoint returns `503` when the Sites value is absent and `401` for a missing or incorrect bearer token. `GET` is never a collection operation.

After both secrets are present:

1. Merge or fast-forward the reviewed Phase 7 commit into canonical GitHub `main` without rewriting history.
2. Mirror the canonical tree onto the latest Sites internal-repository tip as content only; keep the Sites origin and its independent history.
3. Run the required regression suite in the Sites mirror, push normally, and deploy the existing production project.
4. Verify the production route rejects unauthenticated requests, then run the GitHub `workflow_dispatch` action.
5. Confirm the workflow response, News Archive, source rail, administrator last-run display, Works Archive, and administrator login.
6. Record dispatch verification separately from the first naturally scheduled invocation. GitHub scheduled jobs are best-effort and can be delayed.

The collection-run service stores a 20-minute D1 lease. Manual and scheduled calls therefore cannot perform collection concurrently; a live competing run is recorded as skipped, while an expired lease can be reclaimed.


## Phase 9C.2-A — additive Account/Credit foundation

Canonical migration `0016_account_credit_foundation.sql` creates five new tables, their indexes/checks and reviewed audit triggers. It does not modify existing News/Works/Quiz/Beta rows. Current backup code exports v4, preserving exact v1/v2/v3 readers. No public request invokes Guest creation or Credit mutation in A, and zero new rows after deployment are expected.

Before deploying: inspect the existing Site/migration state, obtain a fresh backup through authenticated `POST /api/admin/backup`, validate it with `pnpm backup:validate`, then mirror the reviewed canonical tree onto the latest existing Sites tip and deploy privately through the established mechanism. Hosted migrations run before the new Worker; do not issue ad-hoc SQL or create another Site. Without a verified current pre-migration backup, **defer deployment**, even after local checks/canonical push pass.

After deployment, verify migration/tables, unchanged old data, zero accidental Credit rows, existing pages/auth/COMING SOON, and download/validate a current v4 backup. Never restore or insert fake live rows as acceptance. Actual hosted state must be checked separately from local D1 tests.

`HOLOCRON_GUEST_SIGNING_SECRET` is a dedicated server-only random secret (at least 32 bytes), never reused from admin/scheduler/provider credentials. Configure it through the normal Sites secret mechanism before B invokes Guest operations. A compiles and existing pages work without it because no identity operation is wired publicly; an invoked identity operation fails closed when absent. Cookie verification has no insecure development fallback; local service tests inject a clearly synthetic secret without changing production flags.

Status for this implementation: canonical/local foundation complete; no hosted migration/deployment or signing-secret provisioning performed. Authenticated fresh pre/post backup acceptance remains pending.


## Phase 9C.2-B — Guest rewards (A+B deployment still pending)

B adds no migration: canonical still targets 0016 and backup v4. Unlike A alone, B's eligible public browser visit calls the explicit Guest reward POST. Configure the existing dedicated `HOLOCRON_GUEST_SIGNING_SECRET` through the normal secret mechanism before deploying B. Missing configuration fails closed; no insecure fallback exists. A real owner visit may then naturally create the first Guest with 3 CR. Do not seed fake live users, balances or Quiz responses.

The current Site was rechecked as owner-only, version 76; A has not been deployed. No fresh pre-migration administrator backup accompanied B, so no mirror push, deployment or live D1 mutation was performed. Preserve the pre-backup validation gate above before deploying A+B. Obtain/validate a post-migration v4 backup and verify old datasets after deployment. Actual hosted/browser/mobile acceptance remains NOT TESTED; local D1/React tests do not replace it.


## Phase 9C.2-C — Google identity setup; A+B+C deployment pending

Existing project remains owner-only/private at v76, `https://holocron.kr`. No C deployment, migration or live data mutation was performed. A fresh current authenticated administrator backup is still required before any A+B+C mirror/deploy. The earlier historical v1 acceptance is closed and is not a replacement.

1. Obtain and validate the current admin backup; inspect live migration state and the additive 0016 transition.
2. In Google Cloud, create/configure a **Web application** OAuth client and consent screen for the permitted test audience. Register exactly **`https://holocron.kr/api/auth/google/callback`**. Start route: `/api/auth/google/start`. No alternate callback or arbitrary Host-derived redirect exists. Google Login is identity only, not YouTube access; the sole requested scope is `openid`.
3. Provision `HOLOCRON_GOOGLE_CLIENT_ID`, `HOLOCRON_GOOGLE_CLIENT_SECRET`, dedicated `HOLOCRON_ACCOUNT_SESSION_SECRET` (32+ random bytes), plus the separate `HOLOCRON_GUEST_SIGNING_SECRET`, via the normal server secret mechanism. Never reuse admin/scheduler/Guest/provider secrets for Account signing. Missing configuration fails closed; there is no development fallback. These values were not provisioned by this task.
4. Mirror canonical's latest tree onto the latest existing Sites internal tip; normal push/deploy to the same private Site, leaving origin/history/access policy unchanged. Use the normal hosted additive migration path; no ad-hoc SQL or restore.
5. Immediately obtain the post-migration v4 backup, run canonical validation/plan and verify old datasets before browser acceptance. Then perform a non-destructive real Google login/return/balance/migration/logout/relogin flow. Verify that the existing private access gateway preserves callback query/state and cookie semantics; that gateway interaction is currently **NOT TESTED**. Finally obtain and validate/plan the post-QA v4 backup.

The application does not log callbacks, request bodies or provider responses. Ensure hosting/request-log configuration excludes OAuth callback query strings, authorization codes, cookies and token bodies; hosted log policy has not been audited here. Responses use no-store and no-referrer. OAuth failures expose only bounded local status. No persistent session table is added: logout clears this browser session; key rotation invalidates all Account sessions. Real Google OAuth, hosted migration and desktop/375px/390px browser QA remain **NOT TESTED**. The managed Sites browser capability was unavailable, so only local D1/React/client contract tests ran.
