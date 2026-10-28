# Request-local admin output diagnostics and search precision

Starting canonical: `998162cdb4c4ccb22400ff4a56da30d2a1635ce4`
Starting tree: `ecb218f220bdec8c1512daa6e5d6d533e1b75cd3`

## Scope and historical evidence

The latest Production INVALID_OUTPUT reason remains UNKNOWN. This change does
not recover a past model response or prove why the historical NYCC Story was
selected. Production v96 / environment 64 stays AI OFF / MAINTENANCE; this work
does not access or mutate Production data, deploy, or call a real Provider.

## Administrator diagnostic delivery

The actual Generate route wraps its existing handler with a request-local
observer. It retains the first sanitized OutputDiagnostic and forwards it to
the existing bounded WARN logger. After settlement, an INVALID_OUTPUT response
receives these headers only when `getAdminSession()` verifies the existing
signed administrator session:

- `X-Holocron-Output-Stage`
- `X-Holocron-Output-Reason`
- `X-Holocron-Output-Path`

The existing stage/reason/path allowlist is reused. Missing observations become
`UNKNOWN` on an authorized INVALID_OUTPUT response. Account login alone,
forged or expired administrator cookies do not grant access. The public JSON
body and settlement remain unchanged; no CORS exposure is added. Responses
remain private/no-store with Vary: Cookie. Logger or administrator verification
failure cannot replace the settled error or suppress its refund. There is no
global diagnostic slot, persistence, raw output, query, article text, request
identifier, receipt, or account information in the headers.

For a separately authorized future one-request Acceptance, open Chrome Network
before execution and inspect the existing `/api/assistant/generate` request's
Response Headers. Report only the three header values. Do not copy Cookie,
Authorization, request payload, receipt or a full HAR. Missing headers do not
prove the model's failure reason: administrator authorization or diagnostic
delivery itself may be unavailable. Never resend to obtain headers.

## Search behavior

The old candidate rule accepted any scored term. A broad franchise mention or
stray number could therefore qualify unrelated news. Korean particles were not
recognized, so `제작비와` missed `제작비`.

The bounded lexical helper now keeps original words and adds common Korean
particle-stripped matching variants; it does not replace original proper names.
General query phrases and the exact copy label `질문 복사` are ignored. Numeric
terms retain ranking weight but cannot alone qualify a query with lexical core
terms. Standalone four-digit years and alphanumeric names remain supported.
Franchise words do not substitute for more specific topic terms. One core term
requires a match; longer queries require at least two and half the core terms
(rounded up), rather than an exact phrase or every word. One article in a Story
must meet this coverage; separate unrelated members do not combine coverage.
Catalog resolution, mandatory linked-work filtering, archive bounds, selection
limits and Receipt contracts remain unchanged.

Synthetic examples verified with isolated D1 / snapshots:

| Query / evidence | Result |
| --- | --- |
| 스타워즈 스타파이터 제작비와 관련된 최근 소식을 알려줘 | Budget Story selected; NYCC publishing and IMAX excluded |
| Same question with 질문 복사 and 4. | Same budget Story |
| 스타파이터의 제작비를 알려주세요 | Budget Story |
| 스타파이터 제작비 상세 | Two core matches suffice; no full-query match required |
| Only unrelated publishing article available | insufficient_evidence, 0 CR, no Provider attempt |
| 2027 / R2 D2 / 제다이 / 레이 / 시즌 2 / 50주년 IMAX | Meaningful year, name and numbered news queries preserved |

This is lexical precision, not semantic understanding. Synonyms and complex
Korean morphology remain limitations; stricter coverage may return no evidence
more often. It never manufactures a replacement result to charge for.

## Validation

- `test:admin-output-diagnostic`: signed/forged/expired/Account-only access,
  concurrent request isolation, UNKNOWN, allowlists, auth/logger failures.
- `test:assistant-retrieval`: 633 assertions, including relatedness, catalog
  links, receipts, evidence freshness and read-only snapshot behavior.
- `test:account-assistant`: real local D1, successful search 1 CR, no-result
  0 CR, Q&A 5 / Planner 7, full INVALID_OUTPUT refund with admin headers even
  when logger throws, replay, lost response, concurrency and global limits.
- `test:assistant-generation`: 1,628 assertions PASS after updating only the
  route test's administrator-session dependency stub.
- `test:account-assistant-built`: actual packaged Worker + Miniflare D1 + Mock
  transport; current Q&A/Planner success contracts, signed administrator
  response headers, forged/expired cookie rejection, four content-free WARN
  events, exact refunds, replay and full wallet/ledger audit. The old test's
  pre-MVP support-span fixture was updated to the current output contract;
  grounding rejection is still tested with an unknown evidence ID.
- Provider, Admission, refund safety, headroom, workspace, MVP diagnostics,
  Credit Policy, Backup, Site Visibility, News Work, Admin Auth and Racing PASS.
- TypeScript, lint, build and diff-check PASS. Lint retains one pre-existing
  unused-variable warning in `test-assistant-refund-safety.mjs`; no new errors.

Output Validator, model/profile, 1/5/7 CR prices, Provider limits, Migration
0020, Backup v10, historical evaluation records and collection code are unchanged.
Real Provider calls: 0. Production changes: 0. No new deployment or paid test is
authorized by this implementation. Production delivery of the new headers is
pending a separate release and one explicitly authorized Q&A Acceptance.
