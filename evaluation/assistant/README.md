# Closed Assistant evaluation — E.3.1

> **2026-10-18 scope correction:** this frozen evaluation includes Full Draft and is historical. Current product generation accepts Q&A and the 7 CR guide only. Its changed pipeline deliberately fails this manifest's integrity check; do not update the old manifest/approval/journal to resume it. No live P07 retry or old smoke/rest continuation is part of the new scope. A separate Q&A/guide evaluation scope and authorization/budget decision is required. Existing PC consumption (user-reported 3 calls / 86,400 reserved micro-USD) and all original history remain consumed and untouched.
>
> The four `test:assistant-evaluation`, `test:assistant-output-diagnostics`, `test:assistant-evaluation-revision`, and `test:assistant-evaluation-clock` commands now explicitly run historical mock regressions in a temporary checkout pinned to `2ec1a2b05862f7ccb4a9b7426c59f14268411e02`. Their assertions are preserved, not relabeled as current MVP acceptance. They use synthetic temporary D1, never the PC campaign or live transport. Git history containing that revision and installed dependencies are required; the wrapper does not fetch or initialize a campaign. Current `test:assistant-generation`, provider/admission/Credit/UI suites validate the revised MVP, including old evaluation fail-closed behavior.


This is an operator-only Node tool using **local Miniflare D1**, not a public endpoint, hosted deployment or AI activation. Default: **dry-run**. No real provider call was authorized or made in E.3.1. An API key merely existing never selects live mode. Nothing here imports the collection configuration or uses `OPENAI_API_KEY`.

**E.3.2 investigation checkpoint:** the owner reports three live smoke attempts on WSL2; P07 stopped with `INVALID_OUTPUT`. This revision adds content-free failure diagnostics and is a **mock-validated candidate**, not authorization to resume that campaign. The pipeline hash changed; old approval/journal conflicts intentionally stop. Preserve the consumed 3 calls / 86,400 micro-USD, original expiry and local D1. See [evidence, diagnostics and required revision-transition decision](../../docs/devlog/2026-10-18-smoke-output-investigation.md). Do not replace approval hashes or reset state to run the live examples below.

## Run now, without a key

From the canonical repository root with its existing dependencies:

```sh
pnpm assistant:eval
pnpm assistant:eval --mock
pnpm test:assistant-evaluation
pnpm assistant:eval:review --template
```

Default/dry-run performs actual local retrieval, receipt verification, selection, production prompt construction and token budgeting, with **no generation debit or provider attempt**. Mock runs the actual `handleRetrieve` → `handleGenerate` / `generateArchive` → admission/debit → production `callResponses` with an injected HTTP response → output/freshness validation → settlement. Account creation/funding uses existing identity/Credit services **only in isolated local D1**. All versioned migrations are applied there unchanged. No server or browser is needed.

Each invocation without `--state` creates a temporary private directory outside Git and removes it on normal exit. For mock resume testing, use `--state /absolute/private/directory` (0700). A persistent budget must never be deleted/replaced to gain more live budget. The ordinary test/build/browser commands cannot enter live mode.

`local-runtime.mjs` transpiles the existing modules through the repository's existing test loader. The orchestration runs in Node; SQL/triggers run in real Miniflare D1. Existing `test:assistant-provider` separately exercises tokenizer vectors in workerd. This is **not hosted Worker/provider acceptance**.

## Reproducible corpus and review status

`public-archive.json`: official public **GET https://holocron.kr/**, captured **2026-10-17T13:29:12.349371Z**, version `public-home-2026-10-17-v1`, **45 Stories / 77 Articles**. The page's own serialized Newsroom projection had `initial:false`; source-enabled filtering, persisted topics and the public window were already applied by the deployed page. All members of each included Story are preserved. Only IDs/topic, effective title, summary, URL, source label, date and category become local Article evidence. No body/image, user/auth/Guest/Credit/security data was collected. No publisher scraping or new Production backup was used.

A preliminary read of `/api/news` returned a broader published-only list (89 Articles); it was **not** used as the corpus because that route does not implement the public page's source/window projection. The raw page/API download is not committed. `import-public.mjs` can safely extract a future explicit public-page HTML download without executing its JavaScript:

