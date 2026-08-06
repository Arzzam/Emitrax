# Code Standards — Emitrax

> The README is stale in two places. The truth: the app uses
> **TanStack Form** (not react-hook-form — see
> `.cursor/plans/tanstack_form_migration_16a40611.plan.md`), and the dev
> server runs on **port 3002** (not 5173 — `vite.config.ts` sets it).

## 1. Stack

| Concern         | Choice                                                                |
| --------------- | --------------------------------------------------------------------- |
| Framework       | React 19 + Vite 6 (`@vitejs/plugin-react-swc`)                        |
| Routing         | react-router v7, declarative `BrowserRouter`                          |
| Language        | TypeScript ~5.7, `strict`, `noUnusedLocals`, `noUnusedParameters`     |
| Styling         | Tailwind v4 (CSS-first) + shadcn `new-york` over Radix                |
| Server state    | TanStack Query v5                                                     |
| Client state    | Rematch/Redux + redux-persist                                         |
| Forms           | **TanStack Form v1**                                                  |
| Validation      | **Zod v3** — string message shorthand, _not_ v4's `{ error }` objects |
| Backend         | `@supabase/supabase-js` v2                                            |
| Dates           | date-fns v4                                                           |
| Tests           | Vitest 4                                                              |
| Package manager | **yarn**                                                              |

Path alias `@/*` → `./src/*`.

## 2. Formatting and lint

`.prettierrc`: **120 columns, 4-space indent, single quotes, semicolons,
`trailingComma: "es5"`, `bracketSpacing: true`**.

ESLint flat config (`eslint.config.js`) with `simple-import-sort`
enforcing **six groups in this order**:

1. React and external packages
2. `@/` (hooks, utils, types, store)
3. `@/components`
4. Parent imports (`../`)
5. Same-folder imports (`./`)
6. Styles

This is why credit-card files have `@/components/...` in a separate
trailing block. `yarn lint` failures here are the most common; `yarn
lint:fix` resolves them.

Also enforced: `import/no-duplicates`, `react-hooks` recommended rules,
`react-refresh/only-export-components` (warn).

Husky pre-commit runs lint-staged: `eslint --fix` + `prettier --write`.
**Never bypass with `--no-verify`.**

## 3. Naming and exports

- Components: PascalCase files, **default export**
- Utils, hooks, types: camelCase files, **named exports**
- Hooks `useX` in `src/hooks/use<Feature>.ts`
- Services `XService` in `src/utils/<Feature>Service.ts`
- Pure math in `src/utils/<feature>.calc.ts`
- Domain interfaces prefixed `I` (`IEmi`, `ICreditCard`) — an existing
  convention, kept for consistency
- Booleans read as `is` / `has` / `should`

## 4. Data layer

Three layers, no shortcuts: **service → hook → component**. See
`emitrax-architecture-context.md` §4 for the full contract. In short:

- Raw `supabase.from()` only in a service class
- Services throw; they never return an error tuple
- Row mapping via module-private `map*Row` with explicit coercion
- Query keys from a **key factory object**, never inline arrays
- Mutations invalidate the exact keys they affect

## 5. Mutations and toasts

| Situation                                | Behaviour                        |
| ---------------------------------------- | -------------------------------- |
| Discrete action (create, rename, delete) | Invalidate + `successToast`      |
| Grid cell edit                           | **Optimistic, no success toast** |
| Any failure                              | Roll back, then `errorToast`     |

The grid exception exists because one toast per cell is unusable when
entering twelve months across six cards. Cells show a transient inline
tick instead.

Cell editors commit on **blur or Enter** and revert on **Escape** —
never on keystroke. Debouncing a money field persists nonsense
intermediates (`1` → `12` → `120`) and lets two in-flight writes to the
same row land out of order.

## 6. Money

- A `number` in rupees with 2 decimals, matching `numeric(14,2)`
- Never integer-paise, never a float-as-paise convention
- Display **only** through `useCurrencyPreferences().formatCurrencyAmount`
- Round through integer cents (`Math.round(v * 100) / 100`) when summing
  toward a threshold comparison — repeated float addition drifts

## 7. Dates

The rules in `src/utils/financialYear.ts` are binding across the
codebase. Construct locally, `format` to serialize, `parseISO` to parse.
Never `new Date('yyyy-mm-dd')`, never `.toISOString().slice(0,10)`.
Query financial years with a half-open range.

## 8. Testing

Vitest is configured **inside `vite.config.ts`**:

```ts
test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
}
```

No setup file, no globals — tests import
`{ describe, expect, it } from 'vitest'` explicitly.

**What is tested: pure logic only.** `environment: 'node'` means there is
no DOM, and there is no `@testing-library` — **components are not
tested**, deliberately. The value is concentrated where the boundaries
are subtle: financial-year edges, threshold banding, money summation,
amortization and foreclosure math.

Conventions:

- A `*.calc.ts` module has a `*.calc.test.ts` beside it
- **Inject `today` as a defaulted parameter** so tests are deterministic
  rather than depending on when they run
- One `describe` per exported function
- Cover the boundary, not the happy path: Mar 31 vs Apr 1, leap
  February, century rollover, exactly-at-threshold vs a rupee under

Current test files: `financialYear.test.ts`,
`creditCardTracker.calc.test.ts`, `creditCardBills.calc.test.ts`,
`scenarioCalculation.test.ts`.

## 9. Styling rules

- Tailwind only. Inline `style` is reserved for genuinely dynamic values
  (a progress bar width) and nothing else
- Semantic tokens only — no raw hex, no arbitrary colour
- `tabular-nums` on every number
- Reuse a primitive from `src/components/ui/` before writing one

## 10. Commits

`<type>(<scope>): <summary>` — types `feat`, `fix`, `chore`, `refactor`,
`docs`, `style`, `test`. One logical change per commit.

## 11. Before declaring done

```
yarn lint && yarn build && yarn test
```

`yarn build` is `tsc -b && vite build`, so it is the real typecheck.
