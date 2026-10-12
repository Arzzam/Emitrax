# Per-EMI Currency — Module Design Plan

**Project:** Emitrax
**Scope:** Each EMI carries its own currency; the dashboard groups stats by currency
**Status:** Proposed — migration written, not yet run
**Builds on:** `context/plan/currency-and-number-formatting-plan.md` (registry, formatter, parser, exports)

---

## 1. Goal

Until now every amount was read in the account currency, so a USD education
loan next to an INR home loan could not be represented, and changing the
account currency relabelled every loan at once. After this change, each EMI is
denominated in its own currency, and nothing ever adds amounts across
currencies.

Non-goal (unchanged): conversion. No exchange rates, anywhere.

## 2. Confirmed decisions

1. **Existing EMIs are stamped with their owner's current account currency**
   (INR if the owner never saved preferences). That is exactly what they show
   today, so nothing on screen moves. From then on every EMI's currency is
   fixed.
2. **The account currency becomes a default, not a lens.** It sets the
   currency of new EMIs and which dashboard tab opens first. Changing it no
   longer relabels existing loans, so the Account Settings warning changes to:
   _"New EMIs will default to USD. Existing EMIs keep their own currency."_
3. **An EMI's currency is editable, relabel-only.** Changing it on the EMI
   form relabels that loan's amounts (never converts them), behind the same
   confirmation pattern as the account setting.
4. **The dashboard groups by currency, one currency at a time.** When EMIs span
   several currencies, a switcher above the stats shows each currency with
   its EMI count (`₹ INR · 5 | AED · 2 | $ USD · 2`). The selected tab scopes
   every stat card, including the counts. With a single currency there is no
   switcher and the dashboard looks as it does today.
5. **Number style stays account-wide.** The EMI's currency picks the symbol,
   decimals and tax label; the user's number style still decides grouping
   and separators. A USD loan for an Indian user reads `$12,34,567.89`.

## 3. Schema — `supabase_emis_currency.sql` (hand-run first)

- `emis.currency text NOT NULL`, `CHECK (currency ~ '^[A-Z]{3}$')`.
- Backfill from `user_account_preferences.currency`, else `'INR'`; only rows
  still `NULL`, so a re-run never overwrites a chosen currency.
- `BEFORE INSERT` trigger fills a missing currency from the owner's account
  currency, so an open tab on the old build still writes the right value.
- Splits, shares and scenarios need no column: they belong to one EMI and
  inherit its currency.
- Mirror into `src/supabase/supabase.types.ts` (`emis` Row / Insert / Update)
  and `IEmi.currency`.

## 4. App changes

### 4.1 Formatting follows the EMI

`useCurrencyPreferences(currencyOverride?)`: same hook, with an optional
currency. Every EMI-scoped surface passes `emi.currency`, which covers the
symbol, decimals, input parsing and tax labels:

| Surface            | File                                                              |
| ------------------ | ----------------------------------------------------------------- |
| EMI card           | `components/emi/EMICard.tsx`                                      |
| Details, schedule  | `router/pages/EMIDetails.tsx`, `AmortizationSchedule.tsx`         |
| Repayment card     | `components/emi/RepaymentProgressCard.tsx`                        |
| Splits             | `router/pages/SplitEMI.tsx`, `components/emi/SplitEmiEditRow.tsx` |
| Scenarios          | `router/pages/EMIScenarios.tsx` + `components/emi/scenario/*`     |
| PDF / Excel export | `useExport.ts` passes `{ ...prefs, currency: emi.currency }`      |

### 4.2 Rounding precision follows the EMI

Phase 6 made calc precision one account-wide setting (`utils/money.ts`). A KWD
loan in an INR account must still calculate at 3 decimals, so precision
becomes per-calculation:
`withMoneyPrecision(currency, () => calculateEMI(...))` sets it for the call
and restores it afterwards (all calc code is synchronous). The places that
call it:

- `calculateEMI`, called from the EMI form, `useAutoRecalculateEmis` and the
  EMI service read path (`normalizeEmiFinancials`)
- scenario and repayment calcs
- the JSON export

The store-synced global stays as the fallback for anything not tied to one EMI.

### 4.3 EMI form

- Currency picker: reuses `CurrencyCombobox`, defaults to the account
  currency.
- Editing an existing EMI's currency asks for confirmation (relabel, not
  convert).
- The amount inputs, placeholders, tax labels and tax-field visibility follow
  the selected currency.

### 4.4 Dashboard — `useStats` + `StatsSection`

- Group the filtered EMIs by `currency`, then build the existing stats object
  once per group.
- `StatsSection` gets a currency switcher (segmented control, symbol + code +
  count) when there is more than one group.
    - It defaults to the account currency, or to the largest group if the
      account currency has no EMIs.
    - The selection is per-viewer UI state in Redux and is not persisted.
- The tag filter and the active/archived filter still apply inside the
  selected group.

### 4.5 EMI list and filters

- The list keeps showing every EMI; each card already shows its own currency
  (4.1).
- The advanced filter's principal / total-loan range now also needs a
  currency, since a bound means nothing across currencies. It only applies
  when a currency is chosen, and defaults to the dashboard's selected tab.

### 4.6 Exports

- **JSON:** each EMI node carries `currency`. Account totals become
  `totalsByCurrency: { INR: {...}, USD: {...} }`, and the glossary says amounts
  are in the EMI's own currency.
- **PDF / Excel** (single EMI): the prefs passed in carry the EMI's currency
  (4.1). Nothing else changes.

### 4.7 Account Settings

- The currency-change warning text changes (decision 2).
- The first-run defaults logic is unchanged.

## 5. Phases

| Phase                 | Contents                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A. Schema             | Run `supabase_emis_currency.sql`, verify, mirror types                                                              |
| B. Plumbing           | `IEmi.currency` + service mapping, `useCurrencyPreferences(currencyOverride?)`, `withMoneyPrecision` + calc callers |
| C. EMI surfaces       | Card, details, schedule, repayment, splits, scenarios, PDF / Excel use the EMI's currency                           |
| D. EMI form           | Currency picker, relabel confirmation                                                                               |
| E. Dashboard          | Group-by-currency stats + switcher; filter range currency                                                           |
| F. Exports + settings | JSON `totalsByCurrency`; Account Settings warning text                                                              |

## 6. Risks

- **Silent cross-currency sums.** Any `reduce` over EMIs that isn't grouped
  first is now a bug. The known sites are `useStats`, the JSON export totals
  and the advanced filter ranges; a final `grep` for `reduce(` over EMI arrays
  closes it.
- **Shared EMIs.** A viewer sees the owner's EMI in its own currency, which is
  correct and is what this fixes. Their dashboard groups it with their own
  EMIs of the same currency.
