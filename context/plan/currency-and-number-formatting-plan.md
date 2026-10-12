# Currency & Number Formatting — Module Design Plan

**Project:** Emitrax
**Scope:** A wider currency list, number formatting driven by currency + locale, and the input/export paths that bypass the formatter today
**Status:** Phases 1-3 shipped; phases 4-5 proposed, phase 6 deferred
**Target:** `src/utils/numberFormat.ts`, account settings (`/account`), amount inputs, Excel/PDF export

---

## 1. Goal

Today the app offers 4 currencies and 3 locales, and the two are independent
dropdowns. Formatting already goes through `Intl.NumberFormat`
(`src/utils/numberFormat.ts`), which is the right foundation, but:

- the option list is hard-coded and tiny,
- a few rules inside the formatter are wrong for anything other than INR/USD,
- amount **inputs**, form **labels** and the **Excel** export bypass the
  formatter entirely.

This plan widens the list and makes every number on screen, in inputs and in
exports follow one rule: **the currency decides the symbol and the decimal
places, and the locale decides grouping, separators and where the symbol goes.**

Non-goal (unchanged from the project overview): multi-currency accounting.
There is still exactly one display currency per account, and changing it
**relabels** stored amounts. It never converts them.

## 2. What is broken today (found while planning)

Each of these was checked with Node's `Intl` before being written down.

| #   | Problem                                                                         | Where                                                                                          | Effect                                                                                                                                          |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `exact` forces `minimumFractionDigits: 2`                                       | `numberFormat.ts:31`                                                                           | JPY / KRW / VND / IDR render `¥1,234.00`. These currencies have no minor unit                                                                   |
| B2  | `compact_long` is identical to `compact_short`                                  | `numberFormat.ts:27`                                                                           | `Intl` ignores `compactDisplay: 'long'` with `style: 'currency'`. Both modes print `₹12.35L`. The settings label promising "1.25 lakh" is false |
| B3  | Hand-written `₹` in labels and validation                                       | `EMIForm.tsx:36,265,417,421,515`, `BillCellEditor.tsx:274`                                     | A USD user sees "Principal Amount (₹)" and "must be at least ₹100"                                                                              |
| B4  | Excel symbol map covers only 4 currencies, and the decimals are fixed at `0.00` | `export/excel/templates/shared.ts:6`                                                           | Any new currency shows its ISO code in Excel; JPY shows `.00`; Indian lakh grouping is lost                                                     |
| B5  | Amount inputs parse with `Number(raw)`                                          | `BillCellEditor`, `PaymentCellEditor`, `CardLimitHistorySheet`, `EMIForm`, `ScenarioInputForm` | A pasted `1,25,000` is rejected. A `de-DE` user typing `1.234,56` gets **1.234** (silently wrong, not rejected)                                 |
| B6  | `formatAmount` in `src/utils/utils.ts` is dead code                             | `utils.ts:3`                                                                                   | No callers. It is a trap for the next person; delete it                                                                                         |
| B7  | `new Intl.NumberFormat(...)` is constructed on every call                       | `numberFormat.ts:44`                                                                           | The credit-card grid formats hundreds of cells per render. Constructing a formatter is the expensive part                                       |
| B8  | Percentages use `toFixed(1)%`                                                   | ~15 call sites                                                                                 | `de-DE` should read `12,5 %`. Minor, and fixed last                                                                                             |

## 3. Proposed decisions

1. **A curated currency registry, not all 160+ ISO codes.**
   `Intl.supportedValuesOf('currency')` returns about 160. A dropdown that long
   is worse UX, and every entry is a PDF-glyph and Excel-format liability.
   Ship the curated list in §4 and make adding one a one-line change.
2. **Decimal places come from `Intl`, never a table.**
   `new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits`
   gives 0 for JPY and 2 for INR. The registry does not store it.
3. **Currency and locale stay as two stored preferences, but they are linked
   in the UI.** Picking a currency auto-selects its home locale
   (`AED → en-AE`, `EUR → de-DE`), unless the user has changed the locale by
   hand. This covers the NRI case: an INR account with Western grouping, or
   AED with Indian grouping.
