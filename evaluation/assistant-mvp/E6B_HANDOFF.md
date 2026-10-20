# E.6B — four-case pilot handoff

**PILOT PREPARATION / LIVE NOT AUTHORIZED.** This document is not a paid authorization. No API key is needed for the steps below. Do not upload private state, result bodies, keys or score files to GitHub, CI or chat.

## Scope and immutable inputs

Revision `E.6B-pilot4-v1` fixes `e6b-revision.json`, E.6A's unchanged 30-case dataset, the original public archive snapshot captured on 2026-10-17, the unchanged nine-dimension MVP rubric, current runtime and tool bytes. It does not establish the current Production archive's contents. The evaluation clock uses the snapshot's 90-day window.

| Order | External ID | Mode | Risk | Reservation (micro-USD) | Accepted program code |
|---|---|---|---|---:|---|
| 1 | E6B-P84 | Q&A | Variety report vs StarWars.com LEGO fan challenge | 19,200 | OK |
| 2 | E6B-P66 | Q&A | Naomi Ackie experience is not a new casting confirmation | 19,200 | OK or INSUFFICIENT_EVIDENCE |
| 3 | E6B-P65 | Guide | LEGO reports vs creative framing | 33,600 | OK |
| 4 | E6B-P81 | Guide | Epic development delay is not cancellation | 33,600 | OK |

P84/P65 overlap in article evidence and test different modes; they are not two independent article samples. No other case is executable. One explicit command per case, at most one transport attempt each. No batch/all/retry/reset operation exists.

Model/profile remain `gpt-5.4-mini-2026-03-17` / `gpt-5.4-mini-2026-03-17-o200k-v1`. The existing profile's price/token contract is checked locally; no Provider availability or real account request is tested by inspection.

Historical owner-reported baseline: **10 attempts / 278,400 reserved / 35,827 known usage-estimated micro-USD / 0 unknown**. Proposed additional ceiling: **4 / 105,600** ($0.1056); cumulative ceiling **14 / 384,000**, under the unchanged global **40 / 2,000,000**. Reservation is not actual billing. Refunds do not restore Provider attempts or reserved budget.

## Owner: key-free steps only

Open Ubuntu WSL. Run each step separately and stop on any error or unexpected output:

```bash
cd ~/projects/holocron-eval
git status --short
```

The output must be empty. Do not reset, clean, stash or discard private changes automatically.

```bash
git remote get-url origin
git fetch origin main
git log -1 --format='%H %s' origin/main
git merge --ff-only origin/main
git status --short
pnpm install --frozen-lockfile
pnpm test:assistant-e6a
pnpm assistant:eval:e6b inspect --prior "$HOME/holocron-eval-private/approval.json"
```

Confirm the origin is the canonical `darkkyoung/Holocron` repository. Inspection creates no approval, reservation, result or new D1. It reads the original approval's trusted `stateDir`; the new isolated location is `<stateDir>/mvp-pilot4-e6b-v1`, not an arbitrary CLI path.

Historical audit uses exact E.5J source `36797d08aab875b709b1a746ba1c48a2e11730a6`, recursively using the older pinned auditors. Required Git objects and installed dependencies must exist; missing history is a STOP, not permission to substitute current code. Read-only SQLite inspection starts no Worker and performs no migration or row writes. Existing historical helpers may take/release the original coordinator lock and SQLite may update transient shared-memory read marks; durable approval, journal, database contents and receipts must stay unchanged.

Verify the report shows:

- `PLAN_ONLY_LIVE_NOT_AUTHORIZED`, `providerCalls: 0`, exact scope/order and hashes.
- Historical 10 / 278,400 / 35,827, unknown 0; original approval hashes, journal tips, local digests and expiry times.
- E.5D P41 `OWNER_NOT_PASS`; E.5F P41 `OWNER_PASS` with reviewed/deleted body; E.5F/H P44 failed with full 7 CR refunds; E.5J P44 `OK` / `OWNER_PASS`, 7 CR charged, reviewed/deleted body.
- Fixed new ceilings and a plan token bound to these original bytes. Expired old approvals are historical evidence, not execution authority.

**Stop here.** The implementation work did not access the owner's WSL originals. A future owner decision must approve the precise revision, these four IDs, 4 attempts / 105,600 micro-USD, fixed 24-hour authorization and up to 24-hour private retention. Do not issue authorization or enter a key based solely on this document.

## Implemented later-stage CLI contract (not permission to execute)

The following command names/arguments exist for the separately approved next phase. This section intentionally gives no executable authorization/key-entry/live-call recipe.

