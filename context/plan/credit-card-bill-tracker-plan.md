# Credit Card Bill / Statement Tracker — Module Design Plan

**Project:** Emitrax
**Scope:** Track what each credit card billed, per month, per financial year, alongside the existing payment tracker
**Status:** In progress
**Target:** `/credit-cards`, a `Payments | Bills | Both` view switch
**Ports to:** Casheq — see §9, which contains an off-by-one hazard

---

## 1. Goal

Replace a spreadsheet. The sheet being replaced has cards as columns
(Kotak, SBI, ICICI Amazon, ICICI Coral, YES Bank, YES Rupay), months as
rows Apr → Mar, a total row per card, and a grand total.

Emitrax already has the _payment_ side of exactly this shape — the SFT
tracker. This adds the _bill_ side next to it, and lays the groundwork
for reconciling the two.

## 2. Confirmed decisions

1. **Bill month = the month the statement was generated.** A statement
   generated 15 Aug covering 16 Jul – 15 Aug is filed under **Aug**, and
   is normally paid in **Sep**.
2. **Bill row fields:** `totalDue` required; `minimumDue`,
   `statementDate`, `dueDate`, `note` optional; plus an explicit
   _no statement generated_ state.
3. **UI:** a segmented control on `/credit-cards`, carried in the URL as
   `?view=`, driving one shared grid.
4. **Reconciliation is designed for, not built.** The
   expected-payment-month rule and the fields it needs ship now; the
   variance UI does not.

## 3. The month convention

```
Statement generated   15 Aug 2025
Covers                16 Jul – 15 Aug 2025
Due                    5 Sep 2025

  filed under  →  Aug-25
  paid in      →  Sep-25
```

**Consequence: bill month N maps to payment month N+1 in the general
case.** The two tables' month columns are therefore offset by one, which
is why the bill column is named `"statementMonth"` and the payment column
`"periodMonth"` — so that nobody can naively join them.

This convention was chosen over keying by the cycle's _start_ month
because it is what the bank prints on the statement and how a user
speaks about it ("my August bill"). Casheq's existing
`cycleMonthForDate` uses the other convention; §9 pins the mapping.

## 4. Schema

`supabase/migrations/supabase_credit_card_bill_tracker_schema.sql`.
One script, two parts, both idempotent.

### Part 1 — billing-cycle defaults on `cc_cards`

`cc_cards` previously carried no cycle information at all.

```sql
ALTER TABLE public.cc_cards ADD COLUMN IF NOT EXISTS "statementDay" integer;
ALTER TABLE public.cc_cards ADD COLUMN IF NOT EXISTS "dueDay"       integer;
ALTER TABLE public.cc_cards ADD COLUMN IF NOT EXISTS "creditLimit"  numeric(14, 2);
```

Day-range CHECKs are added via `DROP CONSTRAINT IF EXISTS` →
`ADD CONSTRAINT` (`ADD CONSTRAINT` has no `IF NOT EXISTS`).

**These are pre-fill defaults only.** Every bill row stores its own
dates, because banks change cycle dates mid-year and a historical row
must keep the dates that were actually in force.

### Part 2 — `cc_bill_entries`

Full SQL in the migration. The shape:

| Column                         | Notes                                |
| ------------------------------ | ------------------------------------ |
| `"cardId"`                     | → `cc_cards` CASCADE                 |
| `"statementMonth"`             | `date`, CHECK day = 1                |
| `status`                       | `'issued'` \| `'no_statement'`       |
| `"totalDue"`                   | `numeric(14,2)`, **may be negative** |
| `"minimumDue"`                 | capped at `GREATEST("totalDue", 0)`  |
| `"statementDate"`, `"dueDate"` | `dueDate >= statementDate`           |
| `note`                         |                                      |

`UNIQUE ("cardId", "statementMonth")` is the upsert conflict target.
RLS mirrors `cc_payment_entries` exactly, **including the parent-ownership
check** against `cc_cards`. The `updatedAt` trigger reuses the existing
`public.set_cc_updated_at()`.

### The tri-state

