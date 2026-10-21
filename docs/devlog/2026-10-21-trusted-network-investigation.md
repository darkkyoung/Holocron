# Production trusted network investigation — diagnostic preparation

## Source and preserved state

Starting canonical `003081452a0cd566b260885470e8e4223bcaba57` matched a fresh `origin/main` fetch. Production remains version 87, environment revision 53, AI OFF. Its deployed canonical is `31fecd2982b3ac84c7745a60f861aee49892b095`, tree `b8a9cbce5b564cf4235ce422a86bb93d8e73f450`, Sites commit `0b17473d4e7072bcd2eef5361faeb0e169d5e1ba`. This diagnostic source is NOT deployed.

Existing private v8 backup SHA-256 was rechecked: `b309f35c3609b58fa7b64bdc94c399083444b1f53ab6cfeee0db4b00fa94b702`. The previously completed v8/0019/16-dataset validate/plan and full v7→v8 preservation audit remain applicable: backup/schema/policy code is unchanged. This does not claim a fresh audit of later production activity. No replacement backup was requested.

## Read-only findings

- Supported Sites reads confirm active `holocron.kr`, v87, environment 53 and `HOLOCRON_ASSISTANT_ENABLED=false`.
- The custom hostname maps to `site---6aa6b548ff20819191ecfb6ed6837cd6`, provider/SSL active.
- The production Worker log reader returned 42 events over its requested 180-minute window. Events identify that script in dispatch namespace `production`. They contain request outcomes/status, not A/B/C/D network classifications. No `/api/assistant/retrieve` event or custom application console event was present in that result. Its absence is not proof of absence of the earlier failure.
- Sites exposes a read-only Worker log API that accepts `errors_only:false`, time window and limit. It supports application messages as well as invocation metadata. This is the planned observation channel; actual collection of the new diagnostic event remains a production acceptance check, not an established result.
- Available management tools do not expose namespace `trusted_workers`, upstream dispatcher source, zone Transform Rules, or Remove visitor IP headers configuration. None were changed or inferred as confirmed.

Cloudflare documents that user Workers in a default **untrusted dispatch namespace do not receive `request.cf`**. This is a strong platform-level hypothesis consistent with the observed dispatch namespace, not proof of this Sites namespace's setting. A clone-preservation patch cannot recover metadata absent before the application begins.

References inspected on 2026-10-21:

- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/worker-isolation/
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/limits/
- https://developers.cloudflare.com/workers/runtime-apis/request/
- https://developers.cloudflare.com/fundamentals/reference/http-headers/

Worker-to-Worker forwarding can affect visitor IP semantics. Even an apparently valid `cf`/IP pair does not independently prove a trustworthy, visitor-specific platform contract. Do not enable a shared namespace's trusted mode to bypass tenant isolation. If A lacks metadata, obtain the platform's supported authenticated forwarding contract (client-overrides stripped, correct visitor origin, request/project binding) or a separately reviewed controlled edge boundary. Neither alternative is implemented or authorized here.

## Actual source boundaries

| Boundary | Actual module/call | Production metadata evidence |
| --- | --- | --- |
| A | Application Worker fetch entry; formerly direct `vinext/server/fetch-handler`, now a documented custom delegate in `worker.ts` | NOT OBSERVED |
| B entry/header clone | `vinext/dist/server/app-router-entry.js` → `cloneRequestWithHeaders` | NOT OBSERVED |
| B RSC/URL clone | `app-rsc-handler.js` → patched `cloneRequestWithUrl` → route dispatch | NOT OBSERVED |
| B NextRequest | `app-route-handler-runtime.js` → `NextRequest` / route proxy | NOT OBSERVED |
| C | `app/api/assistant/retrieve/route.ts` actual Request | NOT OBSERVED |
| D | Existing `trustedEdgeNetwork()` evaluated on exactly C's Request, OFF-only read-only probe | NOT OBSERVED |

A is the earliest application-owned entry, not the inaccessible outer Sites dispatcher. `build/sites-vite-plugin.ts` has local dev auth handling and build artifact copying; it does not implement hosted network forwarding. No middleware/basePath request rewrite is configured in this app. The installed Vinext patch and dependency inputs remain unchanged.

## Observation-only implementation

- `worker.ts` delegates the same Request/env/context to the documented Vinext Worker handler. No request reconstruction/repair.
- `lib/observability/assistant-network.ts` owns one request-local AsyncLocalStorage trace. It emits only fixed stages, cf existence, colo presence/validity, IP-header presence, current predicate result, strict IP syntax result, request-local object ordinals and a fresh server UUID. No IP/hash, header dump, cookies, credentials, identity, query/body, candidates or receipts are stored or emitted.
- `build/network-observation-plugin.ts` inserts observation calls at exact B boundaries only if each actual installed Vinext module matches its pinned SHA-256. It does not edit node_modules, change the existing pnpm patch/lock, or alter clone behavior. Unexpected source fails the build.
- Retrieval route observes C and calls the existing pure network predicate for D while observation is active. The normal OFF handler still rejects before session, database, admission, Credit, rate-limit or Provider work. No public debug endpoint, response header, diagnostic body, or additional capability exists.
- `HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW` is absent/inactive by default. A valid fixed UTC interval of at most ten minutes AND exact `HOLOCRON_ASSISTANT_ENABLED=false` AND the existing retrieval POST are required. It is never activated by client headers. Expired/future/malformed/overlong windows and AI ON are inactive.
- At most one observed request per isolate lifetime, at most 16 stage records, one console event. This is **not a global one-request limit**; different isolates may each observe a request. No persistent state or D1 limiter is added. Operator scope is one deliberate request during the short window.

