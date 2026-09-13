# HOLOCRON — Agent Development Rules

This file defines the persistent engineering rules for all AI agents and developers working on HOLOCRON.

The purpose of these rules is to keep the project fast to develop, easy to understand, and resistant to architectural sprawl as features are added.

---

# 1. Project Goal

HOLOCRON is a Korean Star Wars news archive and information platform.

The core pipeline is:

Source
→ Collection
→ Filtering
→ AI processing
→ Topic classification
→ Database
→ Review / Administration
→ User-facing presentation

The project may expand to additional franchises later, but Star Wars remains the primary supported franchise unless explicitly changed.

Do not introduce unrelated product features simply because they are technically possible.

---

# 2. Core Engineering Principle

**Do not solve a new feature by continuously adding logic to an existing large file.**

Before implementing a feature:

1. Identify which responsibility the feature belongs to.
2. Find the module responsible for that concern.
3. Extend that module if appropriate.
4. Create a new module if the feature introduces a genuinely new responsibility.
5. Avoid duplicate implementations of the same business logic.

Prefer clear boundaries over quick patches.

A feature is not complete merely because it works.

It should also leave the codebase easier or equally easy to modify afterward.

---

# 3. Architecture Boundaries

The intended architecture is:

```text
UI
 ↓
API / Route
 ↓
Service / Business Logic
 ↓
Domain Modules
 ├─ Collection
 ├─ Filtering
 ├─ AI Summarization
 ├─ Topic Matching
 ├─ Review / Moderation
 └─ News Queries
 ↓
Repository / Data Access
 ↓
Cloudflare D1
```

Maintain these boundaries whenever possible.

## UI

`app/`, `components/`

Responsibilities:

* Rendering
* User interaction
* Navigation
* Forms
* Display state

UI components should NOT contain:

* Direct database queries
* News crawling logic
* OpenAI API calls
* Complex topic matching logic
* Source-specific scraping rules

---

## API

`app/api/`

Responsibilities:

* Receive requests
* Validate input
* Check authorization
* Call domain/service functions
* Return responses

API routes should remain thin.

Do not place major business logic directly inside route handlers.

---

## Business / Domain Logic

`lib/`

Responsibilities include:

* Article collection
* Filtering
* Normalization
* Topic matching
* AI summarization
* News processing
* Shared domain rules

When one file begins handling several unrelated responsibilities, split it.

For example, collection, AI summarization, topic matching, and source adapters should not indefinitely grow inside one `collect.ts`.

Possible future structure:

```text
lib/
  collection/
    collector.ts
    filters.ts
    sources/
  ai/
    summarizer.ts
    topic-matcher.ts
  news/
    queries.ts
    service.ts
```

Do not refactor into this structure merely for aesthetics. Refactor when responsibilities actually begin to diverge.

---

## Database

`db/`, `drizzle/`

Responsibilities:

* Database schema
* Database connection
* Persistence
* Queries closely related to persistence
* Migrations

D1 is the system of record for runtime application data.

Do not introduce JSON files as a second mutable database.

Static seed/configuration data may use JSON when appropriate.

Any schema change must include the corresponding Drizzle migration.

---

# 4. Avoid Monolithic Files

Before adding substantial logic to an existing file, inspect its current responsibilities.

A file should generally represent one coherent concern.

A file becoming long is not automatically a problem.

A file containing many unrelated responsibilities is.

As a soft warning:

* If a file is approaching roughly 300–400 lines, inspect whether responsibilities should be separated.
* If a function becomes difficult to describe in one sentence, consider decomposition.
* If changing one feature repeatedly affects unrelated features, the boundary is probably wrong.

Do not split files into meaningless tiny fragments only to reduce line count.

Cohesion matters more than arbitrary size.

---

# 5. No Patch Stacking

Do not fix architectural problems by adding exception after exception.

Avoid patterns such as:

```text
if specialCaseA
if specialCaseB
if specialCaseC
if thisSource
if thatSource
```

when the underlying problem is that different behaviors need separate modules or adapters.

When a third or fourth special case appears, reconsider the abstraction.

Prefer:

```text
common interface
 ├─ source adapter A
 ├─ source adapter B
 └─ source adapter C
```

over one continuously growing conditional block.

---

# 6. Source Collection Rules

News collection must remain source-aware and bounded.

Preferred strategy:

1. RSS / structured feeds
2. Public metadata
3. Bounded page parsing when necessary
4. Recoverable failure when extraction is unavailable

Do not attempt to:

* Bypass paywalls
* Bypass access restrictions
* Circumvent anti-bot protections
* Extract content unavailable through legitimate public access

A failure from one source must not break collection from every other source.

Source-specific parsing should eventually live in source-specific adapters rather than accumulating inside the central collector.

---

# 7. Article Processing Pipeline

Maintain a clear processing pipeline.

Example:

```text
fetch
→ normalize
→ validate
→ relevance filter
→ metadata extraction
→ summarize
→ categorize
→ topic match
→ persist
→ review
```

Each stage should have a clear input and output.

Avoid hidden mutations across distant parts of the system.

When possible, write processing functions so they can be tested independently.

---

# 8. OpenAI / AI Rules

AI is a processing component, not the source of truth.

AI may assist with:

* Korean title generation
* Korean summaries
* Categorization
* Topic matching
* Structured extraction

AI must NOT invent missing facts.

Prompts should explicitly distinguish:

* trusted system instructions
* existing database context
* untrusted article metadata/content

Prefer structured responses when the result is consumed by code.

Validate AI output before storing it.

Do not assume AI output matches the requested schema.

Fallback behavior must exist when the OpenAI API is unavailable.

---

