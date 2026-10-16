# HOLOCRON deployment

## 2026-10-16 9D-D canonical-only workspace checkpoint

The `/assistant` workspace and flag-aware News launcher have been added to canonical source only. Default `HOLOCRON_ASSISTANT_ENABLED` remains off: the deployed public Site retains COMING SOON and its existing access policy. No Site mirror/deployment, hosted migration, Production SQL/restore, secret change or real provider call occurred in 9D-D. A later, separately authorized deployment must first follow the fresh authenticated backup, normal 0017/0018 migration and immediate v6 post-migration backup gate below; enabling the flag and real-provider evaluation are separate decisions. UI local checks cannot establish browser/device or hosted acceptance. [9D-D implementation](devlog/2026-10-16-assistant-workspace.md).

## 2026-10-16 9D-C canonical-only provider boundary

No deployment/hosted migration, Production SQL, secret or access change. The generate route defaults disabled. Future server configuration is dedicated `HOLOCRON_ASSISTANT_PROFILE=gpt-5.4-mini-2026-03-17-o200k-v1` and `HOLOCRON_ASSISTANT_OPENAI_API_KEY`, alongside existing Assistant signing/abuse and identity secrets; no fallback to collection settings. No real key was used/provisioned. Do not enable from this local checkpoint: model access, pricing/lifecycle, retention, Korean grounding quality and real-provider acceptance are NOT TESTED. Runtime still requires 0017/0018 and backup v6 through the separately authorized fresh-backup/normal-migration/post-backup gate below. Existing public Site code/access and COMING SOON remain unchanged. [9D-C local evidence and delivery/recovery limits](devlog/2026-10-16-assistant-generation-foundation.md). Historical checkpoints below retain their original scope/status.

## 2026-10-16 B.4 canonical-only migration checkpoint

Canonical adds `0018_account_partial_refund.sql` and backup v6. Neither 0016 nor 0017 was rewritten. The new runtime requires **0017 and 0018 before publication**, even while AI is disabled: common Credit SQL depends on admissions and the revised refund guard. Local D1 verifies transactional replacement plus fail-closed protection between migration statements; hosted execution is NOT TESTED. This is not deployment authorization.

The previously accepted Production baseline is 0016/v4; no live inventory was queried here. The existing public Site keeps its deployed code and access policy. A separately authorized deployment must obtain and validate/plan a fresh authenticated pre-migration backup, apply the normal versioned migration path, compare legacy data and immediately validate/plan a post-migration **v6 / 0018** backup before further acceptance. No ad-hoc SQL or restore. AI defaults disabled, COMING SOON remains, provider calls ZERO, and 9D-C has not started. [B.4 local evidence](devlog/2026-10-16-account-partial-refund-acceptance.md). Older checkpoints below preserve their historical findings.

## 2026-10-16 canonical-only 9D-B.3 checkpoint (supersedes earlier policies)

No Production deployment, SQL, hosted migration, secret or access change. 0016/0017 and backup v5 bytes/contracts are unchanged. Capacity-first reconciliation removes refund **balance** reservations; common Credit writes still depend on 0017 for **sequence** protection, even when AI is disabled. Account partial refunds are blocked by the existing trigger and historical backup audit rules. A separately authorized additive migration plus deliberately versioned backup contract is needed; neither was implemented. Do not activate generation on this checkpoint. COMING SOON and the current public Site access are unchanged; 9D-C has not started. [Local evidence and minimum migration proposal](devlog/2026-10-16-assistant-capacity-first-refunds.md).

## 2026-10-16 canonical-only 9D-B.2 checkpoint

No deployment or live inspection/mutation occurred. 0016 and 0017 bytes, schema and backup v5 remain unchanged. Common Credit writes now reference `assistant_admissions` for numeric refund reservations, so **the new runtime requires 0017 even with the Assistant flag disabled**. Do not run this code against an unmigrated 0016 database or add a reservation-bypass fallback. The previously deployed Site continues running its old code; only a separately authorized normal migration-before-publication deployment can change that.

Local clean-chain/0016-upgrade and refund-capacity tests pass; this does not verify hosted deployment state. No 0017 rewrite was attempted, so its absence in every hosted environment was not assumed or used as authorization. Existing numeric insolvency from older experimental admissions is not repaired automatically; any future enablement must establish a valid starting liability invariant and resolve legacy obligations. **9D-B remains BLOCKED** on time-limited reward entitlement after rejection. See [B.2 evidence](devlog/2026-10-16-assistant-numeric-headroom.md). No provider, secret/access changes, generate endpoint, AI activation or 9D-C.

## 2026-10-16 canonical-only 9D-B.1 checkpoint

Account-only initial AI spending is enforced in both service and atomic D1 gates. No Site deployment, hosted migration, access/secret change or public activation occurred. 0017 and backup v5 are unchanged. **9D-B remains BLOCKED** because Account numeric headroom can be consumed before a full refund; unresolved obligations remain retained. Terminal records are only eligible for lazy cleanup after their expiry. See [refund safety and exact local evidence](devlog/2026-10-16-assistant-refund-safety.md). COMING SOON/disabled flag and the owner's public Site access remain unchanged. 9D-C has not started. The older checkpoints below preserve their original findings.

## 2026-10-16 canonical-only 9D-B checkpoint

No Site deployment or access change occurred. The owner reports the existing Site is public. Canonical adds unapplied `0017_assistant_admissions.sql` and backup v5; Production remains at its previously deployed code/0016/v4. Do not confuse canonical backup marker with a live journal query. Assistant flag remains false, launcher COMING SOON, no generate route. No new real secrets were provisioned; dedicated `HOLOCRON_ASSISTANT_ABUSE_SECRET` is only documented as future server configuration, separate from receipt and identity keys.

Guest full-refund and pending-operation retention acceptance are BLOCKED: see [9D-B evidence](devlog/2026-10-16-assistant-admission-foundation.md). Local migration tests do not authorize hosted migration or AI enablement. A separately approved deployment must obtain/validate/plan a fresh authenticated pre-migration backup, apply only the normal additive migration path, verify legacy preservation and immediately validate/plan a post-migration v5 backup. No scheduler configuration/auth changes or new Site. 9D-C has not started.


## Current acceptance checkpoint — 2026-10-15

**Phase 9C.2 private acceptance PASS within supported desktop scope; next phase 9D is NOT STARTED.** The one CASE-free migration retry succeeded as v79. All five Account/Credit tables exist, immediate and final v4/0016 backups passed validate/plan, and every original legacy row was preserved. Canonical OAuth runtime correction subsequently published as owner-only v81 (`00d71135819b3734363dffed237eb3dc438b0a79`): Worker fetch uses manual redirects with explicit 3xx rejection. Real Google login, Guest migration, first-login +3, same-day duplicate prevention and logout/relogin passed; Account balance is 6 CR. All 42 test suites and lint/tsc/build/diff-check passed. Mobile, independent multi-device and cross-day live checks remain NOT TESTED. Full evidence, hashes/counts and limitations: [acceptance checkpoint](devlog/2026-10-15-private-account-acceptance.md). Do not repeat 0016 or run ad-hoc Production SQL.

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
