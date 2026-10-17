# E.3.2 smoke failure investigation — content-free diagnostics

Starting canonical: `245fe76ddb0acdec22ad349f962b0a9c41b1bbaa`, independently fetched. This record is dated 2026-10-18 KST. The final publication SHA is the commit containing this record, reported after remote verification. Scope: diagnosis and mock/local regression only. **Work made ZERO live calls and did not access Production, request keys, deploy, change UI, migrations, backup, Credit policy, model, prompt or acceptance criteria.**

## Evidence and confidence

The following is **user-reported WSL2 execution**, not a live run performed or independently observed by Work. Work cannot access `~/holocron-eval-private` on the user's PC.

| Case | Result / settlement | Input / output tokens | Usage estimate (micro-USD) | Debit / refund |
| --- | --- | --- | --- | --- |
| P01 Q&A | OK / completed | 974 / 223 | 1,734 | 5 CR / none |
| P05 Planner | OK / completed | 1,345 / 801 | 4,614 | 7 CR / none |
| P07 Draft | INVALID_OUTPUT / failed | 1,581 / 1,233 | 6,735 | 15 CR / requested 15, applied 15, forfeited 0, full |

Reported totals: **3 attempts**, reserved **86,400 micro-USD ($0.0864)**, usage estimates **13,083 micro-USD ($0.013083)**, local ledger **7 entries**, `STOP_UNEXPECTED_RESULT`. These amounts agree arithmetically with the existing cost profile and three funding/debit pairs plus one refund. This is not an independent audit of the PC ledger or external invoice. All three semantic reviews remain **NOT COMPLETED**.

Under the reported canonical code, a non-null admission actual-cost estimate requires parsed and accepted usage. This narrows P07 away from outer-body/outer-JSON failures before `usageOf`, assuming the report and code revision match. It does **not** prove output JSON parsing or valid schema, citations, support, uncertainty or draft links. Envelope metadata/message validation after usage can still fail. The rejected raw P07 response was not retained by policy; this investigation neither obtained nor reconstructed it.

## Independent contract review

- `provider.ts` previously collapsed content type, outer JSON/object, response metadata/status/message shape, usage and inner output JSON into public `INVALID_OUTPUT` (with existing separate timeout/refusal/output-limit codes).
- `output-schema.ts` uses the same schema sent to Responses; local trim/nonempty checks and aggregate text limits are additional deliberate validators. Passing structured JSON does not prove grounding or draft conformity.
- `output-validation.ts` collapses IDs, spans, citation URLs, certainty, numbers, date ordering, fact references and creative boundaries into the same error. P07 can hit any applicable branch; no specific branch can be assigned retrospectively.
- Exact draft fact text concatenation with one space is explicitly present in **both prompt and validator**. A paraphrase or changed whitespace is rejected by design. Synthetic tests show schema-valid paraphrase rejection, not a confirmed prompt/validator mismatch or proof of the live failure.
- The fixed P07 corpus and production pipeline accept the existing synthetic valid Draft transport. This excludes an always-failing fixture under that double; it is not evidence that the real output was valid.
- A separate synthetic **lexical over-rejection** is reproduced: a supported named-title phrase containing `First Jedi`, with date-only ordering uncertainty, triggers `DATE_ORDER` although it makes no source-order claim. The regex matches `first` anywhere, without linguistic context. This is a real limitation of the existing heuristic, **not a demonstrated cause of P07**. The rule remains unchanged. A separately scoped proposal is to distinguish ordering assertions from quoted/named titles while preserving rejection of genuine earliest-source claims; adversarial tests and explicit review would be required before changing it.

No hypothesis-specific prompt/model/schema/grounding relaxation was made. The diagnostic gap is addressed; **P07 root cause remains unknown**.

## Minimal diagnostic path

`lib/assistant/output-diagnostic.ts` defines a fixed reason-to-stage map and normalized schema path allowlist. Existing provider/schema/grounding checks attach only this metadata. Paths are built from schema field names and bounded array indices, never model-provided keys, evidence IDs, fact IDs or text. Unknown values normalize to fixed fallbacks. No raw exceptions, spans, URLs, prompt, response text, credentials or headers are observed.

`generation.ts` offers an optional server-owned `onOutputDiagnostic` dependency, used only by the evaluation runner. Public routes do not install an observer and public error envelopes remain unchanged. Only the first failed check is reported, not all defects. Observer absence, synchronous exceptions and asynchronous rejections cannot replace the original error or change settlement. There is no console logging or diagnostic D1 storage. `evaluate.mjs` includes the safe object in its metadata report; the cost journal format remains unchanged.

**Synthetic examples only — not the missing P07 output:**

```json
{"stage":"draft","reason":"DRAFT_FACT_TEXT","path":"$.draft[0].text"}
```

```json
{"stage":"grounding","reason":"SUPPORT_SPAN","path":"$.facts[0].supports[0].span"}
```

```json
{"stage":"output_json","reason":"OUTPUT_JSON","path":"$"}
```

