# Card Management Pages + Credit-Limit Utilisation — Module Design Plan

**Project:** Emitrax
**Scope:** A dedicated cards management surface, and monthly credit-limit
utilisation derived from statements
**Status:** In progress
**Target:** `/credit-cards/cards`, `/credit-cards/cards/:id`, and a fourth
`?view=utilisation` on `/credit-cards`
**Ports to:** Casheq — see §10

---

## 1. Goal

Two asks, one module.

1. **Manage cards on a page, not in a sheet.** `IssuerCardManager` is a
   side sheet built for quick rename/move/retire. It has no room for card
   _details_ — the limit, the cycle, what that card has actually billed
   and paid. A card deserves a page.
2. **Monthly credit-limit utilisation.** The bill tracker already stores
   what each card billed per month, and `cc_cards."creditLimit"` already
   stores the limit. Utilisation is the ratio the two were always
   implying, per card and combined across cards.

Nothing here changes what a bill or a payment _means_. Utilisation is a
new derived view over data already entered.

## 2. Confirmed decisions

1. **A list page plus a per-card detail page.** `/credit-cards/cards`
   lists cards grouped by issuer; `/credit-cards/cards/:id` is the card.
   The existing `IssuerCardManager` sheet **stays** — it is the fast path
   from the tracker, and deleting it would be a regression for bulk edits.
2. **Utilisation appears in both places** — as a fourth tracker view on
   `/credit-cards`, and as a per-card trend on the detail page.
3. **Utilisation = statement `"totalDue"` ÷ the limit in force.** No new
   bill column. The statement total is the outstanding balance the bank
   printed at statement date, which is exactly what a limit constrains.
4. **Both per-card and combined monthly utilisation.** Combined is
   computed per issuer and across all cards, and is a **ratio of sums,
   never a mean of ratios** — see §5.3.
5. **Limits are historical.** A new `cc_card_limit_changes` table keys a
   limit by the date it took effect, so raising a limit in September does
   not restate April. This is the one part needing a migration, and per
   the workflow rules it ships and is verified on its own first.

## 3. Why limit history needs a table

A credit limit is not a property of a card, it is a property of a card
_at a time_. Banks raise limits routinely.

Without history, one limit increase silently rewrites every earlier
month's utilisation — and it rewrites it _downward_, which is the
dangerous direction. A card that genuinely ran at 70% last April would
render as 44% after a limit bump, and the user would never know the
figure had moved.

This is the same class of problem the bill tracker already solved with
per-row `"statementDate"` / `"dueDate"`: **the historical record keeps
what was actually in force.** Limit history is that rule applied to the
limit.

## 4. Schema

`supabase/migrations/supabase_credit_card_limit_history_schema.sql`.
One script, three parts, idempotent.

### Part 1 — `cc_card_limit_changes`

| Column            | Notes                                        |
| ----------------- | -------------------------------------------- |
| `"cardId"`        | → `cc_cards` CASCADE                         |
| `"effectiveFrom"` | `date` — a real date, **not** a month bucket |
| `"creditLimit"`   | `numeric(14,2)`, `CHECK > 0`                 |
| `note`            | e.g. "annual review increase"                |

`UNIQUE ("cardId", "effectiveFrom")` is the upsert conflict target.

**No day-1 CHECK**, deliberately. Every other date column in the `cc_*`
family is a month bucket pinned to the 1st; this one is not. A limit
changes on the day the bank changed it.

RLS mirrors `cc_bill_entries` exactly, including the parent-ownership
check against `cc_cards`. The `updatedAt` trigger reuses
`public.set_cc_updated_at()`.

### Part 2 — backfill

One row per card that already has a `"creditLimit"`, with
`"effectiveFrom" = "createdAt"::date`, `ON CONFLICT DO NOTHING`. Without
this, every existing card would resolve to "no limit" the moment the app
starts reading history instead of the column.

### Part 3 — `cc_cards."creditLimit"` keeps its meaning

The column stays, and stays **the current limit**. It is a denormalised
cache of "the latest change as of today", maintained by the service on
every history write.

Keeping it is what makes this a non-breaking change:
`aggregateBillsByIssuer`'s `combinedLimit`, `IssuerBillSummaryCard`'s
peak gauge and `BillingCycleFields` all keep working untouched. Only the
new utilisation code reads history.