4. **The locale picker becomes a "Number style" picker with live samples.**
   Users do not think in BCP-47 tags; they think in `12,34,567.89` versus
   `1.234.567,89`. Each option renders its own sample through `Intl`. The
   stored value is still a locale (the `locale` column is reused).
5. **`compact_long` is built by hand, not by `Intl` currency style** (fixes
   B2). Format the number with `{ notation: 'compact', compactDisplay: 'long' }`
   in decimal style (`12.35 lakh`, `1.23 million`, `1,23 Millionen`). Then
   attach the symbol in the locale's position, taken from `formatToParts` of a
   currency-style format.
6. **Cache formatters** in a `Map` keyed by `locale|currency|mode` (fixes B7).
7. **No database migration is needed.** `currency` already has
   `CHECK (currency ~ '^[A-Z]{3}$')`, `locale` is free text, and
   `number_format` keeps its three values. App-side validation (zod enums
   built from the registry) remains the gate.
8. **Stored precision stays at 2 decimals for now.** The 3-decimal Gulf
   currencies (KWD, BHD, OMR) are deferred to Phase 6. They are forward-only:
   widening the money columns to `numeric(14,3)` keeps every existing value
   (`100.50` becomes `100.500`), so only new entries can use the third
   decimal.
9. **Defaults are detected once from the browser, then saved.** No
   preferences row is created at sign-up, so "no row" is the first-run
   signal (`AccountDetails.hasSavedPreferences`).
    - **Region comes from the time zone first**, then the first browser
      language with a known region. Many Indian users run an `en-US` or
      `en-GB` browser, but their clock says `Asia/Kolkata`; going by language
      alone would hand them USD or GBP.
    - **Locale** is the user's own browser language if it belongs to that
      region and the picker offers it (`fr-FR` in Paris), otherwise the
      currency's default. Number format is always `exact`. Anything unmapped
      falls back to `en-IN` / INR.
    - **Existing users are pinned, not detected.** A user with no row who
      already owns EMIs or cards has been reading INR all along, so their row
      is written with INR / `en-IN` / `exact`. Only users with no data get the
      detected values.
    - **Written once, insert-only** (`ON CONFLICT DO NOTHING`), so another
      tab or a save from Account Settings is never overwritten. One account
      never shows different currencies on different devices.
10. **Dates are not locale-driven.** `date-fns` patterns stay fixed.
11. **The tax label is region-aware; the data is not.** Each registry entry
    carries a `taxLabel` (INR/AUD/SGD/NZD/CAD → "GST", EUR/GBP/AED/ZAR →
    "VAT", USD → "Sales tax"). The GST-on-interest field is an Indian
    concept, so for non-INR currencies it moves under an "Additional
    charges" section rather than being renamed as if it always applies.
    Storage stays in the existing `gst` column; there is no migration.

## 4. Currency list (32)

Grouped as they would appear in the picker. The first group is pinned.

| Group              | Currencies                                       | Default locale → sample                                                                        |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Popular**        | INR, USD, EUR, GBP, AED                          | `en-IN` → ₹12,34,567.89                                                                        |
| South Asia         | INR, PKR, BDT, LKR, NPR                          | `en-IN` for INR, BDT and NPR (all count in lakh/crore); `en-PK` → Rs 1,234,568 (0 dp), `en-LK` |
| Gulf / Middle East | AED, SAR, QAR                                    | `en-AE` → AED 1,234,567.89                                                                     |
| Americas           | USD, CAD, BRL, MXN                               | `en-US`, `en-CA`, `pt-BR` → R$ 1.234.567,89, `es-MX`                                           |
| Europe             | EUR, GBP, CHF, SEK, NOK, DKK, PLN                | `de-DE` → 1.234.567,89 €, `en-GB`, `de-CH` → CHF 1'234'567.89                                  |
| Asia-Pacific       | SGD, MYR, IDR, THB, PHP, JPY, KRW, HKD, AUD, NZD | `en-SG`, `id-ID` → Rp 1.234.568 (0 dp), `en-TH`, `en-JP` → ¥1,234,568, `en-KR`, `en-AU`        |
| Africa             | ZAR, NGN, KES                                    | `en-ZA`, `en-NG`, `en-KE`                                                                      |