Additional classes distinguish outer body/JSON/envelope, schema type/length/keys/enums, unknown references, unsafe citations/prose, missing support, official promotion, lost uncertainty, unsupported numbers, date ordering and creative boundaries. No numeric/text values are necessary to classify these first failures. `INVALID_OUTPUT`, HTTP status, usage handling, one-call limit, replay and capacity-first refunds are preserved.

## Revision and campaign safety

- Old implementation: `245fe76ddb0acdec22ad349f962b0a9c41b1bbaa`.
- Old pipeline hash: `3033f845d991bbdde172d0ee01c233dfe723d4b54d5bb7589ec789f19804037c`.
- Diagnostic candidate pipeline hash: `62bf4041d3e3952f609a4cf300964a3f8752b0c2860128f3ba18523e4c48dfa4`.
- `manifest.json` is explicitly `evaluation-v1-diagnostics-candidate`. Corpus, cases and rubric bytes/hashes are unchanged. The schema/prompt sent to the model, profile, limits and judging conditions are unchanged; production module bytes necessarily differ.
- The old approval is **intentionally incompatible** with the candidate. No automatic hash rebinding, journal rewriting, fresh campaign or deadline extension is provided. Tests preserve three historical reservations totaling 86,400 while rejecting changed configuration.

The PC's approval ID and fixed expiry have not been read by Work. Keep its existing `approval.json`, `state/budget.jsonl` and `state/local-d1` unchanged. The total remains **40 attempts / 2,000,000 micro-USD**; reported remaining capacity is at most **37 attempts / 1,913,600 micro-USD**. A new P07 attempt would consume one of those 37; it leaves at most 36 calls for the 37 other originally unexecuted paid tasks. A Credit refund never restores call/cost budget.

Safe PC preparation (no live command):

```sh
cd ~/projects/holocron-eval
git status --short
git fetch origin main
git diff --stat 245fe76ddb0acdec22ad349f962b0a9c41b1bbaa..origin/main
# Review; stop if local edits or unrelated remote changes exist.
git merge --ff-only origin/main
pnpm test:assistant-output-diagnostics
```

Do not run `--live`, edit the old approval hashes, erase folders, delete the budget/local D1, or create a new campaign. Before any candidate live evaluation, separately approve the exact new revision and a **controlled same-campaign revision transition**. The smallest proposed transition would verify the old journal chain/configuration and local ledger, append an explicit revision authorization record bound to the prior tip, preserve every reservation, the same approval ID/state directory, absolute 40/$2 caps and original expiry, and report each revision separately. Such a transition tool is **not implemented or authorized by this diagnosis**; current mismatch rejection is retained. If the original expiry has passed, stop and request an explicit deadline decision without resetting consumption. Re-evaluation approval must specify the limited case/call allowance; no automatic retry or rest execution is permitted.

P01/P05 validated result files on the PC retain their original 24-hour deadlines. Review and delete each body promptly; if not reviewed by the deadline, delete and record **UNREVIEWED**, preserving the content-free journal. Startup `--purge` removes only expired files, not newly reviewed ones. Work did not inspect or delete PC files and does not claim deletion. No rejected P07 raw output should be recovered, requested or newly stored.

## Verification and remaining status

The focused test exercises normal Q&A/Planner/Draft, synthetic P07, malformed response/JSON/schema, evidence/support/fact references, draft exact text, uncertainty/numeric/date/creative limits, malicious strings, public response redaction, observer failure isolation, unchanged full refunds, real D1 ledger audit and old-campaign conflict protection. All transport responses are synthetic and real outbound is blocked. Earlier real smoke metrics remain user-provided evidence, distinct from these tests.

| Final local check | Result |
| --- | --- |
| Every current non-browser `test:*` script via sequential `pnpm run <name>` | **53/53 PASS** |
| `pnpm test:assistant-output-diagnostics` (included above) | **315 assertions PASS**; **41 local ledger entries** audited |
| Existing `test:assistant-evaluation` | **301 assertions PASS**; 46 cases / 40 mock attempts, real outbound ZERO |
| Existing generation / provider suites | **1,422 / 84 assertions PASS**, including workerd transport/tokenizer coverage |
| `pnpm lint` | PASS, zero errors; existing refund-safety unused-variable warning only |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS |
| `git diff --check` | PASS |

Code diff review confirms unchanged regexes, thresholds, public failure codes/status, exact draft comparison, prompt/schema definition, profile, token/deadline configuration, settlement and budget rules. Schema array iteration still checks missing/sparse members in direct synthetic calls. First error classification has finer labels; it does not waive any existing rejection. No raw failed response storage was added. No UI/browser rerun was needed or claimed.

**E.3.2 remains BLOCKED**: P07's original cause and all live semantic scores are unresolved. Candidate diagnostics do not establish model quality, hosted Worker behavior or Production AI acceptance. No additional live call, Production access/change, AI activation or key operation occurred.
