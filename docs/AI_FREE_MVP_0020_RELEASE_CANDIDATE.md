# HOLOCRON AI — free MVP on 0020 schema (isolated candidate)

**Status: DEVELOPMENT ONLY / NO PRODUCTION AUTHORIZATION.**

## Why this exists

The current canonical main at the start of work was \`93646c066aaf8a33f1a7c062f8404dd7cd7b211e\`, with unshipped D1 migrations 0021/0022. Production was last reported v97, 0020, AI OFF / MAINTENANCE, backed up to verified v10. The Sites platform does not presently expose a confirmed read-only production migration/schema inspection method.

This candidate deliberately starts from the v97 application commit \`8c9caa20f6da2fa031612aea65fa0d4c6bd89793\` rather than deleting, editing or pretending to revert any committed migration on canonical main. It is **not** a normal fast-forward replacement for main; reconcile future source changes explicitly.

## Product contract

- Free **one-shot general chat** and **archive-grounded news Q&A**; Google Account login required.
- Q&A uses only the current published 90-day archive snapshot, existing retrieval/ranking, model prompt/schema, output validation, and server-owned safe citation links.
- No client-supplied evidence or direct model URLs; no conversation memory or persisted answer text.
- **No Credit charge** and no Wallet, Ledger, policy revision, assistant admission or monthly cost mutation in the new free path.
- Planner and legacy paid search/generation APIs are disabled when \`HOLOCRON_ASSISTANT_FREE_MVP_ENABLED=true\`. Historical Credit data and the paid implementation remain preserved.
- No exact per-account daily 5-use product entitlement yet. Instead: 3 admissions/minute/account, 8/hour/account, 40 per KST day globally, at most 3 concurrently. Failed calls count conservatively.
- Server-side bounded body/input/output, fixed model profile, one provider attempt per admitted UUID, no automatic retry, origin protection, and two-feature OFF switch remain mandatory.

## D1 0020 compatibility

No new D1 migration file or schema field was added. The free MVP uses the **existing 0020 \`assistant_searches\` table** strictly as a temporary, tagged, content-free request-admission store, with \`result_cipher='FREE_AI_MVP_V1'\`, \`charged=0\`, and \`debit_entry_id=NULL\`. The entry stores an HMAC of the query, not the plaintext; it does not store model output. Concurrent admission limits use a single SQL \`INSERT ... SELECT\` with database-side count predicates. Older paid/search entries are never removed by free cleanup.

This is a **deliberate beta-only reuse** of a table originally named for searches. It is not a general-purpose replacement for the permanent request/accounting schema. A later full release may need a dedicated migration and operational review.

Existing account login and archive-read schemas are still required; there are runtime writes for the rate-limit entries, but **no schema migration or Credit mutation** from this feature.

## Flags and security boundaries

- \`HOLOCRON_ASSISTANT_ENABLED=true\` and \`HOLOCRON_ASSISTANT_FREE_MVP_ENABLED=true\` are both required. Default: disabled.
- Explicit \`HOLOCRON_ASSISTANT_PROFILE\` and secret \`HOLOCRON_ASSISTANT_OPENAI_API_KEY\`, account-session and abuse secrets are mandatory; no fallback to the collection model/key.
- With the free feature flag ON, \`/api/assistant/retrieve\` and \`/api/assistant/generate\` always return UNAVAILABLE, even if called directly; new endpoint: POST \`/api/assistant/free\`.
- No API key in client bundle, no automatic retries, and no real Provider calls in this development task.
- Per-request max is bounded by the pinned profile (16,000 input tokens, 1,600 output tokens), and the admitted global count is bounded to 40 per KST day. Review **current provider pricing and cumulative collection budget** before any real API activation; count-based caps are not provider billing telemetry or a guaranteed monetary hard stop.
- Admin must preserve a validated OFF recovery path.

## Verification

- Run \`pnpm test:assistant-free-mvp\`: isolated Miniflare D1 with migrations through 0020, synthetic Account, mock Responses transport, quota, replay, citations, Credit no-change checks.
- Run \`pnpm test:assistant-provider\`, \`pnpm test:assistant-output-hardening\`, \`pnpm test:credit-foundation\`, \`pnpm test:assistant-admission\`, lint, TypeScript and build.
- Confirm disabled/legacy routes under FREE_MVP flag, mobile/desktop browser UI, no leakage, and simultaneous account requests prior to release.
- Real GPT behavior, real hosting/network integration, and Sites migration selection **have not been verified merely by local mock tests**.

## Release gates — separate approvals

1. Confirm exactly which Git tree and migration set Sites will publish; **prove 0021/0022 are not deployed** before any Production publish. No speculative upload, ad-hoc SQL or production diagnostic route.
2. Validate existing Production 0020 account tables and archival backup under supported read-only methods. Never overwrite production journals or change historical migrations to hide them.
3. Test mock end-to-end and browser UI in an isolated environment. Review applicable Terms, actual model availability/rates, request limits and OFF switch.
4. With separate approval, allow a *bounded, isolated* real Provider test, account for actual usage, and verify return/timeout behavior.
5. **Only with explicit Production approval**, migrate deployment through the supported Sites process without applying new migrations. Keep AI OFF through packaging/smoke checks, then separately approve enabling public free mode.
6. If Sites cannot guarantee the absence of a migration or the runtime cannot load against 0020, the outcome is **NO-GO**, not a reason to force-deploy.

No Production operation, migration, Credit change, live Provider request or manual release is authorized by this document.
