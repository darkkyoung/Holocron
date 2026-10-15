# Phase 9C.2 private deployment and real-account acceptance

## Production migration splitter correction

The first owner-only deployment (Site v77, 2026-10-15) failed before publishing with `incomplete input: SQLITE_ERROR`. The live database overview immediately afterward still contained the previous tables and none of the five new Account/Credit tables. No browser reward acceptance was started.

Local reproduction with the pinned Wrangler 4.92.0 `unstable_splitSqlQuery` produced 21 statements instead of the intended 19: `NEW.applied_amount=CASE` did not match the splitter's whitespace-delimited CASE recognizer. It ended `credit_ledger_guard` early. SQLite rejected that exact fragment with `incomplete input`.

The unapplied 0016 migration now has one additional space before CASE. This preserves SQL semantics, all tables, indexes, triggers, bounds and atomicity. No previously applied migration was changed. The foundation regression suite now executes the actual Wrangler-split statements and checks the statement count against Drizzle breakpoints before exercising ledger concurrency, rollback and identity invariants.

Guest and Account signing secrets were independently generated and set through the existing Site's secret mechanism; their values are not stored in source or this log. Google configuration remains server-side. Real Google login and hosted acceptance are still pending at this checkpoint. Phase 9D has not started.
