# HOLOCRON Product Specification

> Status: Post-Beta / Phase 9C design complete; Account/Credit foundation and Guest rewards implemented (private deployment/login pending); Galactic Racing design approved but not implemented; existing Site owner-only while preparing launch
>
> This document defines the agreed product behavior for HOLOCRON. Implementation details may evolve, but user-facing behavior should not be changed silently.

---

# 1. Product Goal

HOLOCRON is a Korean Star Wars news, works, and fan-participation archive.

The beta focuses on three primary experiences:

1. **News Archive** — collect Star Wars news from multiple sources, summarize it in Korean, group duplicate coverage into one story, and let the administrator correct the result.
2. **Works Archive** — browse released and upcoming Star Wars screen works through poster-first cards and open the appropriate viewing, ticketing, or official page.
3. **Daily Quiz** — present a lightweight Star Wars multiple-choice quiz, reveal the answer and aggregate choice percentages immediately after participation, and preserve past public quizzes as an archive.

The service should remain simple enough to understand at a glance while allowing future expansion.

---

# 2. Primary Navigation

The public experience has three main archive views:

- **뉴스 아카이브**
- **작품 아카이브**
- **퀴즈**

The user should be able to move between them with an obvious left/right navigation affordance. The transition may feel like moving to the next archive panel, but the implementation does not need to be a literal carousel if that makes routing, accessibility, or maintenance worse.

An **AI 도우미** entry is also shown in beta, but the full AI assistant is not implemented until a later phase.

### 2.1 Works metadata import

The administrator may use TMDB as a **manual import assistant** from Works administration. TMDB is queried only after an authenticated administrator requests a search; its result is shown as an editable draft and is never automatically synchronized into HOLOCRON. D1 remains the Works catalog source of truth. The public Works archive never depends on TMDB availability. TMDB provenance may be stored solely to prevent duplicate imports and to make administrator review clear. For TV seasons, season-image candidates are preferred over a series poster; the saved poster provenance explicitly distinguishes `시즌 전용`, `시리즈 공통 fallback`, and administrator-supplied images. Wookieepedia/Fandom may be used only as an administrator-reviewed reference URL, never as a runtime scraper or automatic source.

---

# 3. News Archive

## 3.1 Sources

The beta uses these seven sources:

1. StarWars.com
2. Star Wars News Net
3. Collider
4. The Hollywood Reporter
5. Deadline
6. Variety
7. Forbes

Source-specific failures must not stop collection from the remaining sources.

The seven-source set is the beta baseline. Additional news sources are intentionally deferred until after the beta, when source coverage can expand using the same adapter, deduplication, relevance, failure-isolation, and administrator-override rules.

---

## 3.2 Incremental Collection

News refreshes are incremental.

For each source:

1. Read currently available feed / public metadata.
2. Ignore articles whose URL already exists in the database.
3. Ignore content outside the active collection window.
4. Apply Star Wars relevance filtering where needed.
5. Exclude editorial formats intentionally outside the archive scope, including `review` and `character spotlight`.
6. Process only new candidate articles.
7. Generate Korean title / summary / category when AI processing is available.
8. Match the article to an existing topic only when it is substantially the same news event.
9. Store the article in D1.

The collector must not rebuild the entire archive every time.

### 3.2.1 Hosted schedule and concurrency

Production collection runs every six hours through GitHub Actions, with manual dispatch available for verification. The workflow sends an authenticated `POST` request to a dedicated server endpoint; it does not build the application or use administrator credentials.

Manual and scheduled requests must enter the same collection-run service and existing incremental collector. A single atomic, expiring D1 lease prevents overlapping work across Worker instances. If another run already holds a live lease, the later request is recorded as skipped rather than starting a second collection. Only the current lease owner may release it, and an expired lease can be reclaimed safely.

The existing `last_collection` metadata records the trigger, start and finish times, status, counts, per-source results, and failures. The administrator UI identifies whether the latest run was manual or scheduled. The scheduler secret must remain server-side, fail closed when absent, and never appear in a URL, client bundle, log, or database.

---

## 3.3 Topic Grouping

Different outlets often report the same event.

Articles about substantially the same event share the same `topic` and render as **one news story group**.

Articles must NOT be grouped only because they:

- mention the same character,
- mention the same production,
- belong to Star Wars,
- share broad keywords.

### Representative article

Within a topic group, the **earliest confirmed published article is always the representative article**.

This rule applies whether the topic was grouped automatically or manually by the administrator.

