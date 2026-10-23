# Output diagnostics and scoped uncertainty guard

- Starting canonical: `c5a7af787db471952600d1bf9fb20a41b8c6263c`
- Historical Production acceptance: one search charged 1 CR; two QA attempts, each debited/refunded 5 CR; final balance 9 CR; reserved $0.0384, known usage estimate $0.009989. The actual rejected output reason and second request's trigger remain UNKNOWN. No raw output recovery is possible from the retained records.
- This change is code/mock preparation only. No Production deployment, new paid request, DB write, migration, historical manifest or ledger change.

## Change

The Production generation route now creates a request-scoped observer. It emits only `ASSISTANT_OUTPUT_DIAGNOSTIC_V1` and the existing allowlisted stage/reason/path. No question, evidence, span, output, request/account identifier, receipt, cookie, IP or credential is accepted. One event per HTTP request and 20 events/minute/isolate are the upper bounds; multi-isolate aggregate logging is not a global cap. Existing admission limits still apply. Synchronous and asynchronous sink failures are swallowed without affecting settlement. Public API response diagnostics remain unchanged and opaque.

The previous uncertainty guard used every title and entire summary for every fact. It now examines each exact cited span's complete enclosing sentences, including every repeated occurrence. Adjacent connective/subjectless caveats and even non-adjacent sentences sharing explicit topic tokens are retained. Titles remain conservative qualifiers. Title-only support retains the whole summary, so it cannot evade qualification by omitting the summary. Official-promotion checks still use the full original context. Numeric/date and exact span/ID validation are unchanged.

Example: `개봉은 내년으로 예정돼 있다. 감독은 현장에서 모형을 사용했다고 설명했다.` A fact citing the second complete sentence can report the director's explanation without adding uncertainty about the unrelated release. A truncated `제작` citation from `제작은 논의 중이다.` still cannot become `제작이 확정됐다.` Neighbouring `아직 확정되지 않았다.` remains a qualifier.

## Limits

This is a bounded lexical correction, not semantic entailment. Same-sentence unrelated clauses and qualified titles may still be conservatively rejected. Paraphrased subjects or distant implicit references cannot be reliably resolved by this guard. Existing attribution tests deliberately demonstrate that valid source/span references do not prove who said what: 36 synthetic speaker/meaning errors remain prompt-only limitations. Source-ID substitution and fabricated speaker support spans are rejected, but general speaker swaps are NOT claimed solved. None of these synthetic examples establishes the cause of either historical Production rejection.

## Validation

- Current output-hardening test: 36 QA/guide grounding cases; content-free observer sanitization, one-request dedup, isolate cap/window reset, sync/async logging failure isolation; outbound zero.
- Current grounding negation: 196 cases PASS.
- Current attribution: existing accept/reject/semantic-limit expectations PASS.
- Current generation with isolated Miniflare D1: 1,652 assertions PASS, including real observer wiring through generation, full 5 CR refunds despite sink exceptions, no public diagnostic leakage, replay without a second mock transport call.
- TypeScript/lint/build PASS. Final broader regressions are recorded with the companion consent change. The retrieval privacy assertion now permits exactly the one bounded output logger console sink; all other Assistant modules still forbid console logging.

Deployment is a separate approval. To observe a future failure, deploy this route and verify Worker log access before a separately approved single paid acceptance. Do not repeat a paid call just to obtain a diagnostic or expose rejected text.
