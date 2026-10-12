# Progress Tracker — Emitrax

> Update after every completed unit of work, not just at the end of a
> session. This is the live source of truth for "where are we right now."

---

## Current Status

**Last completed (currency formatting, phase 4):** Excel and PDF exports
handle every registry currency: Excel number formats follow the symbol,
decimals and grouping (including lakh), and PDF amounts never use a glyph
the font lacks.
Plan: `context/plan/currency-and-number-formatting-plan.md`. See the
entries below.

**Previously (card pages + credit-limit utilisation):** Added
`/credit-cards/cards` and `/credit-cards/cards/:id`, a dated credit-limit
history table, and a fourth `Utilisation` view on the tracker grid —
headlined by an overall figure computed the way a credit bureau does.
**The migration has not been run yet** — see the entry below.

**Previously completed (JSON data export):** Added a machine-readable JSON
export — per-EMI from the details page's Export dropdown, and
whole-account from Account Settings. Built for handing the dataset to a
spreadsheet or an AI assistant, so it carries ownership attribution:
an EMI split 100% to a friend or family member is classified
`on_behalf` and contributes nothing to the user's own totals, while an
unsplit EMI is wholly theirs. See the entry below.

**Earlier (UI fixes):**

- `CreditCardGrid.tsx` — fixed the frozen "Month" column bleeding scrolled
  columns through its translucent row stripe during horizontal scroll. The
  sticky cell now paints an opaque `bg-background` base with the stripe tint
  layered via a `before` pseudo-element (`before:-z-10`), so content no longer
  shows through the overlap.
- `SidebarUser.tsx` — removed the dead "My account" dropdown item (linked to an
  undefined `/account` route and duplicated Settings). User dropdown now shows
  only identity + Sign out. Dropped unused `Link`, `BadgeCheckIcon`, and
  `setOpenMobile`.

**Before that:** Added idempotent migration
`supabase/migrations/supabase_emi_share_permission_enum.sql` so
`emiShares.permission` becomes Postgres enum `emi_share_permission`
(`read` | `write`) and CLI-generated types stop typing it as `string`.

**Also completed:** Adapted app services to CLI-generated
`src/supabase/supabase.types.ts`; EMI repayment progress ledger.

**Next up:**

1. Run `supabase_emi_share_permission_enum.sql` in the Supabase SQL editor
2. Regenerate types
3. Run `supabase_credit_card_bill_tracker_schema.sql` if not yet applied

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
- JSON via `src/utils/export/json/` — per-EMI and whole-account, with
  ownership attribution and a `glossary` block for external consumers

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

### EMI repayment progress (paid / remaining, per participant)

A "Repayment progress" card on `/emi/:id`, between Cost breakdown and the
detail grid: what has been settled and what is still owed, each split into
principal / interest / interest GST / upfront charges — and, for a split
EMI, a per-participant table scaled by each share. No schema change; every
figure derives from the stored amortization schedule.

- **Files changed:** `src/utils/emiRepayment.calc.ts` (new),
  `src/utils/emiRepayment.calc.test.ts` (new, 34 cases),
  `src/components/emi/RepaymentProgressCard.tsx` (new),
  `src/router/pages/EMIDetails.tsx`.
- **Four data hazards this surfaced and fixed on the details page:**
    1. `totalPaidEMIs` / `remainingTenure` are written once and never
       recomputed on read — `normalizeEmiFinancials` only refreshes
       `totalLoan` and the fee fields — so instalment progress went stale
       for any EMI not edited in months. Now recomputed from the calendar.
    2. `remainingBalance` (`calculation.ts:140`) folds the whole loan's GST
       into a principal figure. No longer rendered on this page; the column
       and its other 20-odd consumers are untouched.
    3. The interest discount applies to the aggregate but not to the
       per-row interest, so paid + remaining would not have reconciled to
       the `totalInterest` shown one card above. Now prorated
       proportionally, with the rupee amount disclosed as a footnote.
       Interest GST deliberately stays gross — see §3 of the plan.
    4. `emiWithGST` had a precedence bug (`a + b?.c || 0` binds as
       `(a + b?.c) || 0`), so a completed EMI rendered **₹0** in the
       Monthly EMI tile.