If publication timestamps are incomplete or date-only, the UI must not imply false precision.

---

# 4. News Card Stack UI

Desktop two-column stacks expand toward the adjacent column: left stacks fan right,
right stacks fan left. The representative card retains its collapsed position and
width; only related layers move. Expansion controls do not change layout height.
Mobile/coarse-pointer devices retain compact source strips, not a horizontal fan.

## 4.1 Single-source story

A story covered by one source appears as one normal news card.

Clicking the card opens the original article in a new tab.

A separate `원문 보기` footer action is unnecessary once the whole card is clickable.

---

## 4.2 Multi-source story

A story covered by multiple sources appears as a **stack of physical-looking cards**.

### Default state

- The representative article is fully visible in front.
- Additional article cards are visually stacked behind it.
- Only a narrow vertical edge of each additional card is visible on the right side.
- Each visible edge displays the source name vertically.

Conceptually:

```text
┌────────────────────────────┐┃Variety
│                            │┃
│     Representative         │┃Deadline
│        news card           │┃
│                            │┃THR
└────────────────────────────┘┃
```

### Desktop interaction

Hovering over the stacked edge area expands the cards horizontally, similar to books or cards fanning open.

Each expanded card can be clicked independently and opens that source's original article.

Clicking the representative card itself opens the representative article.

### Mobile interaction

Mobile has no hover state.

- First tap on the stack area expands the secondary coverage as compact, full-width source strips below the representative card.
- A source strip shows the source name, date, and a concise title without repeating the image or summary card.
- Tapping a specific source strip opens that source's original article.
- The interaction must remain usable on narrow screens without requiring horizontal precision.

Do not rely on hover-only instructions in the mobile UI.

---

# 5. News Card Content

A news card may show:

- article image,
- Korean title,
- short Korean summary,
- category,
- source,
- publication date,
- grouped-source indicator when applicable.

The public UI should remain concise. Full article text is not reproduced by HOLOCRON.

## 5.1 Search, category filtering, and pagination

The public News Archive supports combined title/summary search and category filtering over grouped stories. Categories are derived from the representative stories currently present in the public archive; the UI does not invent empty category choices. A manual administrator title override participates in search and becomes the displayed title.

Filtering happens before pagination. Changing the search query or category returns to page 1. Pagination counts each grouped story once and displays at most five layout rows per page: five stories in a one-column layout and ten stories in a two-column layout.

---

# 6. Administrator Workflow

## News ↔ Works (Phase 9A)

`article_work_relations` persists a many-to-many relationship at Article level.
Public Stories union linked Works from their public, enabled-source member articles
within the existing 90-day archive. Related counts count Stories, not outlet rows.
News search, category and the compact **모든 작품** select compose before pagination;
changing any filter returns to page 1. Only Works with related public Stories appear.
`/?work=<stable-work-id>` selects the Work; invalid/deleted IDs safely show all Works.

Works keep their existing official/cinema/Disney+ destination button. A separate
**관련 소식 N** action opens an accessible, viewport-safe dialog with up to eight
recent Story rows (date, title, source count), without repeated hero images. Its
**뉴스 아카이브에서 모두 보기** link uses the same Work filter and shared projection.

The News administrator's **관련 작품** editor applies to the individual article,
including members of grouped Stories and review/excluded queues. Link, exclude and
relink are explicit manual decisions; excluding persists `excluded/manual`, not a
delete. Automation never overwrites any existing manual state. No implicit group
bulk edit erases different member decisions.

Automatic association uses normalized catalog Korean/original titles and safe
prefix variants, with no extra AI calls. Generic Star Wars and ambiguous series or
season mentions are skipped. One catalog index is reused per collection/recovery
association batch. Failures are nonfatal and reported. **관련 작품 재검사** processes
existing articles in stable-ID batches of 200, reports inspected/added/ambiguous/
unmatched/manual-preserved counts and offers the next batch. Repeating is safe.
This only adds derived relations and preserves all article fields and overrides.
Catalog edits do not silently reinterpret past manual or automatic links; operators
can exclude incorrect links and rerun maintenance for new matches.

Relations have cascading foreign keys to Articles/Works. Both public cache tags
are invalidated on relation changes; the shared public projection depends on both
tags. Existing per-isolate cache/60-second cross-isolate limitations still apply.
The additive migration and backup v2 include both linked and excluded relations;
v1 historical backup inspection remains supported. No restore executor is added.

Automation runs first. The administrator reviews and corrects the result afterward.

