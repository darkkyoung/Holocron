# Phase 9D-D.2 — GitHub Actions browser QA recovery

Starting canonical SHA: `27dd9587970ab58c460687489f47cbb4d9eb5c9f`. The first attempt to run Chrome locally failed before rendering because the execution sandbox denied Unix sockets; the separate Work browser could not reach the isolated localhost. Those attempts are **not** browser acceptance. The canonical application, Site access and deployed Production runtime are unchanged by this recovery.

## Test-only runner

`.github/workflows/assistant-browser-qa.yml` is manual `workflow_dispatch` only, with `contents: read`. It installs locked dependencies, pinned Playwright Chromium and its Ubuntu libraries, initializes an isolated local D1 from versioned 0000–0018 SQL, and starts the actual Vinext React application at localhost. The isolated server sets the Assistant flag only for this browser job. Playwright intercepts retrieval, generation and Credit visit API responses with synthetic contract-shaped data; no provider key, external provider call, live Google login, Production D1 or Credit mutation is involved. A second server checks the disabled COMING SOON route and News launcher.

`pnpm test:assistant-browser` selects only the new rendered-browser suite. It covers 1440/1024/820/768/390/375/360px captures and bounds, Q&A/script selection and response rendering, fixed displayed prices, citations/copy, Guest/error/refund/cancellation, D.1 input consistency, keyboard/focus and reduced motion. A genuine tab transition test records a skip if headless Chromium does not actually report `document.visibilityState === 'hidden'`; synthetic visibility events are never counted as proof of a tab transition. Screenshots, traces on failure and the HTML report are Actions artifacts. The existing `test:*` scripts remain independent of Chromium; the workflow runs them and lint/tsc/build/diff-check after browser checks.

To run locally with a real browser and an isolated D1, use the workflow's `Prepare synthetic local D1` step, then `pnpm exec playwright install --with-deps chromium` and `pnpm test:assistant-browser`. Do not point the test server at Production. The workflow creates `.dev.vars` and `browser-qa/wrangler.local.json` only on its disposable runner and does not upload them.

## Acceptance state

Workflow creation and local test-list/lint/type checks are preparation, **not** D.2 acceptance. Record the actual run ID, Chromium version, seven screenshots, test assertions, any reproduced UI defects/fixes, full regression result and artifact location only after reviewing a completed Actions run on the final canonical revision.

Preparation verification on this checkout: the 51 pre-existing `test:*` suites passed, as did `pnpm lint` (one historical unused-variable warning), `pnpm exec tsc --noEmit`, `pnpm build` and `git diff --check`. Playwright discovered 14 enabled tests and one disabled-flag test; those discovery checks did **not** launch Chromium or count as rendered acceptance.

**NOT TESTED until that run:** actual Chromium rendering and interactions, mobile viewport emulation, genuine visibility transitions and visual screenshots. Physical mobile touch/virtual keyboard, screen-reader operation, real provider and hosted migrations remain separate. The feature defaults OFF and COMING SOON remains on the public Site. No Production deployment, hosted 0017/0018 migration, secret change, live provider use or public AI activation is authorized by this record.
