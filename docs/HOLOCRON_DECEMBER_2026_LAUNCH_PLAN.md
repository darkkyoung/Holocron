# HOLOCRON — December 2026 public web launch plan

> Product-owner requirement confirmed **2026-11-09 (KST)**: **publicly relaunch the core HOLOCRON web service by 2026-12-31, even if selected functions stay unopened**. Preferred internal launch window **2026-12-24–12-28**; contingency no later than **2026-12-31**. These are target milestones, NOT a production deployment authorization or proven release readiness.

## 1. Distinguish the launch milestones

- **Core HOLOCRON web launch (MANDATORY by end-December):** publicly accessible `https://holocron.kr` with reliable, test-accepted News Archive, Works Archive, Daily Quiz and baseline feedback/search/navigation. It can explicitly announce that selected future features remain unavailable. The website may already be technically reachable, but this milestone means an **owner-approved public product launch with maintenance/restriction state deliberately cleared**, not simply a successful private test build.
- **Galactic Racing:** isolated 3D simulator / Windows local demo is NOT a Production feature. A `/racing` card/tab may be **COMING SOON**, with no private complete replay JSON, public market, prediction or D1 change by the deadline. Spectator-only live Racing may open separately only if Phase 3-C's server-time, selective-disclosure, caching and recovery gates pass and the owner separately approves. **No Gaming/Credit blocker may force postponing the core December web launch.**
- **AI Assistant:** OFF / COMING SOON until reviewed model/Provider costs, QA, security and explicit activation approval. The university LLM candidate is tracked in GitHub issue #3; verify external commercial/public usage rights, API availability and what “about 8,000 tokens” means before planning activation.
- **Credit predictions / paid features / calendar / Kakao messaging:** do not launch without their own economy, legal, consent, transactional, platform and privacy gates. Hide or clearly label unavailable routes; do not expose dead controls.
- **Standalone Windows / Android / iOS apps:** remain committed product goals, but **not a dependency for the December 2026 web milestone**. Cross-platform work should reuse stable web/API contracts after web release; see `docs/ROADMAP.md` Phase 10.4 and the dated 2026-11-09 platform forecast.

## 2. Minimum launch content (must PASS or be deliberately withheld)

| Category | December public requirement | Go/No-Go evidence |
| --- | --- | --- |
| News | Korean Star Wars stories, correct source attribution/links, dedup/grouping, usable search/category, existing collector scheduling and admin corrections | Live source freshness, data integrity, links, failure isolation, rollback checks |
| Works | Public movie/series archive, posters and safe link routing, featured work when configured, functional navigation | Content and dates spot-check, unknown metadata safe fallback, mobile QA |
| Daily Quiz | One published quiz and archive, 2–5 choices, correct reveal/vote aggregates, admin publishing | Actual endpoint and storage verification, race/duplicate participation checks |
| Shared UX | Desktop and mobile responsive navigation, clear coming-soon labels, accessible controls, feedback and error pages | Desktop 1440/768 and mobile 390/360 plus at least one physical mobile; no horizontal overflow |
| Operations | Admin auth, secrets, collector and database integrity, release monitoring, backups, rollback / forward-repair decisions, privacy and source notices | Production-readiness checklist signed; no unresolved P0/security/data-loss issue |
| Account | Only activate sign-in/Wallet/Credit if fully audited and usable; otherwise launch core content without premature credit obligations | Login/session security and full ledger proof if enabled; explicitly disclose limitations if omitted |

Launch scope is a **product-owner choice, not permission to bypass security**. If Quiz or a content section cannot safely launch, it can be held behind Coming Soon while News/Works form a useful public baseline, subject to explicit owner approval. Do not mark untested features PASS.

## 3. Critical-path dates (KST; planning estimates)

| Date / period | Objective | Decision |
| --- | --- | --- |
| **Nov 09–Nov 23** | Finish isolated Racing v0.13 and independently pin December web launch MVP; inventory current canonical code, Site runtime, D1 journal/backup limits, secrets and deploy rollback capabilities | Owner approves must-open / withheld list; Racing work must not consume release integration capacity |
| **Nov 24–Dec 07** | Integrate **only** required web modules on reviewed baseline; solve release-blocking News/Works/Quiz defects; test read-only source integrity and existing schema | No unapproved migrations; component-level CI and realistic staging |
| **Dec 08–Dec 16** | Freeze new feature additions; full desktop/mobile UX, auth, admin, collector, privacy/security and smoke tests; validate production backup and safe migration pathway | Release candidate (RC) gate or cut optional features |
| **Dec 17–Dec 23** | Controlled final QA, content curation, staged deployment planning, manual rollback/forward-repair drill, launch copy/coming-soon pages and alerts | Explicit written GO/NO-GO; do not use “feature ready” as Production evidence |
| **Dec 24–Dec 28** | **Preferred core web public launch window** upon explicit approval, with Racing/AI/Credit optional and OFF unless separately accepted | Public smoke tests and monitoring |
| **Dec 29–Dec 31** | Buffer for release blocking fixes and final approved public release no later than Dec 31 | Deadline is a planning commitment; actual release still must satisfy safety gates |
| **2027 onward** | Racing Phase 3-A–3-D, credit markets, full-fledged apps and monetization by separate gates | No automatic activation from this document |

If a required feature threatens the deadline, reduce **scope**, not QA rigor or financial safeguards. Hard technical blockers (uncertain Production schema, unverified original backup, missing authorized recovery path, data-loss/security issue) require an owner escalation and may prevent a safe public launch; do not secretly ignore them to hit a date.

## 4. Deployment authority and reporting