```sh
node scripts/assistant-eval/import-public.mjs /private/download.html /private/new-corpus.json 2026-10-17T13:29:12.349371Z
```

That command never replaces the reviewed fixture automatically. Any new corpus needs new criteria/review and hashes. `manifest.json` binds exact corpus/case/rubric bytes and all production Assistant TypeScript modules. Live approval must match these hashes.

Limitations: this is a frozen **public page projection**, potentially subject to the ordinary public cache, not a current primary-D1 export. Public page Work links are Story unions; original Article-level Work relations/season catalog are unavailable. Those public unions are recorded as provenance only, not fabricated as D1 relations. Public cases deliberately use lexical retrieval in the captured corpus; explicit Work/season/ambiguity behavior uses clearly synthetic local Work rows. This set therefore does not establish parity with every current Production Work filter. Published summaries themselves can contain mistakes or overly broad topic groupings; criteria require attribution rather than treating the corpus as external-world truth. Original publisher factual correctness was not independently verified.

`cases.json`: **46 tasks**: **30 real public-archive tasks** (P01–P30) and **16 synthetic adversarial/boundary tasks** (S01–S16). Modes: Q&A 32, Planner 5, Full Draft 9. Each has selected Story/allowed Article IDs, allowed claims, mandatory caveats, forbidden claims and expected behavior. The generated grounding bundle is still rebuilt by the production evidence selector (maximum three Articles per Story); the runner rejects any unreviewed ID. No model output was used to rewrite criteria. Reviewer: **Work (agent), not the owner or a human reviewer**. Human review and real model quality remain pending.

`rubric.json` separates schema/support membership from semantic truth. `assistant:eval:review` creates a score template or validates a completed private score file. Every task needs an explicit review; missing reviews fail closed. It reports normal useful completion separately from negative safe handling, plus mode/origin denominators. Any severe false fact, fake citation, secret/hidden-data leak, duplicate debit or settlement mismatch blocks acceptance. Normal useful completion must reach 85%; negative safe handling 100%; normal Korean readability/planner usefulness/draft separation average at least 1.5/2, and factual safety dimensions 2/2. Rejecting everything cannot pass. **No automatic model judge exists.**

## Later live execution — separate approval required

**Do not run the following in E.3.1.** After the owner approves the exact profile, maximum calls/cost, secure key provision and optional output retention, place a private approval JSON outside Git:

```json
{
  "approvalId": "eval-owner-approved-identifier",
  "model": "gpt-5.4-mini-2026-03-17",
  "profile": "gpt-5.4-mini-2026-03-17-o200k-v1",
  "maxCalls": 40,
  "maxMicros": 2000000,
  "corpusHash": "COPY_FROM_manifest.json",
  "casesHash": "COPY_FROM_manifest.json",
  "rubricHash": "COPY_FROM_manifest.json",
  "pipelineHash": "COPY_FROM_manifest.json",
  "expiresAt": "OWNER_APPROVED_FUTURE_UTC_TIMESTAMP",
  "stateDir": "/absolute/private/holocron-evaluation",
  "retainValidatedOutputsHours": 24
}
```

The example is deliberately invalid and cannot authorize a call. The manifest is an operator acknowledgement/configuration, not proof of an authorization server or protection from a malicious operator editing code/files. The **same state directory and approval ID** must be used for smoke, continuation and deliberate re-evaluation. Corpus/profile/budget changes conflict with the existing journal; do not erase it or create another approval to evade total limits.

Safe key path: after approval, an OpenAI Platform secure picker, if exposed by the execution environment, can provision a dedicated evaluation key to an explicitly confirmed ignored local env file. This session does not expose the Codex secure-picker entry point; no setup was attempted. The owner can instead inject it through their local secret manager into **`HOLOCRON_EVAL_OPENAI_API_KEY`**. Never send the key in chat/CLI arguments, reuse the collection key, commit the env file, or upload it to CI. This runner does not load `.env`/`.dev.vars` or provision anything. For a confirmed ignored env file, Node's `--env-file=/absolute/path` can be used to inject it; the command contains a path, not a key. Account/model access is still unverified until an authorized call.

