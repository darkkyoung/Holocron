# Phase 9D-E.5B — Controlled MVP live handoff

## Decision and evidence boundary

- Starting canonical: `69963acebeb3096c57801cbc25710cdaff94960d` (fresh fetched; unchanged before publication).
- **IMPLEMENTATION PASS**: executable handoff, isolated mock/Miniflare tests and local regressions complete. **Actual PC execution readiness remains conditional on a new local inspection.**
- Work did not access the user's WSL files, apply their new approval, read a real key, call a Provider or access/change Production. Production v84/F.4 PASS is user-supplied context, not a new operational inspection here.
- User reports official audit at pinned `684dcc5f2af3c706b994c1c73373fa6231ed7c84`: `PRIOR_AUDIT_PASS_LIVE_BLOCKED`, 3 attempts, 86,400 reserved, 13,083 usage-estimated micro-USD, 7 ledger entries, P01/P05 success, P07 INVALID_OUTPUT/full15 CR refund, semantic UNREVIEWED. Old expiry `2026-10-18T15:44:53.542Z` remains expired. Actual approval/journal/local hashes must be read again on that PC.

## Reviewed revision change

E.4 manifest pipeline `9dee4e8e45f83bd0bf6e8b0176c4a3721cf70444d380d083c933e0e6641a92b1` is preserved. The current pipeline adds policy-version and server-price admission checks, binds version/price into admission HMAC, uses original charged amount for refund, and enforces 0019 monthly accounting. The supporting Credit reward and v7 backup changes are also hash-bound. Therefore the original 0018 local D1 must not be opened by the new runtime.

Compared with E.4, prompt, provider, provider profile, output schema/validator, receipt code and dependency lockfile are unchanged. No product source or migration was changed by E.5B. Q&A remains5 CR, Guide7 CR under the synthetic default policy; Full Draft remains blocked. Existing retrieval, schema/grounding/freshness, debit/refund and replay paths are reused through `evaluateCase`.

New manifest: `evaluation/assistant-mvp/live-revision.json`, version `E.5B-smoke-v1`.

| Binding | SHA-256 |
| --- | --- |
| Revision manifest bytes | `f4df61cf2bac6915602b94fa60e53fa7e2472e7afd2a0f0b2750f97804415918` |
| Current Assistant pipeline | `c603895acecf3d13578e123e707a49d77ce63caff79e64ae7e858c934c75a2d2` |
| Evaluation tooling | `a566d0e55d490a1864603e02b6ab87d638445386d3d961f10c9ae6f5d3cbe95a` |
| Supporting runtime/schema/lockfile | `5eceed3e369e8284d6c5aba448b73805c386900fad79fae9aaba77e55165e77f` |
| Public corpus | `acd78cd254bc8bb716bbf4f3bafb87bd6e2d3e1dab4618f8b63faff4bc9cce48` |
| Cases | `bb14fc43173cffdbbf1ac2338d6941270cede0597ed0e084af318a537269817d` |
| Rubric | `99e0cf34024ab8132c2333fc65c4add9393e5c1770caac7abb87405fff452c76` |

Frozen E.4 manifest/cases/rubric and older evaluation artifacts are not rewritten. The old E.4 runner still fails closed against changed current tooling; it is not silently repurposed. Historical tests run their existing pinned revisions and are not presented as current live readiness.

## Implementation

Six small modules in `scripts/assistant-mvp/` separate revision checks, pinned historical reading, authorization, smoke execution, private result lifecycle and CLI. Shared budget code gains an explicit reusable coordinator lease and a fixed digest/ledger checkpoint record. The read-only local inspector includes 0019 policy/monthly rows in its current digest. Historical inspection uses the untouched pinned inspector, so its old digest contract is preserved.

- `inspect`: official historical audit plus current revision/scope checks; no approval, budget reservation, D1 creation or Provider.
- `authorize`: explicit plan token and confirmation, one immutable grant, fixed issue+24h expiry, private fixed child state directory. No change to original approval or journal; no new40-call allowance. Atomic exclusive creation plus fsync, incomplete initialization fails closed.
- `smoke`: separate explicit confirmation and dedicated evaluation key. One original coordinator lock covers both histories. Reread prior approval/journal/D1, new authorization, current revision and journal tip before reservations. STARTED is durable before local Credit effects; full maximum reservation is fsynced before transport. Lost/failed/timeout attempts stay consumed.
- P41≤1/19,200 and P44≤1/33,600; new2/52,800, aggregate5/139,200, original40/2,000,000 all enforced. No case override/retry/rest/P07. Any started smoke cannot be rerun, including interruption between cases.
- New local0019 Miniflare D1 has only public corpus and synthetic accounts; original0018 D1 is read-only, never migrated. Original ledger and new ledger are linked by immutable handoff proofs, not merged or reset.
- Result bodies: only validated public envelopes, private0600, individual24h deadlines, explicit immediate deletion and directory fsync. Failed/raw provider payloads are never retained. Safe errors use explicit codes, not arbitrary exception strings. Cost journal survives deletion. No automated semantic PASS, judge or background deletion claim.

This is an auditable local operator tool, not an authorization server defending against an operator editing source/history. Filesystem failures, abandoned locks, altered/missing state or unresolved admissions require STOP and a separate decision; no automatic repair or retry.

## Verification performed in Work

- New `test:assistant-mvp-handoff`: **132 assertions PASS**, current real generation pipeline/Miniflare and injected transport only. Real outbound **ZERO**.
- Existing nonbrowser suite set: **58/58 PASS**. With the new suite: **59/59**. Historical mtime/revision tests passed in this environment; not a claim about the user's PC execution.
- Lint: PASS, no new warnings; one pre-existing unused `debit` warning in `scripts/test-assistant-refund-safety.mjs`.
- TypeScript `--noEmit`: PASS. Build: PASS. `git diff --check`: PASS.
- New tests cover read-only inspection without key access; expired original approval and unchanged bytes; exact historical budget/ledger; same-plan and concurrent authorization; no expiry extension; wrong model/scope/hash/caps; missing/corrupt prior state; new journal missing; local schema mismatch; expired new approval; dispatch-time fsynced reservations; no second smoke; P41/P44 success5/7; P44 full7 refund; malformed/network/lost-body/timeout full5 refund; unknown usage/reservations preserved; post-reservation crash; changed authorization before second case; safe diagnostics; private retention and immediate body deletion.
- Manifest, corpus, cases/rubric consistency rechecked after tests. All temporary synthetic result bodies removed; no real user result/body was accessed.

## Handoff and remaining NOT TESTED

Exact supported commands are in [LIVE_HANDOFF.md](../../evaluation/assistant-mvp/LIVE_HANDOFF.md). Start with clean/fast-forward repository update, install the fixed lockfile, the new mock test and key-free `inspect`. The owner then separately runs explicit `authorize`, dedicated-key `smoke`, metadata inspection, private semantic review and immediate body deletion. Never change approval hashes, initialize another campaign, remove locks to retry or extend the old approval.

Actual PC hashes/permissions, real new approval issuance, dedicated-key injection, provider account/model access, real Korean output quality and hosted Worker/Production AI behavior are **NOT TESTED**. New Smoke is not automatically READY from this implementation report. Both outputs require owner content review; there is no permission or executable path to the remaining four cases.

Production deployment/migration/AI activation/secret changes: **NONE**. Actual Provider calls: **ZERO**. Product UI, Credit policy, schema and backup contracts: **UNCHANGED**.