`ipPredicate` intentionally describes the unchanged existing character/length predicate. `ipSyntax` uses Node `isIP` only for diagnosis. Synthetic `....` distinguishes them; no such Production value has been observed. `TRUSTED_NETWORK_OK` means the existing predicate accepted, not that upstream provenance has been proven. No enforcement rule was weakened or silently corrected.

## Verification

- Current installed Vinext 1.0.0-beta.5 and original clone patch verified. Build-time module hashes and the exact built Worker hooks are checked.
- Diagnostic unit checks: absent cf, missing/invalid colo, missing/malformed IP, IPv6, current-predicate vs syntax distinction, client CF-like/XFF headers unable to activate observation or establish cf, exact reconstruction-loss localization, private-data canaries absent, unchanged response/body, expiry/AI ON/path/method gating, one-per-isolate and concurrent context isolation.
- The **actual built production Worker** runs in isolated Miniflare/workerd behind a test-only upstream Worker. Normal metadata, missing colo, stripped IP and malformed IP each traverse all ten A/B/C/D observations. Miniflare's ordinary HTTP ingress fills CF/IP defaults, so the test upstream explicitly models omission rather than assuming ingress absence. Every response remains `ASSISTANT_UNAVAILABLE`; no application table, session, admission, Credit or Provider work occurs. D1 canary/table state remains unchanged; outbound transport is forbidden and observed count is zero.
- Production log collection is NOT exercised by these tests. No actual Production diagnostic request was sent.
- Existing edge suite: unpatched Node failure reproduction, patched Node/workerd retrieval/receipt, Guest/account constraints, mock debit/replay, OFF and rate-limit checks PASS.
- Retrieval route test now re-exports actual Node built-ins through its existing test loader; it does not stub diagnostic behavior or relax its prohibition on logging in Assistant business modules.

All relevant regression suites passed: edge network, Retrieval (519 assertions), Admission, Generation, Refund Safety, Credit Policy, Announcement, News/Works, Quiz, Google Account, Assistant Workspace. TypeScript PASS; ESLint zero errors and one pre-existing unused-variable warning; official Sites build PASS; diff-check PASS. Source/tree are reported with this commit. No historical evaluation files, approval, journal, model, prompt, pricing, backup contract, migration, collection or announcement setting changed. Existing pinned evaluation integrity may reject the changed runtime as intended.

## Production observation handoff — approval required

1. Approve the exact new canonical SHA/tree and **one AI-OFF diagnostic deployment**, not AI activation or a paid call. Keep the same Site, DB, secrets, approved popup OFF, scheduler and source-mirror integrity checks.
2. Before deploying, recheck supported Sites log access and environment 53/AI OFF (or reconcile any new owner change). Preserve the validated v8 original; do not redownload solely because this is diagnostic work.
3. Set only the new non-secret diagnostic window to an exact short UTC interval `YYYY-MM-DDTHH:mm:ss.sssZ/YYYY-MM-DDTHH:mm:ss.sssZ` no longer than ten minutes, scheduled to cover deployment and the probe. Existing secrets/flag remain unchanged. The actual dates are fixed in the approved operation, never client-controlled or silently extended.
4. Verify packaging contains A/B/C/D hooks, unchanged clone-preservation patch, and the same committed tree. Deploy once with AI OFF. No repeated deployment to chase a missing log.
5. Send **one** normal same-origin POST to existing `/api/assistant/retrieve` with body `{}` and no fabricated IP/CF headers. With AI OFF, expected public response is HTTP 503 `ASSISTANT_UNAVAILABLE`; no query, Candidate or Receipt is expected. This diagnostic is not a successful free search.
6. If using the owner's normal browser on holocron.kr, after approval only, this is the entire console request (do not paste keys or private input):

   ```js
   await fetch('/api/assistant/retrieve', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: '{}'
   }).then(async r => ({status: r.status, body: await r.json()}));
   ```

7. Read supported Sites Worker logs with `errors_only:false`, `since_minutes:15`, `limit:100`; retain only `ASSISTANT_NETWORK_OBSERVATION_V1` fixed metadata. If delivery is delayed, a bounded read-only log recheck is acceptable; do not repeat the HTTP probe or activate AI. If the event is missing, STOP and request platform log support.
8. A missing cf/colo means loss at or before A; separately inspect header state. A valid/B loss localizes the exact instrumented framework boundary. B valid/C loss points at route wrapping. C and D object ordinals must agree. Only after that evidence determine the smallest fix or platform escalation.
9. The window expires automatically without an OFF redeployment. AI stays OFF throughout. Remove this temporary observer after the cause is resolved through a separately reviewed change. No automatic new fix, permanent diagnostics, or AI reactivation is authorized by this record.

## Verdict

**DIAGNOSTIC IMPLEMENTATION VERIFIED / PRODUCTION ROOT CAUSE NOT YET PROVEN.** Namespace isolation is a supported, plausible explanation; cf/colo and IP presence in the failed Production request remain individually unknown. Actual Provider calls ZERO; Production changes ZERO; AI OFF preserved. Production diagnostic deployment requires the owner's new exact-tree approval.