After secure environment injection:

```sh
pnpm assistant:eval --live --approval /private/approval.json --stage smoke
# Stop. Review the three actual results (P01 Q&A, P05 Planner, P07 Draft).
pnpm assistant:eval --live --approval /private/approval.json --stage rest --smoke-reviewed
```

The rest gate requires all three recorded smoke completions and explicit operator review. It is not automatic quality approval. Unexpected output/technical errors stop the run; no automatic repair/retry. `--case P01 --repeat` is an explicit new attempt (same stage rules), consumes the same cumulative budget, and cannot exceed it. With all 46 cases, **40 Provider attempts** are expected and six cases reject before a call. A re-evaluation consumes one of those 40 slots; remaining cases then stop at the ceiling unless a separately reviewed new budget decision is made. No automatic unlimited continuation.

## Aggregate budget, recovery and storage

- Exact existing profile: 16,000 maximum input; Q&A 1,600 output, scripts 4,800. At $0.75 / $4.50 per million uncached input/output tokens, maximum reservation is **19,200 / 33,600 micro-USD** ($0.0192 / $0.0336).
- Three-call smoke maximum: **$0.0864**. Full planned 40-call mix: **$0.9696**. Any 40-call mixture at the script maximum: **$1.344**. Suggested aggregate cap remains **40 attempts / $2 estimated admitted spend**, not yet spending authorization or an external invoice guarantee (taxes, changed prices, other project traffic are separate).
- Check the next maximum reservation before generation; fsync its append-only budget event before outbound dispatch. An exclusive coordinator lock and serialized journal operations prevent local concurrent over-admission. No locks/tables added to Production.
- Every attempted dispatch, including timeout/refusal/unknown response, permanently consumes a call and full reservation. Known validated usage and production admission actual estimated cost are recorded separately; **even known lower usage does not replenish this evaluation's conservative cap**. Credit refund never replenishes provider budget.
- Journal hash chain/config binding, 0600 files and outside-repository 0700 directory; corrupt/truncated/conflicting journals fail closed. Resuming skips all previously reserved case attempts, including interrupted ones. Session/network fixture separation never resets aggregate accounting.
- Local D1 admissions/Credit persist when an explicit state directory is used. Resume first performs existing expired-refund recovery without another provider call. A lock left by a crashed process requires manual confirmation that no runner is alive, then removal of **only** `budget.lock`; never truncate the journal or delete local D1. Permanent storage loss cannot be automatically reconstructed: STOP and reconcile separately.
- A service result committed but lost before review cannot be recovered (no hidden transcript or retry). Budget remains consumed. D1/browser/provider delivery are not one transaction.

Default output is metadata only: case IDs, status, bounded error codes, usage, latency, aggregate costs and Credit settlement; no raw prompt/response/secrets. The local D1 contains only the public/synthetic input corpus and synthetic test identities/ledger; no generated text.

For output rejection the report can additionally contain `diagnostic: {stage, reason, path}`. These are fixed code/schema labels and indices from the unchanged production checks; no rejected text/IDs/URLs are captured. The public API still returns its original safe error. This field is not a semantic quality verdict and cannot retrospectively diagnose a previously discarded response.

For **separately approved** semantic review, `retainValidatedOutputsHours:24` saves only validated public result envelopes under `stateDir/review/` (0700 directory, 0600 files). No raw provider JSON, cookies or identity metadata is saved. Review with a local plain-text JSON viewer; do not upload to Git/CI/public reports. Inspect against frozen case criteria and put scores in a private review file. Rejected raw model text is not retained, so some over-rejection diagnoses remain unavailable without a separate decision.

Delete review files immediately after review and **within 24 hours**. The runner purges expired files on startup; use the following explicit maintenance command without any key:

```sh
pnpm assistant:eval --purge --state /absolute/private/holocron-evaluation
```

