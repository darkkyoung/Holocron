# Site maintenance mode and Account Assistant integration

- Original canonical: `191cc665f94607ab778992a82421d41ca557eddf` (tree `0917fff780dd128359275b989f7d1c3b179a2705`).
- Independent PartA canonical: `8d141d33f8874997aa7c196bbe7edf1566ea127c` (tree `65eeb5c671cf87a7ef834f89cecd2b1e08a873bb`). This is PartB's starting parent. The final publication SHA/tree are recorded in the completion report, not a self-referential commit hash.
- Production untouched; owner-reported v88/env55/AI OFF is not a fresh production inspection.

## Implementation

Added small site-visibility domain/repository/HTTP/gate/HTML modules, authenticated Control Room route/editor and Worker entry integration. PUBLIC is the missing-row default. Invalid/unreadable state is fail-closed. Signed Admin Session bypass and existing authenticated Scheduler bypass remain distinct from Google Account. Atomic revision/value CAS prevents concurrent settings overwrite. No Secret or user data is embedded in the maintenance page.

All subsequent visitor document/API/RSC/mutation requests are checked before framework handlers, with no-store responses. Actual built assets use run_worker_first. Already-delivered browser content cannot be remotely revoked; real Sites/CDN acceptance remains a deployment check.

Backupv10 adds the visibility setting without changing historical v1–v9 contracts. Integrated Migration0020 comes solely from PartA. No Production migration, restore, SQL or setting write was performed.

## Verification

- `test:site-visibility`: isolated D1, initial PUBLIC, restart persistence, admin/Origin/CAS, visitor API/RSC/POST/HEAD denial, forged bypass denial, scheduler, malformed settings/read failure, repair and backup contracts PASS.
- `test:site-visibility-built`: actual packaged Worker, real Vinext route and Admin Session, PUBLIC transition, AI OFF and asset entry configuration PASS.
- `test:account-assistant-built`: actual packaged Worker behind CF/IP-stripping synthetic upstream, signed Account+D1 ownership, search1CR/recovery, QA5/Guide7 and replay PASS. Two in-process mock transports; external Provider calls ZERO.
- Account search concurrency/lost response/crash recovery, Credit/admission/refund/headroom, Generation, Account/Guest rewards, Admin auth/rate limit, Announcement, Scheduler/SWNN, News/Works/Quiz/navigation and Racing regressions PASS.
- Backup939 assertions PASS after fixing the test-only backup module loader to include the new visibility validator dependency. The initial missing-module test failure was not a runtime data failure.
- Current Retrieval563, Provider, Grounding Negation, Attribution and P44 structural-caveat regression PASS. The old public-route assertion was updated from Guest200 to Account-required401; its legacy read-only domain tests remain separate from paid Account tests. Historical frozen live evaluations were not rerun or rehashed.
- TypeScript, lint, build and diff-check PASS. Lint retains one pre-existing unused `debit` warning in the refund-safety test, zero errors.
- Chromium: actual editor with synthetic API, save MAINTENANCE, PUBLIC confirmation/cancel, visitor layouts360/375/390 with no horizontal overflow. This is local browser verification, not Production browser acceptance.

Racing source/prototype/balance records, AI model/prompt/grounding policy, historical evaluation manifests/approvals/journals, news collection and production secrets remain unchanged. No real Provider calls; no Production writes/deployments; no new paid approval.

Operations and deployment limitations: [SITE_VISIBILITY.md](../operations/SITE_VISIBILITY.md). PartA's v9 release note is superseded by this integrated v10 target. Production deployment/activation is a separate approval after reviewing Source, additive0020 and Backupv10.
