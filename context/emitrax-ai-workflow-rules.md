# AI Workflow Rules — Emitrax

## 1. Approach

Build against the context documents, not from inference. If an
instruction conflicts with a context file, **the context file wins — flag
the conflict rather than silently resolving it.**

If a requirement is missing entirely, add it as an open question in
`emitrax-progress-tracker.md` before continuing. **Ask before proceeding
on anything touching money math** — EMI and interest calculation,
amortization, foreclosure payoff, threshold aggregation. A wrong number
here is worse than a missing feature, because it looks right.

## 2. Reading order

1. `emitrax-project-overview.md`
2. `emitrax-architecture-context.md`
3. `emitrax-ui-design-system.md`
4. `emitrax-code-standards.md`
5. `emitrax-ai-workflow-rules.md` (this file)
6. `emitrax-progress-tracker.md`
7. The relevant `context/plan/*.md`, if the module has one

## 3. Plan documents

Two folders, deliberately:

| Folder           | What it is                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `.cursor/plans/` | Tool-generated history. Gitignored, local-only, never edited by hand. Useful as a record of how something came to be. |
| `context/plan/`  | **The curated source of truth.** Hand-maintained module design plans, committed, read before touching the module.     |

When a module's design changes, update `context/plan/`. Do not treat a
`.cursor/plans/` file as authoritative.

## 4. Scoping

- One module at a time. Do not touch the Lend/Share flow while
  implementing a credit-card change.
- Within a module: **data layer before UI** — schema, then types and
  service, then hooks, then components.
- Prefer small verifiable increments over large speculative changes.
- If a change cannot be verified end to end quickly, the scope is too
  broad. Split it.

## 5. When to split

Split into separate steps when a change combines:

- **A migration and the app code that reads it.** The script ships and is
  verified first, on its own.
- A refactor of shared code and a new feature built on it. Land the
  refactor, confirm nothing regressed, then build.
- Multiple unrelated modules.
- Anything whose behaviour is not clearly defined in the context files —
  resolve the ambiguity in the docs first.

## 6. Migrations

`supabase/migrations/*.sql` are hand-run scripts pasted into the Supabase
SQL editor. There is no CLI chain and no ordering.

- **Never edit a script that has already been run.** Add a new one.
- Every script must be idempotent — it will be re-run.
- Follow the house banner and section style; copy an existing script.
- `uuid_generate_v4()`, quoted camelCase columns, `numeric(14,2)` money.
- RLS on every table, four named policies, plus the **parent-ownership
  check** on child tables.
- Mirror every column into `src/supabase/supabase.types.ts` by hand —
  there is no generated types file.

## 7. Protected

Do not hand-edit:

- `src/components/ui/*` — shadcn primitives; regenerate or extend around
  them
- Any migration script already run against the database
- `.husky/*`, `eslint.config.js`, `.prettierrc`

## 8. Keeping docs in sync

| Change                                  | Update                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Architecture, boundaries, storage model | `emitrax-architecture-context.md` + `context/schema/emitrax-schema-overview.md`                 |
| A convention or a new pattern           | `emitrax-code-standards.md`                                                                     |
| A UI recipe not already covered         | `emitrax-ui-design-system.md` — **propose an addition rather than freelancing a one-off style** |
| Feature scope                           | `emitrax-project-overview.md`                                                                   |
| Anything shipped                        | `emitrax-progress-tracker.md`, after every completed unit                                       |

## 9. Before moving on

1. The unit works end to end
2. No invariant violated — RLS isolates every table; derived money math
   lives in a `*.calc.ts`; bills and payments are never combined
3. `yarn lint && yarn build && yarn test` all pass
4. `emitrax-progress-tracker.md` updated

## 10. Porting to Casheq

Emitrax prototypes; Casheq inherits. When building something that will
port:

- Keep domain logic in pure `*.calc.ts` modules with no React, Redux or
  Supabase imports — that is the part that moves
- Where the two apps model the same real-world thing differently, **write
  the mapping down in the plan document**. An off-by-one that is
  invisible in one app becomes a disagreement between two.
- Do not add speculative fields to Emitrax types to "prepare" for
  Casheq. Find the seam — usually an accessor or a prop — and let Casheq
  supply its own shape through it.
