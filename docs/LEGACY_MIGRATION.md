# HOLOCRON Legacy Migration Guide

> Source legacy project: `HolocronArchive_Latest`
>
> Target project: `Holocron`

The purpose of this document is to preserve useful product ideas from the first project without copying its architectural debt.

The old project is a reference for **behavior and lessons learned**, not a template for code structure.

---

# 1. Migration Principle

**Carry forward product value, not implementation baggage.**

When migrating an old feature:

1. Identify the user value of the legacy feature.
2. Re-state its required behavior in current product terms.
3. Find the correct owner module in the new architecture.
4. Re-implement it using the current data model and service boundaries.
5. Do not copy legacy glue code simply because it already works.

If the new project already has a better implementation of the same responsibility, keep the new implementation.

---

# 2. Legacy Strengths Worth Preserving

The first Holocron proved several useful product ideas.

## News archive

Preserve:

- Korean-first presentation of Star Wars news.
- Searchable / structured article information.
- Source attribution.
- Ability to exclude unwanted articles.
- Ability to restore excluded articles.
- Grouping multiple reports about the same event.
- Administrator correction of automatic grouping.

Current target behavior is defined in `docs/PRODUCT_SPEC.md`.

---

## Works archive

Preserve:

- A dedicated place for Star Wars screen works.
- Distinction between upcoming and released works.
- Practical outbound links for watching / ticketing.
- Simple visual browsing rather than a text-heavy catalog.

The second Holocron replaces the old works implementation with a dedicated D1-backed works model and poster-first UI.

---

## AI-assisted information use

Preserve the useful idea that AI should work from archive context instead of answering freely from nowhere.

The first project used archive data to ground an AI helper. The future second-project AI Assistant should keep the grounding principle while using the current OpenAI-based architecture.

The full AI Assistant remains a post-beta feature.

---

## Mobile support

Preserve the requirement that the service should be usable on mobile.

Do not assume that desktop hover interactions automatically translate to touch. The new project explicitly defines mobile tap behavior for stacked news cards and work posters.

---

# 3. Legacy Architecture NOT to Reproduce

The following patterns from the first project should not be migrated into the second project.

## Mutable JSON as runtime database

Do not recreate runtime state through multiple mutable JSON files such as:

- fetched articles,
- topics,
- overrides,
- works state.

D1 is the runtime system of record for the new project.

Static seed or configuration JSON is acceptable when it is not acting as a second mutable database.

---

## Monolithic application file

Do not recreate a large central application file that owns:

- routes,
- filtering,
- search expansion,
- AI calls,
- work logic,
- admin operations,
- persistence,
- orchestration.

These responsibilities belong in separate UI, API, domain/service, and persistence layers according to `AGENTS.md`.

---

## Script chaining as application architecture

The first project could trigger separate Python scripts to collect articles and regenerate topics.

Do not reproduce a workflow like:

```text
web app
→ spawn collection script
→ write JSON
→ spawn grouping script
→ rewrite JSON
→ reload app state
```

The new project should use callable services with explicit data flow and shared persistence.

Manual refresh and scheduled refresh must call the same collection service rather than maintaining separate implementations.

---

## Local-machine dependency for production operation

Do not reintroduce a requirement that the owner's PC must remain on for the public service to work.

Public beta behavior should rely on hosted runtime, D1, hosted secrets, and hosted scheduled collection.

Local development may still use local tooling, but production operation must not depend on it.

---

## Ollama as required production dependency

The first project experimented with local Ollama models.

The new project's hosted AI processing uses the OpenAI API. Do not introduce Ollama as an additional required production path unless a future explicit product decision changes this.

---

## Growing hard-coded exception maps

Do not migrate large ad-hoc keyword maps or work-specific conditionals as the default solution to every edge case.

Prefer:

- structured data,
- source adapters,
- administrator state,
- domain rules,
- explicit configuration.

When repeated special cases appear, revisit the abstraction instead of stacking another `if` condition.

---

# 4. Feature Migration Matrix

| Legacy capability | Second Holocron direction | Migration rule |
|---|---|---|
| News cards | Keep and improve | Use current React/UI architecture |
| Multi-source same-event grouping | Keep and improve | Use topic model + stacked-card UI |
| Exclude / restore | Keep | Persist in D1 and protect manual decisions |
| Manual merge / split | Keep | Rename clearly and persist overrides |
| Works page | Rebuild | Dedicated works data model and poster UI |
| Upcoming works | Keep | `upcoming` state |
| Recently released works | Keep with clearer state | `recent` state, admin-adjustable |
| Older released works | Keep | `archive` state |
| Cinema ticket links | Keep | CGV / 롯데시네마 / 메가박스 popup |
| Disney+ destination | Keep | Disney+ homepage is sufficient for beta |
| AI helper | Postpone and redesign | Beta placeholder only; full assistant later |
| Local Ollama | Do not migrate as production dependency | Use OpenAI API path |
| Mutable JSON runtime state | Do not migrate | Use D1 |
| Flask monolith | Do not migrate | Keep current separated architecture |
| Python subprocess orchestration | Do not migrate | Shared TypeScript services |
| Local PC server requirement | Do not migrate | Hosted operation |

---

# 5. Current Second-Project Features That Should Stay

Do not replace these with older implementations merely because the old project had more code around them.

Preserve the current direction of:

- Cloudflare-hosted runtime,
- D1 persistence,
- Drizzle schema / migrations,
- server-side OpenAI secret usage,
- seven-source incremental collection,
- URL duplicate skipping,
- topic-based article grouping,
- administrator authorization,
- React / TypeScript UI.

When migrating a legacy feature, integrate it into these systems.

---

# 6. Works Migration Rule

The old works feature is valuable, but it must be reintroduced as a clean domain rather than appended to news logic.

Expected separation:

```text
Works UI
→ Works route / service
→ Works repository
→ works table in D1
```

Do not place work release / ticketing logic into the news collector.

Do not store works as special news articles.

Do not add title-specific conditions to general-purpose news modules.

---

# 7. Administrator Migration Rule

The first project demonstrated that automated editorial decisions need manual correction.

The new project must preserve this lesson more explicitly:

```text
Automation proposes archive state
→ administrator reviews
→ administrator changes state
→ manual decision persists
→ later automation respects it
```

Manual correction is not temporary UI state. It is durable product data.

---

# 8. AI Migration Rule

The old AI helper should not be copied feature-for-feature during beta.

Beta:

```text
AI 도우미
→ COMING SOON
```

Post-beta target:

```text
User asks about a topic / requests script help
→ archive retrieves related stories
→ user selects evidence
→ AI processes selected archive context
→ output includes grounded key points / structure
```

The archive must remain useful even when the AI Assistant is unavailable.

---

# 9. When Inspecting Legacy Code

An agent may inspect `HolocronArchive_Latest` to answer questions such as:

- What did this feature do?
- What fields were useful to the user?
- What edge case did the old code solve?
- What interaction did the user already like?

An agent should NOT assume:

- old file boundaries are desirable,
- old data storage should be preserved,
- old dependencies should be restored,
- old route structure should be copied,
- old exceptions should be pasted into new modules.

Before porting code, translate the legacy behavior into the current product specification.

---

# 10. Migration Completion Standard

A legacy feature is considered successfully migrated when:

- the user-facing value exists in the second project,
- the implementation follows `AGENTS.md`,
- the feature uses the current D1 / TypeScript architecture where applicable,
- manual state is persisted when required,
- no duplicate subsystem was introduced,
- the new implementation is understandable without reading the first project's code.

The first project should eventually become a historical reference, not a runtime dependency of the second project.
