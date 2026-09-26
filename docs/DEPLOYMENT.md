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
