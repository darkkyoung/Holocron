# Final Assistant MVP simplification — local acceptance

Starting canonical: `f82d932f47690ebe33a0b2301bdc2ccc872cf17e`, tree `a22088587e614fd5f3880f18dab5d140419b31fc`. Implementation and mock validation only. Production baseline reported by owner: v95 / environment 62 / AI OFF / MAINTENANCE / migration 0020 / backup v10. No Production operation or real Provider request was performed.

## Product contract

Only **뉴스 Q&A** and **영상 구성안 플래너** remain in the overlay and direct `/assistant` workspace. Q&A returns a natural Korean answer, selected article IDs and limitations in a four-field structured response. It no longer asks the model to construct exact support spans, per-fact certainty or sentence proofs. The planner returns title ideas, direction, article recommendations with reason/key points, and sections with purpose, concrete points, evidence and transition. It does not produce narration, full scripts, images or videos. The unused Draft Preview component is removed; server Full Draft rejection remains.

Source titles, dates, publishers and safe links are assembled from the selected server evidence. The model cannot supply URLs or arbitrary extra fields. The validator retains bounded shape/text/ID/link checks, unsupported-number screening and narrow official-announcement/uncertainty-promotion guards. Provider-envelope validation, evidence freshness/fingerprint, ownership, receipt expiry and the final revalidation remain unchanged. Server caveats supplement planner limitations.

These are lightweight checks, not semantic entailment or sentence-level certification. The current attribution test explicitly retains 45 known semantic counterexamples that the lightweight validator cannot reject. Prompts instruct preservation of speaker, uncertainty, negation and source, but this does not prove real-model compliance. Earlier Production INVALID_OUTPUT causes remain UNKNOWN; this change does not retroactively diagnose them or prove a GPT quality improvement.

## Payment and UI behavior

Account-only successful search 1 CR, Q&A 5 CR and planner 7 CR remain separate charges. The existing explicit combined consent, one-generation intent, extra-cost reconfirmation, replay/idempotency, lost-response protection, refund/capacity rules, rate limits and Provider budgets are unchanged. No model/profile, migration, backup, historical manifest or ledger changes.

Success, failure and uncertain settlement now replace the previous running notice. Refund-pending locks further paid requests. Natural paragraphs and planner cards include server-linked sources, limitations, copy and expandable scope details. Closing/reopening preserves the existing in-memory result without triggering requests. No persistent conversation memory was added.

## Validation evidence

- `test:assistant-generation`: 1,628 assertions on real isolated Miniflare D1 and Mock Provider, including 5/7 CR, evidence-change rejection, no Draft admission, replay, failure/refund, capacity-first compensation, cancellation/recovery, privacy and public-response byte cap.
- `test:account-assistant`: no-CF authenticated access, Origin/auth checks, 1 CR search, no-result/no-charge, concurrency/idempotency, lost-response recovery and rate limits; actual UI hook → HTTP → D1 → Mock Responses QA 1+5 and planner 1+7, failed/refunded intent, separate consent and replay.
- `test:assistant-provider`: fixed profile, token budget and mock Node/workerd transport; no external Provider connection.
- `test:assistant-output-hardening`: 24 acceptance/rejection scenarios, content-free logger bounds/dedup/privacy. `test:assistant-grounding-negation`: 184 checks. Attribution: 52 allowed paraphrases, 15 blocked cases, 45 documented semantic limits. No broad claim of automated factual verification.
- `test:assistant-mvp-output-diagnostics`: 103 checks for the new output paths/envelope. This is a current-contract test; the old frozen historical diagnostics script and E5/E6 manifests remain untouched and were not used to certify the new contract.
- `test:assistant-ui`: 35 assertions; `test:assistant-workspace`: 155, including receipt/tab state, explicit additional consent, pending settlement and terminal notice.
- `test:assistant-retrieval`, `test:assistant-admission`, `test:assistant-refund-safety`, `test:assistant-headroom`, `test:credit-policy`, `test:credit-foundation` (103), `test:site-visibility`, `test:backup`, `test:announcement`, `test:news-explorer`, `test:quiz`, `test:scheduled-collection`, `test:admin-ux`, `test:racing`: PASS.
- TypeScript / lint / build / diff-check: PASS. Lint retains one pre-existing unused `debit` warning in `test-assistant-refund-safety.mjs`; zero errors.

## Chromium evidence

The local-only `browser-qa/build-mvp-preview.mjs` bundles actual overlay/workspace/result components. All fetches are intercepted; synthetic article fixtures use `example.invalid`, and the same output validator constructs successful mock results. This is not Production content or a real model answer. Run `node browser-qa/build-mvp-preview.mjs <temporary-output-directory>` and serve that generated directory through the supported local preview workflow.

Verified desktop 1440×900 and mobile 360×800: both result types, natural answer paragraphs, planner article reasons and detailed sections, result scrolling, copy with server reference links, Escape/close/focus return, reopen without additional request, mode switching and the direct-workspace view. At 360px, measured document and dialog width were 360px with no horizontal overflow. Real mobile OS keyboard and assistive-technology behavior were not independently tested.

Additional browser failure fixtures confirmed terminal notice + full-refund message and refund-pending disabling search/generation/additional consent. Screenshots delivered: `holocron-mvp-qa-desktop.jpg`, `holocron-mvp-planner-desktop.jpg`, `holocron-mvp-qa-360.jpg`, `holocron-mvp-planner-360.jpg`.

## Release boundary

No Production deploy, AI activation, paid search, Provider call, Credit adjustment, scheduler run, SWNN edit, migration or restore. The existing AI OFF / MAINTENANCE state was not changed or freshly audited here. Account/billing/admission and generation settlement implementations, Racing, collection, backup and migration files remain unchanged.

Next action requires separate approval for this exact source tree: deploy with AI OFF and MAINTENANCE, verify packaging/basic service protection, then separately authorize a bounded real-user acceptance. Mock success is not Production GPT success. Old support-schema evaluation results must not be relabeled as validation of this new contract. No new campaign or large evaluation is required by this implementation record.