| State                       | Representation                             |
| --------------------------- | ------------------------------------------ |
| Not entered yet             | row absent                                 |
| Bank generated no statement | `status='no_statement'`, `"totalDue"` NULL |
| Statement issued for ₹0     | `status='issued'`, `"totalDue"=0`          |
| Normal                      | `status='issued'`, `"totalDue"<>0`         |

Held together by
`CHECK ((status='issued' AND "totalDue" IS NOT NULL) OR (status='no_statement' AND "totalDue" IS NULL AND "minimumDue" IS NULL))`
so the status and the amounts can never disagree.

A `'no_statement'` row **is never deleted as empty** — it carries
information. An `'issued'` row with nothing in it is.

**Why an enum rather than a boolean:** they behave identically today, but
Casheq will need a third state once bills are derived from transactions
rather than typed, and extending an enum is a CHECK swap where adding a
second boolean is a schema smell.

### Why `totalDue` may be negative

An overpayment or a large refund produces a real credit-balance
statement — "₹2,340 CR". Rejecting it would force the user to enter
something false. Accepted consequence: month, card and FY totals can be
reduced by a negative row.

### Why no `statementDate ∈ statementMonth` constraint

Banks sometimes label a statement dated 1 Aug as July's. More
practically: the grid has no per-cell error surface, so a constraint
violation would surface as raw Postgres text in a toast. This is a **UI
warning that still allows the save**.

## 5. Expected payment month

```ts
export type ExpectedPaymentBasis = 'dated' | 'card' | 'assumed';

getExpectedPaymentMonth(statementMonth, card, entry?): {
    periodMonth: string;
    basis: ExpectedPaymentBasis;
    crossesFinancialYear: boolean;
}
```

Precedence — **the row's own dates always win**, which is what makes a
mid-year cycle change work:

1. `'dated'` — both row dates present → the month of `dueDate`
2. `'card'` — both card days known → `dueDay > statementDay ? M : M+1`
   (strict `>`; equal days mean next month)
3. `'assumed'` — otherwise `M+1`, the documented normal case

`crossesFinancialYear` exists so the future reconciliation UI cannot
silently drop a March bill whose settling payment lands in April of the
_next_ financial year.

## 6. Implementation inventory

| Layer   | File                                                               | What                                                                                                                                                          |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema  | `supabase/migrations/supabase_credit_card_bill_tracker_schema.sql` | Cycle fields + `cc_bill_entries`                                                                                                                              |
| Types   | `src/supabase/supabase.types.ts`                                   | `cc_bill_entries`; three new `cc_cards` columns, **optional on `Insert`**                                                                                     |
| Types   | `src/types/creditCard.types.ts`                                    | `BillEntryStatus`, `ICreditCardBillEntry`, `SaveBillEntryInput`, `IssuerBillAggregate`; `TrackerMatrix<T>` made generic                                       |
| Service | `src/utils/CreditCardService.ts`                                   | `getBillEntriesForFinancialYear`, `saveBillEntry`, `deleteBillEntry`; `countEntriesForCard` → `{ payments, bills }`; `getFinancialYearsWithData` unions bills |
| Hooks   | `src/hooks/useCreditCards.ts`                                      | `creditCardKeys.bills(fy)`, `useCreditCardBillEntries`, `useSaveBillEntry`                                                                                    |
| Calc    | `src/utils/financialYear.ts`                                       | `addMonthsToPeriodMonth`                                                                                                                                      |
| Calc    | `src/utils/creditCardTracker.calc.ts`                              | `buildTrackerMatrix` generalized over `TrackerSeriesAccessors<T>`; `PAYMENT_SERIES`                                                                           |
| Calc    | `src/utils/creditCardBills.calc.ts`                                | `getExpectedPaymentMonth`, `getBillDefaultDates`, `isEmptyBillEntry`, `getBillAmount`, `aggregateBillsByIssuer`, `BILL_SERIES`                                |
| UI      | `src/components/creditCards/TrackerViewSelector.tsx`               | `?view=` segmented control                                                                                                                                    |
| UI      | `src/components/creditCards/CreditCardGrid.tsx`                    | Series-driven; renders 1 or 2 sub-columns per card                                                                                                            |
| UI      | `src/components/creditCards/BillCellEditor.tsx`                    | Signed amount, popover for the rest, no-statement switch                                                                                                      |
| UI      | `src/components/creditCards/IssuerBillSummaryCard.tsx`             | Replaces the threshold card in Bills mode                                                                                                                     |

