# HOLOCRON deployment

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
