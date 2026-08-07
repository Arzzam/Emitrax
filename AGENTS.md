## Application Building Context

Read the following files in order before implementing
or making any architectural decision:

1. `context/emitrax-project-overview.md` — product definition,
   goals, features, and scope
2. `context/emitrax-architecture-context.md` — system structure,
   boundaries, storage model, and invariants
3. `context/emitrax-ui-design-system.md` — theme, colors, typography,
   and component conventions
4. `context/emitrax-code-standards.md` — implementation rules
   and conventions
5. `context/emitrax-ai-workflow-rules.md` — development workflow,
   scoping rules, and delivery approach
6. `context/emitrax-progress-tracker.md` — current status,
   completed work, open questions, and next steps

Module design plans live in `context/plan/`. Read the relevant
one before touching a module it covers.

Update `context/emitrax-progress-tracker.md` after each
meaningful implementation change.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.

## Implementation Requirements

- Follow existing architecture and folder structure
- Reuse existing components before creating new ones
- Maintain TypeScript strictness
- Avoid introducing new dependencies unless necessary
- Keep changes scoped to the requested task
- Document significant architectural decisions
- Ensure linting, type checking and tests pass before completion

## Database Migrations

`supabase/migrations/*.sql` are **hand-run scripts**, executed in the
Supabase SQL editor. They are not a CLI migration chain — there are no
timestamp prefixes and no ordering guarantees.

- **Never edit a script that has already been run.** Add a new one.
- Every script must be idempotent: `CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` before
  `CREATE POLICY`, `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`,
  `CREATE OR REPLACE FUNCTION`.
- Schema changes ship and are verified **before** the app code that
  depends on them.
- Mirror every new column into the hand-written
  `src/supabase/supabase.types.ts`.

## Verification

Run all three before declaring anything done:

```
yarn lint     # eslint flat config
yarn build    # tsc -b && vite build
yarn test     # vitest run
```

`yarn dev` serves on port **3002**.

## Progress Tracking

After completing a meaningful change:

1. Update `context/emitrax-progress-tracker.md`
2. Record:
    - What was completed
    - Files changed
    - Open questions
    - Next recommended step
3. Keep entries concise and chronological
