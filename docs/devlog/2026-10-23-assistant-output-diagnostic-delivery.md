# Output diagnostic delivery investigation — 2026-10-23

## Scope and verdict

Starting canonical main: `0cd4833939043212950c077aeaa24923191a371a`, tree `2843d44a31a6af3af86b594077aa7ce32cbdc455`; fresh Git fetch and GitHub connector ref agree.

**LOCAL DELIVERY VERIFIED / PRODUCTION DELIVERY UNKNOWN.** This work changes only tests and this investigation record. No application, validator, UI, dependency, environment, migration, backup, historical evaluation or Production change. No real Provider calls or real Credit use. Do not run another paid acceptance to obtain missing diagnostics.

Production read-only checks: v92, environment 61, Assistant `false`, stored visibility `MAINTENANCE`. Saved v92 points to Sites commit `b8d7bf49bca0640144661eb2c918dd9a4be571b8`; the retained clean Sites checkout has the approved canonical tree. The saved archive metadata records `sha256:3a61a0abb9670f44ea8c10a0321d6013ac05c167a0a8add4420a49abfe60c23e`. Its latest deployment is the already-completed OFF deployment `appgdep_6adb34f9e74c8191b550119280cfdd07` (2026-10-23 10:20:57 UTC / 19:20:57 KST). No deployment was initiated in this investigation.

The packaged-module tests below ran against the retained Sites `dist/server` and then the current canonical build. The generation Route/logger chunk is byte-identical in both: `_next/static/route-CFlUT0hC.js`, SHA-256 `9ca86babf0ce804221528c3bafa92fe7fc1aa1ef9e9aea151ad2d9d442f7cb66`. They are local workerd tests, not an inspection of live isolate memory or a new download of the saved remote archive.

## Historical facts remain unchanged

The prior read-only settlement audit confirmed one new search charged 1 CR, one new QA admission, one known-usage Provider attempt, 5 CR debited and exactly 5 CR refunded, final wallet 8 CR and no unsettled request. Reserved cost $0.0192; usage-based estimate $0.006213, not an invoice. This investigation does not rewrite or repeat that audit as a new execution.

Failure refund completed at **17:06:52 KST**, before receipt expiry at **17:16:41 KST**. Later receipt expiry does not explain the earlier output rejection. Past stage/reason/path remain **UNKNOWN**, including earlier failures without observations. No rejected output is stored or recoverable from these accounting records.

## Application execution path

`generate/route.ts` creates one `createOutputLogger()` observer for each request. `handleGenerate()` passes the same dependency object into `generateArchive()`. The production Account configuration selects `account-v1`; it does not remove the observer.

| Boundary | Confirmed code behavior |
| --- | --- |
| Provider response | Every current `ProviderError('INVALID_OUTPUT', ...)` construction supplies a fixed reason. Body/envelope/JSON failures are distinguished. |
| Schema/grounding | `invalidOutput()` throws `OutputValidationError` with an allowlisted, frozen diagnostic. Both validation passes are inside the generation catch. |
| Generation catch | A `ProviderError` or `OutputValidationError` invokes `observeOutput()` before failure settlement. Public body limit has its own explicit observation. |
| Observer | Revalidates reason/path, invokes the observer synchronously, catches synchronous errors and attaches rejection handling to returned promises. No exception text is logged. |
| Logger | One event per created observer, maximum 20 attempts per minute per module/isolate. Writes only event/stage/reason/path. This is not a global cap. |
| Console | Current sink calls `console.warn(JSON.stringify(event))` synchronously, before its returned value is wrapped in a promise and before settlement is awaited. |
| Cloud delivery | No acknowledgment of platform ingestion, persistence or queryability is returned by `console.warn`. This boundary remains unverified. |

No diagnostic is expected for valid output, normal insufficient evidence, replay, auth/admission rejection, receipt changes, OFF, ordinary transport timeout/non-2xx without an output reason, or a failure occurring before output validation. `GenerationFailure` is rethrown without a second observation. An undefined observer/value, a second call to the same observer, or the isolate cap suppresses emission. A sink failure consumes its local allowance and is intentionally swallowed. Worker termination before the catch cannot be diagnosed by this code.

No bare `AssistantError('INVALID_OUTPUT')` path was found in the current application. A future such path or cross-realm error-class mismatch would need its own test; neither is established as a Production cause. The packaged tests exercise the current actual error classes and Route wiring.

Async observers are best-effort: their completion is not awaited or registered with `waitUntil`. **That does not mean the present synchronous console call waits until after the response.** Changing this to `await` speculatively would not prove durable cloud collection. A future asynchronous storage sink would require an explicit bounded completion contract.

