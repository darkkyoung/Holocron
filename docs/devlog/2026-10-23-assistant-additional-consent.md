# Explicit additional generation consent

Starting task canonical: `c5a7af787db471952600d1bf9fb20a41b8c6263c`.
Companion output diagnostic / uncertainty commit: `70527d389e0e7bd1515df63271bbbd7c9d3098c4`.

## User-visible behavior

One combined `질문하기 · 최대 6 CR` submission continues to make at most one search and one generation request. After any generation attempt, the manual action changes to `추가 생성 비용 확인`. Opening it costs nothing. A separate `추가 5 CR 사용에 동의하고 생성` (guide: 7 CR) confirmation is required before creating a new UUID. Cancellation costs nothing. A fresh explicitly priced combined search submission is still a new consent, not a replay of an old consent.

The confirmation is bound to mode, question, filters, instructions, receipt, selected Story IDs, policy version and quoted price. Changes are rechecked on confirm. A synchronous in-flight guard and synchronous consumption of the pending confirmation prevent double-click dispatch. Closing the panel revokes pending confirmation; reopening and mode changes never execute it. Expiry and server evidence ownership/fingerprint validation remain unchanged. Selection changes retain the previous failure/refund notice until a new explicit request begins.

Unknown settlement, pending refunds, lost responses and failed responses without a refund receipt block additional payment. An inconsistent refund-shaped body cannot override `refund_pending` or `unknown` in displayed settlement text. Generation validation failure, input/evidence issues and unknown settlement have separate headings; evidence insufficiency retains its existing non-fabricating result/refund behavior.

## Boundaries

This is explicit UI consent enforcement, not a new server-issued payment token or a per-receipt server attempt cap. Existing server Account authentication, UUID idempotency, quotas and costs still apply to direct API requests. Page reload is not claimed to recover an unretained generation result; users with uncertain settlement are told not to reload/retry and to obtain a settlement check. No migration, price, Provider profile, server budget or historical evaluation manifest was modified.

The historical two Production requests' rejected reasons and trigger for the second remain UNKNOWN. This patch does not establish an automatic retry or user click as the historical cause.

## Validation

All tests used synthetic data, Mock Responses and isolated local D1. Real Provider outbound: ZERO.

- Workspace handlers/rendering: 154 assertions PASS, including first failure, no automatic follow-up, separately priced consent, cancel, close/reopen, changed selection, duplicate confirmation, refund-pending/missing-receipt block, lost response, expiry and policy drift.
- Real UI hook -> Account HTTP -> local Miniflare D1 -> Mock Responses: initial QA 1+5 / guide 1+7; failure/full refund; opening confirmation causes no transport/debit; explicit second consent creates one new UUID; replay of it creates no new transport/debit/refund. PASS.
- Output hardening: 36 grounding scenarios + sanitization, rate bound, dedup and sink-failure checks PASS.
- Generation: 1,652 assertions PASS. Grounding negation: 196 cases PASS. P44 structural caveats: 57 scenarios PASS. Existing attribution semantic-limit fixtures remain explicitly classified as limitations.
- Current Provider, Retrieval, Admission, Refund Safety, Headroom, UI, Account Assistant, Credit Policy/Foundation, Guest Rewards, Google Account, Site Visibility, Backup, News Work, Admin UX/Auth, Quiz, Scheduled Collection and Racing suites PASS.
- TypeScript, lint, build and diff-check PASS. Lint retains one pre-existing unused `debit` warning in `scripts/test-assistant-refund-safety.mjs`.
- No new real Chromium or Production visual acceptance was performed; handler/static-render tests are not represented as browser visual QA.

## Release handoff

Production remains outside this change: no deploy, environment change, AI activation, paid request, Credit adjustment, migration, restore, scheduler operation or site visibility change. Last confirmed operational baseline is v91/environment 59, AI OFF/MAINTENANCE.

A separate release approval must name the final source/tree. After deployment, check content-free Worker log access and the two-step additional-payment UI with mocks/local testing before a separately authorized small acceptance. Such acceptance should stop after the first generation result, preserve the actual UUID and settlement, and never make an additional paid request merely to obtain a diagnostic. A hard server-side single-call acceptance cap is not introduced by this UI change.
