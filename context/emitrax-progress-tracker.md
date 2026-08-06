# Progress Tracker — Emitrax

> Update after every completed unit of work, not just at the end of a
> session. This is the live source of truth for "where are we right now."

---

## Current Status

**Last completed:** App shell rewrite (sidebar, global header, command
palette) and the credit-card **payment** tracker — a month × card grid
for one financial year tracking payments against India's SFT-006
thresholds, per issuing bank.

**Also completed:** Credit-card **bill** tracker — the same grid shape for
what each card billed per month, with a `Payments | Bills | Both` switch.
See `context/plan/credit-card-bill-tracker-plan.md`.

**Next up:** **Run `supabase_credit_card_bill_tracker_schema.sql` in the
Supabase SQL editor** — it is written but not yet applied, so the bills UI
will error against the live database until it is. Then run the manual
checks in §12 of the plan document.

---

## Completed

Reconstructed from the codebase — this file was created partway through
the project's life, so earlier entries are a summary rather than a log.

### EMI core

- Create / edit an EMI with principal, interest rate, tenure, bill date,
  GST, processing fee + GST, and an interest discount (percent or flat)
- Derived figures computed in `src/utils/calculation.ts`: monthly EMI,
  total interest, total GST, total outflow, remaining balance and tenure
- Amortization schedule generated per EMI, with paid/unpaid state
- Tags, notes, archive, completion

### Dashboard

- EMI cards with aggregate statistics (`StatsSection`)
- Advanced filter + sort module, persisted to
  `user_account_preferences.filter_config` (debounced)
- Split-aware statistics

### Sharing and splitting

- `emiShares` with read/write permissions, resolved by email via
  `user_profiles`
- `emiSplits` across registered users and name-only externals
- RLS via the `check_emi_ownership` `SECURITY DEFINER` helper

### Foreclosure scenarios

- Persisted what-if simulations with a stored component breakdown
- Pure math in `src/utils/scenarioCalculation.ts`, unit tested

### Export

- PDF via `@react-pdf/renderer`, Excel via `exceljs`

### Account preferences

- Currency, locale, number format; export and filter configuration
- `useCurrencyPreferences()` is the single formatting entry point

### App shell

- Sidebar (`AppSidebar` + `nav.config.ts`), collapsible to an icon rail,
  collapse state persisted to localStorage
- Single sticky `AppHeader`, title from a page-title context falling back
  to the nav config
- ⌘K command palette, deriving its "Go to" group from `appNavItems`
- User identity + sign out moved into the sidebar footer; the header
  keeps only theme and search
- **One scroll container** for the whole app; pages no longer nest their
  own

### Credit card — payment tracker (SFT / AIS)

- `cc_issuers`, `cc_cards`, `cc_payment_entries`, `cc_tracker_years`
  (`supabase_credit_card_tracker_schema.sql`)
- Per-issuer threshold gauges: ₹10,00,000 and a separate ₹1,00,000 cash
  limit, banded safe / watch / risk / breached
- Month × card grid, cards grouped under issuers, optimistic cell saves
- One-step "Add card" with a creatable issuer combobox; a management
  sheet for rename / move / deactivate / delete
- `src/utils/financialYear.ts` and `src/utils/creditCardTracker.calc.ts`,
  both unit tested

### Credit card — bill tracker

- `supabase/migrations/supabase_credit_card_bill_tracker_schema.sql` —
  billing-cycle defaults on `cc_cards` (`statementDay`, `dueDay`,
  `creditLimit`) plus the `cc_bill_entries` table. **Written, not yet run.**
- `context/` folder created from scratch: six documents, `schema/`,
  `plan/`, plus root `AGENTS.md` and `CLAUDE.md`
- `src/utils/creditCardBills.calc.ts` + tests — the expected-payment-month
  rule with its three-level precedence, date defaults with month-length
  clamping, the empty-entry predicate, and per-issuer aggregation
- `src/utils/financialYear.ts` — `addMonthsToPeriodMonth`, re-anchoring to
  day 1 so a 31st cannot overflow
