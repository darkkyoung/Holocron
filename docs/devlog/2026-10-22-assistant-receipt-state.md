# Assistant Receipt state and acceptance closure

Starting canonical: `0db55f7a77f71061b5aeb53d13cf0fc232e2f6f7`.

## Production closure (read-only audit after authorized OFF rollback)

The stored v90 source was redeployed with only Assistant enabled=false, environment revision 57. Deployment `appgdep_6ad9e07591488191ab4b8dd534425911` succeeded. MAINTENANCE remains revision 3; Migration 0020 unchanged. No new implementation was deployed.

The server records one completed search, charged 1 CR, with a durable retained result and ten-minute expiry. Its applied assistant-search debit is exactly -1 and the matching wallet balance is 9 CR. There are zero generation admissions and zero monthly Provider cost rows. No additional 5 CR debit or generation refund obligation was found. The encrypted result/Receipt body was not decrypted or disclosed. This is not a new paid test. No manual refund or data correction was performed.

## Reproduced cause and change

The old browser visibility listener unconditionally set stale after a hidden→visible transition. This alone disables generation with the reported message; the message therefore is not evidence of a server EVIDENCE_CHANGED response. Production has no generation admission, consistent with client blocking; an exact user interaction trace is unavailable.

Use the server resultExpiresAt for the expiry timer and visibility recheck. Bind input dirtiness to the confirmed mode/query/filter snapshot, with canonical source ordering. Selecting a permitted subset does not invalidate the Receipt. A real server EVIDENCE_CHANGED response still blocks generation. No server Receipt TTL, fingerprint, ownership, Credit or rate-limit rules changed.

Validation: workspace 118 assertions including one-minute tab absence, subset selection, input changes and exact expiry; UI 36 assertions; TypeScript PASS. Isolated Account/D1 tests cover no-CF requests, paid search, no-result, replay/concurrency/lost response, QA/Guide and refunds. No actual Provider calls. Full integrated regression and browser UI checks accompany the subsequent UX commit.
