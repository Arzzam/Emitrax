# UI Design System — Emitrax

## 1. Foundation

**Tailwind CSS v4** via `@tailwindcss/vite`. CSS-first — there is no
`tailwind.config.js`. Every token is a CSS variable in `src/index.css`,
in `oklch`, defined twice: `:root` and `.dark`.

**shadcn/ui, `new-york` style, over Radix** (`components.json`:
baseColor `gray`, cssVariables true, icon library `lucide`). Some
primitives sit on `@base-ui/react` instead — check the file before
assuming an API. Aliases: `@/components`, `@/components/ui`,
`@/lib/utils`, `@/hooks`.

Dark mode is a `.dark` class on the root, driven by
`src/context/ThemeProvider/themeProvider.tsx` (`light` / `dark` /
`system`, persisted to localStorage).

## 2. Tokens

Semantic tokens only — **never a raw hex or an arbitrary colour in a
component**. The set follows shadcn: `background`, `foreground`, `card`,
`popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`,
`border`, `input`, `ring`, plus the `--sidebar-*` family and
`--chart-1` … `--chart-5`.

`--radius` is `0.5rem`.

**`chart-1` … `chart-5` are the issuer palette.** `cc_issuers.color` is
constrained at the database level to exactly those five token names, so
an issuer colour can never be an arbitrary value that breaks in one
theme.

## 3. Money and numbers

Two rules, both correctness rather than taste:

1. **Every currency value goes through
   `useCurrencyPreferences().formatCurrencyAmount`.** Never
   `toFixed()`, never a hand-written `₹`. The user's locale, currency
   and number-format preference are account settings, and anything
   bypassing the formatter silently ignores them.
2. **Every number carries `tabular-nums`.** In a grid of amounts,
   proportional digits make columns jitter as values change.

Amounts in a table are `text-[13px]`; a headline figure is
`text-[28px] font-semibold`.

## 4. Components

### Available primitives (`src/components/ui/`)

`alert` · `alert-dialog` · `avatar` · `badge` · `breadcrumb` · `button` ·
`calendar` · `card` · `combobox` · `command` · `dialog` ·
`dropdown-menu` · `field` · `input` · `input-group` · `label` ·
`popover` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` ·
`switch` · `table` · `textarea` · `toggle` · `toggle-group` · `tooltip`

`badge` carries `success` and `warning` variants beyond the shadcn
defaults.

### There is no `Progress` primitive

`src/components/creditCards/ThresholdGauge.tsx` is the house recipe for
progress toward a limit: a rounded track with a filled bar, `role="progressbar"`
plus the three `aria-value*` attributes, width as the only inline style
(the sanctioned "truly dynamic value" exception). Reuse it rather than
adding a primitive.

### Patterns

| Need                     | Pattern                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Create / edit a record   | Side **`Sheet`** (Add EMI, Add card, Advanced filter) — not a centered dialog                        |
| Destructive confirmation | `ConfirmationModal` (`src/components/common/ConfirmationModal.tsx`)                                  |
| Toast                    | `successToast` / `errorToast` / `infoToast` from `src/utils/toast.utils.ts` (sonner, top-center, 5s) |
| Page body                | `MainContainer` from `src/components/common/Container.tsx`                                           |
| Wide data                | `overflow-x-auto` wrapper + `sticky left-0` first column                                             |
| Empty state              | Centered icon in a tinted circle, heading, one-line explanation, primary action                      |

### Grid tables

The credit-card trackers use months as **rows** and cards as **columns**,
grouped under issuer headers. This is a deliberate transpose: the month
count is fixed at 12, while cards are few and variable, so cards make
better columns. First column `sticky left-0`; current month highlighted;
future months muted; a totals row in the footer.

## 5. Icons

`lucide-react`. Sizes: `size-3.5` inline, `size-4` in a button,
`size-5` in nav, `size-8` in an empty state.

Domain icons in use: `Receipt` (Emitrax brand, EMI), `CreditCard`
(credit cards), `LayoutDashboard` (dashboard), `Landmark` (issuer/bank),
`Calculator` (amortization), `LineChart` (scenarios), `Share2` (share),
`Split` (split), `UserCog` (settings).

## 6. Feedback and state

Every list or grid view needs three explicit states:

- **Loading** — skeletons shaped like the content they replace, not a
  spinner
- **Empty** — icon, message, primary action
- **Error** — plain language, never a raw Postgres string, with a Retry

Grid cell edits are the deliberate exception to the toast rule: they save
optimistically with **no success toast** (one per cell is unusable during
bulk entry) and show a transient inline tick instead. Errors still toast,
after rolling the optimistic value back.
