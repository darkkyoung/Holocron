# Free Output Log Probe — preparation, not Production observation

Date: 2026-10-23 UTC. Starting canonical: `6a556ade284f0af6006ab8533c55adf2530aff98`, tree `b5d1d528411fcb3cbe06e24a444cc3137c358035`.

Verdict: **PREPARATION PASS / PRODUCTION PROBE NOT RUN**. No Production deployment, environment change, HTTP probe, D1 write, Credit use or real Provider call occurred. The inherited operational baseline remains v92 / environment 61 / AI OFF / MAINTENANCE / Migration 0020 / Backup v10. The reported 8 CR balance was not independently re-audited in this preparation.

## What is known about Sites logs

The available Sites tool definitions were checked again. The relevant exposed operation remains `get_site_worker_logs(project_id, since_minutes, limit, errors_only)`. There is no exposed same-application-Worker WARN emitter, log configuration operation, retention control, sampling control or support submission tool. Accordingly this change prepares a narrowly authorized application probe. It does not change Wrangler configuration or assume that generic Cloudflare logging features are exposed by Sites.

The previous read-only findings are preserved in [the delivery investigation](2026-10-23-assistant-output-diagnostic-delivery.md). No redundant Production log query was made here.

| Capability | Evidence / limitation |
| --- | --- |
| Include non-error events in query | `errors_only:false` removes the documented error-only restriction; actual WARN ingestion remains unproven |
| Historical environment revisions | No environment/Worker-version selector; revision 60 vs 61 coverage remains UNKNOWN |
| Recent-log bounds | Previous documented bounds: 1–10080 minutes, 1–100 rows; the lookback is not a retention guarantee |
| JSON event filtering | Parse `source.message` and compare the exact `event` locally; no text filter or cursor exposed |
| WARN retention, sampling and dropped events | UNKNOWN; no exposed contract or configuration reader establishes them |
| Local workerd console delivery | CONFIRMED by prior packaged generation tests and the new packaged probe test |
| Production Output Diagnostic delivery / past failure reasons | UNKNOWN; this preparation cannot recover missing historical events |

### Support inquiry draft — not sent

> 제목: ChatGPT Sites 애플리케이션 Worker의 WARN 진단 수집·조회 계약 확인 요청
>
> HOLOCRON의 실제 애플리케이션 Worker에서 content-free `console.warn` JSON 이벤트 `ASSISTANT_OUTPUT_DIAGNOSTIC_V1`을 출력합니다. 패키징된 동일 코드는 로컬 workerd에서 관측되지만, 기존 Sites 조회에는 관련 이벤트가 없었습니다. 다음 사항을 확인해 주세요.
>
> 1. `get_site_worker_logs(errors_only:false)`가 이 Site의 애플리케이션 Worker WARN을 수집·조회하는가요? 상위 Dispatch Worker와 조회 대상이 구분되나요?
> 2. v92 환경 revision 60에서 발생한 로그를 revision 61 이후에도 조회할 수 있나요? 환경 revision과 Cloudflare script version의 공식 매핑 방법은 무엇인가요?
> 3. 로그 보존 기간, 샘플링·필터·할당량·누락 조건, 저장형 로그와 실시간 전달의 차이는 무엇인가요?
> 4. 100건을 초과한 결과의 페이지 조회 또는 JSON `event` 필터를 지원하나요?
> 5. 같은 애플리케이션 Worker에서 운영자가 합성 WARN 한 건을 발생시키는 공식 기능이 있나요? 없다면 관리자 전용 무료 합성 probe로 수집을 확인하는 방식이 지원되나요?
>
> 제공 가능한 자료는 Source/Deployment 식별자와 합성 stage/reason/path뿐입니다. 실제 IP·쿠키·질문·답변·Receipt·Account 정보·Secret은 제공하지 않습니다. 유료 모델 호출은 하지 않습니다.

## Implemented boundary

Endpoint: **POST `/api/admin/assistant-output-probe`**. No public button or new admin menu is introduced. Other methods reject. The existing Worker-first Maintenance Gate still executes before the route.