## 5. The calc layer

`src/utils/creditCardUtilisation.calc.ts`, pure, unit tested.

### 5.1 Resolving the limit for a month

Same three-tier precedence shape as `getExpectedPaymentMonth`, for the
same reason — the row's own record beats the card's configured default:

```ts
export type LimitBasis = 'dated' | 'card' | 'assumed';
resolveLimitForStatementMonth(statementMonth, card, changes, entry?)
  : { limit: number | null; basis: LimitBasis }
```

1. `'dated'` — the row has a `"statementDate"` → the limit in force on it
2. `'card'` — `card.statementDay` known → the limit in force on that day,
   clamped to the month's length
3. `'assumed'` — otherwise the limit in force on the month's last day

### 5.2 Extending the earliest change backwards

`resolveLimitOn(changes, date)` returns the latest change with
`effectiveFrom <= date` — and when there is none, it returns the
**earliest** change rather than null.

This matters. A user who records only "raised to ₹4L on 1 Sep 2025" would
otherwise get no limit at all for Apr–Aug, blanking half the year. The
earliest recorded limit is treated as the limit since the beginning of
tracking, which is both the useful answer and the one the backfill in
§4.2 makes true for every pre-existing card.

The detail-page UI labels that earliest row **"Initial limit"** so the
semantics are visible rather than buried in a calc file.

### 5.3 Two combined readings, and only one of them ships

There are two defensible ways to combine cards, and they answer different
questions:

|                | Strict (`buildUtilisationMatrix`) | Bureau (`buildBureauUtilisation`)        |
| -------------- | --------------------------------- | ---------------------------------------- |
| Denominator    | only cards entered that month     | **every open card's limit**              |
| Unused card    | dropped from both sides           | limit counts, balance nil                |
| Unentered card | dropped from both sides           | **assumed nil, month flagged partial**   |
| Credit balance | signed, can go negative           | **floored at 0**                         |
| Scope          | per issuer and overall            | overall, and per issuer by the same rule |

**The bureau reading is what the app headlines**, because it is the one
that matches how CIBIL and its peers compute a credit utilisation ratio —
total outstanding across every revolving account over total limit across
those same accounts. Its defining property is that an unused card's limit
still counts, which is exactly why closing an unused card _raises_ your
utilisation.

The strict matrix survives only as the source for **per-card cells**. It
carries no combined figures at all: a second combining implementation
would be one that quietly drifts from the first.

### 5.3.1 Both readings are a ratio of sums

```
combined(month) = Σ billed  ÷  Σ limit
```

over **only the cards that have both an issued statement that month and a
resolvable limit.**

Two rules, both load-bearing:

- **Never average the ratios.** A ₹5,000 bill on a ₹50,000 limit and a
  ₹4,00,000 bill on a ₹5,00,000 limit average to 45%; the real combined
  figure is 73%. The mean of ratios weights a small card equally with a
  large one, which is wrong in exactly the situation that matters.
- **An unentered card is assumed nil and the month is flagged.** The
  assumption can only ever make utilisation look _better_ than reality,
  which is the dangerous direction for a risk metric — so the card
  states how many cards were assumed, and says the true figure can only
  be higher. A month where _every_ card was assumed produces no figure
  at all, rather than a confident 0% drawn purely from absence.

### 5.4 Bands

`getUtilisationStatus(ratio)` maps to the existing `ThresholdStatus`, so
`ThresholdGauge` is reused as-is:

| Ratio    | Status     |
| -------- | ---------- |
| < 30%    | `safe`     |
| 30 – 50% | `watch`    |
| 50 – 80% | `risk`     |
| ≥ 80%    | `breached` |

These are the conventional credit-health bands, not the SFT ratios in
`getThresholdStatus` (60 / 85 / 100) — which is why this is a separate
function rather than a reuse. Note `'breached'` here means "in the top
band", not "over the limit"; genuine over-limit (≥ 100%) is carried as a
separate `overLimit` boolean and rendered distinctly.

### 5.5 What produces no cell at all

A **per-card** cell is absent, not zero, when:

- the bill row is missing (not entered)
- the card has no resolvable limit, or a limit of 0

A `'no_statement'` row **does** produce a `0%` cell. That is narrower
than the bill series, where "the bank issued nothing" and "the bank
billed ₹0" are genuinely different events — for utilisation both mean
nothing was owed, so blanking it would hide a real reading and would
disagree with the bureau column, which counts it as a known nil.