The intended public-facing admin action names are:

- **같은 주제로 묶기**
- **주제 묶음 해제**
- **뉴스에서 제외**
- **복구**

## 6.1 Same-topic merge

Selecting two or more articles and choosing `같은 주제로 묶기` assigns them to one topic.

The earliest published article becomes the representative article.

## 6.2 Topic split

Selecting articles and choosing `주제 묶음 해제` separates the selected articles from their current grouped topic.

## 6.3 Exclude / restore

`뉴스에서 제외` removes an article from the public archive without deleting it.

Excluded articles remain recoverable from the administrator interface.

`복구` returns the article to the public archive.

## 6.4 Administrator decisions override automation

Manual administrator decisions are authoritative.

Once an administrator manually merges, splits, excludes, or restores content, later automatic collection / topic matching must not silently overwrite that decision.

Persistent manual override state must be represented in the data model rather than inferred only from the current UI state.

## 6.5 Article title override

The administrator may set or remove a public title override for an individual article. The generated/localized title remains stored separately and automatic collection, localization, or AI recovery does not erase the manual override. Removing the override immediately restores the generated title. A title change does not alter source attribution, URL, publication time, topic membership, category, or the earliest-publication representative rule.

## 6.6 Public site copy management

The authenticated administrator may edit a limited set of fixed public-facing copy without changing application code or article/work data. Editable copy includes the News hero eyebrow, title, highlighted title, and description; News source-rail description; grouped-story explainer title/body/hint; fan-project and non-affiliation rail copy; shared public footer tagline/legal copy; and the Works hero eyebrow, title, highlighted title, and description.

These values are stored as one versioned JSON setting in the existing D1 `settings` table. No separate schema migration is required. Missing, malformed, blank, or incompatible stored values fall back safely to repository defaults. Saving custom copy is authenticated, same-origin, length-limited, and does not modify collected articles, Works rows, grouping, attribution, or administrator overrides. The administrator can restore all copy to repository defaults.

---

# 7. Review States

The administrator interface should distinguish concepts clearly.

At minimum, the UI should avoid presenting all non-public content as if it failed for the same reason.

Useful distinctions include:

- published,
- excluded,
- review / processing issue.

Reasons should remain visible where useful, such as:

- manually excluded,
- review article,
- character spotlight,
- missing metadata,
- failed AI processing,
- ambiguous topic match.

Exact internal status modeling may evolve as long as public and administrator behavior remains clear.

---

# 8. Works Archive

The beta Works Archive includes **screen works only**.

Included types:

- 영화
- 드라마
- 애니메이션
- 기타 영상 작품

Not included in beta:

- games,
- novels,
- comics.

These may be added only after the core service is stable.

---

# 9. Work Status

Works use three product states:

## `upcoming`

Not yet publicly released.

## `recent`

A recently released work that should still receive prominent treatment.

As an operational default, this is roughly the first month after release, but the administrator may keep a work in `recent` longer or move it to `archive` earlier.

## `archive`

An older released work.

The status transition is intentionally administrator-adjustable because theatrical runs and release behavior vary by title.

When no works have `recent` status, the public `최근 공개` section is omitted rather than rendering an empty placeholder. It reappears automatically when the administrator moves at least one work into `recent`.

## 9.1 Catalog management and release units

Each Works row represents one independently managed release unit. A film is one work; a series or animation may use one row per season when its seasons have different release dates or statuses. Episodes are not Works rows.

The administrator may create, edit, and delete Works through the protected Works administration route. D1 remains the catalog source of truth after bootstrap. The administrator supplies Korean title, original title, type, status, release date with explicit precision, poster URL, and official URL. Missing or invalid poster images render a HOLOCRON placeholder rather than a broken image.

---

# 10. Featured Work / 기대작

The Works Archive contains one large featured card.

Selection priority:

1. A `recent` work whose type is `영화` occupies the featured position. If more than one qualifies, use the most recently released work.
2. Otherwise, show the `upcoming` work with the nearest known release date.

The selection is a deterministic projection of the D1 catalog, not a separately stored featured flag. Ties use the archive's stable title ordering. Upcoming works without a release date follow dated upcoming works and are considered only when no dated upcoming work exists. An archive-only or empty catalog has no featured card.

Example behavior:

- During the theatrical release period of *The Mandalorian and Grogu*, it may be shown as the large featured work.
- When no current release needs that position, the nearest upcoming work (for example, Ahsoka Season 2 when it is the closest upcoming title) becomes the featured card.

