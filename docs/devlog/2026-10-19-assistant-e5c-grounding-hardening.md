# AI E.5C — grounding denial handling

Date: 2026-10-19. Verdict: **IMPLEMENTATION PASS / SYNTHETIC VERIFIED**.

## Scope and evidence

Fresh fetched starting canonical: `56ccdf818ea1acbb6bf695b4c87723ae3ae88491` (clean). This is canonical-only work: no Production access, deployment, environment change, D1 write/migration/restore, Provider call or live authorization. Production v85 / 0019 / AI OFF is the supplied baseline, not newly inspected here. The user's subsequent PC/mobile browser PASS is user-provided evidence, not an agent browser run.

User-reported E.5B P41 was program OK/5 CR, semantic NOT_REVIEWED; P44 failed `INVALID_OUTPUT`, grounding `OFFICIAL_PROMOTION` at `$.caveats[0].text`, with 7 CR fully refunded. Both authorized attempts are consumed. The rejected P44 body was not retained. **Its actual cause remains undetermined**; synthetic reproduction does not recover that response.

Before edits, the current validator rejected all nine requested Korean/English synthetic denials as `OFFICIAL_PROMOTION` at the caveat text path. The original regex matched the affirmative substring inside e.g. `공식 확인되지 않았다.` and `Not officially confirmed.` without inspecting local negation. This is a demonstrated code false positive, not a finding about missing live text.

## Minimal implementation

- `lib/assistant/official-claim.ts`: one bounded lexical helper scans each official-announcement occurrence independently. Only listed adjacent complete Korean denials or narrow English negative clauses are exempt. Another affirmative occurrence still rejects. Double negation, conditional/embedded denials and ambiguous quotations remain conservative. Short intervening Korean object words are recognized so `공식적으로 개봉일을 확정했다` is not missed.
- `lib/assistant/output-validation.ts`: reuse the helper in facts/Q&A, caveats, outline and the legacy Draft boundary. Outline heading and creativeNote are checked separately; a negative fragment in another field cannot complete a denial. English `not officially announced/confirmed` joins existing uncertainty detection so denial evidence cannot become explicit official support or silently lose uncertainty.
- `scripts/test-assistant-grounding-negation.mjs` and its package command: direct **current checkout** tests, independent of frozen evaluation manifests.
- `scripts/test-assistant-generation.mjs`: current real local D1 + mock transport integration for allowed denials, rejected mixed claims, 5/7 CR settlement/refund, replay and public diagnostic redaction.

The official source + explicit support span + certainty requirements are unchanged. No prompt/schema/model/profile, retrieval/admission/settlement, pricing, quota, backup or migration change. Full Draft remains rejected before admission. Its stricter existing creative-prose checks (including `확정`) remain in place even where a negative phrase would be acceptable in an MVP caveat.

This is not a natural-language entailment engine. Unrecognized negation and quotations may still be conservatively rejected; accepted wording alone does not prove that its assertion is supported. Existing exact support/reference, uncertainty, number/date, URL, size/schema and safety checks still apply. No sentence-wide “contains a negative word” exemption exists.

## Validation

Fresh results (no real Provider outbound):

| Scope | Result |
| --- | --- |
| Before-change current validator | 9/9 requested synthetic caveat denials falsely rejected |
| Current `test:assistant-grounding-negation` | 196 cases PASS |
| Current `test:assistant-generation` | 1,596 assertions PASS |
| Current `test:assistant-provider` | 84 assertions PASS; includes real workerd mock boundary |
| Current `test:assistant-retrieval` | 516 assertions PASS |
| Current `test:assistant-admission` | 263 assertions PASS |
| Current `test:assistant-refund-safety` | 586 assertions PASS |
| Current `test:assistant-headroom` | 1,173 assertions PASS |
| Current `test:credit-policy` | 262 assertions PASS; daily/monthly budget and v7 contracts |
| Historical `test:assistant-output-diagnostics` | 315 assertions PASS at `2ec1a2b05862f7ccb4a9b7426c59f14268411e02` |
| Historical `test:assistant-mvp-handoff` | 132 assertions PASS in isolated `be6965ab058291b107b5767201e400386829e5c7` worktree |
| Current `test:assistant-mvp-handoff` | Expected exit 1: `MVP_LIVE_INTEGRITY_FAILED`; not counted as PASS |
| TypeScript / build / diff-check | PASS |
| Lint | exit 0; existing unused `debit` warning in test-assistant-refund-safety.mjs |

