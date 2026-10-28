# Simple Account chat

Base canonical: `122ed56cbe597c6c8b532a64fd3525bb9fb17dde`.

Q&A defaults to general chat, with a separately selected archive-news path.
General chat submits `mode: chat`, a bounded question, UUID and policy version;
it creates no retrieval or Receipt. The `qa` Admission action and its existing
D1 atomic ledger debit, Account principal, account/global rate limits, cost
reservation, policy revision, request HMAC, replay protection and settlement are
reused. A contract discriminator is included in the HMAC. Model/profile and
5 CR QA policy are unchanged; there is no additional 1 CR search charge.
No DB schema, Migration or Backup change is required.

The existing Responses client sends a short system instruction and the user
message in a single-field strict JSON schema; validated answer text is rendered
as React text, never interpreted as HTML. No article references are fabricated.
The UI explains general knowledge is not verified current news. A selected news
search still uses the original paid retrieval, Receipt and evidence checks;
Planner is unchanged. Provider failures and invalid output use the same refund,
unknown-settlement, request-local administrator diagnostics and WARN path.

Validation: local Miniflare D1 + Mock Provider exercised the actual UI session
hook → HTTP → Account Admission → output → credit settlement for greeting and
general-knowledge prompts, 5 CR, duplicate click and same-UUID replay; invalid
output was fully refunded with admin diagnostic; bad origin, missing Account,
forged fields and AI OFF blocked. Existing news 1+5, Planner 1+7, no-result,
refund and Replay regressions passed. Packaged Worker + isolated D1 and Mock
Provider also exercised general chat. 1440px/360px Chrome Mock preview verified
chat, 5 CR, no search and opt-in news 1+5 CR. TypeScript, lint, build, diff-check,
Admission, provider, retrieval, headroom, Credit, Backup and diagnostics passed.
Existing lint warning in test-assistant-refund-safety remains. Real Provider
calls, Production changes and real Credit use: zero. No claim of Production GPT
success. Separate release and paid Acceptance approval required.
