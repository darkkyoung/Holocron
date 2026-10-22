# Control Room navigation / operations separation

- Starting canonical: `b70fd2cb5472428f325289ce1a86e14a6a516f73`
- Starting tree: `00b68a2c5eef7c8359ec90cdd4697662432ae9b8`
- Scope: canonical code only. Production v89 / environment 55 / Migration 0020 is not redeployed. AI OFF / PUBLIC unchanged. Post-release v10 preservation audit remains pending.

## Implementation

`admin-command-rail.tsx` now contains navigation and logout only. `admin-operations.tsx` owns the existing Health, source settings entry, schedule, historical recovery, collect/retry buttons, last-run information, work relation recheck and backup controls. Existing callbacks/API arguments and server modules are unchanged. `app/admin/panel.tsx` switches between mounted news/operations areas; editorial selections, open card state and operational inputs survive the switch. The destination heading receives focus. The title moves into the main column so navigation starts immediately below the site header.

The rail has no nested vertical scrolling, viewport clipping or hidden scrollbar workaround. Normal desktop navigation is sticky; windows <=700px high or <=820px wide use normal document flow and a navigation grid. Existing news cards, merge/split/exclude actions, status sheets, source settings sheet, authentication and logout POST remain intact. Operational text is enlarged relative to the old narrow sidebar.

## Chromium QA

Actual React Admin/rail/operations components, production built CSS, synthetic API responses; no Production admin interaction or collection. Browser zoom is unchanged at 100%; exact CSS viewport sizes are established with same-origin frames because the connected browser has no resize API.

| CSS viewport | Rail position | Rail height | Initial bottom | Internal scroll |
|---|---|---:|---:|---|
| 1366×768 | sticky | 603.67px | 727.67px | none |
| 1440×900 | sticky | 603.67px | 727.67px | none |
| 1920×1080 | sticky | 603.67px | 727.67px | none |
| 943×905 | sticky | 603.67px | 727.67px | none |
| 1366×600 | normal flow | 278.55px | 402.55px | none |
| 390×844 | normal flow | 417.59px | 528.59px | none |
| 360×800 | normal flow | 417.59px | 528.59px | none |

Measured scrollHeight equals clientHeight for all rails. News/operations switching, focus movement, source settings sheet and Escape verified. Synthetic request capture confirms unchanged schedule, historical-backfill, collect, retry-ai, retry-metadata, retry-missing-images, news-work backfill and backup endpoints/arguments. Browser backup is an error fixture (not a real export); official backup tests verify the actual export contract. Date-input automation required a keyboard change to trigger React's change event; server range validation is covered by the existing backfill suite. Browser fixture uses no real articles/accounts or private backup contents.

Reproduce: `pnpm build`, `node scripts/prepare-admin-navigation-qa.mjs`, then `sites-preview start <checkout>/out/admin-navigation-qa` in the supported managed preview. `/` has viewport frames; `/frame` is the interactive single view. All fetches in this fixture are synthetic. It is generated under ignored `out/`, not a deployed route.

## Validation

TypeScript, lint and build PASS. Lint retains one pre-existing unused `debit` warning in `test-assistant-refund-safety.mjs`. Admin UX/auth, source settings, scheduled collection, backfill, AI/metadata/image recovery and collection-health tests PASS. Assertions formerly tied to the rail's operational controls now target `admin-operations`; obsolete nested-scroll assertions were replaced. No dependency, migration, backup, Credit, Assistant, Racing, Scheduler or source-adapter changes in this commit.

Production writes/deployments/collection triggers: ZERO. Real Provider calls: ZERO. UI deployment remains separate from the pending v10 data preservation audit.
