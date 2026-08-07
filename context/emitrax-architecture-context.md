# Architecture Context — Emitrax

## 1. Shape of the system

A **Vite 6 single-page application**. No server, no SSR, no API layer of
our own — the browser talks to Supabase directly, and RLS is the only
thing standing between users. Deployed as static files to Vercel with an
SPA rewrite (`vercel.json`).

```
React 19 SPA  ──►  Supabase (Postgres + Auth)
     │
     ├─ TanStack Query   — server state
     └─ Rematch/Redux    — session + preferences (persisted to localStorage)
```

Auth is **Google OAuth only**. The hash-fragment token is exchanged at
`/auth/callback` (`src/router/pages/OAuthRoute.tsx`).

## 2. Routing and the app shell

`src/router/HomeRouter.tsx` — `BrowserRouter`, every page `React.lazy`.

```
/auth/callback              (outside the shell)
/                           Dashboard
/account                    Account preferences
/credit-cards               Credit card trackers
/emi/:id                    EMI details
/emi/:id/amortization
/emi/:id/share
/emi/:id/split
/emi/:id/scenarios
*                           Not found
```

Everything except `/auth/callback` renders inside `src/layout/Layout.tsx`:

```
PageTitleProvider
└─ CommandPaletteProvider
   └─ SidebarProvider
      ├─ AppSidebar          nav config + EMI picker + user footer
      └─ SidebarInset
         ├─ AppHeader        title, search (⌘K), theme toggle
         └─ div.overflow-y-auto   ← the app's ONLY scroll container
```

**Pages must not nest their own scroll container.** The shell owns
scrolling; a page that adds `overflow-y-auto` or a `calc(100vh-…)`
height produces a double scrollbar.

Nav items live in `src/components/sidebar/nav.config.ts` and drive three
things at once: the sidebar, the header title, and the command palette's
"Go to" group. Adding an item there adds it everywhere.

## 3. State: the split rule

Two state systems, with a hard boundary.

| Owns                                         | System                        | Where               |
| -------------------------------------------- | ----------------------------- | ------------------- |
| Server data                                  | TanStack Query                | `src/hooks/use*.ts` |
| Session (user id), preferences, filter state | Rematch/Redux + redux-persist | `src/store/`        |

Redux is persisted to localStorage with the whitelist in
`src/store/store.ts`: `userModel`, `lastUpdateAt`, `filterModel`,
`advancedFilterModel`. Preferences also round-trip to Supabase
(`user_account_preferences`) via `useAccountDataBootstrap`.

**Nothing fetched from Supabase belongs in Redux.** The one deliberate
overlap is `userModel.id`, which services read synchronously to avoid an
async `auth.getUser()` on every call.

`src/context/` holds React providers (theme, page title, command
palette, store) — **not to be confused with the root `context/` folder**,
which is this documentation.

## 4. Data access — three layers

Strictly ordered. A component never talks to Supabase.

### Layer 1 — Service class, `src/utils/<Feature>Service.ts`

`export class XService` with only `static async` methods.

- Raw `supabase.from(...)` calls live here and nowhere else
- Errors are **thrown**, not returned — TanStack Query's error state
  handles them
- Rows are mapped to domain types by module-private
  `map*Row(row: Record<string, unknown>)` functions using explicit
  `String()` / `Number()` / `Boolean()` coercion
- The user id comes from `requireUserId()`: Redux `userModel.id` first,
  falling back to `supabase.auth.getUser()`

Existing: `AccountService`, `EMIService`, `EmiShareService`,
`EmiSplitService`, `ScenarioService`, `CreditCardService`.

### Layer 2 — Hooks, `src/hooks/use<Feature>.ts`

Thin TanStack Query wrappers. Queries gate on `enabled: !!userId` and set
a `staleTime`. Mutations invalidate the exact affected keys and surface a
toast. Query keys come from a **key factory object** — see
`creditCardKeys` in `src/hooks/useCreditCards.ts`. (`useEmi.ts` still
uses inline literal keys; the factory is the preferred form for anything
new.)

### Layer 3 — Components

Consume hooks only. The single sanctioned exception is a one-shot
imperative read for UI copy — `IssuerCardManager` calling
`CreditCardService.countEntriesForCard` to populate a delete
confirmation.

### Pure logic sits beside all of it

Math with no I/O lives in `src/utils/*.calc.ts` (and
`src/utils/financialYear.ts`). This is the only code that is unit
tested, and it is the layer that ports to Casheq unchanged.

## 5. Storage model