- Existing signed Admin Session is required. A valid Google Account session alone is insufficient. There is no token/query/header bypass or new secret.
- Exact same-origin POST, JSON content type and streamed body limit of 32 bytes use the existing mutation helper. Only the empty JSON object is accepted. Query parameters and all body fields are rejected; `Sec-Fetch-Site`, when present, must be `same-origin`.
- `HOLOCRON_ASSISTANT_ENABLED` must be the literal string `false`.
- `HOLOCRON_ASSISTANT_OUTPUT_PROBE_WINDOW` defaults to unset/disabled. Its only accepted form is `YYYY-MM-DDTHH:mm:ss.sssZ/YYYY-MM-DDTHH:mm:ss.sssZ`, valid round-tripping UTC timestamps, positive duration no greater than 600000 ms. Start is inclusive, end exclusive. Missing, malformed, future and expired settings deny access.
- Server-side visibility must validate as MAINTENANCE using a primary D1 read. Missing visibility defaults PUBLIC and denies; malformed state/read failure fails closed. The atomic write also checks MAINTENANCE, and window/visibility are checked again before the sink call.
- The sole synthetic diagnostic is `{stage:"schema",reason:"SCHEMA_TYPE",path:"$"}`. It uses the existing `OutputValidationError` → `observeOutput` → `createOutputLogger` → synchronous `console.warn(JSON.stringify(...))` path and the existing `ASSISTANT_OUTPUT_DIAGNOSTIC_V1` event. Existing allowlists, one-event-per-observer and 20/minute/isolate cap are unchanged.
- No retrieval, Generation Admission, model transport, query/article content, Receipt or Account/Credit mutation is invoked. The event has exactly `event`, `stage`, `reason`, `path`; no user/request identifier or diagnostic ID is added.

The fixed synthetic event is **not a diagnosis of any historical model response**. Record its observation window separately and do not classify it as an actual generation failure. This endpoint cannot establish which validation rule rejected the two older responses.

## Durable single use and uncertainty

The existing `settings` primary key arbitrates globally across isolates. `assistant_output_log_probe_v1` is a permanent, bounded singleton tombstone, under 256 bytes for accepted timestamps. Its JSON contains only schema version, consumed state, window start/end and consumption time.

One atomic `INSERT ... SELECT ... ON CONFLICT(key) DO NOTHING RETURNING key` consumes the slot **before** the logger runs. There is no read-then-insert race, update, delete, timeout cleanup, reset, automatic retry or rearm operation. A malformed existing marker also blocks execution. Changing the window or restarting every isolate cannot permit a second event.

Guarantee: **at most one logger attempt for this marker**, not guaranteed console/cloud delivery. A process crash, expiry, visibility change, logger rate cap or sink failure after consumption can produce zero events and still spend the attempt. A successful response is only `{"status":"consumed"}` with private/no-store headers; it never asserts successful cloud ingestion.

A failed D1 acknowledgement returns 503 `PROBE_CONSUMPTION_UNKNOWN` with `retryAllowed:false`, emits no event and performs no retry. If D1 committed before acknowledgement was lost, the tombstone blocks later attempts. If the write never committed, no durable state can be proven: **STOP and do not resend or reset**. The code cannot manufacture a durable record during a failed write, and does not claim otherwise. Any lost HTTP response likewise requires stopping and read-only observation, not repeating the POST.

The tombstone deliberately has no physical TTL. Keeping one tiny row prevents a future window from silently rearming the operation. Any future reset/new probe is a separate reviewed change, not part of this runbook.

## Backup / data contract

No migration, schema, version or historical allowlist changes. Backup remains v10 / Migration 0020 / 16 datasets. The marker is absent from every v1–v10 settings allowlist and explicitly documented in `EXCLUDED_SETTINGS`; the export and restore replacement scope exclude it. Backup restore must not be used to rearm an operational probe. No restore is authorized here.

Local tests compare all application tables, excluding only the one probe marker and Miniflare internals, before and after. Wallets, Ledger, Accounts, searches, admissions, provider-cost records and other application data remain unchanged. The full v10 export is byte-equivalent as an object at the same snapshot time, and official validate/plan pass.

## Local verification