The administrator may adjust work status when real release conditions differ from the default timing assumption.

## 10.1 Final-launch Featured Work detail layout

Only the deterministic Featured Work uses `FeaturedWorkHero`; ordinary WorkCard layouts and interactions remain unchanged. No manual Featured flag exists. Selection remains newest recent movie, otherwise nearest dated upcoming Work with the existing stable title/undated fallback; archive-only and empty catalogs have no Hero.

Desktop (>820px with a fine pointer): persistent wide feature area, vertical poster on the left, Korean/original titles, status/type, release date and optional release context on the right. Creator/director credit, up to five principal cast names, and a synopsis clamped to four lines appear only when saved. Thin dividers and restrained yellow accents retain the archive identity.

Mobile (<=820px or coarse pointer): compact horizontal preview with a 104px vertical poster, essential title/status/date only, and approximately 180px natural height (long accessible text may grow). ONE tap opens a detail dialog; the preview never navigates externally. The dialog is at most 85dvh tall and 520px wide, inset 12px on each side, with internal vertical scrolling. Full saved synopsis and up to eight cast names are available there. Radix supplies focus trapping, Escape/backdrop dismissal and page scroll locking; closing restores the invoking control's focus.

Explicit destination actions reuse the existing resolver: official page, cinema choice, Disney+, or unavailable. Related News uses the same Phase 9A Story projection/count, with no new queries or client fetching. Detail, news and cinema content switch inside ONE modal root, sharing the ordinary cards' news/ticket content.

Optional durable Work metadata: `creator_credit` (240 characters), `principal_cast` (JSON array, eight unique names of at most 100 characters), `synopsis` (1,500 characters), and `release_context` (120 characters). The protected Works editor supports manual editing/clearing. Names are trimmed and deduplicated using NFKC/case normalization. Omitted metadata in legacy updates is preserved; explicit blank/null clears it. Missing metadata rows are omitted, never invented. Release context is administrator-authored because status/type/destination alone cannot establish the actual release platform.

TMDB enrichment for these new fields is deferred: the existing importer lacks season-specific credits, and no new runtime or automatic synchronization is introduced. Its drafts retain existing manual metadata. Public rendering uses D1 Work rows exclusively. Backup v3 deliberately includes these fields; v1/v2 retain their historical contracts.

---

# 11. Work Card Design

Normal works use poster-oriented vertical cards.

Default state:

- poster is the main visual,
- no large persistent description block,
- minimal chrome.

### Desktop hover

Hovering a poster reveals an overlay rising from the bottom with a black gradient while keeping a substantial portion of the poster visible.

Overlay text:

- Korean title,
- work type,
- release date.

Text is white over the dark gradient.

### Mobile tap

Mobile replaces hover with tap.

The first tap reveals the same metadata overlay. The next deliberate action opens the destination associated with that work.

---

# 12. Work Card Destinations

Destination behavior is status- and type-aware.

## Upcoming work

`upcoming` → open the corresponding official StarWars.com work / announcement page.

If `officialUrl` has not been entered, the card still reveals its metadata but reports that the official page is not ready. It never uses an empty or guessed link.

## Recent movie

`recent` + type `영화` → open a ticketing choice popup.

Ticketing popup options:

- CGV
- 롯데시네마
- 메가박스

Selecting one opens that cinema's ticketing site.

If a movie leaves theaters earlier than expected, the administrator can move it to `archive`. If it remains relevant longer, it may stay in `recent`.

## Recent non-movie work

`recent` + non-movie → Disney+ homepage.

## Archive work

`archive` → Disney+ homepage.

A work-specific Disney+ deep link is not required for beta. The general Disney+ homepage is acceptable and matches the intended user flow for a subscription OTT service.

---

# 12.1 Daily Quiz

The beta includes a lightweight public **퀴즈** tab at `/quiz`.

