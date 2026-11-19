# 3-B isolated operations and independent review of PR #4

Base aa25e02b8055302bab3a39461e4967ca87784679. Keep #4 and the regular sealed manifest contract intact. No production binding, cron, schema journal, application credentials, entropy provider, public broadcast, prediction or payment integration is configured.

| Review | Finding and disposition |
|---|---|
| High: generation lease | Entropy binding, candidate-conflict quarantine and failure cleanup previously checked owner but not expiry. Fence all three; an expired attempt is reclaimable, not entitled to commit. |
| High: administrative identity | The existing signed cookie has shared subject admin, not a Racing role or individual identity. Verify it server-side and require an independently provisioned, expiring, revocable grant for the exact session nonce hash. No role from headers/JSON. Human attribution is only as trustworthy as the out-of-band issuer. No self-grant endpoint. |
| High: public result disclosure | Official classification already exists before its public release. Return only selected scheduling columns; never expose result/artifact/manifest/candidate or private seeds. No public feed. |
| Medium: retry and sealing | Atomic D1 batch, unique week, sealed commitments, separate qualifying/main entropy refs, pinned stage hashes, verified AES-GCM artifacts and immutable READY classification. Same-input retry only. Candidate conflict is a quarantine incident, not permission to reroll. |
| Release blocker | No production journal attestation, current complete backup including key custody/private artifacts or isolated restore rehearsal covering Racing and existing service. Existing backup validation is not proof of recovery. |

## Isolated operation

Use a dedicated local D1 binding RACING_ISOLATED_DB, apply only the two SQL fixtures in db/racing-phase3a/migrations in order **to the isolated DB**, set RACING_ADMIN_ORIGIN to the exact test app origin, and provide a private 32-byte hex RACING_SEAL_KEY. There is no fallback to the service DB. The signed HOLOCRON admin session is still required. A trusted fixture/issuer associates SHA-256 of its nonce with operator label, one role and expiry milliseconds in racing_admin_grants. Never log tokens or keys. An issuer and account-level attributable identities are required before actual operations.

Open /admin/racing. A viewer sees the most recent 140 scheduled races; scheduler seals a chosen Monday or next KST week, edits the versioned operations directory and reconciles time-based state; incident cancels only SEALED or GENERATING with expected revision and reason. Profile directory changes are not retrospective roster edits. Reload after a lost response before issuing another command. A stale write cannot cancel a different revision. For generation failures use 3-A's trusted runner with the existing commitment after lease expiry; never expose generation material to the browser. Missed qualifying cannot be manufactured at 21:00; cancel eligible race and retain audit. Quarantine requires offline investigation; no override button.

The separate scheduled entry point lib/racing-admin/weekly.ts accepts a scheduler delivery, chooses the next Monday using its scheduled time in KST, and uses actual time to enforce sealing deadline. Test calls this handler directly. No live trigger is installed. For isolated operations, invoke it before the scheduled week (e.g. Sunday). Repeated deliveries and simultaneous manual creation converge.

## Handoff for December 7

Custom mini-seasons and replacement entrants require a distinct manifest/schedule contract: the existing database enforces seven rounds, and the v0.14 engine binds r1–r8. Version the participant-to-engine-slot mapping before enabling substitution. Do not disable the seven-round constraint or edit an already sealed week. Directory records are not a new participant identity. Human-triggered generator retry UI is deferred until trusted private runner authorization is available.

Keep the 21:00 KST generation gate. Engine-only benchmark excludes queue wait, entropy, canonicalization, encryption, object-store verification and D1 commit. 3-C should measure scheduled-to-first-public-frame end to end (cold/warm p50/p95/p99); show a truthful waiting state if late, retain the official race clock and reconnect at the server-authorized offset. Earlier sealed computation is a separate policy decision. Verify no future release through API, HTML hydration, caches, prefetch or reconnect before switching to public broadcast. Test DSQ visibility and privileged vs public cache separation at the exact reveal boundary. No credit settlement until official reclassification.

Before production: reconcile actual D1 journal with canonical migrations, verify current export coverage, rehearse restoration into a separate DB including encrypted artifacts and keys, compare counts/constraints and existing wallet/ledger invariants, obtain explicit approval. Do not run a production migration to discover journal state.