## Sites collection/query contract and evidence

The available native API is `get_site_worker_logs(project_id, since_minutes, limit, errors_only)`. It is a bounded recent-log query, not an exposed live-tail subscription. Defaults are 180 minutes, 25 rows, errors-only. The permitted lookback is 1–10080 minutes and limit 1–100. **A seven-day query option is not a seven-day retention guarantee.**

For a WARN diagnostic, use `errors_only:false`. The tool offers no level selector, event-text filter, absolute start/end, cursor, Worker-version selector or environment-revision selector. Match the exact JSON `event` field client-side after parsing `source.message`; do not print other log bodies or whole request objects. Inspect timestamp, `source.level`, `$workers.scriptName`, `$workers.scriptVersion.id` and truncation metadata separately. Reaching 100 rows makes absence especially inconclusive because no pagination is exposed.

Read-only queries with `errors_only:false`, limit 100, both 1440- and 10080-minute lookbacks returned the same nine unrelated error-level events and **zero Output Diagnostic events**. All returned events were after the OFF deployment and had Worker name `site---6aa6b548ff20819191ecfb6ed6837cd6`, matching the Site's deployment Worker name. They had one Cloudflare script-version identifier and no truncation. No event at the acceptance time was returned. No request was sent to manufacture logs.

The Site/version/deployment tools link v92 and its source to the OFF deployment. Log records do not include environment revision, and the tools do not expose a mapping from environment 60/61 to Cloudflare script-version identifiers. Timestamp association is evidence of timing, not proof that a query is restricted to the latest environment. The absence of older versions cannot establish whether the backend filters them, they expired, were sampled, or were never ingested.

| Question | Result |
| --- | --- |
| Correct project and Worker name | Confirmed for returned events |
| Query tool returns production events | Confirmed for unrelated error events |
| WARN accepted by query contract | `errors_only:false` removes documented error-only restriction; actual WARN delivery unproven |
| Exact Output JSON search | Client-side after retrieval; no server-side event selector exposed |
| Stored vs live-tail implementation | Tool provides recent queries; durable storage and live-tail plumbing not exposed |
| Retention duration / sampling / quota drops | UNKNOWN; no read/manage interface or guarantee exposed |
| Environment 60 events retrievable after 61 | UNKNOWN |
| Past failure code recovery | Not achieved; no promise of recovery |

The retained build's Wrangler metadata includes `observability: {enabled:true}`. This is packaging evidence, **not proof that Sites applied the same cloud-side log settings**. `WRANGLER_WRITE_LOGS=false` in local scripts controls Wrangler CLI disk logging (confirmed in the installed CLI); it does not disable application `console.warn` and is not evidence of a Production collection defect. No Wrangler configuration was changed.

## Isolated verification

Extended the existing `test-account-assistant-built.mjs` instead of creating another runner. It accepts an optional built-server directory and runs the actual packaged entry/Route modules in Miniflare/workerd, with an upstream that strips CF/IP, real isolated D1 migrations, synthetic Account sessions and an intercepting Mock Provider. All other Worker outbound attempts are blocked.

The workerd structured-console callback captures the real console sink; it does not replace the application logger. Exact events observed:

| Synthetic defect | stage | reason | path |
| --- | --- | --- | --- |
| Invalid response envelope JSON | response_body | ENVELOPE_JSON | `$` |
| Invalid generated JSON | output_json | OUTPUT_JSON | `$` |
| Non-string fact text | schema | SCHEMA_TYPE | `$.answer[0].text` |
| Nonexistent support span | grounding | SUPPORT_SPAN | `$.answer[0].supports[0].span` |

All four were WARN, exactly one event per failed request; all returned opaque INVALID_OUTPUT publicly and fully refunded 5 CR. Replay produced no new transport call, debit, refund or event. Exact event-key equality plus canaries checks no question, article content, support text, cookie, account ID, request ID, receipt or credential is emitted. Wallet balances, ledger sequence and resulting balances reconcile. Normal QA/Guide, unauthenticated rejection and replay emit no output diagnostics.

The built test uses six local Mock responses (two successes and four failures); **real Provider outbound is zero**. It proves local Console delivery, not native Sites log-tool delivery. The latter cannot query a local Miniflare instance and remains a separate outstanding acceptance item.

Extended the existing generation test to cover asynchronous sink rejection as well as synchronous throw and normal sink. All preserve full refund, opaque public error and replay protection. Existing logger tests cover dedup, 20/minute cap, reset, sanitization and failure isolation. No runtime patch was justified by these results.

Verification results:

- `node --import ./scripts/sites-env.mjs scripts/test-account-assistant-built.mjs ../release-sites/dist/server`: PASS against retained Sites bundle.
- `node --import ./scripts/sites-env.mjs scripts/test-account-assistant-built.mjs`: PASS against fresh canonical build.
- `node --import ./scripts/sites-env.mjs scripts/test-assistant-generation.mjs`: 1,680 assertions PASS, including sync/async sink failure refunds.
- `node scripts/test-assistant-output-hardening.mjs`: 36 grounding scenarios plus logger privacy/dedup/cap/reset/failure checks PASS.
- Current Provider: 84 assertions PASS; Refund Safety: 586 assertions PASS; Account Assistant end-to-end/replay/refund/consent: PASS.
- TypeScript `--noEmit`: PASS; lint: zero errors, one pre-existing unused `debit` warning in `test-assistant-refund-safety.mjs`; production build: PASS; diff-check: PASS.
- All fixtures synthetic, all D1 instances isolated, no historical frozen evaluation executed or modified. Production Provider calls and Credit use: zero.

## Minimum next step — no paid request

Choose **platform delivery investigation first**. Ask Sites support/operators to confirm (without sending private payloads): WARN ingestion for this exact Site Worker, environment/Worker-version mapping for revisions 60 and 61, retention, sampling, historical-version query scope, and whether the exposed query reads stored logs or another stream. Request a supported operator-side synthetic WARN emission in the **same application Worker** if available. A warning in the dispatch Worker or a different test Site would not prove this path. No currently exposed native tool emits such an event or manages log settings. No support message was sent automatically.

If a supported operator probe is unavailable, the smallest application proposal is a temporary admin-only synthetic probe, **not implemented or approved for Production here**:

1. Dedicated admin POST using the existing signed Admin Session verification, exact same-origin/body-size validation, AI explicitly OFF, and an operator-configured UTC window of at most ten minutes. Missing/invalid configuration fails closed; Google Account is not admin authorization. No query, article, receipt or account fields accepted.
2. Generate one fixed synthetic `OutputValidationError`, use the existing observer/logger and emit the exact existing event shape. No search, generation admission or Provider module is invoked. Keep the operational record of the synthetic window separate so it is never mistaken for a real failure.
3. Enforce **one attempt across isolates** with an atomic singleton operational marker, not just an in-memory counter. Proposed storage: a dedicated transient `settings` key, at most 512 bytes, containing only window identifier/times and consumed state. A single conditional SQL statement must consume it before logging; an ambiguous write or log loss never permits retry. It touches no Credit/Account tables. Expired-window configuration can never rearm it; fail closed on malformed marker. Cleanup must occur only after expiry through an approved operator action; no Scheduler changes. One bounded tombstone avoids claiming an automatic physical TTL that settings does not provide.
4. Admin response acknowledges only probe consumption, never successful cloud ingestion. Read native logs immediately with errors-only disabled; stop after bounded reads if absent. Never compensate with a paid generation.
5. A transient marker is outside the current settings backup allowlist; it must not be restored/replayed. This proposal needs explicit approval for the new endpoint, environment window, deployment and bounded operational marker write/cleanup. It requires **no schema migration**, but implementation must test backup exclusion and atomic concurrency. No general public debug API or bypass token.

Do not build a fallback persistent diagnostic store unless platform retention is shown inadequate. If required later, use a separately reviewed bounded operational table: only timestamp + fixed stage/reason/path + synthetic/real discriminator, no user/request/output identifiers; proposed 24-hour visibility/TTL policy and hard row/byte cap, authenticated admin reads, and explicit scheduled deletion or operator purge for physical expiry. Keep writes failure-isolated from Credit settlement, and expose diagnostic-storage health so a loss is not silently treated as success. This would require a **separately approved additive migration** and explicit backup exclusion review; do not hide an event stream in settings or modify the Ledger.

## Separate UI observation

`use-assistant-session.ts` sets the progress notice before dispatch. Its failure catch sets `failure` and `stage='error'` but leaves that notice intact. This confirms the stale progress-message path; it does not explain INVALID_OUTPUT. Minimum future fix: clear the progress notice on all terminal failure/abort paths (or derive it exclusively from the active stage), preserving settlement text and retry-consent locks. Test invalid output, full refund, unknown settlement, cancellation and close/reopen. No UI change in this investigation. Recommendation relevance remains a separate user observation; no ranking change or causal claim.

## Release boundary

No application fix, synthetic production endpoint, deployment, environment change, migration, backup change or Production generation/probe request was performed. Production access used only native read-only metadata/settings/log tools. Assistant remains OFF and MAINTENANCE remains set. A local PASS does not authorize or justify another paid acceptance. Production diagnostic delivery must be demonstrated through a separately approved free observation first.