- The newest currently public quiz is presented as the current Daily Quiz.
- A quiz includes a question, exactly one correct answer, an answer explanation, and two to five administrator-authored choices. There is no separate public or administrator-authored quiz title; the existing non-null database title remains an internal compatibility value derived from the question.
- A quiz may include one optional hero-image URL and an optional safe HTTP(S) destination for that image. Each choice may include an optional image URL.
- Hero and choice images are rendered in a 1:1 frame. The administrator adjusts focal position and zoom in a preview; source-independent crop metadata is stored and replayed with CSS on the public page. Images remain URL-only and are not re-encoded in the browser.
- Participation uses the existing anonymous browser cookie; one quiz response is stored per quiz + browser-session hash. No account, nickname, IP address, email, or real name is required for quiz participation.
- Clearing the cookie or using another browser/device can produce a new anonymous session; this is acceptable because the quiz is a lightweight fan feature, not a competitive or prize-bearing system.
- Before voting, correctness, the answer explanation, and aggregate percentages are not exposed to the public client. Immediately after the first response, the UI reveals the correct choice, the answer explanation, total participation, and each option's aggregate selection percentage.
- Revisiting the same quiz with the same browser session returns the stored response/result instead of allowing the choice to be changed.
- Public quiz history remains accessible from the Quiz archive.

Administrator quiz management lives at `/admin/quiz` and supports create, edit, delete, draft, immediate publish, scheduled publish, two-to-five-choice controls, and 1:1 image crop adjustment. Quiz and option images use administrator-supplied URLs rather than introducing a new upload/storage subsystem. Scheduled publication is query-time: a scheduled quiz becomes public once its saved KST publication timestamp has passed, so no extra cron job is required.

Once a quiz has responses, its choices, choice-image crop metadata, and correct answer are immutable through normal administration so existing results remain coherent. The administrator may still correct presentation metadata such as the question wording, hero image/crop/link, explanation, and publication settings.

---

# 13. AI Assistant — Beta Placeholder

The News Archive exposes an **AI 도우미** floating launcher at the bottom-right, separate from the source rail and its existing grouped-story explanation.

During beta:

- the rounded launcher uses the existing yellow accent and remains keyboard accessible on desktop and mobile,
- activating it opens a small dialog marked `COMING SOON` with the message `AI 도우미는 준비 중입니다.`,
- the dialog can be dismissed with its close button, Escape, or the backdrop,
- no chat input or incomplete AI workflow is exposed to the user.

The existing explanation of HOLOCRON's grouped-story concept remains visible below the AI Assistant card.

---

# 14. AI Assistant — Final-Launch Design (Phase 9C)

Phase 9C defines the design; **Phase 9D implementation has not started**. The current `COMING SOON` placeholder remains unchanged, and this design does not expose the assistant publicly or deploy an application version.

The authoritative architecture, contracts, quotas, security requirements and ordered Phase 9D plan are in [AI_ASSISTANT_DESIGN.md](AI_ASSISTANT_DESIGN.md).

The final-launch MVP has two experiences:

1. **Archive Q&A:** show related Stories, then answer from selected current public HOLOCRON titles, Korean summaries and source metadata with visible citations.
2. **Script planner:** topic → visible candidate Stories → explicit user selection → selection review → cited facts, reporting differences, outline and optional original draft. Creative narration is distinguished from sourced facts.

Use the existing 90-day public archive, Work relations, administrator overrides and Story grouping. Search is deterministic; no runtime article scraping, model-memory answers, embeddings or AI reranking. Return at most 12 candidate Stories; Q&A uses up to 6, and script mode requires selection of 1–8. Multiple outlets remain supporting evidence within one Story. Insufficient archive evidence produces an explicit limitation, not an invented answer.

The server reloads selected evidence from D1, checks freshness and constructs citations. Source identity and claim certainty remain distinct; a media report is not automatically rumor, and an official channel does not make every interpretation confirmed. Article text and administrator copy are untrusted data, never model instructions.

Use one bounded, non-streaming generation call behind a server-only provider/model configuration boundary. Do not persist conversations or generated answers. Public cost controls use a dedicated pseudonymous session/network strategy and bounded temporary rate-limit state; any required operational migration and backup compatibility work belong to Phase 9D only.

The future dedicated assistant page uses evidence-first forms and a staged script workflow. Mobile uses a single-column results → selection → review → generate flow. Existing News, Works, Quiz and Roadmap navigation remains unchanged. No functional assistant or AI endpoint is implemented by this specification update.

---

# 14.1 Account & HOLOCRON Credit — Foundation Implemented