| Check | Result |
| --- | --- |
| `test:output-log-probe` | 178 assertions PASS with real isolated D1: auth/request/window gates, concurrency, malformed marker, read/write races, lost acknowledgements, expiry after consumption, sync/async sink failure, no retry, business-table equality, v1–v10 exclusion |
| `test:output-log-probe-built` after build | PASS against actual `dist/server` Worker modules; two independent application Workers sharing D1, 12 concurrent POSTs → one tombstone and exactly one captured WARN |
| Packaged auth / safety cases | Signed Admin accepted; anonymous, forged/expired Admin and valid Google Account denied; AI ON, expired/unset window, PUBLIC, cross-origin and nonempty body denied; no search/admission rows or Credit delta |
| Persisted restart | All isolates restarted, observation window changed, same D1: duplicate denied, no second event |
| Actual console capture | workerd structured-log sink captures WARN with exact four allowed fields; no secrets/cookies/Account or content canaries; does not query the Sites Production log tool |
| Backup regression | 939 assertions PASS; current v10 and historical contracts |
| Admin authentication | 28 assertions PASS |
| Site visibility | PASS, isolated workerd/D1, existing signed-admin and scheduler boundary, fail-closed gate, backup contract |
| Output hardening | 36 grounding scenarios plus existing logger privacy/dedup/cap/failure checks PASS; validator/logger source unchanged |
| Retrieval | 606 assertions PASS; no Provider calls |
| TypeScript / lint / build / diff-check | PASS; lint has zero errors and the existing unused `debit` warning in `test-assistant-refund-safety.mjs` |

The packaged test uses a test-only HTTP ingress to dispatch to the two real app Workers; its routing header is stripped before the application. An initial `getWorker().fetch()` harness attempt was rejected by Miniflare's RPC Origin boundary, so the test now uses normal `dispatchFetch` HTTP ingress. No application Origin/auth check was relaxed. All external Worker outbound is blocked: **zero Provider calls and zero external outbound**.

The earlier paid-generation mock suite was not needlessly repeated. No real Provider key, operational Account, Production D1 or historical evaluation journal was used or changed.

## Separate UX finding — proposal only

`components/assistant/use-assistant-session.ts` sets the notice before generation, then sets terminal failure/stage without clearing that old progress notice. The minimal future patch is to clear progress-only notice on terminal failure/abort, or render progress solely from active stage. Preserve settlement/refund details and additional-consent locks. Regression cases: INVALID_OUTPUT with full refund, unknown settlement, abort, close/reopen. **No UI, search ranking, prompt or output-validator change is included here.**

## Exact future Production approval required

This is a proposed procedure, **not executed or authorized by preparation**:

1. Approve the final canonical SHA/tree for one deployment to the existing Site, AI OFF and MAINTENANCE unchanged; retain Migration 0020, Backup v10, existing Secrets, Credit, Scheduler, popup and prior audit. No fresh backup solely for this probe unless a new integrity risk is found.
2. Approve one new optional environment value `HOLOCRON_ASSISTANT_OUTPUT_PROBE_WINDOW` with an explicitly recorded UTC interval no longer than ten minutes, and **at most one small operational settings-row insertion**. No business-data write is part of this approval. Finish log-access, browser/session and packaging preparation before setting the window; include deployment time when choosing its start.
3. Verify deployment success and current UTC inside the window with at least two minutes remaining. If late or uncertain, STOP without a POST, reconfiguration or repeat deployment.
4. In the same-origin browser with valid signed Admin Session, execute exactly one POST with `Content-Type: application/json`, body `{}` and normal same-origin credentials. No query, article, Receipt, client IP/CF header, repeated click or automatic retry. No search/generation endpoint is involved.
5. Record request UTC and HTTP status/consumption acknowledgement. Never interpret the acknowledgement as stored-log success. An error/lost response ends the write attempt; no resend or marker reset.
6. Query the existing exact Site project with `errors_only:false`, `since_minutes:15`, `limit:100`. Permit at most three read-only queries total, matching the exact JSON event and the recorded UTC window; report only synthetic stage/reason/path plus time/level/Worker-version metadata. Do not print unrelated logs. Reaching the limit without a match is inconclusive, not proof of no emission.
7. After the recorded end time the handler disables itself by time comparison. Do not send another POST to prove expiry. Do not clear the tombstone or create a second window. AI OFF / MAINTENANCE remain unchanged; no OFF/ON cycle or cleanup deployment is required.
8. If the synthetic WARN is absent, report collection/query UNKNOWN and send the prepared inquiry only after separate communication authorization. Do not compensate with a paid generation, another probe or a logging-policy bypass.

A successful observation would prove delivery of **this synthetic WARN from this deployed application Worker at this time**. It would not prove historical retention or recover old failure codes. Paid Acceptance remains out of scope until diagnostic observability is demonstrated and separately approved.
