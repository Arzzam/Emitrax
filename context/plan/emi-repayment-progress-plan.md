# EMI Repayment Progress — Module Design Plan

**Project:** Emitrax
**Scope:** Paid/remaining repayment ledger on the EMI details page, per participant for split EMIs
**Status:** Shipped
**Target:** `/emi/:id` — a "Repayment progress" card between Cost breakdown and the detail grid
**Ports to:** Casheq — the calc module is pure and portable; see §7

---

## 1. Goal

The EMI details page answered _what does this loan cost_ (the Cost breakdown
card) but never _how far through it am I_. This module adds the second
question: what has been settled, split into principal / interest / GST /
upfront charges, and what is still owed — and, when an EMI is split among
several people, the same ledger scaled to each participant's share.

Nothing new is stored. Every figure derives from the amortization schedule
already persisted on the EMI row.

## 2. Confirmed decisions

1. **Instalment progress is recomputed from the calendar, never read off
   `totalPaidEMIs`.** That column is written once by `calculateEMI` and never
   refreshed on read — `normalizeEmiFinancials` (`src/utils/EMIService.ts:177`)
   only recomputes `totalLoan` and the processing-fee fields. An EMI created in
   January still reports January's paid count in August. The details page now
   derives it live; the dashboard still uses the stale value (see §6).
2. **`emi.remainingBalance` is not rendered on this page.** It is
   `P + totalGST − principalPaid` (`src/utils/calculation.ts:140`) — the whole
   loan's GST folded into a principal figure, so it is neither outstanding
   principal nor remaining outflow. The column is left untouched; only the
   page's use of it is replaced. Changing the formula would split the stored
   corpus into two conventions with no backfill.
3. **Non-owner participants see only their own share.** Forced by RLS, not
   chosen — see §4.
4. **The export layer is out of scope.** `pdf/templates/shared.ts` still
   prorates `remainingBalance`; a separate export refactor will fold it in.

## 3. The three arithmetic rules

The module exists mostly to encode three rules that are individually obvious
and collectively easy to get wrong.

### Origination charges are always paid

Processing fee and its GST are collected at disbursal. They sit wholly on the
paid side and are **hard zero** on the remaining side, no matter how many
instalments are outstanding. A naive "scale everything by remaining months"
would spread them across the tenure and overstate what is still owed.

### Principal is derived by subtraction, not summation

```
remaining.principal = balance of the last paid schedule row
paid.principal      = principal − remaining.principal
```

Summing the per-row `principalPaid` strings instead drifts by cents over a long
tenure, and the two columns would visibly fail to add up to the loan principal.

**Exception:** once every instalment is behind us the balance is zero by
definition. The final schedule row does not quite reach zero —
`calculateAmortizationSchedule` amortizes off an EMI already rounded to 2dp,
leaving a few paise (₹0.06 on the 12×₹120,000 @12% fixture) — and that residue
must not surface as an outstanding balance on a settled loan.

### The interest discount is prorated; its GST is not

`emi.totalInterest` has `applyDiscount` applied to the aggregate
(`calculation.ts:202`) but each schedule row's `interest` is gross, so
`sum(rows) ≠ totalInterest` whenever a discount exists. The discount is a
loan-level concession with no ground truth about which instalment it attaches
to, so it is attributed proportionally:

```
discountRatio      = min(totalInterest / grossInterest, 1)
paid.interest      = sum(paidRows.interest) * discountRatio
remaining.interest = totalInterest − paid.interest      // absorbs the residual
```

Deriving the remaining side by subtraction makes the two sides reconcile to
`emi.totalInterest` exactly — which is the point, because the Cost breakdown
card three rows up renders that same figure.

**GST stays gross.** It accrues on undiscounted per-row interest, and
`emi.totalGST` — also rendered in the Cost breakdown — is that gross figure.
Discounting it here would create a second contradiction while fixing the first.
This asymmetry is deliberate and is called out in the module's JSDoc, because
it reads like a bug.

## 4. The RLS asymmetry

The `emiSplits` SELECT policy (`supabase_emi_splits_schema.sql`) grants a row to
the EMI owner, or to a registered participant for **their own row only**. So
`emi.splits` arrives either complete (owner) or as a single row (participant),
and `totalSplitPercentage` is 100 or that one participant's share.

`getParticipantRepaymentBreakdown` therefore reports `coveredPercentage` and
`isPartialView`, and the card **branches on coverage rather than on `isOwner`**.
A splits set that fails to reach 100% for any other reason — malformed data, a
future partial-split feature — then degrades identically instead of rendering a
table that does not add up.

| View                      | Renders                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Not split                 | Whole-loan panels, no table                                                                                         |
| Owner of a split          | Whole-loan panels + full participant table with a whole-loan footer                                                 |
| Participant, own row only | Panels scoped to their share, `Your N% portion` badge, no table, and a line saying the full breakdown is owner-only |

A one-row table is deliberately not rendered for the participant case: it reads
as "this is the whole split", which is false.

## 5. Implementation inventory

| Layer | File                                           | What                                                                                                       |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Calc  | `src/utils/emiRepayment.calc.ts`               | New. `getRepaymentProgress`, `prorateRepaymentProgress`, `getParticipantRepaymentBreakdown` + result types |
| Tests | `src/utils/emiRepayment.calc.test.ts`          | New. 34 cases                                                                                              |
| UI    | `src/components/emi/RepaymentProgressCard.tsx` | New. The card                                                                                              |
| UI    | `src/router/pages/EMIDetails.tsx`              | Renders the card; switched 8 sites off the stale/wrong columns                                             |

