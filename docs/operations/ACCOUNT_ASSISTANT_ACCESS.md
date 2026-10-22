# Account Assistant access v1

Implementation only; Production remains OFF. No Provider calls or production migration authorized.

## Authority and quotas

Production `assistantRetrievalConfig()` explicitly selects `account-v1`. The signed Account session is resolved against D1 users, active Account principal and wallet. IP headers, Request.cf, caller IDs and the browser Assistant cookie confer no authority. Receipt binding is a keyed Account identifier; Account receipts cannot transfer between owners. The old edge-v1 domain entry points remain for historical synthetic regression only; HTTP routes use the explicit Account configuration. No runtime flag selects Guest/free search.

Generation records carry an explicit `security_policy`. For account-v1, the historical NOT NULL `network_hash` column contains 64 zeroes, explicitly **unobserved**, never an Account hash. Network quotas apply only to edge-v1. Account quotas use the authoritative principal and cannot reset by replacing cookies. Existing admission reservations, immutable ledger, settlement/refund, cost reconciliation, policy revision and number guards remain.

- Search: Account 10 attempts/minute, global 200/minute and 2,000/UTC day; one active search/Account; at most 10,000 operational rows.
- Generation: Account weight 5/hour and 12/UTC day; QA weight1, Guide weight4; Account concurrency1, global concurrency3; global weight200/day. Daily Provider limit $2; KST monthly $30 and warning$20 remain.
- Valid search attempts count even with no results, clarification or archive errors. Invalid syntax/auth/Origin/body-size rejections never perform archive searches or spend Credit. Same-UUID replay reads a bounded cached result rather than rerunning search.

## Search transaction and recovery

UUIDv4 and normalized input HMAC are Account-bound. Attempt claim is atomic and precedes archive work. Success with nonempty candidates and a signed Receipt costs exactly1 CR. No-result and clarification cost0. The encrypted public response and charge are committed in **one D1 batch**, using the existing Credit mutation/trigger guard plus a new search-reference guard. A failed debit or owner CAS aborts the result write too. Search does not call an AI Provider.

A lost D1/HTTP reply must be recovered with the **same UUID and input**. Completed requests return the identical result without another debit. A 60-second abandoned, uncharged lease can resume with owner-token CAS. Old workers cannot commit afterward. Explicit archive failures are terminal and uncharged. Unknown transaction outcomes must not be labelled refunded/uncharged: retry the same UUID. The UI retains UUID + input digest + timestamp in sessionStorage (no query text), with memory fallback, and freezes date filters for replay. No automatic retries.

Results/Receipts are available for 10 minutes from the original request. After that, replay returns RESULT_NOT_RETAINED and never charges again. This is a result-readiness charge, not browser-delivery acknowledgment; there is no automatic refund for a completed result merely because its documented recovery window expires. Encrypted bodies are lazily cleared in bounded batches after expiry; with no subsequent requests they can remain encrypted at rest until the next cleanup. Operational rows last48h; the append-only ledger prevents a spent UUID from being reused even after row cleanup. Do not delete state or change UUID to “recover” a charged request. Generation retains its existing no-result-retention settlement contract.

## Migration and backup

Additive `0020_account_assistant_access.sql`: explicit policy column/index; isolated search recovery table/indexes; search debit and identity guards. No existing ledger/wallet rewrites. Backupv9 /0020 still has16 durable datasets. Search ciphertext/attempts and generation admissions are excluded operational state. v1–v8 keep their historical schema markers and settings allowlists. A future restore requires AI quiescence and resolution of in-flight requests, never replay operational state or silently reset spend history.

## Release sequence (separate approval required)

Validate a fresh/current compatible backup and no unsettled generations, apply0020 once using the reviewed migration process, deploy exact reviewed source AI OFF, validate backupv9/data/Account behavior, then separately approve activation and small paid acceptance. Search itself now spends1 CR: it is no longer an unbilled Production probe. Never use historical evaluation approval/manifests for this new runtime. Racing, Production secrets and current evaluation journals are untouched.
