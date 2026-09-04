# Open questions

Things I would have asked, logged instead because you were away. None of them
blocked the build — each has a working decision behind it that you can overturn.

Rulings I made are recorded in full in the SDD ledger at
`.superpowers/sdd/2026-09-04-tables-evaluation-implementation/progress.md`.
This file holds only the ones where I think you might genuinely disagree.

---

## 1. Heap measurement is gone from the scorecard

`performance.memory` reports a hard-coded 10,000,000 bytes in Chrome unless the
browser is launched with `--enable-precise-memory-info`. Every library would have
shown "heap 10 MB" — a fabricated constant that reads as data.

**Decided:** heap is not a scorecard column. It survives in `ANALYSIS.md` as an
optional measurement with the flag needed to obtain it.

**If you disagree:** the alternative is running the whole measurement pass under
Chrome with that flag and reporting real numbers. That is a real amount of extra
work for one column, and the flag changes GC behaviour, so the numbers would not
be directly comparable to what a normal visitor's browser does.

## 2. The plain `<table>` baseline is capped at 100,000 rows

Uncapped it never finished rendering 500,000 rows — abandoned after 10 minutes
with the tab unresponsive. The cost is table *layout*, not string building:
2.0s at 50k, 6.2s at 100k, 34.2s at 200k.

**Decided:** cap at 100,000, disclosed in the demo's notes, in a code comment, and
in red on the card itself.

**If you disagree:** the alternative is shipping a card that hangs the browser,
which arguably makes the point more viscerally but breaks the page for everyone
who scrolls to it.

## 3. Task 14 was deliberately not done

The write-up, the scorecard scores, `EVALUATION.md` and the post draft are left for
you. They are the actual deliverable and they are judgment calls about which table
feels good to a human — scoring them on your behalf while you were away seemed
like the wrong kind of autonomy.

Everything needed to write them is measured and on the site.

---

## Answered by measurement, recorded here so you do not have to re-ask

- **Can a hand-written `<table>` do 500k rows?** No. Not close. See above.
- **Does Perspective belong in the comparison?** Pending — see the ledger for how
  Task 11 resolved. It has two live package homes as of 2026-09-04
  (`@finos/perspective@3.8.0` vs `@perspective-dev/client@5.3.1`) and the FINOS
  docs site now redirects to the latter.