There is **no background deletion service**: the operator must run purge/delete by the deadline; exact-time physical deletion during a stopped/unavailable machine is not guaranteed. Keep the content-free budget journal until the approved campaign is reconciled. Deleting outputs does not delete budget. Output retention is a pending approval, not a change to Production's permanent-transcript prohibition.

## Runtime and provider limits

Production profile/prompt/schema/deadlines are unchanged: one Responses request, fixed endpoint, `store:false`, `service_tier:default`, reasoning `none`, no tools, background, streaming, prior response/conversation or retry. Model snapshot lifecycle/pricing was rechecked 2026-10-17; see the E.3.1 devlog for official sources. `store:false` is **not** ZDR; standard abuse monitoring can retain data up to 30 days. Local o200k BPE plus the existing 1,024 framing allowance remains an estimate, not invoice token truth. Native fetch is used; no new SDK/dependency.

E.3.1 checks execution safety and mock wiring. Real Korean usefulness, semantic grounding, live provider behavior/access, hosted Worker networking and Production/AI activation acceptance remain **NOT TESTED**.

## E.3.2-R1 — one diagnostic P07, same campaign

The R1 tool implements the previously proposed transition, without changing the production pipeline or granting general continuation. **No live call was made by Work.** It recognizes only the user-reported original smoke checkpoint: P01/P05 completed, P07 failed with full 15 CR refund; three reservations totaling 86,400 micro-USD, usage estimate 13,083, seven ledger rows. These are **comparison criteria, not a claim to have inspected the PC**. Any discrepancy stops; the tool never overwrites actual state with those values.

`assistant:eval:revision inspect` requires the existing private approval, journal and local D1. It does not initialize or recover them. It reads the Miniflare SQLite file using Node's built-in `node:sqlite` in read-only/query-only mode and one read transaction, validates SQLite integrity and the existing migration marker, then reuses the production v6 backup validator and evaluation ledger audit. It checks original admissions against debit/refund proof. A missing/ambiguous/corrupt local store stops. This supports the repository's pinned Miniflare persistence layout (one database, excluding its metadata database); it is not a hosted D1 probe. Node >=22.13 is required. Temporary module compilation is outside the campaign; no new D1 is created by inspection.

`apply --confirm --plan-token ...` takes the existing coordinator lock, repeats inspection and appends/fsyncs **one** revision event linked to the previous journal tip. The plan token binds that tip, local ledger/admission digest, exact original approval file bytes and reviewed tool revision. It preserves the original configuration record, every old line, approval ID/file, state directory, expiry, model/profile, corpus/cases/rubric and total 40 / 2,000,000 ceilings. Duplicate application with the same token is idempotent; changed plans and concurrent ownership fail closed. A partially written line stops rather than being repaired. A durable transition whose acknowledgement was lost is safely recognized on reapplication. No separate mutable authorization file or cross-file commit is needed.

Only `3033f845…04037c` → `62bf4041…48dfa4` is allowed. The production manifest remains unchanged. `diagnostic-transition.json` separately freezes evaluation-tool bytes; the record also binds these bytes. Supporting `lib/`, `db/`, `drizzle/`, lockfile and test-loader content must match canonical `917d828…`. Unreviewed runtime/tool changes stop. This is an explicit local-operator record, **not an authentication server or protection against an operator deliberately modifying code and hashes**.

The dedicated `p07 --live` command has no case/stage/repeat override. It holds the same lock through inspection, existing local-D1 generation, settlement and audit. Only P07 on the candidate can reserve **one** additional 33,600 micro-USD. The reservation is fsynced **before** the injected/native transport. It references the revision event and candidate hash. A second command, concurrent caller, timeout, lost response or unfinished reservation cannot reclaim that allowance. Existing global caps are also checked. Expected totals are 3 / 86,400 before and immediately after transition, then 4 / 120,000 after reservation. Credit refund does not reduce either counter. Success always stops for review, with no smoke/rest continuation. The report includes `outputDiagnostic` (null on no output-validation failure) plus the existing safe result metadata, not rejected text.

