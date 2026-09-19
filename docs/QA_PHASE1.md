# Phase 1 — News stack acceptance

Date: 2026-09-19

## Scope

Physical news-card stack, responsive source selection, whole-card links, keyboard support,
and honest representative ordering when a source supplies only a publication date.
No production D1 records, source collection, or administrator decisions were changed.

## Browser checks performed

Tests used the real Newsroom and StoryCard components in temporary local-only fixtures with
1, 2, 4 and 7 sources, long Korean headlines and summaries. The fixture route and HTML frame
harness were removed before the production build; neither is part of the deployed application.

| Check | Result |
| --- | --- |
| Single-source card | One whole-card anchor; no redundant original-link button |
| Collapsed stacks | Representative in front; each secondary source has a vertical edge |
| Desktop source-edge hover | Same secondary card elements move horizontally; no separate popup/list |
| Dense desktop stack | Source-selection controls can bring a covered card to the front |
| 375 / 390 / 768px frame viewports | Expanding 7 sources exposes 7 non-inert links; no horizontal document overflow |
| Narrow source-edge click | Opens without immediately collapsing; focus moves to persistent toggle |
| Keyboard | Enter expands; Tab reaches representative then secondary links; Escape collapses and restores toggle focus |
| Closed source links | `inert` prevents hidden cards from intercepting input/focus |
| Original links | Per-article href retained; `_blank` with `noopener noreferrer` |
| Related image | Existing SWNN seed image attribution retained |

The browser adds a 15px vertical scrollbar inside frames, so measured document client widths
were 360/375/753px respectively. In all three cases scrollWidth equaled clientWidth. Desktop
measurements also showed no document overflow, and screenshots were inspected for collapsed
and expanded stacks. These checks were browser interaction checks, not a persisted automated
end-to-end suite.

## Regression checks

- `pnpm test:stories`: 13 assertions, including timezone ordering, stable date-only ambiguity,
  90-day boundary, excluded/review visibility, manual restoration, empty groups and non-mutation.
- `pnpm lint`: no errors; the pre-existing unused `setting` import warning in
  `app/api/manage/route.ts` remains outside this UI change.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed after removal of the temporary fixture; only the existing public,
  admin and API routes are in the production route table.

## Remaining acceptance / known limitations

- Physical touch/coarse-pointer behavior and iOS Safari were not available in this browser
  surface. Narrow-frame clicks validate the responsive click path, not actual touch events.
- Recheck real devices before closing Phase 1 and advancing to Phase 2.
- Date-only uncertainty can only be preserved if the stored value still contains a date only.
  The existing collector normalizes inputs to timestamps; retaining source precision belongs
  to Phase 3's metadata pipeline work. No precision is reconstructed from lost metadata here.
- Persistent manual overrides are still Phase 2 work. In particular, the current collector
  contains a broad editorial-exclusion update; UI fixes do not make that update override-safe.
