# 2026-10-28 — SWNN Editorial/thumbnail recovery delivered; ordinary GPT chat deferred

## Status and source of truth

SWNN code landed on canonical main commit `3144239df8b38f1b055c9383b27ca08899831bd7`, tree `a8eb24f958625da94d4196d43a205a6194023314`; fresh remote branch and diff were verified in a subsequent read-only review. **SWNN code locally implemented; live image recovery not yet accepted. Plain non-archive Q&A/chat NOT IMPLEMENTED. Overall request: PARTIAL.**

Most recently reported Production baseline: v96 / environment 64 / AI OFF / MAINTENANCE, migration 0020 / backup v10. New SWNN changes and previous chat UI/provider compatibility work have **not** been reported deployed. No Production job, D1 change, Provider call, Credit debit, migration, or activation was performed in this documentation step.

## SWNN changes verified in code

- `lib/collection/sources/swnn.ts`: newly discovered SWNN candidates with exact, case/whitespace-normalized source `Editorial` category/tag are excluded in addition to `Other` and existing `This Week` rules. The RSS source-category parser is reused; internal translated category labels and articles without explicit source metadata are not assumed Editorial. Existing rows are not automatically reclassified or deleted.
- `lib/collection/processor.ts`: newly persisted, published, empty-image SWNN articles yield request-local priority IDs. Initial image lookup failures specifically diagnosed as HTTP 403 or 429 yield a skip list, avoiding the same-collection repeat for those IDs.
- `lib/collection/run.ts` and `lib/collection/repository.ts`: the existing post-collection automatic image recovery takes eligible new missing-image IDs first, then old rows through the existing cyclic cursor. Source and status/image guard remain intact.
- `lib/collection/image-recovery.ts`: preserves the existing 3-article, 10-request, 30-second limits and avoids moving the older cyclic cursor when processing a priority article. A skipped new article remains eligible on a future normal collection.
- Existing manual article image edit/retry endpoints and editorial overrides are unchanged. No anti-bot bypass, new transport, or actual Production SWNN 403 fix was implemented.
- Agent reported isolated D1 automated image recovery 34 scenario groups, SWNN-category, collection, scheduler, lint, TypeScript, build and diff-check PASS; one preexisting lint warning. These are **local/mock** results, not a Production acceptance.

Operational limitation: the Production Worker previously received HTTP 403 from SWNN WordPress REST and HTML. Prior automatic image recovery ran, but recovered zero of three observed candidates. The new priority/skip rules cannot make an upstream-denied resource accessible. Whether newer specific articles receive images now is UNKNOWN.

## Ordinary chat gap

The user requested an ordinary minimal GPT mini experience, including `안녕` and Star Wars general-knowledge questions, with a natural Korean text answer and no fabricated news links; archive-grounded Q&A and the separate video-outline planner should stay available.

**The agent did not implement ordinary chat.** The existing archive generation API requires receipt plus selected story IDs, and the UI currently initiates charged archive retrieval ahead of Q&A. This is inappropriate for greeting/general-knowledge requests.

A read-only schema/code check found:
- `assistant_admissions` from migration 0017 permits action `qa` with existing weights; migration 0020 adds `account-v1` and Account identity enforcement.
- Receipt is required in `beginGenerationAdmission`/the existing archive service, **not stored as a required D1 admission column**.
- Reusing the existing server-side `insertAdmission`, `settleGeneration`, `failAdmission`, Q&A Credit policy, owner/identity, idempotency and token/cost budgets for a separate plain-text chat request appears feasible without creating a new storage model. **No migration requirement is conclusively waived before implementation/tests**.
- New chat must never forge a search receipt, call the archive search for greetings, leak conversation/Account/Secrets in logs, invoke the Provider without explicit Credit consent, or mutate historical charged requests.
- The existing article-grounded Planner and news-mode Q&A must remain separate. Without supplied fresh evidence, GPT's general knowledge must not be represented as verified latest news, and no source URLs should be invented.
- Keep new UX narrow: reuse the current two-tab chat UI, offer a deliberate archive-grounded search path in advanced controls, preserve any existing pending settlement lock, and do not add persistent dialogue memory or feature sprawl.

## AGENTS.md and next acceptance criteria

Scope must not expand into another evaluation campaign or unrelated refactor. Treat local smoke PASS and Production success separately.

Minimal ordinary chat acceptance: one consented request using existing Q&A 5 CR policy and no 1 CR retrieval when archive search is not used; exact single Provider admission; readable Korean plain text; appropriate credit debit or full refunded terminal failure; no repeat Provider call on duplicate UUID; Account-only and global budgets preserved. Mock/workerd tests first. Production AI OFF and MAINTENANCE remain until separately approved release; real-paid validation requires separate authorization and exact diagnostic evidence if it fails.

References: `AGENTS.md`, `docs/devlog/2026-10-28-swnn-image-regression-and-assistant-off.md`, `docs/devlog/2026-10-28-chat-provider-compatibility.md`.

**Documentation-only update:** no SWNN or Assistant runtime implementation, live SWNN request, deployment or charged Q&A test.
