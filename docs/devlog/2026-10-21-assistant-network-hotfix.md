# Assistant trusted network compatibility hotfix

Starting canonical: `1f955e16a10cfdce34213c953b62dd0545b473ca`. Production v86/environment 51 remains AI OFF; no hosted operation or paid call is performed here.

## Confirmed scope and limitation

The installed, exact `vinext@1.0.0-beta.5` App Router dispatcher rebuilt requests with `new Request(routeHandlerUrl, routeHandlerRequest)`. Standard Node Request drops the non-standard CF property on that path. The actual Vinext dispatcher running on Node with isolated Miniflare D1 reproduces `NETWORK_UNAVAILABLE` before the patch and passes afterward. Workerd's native Request preserves its own CF metadata even without the patch; this distinction is explicitly retained. This is not telemetry proving the precise lost field or stage on the deployed Sites platform.

A one-line pnpm patch uses the already imported upstream `cloneRequestWithUrl()` helper, which preserves request CF metadata, method, headers, body and signal. Dependency version and patch hash are pinned in the lockfile; no broad fork, trust fallback or new dependency. No Assistant domain/security, model, prompt, output policy, rate limit, Credit or budget constant changed.

## Verification

`test:assistant-edge-network` bundles the real installed Vinext dispatcher and actual Assistant handlers, first simulates the unpatched Node path in memory (no dependency-file mutation), then exercises the patched Node path and real workerd. All use isolated D1, a synthetic Account, synthetic secrets and in-process Responses mock. Tests cover free Guest retrieval/candidates/signed Receipt, 5 CR Account generation, unchanged balance on untrusted network, replay with no second mock call/debit, absent metadata/forged headers/invalid IP rejection, network limits and AI OFF. Both Node and workerd external transports are blocked; external Provider calls ZERO. Test-only control headers exist exclusively in the non-routed Worker fixture, never in application routes.

Current-runtime regression PASS: retrieval, admission, refund safety, headroom, generation (1596 assertions), provider, Credit policy, Assistant UI and workspace. TypeScript, lint (zero errors; one pre-existing refund-test warning), production build and diff-check PASS. Frozen historical evaluation files/manifests and all private evaluation data are unchanged; they are not rehashed or represented as new-runtime results.

## Release handoff

This Hotfix commit is independently deployable before the announcement feature. A separately approved deployment must use a fresh verified backup, preserve v86 settings/data, deploy AI OFF, then enable and verify an ordinary free retrieval through the real Cloudflare/Sites boundary. If the platform still supplies no trusted CF metadata, STOP and restore OFF; do not trust client IP headers or invent a default network. Production retrieval and paid generation acceptance are NOT VERIFIED by this local test. No new evaluation phase or paid approval is introduced.