- **No Production change is authorized by this plan.** Main, Production Sites, D1, Migration, Wallet/Ledger, provider state, AI OFF and scheduling remain untouched until separately approved.
- Before an actual release: fresh fetch canonical main; compare reviewed runtime/tree to Production deployed code; obtain sanctioned production journal/constraints/backup proof; test clean/upgrade on isolated D1; stage only reviewed changes; decide reversible forward repair, since code rollback does not roll back DB.
- Record actual public launch timestamp, deployed SHA, Production Sites version, artifact hashes, core module smoke-test statuses, withheld routes, monitoring and restart/incident ownership.
- Keep `COMING SOON` accurate and safe: do not leak simulated future winner results, open a credit market accidentally, or mislead users that AI features are active.

## 5. Platform commitments after web launch

- Windows desktop standalone HOLOCRON app, separate from the Racing Windows local demo. Phase 10.4 already describes DesktopCal-like optional paid background calendar synced with Star Wars release dates. Target planning window **June–July 2027**.
- Android app target **July–August 2027**; iOS target **August–September 2027**. These are effort forecasts, not store commitments; device/permissions/store reviews remain external gates.
- Evaluate a maintainable shared UI/API implementation and platform-specific auth, secure storage, graphics, notification, updater and payment policy; web-only PWA does not complete native app release scope.

## 6. Relationship to Galactic Racing

Racing `galactic-racing-0.12.0` remains isolated and v0.13 cinematic final-lap acceptance is in progress. The previously forecast **2027-03 spectator-only beta / 2027-05 full web Racing** is a separate feature launch, not the core HOLOCRON December launch. Dates must be re-estimated after real Phase 3 gates, especially if the academic term limits working time.

**Owner priority from 2026-11-09: ship a trustworthy, useful core HOLOCRON web service publicly by December 2026; unready advanced features may remain unopened.**
## 7. Accelerated Galactic Racing weekly scenario — actual prototype velocity review (2026-11-09)

This is a **stretch implementation plan**, not proof that operational gates can be completed at prototype speed. Source: on the isolated Racing branch v0.4 was being delivered Oct31, v0.5–v0.8 Nov1, v0.9 Nov2, v0.10–v0.12 Nov5; v0.13 engine and 40k holdout already exist as an in-progress Nov9 checkpoint. That speed is largely isolated UI/simulator work; no production-quality broadcasting, D1 schema reconciliation or credit settlement has passed yet.

**Release scenarios for Dec 24–28 (explicit owner approval at each gate):**
- **Minimum commitment:** core HOLOCRON web launch + actually playable/viewable \`/racing\` with previously FINISHED public races and replays, no live market, no hidden future results to leak.
- **Primary target:** above + regular/custom seasons and server-time synchronized spectator broadcast **only if** Phase3-A/B/C security/operations gates pass.
- **Stretch:** above + Credit predictions/settlement **only if** the independent Phase3-D finance, legal, D1, backup, idempotency, refund and market integrity gates pass. Otherwise defer Credit without blocking launch.

| Week (KST) | Fast-track work | Mandatory gate |
| --- | --- | --- |
| **W1 Nov09–Nov15** | Finish v0.13 cinematic/late Ultimate user acceptance; verify 40k and GPU/mobile evidence; freeze accepted engine; start private \`/racing\` integration planning | Local Windows/browser PASS, unresolved issues and version pin documented |
| **W2 Nov16–Nov22** | Private web \`/racing\` complete-race viewer, replay and mobile fallback; Phase3-A immutable roster/race/engine contracts, isolated D1 and release/version manifests | No Production data changes or secret future races in public bundles |
| **W3 Nov23–Nov29** | Phase3-B isolated regular/custom season scheduling, admin RBAC, no-reroll, audit; complete first live-operations simulator and stage generation API | Auth/CSRF/idempotency/8 entrants/schedule uniqueness, sandbox passes |
| **W4 Nov30–Dec06** | Phase3-C server-time qualifying, public release slices, 21:00 synchronization, late join, reconnect, cache/future-result adversarial tests | Red-team future-leak and incorrect-cache tests PASS; otherwise spectator replay only |
| **W5 Dec07–Dec13** | Phase3-D isolated Credit market/debit/settlement development only if approved infrastructure is available; multi-client live spectator QA and hardware optimization | Financial fault injection, legal/economy rules and restoration proof; no automatic activation |
| **W6 Dec14–Dec20** | Full 7-race virtual-clock rehearsal, audit logs, backups/upgrade fixtures, security/mobile QA, defect fixing, selective feature freeze, stage RC | Release GO/NO-GO; cut Credit or live broadcast independently if blocked |
| **W7 Dec21–Dec27** | Controlled preproduction release, authorized staged \`/racing\` launch, existing core archive regression and monitored HOLOCRON public debut (preferred Dec24–28) | Production deployment only with separate explicit approval; verified SHA/migration/backups |
| **W8 Dec28–Dec31** | Hotfix/recovery buffer and final core-web milestone, keep nonpassed modules closed | Never force unsafe features on merely to meet deadline |

**Critical product finding from v0.13 in-progress 40k (Nov09):** narrowed 88–96% launch window gives **67.79% races with no Ultimate and 0.71% with two Ultimate activations**, so previously praised Hyper→Gold reversal sequences become infrequent. This must be shown to owner before final engine freeze; do not silently widen the policy to compensate. Official QA and Windows rendering are not yet complete at this checkpoint.

The older March/May 2027 Racing feature dates in \`docs/ROADMAP.md\` are **contingency estimates** when full Phase 3 gates cannot safely close in December. This faster plan changes **priority and implementation parallelism**, not the safety or legal acceptance criteria. Windows/Android/iOS standalone app forecasts remain separate after the December core-web release.

