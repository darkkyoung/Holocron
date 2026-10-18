# E.5B — controlled P41/P44 handoff

This implements the user's two-case scope. **Work executed synthetic tests only. No real approval was applied, no key was read, and no Provider was called.** Actual PC state must pass the inspection below before local authorization. Program success is not semantic success or Production acceptance.

## Fixed revision and scope

`live-revision.json` pins the current Assistant pipeline, supporting `lib/`, `db/`, `drizzle/`, lockfile/loader, evaluation tooling, model and profile. Corpus, six-case file and rubric are byte-identical to frozen E.4. Only these two cases are executable:

| Case | Purpose | Maximum attempts | Maximum reservation | Credit |
| --- | --- | --- | --- | --- |
| P41 | Q&A: Hal Hickel production approach, Variety | 1 | 19,200 micro-USD | 5 CR |
| P44 | Video structure guide: Savi's Workshop effects, SWNN | 1 | 33,600 micro-USD | 7 CR |

Model/profile remain `gpt-5.4-mini-2026-03-17` / `gpt-5.4-mini-2026-03-17-o200k-v1`. No P42/P43/P45/P46, P07, Draft, `--repeat`, `--case` execution, rest stage, automatic continuation or repair call exists in this CLI. New maximum **2 attempts / 52,800 micro-USD ($0.0528)**; with the required historical baseline, **5 / 139,200 ($0.1392)**. Original global 40 / 2,000,000 also remains a gate. Usage estimates never replenish reservations; unknown usage is not zero-cost evidence.

### Why a new local D1

Current generation uses policy revision/default 5/7 CR, original-debit refund amount and durable monthly budget tables from 0019. The old evaluation DB is 0018. The handoff **does not migrate it**. A deterministic `mvp-smoke-e5b-v1/` child under its existing state directory holds a new isolated Miniflare DB, immutable new authorization and append-only budget journal. Both schemas use their real service/ledger/backup validators. A new DB is fixture isolation, not a new independent spending allowance.

The historical reader extracts trusted Git revision `684dcc5f2af3c706b994c1c73373fa6231ed7c84` to temporary scratch and invokes its official SELECT-only inspector. It validates the original approval configuration, complete journal chain, three admissions, all seven ledger rows, full P07 refund and exact reported cost baseline. It never starts the old Worker, copies private D1 data, runs migration or recovers old admissions. Local Git must contain this commit and dependencies must be installed. Scratch source is removed afterward. SQLite can update WAL shared-memory read marks; DB/WAL, approval and journal bytes remain unchanged in tests.

New authorization binds old **approval-file hash, journal tip, local digest and original expiry** to the new revision hash and exact scope. The original `budget.lock` is the single coordinator lease for authorization and execution. Bindings are reread under it before each case and each Provider reservation. Expired old approval is historical evidence, never renewed authority. New issue/expiry are fixed once, exactly 24h apart, and journal configuration binds them. Repeating authorization cannot extend them.

Before any funding/debit, a durable STARTED record prevents replay after a crash. Each transport attempt then appends and fsyncs its full maximum reservation before dispatch. Timeout, network failure and lost response consume the attempt/reservation even after Credit refund. Every settled case checkpoints the current local ledger/admissions/policy/monthly digest. Missing/corrupt files, changed bindings, nonterminal state, abandoned lock or partial initialization STOP. There is no automatic lock removal, DB recovery, campaign reset or retry. Even interruption after successful P41 prevents another smoke invocation; report the state for a separately reviewed decision.

This is a local operator's auditable authorization mechanism, not a tamper-resistant authorization server against an operator editing code/files.

## WSL procedure

Run one block at a time. Keep other evaluation processes closed. Never delete/rename real state to make inspection pass. Do not modify original `approval.json` hashes/expiry, budget journal, local D1 or old review deadlines.

### 1. Update and key-free regression

```sh
cd ~/projects/holocron-eval
git status --short
git fetch origin main
git log --oneline HEAD..origin/main
# Stop for local edits or unexpected source changes; review before continuing.
git merge --ff-only origin/main
pnpm install --frozen-lockfile
pnpm test:assistant-mvp-handoff
```

This test creates/removes only synthetic temporary histories and uses injected mock transport. It does not read a real key or user approval. Newer code must still match `live-revision.json`; never regenerate the manifest on the PC to bypass a mismatch.

### 2. Read-only audit / integrity / scope inspection — no key

```sh
pnpm assistant:eval:mvp:handoff inspect \
  --prior "$HOME/holocron-eval-private/approval.json"
```

Before first authorization expect `HANDOFF_PLAN_ONLY`, historical 3 / 86,400 / 13,083 / 7, expired original deadline, the reviewed revision hashes, two-case scope and `planToken`. This command creates no approval, budget reservation or D1. It checks actual PC files; the user-supplied prior audit alone is not sufficient. Missing data, R1 attempts or any different history stop. Share safe metadata only, never approval/journal/database contents or result bodies.

