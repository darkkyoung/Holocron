# Sites deployment integrity recovery — 2026-10-21 (KST)

## Scope and source

Starting canonical / approved release: `672377fca81b3e870f68944b145f19d2064ceefc`, tree `851757cce70744342d3bcd0aa37eb67ee5742c96`. Fresh fetch and GitHub commit lookup agree. Existing Sites source parent remains `27c9a5f0c727e7057bde9db3dea13925cc7698af`; no Sites push, version save or deployment was made by this recovery.

Production was rechecked as public v86, environment revision 51, Assistant OFF. Dedicated Assistant key, signing and abuse secrets remain secret entries; the profile is `gpt-5.4-mini-2026-03-17-o200k-v1`. No environment, secret, production DB, scheduler or announcement mutation was made. No paid Provider request was made.

## Installation investigation

The previous mirror used Python `shutil.copy2`, which preserves the canonical file modification time. A controlled reproduction confirmed that immediately copied bytes were correct, but some tracked files subsequently returned to the previous Sites HEAD bytes around pnpm configuration steps. This affected application files as well as dependency inputs, while the new patch file remained. It therefore was not merely a missing package-store patch. The installed unpatched dispatcher matched the old lockfile that was actually present after the reversion.

The reversion was not consistently attributable to one pnpm command: isolated `config set` invocations also preserved the inputs. The environment-wrapper-only and pnpm-version-only probes preserved them. A Node filesystem write probe did not establish pnpm as the writer. OS syscall tracing was unavailable (ptrace denied); it was not bypassed. The underlying filesystem/synchronization actor is **unconfirmed**. Do not describe pnpm itself or a specific Sites cache implementation as the proven cause.

Operational correction: mirror tracked file **bytes and executable modes**, without copying modification timestamps (`copyfile` plus `copymode`). In this run all three normal pnpm project configuration commands, the existing frozen installer, tests and build then preserved the approved bytes. No canonical installer change, lock regeneration, dependency upgrade, manual node_modules patch, store deletion or history rewrite was required.

The installer wrapper has an existing non-executable-script re-entry issue in this checkout. The tracked entrypoint was invoked as `bash scripts/sites-env.sh -- bash scripts/install-pnpm.sh`; neither tracked executable modes nor the installer were altered. It retained project-owned runtime directories, pnpm 11.25.0, the lockfile, registry policy and `clone-or-copy` package imports.

## Exact integrity evidence

| Input | SHA-256 |
| --- | --- |
| package.json | `6f89e4ee7ba1ad02dfa5e9cb909ffdd6ec280b65ef0af274a9cbea189b118c25` |
| pnpm-workspace.yaml | `d3c429605703986a2dfebb68857ee8f33318162c6bad486ae73f7663fc66b337` |
| pnpm-lock.yaml | `6031169370fbf196a1d96673c5494edb399a740f6a7ae85f037329367b92b182` |
| Vinext patch | `8dd600d130626ce811c5bb58a5a243d11f9856023f1aaa3d27329fdd9109f2d5` |

These hashes matched after the corrected mirror, after each pnpm configuration command, after frozen installation, immediately before build and after build. A release-local fail-closed gate compared all 667 approved source paths, Git blob hashes and executable bits, rejected extra/missing tracked candidates, and inspected the actual installed Vinext module. It passed before tests and before/after build.

Vinext is exactly `1.0.0-beta.5`; the resolved package path includes the lockfile's `patch_hash=8dd600...` identity. The real installed `dist/server/app-rsc-handler.js` has SHA-256 `f6b80070d71aab8201ee7419520085be8f4694dba4d0f6dd42b8ef4acc4f97cf`. Its route request uses `cloneRequestWithUrl(routeHandlerRequest, routeHandlerUrl)` and does not use the original `new Request(routeHandlerUrl, routeHandlerRequest)` expression. The actual dispatcher integration test and the Vite build resolved this checkout's dependency tree.

The official Sites build helper succeeded. The official local packaging helper produced 279 files, archive SHA-256 `e9fd2de1e5763916208916ff62f66af2d4f576165e9a0371040f350e5a2d821d`. Archive inspection followed the minified route-dispatch call `request:De(t,n)` through the imported `v` export to the clone helper, which explicitly copies `cf` using `Object.defineProperty`. The archive contains the intended project ID and no environment files, backup originals or node_modules. This is **local packaged-build proof**, not a hosted deployment or live Cloudflare acceptance result.

## New mandatory regression blocker and minimal correction

The approved tree's current-runtime Assistant/Credit tests still expected backup version 7 despite the announcement change making current exports version 8. Admission, Generation, Refund Safety, Headroom and Credit Policy failed at those version assertions (`actual 8`, `expected 7`). This was not a failing wallet balance assertion. Previous implementation-stage tests must not be represented as a complete post-v8 regression pass.

This follow-up changes only those five tests' current-export version expectations to 8. Admission additionally verifies a historical v7 fixture with validate/plan; existing v4 checks and the comprehensive historical backup suite remain. No runtime code, schema, package/workspace/lock/patch, prompt, pricing, manifest, private evaluation state or historical backup contract is changed.

Because this creates a new canonical source tree, it is **not automatically covered by the owner's exact-tree deployment authorization**. Production deployment stays stopped pending the new commit/tree decision. Do not repeat a deployment or bypass a failed check to use the old tree.

## Validation

- Original unpatched Node Vinext: `NETWORK_UNAVAILABLE` reproduced.
- Patched real Node dispatcher and workerd dispatcher: PASS; trusted CF metadata, free retrieval/receipt, Account mock generation, debit/replay, forged-header rejection, OFF and rate-limit checks; external outbound 0.
- workerd itself preserved `cf` even in the prior baseline; the exact former hosted 503 cause remains unconfirmed until real Cloudflare acceptance.
- Retrieval: PASS, 519 assertions.
- Corrected Admission: PASS, 265 assertions, including historical v7/v4 and final wallet audit.
- Corrected Generation: PASS (1,596 assertions); Refund Safety: PASS (586); Headroom: PASS (1,173); Credit Policy: PASS (262).
- Backup: PASS (936 assertions, v1–v8); Announcement: PASS (isolated D1 plus React SSR); Admin Rate Limit, Assistant Workspace, automatic SWNN images and scheduled collection: PASS.
- Provider transport/profile regression: PASS (84 assertions, 12 official tokenizer vectors, Mock/native transport only, real outbound zero).
- TypeScript and lint: PASS (zero errors; existing warning retained). Diff check: PASS. No current runtime behavior or historical frozen evaluation was changed.
- Official Sites build and local archive inspection: PASS against the originally approved runtime tree.

## Backup and release continuation

The private original `holocron-backup-2026-10-21T10-09-14-715Z.json` retains SHA-256 `3f62e519ea26f93a6107405ca40df8c0ef28d2fa421ca895e5c66a2dab4eb33b`. Its previous canonical validate/plan PASS remains applicable: v7, migration 0019, 16 datasets, 85 wallets and 260 ledger entries. File identity was rechecked; no duplicate backup request or restore was made. No account/ledger payload is included in this record.

After the owner selects the release tree: preserve the existing Sites history; repeat the byte/mode integrity gate on that exact tree, frozen install and build/packaging checks; deploy AI OFF/popup OFF; verify public services; obtain and validate the official v8 post-backup and compare existing rows by stable keys; then AI ON redeploy and one ordinary free retrieval/receipt acceptance. Safe administrator authentication is still required for the official v8 download; do not recreate backup data from row queries or retry the previously unsafe login automation. Paid generation remains unauthorized. Emergency OFF requires a deployment and does not cancel in-flight requests.
