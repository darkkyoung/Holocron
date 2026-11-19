# Phase 3-A validation record

Baseline main: `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`.
Baseline Racing: `476f31c553781c06ed243457abadef80f51d975b`.
Validation environment: isolated Linux workspace, Node 24.22.1, existing pinned dependencies plus the existing locked prototype dependencies. No production credentials or services used by tests.

| Check | Observed result |
|---|---|
| `pnpm test:racing:phase3a` | PASS, 8 scenario groups; real isolated Miniflare D1 and encrypted temporary artifacts |
| Historical `test-racing.mjs`, `test-racing-v2.mjs` through `test-racing-v14.mjs` | All 14 suites PASS; historical fixture hashes unchanged |
| v0.14 staged composition | 20 full meetings exactly equal to historical monolithic calls for the same seed |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | 0 errors; existing unused `debit` warning in `test-assistant-refund-safety.mjs` |
| `pnpm build` | PASS, local application production build; no deployment |
| `git diff --check` | PASS |
| Operational `db/schema.ts`, `drizzle/`, Wallet/Credit, Assistant, app routes, worker diff versus baseline | Empty |

The old v9 test initially reached its output write with no `out/` directory and failed with ENOENT. It passed after creating that ignored directory; the new workflow prepares `out/` before each historical suite. No historical test or Golden was edited to hide a failure.

The isolated upgrade fixture applies the existing SQL chain through 0022, then the separately scoped Racing DDL, and checks exact legacy schema plus a persisted sentinel. This is not a production data migration audit, nor a full old Wallet/Ledger data-preservation rehearsal. The production journal and backup versions were not changed.

The new suite covers: weekly and exact timestamp boundaries; bounded and frozen identities; concurrent/idempotent season creation; transaction rollback; independent stage seeds; immutable commitments/artifacts/results; same-input retry after object failure and process restart; entropy substitution rejection; unavailable entropy; stale/expired leases; result conflict quarantine; lost completion response; cancellation during upload; delayed state reconciliation; forbidden roles and terminal writes. Its temporary D1/artifact directories are cleaned after execution.

No new visual or GPU acceptance is claimed: this change adds no player UI. No new 40,000-race holdout, live entropy beacon, production backup, scheduler, HTTP authentication or live broadcast acceptance is claimed. Those gates are described in [the foundation contract](9R_PHASE3A_FOUNDATION.md).

The GitHub workflow definition is committed for independent reruns. Any actual CI run and its status are reported separately with the final PR; a local PASS is not a remote CI PASS.