# 9. Topic Matching

Different articles may describe the same news event.

Topic matching should merge articles only when they describe substantially the same event.

Do NOT merge articles merely because they:

* Mention the same character
* Mention the same production
* Belong to the same franchise
* Share generic keywords

Manual topic merge/split decisions must remain persistent.

Automation must not silently overwrite administrator decisions.

---

# 10. Reviewability

Automation should not make unrecoverable editorial decisions.

When processing is uncertain, prefer a recoverable review state.

Examples:

* Missing publication date
* Missing image
* Failed AI summary
* Ambiguous topic match
* Unsupported source format

Administrator actions such as:

* exclude
* restore
* merge
* split

must persist after future collection runs.

---

# 11. Secrets and Security

Never commit secrets.

Never place any of the following in client-side code:

```text
OPENAI_API_KEY
Cloudflare secrets
authentication secrets
private tokens
```

Secrets must remain server-side and use the hosting platform's secret/environment system.

`.env` files containing real credentials must not be committed.

`.env.example` may document required variable names without real values.

All management operations must enforce authorization on the server.

Client-side visibility checks are not authorization.

---

# 12. Dependency Discipline

Do not install a package simply because it makes one small task easier.

Before adding a dependency:

1. Check whether the current stack already provides the capability.
2. Consider whether a small local implementation is sufficient.
3. Check maintenance and runtime implications.
4. Avoid duplicate libraries solving the same problem.

Do not replace core technologies without explicit justification.

Current core stack:

* TypeScript
* React
* Vinext / Next-compatible application structure
* Cloudflare Workers
* Cloudflare D1
* Drizzle ORM
* OpenAI API

---

# 13. Database Discipline

Do not bypass the defined data model with ad-hoc storage.

Schema changes require deliberate migration.

Before adding a new field, ask:

* Is this article data?
* Is this topic data?
* Is this administrative state?
* Is this derived data that can be computed?
* Does this deserve its own entity?

Avoid storing the same fact in multiple places unless there is a deliberate denormalization strategy.

---

# 14. Duplication Rule

Before implementing a helper, query, parser, formatter, or business rule:

**Search the repository first.**

Do not create a second implementation of existing behavior.

If two implementations already exist, prefer consolidating them rather than adding a third.

---

# 15. Feature Development Procedure

For every non-trivial feature:

### Step 1 — Understand

Inspect the related code before editing.

Identify:

* current data flow
* owning module
* dependencies
* affected API
* affected database state

### Step 2 — Design

Decide where the new responsibility belongs.

Do not begin by editing the first file containing a related keyword.

### Step 3 — Implement

Make the smallest coherent architectural change.

Avoid unrelated refactoring during feature implementation unless required for correctness.

### Step 4 — Validate

At minimum run the relevant available checks:

```bash
pnpm lint
pnpm build
```

Run additional tests when they exist.

### Step 5 — Review

Before finishing, inspect the diff and ask:

* Did this duplicate existing logic?
* Did this make a file responsible for too many things?
* Did this create hidden coupling?
* Did this weaken error handling?
* Did this expose a secret?
* Did this break existing behavior?
* Is there a simpler architecture?

---

# 16. Bug Fix Rules

Fix the root cause when reasonably possible.

Do not hide failures with broad catch blocks unless recovery is intentional.

Avoid:

```ts
catch {
  return null
}
```

when the failure should be observable.

Errors should provide enough information to determine:

* which source failed
* which operation failed
* whether retry/recovery is possible

A local failure should degrade gracefully rather than crash unrelated features.

---

# 17. Refactoring Rules

Do not perform large speculative rewrites without a concrete reason.

Refactor when it:

* Removes duplicated logic
* Separates conflicting responsibilities
* Enables an upcoming feature cleanly
* Fixes demonstrated maintenance problems
* Makes testing possible
* Reduces dangerous coupling

Preserve existing behavior unless the task explicitly changes it.

---

# 18. Scope Control

HOLOCRON should not become a collection of unrelated features.

Before implementing a new feature, determine whether it strengthens one of these:

1. Discover Star Wars news
2. Organize information
3. Understand information quickly
4. Connect related reporting
5. Review/manage collected information
6. Expand the archive safely

If a feature does not meaningfully support the product goal, do not add it without explicit approval.

---

# 19. Backward Compatibility

Do not remove existing working behavior merely because a new implementation is cleaner.

When replacing a system:

1. Identify existing behavior.
2. Preserve required behavior.
3. Migrate data if necessary.
4. Verify the new path.
5. Remove the old implementation only after replacement is complete.

---

# 20. Agent Behavior

AI coding agents must not blindly implement requests.

Before making substantial changes:

* Inspect related files.
* Understand the existing architecture.
* Reuse established patterns.
* Search for existing implementations.
* Preserve architectural boundaries.

When the requested implementation would significantly worsen the architecture, choose a cleaner implementation that satisfies the same product requirement.

When there is a meaningful architectural tradeoff, document it.

Do not manufacture unnecessary complexity.

Do not create abstractions for hypothetical future requirements with no current use.

---

# 21. Definition of Done

A task is complete only when:

* The requested behavior works.
* Existing relevant behavior still works.
* Architecture remains coherent.
* No secret was exposed.
* Database changes include migrations.
* Error cases are reasonably handled.
* Duplicate logic was not introduced unnecessarily.
* Build/lint checks have been run when possible.
* The final diff has been reviewed.

---

# 22. Prime Directive

**Move fast without making the next change slower.**

Every feature should leave HOLOCRON in a state where the next developer or agent can understand where new code belongs.

If a quick implementation would make future development substantially harder, redesign it before adding more patches.