An unresolved `started`/`refund_pending` obligation is reported and preserved; this tool does not run recovery during inspection/transition or silently discard it. After a consumed attempt no new dispatch is allowed even if settlement/response acknowledgement is missing. Operator-led recovery/reconciliation is a separate decision. An original checkpoint mismatch, missing journal/D1, storage corruption or changed tool/approval is also a STOP, not a reason to reset state.

### PC handoff (commands are implemented and mock-tested)

**R1 local-regression follow-up (2026-10-18):** if the original mock test stopped at `EVIDENCE_CHANGED`, use the [clock-stability investigation](../../docs/devlog/2026-10-18-evaluation-clock-stability.md) and stop after the keyless `inspect` in this handoff. Do not apply or dispatch as part of that investigation. The new tool revision is intended for an original campaign where `apply` has **not** run; an already recorded different tool hash still fails closed. Never edit approval/journal hashes to bypass it.

The harness now advances synthetic archive time using integer monotonic elapsed milliseconds. Approval expiry, journal timestamps and review-file retention still use real wall-clock time; no deadline is extended. Ten-minute receipt expiry and explicit expired-receipt cases remain enforced by production code. Preparation failures emit content-free `evaluationDiagnostic` metadata (fixed reason, case ID, bounded time differences and binding equality); the revision regression also identifies the baseline ordinal. These diagnostics do not retain or print cookies, receipts, signatures or rejected output. They stop the run without retry.

1. Review local edits and remote changes before a fast-forward. Stop for local edits/unreviewed changes; do not reset or force anything.

```sh
cd ~/projects/holocron-eval
git status --short
git fetch origin main
git log --oneline HEAD..origin/main
git diff --stat HEAD..origin/main
# Only after the review above:
git merge --ff-only origin/main
pnpm test:assistant-evaluation-clock
pnpm test:assistant-evaluation-revision
```

2. **No key required.** Inspect the actual existing campaign:

```sh
pnpm assistant:eval:revision inspect --approval "$HOME/holocron-eval-private/approval.json"
```

Require `TRANSITION_READY`, verified original totals, no unresolved obligations and an unexpired original approval. Record the printed `planToken`. If `APPROVAL_EXPIRED`, stop and request an explicit deadline decision **for the same consumed campaign**; R1 has no extension option. Work has not read the PC's actual expiry. Private parent directories/files must be 0700/0600; never replace their contents to satisfy a check.

3. Only after the operator explicitly approves the displayed plan, replace the placeholder below with that exact token (not an API key):

```sh
pnpm assistant:eval:revision apply --approval "$HOME/holocron-eval-private/approval.json" --plan-token COPY_PLAN_TOKEN --confirm
pnpm assistant:eval:revision inspect --approval "$HOME/holocron-eval-private/approval.json"
```

Require `REVISION_APPLIED` and unchanged 3 / 86,400. Do not edit `approval.json` hashes or the journal, choose another state directory, or run the ordinary `assistant:eval --live` smoke/rest commands.

4. Through the **existing hidden local key-input/secret injection path**, supply only `HOLOCRON_EVAL_OPENAI_API_KEY` to this shell/process. The command contains no key and the runner does not load env files automatically. Do not use the collection key. Then explicitly run **once**:

```sh
pnpm assistant:eval:revision p07 --live --approval "$HOME/holocron-eval-private/approval.json"
```

5. Review the safe report, then STOP, even if P07 succeeds. No rest or retry is authorized by this transition. Re-run read-only `inspect` if needed; an expected consumed result is `BLOCKED / DIAGNOSTIC_ATTEMPT_CONSUMED`, not budget corruption. A failure's diagnostic describes the **new response**, not the discarded historical P07.

Original P01/P05 bodies retain their original 24-hour deadlines. Inspection/application does not extend or touch them. Review and delete bodies within the original deadline; if not reviewed in time, delete and leave them **UNREVIEWED**. The existing `--purge` command removes only expired files; it does not delete a newly reviewed output immediately. Delete each reviewed body explicitly, retaining journal/local D1. A new valid P07 envelope may be privately retained under the original 24-hour permission, tagged with its revision, then deleted after review. No failed raw output is saved. There is no background deletion guarantee. Do not run new evaluation if deletion by the deadline cannot be ensured.
