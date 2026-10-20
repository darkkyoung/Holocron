# E.5I — structural guide caveats (2026-10-20)

**IMPLEMENTATION PASS / SYNTHETIC VERIFIED — real-model quality NOT TESTED.**

Starting canonical (fresh fetch): `6fc7ac7b4ebbbd111ddcc16775fe0d1343501b0a`.
Final canonical is the commit containing this record; remote SHA/tree and clean
working tree are verified after publication, without embedding a circular self-hash.
Production v85 / 0019 / Assistant OFF is the owner-provided baseline. Work made no
Production requests/changes, live Provider calls, key reads or new live authorizations.

## Evidence and choice

Owner reports three P44 INVALID_OUTPUT / OFFICIAL_PROMOTION failures: E.5B and E.5F
at caveats[0].text, E.5H at caveats[1].text. Latest reported E.5H usage estimate is
4,416 micro-USD with full 7 CR refund; cumulative nine attempts / 244,800 reserved /
32,355 known usage micro-USD. These are owner-reported WSL results, not newly audited
private files. Rejected prose is absent, so actual false-positive versus fabricated
claim remains unknown. No recovery or reinterpretation of those failures.

The old guide required free-form caveat prose and then tried to reject unsafe
announcement claims lexically. E.5G also documented that unsupported caveat prices
could pass. This change removes that free-form channel rather than extending the
announcement expression allowlist.

Compared two designs:

1. Model-selected enum/types, evidence IDs and potentially support spans: still needs
   to verify whether a selected missing-information/uncertainty assertion is true.
   Exact support membership cannot establish semantic absence or an arbitrary
   contradiction; adding this contract would not solve that gap.
2. Empty provider caveats plus deterministic server notices: no new selector taxonomy
   or semantic parser, and no arbitrary caveat text reaches the public response.

Selected (2). Uncertainty is not removed: facts must retain actual qualified,
attributed alternatives; the existing support/certainty/uncertainty checks remain.
The server adds evidence-scope, literal qualifier, ordering and comparison notices.
The UI still displays the same caveat objects with citations. Specific differences
belong in grounded facts, not an unvalidated second prose channel.

## Implementation and compatibility

- `lib/assistant/output-schema.ts`: provider `caveats` remains required but
  `maxItems: 0`, for both ok and insufficient_evidence; TypeScript wire type is `[]`.
  Nonempty arrays fail ARRAY_LENGTH before grounding. They are never ignored,
  stripped or repaired. No arbitrary type/extra key accepted.
- `lib/assistant/guide-caveats.ts`: bounded server renderer, at most four public rows:
  conditional scope guidance; observations of fixed lexical qualifiers actually
  present in cited titles/summaries; `orderUncertain` warning; multiple-article
  comparison warning. Only constant labels/text and already validated citation IDs
  are emitted. Uncited sources cannot influence notices. No source instructions,
  HTML, arbitrary prices or other source prose are interpolated.
- `lib/assistant/output-validation.ts`: retains facts/support/certainty/announcement,
  unsafe prose/URLs, unsupported numbers/dates, outline references and Draft checks.
  After validation, derives public caveats from the used evidence. The 3,000-character
  total includes generated notices; generation's existing final 64 KiB cap remains.
  Insufficiency emits fixed explanatory text with empty IDs and unchanged refund.
- `lib/assistant/prompt.ts`: guide-specific empty-caveat contract; actual qualified
  facts and attribution remain required. Do not migrate unsupported claims into
  facts or creativeNote. Facts/outline prompt allowance is 2,400 characters to leave
  bounded notice room. Normally 3–5 sections and draft:[] remain.
- `components/assistant/assistant-result.tsx`: existing rendered sections unchanged;
  facts/outline clipboard text now includes caveats and their source URLs so these
  notices do not disappear when copied. Q&A copy layout is unchanged.
- Current-runtime P44, negation, attribution, generation and UI tests updated for the
  intentional wire change. Design document records the provider/public distinction.

Public API keeps `{text,evidenceIds}[]` with the same envelope/status/citation fields.
No request schema/version, DB migration, dependency, price, model/profile, admission
or settlement change. Provider wire schema changes intentionally; future pinned
live evaluation must use the new runtime. Full Draft still fails before admission.
No change to `official-claim.ts` or the Q&A announcement policy. Q&A instructions
remain byte-identical: SHA-256
`065eeff441395ee4d610282feea5302fa9dbddf190a57f6034632dd935891ea8`.

