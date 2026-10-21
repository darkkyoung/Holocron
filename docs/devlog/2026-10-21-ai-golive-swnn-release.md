# AI GO-LIVE + SWNN recovery release — runtime deployed, AI activation blocked

Date: 2026-10-21 (KST). This is an operational release record, not a new evaluation phase.

## Source and authorization

- Starting and deployed canonical: `f2b4afc263aaf6ef06efecb9db9db5ab9fbdaf0b`.
- Approved/deployed tree: `a768bb314cac4edf8b5424fefd2af57c7326a18a`.
- Previous canonical reference: `4cebb06e3eebf63486f53103d232794c83120f01`; it was not deployed separately.
- Existing public Site: `appgprj_6aa6b548ff20819191ecfb6ed6837cd6`, `https://holocron.kr`.
- Previous Production: v85, Sites commit `6dc1e0737536eacce696b8aba311eb41dfbcf9bd`, deployment `appgdep_6ad5f84d43508191afcd984e7e0b34f3`.
- New saved version: v86, Sites commit `27c9a5f0c727e7057bde9db3dea13925cc7698af`, parent the previous Sites tip. Its tree exactly matches the approved canonical tree. Normal mirror/commit/push preserved independent history; no force push or new Site.
- This record's eventual canonical commit is documentation only and is not another deployed runtime.

The owner authorized OFF deployment followed by ON deployment of the same version after safety checks, and emergency OFF on a critical service failure. Paid generation remains unauthorized. No new quality-evaluation gate was added; incomplete expanded evaluation and E.6B P84 OWNER_NOT_PASS remain historical facts.

## Preflight and backup

Original private backup, created `2026-10-21T06:02:18.249Z` (15:02:18 KST): SHA-256 `623314a60590724b3fd96d2e5108d0988a5603f048f7a1daf864a9af50e8f7b3`. Original bytes remained unchanged. Version 7 / migration `0019_credit_policy_budget.sql` / 16 datasets. Official `backup:validate` and `backup:plan` both exited 0 on f2b4afc. No restore was run.

Supported read-only Sites inspection compared all backup fields in the 15 non-settings durable tables with Production before deployment: no missing, changed or additional rows at those observations. Settings were deliberately not dumped because the live table can contain legacy authentication material; the backup's five allowlisted settings passed official validation. This is not a claim of a new atomic 16-table live snapshot.

Initial baseline included 62 wallets, 191 ledger entries, two users and two authentication accounts. Policy revision 1 was intact; Assistant admissions and monthly costs were empty. D1 binding `DB` and both 0019 tables were present. The hosted internal migration journal is not exposed by this read-only tool: the 0019 conclusion combines accepted prior migration, backup marker, schema and unchanged SQL, not a new migration execution.

All 20 packaged migration SQL files were byte-identical to canonical. 0019 SHA-256: `afaacd686ad6632fe627f961d19d90466236a8251ce55778ec4f8efe1971709a`. SWNN changes introduce no schema, backup, Account/Credit policy, Assistant configuration or scheduler-interval change. No migration, ad-hoc SQL, restore or manual article recovery was executed.

## Validation and packaging

The existing f2b4afc validation was reused: 15 related collection suites, TypeScript, build and diff-check passed; lint had zero errors and one existing warning. Earlier Assistant regression evidence on unchanged Assistant sources was retained (generation, provider, admission, refund, headroom, policy, UI/workspace, grounding, attribution and P44). These are synthetic/local results, not paid Production generation acceptance.

A fresh official Sites packaging build passed. The tracked installer was invoked explicitly through bash after the wrapper encountered its existing non-executable file mode; tracked source was not changed. Local compressed archive hash `af327193c883ffea8cb21f772e2a709797560b3bf5fc38499f4cb0f51ff350b2`; Sites' normalized tar hash `e9a8a48dd48ca3acca08c140358adb4d3b917c1d561fd86d014e864b84e37ff9` was independently reproduced from the same 262 file contents. No environment file was packaged.

## Deployment sequence

All three operations used the same saved v86 and exact source tree. The third was a protective OFF transition, not a retry intended to bypass a failure.

| Stage | Environment | Deployment | Result / UTC completion |
| --- | --- | --- | --- |
| A: AI OFF | 49 | `appgdep_6ad864a768a4819188c0a135689202d9` | succeeded / 07:07:35 |
| B: AI ON | 50 | `appgdep_6ad865a97a9081919c4ab49e6dd90eae` | succeeded / 07:11:52 |
| Emergency AI OFF | 51 | `appgdep_6ad8666c754881919227c520c9fdfcb8` | succeeded / 07:15:11 |

Only `HOLOCRON_ASSISTANT_ENABLED` changed false → true → false. All other environment entries remained unchanged. The dedicated Provider key, Signing Secret and Abuse Secret remained secret entries; their values were not read, replaced or disclosed. Profile remained `gpt-5.4-mini-2026-03-17-o200k-v1`.

## Production acceptance and blocker

Cookie-free HTTP checks, without browser hydration, observed:

- News/home, Works, Quiz, Roadmap and admin-login pages returned 200; News API returned public articles.
- Admin policy page redirected to login; its API returned 401 without authentication.
- Google start returned a Google authorization redirect; a completed Account login was not tested.
- Unauthenticated scheduled collection returned 401; no forced collection ran.
- Stage A Assistant page displayed COMING SOON; retrieval and generation returned 503 ASSISTANT_UNAVAILABLE.
- Stage B home contained the Assistant link; `/assistant` rendered both MVP modes and the archive-title/summary scope disclosure.
- Anonymous generation returned 401 LOGIN_REQUIRED. Full Draft and malformed generation returned 400 INVALID_REQUEST; cross-origin request returned 403 FORBIDDEN. No internal diagnostic/raw response was exposed.
- **One ordinary free retrieval request returned 503 NETWORK_UNAVAILABLE.** No candidate or selection receipt was produced. This blocks the required search/evidence-selection flow and therefore AI launch acceptance.
- Emergency OFF was confirmed with the established acceptance client: `/assistant` again displayed COMING SOON and generation returned 503 ASSISTANT_UNAVAILABLE. A default Python-client verification first received an edge 403/non-JSON response; it was not counted as application acceptance.

No Provider generation request was made. No paid reservation, debit or refund test was performed. Authenticated Account/Admin interaction, hydrated mobile/desktop behavior, actual Provider credentials/billing/model access, successful generation/citations and hosted generation settlement/replay remain NOT VERIFIED.

### Bounded root-cause investigation

`trustedEdgeNetwork()` requires both trusted `Request.cf.colo` and a valid platform `CF-Connecting-IP`; absence causes NETWORK_UNAVAILABLE before admission insertion. The installed Vinext route-handler dispatch reconstructs the request with `new Request(routeHandlerUrl, routeHandlerRequest)`. A network-free synthetic check demonstrated that this reconstruction drops the custom `cf` property while retaining headers. Other Vinext paths explicitly preserve CF metadata.

This is a concrete suspected metadata-loss boundary, not direct telemetry proving exactly which field was absent in the live request. No IP, cookie or secret was logged. No arbitrary X-Forwarded-For fallback, trust relaxation, dependency patch or additional live retry was applied. The next fix should preserve platform-attested metadata through the hosted request adapter and test that boundary without weakening admission security. It requires a separately reviewed source change before reactivation.

## Credit/data observations after deployment

Final bounded read-only audit found 83 wallets and 254 ledger rows. All original 62 wallets and 191 ledger rows retained every field. The 21 added principals were Guests, with exactly 63 +1 CR reward entries: first_visit, opening and attendance once each. Wallet balance/version, ledger sequences/effects, Guest cap and wallet/idempotency uniqueness reconciled. Users and authentication accounts were unchanged. Policy revision was byte-for-field unchanged; Assistant admissions and monthly-cost rows remained zero.

New reward timestamps ranged from 07:08:16.142Z to 07:16:14.304Z. They are consistent with the normal visit-reward path. Whether each visit came from a real visitor or platform rendering is not established; do not label them confirmed user-only activity. This work did not invoke the reward endpoint or run a browser reward test. Pagination briefly overlapped ongoing additions; the completed comparison above uses a subsequent coherent ledger/wallet observation, not an inference from row counts alone. No existing-row deletion, mutation or financial inconsistency was found.

## SWNN and emergency procedure

The SWNN automatic recovery change is deployed in v86 despite AI being OFF. It reuses existing image discovery under the collection lease: recent 90-day published SWNN rows with an empty image, maximum three articles / ten external requests / 30 seconds, with the existing 15-second request ceiling shortened to remaining budget and lease safety margin. Conditional updates protect nonempty/manual images and editorial state. It does not re-summarize or reinsert articles.

Live recovery is **DEPLOYED / SYNTHETIC VERIFIED / NATURAL COLLECTION NOT YET OBSERVED**. No scheduler or recovery POST was forced. Existing missing-image and weekly articles were not manually changed.

Emergency OFF requires changing the Enabled flag and redeploying the saved version. It is not instantaneous and does not cancel an already in-flight Provider request. The observed OFF deployment completed in about 25 seconds; future latency is not guaranteed. Code retains UTC daily $2 and KST monthly $30 / warning $20 limits, Q&A 5 CR / Planner 7 CR, Account-only generation and Full Draft rejection. Cost-limit exhaustion was not deliberately induced in Production.

## Verdict and next action

**LATEST RUNTIME + SWNN DEPLOYED / AI GO-LIVE BLOCKED / AI OFF.** Final Production is v86, environment revision 51. No rollback of source or DB occurred; the same latest source remains deployed.

Resolve the trusted edge metadata delivery issue with a minimal reviewed change, validate the hosted boundary, and obtain the required updated-source deployment approval. Do not request or execute the proposed paid QA/Guide tests until free retrieval works. Paid tests, if later approved, remain at most one Q&A plus one Guide, total reservation ceiling 52,800 micro-USD, no automatic retry.

Historical evaluation manifests/approvals/journals/private D1 were untouched. No new evaluation phase or paid approval was created. Galactic Racing remains the next product priority after AI launch; no Racing implementation was included.