**Locales offered as number styles** (each one previewed live):
`en-IN` (Indian 12,34,567.89), `en-US` (1,234,567.89), `en-GB`,
`de-DE` (1.234.567,89), `fr-FR` (1 234 567,89), `de-CH` (1'234'567.89),
`es-ES`, `pt-BR`, `en-AE`, plus every currency's default locale
(`NUMBER_STYLE_LOCALES`), so auto-linking never picks a locale the picker
can't show. Phase 2 decides how to present duplicates that render the same.

**Deliberately excluded from v1:** Arabic-script locales such as `ar-AE`,
CJK locales such as `ja-JP`, and `th-TH`, whose compact-long output is in
Thai script (THB uses `en-TH` instead). They output non-Latin digits or symbols
(`د.إ`, `￥`, `万`), and the PDF font (NotoSans, `pdfFonts.ts`) has no
glyphs for them. That would silently break PDF export. AED and JPY themselves
are still offered, paired with `en-*` locales.

## 5. Architecture

```
src/utils/                 (flat, matching the existing utils layout)
  currencyRegistry.ts      [P1] CURRENCIES: { code, label, group, isPopular, defaultLocale, regions, taxLabel }[]
                           [P1] NUMBER_STYLE_LOCALES, getCurrencyDefinition(code)
                           [P2] detectDefaultPreferences({ languages, timeZone }), getLinkedLocale,
                           [P2] CURRENCY_OPTION_GROUPS, getNumberStyleGroups, matchesCurrencyQuery
  numberFormat.ts          [P1] formatCurrencyAmount (cached formatters),
                           [P1] getCurrencyMeta(code, locale) -> { symbol, fractionDigits, symbolPosition }
                           [P5] formatPercent
  numberFormat.test.ts     [P1] formatter + registry invariants (Latin-only output per currency)
  parseAmount.ts           [P3] parseLocaleAmount(raw, { locale, fractionDigits }) -> number | null | undefined
                           [P3] formatAmountForInput(value, { locale, fractionDigits }) - grouped, no symbol
src/components/common/
  AmountInput.tsx          [P3] form money field: symbol adornment, NaN on invalid text

Parsing rule: when the separators are ambiguous the parser REJECTS rather
than guesses. Valid grouping (`1,234`, `12,34,567`, `1.234` in de-DE) is
grouping; a lone foreign separator that is not valid grouping is a decimal
(`1234.5` in de-DE, `12,5` in en-US); anything else (`12,345.67` in de-DE)
is refused. Grid cells keep commit-on-blur and get no symbol adornment -
the column already says what it holds.
  excelNumFmt.ts           [P4] buildExcelCurrencyNumFmt(currency, locale)
```

- `useCurrencyPreferences()` gains `currencySymbol`, `fractionDigits`,
  `parseAmount` and `formatPercent`. Components read it from the hook, never
  from the registry directly.
- `validations/account.forms.ts` builds `CURRENCY_OPTIONS` / `LOCALE_OPTIONS`
  from the registry instead of declaring literals.
- **`parseLocaleAmount`** strips the currency symbol and whitespace, removes
  the locale's group separator, and normalises its decimal separator to `.`
  (both read from `formatToParts`). It then rounds to the currency's fraction
  digits. It keeps the existing three-way contract: a number, `null` for
  empty, and `undefined` for invalid. The signed/unsigned distinction stays
  with the callers.
- **Excel:** for `en-IN`, use the Indian custom format
  `[>=10000000]"₹"##\,##\,##\,##0.00;[>=100000]"₹"##\,##\,##0.00;"₹"##,##0.00`.
  Otherwise use `"<symbol>"#,##0` plus `.00` only when `fractionDigits > 0`.
  Put the symbol before or after the number to match the locale. Excel
  applies the viewer's own separators, so the pattern always uses `,` and `.`.

## 6. UX improvements

Ranked by value for effort.

1. **Live preview in Settings.** Show a line under the three pickers, for
   example _"Amounts will look like ₹12,34,567.89 · compact ₹12.35L"_. It is
   cheap to build, and it explains what the three pickers do without help text.
