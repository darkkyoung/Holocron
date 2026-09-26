# HOLOCRON Roadmap

> This roadmap describes implementation order, not product priority forever. Keep each phase independently understandable and avoid combining unrelated work into one large patch.

---

# Phase 0 — Foundation and Documentation

Status: **In progress / baseline established**

Goals:

- Keep `AGENTS.md` as the engineering rules for all coding agents.
- Keep `docs/PRODUCT_SPEC.md` as the source of truth for product behavior.
- Keep this roadmap as the implementation sequence.
- Use `docs/LEGACY_MIGRATION.md` to prevent copying the architecture problems of HolocronArchive_Latest.

Definition of done:

- Product behavior is documented before major new feature work.
- Coding agents can determine what to build and what not to build without relying on chat history.

---

# Phase 1 — News Archive UX Cleanup

Status: **Complete — accepted for Phase 2 work**

Implemented: whole-card external links, real overlaid secondary cards with vertical source edges,
horizontal desktop hover fan-out, narrow-screen click/tap expansion with full-width source cards,
keyboard focus handling and Escape collapse, and dense-stack source selection. Date-only overlaps
are explicitly labeled as uncertain rather than treated as confirmed midnight timestamps.
The existing read-only topic projection preserves persisted topics and publication decisions.
Domain regression tests are available through `pnpm test:stories` (13 assertions).

Browser QA: desktop horizontal fan-out and keyboard navigation checked; 375px, 390px and 768px
frame viewports checked with 1/2/4/7-source fixtures, with no document horizontal overflow.
Source-edge click focus regression was found and fixed. See `docs/QA_PHASE1.md` for evidence and limits.

The remaining physical-device limitation is documented in `docs/QA_PHASE1.md`; by product-owner
direction it does not block Phase 2. No Phase 1 public-card behavior was changed by Phase 2.

Goal: finish the core public news experience before adding another major product area.

Tasks:

- Make the full representative news card open the original article.
- Remove redundant `원문 보기` treatment where the card itself is already clickable.
- Replace the current duplicate-coverage presentation with the agreed stacked-card UI.
- Show secondary source names vertically on narrow visible card edges.
- Expand stacked cards on desktop hover.
- Expand stacked cards on mobile tap.
- Make each expanded source card open its own original article.
- Keep the earliest confirmed article as the representative source.
- Remove / rewrite desktop-only hover instructions on mobile.
- Verify news cards on common mobile widths.

Validation:

- One-source stories remain simple.
- Multi-source stories can be understood without opening a dialog first.
- Every source remains directly reachable.
- No hover-only interaction blocks mobile users.

---

# Phase 2 — Administrator Workflow Hardening

Status: **Complete — implemented and regression-tested**

Implemented: clear administrator action labels; separate published, administrator-excluded and
review states; persisted `topic_override` and `status_override` decisions; thin API routing with
domain/service/persistence modules; and removal of the collector's broad update of existing rows.
New editorial review items and AI processing failures enter review with a visible reason. Existing
manual exclusions are promoted to explicit status overrides by migration, while legacy automatic
editorial exclusions are reclassified as review.

