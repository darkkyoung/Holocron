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

# Phase 5 — Featured Work and Destination Rules

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

# Phase 8 — Beta QA and Public Release

Goal: publish a stable beta before adding the full AI assistant.

Checklist:

- Test desktop layout.
- Test common mobile widths.
- Test tap behavior for stacked news sources.
- Test tap behavior for work poster metadata.
- Test administrator authorization.
- Test merge / split / exclude / restore persistence.
- Test all seven news sources.
- Test OpenAI failure fallback.
- Test works destinations.
- Test cinema popup links.
- Test scheduled collection.
- Confirm secrets are server-side only.
- Review public copyright / attribution wording.
- Change Site audience to public only after validation.
- Optionally connect a custom domain for beta branding.

A custom domain is desirable but is not a blocker for internal QA.

---

# Phase 9 — Full AI Assistant

Goal: implement the AI feature only after the archive itself is stable.

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

---

# Phase 10 — Future Expansion

Only after beta proves the core service is useful:

Possible directions:

- games archive,
- novels archive,
- comics archive,
- additional Star Wars content metadata,
- more franchises,
- personalization / bookmarks,
- independent hosting if product scale or ChatGPT Sites constraints justify migration.

These are intentionally out of beta scope.

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