| Command | Required arguments | Effect |
|---|---|---|
| `inspect` | `--prior` | Key-free fresh historical audit and plan/local metadata |
| `authorize` | `--prior --plan --confirm` | Explicit `AUTHORIZE_E6B_PILOT4`; future approval only; immutable ID and issue time +24h |
| `run` | `--prior --case --confirm` | Explicit case-specific `EXECUTE_E6B_P84_ONCE` etc.; one allowed case, later dedicated evaluation key environment only |
| `list` | `--prior` | Body existence/expiry and safe receipt metadata |
| `view` | `--prior --case --confirm` | `SHOW_PRIVATE_RESULT`; interactive local terminal only, never CI |
| `score` | `--prior --case --scores --confirm` | `RECORD_OWNER_REVIEW_AND_DELETE`; private absolute JSON scores path, immutable review receipt and body deletion |
| `delete` | `--prior --case --confirm` | `DELETE_RESULT_BODY`; privacy cleanup remains available after expiry/source changes; no permission to continue |

All paths must be absolute. Repeating authorization cannot extend expiry. A case that started cannot be retried, even after an error or unknown usage. Never remove/rename a state directory to re-enable execution. The dedicated key is neither read by inspect nor stored in state. Never use a Production key or DB.

## Human review and next-case gate

After each explicit execution, stop to inspect program, budget, settlement and storage. Only validated public result envelopes (`ok`, and for P66 `insufficient_evidence`) are reviewable. Raw Provider responses and rejected bodies are not retained. The terminal shows Korean output, citations and selected evidence, not raw Provider JSON.

For Q&A, score array positions 7 and 8 must be the literal `"N/A"`; the other seven dimensions use `0`, `1`, `2` or `"NOT_REVIEWED"`. For Guide all nine dimensions use those scores (no N/A). A private score JSON contains exactly `scores` and boolean `critical`. All applicable scores 2 and critical false are required for `OWNER_PASS`. There are no prefilled all-pass score files. The dataset's `NOT_REVIEWED` values remain unchanged.

Before reviewing each response, read that case’s pre-fixed allowedClaims, mandatoryCaveats, forbiddenClaims, attribution/date restrictions and expectedCitationBehavior in `e6a-cases.json`, alongside `E6A_COVERAGE_MATRIX.md`. Do not adjust those criteria after seeing output.

Evaluate evidence/citation relevance, semantic claims, speaker and reporting attribution, uncertainty, dates/numbers/prices, Korean usefulness, guide structure, creative-note factual invention, and over-refusal. A critical finding or any partial/unreviewed applicable score means `OWNER_NOT_PASS` and blocks continuation. Program PASS is not human PASS.

P66's valid insufficient-evidence response is **not a transport failure**: it has known usage, failed/refunded admission, full 5 CR refund, a validated public envelope and human review. It may earn OWNER_PASS if appropriately scoped; refusal to answer supported reporting is a quality issue. It never receives automatic semantic approval. Other cases' insufficient-evidence responses stop this pilot.

Storage uses private directory 0700/file 0600, fsync, 60 KB bound, envelope/hash/case/revision/expiry verification. Score writes immutable review metadata, deletes the body and appends a composite D1+review checkpoint. The next case requires that checkpoint, matching stored/reviewed/deleted receipts, OWNER_PASS, no body, known usage, correct settlement, unchanged history/runtime and active approval. Editing a score or body after a checkpoint blocks execution.

Retain bodies for at most 24 hours and delete immediately after review. Reading/scoring expired output is blocked. If WSL is stopped there is no background deletion daemon: the owner must arrange timely cleanup with the implemented delete command. Expired/unreviewed/manual cleanup preserves receipts but does not unlock the next case. A crash between score/delete/checkpoint is fail-closed; do not repair or initialize state to continue.

## STOP conditions and limits

Stop on OWNER_NOT_PASS/critical, INVALID_OUTPUT, unexpected response, unknown usage, timeout/lost response, pending refund, settlement/hash mismatch, storage failure, corrupted review, expired authorization or lock anomaly. The original coordinator lock serializes all revisions. Reservation is fsynced before transport and consumed even when the response is lost. No automatic retry or recovery exists.

Financial history and deletion metadata remain even after body cleanup. Technical reports contain fixed diagnostic codes and safe metrics only; do not post complete inspect reports/private identifiers publicly. The earlier P44 diagnostic wording comes from owner reports, not reconstructed rejected bodies.

Four successful pilot reviews do not authorize the remaining 26 cases, global limit changes or Production AI. They are a decision point for a separately authorized expanded evaluation. Production v85/0019/AI OFF and historical results remain untouched.
