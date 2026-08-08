# Schema Overview — Emitrax

> The SQL scripts themselves live in `supabase/migrations/`. This
> document describes what they produced, so you don't have to read
> thirteen files to find one column.
>
> **Deliberate divergence from Casheq**, whose `context/schema/` holds
> copies of its SQL. Emitrax's `supabase/migrations/` is already the
> single source of truth; copying it here would guarantee drift.

Migrations are **hand-run scripts** pasted into the Supabase SQL editor —
no timestamp prefixes, no ordering, no CLI chain. Every one is
idempotent. **Never edit one that has already been run; add a new one.**

## Conventions

- Quoted **camelCase** columns in the `emi*` and `cc_*` families
  (`"userId"`, `"createdAt"`). The older `user_profiles` and
  `user_account_preferences` use snake_case — historical, not worth
  migrating.
- `uuid_generate_v4()` for primary keys (this repo has zero
  `gen_random_uuid()`).
- Money `numeric(14,2)`; rates `numeric(10,4)`. Older `emis` columns use
  `numeric(15,2)`.
- Month buckets are a `date` **pinned to the 1st**, enforced by
  `CHECK (EXTRACT(DAY FROM col) = 1)`.
- Financial year is **never stored** — it is derived from the month, so
  it cannot drift.
- RLS on everything: four policies named
  `"Users can {view|insert|update|delete} own <thing>"`, each preceded by
  `DROP POLICY IF EXISTS`. Child tables also assert **parent ownership**.
- Types mirrored by hand into `src/supabase/supabase.types.ts`.

---

## EMI core

### `emis` — `supabase_emis_*.sql`

The central record. `id`, `"userId"` → `auth.users`, `itemName`,
`principal`, `interestRate`, `billDate`, `tenure`, `interestDiscount` +
`interestDiscountType` (`'percent' | 'amount'`), and the derived stored
figures: `emi`, `totalLoan`, `totalPaidEMIs`, `totalInterest`, `gst`,
`processingFee`, `processingFeeGst`, `remainingBalance`,
`remainingTenure`, `endDate`, `isCompleted`, `isArchived`, `tag`,
`notes`, timestamps.

Added later: `processingFee` / `processingFeeGst`
(`supabase_emis_processing_fee.sql`), with a `totalLoan` backfill
(`supabase_emis_total_loan_processing_fee_backfill.sql`).

### `amortizationSchedules`

One row per month of one EMI: `"emiId"`, `month`, `billDate`, `emi`,
`interest`, `principalPaid`, `balance`, `gst`, `isPaid`.

### `emiShares` — `supabase_shared_emi_schema.sql`

Access grants. `"emiId"`, `"sharedWithUserId"`, `permission`
(`public.emi_share_permission` enum: `read` | `write` — see
`supabase_emi_share_permission_enum.sql`).
(`'read' | 'write'`), `"createdBy"`. Unique on
`("emiId", "sharedWithUserId")`, with a no-self-share check.

Introduces `check_emi_ownership(emi_id, user_id)` — a `SECURITY DEFINER`
helper that avoids RLS recursion. EMI-family policies read
`"userId" = auth.uid() OR EXISTS (... emiShares ...)`. Delete stays
owner-only.

### `emiSplits` — `supabase_emi_splits_schema.sql`

Ownership percentages. `"emiId"`, `"userId"` (nullable),
`participantName` / `participantEmail` for non-users, `splitPercentage`,
`splitAmount`, `isExternal`, `"createdBy"`.
`supabase_emi_splits_allow_name_only_external.sql` relaxed the
constraint so an external participant needs only a name.

### `loan_scenarios` + `loan_scenario_breakdowns` — `supabase_loan_scenarios_schema.sql`

Persisted foreclosure what-ifs: charge rate and amount, GST rate,
`includeNextInstallmentInterest`, the computed payoff and savings
figures, `confidence` (`'exact' | 'estimated'`), `notes`. Breakdowns are
labelled component rows, unique on `("scenarioId", component)`.
`supabase_loan_scenarios_interest_option.sql` added the interest option.

---

## User

### `user_profiles` — `supabase/schemas/user_profiles.sql`

Public-safe lookup so sharing can resolve an email to a user.
`id` → `auth.users`, `email`, `display_name`, `userdata` jsonb,
`appdata` jsonb. **snake_case** — this file is a dashboard dump and the
one script not following house style.

### `user_account_preferences` — `supabase_account_profile_preferences.sql`