The 196 current cases cover 13 denial formulations and 20 affirmative/mixed/ambiguous formulations across facts, Q&A, caveats, heading and creativeNote, plus field boundaries, official certainty/source gates and other grounding/schema restrictions. Generation integration confirms full 5/7 refunds for rejected mixed claims, one mock attempt, unchanged debit on valid output, no second debit/call on replay, and no internal diagnostic in the public API.

Historical results validate their historical implementations only. Neither frozen runner nor manifest was changed. Unrelated full UI/browser and all-repository suites were not rerun; no live model quality or hosted Worker acceptance is claimed.

## P41 review-file audit (code only)

The user's actual WSL private files are inaccessible to Work. `reviewFiles: []` establishes absence at inspection time only, not why the file is absent or whether it ever existed.

Current code sequence:

1. `evaluateCase` validates/settles the public result, records safe budget finish metrics, checks balance and replay, then awaits `onResult` only in live mode for `ok` or `insufficient_evidence`.
2. `live-smoke` passes `retainOutput` as that callback. It writes only the validated public envelope, never rejected output/raw Provider payload. Directories use 0700, exclusive files 0600; file and directory are fsynced. Envelope size is bounded to 60,000 bytes.
3. Creation and expiry are exactly 24 hours apart using wall time, separate from approval expiry. `reviewFiles` reports expired files; it does not automatically delete them. No background deletion is provided.
4. A returned full smoke report lists current file metadata only after awaiting retention. However, a budget `OK` record alone precedes file retention and does not prove a successful write. Write errors propagate to the safe CLI failure path rather than being silently ignored.
5. Explicit `delete --confirm DELETE_RESULT_BODY` deletes the selected body immediately and is idempotent; it does not delete budget/D1. It returns `RESULT_BODY_ABSENT` whether already absent or just deleted. No durable retention/deletion receipt distinguishes those cases later.

Therefore missing-directory/file, explicit deletion, external cleanup or a failure after budget finish cannot be distinguished from the observed empty listing alone. No cause is assigned to this user's file, no response was recovered, and semantic review remains NOT_REVIEWED. Retention code, periods and logs were not expanded. Do not regenerate a paid answer to replace the missing body without separate approval.

## Evaluation preservation and next gate

- E.5B pinned runtime remains `5eceed3e369e8284d6c5aba448b73805c386900fad79fae9aaba77e55165e77f`.
- Starting F.5A runtime: `53cf576efd0a20afd7bb5196d6fd6153d39bae96e929e8e547f7a6b52a6f508e`.
- E.5C current runtime: `8de16912f50f7d3f2aa6b97319c31212b5131e15f0dbc6220716ba6c83ac1534`.
- E.5C current pipeline: `f87a9c60e76995c99a1e779dbaa3c83b462a3bf59d7e8b9430c36588f3eb25bd`.
- Corpus/cases/rubric/tooling hashes still match their pinned bytes. Existing manifests, approvals, budget journals and user PC D1 were not changed or reset. No new live revision/approval was created.

The current integrity rejection must remain. Any future paid evaluation requires a separately reviewed revision, exact scope/budget, new explicit authorization and retention terms, with all previously consumed attempts/reservations carried forward. P41/P44 semantic quality is unreviewed and actual P44 causality is unknown. Production AI release remains NO-GO pending those independent quality/operational gates.

This commit records implementation and synthetic verification only; it is not deployed.