Runtime SHA-256: `0559656c7679972b9996d1088a927c6acc4d763a4c5ee02e724345b870997f9b`.
Pipeline SHA-256: `7f89bba635e7f44f3b4714c8cd73422d42e722d7bcf84c0f082dc2e070ccfdd1`.
No new live revision manifest was created. The unchanged E.5H loader returns
E5H_INTEGRITY_FAILED as expected; old grants cannot authorize this runtime.

## Fresh validation

All transports are synthetic/mock and D1 is isolated local Miniflare. P44 uses the
unchanged public corpus, question, Story/article and selected evidence. No fake
model-output reconstruction. Current-runtime tests, not a relabeled frozen suite:

| Check | Result |
| --- | --- |
| Structural P44 | 57 scenarios PASS; 18 full generation/settlement mocks |
| P44 normal variants | 3/4/5 sections, concise direction, paraphrase PASS; 7 CR consumed |
| P44 insufficiency | Fixed notice, empty references, full 7 CR refund |
| P44 rejected variants | Free caveat/official/price/booking; unsupported fact price/date, wrong IDs/spans, creative official claim; full refunds |
| P44 accounting | 7 completed (including 2 known semantic counterexamples), 11 refunded (10 invalid + 1 insufficient); exact ledger audit/replay PASS |
| Public/UI | No raw/internal diagnostics in errors; actual public envelope React SSR/copy/source links PASS |
| Q&A P41 | Unchanged instructions; full mock OK / 5 CR; no refund |
| Grounding negation | 196 cases PASS; wire caveats structurally rejected, fact/QA/outline/Draft rules retained |
| Attribution | 40 correct paraphrases; 18 deterministic rejects; 20 structural caveat rejects; 36 semantic limitations; 2 conservative embedded-denial limits |
| Generation | 1,596 assertions PASS |
| Provider | 84 assertions PASS; Node + workerd mock contract |
| Retrieval | 519 assertions PASS |
| Admission | 263 assertions PASS |
| Refund safety | 586 assertions PASS |
| Headroom | 1,173 assertions PASS |
| Credit policy | 262 assertions PASS |
| Assistant UI / workspace | 35 / 117 assertions PASS |
| TypeScript / build / diff-check | PASS |
| Lint | 0 errors; 1 existing unused debit warning |

Tests include source-qualified uncertainty and conflicting attributed dates, ignored
uncited metadata, injection text never interpolated into notices, unchanged raw model
object, schema/status limits, public body bounds, no double debit or transport on
replay, Account/Guest gate, receipt/evidence freshness, Full Draft pre-admission block,
kill switch and daily/monthly budget invariants.

Historical manifests, corpus/cases/rubric, original handoff tools and test fixtures,
private approvals/journals/D1/results were not edited. The old E.5G test's historical
observations remain in its commit/devlog; its current-runtime test now exercises the
new wire contract. Full frozen evaluation campaigns, CI/browser visual QA, actual
WSL audit and real Provider schema/model behavior were not run in this Work.

## Structural resolution versus remaining limits

Resolved: no free-form caveat can introduce an official announcement, price, booking
or schedule; even seemingly safe free prose is rejected rather than bypassed. A
normal model must emit [] and the server always supplies useful scope guidance.
No need for the model to phrase a negation that fits an announcement regexp.

Not resolved: substring support does not prove who spoke or whether creativeNote is
factual. The full mock test deliberately shows speaker reassignment and fabricated
creativeNote still passing; these are NOT quality passes. Moving a false claim into
another unconstrained field remains a semantic risk. Existing official promotion,
numeric support and uncertainty gates are retained, not claimed to solve all meaning.
Qualifier notices observe known text patterns only: no exhaustive contradiction,
negation, speaker or uncertainty understanding is asserted. Human review must compare
facts and source context, including any nuance not captured by these notices.

## Before any future paid evaluation

Freeze a separately reviewed revision for this changed provider contract, re-audit
all nine prior attempts and preserved refunds on the owner's PC, and obtain explicit
scope/budget/expiry/retention approval. Do not reuse E.5H or rewrite its hashes. A
future minimal P44 check must verify model schema compliance, usefulness, exact
attribution, scoped uncertainty versus real-world nonexistence and creative facts.
Repeated failure should trigger structural review rather than endless reauthorization.

**Real-model quality NOT TESTED. New Provider calls ZERO. Production changes ZERO.**
No release decision, no new live approval, no automatic retry and no evaluation budget
reset. GitHub publication is not Production deployment.