- **RLS shapes the split view.** A registered non-owner participant can
  read only their own `emiSplits` row, so the card branches on computed
  coverage rather than on `isOwner`: owners get the full table, a
  participant gets their own share scoped with an explanatory note.
- **Deferred deliberately:** the ~14 other `* splitPercentage / 100` sites
  (dashboard, PDF and Excel templates) still prorate `remainingBalance`
  and stay self-consistent with it; they belong with the planned export
  refactor. Also `calculation.ts:140` itself, which is a data migration
  rather than a one-line fix.

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

### JSON data export (per-EMI and whole-account)

Motivation: making the dataset analysable outside the app — by a
spreadsheet, or by an AI assistant — without exposing the database. The
PDF and Excel exports are presentation formats and lose structure; this
one is the structured counterpart.

- **Ownership attribution is the point of the feature.**
  `src/utils/emiOwnership.calc.ts` answers "whose loan is this?" in four
  modes: `sole` (unsplit, wholly the user's), `shared` (the user carries
  part), `on_behalf` (the user owns and pays the loan but split 100% of
  it to other people — the money leaves their account, the liability is
  not theirs), `observer` (someone else's loan, visible via a share).
  Without this, a card used for family purchases inflates the user's own
  debt figure by the entire amount.
- **Two rules the attribution encodes.** An unsplit loan sits entirely
  with its owner — absence of a split row means 100%, not 0%. And the
  owner absorbs whatever percentage no split row claims, so splitting 40%
  to a friend and never adding a row for yourself still leaves you the
  other 60%. That second rule applies only to the owner: RLS lets a mere
  participant see just their own row, so an incomplete set there means
  "hidden", reported through `isPartialView`.
- **Summary buckets partition every visible rupee exactly once:** `mine`,
  `financedForOthers` (loans the user owns but others carry), `observed`
  (loans someone else owns). `ownedGross` is the whole-loan total across
  owned loans and deliberately overlaps the first two. A
  `summary.participants` roll-up answers "who owes me what" across all
  loans, keyed by the existing `getSplitParticipantKey`.
- **The document carries a `glossary`.** The file's whole purpose is to
  be read by something that has never seen this codebase, so the
  non-obvious semantics — `on_behalf`, the upfront processing fee sitting
  wholly on the paid side, statement month vs payment month — ship inside
  the file rather than living only in these docs.
- Amortization money arrives from Supabase as strings (`ScheduleData`);
  the export coerces to numbers and derives `isPaid` from the calendar
  via `getRepaymentProgress`, not from the stale stored flag.
- Credit card entries are denormalised with `cardName` / `issuerName` /
  `financialYear` so a row reads on its own.
- **Reused rather than reimplemented:** `getRepaymentProgress`,
  `prorateRepaymentProgress` and `getParticipantRepaymentBreakdown` do
  all the ledger math. `buildParticipants` resolves `mySplit` itself
  instead of trusting the field, so the builder does not depend on which
  service hydrated the record.
- **Placement:** per-EMI JSON joins PDF/Excel in `ExportDropdown`;
  whole-account lives in Account Settings beside Export Templates, since
  it is an account-level operation and the dashboard is already dense.
  Its reads are imperative (`Promise.all` over the services, EMIs through
  `queryClient.fetchQuery` on the existing `['emis']` key) so opening
  Settings does not fetch scenarios and card data for nothing.
- Unlike PDF and Excel, `jsonExport` is statically imported — it is plain
  mapping code with no heavy dependency to keep out of the chunk.
- **New service methods:** `ScenarioService.getAllScenarios()`,
  `CreditCardService.getAllPaymentEntries()` / `getAllBillEntries()` /
  `getAllTrackerYears()` — one round trip each instead of one per EMI or
  per financial year. `getScenariosByEmiId` was refactored onto a shared
  `SCENARIO_SELECT` and `mapScenarioRows`.
- **Files added:** `src/utils/emiOwnership.calc.ts` (+ test),
  `src/types/dataExport.types.ts`,
  `src/utils/export/json/buildExportDocument.ts` (+ test),
  `src/utils/export/json/jsonExport.ts`, `src/hooks/useDataExport.ts`,
  `src/components/account/DataExportSection.tsx`.
- **Files changed:** `src/hooks/useExport.ts`,
  `src/components/emi/ExportDropdown.tsx`,
  `src/components/account/AccountForm.tsx`,
  `src/utils/ScenarioService.ts`, `src/utils/CreditCardService.ts`.
- **Verified:** `yarn lint` (0 errors), `yarn build`, `yarn test`
  (172 passing, up from 161).
- **Next step:** the `IEmi` domain type still has no home for
  `emiPartPayments`, which exists in the DB and in
  `supabase.types.ts` but has no app code — the export skips it. Fold it
  in when part payments are actually built.

---

### Card pages + credit-limit utilisation

Two asks in one module: manage cards on a real page rather than in a side
sheet, and show how much of each card's limit its statements actually
used, month by month. Plan:
`context/plan/credit-card-management-and-utilisation-plan.md`.

- **BLOCKED ON A MIGRATION.**
  `supabase/migrations/supabase_credit_card_limit_history_schema.sql`
  has been written but **not run**. Paste it into the Supabase SQL
  editor, check the verify query at the bottom, then the feature works
  end to end. Until then the utilisation view renders empty, and the
  limit history sheet errors on save — nothing else regresses, because
  everything that existed before still reads `cc_cards."creditLimit"`.
- **A credit limit is now dated, not a field.**
  `cc_card_limit_changes` keys a limit by the day it took effect. Without
  it, one limit increase silently restates every earlier month's
  utilisation — and restates it _downward_, so a card that genuinely ran
  at 70% last April would quietly render as 44%.
- **The earliest recorded change extends backwards**, and the UI badges
  it "Initial limit". A user who records only "raised to ₹4L on 1 Sep"
  would otherwise blank Apr–Aug. The migration backfills one row per card
  that already carried a limit, so this holds for existing data.
- **`cc_cards."creditLimit"` is now a cache**, restated by
  `CreditCardService.syncCurrentLimit` after every history write. To stop
  it having two writers, `creditLimit` was **removed from
  `UpdateCardInput`** — that turned the one existing bypass (the billing
  cycle sheet) into a compile error rather than a value that quietly
  stops sticking. `AddCardDialog` keeps it as the opening limit and
  `createCard` seeds the first history row from it.
- **Combined utilisation is a ratio of sums, never a mean of ratios.**
  A ₹5,000 bill on a ₹50,000 limit and a ₹4,00,000 bill on a ₹5,00,000
  limit average to 45%; the real figure is 73%. Test-covered.
- **Every combined figure follows the credit-bureau rule**
  (`buildBureauUtilisation`): every open card's limit sits in the
  denominator whether or not it carried a balance — which is why closing
  an unused card raises utilisation — and balances floor at zero, since
  a credit balance reports as nil. This is what CIBIL computes, and it is
  what the headline card, the grid's overall column and the per-bank
  columns all show.
- **An unentered card is assumed nil and the month is flagged partial.**
  That assumption can only make utilisation look _better_ than reality,
  which is the dangerous direction, so the card names how many were
  assumed. A month where every card was assumed produces no figure at
  all rather than a confident 0% drawn from absence, and future months
  are skipped for the same reason.
- **Any month can be inspected, not just the latest.** The overall card
  carries a month selector held in the URL as `?month=`, its twelve-bar
  trend doubles as the picker, and it defaults to the most recent month
  with a figure. Changing the financial year drops the picked month, so
  the URL can never name a month that is not on screen.
- **`BureauMonth.contributions` breaks a month down by card** — floored
  balance, limit, that card's own ratio, and whether the figure was
  entered, a known nil, or assumed. Without it the partial-month warning
  names a count but not a card to go and fix. It sums back to the
  headline on both sides, asserted by a test.
- **The strict matrix no longer computes combined figures at all.** It
  survives purely as the source for per-card cells. Two combining
  implementations on one screen would eventually disagree.
- **A `no_statement` month now reads 0% per card, not blank.** Narrower
  than the bill series, where "issued nothing" and "billed ₹0" are
  genuinely different events — for utilisation both mean nothing was
  owed, and blanking it would disagree with the bureau column that counts
  it as a known nil.
- **A deactivated card keeps counting while it holds data that year.**
  Dropping it on deactivation would restate every past month upward,
  which is the silent-history problem the dated limit table exists to
  prevent. A real `closedAt` column is the correct fix if it matters.
- **Absent ≠ zero.** Not entered, `no_statement`, and "no limit recorded"
  all render as an em dash; `0%` means a real zero-balance statement. To
  carry that through the shared grid, `CreditCardGrid` gained four
  optional series props (`formatValue`, `formatTotal`, `getIssuerTotal`,
  `footerLabel`), each defaulting to the existing money behaviour so
  Payments and Bills render identically.
- **Bills and payments still sit in separate columns** on the card page
  and are never differenced, with the caption saying why. That page is
  where the temptation is strongest.
- **Files added:** `supabase/migrations/supabase_credit_card_limit_history_schema.sql`,
  `src/utils/creditCardUtilisation.calc.ts` (+ test),
  `src/router/pages/CreditCardList.tsx`,
  `src/router/pages/CreditCardDetails.tsx`,
  `src/components/creditCards/CardLimitHistorySheet.tsx`,
  `src/components/creditCards/CardSummaryRow.tsx`,
  `src/components/creditCards/IssuerUtilisationCard.tsx`,
  `src/components/creditCards/BureauUtilisationCard.tsx`,
  `src/components/creditCards/UtilisationCellValue.tsx`,
  `src/components/creditCards/BillingCycleSheet.tsx` (extracted from
  `IssuerCardManager` so the card page can reuse it).
- **Files changed:** `src/types/creditCard.types.ts`,
  `src/supabase/supabase.types.ts`, `src/utils/CreditCardService.ts`,
  `src/hooks/useCreditCards.ts`, `src/utils/creditCardBills.calc.ts`
  (exported `isoDayInMonth`), `src/components/creditCards/CreditCardGrid.tsx`,
  `TrackerViewSelector.tsx`, `BillingCycleFields.tsx`,
  `IssuerCardManager.tsx`, `src/router/pages/CreditCards.tsx`,
  `src/router/HomeRouter.tsx`.
- **Verified:** `yarn lint` (0 errors), `yarn build`, `yarn test`
  (205 passing, up from 172). Not yet verified against the live database
  — that needs the migration run first.
- **Next step:** run the migration, then walk the manual assertions in
  §12 of the plan. After that, the JSON export in
  `buildExportDocument.ts` does not yet carry `cc_card_limit_changes`;
  fold it in so an exported dataset can reproduce utilisation.

---

### Review fixes — card pages + utilisation

Pre-commit review of the module above. App-code only, no schema change.

- **A card opened mid-year no longer counts before it opened.**
  `buildBureauUtilisation` now skips a card for a month that ends before
  its earliest limit date unless a statement was entered for that month.
  Before, adding a ₹4L card in October put ₹4L into every earlier
  denominator — a real 80% June read as 16%. The backwards extension in
  `resolveLimitOn` still applies to limit values on a card that existed.
- **Per-issuer coverage counts come from the limit history**
  (`BureauUtilisation.issuerCardsCounted` / `issuerCardsWithoutLimit`), not
  from the busiest month — cards with limits but no statements were being
  reported as "without a limit".
- **"N of M months measured"** — `monthsMeasurable` excludes future months,
  so the current year no longer always reads incomplete.
- **Cache invalidation:** `useCreateCard` invalidates `limits()` (it seeds
  the opening row); `useUpdateCard` invalidates `card(id)` so the details
  page reflects deactivation and cycle edits immediately.
- **`BillingCycleSheet` / `CardLimitHistorySheet` reset on every open**,
  tracked against the `open` prop — Radix never fires `onOpenChange` for an
  externally controlled open, so cancelled edits used to survive.
- **`CreditCardGrid` series gained `zeroIsFigure`**, so a deactivated card
  with a 0% peak stays visible while the bureau columns still count it.
- Dropped the unused `monthLabelFor` prop from `CardSummaryRow`.
- **Files changed:** `creditCardUtilisation.calc.ts` (+ test),
  `creditCard.types.ts`, `useCreditCards.ts`, `BillingCycleSheet.tsx`,
  `CardLimitHistorySheet.tsx`, `CreditCardGrid.tsx`,
  `IssuerUtilisationCard.tsx`, `CardSummaryRow.tsx`, `CreditCards.tsx`.
- **Verified:** `yarn lint` (0 errors), `yarn build`, `yarn test`
  (208 passing).
- **Deferred to the next iteration** (limit handling + card EMI tracking,
  to be planned together): scheduled limits never becoming current
  (`syncCurrentLimit` only runs on write), non-atomic `createCard`
  (card + opening limit in two writes; retry can duplicate), and limit
  history missing from the JSON export. See Open Questions.

---

### Currency & number formatting — phase 1 (formatter core)

- **Plan:** `context/plan/currency-and-number-formatting-plan.md`. 32
  curated currencies, currency decides symbol + decimals, locale decides
  grouping/separators/symbol position. No migration needed.
- **Registry** `src/utils/currencyRegistry.ts`: code, label, region group,
  popular flag, default locale, ISO regions (for phase 2 browser
  defaults), tax label (phase 5). Every default locale renders Latin
  digits only, because the PDF font has no Arabic/Thai/CJK glyphs; JPY uses
  `en-JP`, THB `en-TH`.
- **Formatter fixes** in `src/utils/numberFormat.ts`:
    - `exact` takes decimals from Intl (JPY/KRW/IDR/PKR show 0, not `.00`)
    - `compact_long` actually spells out the unit (`₹12.35 lakh`,
      `1,23 Millionen €`). Intl ignores `compactDisplay: 'long'` with
      currency style, so the number is compacted in decimal style and wrapped
      in the sign/symbol from `formatToParts`
    - formatters are cached per locale/currency/mode
    - new `getCurrencyMeta` (symbol, decimals, prefix/suffix)
- Deleted the unused `formatAmount` from `src/utils/utils.ts`.
- **Files changed:** `numberFormat.ts`, `numberFormat.test.ts` (new),
  `currencyRegistry.ts` (new), `utils.ts`, the plan doc.
- **Verified:** `yarn lint` (0 errors), `yarn build`, `yarn test`
  (225 passing).
- **Next:** phase 2: settings UI (searchable currency picker,
  number-style picker with samples, currency→locale auto-link, live
  preview, relabel warning, browser-detected defaults saved on first
  bootstrap).

### Currency & number formatting — phase 2 (settings UI + first-run defaults)

- **Account Settings → Regional Settings** rebuilt:
    - `CurrencyCombobox`: base-ui combobox, Popular pinned then regional
      groups, search by name / code / symbol (`rupee`, `inr`, `₹`)
    - `NumberStyleSelect` replaces the locale dropdown. Locales are grouped
      under the sample they render (`12,34,567.89`, `1.234.567,89`, ...)
    - Number format options show a live sample in the chosen currency
    - `FormattingPreview` shows a sample amount in all three formats,
      highlighting the selected one
    - Picking a currency switches the number style to that currency's
      default, unless the user picked one by hand (`getLinkedLocale`)
    - Saving a currency change asks for confirmation first: amounts are
      relabelled, never converted
- **First-run defaults:** `AccountDetails.hasSavedPreferences` (false when
  there's no preferences row). `useAccountDataBootstrap` then calls
  `AccountService.initializeRegionalPreferences` once:
    - region from the time zone first, then the browser language
    - users who already own EMIs or cards are pinned to INR / `en-IN`
    - insert-only, so it never overwrites a saved row
    - side effect: filter-config saves (an `update`) now persist for users
      who never opened settings
- Form zod enums now come from the registry; `CURRENCY_OPTIONS` /
  `LOCALE_OPTIONS` removed.
- **Files changed:** `currencyRegistry.ts` (+ new test),
  `AccountService.ts`, `account.types.ts`, `useAccount.ts`,
  `useAccountDataBootstrap.ts`, `account.forms.ts`, `AccountForm.tsx`,
  new `CurrencyCombobox.tsx`, `NumberStyleSelect.tsx`,
  `FormattingPreview.tsx`, `buildExportDocument.test.ts` (fixture field).
- **Verified:** `yarn lint` (0 errors), `yarn build`, `yarn test`
  (238 passing). **Not yet checked in a browser:** the settings screen
  sits behind login.
- **Known gaps until later phases:** Excel shows the ISO code for the new
  currencies (phase 4); PDF glyphs for `₩ ₦ ₱` and the like are unverified
  (phase 4); the EMI form still says `(₹)` (phase 3).

### Currency & number formatting — phase 3 (inputs)

- **`src/utils/parseAmount.ts`** (+ test):
    - `parseLocaleAmount` reads the locale's separators, strips symbols,
      codes and `Rs.`/`kr.`, and keeps the sign
    - Returns a number, `null` (empty) or `undefined` (not an amount)
    - **Ambiguous input is rejected, never guessed**: `12,345.67` in de-DE
      is refused rather than stored as 12.34567
    - A lone foreign separator that isn't valid grouping is read as a
      decimal (`1234.5` in de-DE)
    - `formatAmountForInput` is the inverse: grouped, no symbol, no `.00`
      on whole amounts; a round-trip test covers every currency
- **`useCurrencyPreferences`** gains `currencySymbol`, `fractionDigits`,
  `symbolPosition`, `parseAmountInput`, `formatAmountInput`.
- **`AmountInput`** (`components/common`): a form money field with the
  symbol inside the input, placed before or after the number per locale.
  Invalid text stays visible and reports `NaN`, so zod shows
  "Enter a valid amount." instead of the field silently becoming empty.
- **Swapped in:**
    - EMI form: principal, amount-type interest discount, processing fee.
      Its `(₹)` labels and the `IndianRupee` toggle now use the currency
      symbol; the min-principal message no longer says `₹100`
    - Scenario form: flat charges
    - Advanced filter: principal and total-loan bounds
    - Bill and payment grid cells: their own drafts, commit-on-blur
      unchanged, no adornment
    - Card limit sheet and billing-cycle fields: the parser is passed into
      `validateDraft` / `validateBillingCycle`
- "Different from a ₹0 bill" is now formatted; the decorative
  `IndianRupee` icons on EMI details and stats became `Coins`.
- Percentage, tenure and day inputs are unchanged (not money).
- **Verified:** `yarn lint` (0 errors), `yarn build`, `yarn test`
  (253 passing). **Not yet checked in a browser.**
- **Next:** phase 4 (exports): Excel number formats for every currency,
  Indian grouping in Excel, PDF glyph check.

### Currency & number formatting — phase 4 (exports)

- **Excel:** `buildExcelCurrencyNumFmt` (`export/excel/excelNumFmt.ts`,
    - test) replaces the 4-currency symbol map:
    * symbol placed before or after the number, with the locale's spacing
      (`"Rp "#,##0`, `#,##0.00" €"`)
    * decimals from the currency (JPY / IDR get none)
    * Indian-style locales get lakh/crore grouping through conditional
      sections (`[>=10000000]…;[>=100000]…;…`)
    * Known limit: Excel sends negatives to the last section, so an amount
      of −1 lakh or less shows Western grouping. Amortization figures are
      never negative.
- **PDF:** audited NotoSans with fontkit against all 654 currency × style
  × mode outputs. Only two glyphs are missing: U+2212 (the sv-SE / nb-NO
  minus) and `฿` (THB outside `en-TH`). The PDF `fmt` now maps U+2212 to a
  hyphen and falls back to the ISO code when a symbol can't be drawn.
    - `formatCurrencyAmount` gained an optional `currencyDisplay: 'code'`
    - `pdf/templates/shared.test.ts` pins the whole matrix
- JSON export unchanged (already carries the currency code).
- **Verified:** `yarn lint` (0 errors), `yarn build`, `yarn test`
  (263 passing). A sample workbook was generated for a manual look in
  Excel; not opened programmatically.
- Commit `2d6ef9e`.

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
- **Next iteration — limits + card EMIs, needs a plan.** A future-dated
  limit never becomes `cc_cards."creditLimit"` once its date passes
  (only rewritten on a history write). `createCard` is two non-atomic
  writes (likely needs an RPC). Card-EMI conversions block limit and
  should feed utilisation. Decide these together.
- **The JSON export does not carry limit history.**
  `buildExportDocument.ts` exports cards with their current
  `creditLimit`, so an exported dataset cannot reproduce a past month's
  utilisation. Add `cc_card_limit_changes` to it.
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