**Why whole-loan + a separate `prorate`, rather than one per-participant
function.** Non-split EMIs are the majority and need the whole-loan ledger
alone. The partial-view case needs the whole-loan figure in hand to compute the
unaccounted remainder. And `prorate` is the reusable primitive that can later
retire the ~14 duplicated `* splitPercentage / 100` sites across the app.

**Why the result types live in the calc file, not `emi.types.ts`.** That file
holds persisted entity shapes mirroring DB columns. These are derived view
models with no storage, following `creditCardBills.calc.ts`.

**`totalPaidEMIs` and `remainingBalance` are absent from the accepted
`Pick<IEmi, …>`** — a compile-time guard against either being reintroduced.

### Sites switched in `EMIDetails.tsx`

Removing the three fields from the destructure first made TypeScript enumerate
every consumer.

| Was                                           | Now                                                       |
| --------------------------------------------- | --------------------------------------------------------- |
| Tenure Progress tile `totalPaidEMIs/tenure`   | live `paidInstallments/totalInstallments`                 |
| "Remaining Balance" row                       | two rows: "Outstanding Principal" and "Remaining Outflow" |
| "Total Paid EMIs", "Remaining Tenure"         | live counts                                               |
| `myRemainingBalance`, per-split "Outstanding" | prorated `remaining.total`                                |
| `emiWithGST`                                  | indexed off the live count; see below                     |

### The `emiWithGST` precedence bug

`emi + amortizationSchedules[tenure - remainingTenure]?.gst || 0` binds as
`(emi + gst) || 0`. On a completed EMI the index ran past the end of the
schedule, giving `emi + undefined` → `NaN` → `NaN || 0` → **the Monthly EMI stat
tile rendered ₹0**. Now parenthesised and indexed off the live paid count.

## 6. Edge-case register

| #   | Case                                     | Resolution                                                                                                                           |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Legacy row with no amortization schedule | Fall back to aggregates; `isScheduleDerived: false`. Only the upfront charges count as paid                                          |
| 2   | Fully repaid loan                        | Remaining is zero across the board; the final row's paise residue is discarded (§3)                                                  |
| 3   | Zero-interest loan                       | `grossInterest === 0` guards the discount ratio; no `NaN`                                                                            |
| 4   | Discount exceeding gross interest        | `applyDiscount` already clamps to 0; both sides read zero                                                                            |
| 5   | Date before loan start / long past end   | Paid count clamps to `[0, schedule.length]`                                                                                          |
| 6   | `splitAmount` stale or missing           | Falls back to `emi.emi * pct`, matching every other consumer                                                                         |
| 7   | Splits summing to 100.01                 | Treated as complete; tolerance matches `EmiSplitService.validateSplits`                                                              |
| 8   | Sub-rupee proration residual             | Not redistributed. The UI never renders a "sum of participants" row — the footer shows the whole-loan figure — so it is unobservable |

## 7. Porting to Casheq

`emiRepayment.calc.ts` imports only `date-fns`, `@/types/emi.types` and
`@/utils/calculation`. It has no React, Redux or Supabase dependency and moves
across as-is once `IEmi`/`ScheduleData` have equivalents on the `loans` table.

**The hazard to carry across:** the three arithmetic rules in §3 are not
self-evident from the function signatures. In particular, a reviewer who has not
read this document will try to "fix" the gross-GST asymmetry.

## 8. Deferred

- **The other ~14 proration sites.** `splitContributions.ts:50-53` (dashboard,
  uses `emi.totalLoan` as its base), `pdf/templates/shared.ts:67-70,100-106`,
  both Excel templates, `EMIService.ts:302`. Each is currently self-consistent
  with `emi.remainingBalance`; migrating them belongs with the export refactor.
- **`SplitEMI.tsx:284`** computes its preview off a GST-inclusive EMI while the
  DB trigger uses the base `emi` column. A real inconsistency, but it concerns
  the _monthly_ figure, orthogonal to this module.
- **`calculation.ts:140`.** Correcting `remainingBalance` at the source is a
  data migration, not a one-line fix — 22 read sites and no backfill.
- **The dashboard's stale `totalPaidEMIs`.** Same staleness as §2 rule 1, but
  fixing it there means recomputing across every card in the list.

## 9. Verification

```
yarn lint && yarn build && yarn test
```

`yarn build` is `tsc -b && vite build` and was load-bearing here: dropping the
three fields from the destructure and letting the typechecker enumerate the
consumers is what made the migration exhaustive.

Manual assertions, as observable outcomes:

- A non-split EMI mid-tenure: Paid + Remaining equals "Total loan outflow" in
  the Cost breakdown card, to the rupee.
- Paid + remaining interest equals that card's "Total interest" — including
  with an interest discount set.
- With a processing fee: it appears on the paid side only, and the remaining
  panel carries the upfront-charges note.
- An EMI untouched for months: Tenure Progress now advances with the calendar.
- A completed EMI: the Monthly EMI tile shows a real amount, not ₹0.
- Owner viewing a 3-way split: each row scales to its percentage and the footer
  matches the whole-loan panels.
- Signed in as a non-owner participant: panels show only that share, no table,
  owner-only note present. This path cannot be caught by types.