### 3. Explicit local authorization (user action only)

After reviewing the plan, replace the placeholder with that exact 64-hex `planToken`:

```sh
pnpm assistant:eval:mvp:handoff authorize \
  --prior "$HOME/holocron-eval-private/approval.json" \
  --plan '<PLAN_TOKEN_FROM_INSPECT>' \
  --confirm AUTHORIZE_P41_P44_ONCE
```

Expect `AUTHORIZED_NOT_EXECUTED`. Record its fixed `approvalId`/`expiresAt`; this authorizes no other cases. Repeated invocation reports the same deadline, not a new 24h window. Expired new approval requires a separate decision, not deletion/recreation. Partial initialization preserves its files and stops.

### 4. Separate explicit Smoke command

Use the existing WSL hidden-input environment path for **only** `HOLOCRON_EVAL_OPENAI_API_KEY`. The tool never falls back to collection or Production keys and never loads an env file implicitly. Do not place key values in command arguments, shell history, chat, Git or reports. If the dedicated variable is absent, stop for secure injection; no key-validation API call is made.

```sh
pnpm assistant:eval:mvp:handoff smoke \
  --prior "$HOME/holocron-eval-private/approval.json" \
  --confirm EXECUTE_P41_P44_ONCE
```

**This is the only command that can call the Provider. Work did not execute it against a real provider.** It runs P41 then P44, stopping at the first technical/settlement failure or insufficient result. Both program successes produce `SMOKE_PROGRAM_PASS_REVIEW_REQUIRED`, followed by STOP for owner content review. No rest command exists. No automatic paid judge or additional call occurs.

The real retrieval → receipt/selection → admission/debit → provider wire contract → output/freshness validation → settlement/replay path is reused. `store:false`, default service tier, no tools/stream/background/conversation, token/body/deadline caps and one transport per generation remain unchanged. Synthetic archive/receipt time is capture time plus monotonic elapsed time; authorization and retention use real wall time. The historical rechecks run inside the existing deadline; unusually slow local I/O can conservatively stop a request, not extend its deadline.

### 5. Inspect metadata and review privately, then stop

```sh
pnpm assistant:eval:mvp:handoff inspect \
  --prior "$HOME/holocron-eval-private/approval.json"
```

The command reports reservations, known usage estimates and unknown-usage count separately; it verifies the checkpoint and current ledger. If interrupted with a durable pending record, it reports `BLOCKED_INCOMPLETE_ATTEMPT`, consumed reservation and no claim of completed ledger audit. An abandoned coordinator lock remains STOP; do not remove it to retry.

Validated public result envelopes only are in:

```text
~/holocron-eval-private/state/mvp-smoke-e5b-v1/review/P41.json
~/holocron-eval-private/state/mvp-smoke-e5b-v1/review/P44.json
```

The actual parent comes from original approval `stateDir`, not a CLI override. Directories are private; authorization/journal/results use mode0600. No raw Provider payload, key, cookie, prompt or rejected prose is journaled. Failure reports allow fixed codes only; a rejected model output is never saved. Terminal metadata includes safe output diagnostics; semantic review remains NOT_REVIEWED until the owner reviews against unchanged `rubric.json`.

Review sources, factual support, uncertainty, natural Korean and useful concise guide structure—not just program PASS. Severe false facts/citations, secrets or duplicate debit are blockers. Do not publish bodies in chat, Git or CI. Keep only safe case/score/defect metadata.

### 6. Delete each validated body immediately after review, at latest within24h

```sh
pnpm assistant:eval:mvp:handoff delete \
  --prior "$HOME/holocron-eval-private/approval.json" \
  --case P41 --confirm DELETE_RESULT_BODY
pnpm assistant:eval:mvp:handoff delete \
  --prior "$HOME/holocron-eval-private/approval.json" \
  --case P44 --confirm DELETE_RESULT_BODY
```

Deletion is immediate and idempotent, independent of expiry/current revision; it touches result bodies only. Inspect confirms `reviewFiles: []`. No background deletion is promised. Existing historical P01/P05 retention deadlines also remain unchanged; overdue bodies must not be kept while waiting for this task. Preserve old budget/D1 separately. If review is not completed in time, delete and record UNREVIEWED. `store:false` and local deletion do not promise Provider ZDR.

## Remaining limits

Tests prove local Node/Miniflare mechanics with synthetic accounts/transport, not account/model access, real output quality, hosted Worker operation or Production AI acceptance. The user's current PC hashes and deadline are verified only when they run the inspection. Work has not accessed those files. Production remains outside this tool. No new 40-call campaign, approval extension, database restore/migration or P07 recovery is authorized.
