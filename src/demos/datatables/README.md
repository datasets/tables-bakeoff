---
name: DataTables
version: 3.1.5
license: MIT (core); Editor is paid
docs: https://datatables.net/manual/
homepage: https://datatables.net
github: https://github.com/DataTables/DataTables
stars: 7390
npm: datatables.net-dt
tagline: The veteran. Enhances a real <table>; jQuery-free since v3.
---

- Dark mode fought back. DataTables 3 themes through CSS variables, which is good, but its stylesheet only switches rows and borders to dark on a `dark` class, not on `data-theme`, and Scroller paints its own white background from a second set of variables. Rows came out white text on white until both sets were set on the host.
- Slow to build at scale. By default it measures every column's widest value and sorts by the first column on load; 500,000 rows took about 10 seconds to appear (turning off `autoWidth` cut that by roughly a third). Its own FAQ puts client-side data at about 50,000 rows and points you to server-side processing beyond that.
- Paging is the default; Scroller (free) gives virtual rows only, never virtual columns. `scrollY` is the body height alone, so filling a box means subtracting the search box and info line yourself.
- Cells are real DOM, so find-in-page and drag-to-copy work on what's on screen, and the search box filters every row. Arrow-key navigation needs the free KeyTable extension. Editor, SearchPanes and CardView are paid (DataTables Plus, from $219 per developer).
