# AI network release — Stage A accepted, Stage B reverted OFF

## Source and authorization

Owner-approved canonical: `31fecd2982b3ac84c7745a60f861aee49892b095`; tree: `b8a9cbce5b564cf4235ce422a86bb93d8e73f450`. Fresh remote main matched. Existing public Sites project and independent source history were preserved. Sites commit `0b17473d4e7072bcd2eef5361faeb0e169d5e1ba` has exactly that tree. No runtime, dependency, schema, policy or evaluation changes were made during this release.

## Installation and package integrity

Approved content/modes were mirrored without copying timestamps. All 668 tracked files matched before and after the official Sites build. Installed Vinext is `1.0.0-beta.5`, patch hash `8dd600d130626ce811c5bb58a5a243d11f9856023f1aaa3d27329fdd9109f2d5`; installed handler SHA-256 `f6b80070d71aab8201ee7419520085be8f4694dba4d0f6dd42b8ef4acc4f97cf`.

The actual packaged Worker dispatch calls the imported URL clone helper, whose Request reconstruction copies `cf` via `Object.defineProperty`. Node baseline reproduced the unpatched NETWORK_UNAVAILABLE rejection; patched Node and workerd retrieval/receipt, mock Account debit/replay, forged-header/OFF/rate-limit checks passed. Those tests do not establish production metadata delivery.

Local archive SHA-256: `05073d99d9a745d59adf52e333e869acf23fcb2fab72a09f87b304e3e94bb733`. Sites saved the matching source/archive as version 87. No dependency inputs changed, so the already verified frozen installation was reused; the official build and edge tests were rerun.

## Stage A and backup preservation

Stage A OFF deployment `appgdep_6ad8a8e5db188191969a3cfc083e32a5` succeeded at 2026-10-21 20:58:47 KST with environment revision 51. D1 binding DB, required 0019 policy/monthly tables and policy revision 1 were observed through supported read-only tools. No migration was submitted. Internal migration journal was not exposed by that tool.

Original pre-backup: `holocron-backup-2026-10-21T10-09-14-715Z.json`, SHA-256 `3f62e519ea26f93a6107405ca40df8c0ef28d2fa421ca895e5c66a2dab4eb33b`, v7/0019/16 datasets. Current canonical validate/plan exit 0.

Owner-downloaded post-backup: `holocron-backup-2026-10-21T12-03-03-196Z.json`, SHA-256 `b309f35c3609b58fa7b64bdc94c399083444b1f53ab6cfeee0db4b00fa94b702`, v8/0019/16 datasets. Official validate/plan exit 0. Both originals remain private and byte-unchanged.

Every dataset was compared by its declared primary/composite key and every prior field. Deletions: zero across all 16 datasets. Articles (191), Works (49), quizzes (1), options (4), responses (41), feedback (3), settings (5), relations (49), users (2), auth accounts (2), policy revisions (1) and monthly costs (0) are unchanged. Analytics gained 19 rows (1735 to 1754), with no prior-row changes. Principals/wallets gained 10 (85 to 95). The original 260 ledger rows are byte-value identical; 31 new rows bring the ledger to 291.

All 31 additions are ordinary +1 reward credits: 10 first visits, 10 opening rewards, 11 attendance rewards. One existing wallet changed balance/version/timestamp; its change and all new-wallet balances/sequences exactly reconcile to new ledger effects. Official validation additionally verifies references, wallet/ledger equality, Guest cap, idempotency and refund constraints. No AI debit/refund or monthly cost exists in this snapshot. No announcement setting exists, so default OFF applies. Later natural visits are outside this snapshot, not evidence of loss or a reason to request endless backups.

Actual browser checks: News 60 visible stories, Works 49 with functioning film filter, Quiz 1 without submission, Roadmap, existing Account 8 CR, Assistant COMING SOON, public announcement null, announcement admin redirect to login, admin API UNAUTHORIZED, Scheduler GET method rejection. No login automation, quiz submission, collection POST or announcement publication. Authenticated announcement editing/upload and fresh Google login were not exercised.

## Stage B: failure and emergency OFF

Only HOLOCRON_ASSISTANT_ENABLED changed to true (environment 52). The same saved source version 87 was redeployed, not rebuilt from a different tree. Deployment `appgdep_6ad8aa7a1b088191bf1dabb43af6f0f1` succeeded at 21:05:29 KST.

The real public /assistant displayed Q&A and Guide modes. Exactly one agent-initiated free search was submitted through the normal browser UI on holocron.kr. It returned “네트워크를 확인할 수 없습니다.”, the application message mapped exclusively to NETWORK_UNAVAILABLE (server contract: HTTP 503). No Candidate or Selection Receipt was obtained. The available browser API did not expose the raw network response, and retrieved Worker logs did not include this specific failed request; do not present a raw-response capture as evidence.

No second search, forged IP header, relaxed validation or paid generation followed. Emergency OFF changed only the flag to false (environment 53), and redeployed the same version. Deployment `appgdep_6ad8aab5bfd88191b56d21c985b9f952` succeeded at 21:06:28 KST. Actual /assistant returned to COMING SOON; public announcement remained null. Final Sites state is active public version 87, environment 53, AI OFF. Other environment entries were unchanged.

The patch is proven present in the deployed artifact, but the real network identity boundary still rejects. Missing/invalid cf.colo versus CF-Connecting-IP and the precise upstream loss location are NOT DETERMINED. Local patch success must not be described as resolving the hosted outage.

## Verdict and next boundary

**NETWORK BLOCKER PERSISTS / AI OFF.** Popup functionality is deployed but remains unpublished. Data preservation through the v8 snapshot PASS. Paid Provider calls initiated by this work: ZERO. No restore, ad-hoc SQL, secret replacement, Credit-policy mutation, forced Scheduler or private evaluation change.

A separately scoped follow-up must trace trusted metadata across the actual Sites/Cloudflare dispatch boundary, without storing raw IPs/credentials or weakening authentication/rate limits. This release did not implement another fix or create a new evaluation phase. Paid generation remains unauthorized, and full Production acceptance has not been achieved.