Account/Credit is a prerequisite layer for public AI generation and future Galactic Racing. See [ACCOUNT_CREDIT_DESIGN.md](ACCOUNT_CREDIT_DESIGN.md). Phase 9C.2-A implements the dedicated Guest credential, internal account/provider linkage, shared principal/wallet/ledger, atomic idempotent credit/debit/refund and backup v4. New wallets start at 0 CR. Phase 9C.2-B implements explicit visit POST rewards (+1 first visit, +1 opening, KST weekly attendance 1/1/1/1/1/1/5), atomic first-response Quiz rewards (+3 correct / 0 wrong), Guest cap 10 and public balance/attendance UI. Missed days break the weekly streak; capped claims remain consumed. Existing Quiz identity/results and TMDB `/credits` are preserved. Private deployment/migration and actual browser acceptance remain pending. Next is Phase 9C.2-C Google login and Guest→Account migration. Account login/Web Push rewards and AI/Racing spending in the table remain planned.

| Rule | Credit |
| --- | ---: |
| Guest first visit | +1 |
| Account first login | +3 |
| One-time opening / first-visit commemorative bonus | +1 |
| Weekly attendance Day 1–6 | +1/day |
| Weekly attendance Day 7 | +5 |
| Daily Quiz first submitted answer correct | +3 |
| Daily Quiz first submitted answer wrong | 0 |
| First successful Web Push enable, account only | +1 |
| Archive Q&A | -5 |
| Script Planner / composition / outline | -7 |
| Full script draft | -15 |
| Existing result revision | -3 |

Guest balance cap is 10 CR. Logged-in accounts have **no product-level balance cap**. There is no generic activity Credit ceiling; each reward is independently bounded/idempotent.

Quiz Credit is based on the **first submission only**. Web Push activation rewards only the first successful enable per account and costs 0 CR.

AI technical failure before valid delivery is refunded in full. A valid result followed by deliberate regeneration is a new charged request.

Credit is non-cash, non-transferable, not sold for money at launch, and not externally redeemable. Core archive reading remains free.

# 14.2 Galactic Racing — Planned Fan-Participation System

See [RACING_DESIGN.md](RACING_DESIGN.md). No race simulator, prediction API, 3D renderer, schema, or public Racing tab exists yet.

- 8 original racers; 7 daily races form one weekly season.
- Daily prediction: 00:00 KST open → 20:00 qualifying → 20:55 close → 21:00 race.
- One account chooses one racer per market, maximum 30 CR.
- Daily winner and first-three-days season-champion markets.
- Crowd stake distribution creates dynamic favorite/underdog payout ratios; exact pool retention is tuned later.
- Qualifying changes starting grid only; no hidden direct performance buff.
- Race outcome is generated once at race time and is immutable; administrators do not preselect/pre-know a future winner.
- Completed races remain available as result + Replay.
- Good events/Ultimate have mild lower-rank comeback weighting without guaranteeing a comeback.
- Ultimate duration/power are random and it never guarantees P1.
- Bad events are Minor/Medium/Major; Major includes rare DNF/DSQ. Initial guardrail: normally 0–1 and no more than 2 of 8 DNF/DSQ.
- Visual direction: low-poly 3D track/vehicles + hand-drawn 2D racer billboards facing the broadcast camera.
- Track variety: base geometry + environment/event table + Normal/Reverse/Mirror, with lightweight Reverse ramps/bridge/slope overlays. Target roughly 14–20 distinct-feeling variants without 20 independent maps.
- Racers, vehicles, planets and tracks are original fictional designs rather than a dependency on official Star Wars game assets/names.

---

# 15. Mobile Requirements

Mobile is a first-class supported layout.

At minimum:

- news cards must remain readable on narrow screens,
- stacked-source UI must work through tap instead of hover,
- work poster metadata must work through tap instead of hover,
- Daily Quiz choices, choice images, result percentages, answer sheet, and archive links must remain usable on narrow screens,
- dialogs must fit the viewport,
- News and Works show a bottom-center scroll-to-top control only after meaningful scrolling,
- the News AI launcher remains bottom-right and does not overlap the scroll-to-top control or dialogs,
- admin actions must remain usable through touch,
- desktop-only instructional text must not be shown unchanged on mobile.

Responsive CSS existing in the project should be tested on real common viewport widths rather than assumed correct because media queries exist.

---

# 16. Beta Scope and Release Window

Required before public beta:

- stable news archive,
- seven-source incremental collection,
- Korean title / summary processing,
- topic grouping,
- stacked duplicate-story UI,
- administrator merge / split / exclude / restore,
- persistent administrator overrides,
- Works Archive,
- featured work,
- work status management (`upcoming`, `recent`, `archive`),
- cinema ticket popup,
- Disney+ / StarWars.com destinations,
- Daily Quiz public participation, result aggregation, administrator creation, and scheduled publishing,
- mobile usability,
- AI Assistant `COMING SOON` placeholder,
- scheduled article collection suitable for hosted operation,
- a small public `메모 남기기` feedback path,
- an administrator-only way to review useful beta traffic / usage metrics.