A negative `"totalDue"` (credit balance) yields a negative per-card
ratio, reported as such and clamped to an empty bar. The bureau figure
floors it at zero instead, because that is what a bank reports.

## 6. Implementation inventory

| Layer   | File                                                                | What                                                                                               |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Schema  | `supabase/migrations/supabase_credit_card_limit_history_schema.sql` | `cc_card_limit_changes` + backfill                                                                 |
| Types   | `src/supabase/supabase.types.ts`                                    | `cc_card_limit_changes`                                                                            |
| Types   | `src/types/creditCard.types.ts`                                     | `ICardLimitChange`, `SaveLimitChangeInput`, `UtilisationCell`, `UtilisationMatrix`, `CardActivity` |
| Service | `src/utils/CreditCardService.ts`                                    | `getLimitChanges`, `getAllLimitChanges`, `saveLimitChange`, `deleteLimitChange`, `getCardById`     |
| Hooks   | `src/hooks/useCreditCards.ts`                                       | `creditCardKeys.limits()`, `useCardLimitChanges`, `useSaveLimitChange`, `useDeleteLimitChange`     |
| Calc    | `src/utils/creditCardUtilisation.calc.ts`                           | Everything in §5                                                                                   |
| Calc    | `src/utils/creditCardUtilisation.calc.test.ts`                      | Tests, including every case in §9                                                                  |
| UI      | `src/components/creditCards/CreditCardGrid.tsx`                     | Four optional seams — `formatValue`, `formatTotal`, `getIssuerTotal`, `footerLabel`                |
| UI      | `src/components/creditCards/BillingCycleSheet.tsx`                  | Extracted from `IssuerCardManager` so the card page can reuse it                                   |
| UI      | `src/components/creditCards/TrackerViewSelector.tsx`                | Fourth view                                                                                        |
| UI      | `src/components/creditCards/UtilisationCellValue.tsx`               | Read-only cell — percentage, tri-state, over-limit marker                                          |
| UI      | `src/components/creditCards/IssuerUtilisationCard.tsx`              | Per-issuer peak/average utilisation + coverage                                                     |
| UI      | `src/components/creditCards/CardLimitHistorySheet.tsx`              | Add / edit / delete limit changes                                                                  |
| UI      | `src/components/creditCards/CardSummaryRow.tsx`                     | One card on the list page                                                                          |
| Page    | `src/router/pages/CreditCardList.tsx`                               | `/credit-cards/cards`                                                                              |
| Page    | `src/router/pages/CreditCardDetails.tsx`                            | `/credit-cards/cards/:id`                                                                          |
| Routing | `src/router/HomeRouter.tsx`                                         | Two lazy routes                                                                                    |

`nav.config.ts` is **not** touched — `credit-cards` already matches with
`match: 'prefix'`, so both new routes light the sidebar item correctly.
The two pages set their own header title via `usePageTitle`, as
`/emi/:id` does.

### Extending the grid rather than forking it

The utilisation view is month × card with issuer grouping — the grid
already built. But it is not currency and its footer is not a sum, so
three optional props are added, each defaulting to today's exact
behaviour:

| Prop             | Default                                            | Utilisation passes             |
| ---------------- | -------------------------------------------------- | ------------------------------ |
| `formatValue`    | `v == null \|\| v === 0 ? '—' : formatCurrency(v)` | percentage, `—` only on `null` |
| `formatTotal`    | `formatCurrency(v ?? 0)`                           | percentage, `—` only on `null` |
| `getIssuerTotal` | sum of the issuer's `cardTotals`                   | the issuer's peak ratio        |
| `footerLabel`    | `'FY total'`                                       | `'Peak'`                       |

`formatValue` and `formatTotal` are separate because the shipped grid already
formatted them differently: a zero in a month row renders as an em dash, while
the same zero in the footer renders as a real `₹0`. Collapsing them into one
prop would have changed the payments view, which is exactly what this step must
not do.

The `?? 0` coercions at the grid's call sites become pass-through, so
"no data" and "zero" stop being the same value. For payments and bills
the rendered output is byte-identical; that is the regression to verify.

