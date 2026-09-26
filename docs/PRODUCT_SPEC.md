# HOLOCRON Product Specification

> Status: Beta planning baseline
>
> This document defines the agreed product behavior for HOLOCRON. Implementation details may evolve, but user-facing behavior should not be changed silently.

---

# 1. Product Goal

HOLOCRON is a Korean Star Wars news and works archive.

The beta focuses on two primary experiences:

1. **News Archive** — collect Star Wars news from multiple sources, summarize it in Korean, group duplicate coverage into one story, and let the administrator correct the result.
2. **Works Archive** — browse released and upcoming Star Wars screen works through poster-first cards and open the appropriate viewing, ticketing, or official page.

The service should remain simple enough to understand at a glance while allowing future expansion.

---

# 2. Primary Navigation

The public experience has two main archive views:

- **뉴스 아카이브**
- **작품 아카이브**

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

- First tap on the stack area expands the source cards.
- Tapping a specific expanded card opens that source's original article.
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

---

# 6. Administrator Workflow

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

The beta may use the current poster-led featured presentation. For the final-launch version, only the single Featured Work becomes a wider information-rich hero layout. Ordinary Works cards remain compact poster-first cards.

The intended desktop composition is a tall poster on the left and a detailed information area on the right. On narrow screens the same content should stack responsively rather than forcing a wide desktop layout.

Where reliable data is available, the Featured Work may display:

- Korean / original title,
- director / creator,
- release date,
- release destination or platform / theatrical context,
- principal cast,
- synopsis,
- the existing status-aware destination action.

Missing metadata must degrade cleanly; the UI must not invent director, cast, synopsis, or release details. This richer presentation does not create a separate featured flag and does not change the deterministic Featured selection rule by itself.

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

# 13. AI Assistant — Beta Placeholder

The News Archive sidebar contains an **AI 도우미** card above the existing explanation about grouped stories.

During beta:

- the sidebar order is the news sources, the AI Assistant card, the existing grouped-story explanation, then the rail footer,
- the card describes the planned archive-assistance role and labels itself as beta,
- `AI 도우미 열기` opens a small dialog marked `COMING SOON` with the message `AI 도우미는 준비 중입니다.`,
- the dialog can be dismissed with its close button, Escape, or the backdrop,
- no chat input or incomplete AI workflow is exposed to the user.

The existing explanation of HOLOCRON's grouped-story concept remains visible below the AI Assistant card.

---

# 14. AI Assistant — Future Final Feature

The full AI Assistant is intentionally postponed until the end of the product roadmap.

Planned responsibilities:

1. Answer questions about what news has appeared for a specific Star Wars work / topic.
2. Help YouTube creators plan a script draft from selected archived news.

Expected script workflow:

```text
User requests a script / topic brief
→ HOLOCRON finds related archived stories
→ User selects which stories to use
→ AI extracts factual points and source context
→ Duplicate facts are consolidated
→ Official reporting / media reporting / rumor-like material is distinguished where possible
→ AI proposes key points and a script structure
```

The AI should work from selected HOLOCRON archive material rather than freely inventing unsupported information.

This feature is NOT required for beta release.

---

# 15. Mobile Requirements

Mobile is a first-class supported layout.

At minimum:

- news cards must remain readable on narrow screens,
- stacked-source UI must work through tap instead of hover,
- work poster metadata must work through tap instead of hover,
- dialogs must fit the viewport,
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
- Discord delivery uses a server-only webhook / credential.
- The Discord webhook must never be returned to the browser, committed to source, embedded in client JavaScript, or written to public logs.
- Failure to deliver feedback should produce a useful user-facing error rather than silently discarding the message.
- Basic abuse controls may be added if needed, but the beta feature should not become a large moderation platform.

Feedback collected during the beta is an input to Phase 9 / Phase 10 planning.

---

# 18. Beta Analytics

The administrator needs an analytics view during the beta so the launch can be evaluated with evidence rather than anecdote alone.

Before adding custom tracking, verify whether the active hosting platform exposes sufficient site analytics. If it does not, implement only the smallest privacy-conscious aggregate tracking needed for the beta.

The administrator-only view should prioritize:

- daily visitors / visits or the closest reliably measurable equivalent,
- daily page views,
- aggregate News Archive usage,
- aggregate Works Archive usage,
- beta-period totals useful for a short results report.

Rules:

- Analytics are visible only to the administrator.
- Do not expose the analytics route publicly.
- Do not collect sensitive personal information merely to improve a visitor count.
- Avoid invasive fingerprinting.
- Clearly distinguish exact counts from estimates if the underlying measurement cannot guarantee unique people.
- Keep analytics separate from the public archive domain logic.

At the end of beta, preserve enough aggregate evidence to summarize usage and compare it with user feedback.

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
