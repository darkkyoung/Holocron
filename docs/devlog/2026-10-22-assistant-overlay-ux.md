# Assistant overlay and controlled question flow

Starting canonical: `0db55f7a77f71061b5aeb53d13cf0fc232e2f6f7`, tree `b966d03458b8615b1da5630afadfdc1f8883d78c`.

The preceding independent commit fixes Receipt visibility invalidation. This commit replaces the enabled news launcher navigation with an in-page dialog and shares the same conversation surface with `/assistant`.

## UX and request contract

- Native modal anchored to the lower-right launcher, maximum width 960px; mobile bottom sheet, internal scrolling, safe-area footer, reduced-motion CSS. Initial input focus, explicit Tab/Shift+Tab loop, Escape, close button and launcher focus restoration.
- Question and video navigation. Filters are collapsed. No input alone causes a paid request. Google Account and server policy/balance remain required.
- “질문하기 · 최대 6 CR” quotes search 1 CR plus QA 5 CR. Guide quotes 1+7 CR. One explicit consent executes search and, only after a ready paid result, a valid Receipt, eligible recommendations, unchanged policy and sufficient refreshed balance, one generation. No automatic retry.
- Up to three ranked candidates are recommended; the existing QA 6 / guide 8 selection caps and server 12-candidate cap are unchanged. All candidates remain available behind “근거 더 보기”. A separate search-only 1 CR action permits manual review and subset selection before explicit additional generation.
- Response-first layout, numbered citations and source cards. Detailed Story IDs/verification metadata are collapsible. Copy still includes attribution, source URLs, caveats and scope. No raw HTML interpretation.
- Synchronous in-flight guard spans both stages. Closing during search prevents a newly chained generation. Closing during an existing request does not cancel or restart it. Reopening retains the current question/result in memory; reload is not transcript persistence.
- Search response-loss recovery reuses the original UUID/digest/time. Unresolved different inputs cannot silently start a new search. Recovery can proceed with a depleted balance and never chains a generation under the previous consent. Generation with uncertain settlement blocks further spending in the current session, gives no refund assurance and must be reconciled; the existing server does not retain generated answers for recovery. Do not reload and retry with a new UUID.
- Real server expiry and Evidence changes still block generation. No backend authentication, Receipt TTL, fingerprint, ownership, rate-limit, budget, provider, prompt or output validator changes.

## Video draft boundary

The video tab offers the existing **영상 구성 가이드**, not a renamed screenplay. A separate disabled draft input/result preview is explicitly “준비 중”; it has no submit action, price or Provider contract. Future Full Draft requires a separately approved product/input/output contract, grounded fact versus creative narration rules, price/policy revision, admission/settlement/refund/replay tests, bounded token and API budget, and deployment/paid acceptance authorization. Historical 15 CR is not an active quote or authorization.

## Verification

- Current UI: workspace 136 assertions; result/copy/server-page SSR 36; enabled/off launcher 18. Includes one-minute tab absence, allowed subset, query/filter changes, exact expiry, real server error presentation, full/partial/unknown settlement, same-UUID lost-search recovery, duplicate submit, policy drift, close/reopen permission and no-result/clarification stopping.
- UI hook + actual HTTP handlers + isolated Miniflare D1 + mock Responses: successful QA 1+5 and guide 1+7, duplicate clicks, durable Receipt and zero-charge/no-generation no-evidence path. Account test also covers authentication without CF, Origin, rate limits, concurrency, lost response, refunds and budget rejection. No external Provider transport.
- 34 related suites passed: Assistant UI/workspace/launcher/floating controls/retrieval/admission/refund safety/headroom/attribution/grounding negation/generation/provider/P44; Credit policy/foundation/Guest rewards/Google Account/policy UI/Guest UI; Site Visibility/Backup/Announcement; News-work/News explorer/Stories/Quiz/Scheduled Collection/Collection Health/automatic SWNN images/Admin auth/Admin UX/Racing/public navigation/public performance.
- Generation regression: 1,596 assertions, 5/7 CR, freshness/output validation, replay, compensation and public-API privacy. Historical frozen evaluation manifests and approval records were not changed or relabeled.
- TypeScript, lint, build and diff-check PASS. Lint retains the pre-existing unused `debit` warning in `test-assistant-refund-safety.mjs`; no new errors.
- Chromium, actual new components in an isolated synthetic harness, at CSS viewport sizes 1920×1080, 1440×900, 943×905, 390×844, 360×800. Large iframe viewports are visually scaled to fit the remote browser; these are not claims of physical-device tests. Verified animation/overlay, initial focus, Tab wrap, Shift+Tab wrap, Escape/launcher focus, mode switch, long input wrapping, internal scroll, one-consent result and 100→94 mock balance, closed/reopened question and answer, and shared direct-page surface. Screenshots are synthetic, not Production responses.
- Actual mobile virtual keyboard, OS reduced-motion preference switching and screen-reader audio were not exercised. Reduced-motion media rule, dvh/safe-area layout and semantic labels are implemented; real-device acceptance remains necessary.

## Local preview

From the repository, after installing the pinned dependencies:

```sh
node scripts/preview-assistant-ux.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory ../assistant-ux-preview/dist
```

Open local port 4173. The standalone harness intercepts every fetch and throws for unknown routes. Its HTTP-only synthetic crypto/Credit adapters are not imported by application routes; they do not test cryptography. Cryptographic Receipt and Credit checks use the real Node/workerd/local-D1 test paths. In ChatGPT Work the managed `sites-preview` supervisor serves this same generated directory instead of the Python command. No preview registration or deployment is involved.

## Production and release

The previously authorized acceptance closure is complete: stored v90 redeployed OFF, environment 57, deployment `appgdep_6ad9e07591488191ab4b8dd534425911`. Read-only final check confirms AI false and MAINTENANCE revision 3. The prior completed 1 CR search and wallet 9 CR are preserved; generation admissions and Provider cost records are absent. No new paid search, generation, refund adjustment, DB write, Migration, setting change other than OFF, or new source deployment was performed.

New UX requires separate Production deployment approval. Keep Migration 0020 / Backup v10, MAINTENANCE, existing settings and the validated data-preservation record. Deploy approved source OFF first; any later ON and bounded paid acceptance require separate authorization. No new semantic evaluation campaign is a prerequisite added by this work. Actual model quality remains NOT TESTED here.