`user_id` PK → `auth.users`, `phone`, `avatar_url`, `locale`
(default `en-IN`), `currency` (default `INR`, `CHECK ~'^[A-Z]{3}$'`),
`number_format` (`'exact' | 'compact_short' | 'compact_long'`),
`filter_config` text, `export_config` text, timestamps + trigger.
**snake_case.** Extended by the three
`supabase_account_preferences_*.sql` scripts.

---

## Credit cards — `supabase_credit_card_tracker_schema.sql`

The SFT domain rule this models: the reporting threshold applies **per
issuing bank**, aggregating that bank's cards — ₹10,00,000 non-cash and
₹1,00,000 cash per financial year. That is why `cc_issuers` exists as a
first-class table rather than a text field on the card.

### `cc_issuers`

`id`, `"userId"`, `name`, `color`, `"sortOrder"`, timestamps.

- `name` non-blank; unique per user **case-insensitively** via an
  expression index on `("userId", lower(name))` — a table constraint
  can't take `lower()`
- `color` constrained to the five design tokens `chart-1` … `chart-5`,
  so an issuer colour can never break in one theme

### `cc_cards`

`id`, `"userId"`, `"issuerId"` → `cc_issuers` CASCADE, `name`, `last4`,
`"isActive"`, `"sortOrder"`, timestamps. Unique on
`("issuerId", lower(name))`; `last4` matches `^[0-9]{4}$`.

Extended by `supabase_credit_card_bill_tracker_schema.sql` with the
billing-cycle defaults: `"statementDay"`, `"dueDay"` (both 1–31),
`"creditLimit"`. All nullable — these pre-fill a bill row's dates and are
never authoritative over the row's own dates.

### `cc_payment_entries`

What was **paid** toward a card in a calendar month.
`"cardId"` → `cc_cards` CASCADE, `"periodMonth"` (date, day 1),
`amount`, `"cashAmount"`, `note`.

- `amount >= 0`; `0 <= "cashAmount" <= amount`
- `UNIQUE ("cardId", "periodMonth")` — the upsert conflict target
- A row carrying no information (no amount, no cash, no note) is
  **deleted** rather than stored as zero

### `cc_bill_entries` — `supabase_credit_card_bill_tracker_schema.sql`

What a card **billed**, filed under the month its statement was
generated. `"cardId"` → `cc_cards` CASCADE, `"statementMonth"` (date,
day 1), `status`, `"totalDue"`, `"minimumDue"`, `"statementDate"`,
`"dueDate"`, `note`.

**The month column is named `"statementMonth"`, not `"periodMonth"`,
and the two tables must never be joined on their month columns.** A bill
generated in month N is normally paid in month N+1, so they are offset by
one.

Three states, deliberately distinguished:

| State                       | Representation                             |
| --------------------------- | ------------------------------------------ |
| Not entered yet             | row absent                                 |
| Bank generated no statement | `status='no_statement'`, `"totalDue"` NULL |
| Statement for ₹0            | `status='issued'`, `"totalDue"=0`          |
| Normal                      | `status='issued'`, `"totalDue"<>0`         |

`"totalDue"` **may be negative** — an overpayment or refund produces a
genuine credit-balance statement. `"minimumDue"` is capped at
`GREATEST("totalDue", 0)`.

There is deliberately **no** constraint that `"statementDate"` falls
inside `"statementMonth"`: banks sometimes label a 1-Aug statement as
July's, and the grid has no per-cell error surface, so this is a UI
warning instead.

`UNIQUE ("cardId", "statementMonth")` is the upsert conflict target.

### `cc_tracker_years`

Per-FY notes and threshold overrides. `"financialYear"` text matching
`^[0-9]{4}-[0-9]{2}$`, `notes`, `"thresholdAmount"` (default 1000000),
`"cashThresholdAmount"` (default 100000). Unique on
`("userId", "financialYear")`. Created lazily on the first entry of a
year.

### Shared trigger

`public.set_cc_updated_at()` stamps `"updatedAt"` on every `cc_*` table.
New tables in the family reuse it.

### RLS — the parent-ownership rule

`cc_cards` asserts ownership of its `cc_issuers` row; both entry tables
assert ownership of their `cc_cards` row:

```sql
AND EXISTS (
    SELECT 1 FROM public.cc_cards c
    WHERE c.id = cc_bill_entries."cardId" AND c."userId" = auth.uid()
)
```

Without it a user could attach a row to another user's card and pollute
that user's aggregates — which, for a threshold tracker, is the whole
product.
