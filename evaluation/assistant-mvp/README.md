# E.4 — bounded MVP evaluation preparation

**Historical preparation contract:** the E.4 manifest and cases/rubric remain frozen. Current main intentionally fails that old pipeline/tooling check after 0019. For the separately approved two-case handoff, use [E.5B instructions](LIVE_HANDOFF.md) and `live-revision.json`; do not edit the E.4 manifest or resume R1/P07. The sections below document the original E.4 command, not the new authorization.

**Preparation only. No spending authorization, live transport or output retention is enabled by this command.** Q&A costs 5 CR; video structure guide uses the existing Planner at 7 CR. Full Draft is a rejection control only, never a paid evaluation. No P07 retry/revision is offered.

## Executable commands (no key)

```sh
pnpm assistant:eval:mvp                 # bounded preparation + mock-only rejection controls
pnpm assistant:eval:mvp --mock          # all six paid-path doubles + four free controls
pnpm test:assistant-mvp-evaluation
pnpm assistant:eval:mvp --inspect-prior "$HOME/holocron-eval-private/approval.json"
```

Run from the canonical repository root. Unknown options, `--live`, `--repeat`, user-selected state and campaign mutation options fail closed. The runner does not read any API key, call a network transport, write result bodies or accept a Production DB. Each dry/mock invocation creates and cleans its own synthetic temporary D1 and budget; this is test isolation, **not a reset of live spending**. Neither the old evaluation command nor R1 should be resumed for this scope.

## Fixed six-case proposal

| New ID | Mode | Perspective | Selected public Story | Future stage |
| --- | --- | --- | --- | --- |
| P41 | Q&A | Normal | Hal Hickel's production approach, Variety | smoke |
| P42 | Q&A | Compare sources | LEGO crossover, Variety and StarWars.com | owner-gated rest |
| P43 | Q&A | Limited evidence | Naomi Ackie's experience/aspirations, THR; no confirmed return | owner-gated rest |
| P44 | Guide | Normal | Savi's Workshop effects upgrade, SWNN | smoke |
| P45 | Guide | Compare sources | LEGO crossover versus fan challenge, Variety and StarWars.com | owner-gated rest |
| P46 | Guide | Limited evidence | Epic's reported development delay, SWNN; no named game/date/cancellation certainty | owner-gated rest |

`cases.json` fixes exact Story/Article IDs, questions, allowed/forbidden claims and mandatory caveats. P41/P44 are the only proposed initial two live calls. P42/P43/P45/P46 require an explicit **owner continuation decision after reviewing both smoke results**, even if program checks pass. Errors/timeouts/lost responses stop without retry. Negative controls S41–S44 cover Guest, expired receipt, no evidence and excluded Draft; all require zero provider attempts. Do not count them among the six paid tasks.

The set and rubric were reviewed by **Work (agent)** before live outputs; **not owner/human-reviewed**. Reuse of a historical basis case is explicitly labeled. New IDs and manifests prevent confusing this set with E.3.2.

## Corpus and reproducibility

Reuse the byte-identical `../assistant/public-archive.json`: public Newsroom RSC projection from `https://holocron.kr/`, captured **2026-10-17T13:29:12.349371Z**, version `public-home-2026-10-17-v1`, SHA-256 `acd78cd254bc8bb716bbf4f3bafb87bd6e2d3e1dab4618f8b63faff4bc9cce48`. Public source URLs and effective title/summary/date/category/Story IDs only; no user/Account/Credit/Guest data. No new Production access occurred. It is **not a current primary D1 snapshot**; article-level Work relations are unavailable, so these cases use lexical retrieval. Selected articles fall within the snapshot's 90-day policy. The existing logical evaluation clock anchors retrieval and signed receipts to capture time plus monotonic elapsed time; wall-clock approval expiry and retention must remain separate.

The new manifest pins cases/rubric/current Assistant pipeline and supporting tool bytes; it does not replace any historical manifest. Existing deterministic retrieval, selected-evidence/receipt checks, token budget, strict schema, grounding, final freshness, atomic debit, settlement and replay are exercised through `evaluateCase` and real local Miniflare D1. The existing injected mock transport gives a deliberately simple valid excerpt/outline, **not a model simulation or proof of useful 3–5-section prose**. No alternate prompt/validator is used.

## Cost and historical carry-forward