Validation: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm test:stories`, and
`pnpm test:admin-overrides`. Override regression coverage includes manual merge, split, exclude,
restore, automatic-decision precedence and the earliest-article representative rule.

Goal: make automatic processing safely correctable by the owner.

Tasks:

- Rename admin actions for clarity:
  - `같은 주제로 묶기`
  - `주제 묶음 해제`
  - `뉴스에서 제외`
  - `복구`
- Preserve administrator merge / split decisions across later collection runs.
- Preserve administrator exclude / restore decisions across later collection runs.
- Add persistent manual-override state to the data model if needed.
- Ensure automatic topic matching never silently overwrites an explicit administrator decision.
- Improve separation between:
  - published,
  - excluded,
  - review / processing issues.
- Show useful reasons for non-public articles.

Validation:

- A manually split story does not automatically re-merge later without an explicit policy change.
- A manually excluded article stays excluded after refresh.
- Restored content remains recoverable and understandable.

---

# Phase 3 — Collection Pipeline Reliability

Status: **Complete — production verified**

Implemented: independent seven-source adapters (StarWars.com HTML index, five RSS/Atom-capable
feeds, and the Forbes news sitemap); normalized incremental URL deduplication; trusted/non-trusted
Star Wars relevance policy; 90-day and publication-precision handling; pre-AI Review / Character
Spotlight filtering; bounded Korean OpenAI output validation; article/source failure isolation; and
structured per-source collection reports. A one-time idempotent maintenance pass moves legacy
published editorial items to review while preserving explicit administrator publication overrides.

Live endpoint verification on 2026-09-20 returned HTTP 200 for all seven configured discovery
endpoints and confirmed their expected HTML, RSS, or sitemap formats. Deterministic coverage is
available through `pnpm test:collection` (30 assertions), alongside the unchanged Phase 1/2 suites.
The collector remains manually triggered; scheduled hosted execution belongs to Phase 7.

Production regression hardening: the single-owner administrator is authorized server-side with the
configured `HOLOCRON_ADMIN_USERNAME`, `HOLOCRON_ADMIN_PASSWORD`, and
`HOLOCRON_ADMIN_SESSION_SECRET`. Successful login issues a signed, HttpOnly session cookie; missing
configuration fails closed. ChatGPT identity headers, Sites user IDs, display names, and legacy D1
identity rows are not authorization inputs. The first authorized management-state load runs the same
idempotent, override-safe editorial maintenance used by collection, so legacy public Review /
Character Spotlight rows do not wait for a full source refresh.
Phase 3 is complete: production verification confirmed `/admin`, session-protected management APIs,
seven-source collection, OpenAI processing and recovery, editorial filtering/maintenance, and Korean
title/summary publication.

Goal: make the seven-source collector reliable enough for unattended hosted operation.

Tasks:

- Keep incremental URL-based duplicate skipping.
- Confirm each of the seven source feeds / adapters behaves independently.
- Keep `review` and `character spotlight` exclusions.
- Verify Star Wars relevance checks on non-trusted feeds.
- Make failure reports source-specific and actionable.
- Avoid one source failure blocking others.
- Split source-specific collection behavior into adapters when the central collector becomes too broad, following `AGENTS.md`.
- Validate Korean title / summary / category output before persistence.
- Keep fallback behavior for unavailable OpenAI processing.

Validation:

- Re-running collection does not duplicate existing article URLs.
- New articles are added without rebuilding historical data.
- One broken source does not break the complete refresh.

---

# Phase 4 — Works Archive

Status: **Complete — production verified**

Implemented: a dedicated D1 `works` table with an additive Drizzle migration; an independently
validated Works domain/repository/service; a poster-first `/works` archive; and session-protected
`/admin/works` status controls. The initial D1 dataset is seeded once from legacy content data only
(titles, dates, official URLs and existing image URLs), while status remains explicitly administrator
controlled. News collection, article status, grouping, and source visibility remain separate.

Goal: bring the strongest useful non-news feature from the first Holocron into the new architecture without copying the old implementation structure.

Tasks:

- Add a dedicated works data model and Drizzle migration.
- Keep works separate from news articles.
- Add work type values:
  - 영화
  - 드라마
  - 애니메이션
  - 기타
- Add work status values:
  - `upcoming`
  - `recent`
  - `archive`
- Add poster URL, Korean title, original title as needed, release date, official URL, and franchise data.
- Add admin controls for work status so `recent` can move to `archive` earlier or later than the default one-month expectation.
- Build the Works Archive view.
- Add left/right archive navigation between News and Works.
- Use vertical poster-first cards.
- Show Korean title / type / release date over a black bottom gradient on desktop hover.
- Use tap to reveal the same information on mobile.

Validation:

- Works data does not introduce article-specific special cases into the news modules.
- Mobile users can reveal work metadata without hover.

---

# Phase 4.1 — Works Catalog Management & Catalog Completion

Status: **Implementation complete — production verification pending**

Implemented: season-aware optional `series_key` / `season_number` metadata; a targeted, additive D1 catalog migration that preserves existing administrator statuses; completion of the nine Skywalker Saga films plus *Rogue One*, *Solo*, and the theatrical *The Clone Wars*; season-level Ahsoka, Andor, The Mandalorian, and The Bad Batch release units; and session-protected Works create, edit, delete, and status controls. Poster intake remains URL-only and has a safe branded fallback. Featured Work and destination rules remain Phase 5 work.

Validation: `pnpm test:works-catalog` covers date precision, catalog additions, targeted/idempotent migration behaviour, CRUD service boundaries, authentication guard, and poster fallback in addition to the existing Works suite.

---

# Phase 4.2 — Works Metadata Importer

Status: **Implementation complete — production TMDB configuration and poster workflow verification pending**

Goal: let the authenticated Works administrator search TMDB for movie or TV-season metadata, review an editable draft, and then save it through the existing Works CRUD path. TMDB is import-time assistance only: D1 remains the catalog source of truth, public `/works` never calls TMDB, and no automatic synchronization is introduced. Provider identifiers are retained only for duplicate detection and review.

Validation:

- A TMDB movie and a TV season normalize to the existing Works draft model.
- Season 0 is not presented as a default catalog candidate.
- Import never changes a Work status without an administrator save.
- Unauthenticated import endpoints are rejected and a missing server token fails closed.
- TV-season poster refresh queries season images first, persists explicit poster provenance, and labels a series-poster fallback for administrator review. Public `/works` remains D1-only.

---

# Phase 5 — Featured Work and Destination Rules

Status: **Implementation complete — production verification pending**

Implemented: a deterministic, derived `기대작` projection (latest `recent` movie first, otherwise the nearest dated `upcoming` work); one shared destination resolver for featured and normal cards; an official-link unavailable state; Disney+ destinations for non-theatrical destinations; and an accessible three-choice ticket dialog for CGV, 롯데시네마, and 메가박스. No Works schema, catalog, or administrator CRUD change is required.

Goal: complete the intended works UX.

Tasks:

- Add one large `기대작` / featured-work card.
- Selection behavior:
  1. allow a current relevant theatrical `recent` work to occupy the featured position,
  2. otherwise use the nearest `upcoming` work.
- Implement destination rules:
  - `upcoming` → StarWars.com official work / announcement page,
  - `recent` movie → ticketing popup,
  - `recent` non-movie → Disney+ homepage,
  - `archive` → Disney+ homepage.
- Ticketing popup contains:
  - CGV
  - 롯데시네마
  - 메가박스
- Keep destination URLs configurable rather than scattered through UI components.

Validation:

- The featured work changes predictably when status / dates change.
- An administrator can handle early theater removal by moving a movie to `archive`.
- A long-running movie can remain `recent` longer.

---

# Phase 6 — AI Assistant Beta Placeholder

Status: **Complete — production verified**

Implemented: a responsive AI Assistant beta card in the News Archive rail, positioned above the unchanged grouped-story explanation. Its button opens an accessible `COMING SOON` dialog only; no assistant API or AI workflow was added.

Validation: UI regression assertions, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, the existing story / story-stack / admin-UX suites, and production desktop/mobile browser checks passed. No physical-device QA was performed.

Goal: reserve the product location for AI without exposing an unfinished assistant.

Tasks:

- Add an `AI 도우미` card above the existing `같은 소식은 하나로` explanation.
- Keep the grouped-story explanation visible.
- Make the AI button open a `COMING SOON` modal / message only.
- Do not build script generation or general assistant logic yet.

Validation:

- The beta UI clearly communicates that AI is planned, not broken.
- No unused AI assistant backend complexity is added early.

---

# Phase 7 — Scheduled Hosted Collection

Status: **Implementation complete — production dispatch verified; scheduled observation pending**

Implemented: a six-hour GitHub Actions schedule and manual dispatch call an authenticated production-only `POST` endpoint. Manual and scheduled requests share one run service and the existing collector, while an atomic 20-minute D1 lease prevents cross-instance overlap. The existing `last_collection` record now includes trigger, timing, status, counts, source results, and failure information, and the administrator UI identifies the latest trigger.

Production validation: the same scheduler secret is configured in GitHub Actions and the Sites production environment, the workflow is active on canonical `main`, production deployment completed, GitHub Actions `workflow_dispatch` completed successfully, and the administrator UI recorded both scheduled and manual successful runs. The endpoint rejected unauthenticated `GET` and `POST` requests as designed, and the public News and Works archives remained healthy.

Phase completion remains pending until at least one natural scheduled invocation is observed. Phase 8 has not started.

Goal: make the public beta useful without the owner's PC or manual refresh.

Tasks:

- Add hosted scheduled execution for collection.
- Use a cadence appropriate for news freshness and API cost.
- Ensure scheduled collection reuses the same collection pipeline as manual admin refresh rather than creating a second implementation.
- Preserve manual admin controls for on-demand collection.
- Record last run time and useful run results / failures.
- Confirm that automatic collection respects all administrator overrides.

Validation:

- The owner's computer can be off.
- New eligible articles appear after scheduled runs.
- Scheduled runs do not duplicate articles or undo manual corrections.

---

# Phase 8 — Beta QA, Feedback, Analytics, and Public Beta

Status: **Planned — target late September 2026**

Goal: launch a stable public beta, observe real usage for roughly 1–2 weeks, collect feedback and usage evidence, then close the public beta temporarily while post-beta development continues.

Tasks:

- Complete the existing beta QA checklist:
  - desktop layout,
  - common mobile widths,
  - stacked-news tap behavior,
  - work-card tap behavior,
  - administrator authorization,
  - merge / split / exclude / restore persistence,
  - seven-source collection,
  - OpenAI failure fallback,
  - works destinations,
  - cinema popup links,
  - scheduled collection,
  - server-only secrets,
  - copyright / attribution wording.
- Require a successful natural GitHub Actions `schedule` invocation before treating scheduled collection as production-verified.
- Add a public `메모 남기기` feedback entry for beta users.
  - Feedback is submitted to HOLOCRON server-side.
  - The server forwards the message to a dedicated Discord feedback channel.
  - The Discord webhook / credential must remain a server-only secret and must never be exposed to the browser.
  - Keep the form intentionally small; beta feedback collection is the goal, not a full user-account system.
- Add an administrator-only analytics view for the beta report.
  - First confirm whether the current hosting platform exposes usable site analytics.
  - If not, add the smallest privacy-conscious aggregate instrumentation needed to understand daily usage.
  - Prioritize daily visitors / visits, page views, and simple News vs Works usage over invasive user profiling.
  - Do not expose the analytics view publicly.
- Change the Site audience to public only after the Phase 8 release gates pass.
- Operate the beta for approximately 1–2 weeks.
- During the beta, collect:
  - user feedback,
  - usage / traffic metrics,
  - operational failures,
  - mobile / browser issues,
  - feature requests,
  - scheduler / collector reliability observations.
- At the end of the beta, record a short beta-results summary for the next development cycle.
- After the beta window ends, temporarily close the public site or place it in a clear maintenance state while Phase 9 and Phase 10 development proceeds. Administrator / development access may remain available as needed.

Release timing:

- **Public beta target:** late September 2026.
- **Beta duration:** approximately 1–2 weeks.
- The beta is intentionally time-bounded; it is not the final continuous public launch.

Validation:

- Real beta users can submit feedback without exposing Discord credentials.
- The administrator can review useful aggregate beta traffic / usage numbers.
- Beta findings can be summarized after the 1–2 week run.
- The site can transition cleanly from public beta to temporary maintenance without damaging D1 data, secrets, or deployment history.

A custom domain is desirable but is not a beta blocker.

---

# Phase 9 — Full AI Assistant

Goal: implement the full AI feature after the public beta has ended and its findings have been reviewed.

Planned capabilities:

- Answer questions about news stored in HOLOCRON.
- Find related stories for a specific work / character / production.
- Support YouTube creator research.
- When the user requests a script plan:
  1. find related archived stories,
  2. ask the user to select stories,
  3. extract key factual points,
  4. consolidate duplicate facts,
  5. distinguish official information / reporting / uncertain claims where possible,
  6. propose a script outline or first draft plan.

Rules:

- Use selected archive material as context.
- Preserve source attribution.
- Do not invent information absent from available evidence.
- Keep this feature architecturally separate from collection and persistence logic.
- Incorporate relevant beta feedback before declaring the assistant ready for final launch.

---

# Phase 10 — Post-Beta Final Launch Expansion

Status: **Planned — target late October 2026 final launch**

Goal: turn the beta-tested web product into the intended final-launch version, incorporating beta findings and expanding the product without destabilizing the archive core.

## 10.1 Beta findings and source expansion

- Fix release-relevant issues discovered during the beta.
- Add more Star Wars news sources after the beta rather than expanding the source set immediately before beta.
- Every new source must use a source-specific adapter and preserve the existing failure-isolation, deduplication, relevance, and administrator-override rules.
- Do not reduce the reliability of the existing seven-source pipeline merely to increase source count.

## 10.2 Featured Work detail hero

Keep ordinary Works cards in their current compact poster-first design.

Only the single `기대작` / Featured Work becomes a wider, information-rich hero panel:

- poster on the left,
- detailed work information on the right,
- responsive stacking on narrow screens.

Planned detailed fields include, where known:

- Korean / original title,
- director / creator,
- release date,
- release destination or platform / theater context,
- principal cast,
- synopsis,
- existing status-aware destination action.

Do not require every field to exist before rendering the card; unknown data should degrade cleanly. The Featured selection rule remains deterministic unless the product specification is explicitly changed.

## 10.3 KakaoTalk news notifications

Add an opt-in way for users to receive notifications for newly published HOLOCRON news through KakaoTalk.

Product intent:

- the user explicitly opts in,
- the experience may resemble following / adding an official notification channel,
- eligible newly published stories can generate KakaoTalk notifications.

Before implementation, confirm the appropriate Kakao product / API, consent model, message policy, rate limits, and production approval requirements. Do not scrape contacts or infer consent.

## 10.4 Web, desktop, mobile, and paid calendar

The final product direction is:

- Web,
- desktop application,
- mobile application.

The desktop / mobile application work is the **lowest-priority final-launch track** and must not destabilize the core web launch.

Desktop intent:

- a standalone HOLOCRON application similar to a normal desktop app rather than only a browser tab,
- the paid calendar service can run in the background,
- a desktop calendar presentation may remain visible on the desktop in a DesktopCal-like experience,
- upcoming Star Wars work release schedules are synchronized into the calendar automatically.

Mobile intent:

- a mobile HOLOCRON application,
- access to the same core archive / notification / calendar ecosystem as appropriate for mobile.

Paid calendar details, entitlement, account model, desktop packaging, mobile packaging, and store/distribution requirements must be designed before implementation. Do not couple beta infrastructure to an unfinished billing model.

## 10.5 Final launch

- Perform final QA after Phase 9 and the required Phase 10 launch work.
- Reopen / relaunch the public service after the temporary post-beta maintenance period.
- **Final launch target: late October 2026.**
- Preserve beta data and useful feedback / analytics evidence through the transition.

Future directions after the final launch may still include:

- games archive,
- novels archive,
- comics archive,
- additional Star Wars content metadata,
- more franchises,
- personalization / bookmarks,
- independent hosting if product scale or platform constraints justify migration.

---

# Implementation Rule

Do not ask an agent to implement all phases at once.

Preferred workflow:

```text
Choose one phase
→ inspect current architecture
→ make the smallest coherent implementation
→ run lint / build / tests
→ review the diff
→ update roadmap status
→ move to the next phase
```

The objective is not only to ship quickly. It is to keep each future change easier than the last.