2. **Searchable currency combobox** (a shadcn `Command` inside a `Popover`, so
   no new dependency). It matches on code, name and symbol, with Popular pinned.
   No emoji flags: they render as letter pairs on Windows.
3. **Relabel warning.** If the user has any EMI or card data and changes the
   currency, show a confirm dialog: _"Existing amounts won't be converted, only
   relabelled. ₹50,000 will show as $50,000."_ This is the most likely support
   question the change will create.
4. **Currency adornment in amount inputs.** Show the symbol as a prefix or
   suffix (matching the locale) inside the input, replacing the `(₹)` in labels.
   This fixes B3 as a side effect.
5. **Format on blur, raw while editing.** The input shows `1,25,000.00` at rest
   and `125000` while focused. It also accepts pasted values like `₹1,25,000`.
6. **Shorthand entry** (`1.5L`, `2cr`, `50k`) is **deferred**. It would live
   entirely in `parseLocaleAmount`, so adding it later needs no rework.
7. **Exact value on hover for compact figures.** Compact mode trades precision
   for space, so add a `title` attribute with the exact amount to compact
   renders. It is cheap and covers the tables and stat cards.
8. **First-run defaults** from the browser, saved once (decision 9). Today
   everyone starts on INR.
9. **Localised percentages** via `formatPercent` (B8).

## 7. Phases

Each phase ships on its own and passes `yarn lint && yarn build && yarn test`.

| Phase                              | Contents                                                                                                                                                                                              | Fixes          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1. Formatter core ✅               | Registry, cached formatter, Intl-derived decimals, hand-built `compact_long`, `getCurrencyMeta`, tests across the §4 matrix, delete `formatAmount`                                                    | B1, B2, B6, B7 |
| 2. Settings UI + defaults ✅       | Searchable currency combobox, number-style picker with samples, currency→locale auto-link, live preview, relabel warning, corrected option labels, browser-detected defaults saved on first bootstrap | —              |
| 3. Inputs ✅                       | `parseLocaleAmount`, swap it into the five editors, input adornment, format-on-blur, remove hard-coded `₹`                                                                                            | B3, B5         |
| 4. Exports                         | `buildExcelCurrencyNumFmt`, sample PDF export for every §4 currency to verify glyphs, JSON export unchanged (already carries the code)                                                                | B4             |
| 5. Regional wording + polish       | `taxLabel` in the registry, the GST field under "Additional charges" for non-INR, region-aware labels in the EMI form, details and exports; `formatPercent` across ~15 sites; compact hover titles    | B8             |
| 6. 3-decimal currencies (deferred) | Hand-run migration widening money columns to `numeric(14,3)` (forward-only, existing values unchanged), currency-aware `roundMoney` in the calc modules, then add KWD / BHD / OMR to the registry     | —              |

## 8. Resolved

- 3-decimal currencies: deferred to Phase 6, forward-only.
- Dates: not locale-driven.
- Defaults: detected from the browser once, saved, then user-owned.
- Shorthand input: deferred.
- Region-aware tax labels: in scope (Phase 5).
- India-specific credit-card copy: stays as is; the credit-card module is India-only.
- Per-EMI currency: a later iteration; see §9.

## 9. Future: per-EMI currency (not in this plan)

Planned for a later iteration. An EMI will store its own currency when it is
created, and that currency takes precedence over the account currency for
that EMI. Constraints this plan honours so the later work needs no rework:

- `formatCurrencyAmount` already takes the currency as an argument, so an
  EMI-level override is `{ ...prefs, currency: emi.currency ?? prefs.currency }`.
  `useCurrencyPreferences` should grow an optional override, not a second
  formatter.
- **Totals across EMIs cannot be summed across currencies.** Dashboard stats,
  combined outstanding and exports that aggregate EMIs need a rule (group by
  currency, or convert) before mixed-currency EMIs ship.
- Credit cards stay account-currency and India-only.

## 10. Open questions

None outstanding. The credit-card module and its copy (bureau utilisation,
CIBIL-style wording) stay India-specific by design.
