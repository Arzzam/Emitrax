# Project Overview — Emitrax

## 1. What is Emitrax?

Emitrax is a personal finance tracker for **EMIs (Equated Monthly
Instalments)** — loans repaid in fixed monthly instalments, the standard
consumer-credit form in India. It answers "what am I actually paying, in
total, across everything I've financed?"

It has since grown a second module: **credit card trackers**, covering
annual payment totals against India's SFT reporting thresholds and
monthly bill/statement amounts.

Single-user, manual entry. There is no bank integration and none is
planned — every figure is typed by the user or derived from what they
typed.

Live at **https://emitrax.arzzam.in** (Vercel, SPA rewrite in
`vercel.json`).

## 2. Relationship to Casheq

**Casheq is the successor product.** It is a broader personal-finance
app (accounts, transactions, categories, lend/borrow, credit cards) and
its architecture doc plans an "EmiTrax merge" — a `loans` table exists
there, empty, waiting.

This matters to every decision made here:

- Emitrax is where features get **prototyped**, because it is smaller
  and moves faster.
- A feature built here should be built so it **ports** — the domain
  logic kept pure and separable from the Vite/Redux specifics that
  Casheq does not share.
- Where the two apps model the same real-world thing, the mapping
  between them must be written down. See
  `context/plan/credit-card-bill-tracker-plan.md` for a worked example
  (the statement-month vs billing-cycle-month off-by-one).

Casheq lives at `../casheq` and has its own `context/` folder with the
same six documents.

## 3. Goals

- Know the true total cost of a loan — principal, interest, GST,
  processing fees — not just the monthly figure the seller quotes
- See every EMI in one place, with what remains
- Model "what if I foreclose this?" before committing
- Split a shared purchase fairly and track who owes what
- Track credit card payments against statutory reporting thresholds,
  and card bills month by month

## 4. Features

Read off `src/router/HomeRouter.tsx` and the components under `src/`.

### 4.1 EMI core

- Create an EMI: principal, interest rate, tenure, bill date, GST,
  processing fee + its GST, interest discount (percent or flat amount)
- Derived: monthly EMI, total interest, total GST, total outflow,
  remaining balance and tenure, end date
- Amortization schedule generated per EMI, month by month, with a
  paid/unpaid flag
- Tags, notes, archive, completion state

### 4.2 Dashboard

- All EMIs as cards, with aggregate statistics
- Advanced filter and sort (by amount, date ranges, tag, tenure,
  shared/split participants), persisted to the user's account
- Category/stat breakdown section

### 4.3 Sharing

Share an EMI with another Emitrax user, read-only or read-write.
Access is enforced in RLS via an `emiShares` table.

### 4.4 Splitting

Split an EMI's financial responsibility across participants — registered
users or name-only externals — by percentage. Distinct from sharing:
sharing grants _access_, splitting assigns _ownership_.

### 4.5 Foreclosure scenarios

Persisted what-if simulations: given a foreclosure date, charge rate and
GST, compute payoff, savings versus continuing, and months saved. Saved
scenarios carry a stored breakdown.

### 4.6 Export

PDF (`@react-pdf/renderer`) and Excel (`exceljs`) export of EMI details
and the amortization schedule.

### 4.7 Account preferences

Currency, locale, number format (exact / compact short / compact long),
plus persisted filter and export configuration.

### 4.8 Credit card — annual payment tracker (SFT / AIS)

Month × card grid for one financial year, tracking what was **paid**
toward each card bill, against India's SFT-006 reporting thresholds:
₹10,00,000 non-cash and ₹1,00,000 cash, **per issuing bank**, aggregating
that bank's cards. Cards are grouped under user-defined issuers.

### 4.9 Credit card — bill tracker

The same grid shape for what each card **billed** per month. Bills and
payments are tracked separately and are deliberately never combined —
see `context/plan/credit-card-bill-tracker-plan.md`.

## 5. Scope

### In scope

- Manual entry of everything
- Indian financial year (Apr–Mar) as the reporting period
- INR-first, with currency/locale as a display preference
- Single-user data with per-user RLS; sharing is explicit and per-EMI

### Out of scope — will not build

- Bank or card API integration, statement import, auto-sync
- Credit score, offers, or any recommendation engine
- Tax filing, or any connection to the Income Tax portal / AIS.
  The SFT tracker is a self-reported early-warning view and is never an
  official record
- Multi-currency accounting (a single display currency, not conversion)
- Mobile app — Casheq owns that

### Deferred

- Bill ↔ payment reconciliation (variance) — designed, not built
- Linking a card-EMI conversion to an Emitrax EMI record