**The service extends the existing class rather than adding a sibling** —
`requireUserId` and the `map*Row` helpers are module-private by design,
and a sibling would force exporting them.

`projectYearEnd` and `getThresholdStatus` are already pure and
threshold-agnostic and are **reused verbatim**.

### The delete-when-empty rule

It was already duplicated between `CreditCardService.savePaymentEntry`
and `useSavePaymentEntry.onMutate`. Adding bills would make four copies
of a rule that must never drift, so it is extracted into the calc layer
as `isEmptyPaymentEntry` / `isEmptyBillEntry` and used in both places.

## 7. UI notes

**Subtotals are per-series and never summed across series.** Adding a
bill to a payment is exactly the comparison §8.1 forbids.

**Both mode drops the per-issuer subtotal columns.** Six cards × two
series plus subtotals is 21 columns on a sticky-first-column table; 15
without. The bills sub-column is distinguished by a muted background and
a header label, not colour — it has to survive dark mode.

**Dates in the cell editor are placeholders, not committed values**, plus
an explicit "Use card cycle" button. Auto-filling derived dates into
every row would defeat the point of per-row dates and make a mid-year
cycle change undetectable.

**Bills have no threshold**, so `IssuerBillSummaryCard` replaces
`IssuerThresholdCard` rather than reusing it. It shows the FY total, the
average over _months with an issued statement_, the peak bill and its
month, and a coverage line ("10 of 12 months entered · 1 no statement ·
1 not entered") that makes the tri-state visible at a glance.

A gauge appears **only when every card in the issuer has a credit
limit**, and compares the _peak monthly bill_ to the combined limit.
Summing twelve statements against a credit limit is meaningless — a limit
constrains outstanding at a point in time, not an annual total.

## 8. Edge-case register

| #   | Case                                                                                                                                             | Resolution                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Twelve bills ≠ annual spend.** A revolved balance is billed again next month _with interest_, so summing double-counts.                        | Per-series totals only, never combined, never differenced. No variance column. An explicit caption on every bills summary card. Stated in the migration banner.                 |
| 2   | A bill includes interest, annual/late fees + GST and card-EMI instalments, and nets off refunds, reversals and cashback — so bill ≠ Σ purchases. | Documented, not modelled. `totalDue` is the figure as printed; the app never reconstructs it from parts.                                                                        |
| 3   | Spend paid immediately never reaches a statement, but does appear as a payment.                                                                  | Documented. This is _the_ reason bills and payments diverge structurally, not merely by timing.                                                                                 |
| 4   | "No statement" ≠ ₹0 ≠ not entered.                                                                                                               | `status` enum + row absence. Three distinct renderings. Test-covered.                                                                                                           |
| 5   | Overpayment → credit balance.                                                                                                                    | `totalDue` may be negative; `minimumDue` capped at `GREATEST(totalDue, 0)`.                                                                                                     |
| 6   | The bank changes the cycle date mid-year.                                                                                                        | Per-row dates always win over card days in `getExpectedPaymentMonth`. Card days are pre-fill placeholders, never auto-committed. Cycle fields are editable after card creation. |
| 7   | Auto-debit slips past a weekend into the next month.                                                                                             | The expected-payment month is a _rule_, not a fact. **Deferred:** an optional `settledByPeriodMonth` override column.                                                           |
| 8   | A card-EMI conversion shows an instalment, not the purchase.                                                                                     | Documented; the `note` field carries it. Future link to Emitrax's own EMI domain.                                                                                               |
| 9   | Card opened or closed mid-year.                                                                                                                  | Coverage counts make a partial year explicit. Inactive cards holding data stay visible in the grid.                                                                             |

## 9. Porting to Casheq

### The off-by-one hazard

Casheq's `packages/shared/src/utils/billing-cycle.ts` keys a cycle by its
**start** month:

```
cycleMonthForDate(dateIso, startDay)
```

With `startDay = 16`, Casheq's cycle `2026-07` runs **16 Jul → 15 Aug**,
and its statement is generated on/just after 15 Aug. Under decision #1
that statement is filed under **Aug**. Therefore:

> **`emitraxStatementMonth = month(cycleEndDate)`**
>
> i.e. `casheqCycleMonth + 1 month` when `startDay > 1`,
> and `= casheqCycleMonth` when `startDay = 1`.

**Do not use `cycleMonth` as the bill row key when porting.** Add
`statementMonthForCycle(cycleMonth, startDay)` to
`billing-cycle.ts`, derived from `getCycleBounds(...).endIso`, and key
the bill table on that.

Getting this wrong shifts every bill by exactly one month — invisible in
isolation, and it makes the two apps disagree about the same underlying
data.

### Type divergence

Casheq's `transactions.billing_cycle_month` is `text 'YYYY-MM'`, but its
own month buckets (`credit_card_payment_overrides.period_month`) are a
`date` pinned to the 1st with a CHECK. **The bill table must follow the
`date` day-1 form**, matching both Emitrax's `"statementMonth"` and
Casheq's override table.

### Derived + override

Casheq derives statements from transactions, so bills there follow the
`sft-tracker.ts` shape: a cell carrying both `derivedAmount` and the
effective `amount` plus `isOverridden`, with overrides in a
`unique (credit_card_id, period_month)` table where "reset" is a DELETE.

Emitrax has no derivation source, so its bills are purely manual. **The
seam that makes both work without touching the grid is
`TrackerSeriesAccessors.getAmount`** — Casheq passes an accessor that
reads the effective amount off its derived+override cell.

This is why Emitrax deliberately does **not** carry always-null
`derivedAmount` / `isOverridden` fields on its cells. Speculative
constant fields are not portability; the accessor is.

## 10. Deferred

- **Reconciliation / variance UI** — comparing a bill to the payment that
  settled it, flagging shortfalls and overpayments with a likely
  explanation. The rule and its fields ship now.
- **`settledByPeriodMonth`** — a manual override for edge case 7, so a
  slipped auto-debit can be attributed to the bill it actually settled.
- **Card-EMI link** — connecting a converted purchase to an Emitrax EMI
  record.

## 11. Rollout

| #   | Step                                                                            |
| --- | ------------------------------------------------------------------------------- |
| 0   | `context/` docs, `AGENTS.md`, `CLAUDE.md`, this plan                            |
| 1   | Run the migration                                                               |
| 2   | Card cycle fields end-to-end — types, service, `AddCardDialog`, edit affordance |
| 3   | Calc layer + `addMonthsToPeriodMonth` + generic matrix + tests                  |
| 4   | Bill types, service methods, hooks                                              |
| 5   | UI — selector, series-driven grid, cell editor, summary cards, page wiring      |
| 6   | Progress tracker entry                                                          |

Step 5 carries the regression risk: **Payments mode must behave
identically after the grid refactor.**

## 12. Verification

```
yarn lint && yarn build && yarn test
```

`yarn build` is load-bearing — making `TrackerMatrix` generic and
`buildTrackerMatrix` four-argument turns every stale call site into a
compile error rather than a runtime surprise.

Manual assertions are listed in the approved plan; the domain ones that
matter most:

- A `'no_statement'` cell survives a reload (it was not deleted as empty)
- A `0` total renders ₹0 and is visually distinct from both an untouched
  cell and a no-statement cell
- A negative total is accepted and reduces the month, card and FY totals
- With `dueDay < statementDay`, a Mar-2027 bill's expected payment month
  is Apr-2027 and is flagged as crossing into FY 2027-28
- `statementDay = 31` prefills 28 (29 in a leap year) on the Feb row
- Both mode has no variance column and shows the not-comparable caption
- From a second account, `cc_bill_entries` returns zero rows and an
  insert naming another user's card is rejected