Not required before beta:

- full AI Assistant,
- YouTube script generation,
- expanded post-beta news-source set,
- KakaoTalk news notifications,
- the final information-rich Featured Work hero,
- desktop / mobile applications,
- the paid release calendar,
- games / novels / comics archive,
- additional franchises,
- advanced user accounts / personalization.

Release plan:

- **Public beta target:** late September 2026.
- **Beta duration:** approximately 1–2 weeks.
- After that time-bounded beta, public access is temporarily closed or placed in maintenance mode while post-beta development continues.
- Phase 9 and Phase 10 are developed after beta feedback and usage evidence are reviewed.
- **Final launch target:** late October 2026.

---

# 17. Beta Feedback / 메모 남기기

During the public beta, users can submit a small feedback message through a `메모 남기기` entry.

The beta feedback flow is:

```text
Beta user
→ HOLOCRON feedback form
→ server-side feedback endpoint
→ dedicated Discord feedback channel
```

Requirements:

- The message form stays small and understandable.
- A user account is not required merely to leave beta feedback unless later product requirements explicitly change.
- The form requires a self-reported YouTube nickname. This is display information only and must not be presented as verified YouTube account ownership.
- HOLOCRON also assigns the existing anonymous browser session a short `HK-...` feedback tag derived server-side from its hashed cookie identity. The raw cookie, IP address, email, and real name are not required for this control.
- Administrators may block or unblock feedback submission for that tagged browser session. This is deliberately lightweight: clearing cookies or using another browser/device can result in a new tag.
- Discord delivery uses a server-only webhook / credential.
- The Discord webhook must never be returned to the browser, committed to source, embedded in client JavaScript, or written to public logs.
- Failure to deliver feedback should produce a useful user-facing error rather than silently discarding the message.
- Basic abuse controls may be added if needed, but the beta feature should not become a large moderation platform.

Feedback collected during the beta is an input to Phase 9 / Phase 10 planning.

Phase 8A implementation uses a server-only Discord webhook, a 1,000-character server/client limit, disabled Discord mentions, an eight-second delivery timeout, and a one-minute anonymous-browser cooldown. The pre-beta hardening adds the required YouTube nickname, a cookie-scoped anonymous `HK-...` tag, a dedicated D1 feedback-session record with submission count / last activity / ban state, and administrator ban/unban controls. Feedback text itself is still not persisted in D1.

# 17.1 Daily Quiz (Beta)

HOLOCRON includes a lightweight public Daily Quiz at `/quiz` for the beta. The interaction is intentionally closer to a community poll than to an account-based game system.

Public behavior:

- The primary navigation includes a first-class `퀴즈` tab.
- The newest public quiz is shown by default, with prior public quizzes available as an archive.
- Each quiz has a question, two to five answer choices, an optional main image URL, and an optional image URL for every choice. A separate quiz title is not displayed.
- Main and choice images use saved focal-position and zoom metadata to reproduce the administrator's 1:1 crop. An optional main-image destination opens in a new tab with external-link isolation.
- The public payload does not expose which choice is correct before participation.
- The existing anonymous browser cookie is reused; its server-side hash is the participation identity.
- One browser session may submit exactly one response per quiz. This is a lightweight convenience rule, not strong identity enforcement; clearing cookies or changing browser/device can create a new session.
- Immediately after the first selection, HOLOCRON reveals the correct choice, answer explanation, total participation count, and aggregate percentage for every active choice.
- A reload in the same browser restores that quiz's submitted result rather than allowing a second vote.

Administrator behavior:

- `/admin/quiz` is protected by the existing administrator session.
- The administrator can create, edit, and delete quizzes; manage two to five choices; set the main image, optional main-image destination, and each choice image by URL; adjust 1:1 image focal position and zoom; select exactly one correct answer; write the answer explanation; and save as draft, publish immediately, or schedule publication.
- Scheduled publication uses a KST date/time entered by the administrator. No extra cron job is required: a scheduled quiz becomes publicly eligible when its stored publish time has passed.
- Once responses exist, answer choices and the correct-answer assignment are locked so aggregate results remain coherent. Other metadata and publication settings may still be edited.
- Deleting a quiz also deletes its response records after explicit administrator confirmation.

