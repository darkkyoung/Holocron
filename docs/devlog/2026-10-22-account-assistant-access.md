# Account Assistant access — Part A

Starting canonical: `191cc665f94607ab778992a82421d41ca557eddf`.

Account-only Production configuration for both retrieval and generation. Signed Account session + active D1 principal is the authority. No CF/IP fallback, no header trust and no Account hash disguised as a network hash. Explicit `account-v1` Admission policy; existing edge-domain synthetic regression remains separate.

Search costs1 CR only with usable evidence and Receipt. Encrypted result readiness + immutable debit commit atomically. Same-UUID replay handles lost HTTP/D1 response; abandoned uncharged lease can resume after60s. Results expire10min; retained spend ledger prevents duplicate debit after operational cleanup. No results/clarification/rejection/error before commit costs0; ambiguous commit reports no invented charge/refund result. UI discloses1+5/7, Account login, recovery and no-result charging.

Additive0020, Backupv9/16datasets, v1–v8 compatible. No historical migrations, policy revisions, wallet/ledger rows, evaluation manifests or Racing files edited. See `docs/operations/ACCOUNT_ASSISTANT_ACCESS.md` for limits, retention, restore constraints and separately approved release sequence.

Validation: real isolated Miniflare D1 with no outbound, Account no-CF QA/Guide and invalid-output refunds; origin/auth/forged-cookie rejection; successful/no-result/clarification searches; concurrent replay; lost committed response; interruption before computation; balance/Account/global/monthly limits. Existing generation, admission, refund-safety, headroom, Credit policy, Google Account, Guest rewards, announcement, Assistant UI/workspace and Racing regression. TypeScript/lint/build and diff-check. Lint retains one pre-existing unused-variable warning in refund test.

Production changes0; real Provider calls0. No real-model quality claim or new evaluation approval. Part B maintenance remains a separate commit. Historical live manifests intentionally do not authorize this new runtime.