- `buildTrackerMatrix` generalized over `TrackerSeriesAccessors<T>`, with
  `PAYMENT_SERIES` and `BILL_SERIES`. `TrackerMatrix` is now generic with
  no default type argument, so every call site declares its series
- `CreditCardGrid` rewritten as a series-driven layout component; the page
  now decides which editor a cell renders
- `BillCellEditor`, `IssuerBillSummaryCard`, `TrackerViewSelector`,
  `BillingCycleFields` (shared by the add sheet and a new edit affordance
  in the card manager)
- `?view=payments|bills|both` in the URL alongside `?fy=`
- Test count 70 → 112

**Model decisions worth remembering:**

- A bill is filed under the month its **statement was generated**, so bill
  month N maps to payment month N+1. That is why the column is
  `"statementMonth"` and not `"periodMonth"` — **the two tables must never
  be joined on their month columns.**
- Three distinct states: row absent (not entered), `status='no_statement'`
  (bank issued nothing), `status='issued'` with `totalDue=0` (a real ₹0
  bill). A `no_statement` row is never deleted as empty.
- `totalDue` **may be negative** — a refund or overpayment produces a
  genuine credit-balance statement.
- **Bill and payment totals are never combined or differenced.** A revolved
  balance is billed again next month with interest, so twelve bills do not
  sum to a year's spending. Per-series subtotals only, and no variance
  column.
- Bills have **no statutory threshold**. The only defensible gauge is peak
  monthly bill vs the issuer's combined credit limit, shown only when every
  card in the issuer has one.
- Date fields are pre-filled as **suggestions, never auto-committed** —
  per-row dates exist precisely so a mid-year cycle change stays visible.
- The `getAmount` accessor is the **Casheq portability seam**; it is why
  Emitrax carries no always-null `derived*` fields.

**Manual checks still to run (need the migration applied):** see §12 of
`context/plan/credit-card-bill-tracker-plan.md`.

### Fix: horizontal scroll in the expanded sidebar

- **Cause:** `SidebarSeparator` (`src/components/ui/sidebar.tsx`) tried to
  override the base `Separator`'s `data-[orientation=horizontal]:w-full`
  with a plain `w-auto` class. The attribute-qualified variant selector has
  higher CSS specificity than a bare utility class, so `w-full` always won
  regardless of class order — the separator rendered at 100% width _plus_
  its own `mx-2` margins, overflowing 8px past the sidebar's right edge.
  Since `SidebarContent` uses `overflow-auto` on both axes, that 8px
  overflow surfaced as a horizontal scrollbar in the expanded state.
- **Fix:** changed the override to `w-auto!` (Tailwind v4 important
  syntax), matching the pattern already used elsewhere in the same file
  (`group-data-[collapsible=icon]:p-0!`).
- **Verified** by running the dev server headless and diffing
  `scrollWidth` vs `clientWidth` on `sidebar-content` before/after — no
  code changes needed beyond the one class.
- **Files changed:** `src/components/ui/sidebar.tsx`.

---

## Open Questions

- **Sidebar "Settings" 404s.** `src/components/sidebar/nav.config.ts`
  points the item at `/settings`, but `src/router/HomeRouter.tsx` only
  registers `/account`, so it falls through to `NotFoundPage`. The
  sidebar footer's "My account" link goes to `/account` and works.
  Decide whether to rename the route or the nav entry.
- **`README.md` is stale.** It says React Hook Form (the app migrated to
  TanStack Form) and dev port 5173 (`vite.config.ts` sets 3002). The
  context docs record the truth; the README should be corrected or
  pointed at them.
- **Components are untested**, deliberately — `environment: 'node'` and
  no `@testing-library`. Revisit only if a UI regression proves
  expensive; the pure-logic tests are where the value is.
- **Bill ↔ payment reconciliation** is designed but not built. The one
  column it will likely need is a manual `settledByPeriodMonth`
  override, for an auto-debit that slips past a weekend into the next
  month.

---

## Known Deferred (intentional, not bugs)

- No bank or card API integration, and no statement import
- No multi-currency conversion — currency is a display preference
- A card-EMI conversion is recorded only as a note on the bill row; it is
  not linked to an Emitrax EMI record
- No mobile app — Casheq owns that