Persistence uses D1 tables `quizzes`, `quiz_options`, and `quiz_responses` introduced by migration `0011_daily_quiz.sql`. Additive migration `0012_quiz_image_crop.sql` stores source-independent crop metadata and the optional hero destination while preserving existing quiz rows. The `quiz_id + session_hash` primary key makes vote submission idempotent for one browser session per quiz. Images remain URL-only for the beta; no R2 upload flow is introduced.

Daily Quiz page views are included in the same privacy-conscious beta analytics aggregation as News and Works. Quiz response choices are stored only for quiz aggregation and are not joined to feedback identity metadata.

---

# 18. Beta Analytics

The administrator needs an analytics view during the beta so the launch can be evaluated with evidence rather than anecdote alone.

Before adding custom tracking, verify whether the active hosting platform exposes sufficient site analytics. If it does not, implement only the smallest privacy-conscious aggregate tracking needed for the beta.

The administrator-only view should prioritize:

- daily visitors / visits or the closest reliably measurable equivalent,
- daily page views,
- aggregate News Archive usage,
- aggregate Works Archive usage,
- aggregate Daily Quiz usage,
- beta-period totals useful for a short results report.

Rules:

- Analytics are visible only to the administrator.
- Do not expose the analytics route publicly.
- Do not collect sensitive personal information merely to improve a visitor count.
- Avoid invasive fingerprinting.
- Clearly distinguish exact counts from estimates if the underlying measurement cannot guarantee unique people.
- Keep analytics separate from the public archive domain logic.

At the end of beta, preserve enough aggregate evidence to summarize usage and compare it with user feedback.

Phase 8A implementation records only first-party anonymous browser-day aggregates in D1. A random HttpOnly cookie is hashed before persistence; raw IP addresses, user agents, account identifiers, and individual navigation events are not stored. `방문` means one anonymous browser per Korean calendar day and reporting scope, not a guaranteed unique person. QA and beta periods use separate period keys so the beta baseline can begin without deleting prior QA data.

---

# 19. Post-Beta Final-Launch Features

After the beta closes, the product enters the Phase 9 / Phase 10 development period.

Planned final-launch work includes:

1. the full AI Assistant defined above,
2. fixes and product changes driven by beta feedback,
3. additional Star Wars news sources,
4. the richer Featured Work detail hero,
5. opt-in KakaoTalk notifications for newly published news,
6. final-launch QA and reopening of the public service.

## 19.1 Additional news sources

New sources are added after beta. They must not bypass the existing collection architecture. Each new source needs explicit adapter behavior, source identity, failure isolation, deduplication, relevance policy, and compatibility with administrator overrides.

## 19.2 KakaoTalk notifications

The product intent is to let a user explicitly opt in to receive notifications about new HOLOCRON stories through KakaoTalk, in an experience similar to following or adding an official notification channel.

The exact implementation depends on the available Kakao product / API and its current approval, consent, message-template, rate-limit, and policy requirements. Those requirements must be verified before implementation.

No user is subscribed implicitly, and HOLOCRON must not scrape contacts or infer notification consent.

---

# 20. Final Platforms and Paid Calendar

The beta is web-only.

The intended final product direction is:

- web service,
- desktop application,
- mobile application.

Desktop and mobile packaging are lower priority than the stable web core, even though they are part of the intended final product direction.

The planned paid calendar service adds Star Wars release schedules to a user-facing calendar automatically.

Desktop intent:

- HOLOCRON can run as a standalone desktop application,
- the paid calendar may run in the background,
- the calendar can remain visible on the desktop in a DesktopCal-like presentation,
- upcoming Star Wars work release dates synchronize into that calendar automatically.

Mobile intent:

- a mobile HOLOCRON application,
- access to the appropriate archive, notification, and calendar experiences.

Before implementing this paid feature, define:

- account / identity model,
- entitlement and billing model,
- calendar data source and update policy,
- desktop packaging / updater strategy,
- mobile packaging / store distribution,
- background execution constraints,
- notification permissions,
- cross-device synchronization expectations.

The beta architecture must not be distorted around an unfinished billing or native-app design.

**Final launch target: late October 2026.**

---

# 21. Product Principle

HOLOCRON should make scattered Star Wars information easier to discover and understand without becoming cluttered.

When adding a feature, prefer:

- fewer clearer states,
- recoverable automation,
- visible source attribution,
- administrator control over uncertain automation,
- simple public interactions,
- architecture that remains easy to extend.

Product additions must continue to follow the repository engineering rules in `AGENTS.md`.
