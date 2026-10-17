# Closed Assistant evaluation — E.3.1

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