Supabase Postgres. Types are **hand-written** in
`src/supabase/supabase.types.ts` — there is no generated types file, so
every schema change must be mirrored there by hand.

| Table                                         | Purpose                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `emis`                                        | The core EMI record                             |
| `amortizationSchedules`                       | Per-month rows for one EMI                      |
| `emiShares`                                   | Access grants (read / write)                    |
| `emiSplits`                                   | Ownership percentages, registered or name-only  |
| `loan_scenarios` + `loan_scenario_breakdowns` | Foreclosure what-ifs                            |
| `user_profiles`                               | Public-safe lookup for email → user             |
| `user_account_preferences`                    | Currency, number format, filter + export config |
| `cc_issuers`                                  | Card-issuing banks, user-defined                |
| `cc_cards`                                    | Cards, each under one issuer                    |
| `cc_payment_entries`                          | (card, month) → amount paid, cash portion       |
| `cc_bill_entries`                             | (card, statement month) → amount billed         |
| `cc_tracker_years`                            | Per-FY notes and threshold overrides            |

Full column detail: `context/schema/emitrax-schema-overview.md`.

### Migrations

`supabase/migrations/*.sql` are **hand-run scripts** pasted into the
Supabase SQL editor. No timestamp prefixes, no ordering, no CLI chain.
Naming: `supabase_<subject>_<thing>.sql`.

Consequences that are not optional:

- **Never edit a script that has already been run.** Add a new one.
- Every script is idempotent so re-running is free.
- Ship and verify a migration **before** the app code that reads it.

### RLS

Every table has RLS enabled and four policies named
`"Users can {view|insert|update|delete} own <thing>"`, each preceded by
`DROP POLICY IF EXISTS`. SELECT and DELETE use
`USING ("userId" = auth.uid())`; UPDATE uses `USING` **and**
`WITH CHECK`.

**Child tables additionally assert ownership of the parent row.**
`cc_cards` checks its `cc_issuers` row; `cc_payment_entries` and
`cc_bill_entries` check their `cc_cards` row:

```sql
AND EXISTS (
    SELECT 1 FROM public.cc_cards c
    WHERE c.id = cc_bill_entries."cardId" AND c."userId" = auth.uid()
)
```

Without it a user could attach a row to another user's card and pollute
that user's totals. This is not theoretical — the aggregates are the
whole product.

`emis` and its children are the exception: they use a `SECURITY DEFINER`
helper `check_emi_ownership()` plus `emiShares` lookups, because access
there is genuinely shared.

### Column naming

The `cc_*` and `emi*` families use **quoted camelCase** (`"userId"`,
`"createdAt"`, `"sortOrder"`). The older `user_profiles` and
`user_account_preferences` use snake_case. Follow camelCase for anything
new in those families; the split is historical and not worth migrating.

Money is `numeric(14, 2)`. Rates are `numeric(10, 4)`.

### Shared trigger

`public.set_cc_updated_at()` stamps `"updatedAt"` on the `cc_*` tables.
New tables in that family reuse it rather than defining their own.

## 6. Date handling — the rules

`src/utils/financialYear.ts` documents these and every module must
follow them. Getting this wrong is silent and off by one day, which is
the worst kind of wrong for a financial-year boundary.

- **Construct locally**: `new Date(year, monthIndex, 1)`
- **Serialize with date-fns**: `format(date, 'yyyy-MM-dd')`
- **Parse with date-fns**: `parseISO(iso)`
- **Never** `new Date('2026-04-01')` — parsed as UTC midnight
- **Never** `.toISOString().slice(0, 10)` — yields the _previous_ day in
  any negative-offset timezone

Month buckets are stored as a `date` pinned to the 1st, with a
`CHECK (EXTRACT(DAY FROM col) = 1)` constraint. Financial years are
never stored as a derived column — they are computed from the month, so
they cannot drift.

Query a financial year with a **half-open range**:
`>= startDate AND < endDateExclusive`. This makes leap years and 30/31-day
months structurally irrelevant.

## 7. Invariants

1. RLS isolates every table to `auth.uid()`, with the parent-ownership
   check on child tables.
2. Derived financial figures are computed in `*.calc.ts`, never in a
   component and never stored where they can drift.
3. Money is a `number` in rupees with 2 decimals, matching
   `numeric(14,2)`. Display always goes through
   `useCurrencyPreferences().formatCurrencyAmount`.
4. The app has exactly one scroll container.
5. Credit card **bills and payments are never combined into one figure.**
   A revolved balance is billed again next month with interest, so twelve
   bills do not sum to annual spend. Per-series totals only.