A separate `UtilisationGrid` was rejected: it would duplicate the sticky
column, the issuer `colSpan` arithmetic and the current-month
highlighting, all of which have already been debugged once.

### Closing the second writer on the limit column

`cc_cards."creditLimit"` now has one owner: `syncCurrentLimit`, which restates
it from the history after every write. Anything else writing it directly would
be silently overwritten on the next sync, and would skip the dated record.

So `creditLimit` was **removed from `UpdateCardInput`**. That turns the one
existing bypass — the billing-cycle sheet, which edited days and limit together
— into a compile error rather than a value that quietly stops sticking. The
sheet now hides the field and points at the card's limit history; `AddCardDialog`
keeps it, relabelled "Opening credit limit", and `createCard` seeds the first
history row from it.

### 5.6 Inspecting one month

`BureauMonth` carries `contributions` — every counted card with its floored
balance, its limit, its own ratio and its `BalanceBasis` (`issued`,
`no_statement`, `assumed_nil`).

This is what makes a month checkable rather than merely readable. A headline
ratio alone cannot answer "why is June high" or "which card was assumed", and
without the breakdown the partial-month warning names a count but not a card
to go and fix.

Sorted by balance descending, then entered-before-assumed, then name — so the
cards explaining the number are at the top and the cards still needing data
cluster at the bottom. The breakdown sums back to the headline exactly, on both
the numerator and the denominator; a test asserts it.

## 7. UI notes

**The list page** is the cards themselves, grouped by issuer: name,
last 4, active state, current limit, cycle days, and this FY's peak
utilisation as a thin gauge. An issuer header carries its combined limit.

**The detail page** is the card: identity and cycle at the top, limit
history as an editable timeline, then a twelve-month table of statement,
payment and utilisation for the selected FY, and the delete affordance.

The FY selector is shared with the tracker and carried in `?fy=`, so
navigating tracker → card → back keeps the year.

**Bills and payments still sit in separate columns** on the detail page,
never differenced, with the same not-comparable caption. Putting them on
one page does not make them comparable, and this is the page where that
temptation is strongest.

**The utilisation view has no editors.** Every cell is derived. Clicking
one navigates to that card's detail page rather than opening a popover —
there is nothing to edit in place.

**Any month of the year can be inspected.** The overall card carries a month
selector, carried in the URL as `?month=`, and its twelve-bar trend doubles as
the picker — jumping to the spike is the thing people actually do with a trend.
It defaults to the most recent month holding a figure, which is what a bureau
would be scoring. A picked month is honoured only while it belongs to the year
on screen, and changing the financial year drops it, so the URL can never name
a month that is not rendered.

## 8. What this deliberately does not do

- **No utilisation on payments.** Paying a bill reduces outstanding, but
  the app has no dated running balance, only monthly buckets. Deriving
  intra-month utilisation from payments would be fabrication.
- **No "available credit" figure.** That is limit minus _current_
  outstanding, which is a live number the app does not have — the newest
  statement is up to a month old.
- **No claim to be the reported figure.** The bureau reading is an
  estimate of what a bureau would see. The app does not know each bank's
  reporting date, and it only knows what has been typed in. Same standing
  as the SFT tracker: a self-reported early-warning view, never an
  official record.
- **No closure date on a card.** A deactivated card keeps counting while
  it holds data in the year being viewed, and drops out of years it does
  not. Dropping it the moment it is deactivated would restate every past
  month upward — the same silent-history problem the dated limit table
  exists to prevent. A real `closedAt` column is the correct fix if this
  ever matters enough.
- **No alerting or advice.** The bands colour a bar. Emitrax does not
  tell anyone what to do about their utilisation; that is squarely the
  recommendation engine the project overview puts out of scope.

## 9. Edge-case register

