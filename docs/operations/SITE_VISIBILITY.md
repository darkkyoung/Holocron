# Site visibility and integrated Account Assistant release

Implementation only. Production remains unchanged and AI OFF. Deployment, migration and any real Credit/Provider acceptance require separate approval.

## State and administrator workflow

Control Room → **사이트 공개 설정** (`/admin/site-visibility`). Missing `site_visibility_v1` defaults to PUBLIC. Select MAINTENANCE, edit the plain-text title/body, inspect the 360/375/390/768px preview and save. PUBLIC transition asks for confirmation. Saves compare the current revision and stored value atomically; concurrent editors receive 409 rather than overwriting each other.

The setting lives in the existing D1 settings table. Restart does not reset it. Only the existing signed Admin Session authorizes viewing/editing this control. Google Account login, arbitrary cookies, query strings and client headers do not grant an administrator bypass. POST retains Same-Origin, body-size and field validation.

## Server boundary

`worker.ts` calls `withSiteVisibility` before Vinext, SSR/RSC routing, network diagnostics and application handlers. D1 reads use a first-primary session, without an isolate TTL/cache. Missing DB, failed reads and malformed settings close visitor access. A missing row alone is the deliberate initial PUBLIC default.

In MAINTENANCE, public document URLs return a self-contained escaped HTML page; APIs and RSC/data requests return a content-free JSON error. Both use HTTP503, Retry-After300, no-store/CDN no-store and noindex. Visitor reward mutations, quiz submissions, announcement images and Assistant endpoints cannot execute behind this gate. Administrator previews are also no-store and vary on Cookie.

The narrow exceptions are the existing admin login/logout handlers (with their existing protections), correctly authenticated POST `/api/scheduled/collect`, and GET/HEAD JS/CSS/font assets under the framework asset directories. Valid signed administrators see the normal site. Logging out removes that bypass. No Sites project visibility or namespace trust settings are changed.

Built Worker assets must retain **`run_worker_first: true`**; otherwise a hosting asset fallback could bypass the entry gate. The actual generated `dist/server/wrangler.json` and built Worker are tested. A future Sites release must independently verify that its packaging retains this flag and that previously cached public documents are not served ahead of the Worker.

Cache controls apply to subsequent HTTP requests, including direct APIs and RSC. This is not a revocation system for content already delivered to an open browser, client router memory, screenshots or a pre-release cache. Do not describe an already open page as remotely erased. A fresh browser/new request is the authoritative verification after a transition; future deployment must check the real CDN path as well.

## Failure recovery

`/admin/login`, `/api/admin/login` and `/api/admin/logout` remain reachable while D1/configuration is unavailable. After valid administrator authentication, the editor reports `repairRequired` and visitors remain blocked. Restore DB connectivity first. For a malformed setting, an authenticated explicit save with the presented revision0 repairs the single setting through the normal API; CAS still protects concurrent changes. Do not use ad-hoc SQL, a preview token or a global fail-open fallback. A lost admin secret cannot be bypassed through this feature.

## Backup and migration

Integrated target: **Backup v10 / Migration0020 /16 durable datasets**. PartA's independent commit introduced v9 and additive0020; PartB only adds the visibility settings allowlist, with no additional schema migration. v1–v8 retain their historical markers/settings contract; v9 retains the PartA contract. v10 validates and preserves `site_visibility_v1`. Account, wallets, append-only ledger, policy and monthly cost history remain durable. Search/admission operational state remains explicitly excluded.

Restore-plan output is non-executable. For older backups without visibility, any separately reviewed future restore must seed MAINTENANCE and verify data before reopening. AI must be quiesced and unsettled spends resolved before any restore; never replay operational admissions or reset cost history.

## Verification and release order

Local commands:

```sh
pnpm test:account-assistant
pnpm test:site-visibility
pnpm build
pnpm test:site-visibility-built
pnpm test:account-assistant-built
pnpm test:backup
pnpm test:racing
```

The built tests use actual packaged Vinext Worker modules, isolated Miniflare D1 and an intercepted Mock Responses transport. The account integration strips CF/IP at an upstream mock and checks signed D1 ownership, search1CR, QA5/Guide7 and replay. No external Provider calls occur. Chromium visual testing uses the real editor component and a synthetic local API; production authentication/security is verified separately in Worker tests. Screenshots: [mobile](site-visibility-mobile-qa.jpg), [editor](site-visibility-editor-qa.jpg).

For a future **separately approved** release: verify exact tree/compatible backup and pending settlement state; apply additive0020 once; deploy AI OFF; verify worker-first gating, PUBLIC default, signed admin access, existing services and v10 backup/data preservation; test MAINTENANCE/PUBLIC only with explicit operational authorization; then separately authorize Account AI activation and tightly bounded real acceptance. Search now costs1CR and must not be used as an unbilled production probe. Do not reuse historical evaluation approvals. Racing remains a local prototype and is not exposed by this change.