Fixed model/profile: `gpt-5.4-mini-2026-03-17` / `gpt-5.4-mini-2026-03-17-o200k-v1`. Calculations use the unchanged code profile (16,000 input; 1,600/4,800 output; $0.75/$4.50 per million input/output tokens, default tier), not a new live account/pricing verification.

- Q&A maximum reservation: 19,200 micro-USD; Guide: 33,600.
- Two smoke calls: **52,800 micro-USD ($0.0528)**.
- All six planned calls: **158,400 micro-USD ($0.1584)**.
- Proposed new ceiling: **6 attempts / 200,000 micro-USD ($0.20)**. No approval is implied.
- User-reported prior: **3 attempts / 86,400 reserved / 13,083 usage-estimated micro-USD**.
- If independently reconciled: planned combined **9 / 244,800**, combined ceiling **9 / 286,400**, within the original **40 / 2,000,000**. The original remaining 37 attempts are not a fresh grant. No extra 40-attempt campaign.

The prior inspection reads private approval, journal configuration/chain/tip and local SQLite with the existing SELECT-only inspector; validates all seven historical ledger entries, three admissions, usage figures, 15 CR full refund and no unsettled obligations. Missing state, differing history (including an R1 attempt), expired/changed approval or an active/abandoned coordinator lock cannot authorize new calls. Expiry is explicitly reported even when the historical audit passes. It never extends expiry or creates/replaces approval, budget or D1. SQLite may update WAL shared-memory read marks; DB/WAL bytes and logical rows are preserved in tests. Close other evaluation processes before inspecting; this is a point-in-time audit, **not an execution lock or future budget authorization**.

### Exact remaining live prerequisite

There is intentionally **no executable live MVP command in this preparation revision**. The old coordinator cannot simply open a new scope under an old configuration, and changing old approval hashes would invalidate its journal binding. Before implementing/enabling the minimal live handoff, obtain the PC audit and an explicit owner decision for the new hashes, up to 6 additional attempts/$0.20, a fixed new deadline (without changing the old expiry), and validated-output retention. The smallest handoff must bind the new approval to the old approval hash/journal tip/local digest and keep carry-forward totals; recheck under the existing coordinator lock before each reservation, count uncertain failures fully, persist new attempt reservations before dispatch, and refuse changed history. A separate explicit owner continuation record is required for the four rest cases. Do not silently treat `--smoke-reviewed` as owner permission.

This deferred handoff is a specific **live-execution blocker**, not a reason to add a general campaign platform. The preparation and mock test are usable now. Do not create a new approval/stateDir or edit the old approval in response to inspection failures. Preserve the user's original state and resolve the reported mismatch first.

## Content review and privacy

Program PASS and semantic PASS are separate. Use `rubric.json`: each dimension gets 0/1/2 or NOT_REVIEWED; verify actual support, sources, uncertainty, Korean, question fit/guide utility, short structure and no narration. Report all six denominators, not only successes. Severe invented claims/citations, leaks, duplicate debit or settlement mismatch block launch. Both smoke results need content review; normal tasks cannot pass by refusing everything. This is a small pilot, not universal quality assurance.

Metadata reports already include case/mode, retrieval/code, attempts, reservation, usage estimate, latency, charged/refund/settlement, safe diagnostic and NOT_REVIEWED. No result text or question is logged. Future authorized semantic review may retain only validated public envelopes privately for at most 24h, delete immediately after review; no raw provider response, CI artifact, permanent transcript or user identity. Retention is **not newly approved here**. Old P01/P05 deadlines still apply; expired unreviewed bodies must be deleted while keeping budget/D1. No background deletion or provider ZDR promise.

## PC next minimum procedure

```sh
cd ~/projects/holocron-eval
git status --short
git fetch origin main
# Stop on local edits or unexpected remote changes; review the diff first.
git merge --ff-only origin/main
pnpm test:assistant-mvp-evaluation
pnpm assistant:eval:mvp --inspect-prior "$HOME/holocron-eval-private/approval.json"
```

Share only the safe metadata report (no approval contents, keys, journal rows or database files). **Stop here.** No `apply`, P07, old live command, new approval creation or key entry. A missing or different PC baseline remains BLOCKED; Work has not inspected that PC. Provider access, current account availability, live quality, hosted Worker behavior and Production AI remain NOT TESTED. Existing UI/browser acceptance is not rerun or upgraded by this work.