| #   | Case                                                           | Resolution                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Limit raised mid-year.                                         | `cc_card_limit_changes`; the month resolves the limit in force. §5.1                                                                                                                                                                                                                                                                                    |
| 2   | Only the _latest_ limit ever recorded; earlier months unknown. | Earliest change extends backwards, labelled "Initial limit". §5.2                                                                                                                                                                                                                                                                                       |
| 3   | Card has no limit at all.                                      | No cell. Excluded from both sides of every combined figure, and counted in the coverage line.                                                                                                                                                                                                                                                           |
| 4   | Some cards have limits, some do not.                           | Combined covers only those that do; coverage line states how many. §5.3                                                                                                                                                                                                                                                                                 |
| 5   | A card had no statement that month.                            | Excluded from the denominator, not treated as ₹0. §5.3                                                                                                                                                                                                                                                                                                  |
| 6   | `'no_statement'` vs `₹0` vs not entered.                       | Three distinct renderings, as in the bill tracker. §5.5                                                                                                                                                                                                                                                                                                 |
| 7   | Credit-balance statement (negative `"totalDue"`).              | Negative ratio reported; gauge clamps to empty.                                                                                                                                                                                                                                                                                                         |
| 8   | Utilisation over 100% (over-limit spend, fees pushing past).   | Allowed and rendered distinctly via `overLimit`; the bar clamps at full. Never silently capped.                                                                                                                                                                                                                                                         |
| 9   | Limit of 0 recorded.                                           | Rejected by the `CHECK > 0`; the calc also guards, so a bad row can never divide by zero.                                                                                                                                                                                                                                                               |
| 10  | Two limit changes on the same date.                            | `UNIQUE ("cardId","effectiveFrom")` — the second is an upsert of the first.                                                                                                                                                                                                                                                                             |
| 11  | Limit change dated in the future.                              | Allowed, and badged "Scheduled". It applies from its date, so it affects no past month, and the current-limit cache resolves to today rather than to the newest row. The one exception is a card whose _only_ change is future-dated, where §5.2's backwards extension makes it current — harmless, and consistent with how every other month resolves. |
| 13  | A month with nothing entered for any card.                     | No bureau figure. A fully-assumed month would read a confident 0% drawn entirely from absence.                                                                                                                                                                                                                                                          |
| 14  | A future month in the current financial year.                  | Skipped — nothing to report yet, and it would otherwise read as a fully-assumed 0%.                                                                                                                                                                                                                                                                     |
| 15  | Card deactivated mid-year.                                     | Keeps counting while it holds data that year; gone from years it does not. See §8.                                                                                                                                                                                                                                                                      |
| 12  | Card deleted.                                                  | `ON DELETE CASCADE` takes the history with it, as it does bills and payments.                                                                                                                                                                                                                                                                           |

## 10. Porting to Casheq

`creditCardUtilisation.calc.ts` has no React, Redux or Supabase import
and moves unchanged. Two notes for whoever ports it:

- It consumes the **statement month** key, so the off-by-one in
  `credit-card-bill-tracker-plan.md` §9 applies here verbatim. Feed it
  `statementMonthForCycle(...)`, never `cycleMonth`.
- Casheq derives statements from transactions, so it can compute a
  genuine dated running balance and therefore a true point-in-time
  utilisation. The seam is `resolveLimitOn(changes, date)` — Casheq keeps
  that and replaces only the numerator. **Do not port §5.1's three-tier
  month resolution**; it exists solely because Emitrax has no daily
  balance to anchor to.

## 11. Rollout

| #   | Step                                                             |
| --- | ---------------------------------------------------------------- |
| 0   | This plan                                                        |
| 1   | Run the migration, verify the backfill                           |
| 2   | Types + `supabase.types.ts` + service + hooks                    |
| 3   | Calc layer + tests                                               |
| 4   | Grid seams — **verify payments and bills render identically**    |
| 5   | Utilisation view, list page, detail page, routes                 |
| 6   | Progress tracker + architecture/schema/design-system doc updates |

Step 4 carries the regression risk, exactly as step 5 did in the bill
tracker plan, and for the same reason: it edits shared grid code that two
shipped views depend on.

## 12. Verification

```
yarn lint && yarn build && yarn test
```

Domain assertions that matter most:

- A limit raised in September leaves April's utilisation unchanged
- A card whose only recorded limit is dated September still shows a
  limit in April (§5.2)
- A card with no limit blanks its utilisation column and is named in the
  coverage line, and the combined figure is unchanged by its presence
- Combined utilisation for two very unequal cards is the ratio of sums,
  not the mean of the ratios (§5.3 worked example: 73%, not 45%)
- A `'no_statement'` month shows no utilisation, distinct from `0%`
- A negative statement yields a negative percentage and an empty bar
- Payments and Bills views are visually unchanged after the grid seams
- From a second account, `cc_card_limit_changes` returns zero rows and an
  insert naming another user's card is rejected
