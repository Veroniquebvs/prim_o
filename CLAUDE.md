# PRIM'O — Agent Context

## Project Overview
PRIM'O is a B2B2C SaaS platform enabling real-time meritocratic recognition in SMEs.
Employers buy token packs (Stripe subscription), then allocate tokens to employees — directly or
through managers — upon observed performance. Employees redeem tokens for partner vouchers
(promo codes) via an integrated marketplace.

**Team:** Loïc Cerqueira (Tech Lead / Security) · Véronique Beauvais (UX / Data)
**Stage:** MVP implemented and deployed (backend on Render, frontend on Vercel). Active iteration / bug fixing.
**Repo:** https://github.com/Veroniquebvs/prim_o
**Figma mockup:** https://nimbus-hack-73904302.figma.site/

### Roles
| Role | Can do |
|---|---|
| `admin` | Manages companies, the voucher catalogue, grants/deducts tokens, platform stats |
| `employer` | Owns a company: subscribes (Stripe), allocates tokens, activates/deletes users, promotes employees to manager, sets team retribution rate, schedules recurring allocations |
| `manager` | Leads a team: receives a team token envelope from the employer and redistributes it to team members (earns a retribution %), manages own scheduled allocations |
| `employee` | Receives tokens, redeems vouchers, favourites, history |

New users register with `status: 'pending'` and must be activated by their employer (or admin).
Employees typically join via a QR code printed by the employer (`/register?companyId=...` → `GET /api/companies/:id/public`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 (see `.nvmrc`) |
| Backend | Express 4 + Sequelize 6 (PostgreSQL via `pg`) |
| Security middleware | helmet, cors (whitelist + `*.vercel.app`), express-rate-limit (login/register), express-validator |
| Auth | JWT (access + refresh, `jsonwebtoken`) + bcrypt (12 rounds) |
| Payments | Stripe subscriptions (test mode) — plans `starter` 500 / `growth` 1500 / `scale` 4000 tokens per month |
| Scheduling | node-cron — daily at 09:00 UTC (`cron.service.js`) |
| Uploads | multer (voucher images, admin only, 5 MB max, served from `server/uploads/`) |
| Frontend | React 18 + TypeScript + Vite + react-router 7, PWA (`vite-plugin-pwa`) |
| Frontend libs | axios, @stripe/react-stripe-js, qrcode.react, react-to-print |
| Containerization | Docker (multi-stage: `development` / `production`) + Docker Compose |
| Deployment | Render (API + PostgreSQL, `render.yaml`) · Vercel (client, `vercel.json`) |
| Tests | Jest + Supertest (server) |

---

## Project Structure

```
prim_o/
├── server/                      # Express API
│   ├── server.js                # Entry: middleware, routes under /api, DB connect, cron start
│   ├── src/
│   │   ├── config/              # database.js (Sequelize instance), sequelize-config.js
│   │   ├── controllers/         # Thin HTTP handlers (auth, companies, employer, favorites,
│   │   │                        #   manager, marketplace, scheduled, tokens, users)
│   │   ├── middleware/          # verifyToken, roleGuard, teamScope, validate, errorHandler
│   │   ├── models/              # Sequelize models + associations (index.js)
│   │   ├── routes/              # *.routes.js, mounted in routes/index.js
│   │   └── services/            # Business logic: auth, companies, employer, manager,
│   │                            #   marketplace, stripe, token, users, cron, targetResolver
│   ├── scripts/                 # Seeds & one-off admin scripts (create-admin, seed-*, add-employee…)
│   ├── tests/                   # Jest unit + integration, tests/e2e/practical-test.js
│   ├── uploads/                 # Voucher images
│   └── Dockerfile
├── client/                      # React + Vite frontend
│   └── src/
│       ├── components/          # Navbar, TopNav, BottomNav, TransferForm, TokenBalance, modals…
│       ├── context/             # AuthContext
│       ├── hooks/               # useCart, useFavorites, useInstallPrompt
│       ├── pages/
│       │   ├── admin/           # Dashboard, companies, vouchers (bons), stats, rachats…
│       │   ├── employer/        # EmployerDashboard, EmployeeDetail, ManagerDetail
│       │   ├── manager/         # CollaborateurDetail
│       │   ├── employee/        # Catalogue, CategorieDetail, VoucherDetail, Profil, Parameters
│       │   └── *.tsx            # Shared pages: Login, Register, Panier, Historique, Abonnement, FAQ, CGU…
│       ├── services/            # API wrappers (api.ts = axios instance + JWT interceptor)
│       ├── types/               # Shared TS types
│       └── utils/               # tokens formatting, dates, categories, motifs, avatars
├── migrations/                  # sequelize-cli migrations (used in production)
├── documentation/               # stage1–4.md (stage3 = full API contract)
├── audit-secu/                  # Security audit reports
├── docker-compose.yml           # api + client (DB = remote Render PostgreSQL via DATABASE_URL)
├── render.yaml · vercel.json
└── CLAUDE.md
```

UI text and some comments are in **French** (e.g. `Panier`, `Historique`, `bons`, `rachats`). Keep it that way for user-facing strings.

---

## Database Schema (Sequelize / PostgreSQL)

**All primary keys are UUID v4.** **All balances are `DECIMAL(10,2)`** (to support retribution fractions).

> ⚠️ `pg` returns DECIMAL columns as **strings**. Always `parseFloat()` before arithmetic or comparison
> (past bug: garbled balances / doubled amounts from string concatenation). Do this on the client too.

| Table | Key columns |
|---|---|
| `companies` | id, name, email, street, zip_code(5), city, siret(14), token_balance, feedback_enabled, stripe_customer_id, stripe_subscription_id, subscription_plan, subscription_status, subscription_next_billing |
| `users` | id, name, first_name, email (unique), password_hash, role (`admin`/`employer`/`manager`/`employee`), token_balance, status (`pending`/`active`), entry_date, avatar_index, company_id |
| `teams` | id, name, company_id, manager_id, token_balance (team envelope), retribution_rate (%), dissolved_at |
| `team_members` | team_id, user_id, joined_at, left_at |
| `token_transactions` | id, sender_id, receiver_id, company_id, amount, type, reason, stripe_payment_id |
| `vouchers` | id, title, partner, token_cost (int), available, category, images (TEXT[]), promo_code, is_featured, is_weekly |
| `redemptions` | id, user_id, voucher_id, promo_code |
| `favorites` | id, user_id, voucher_id |
| `scheduled_allocations` | id, company_id, sender_id, receiver_id, target_type (`user`/`all_company`/`all_employees`/`all_managers`/`team`/`team_and_manager`), target_team_id, target_account (`personal`/`team`), amount, label, frequency (`monthly`/`annual`), day_of_month (1–28), month, next_run_at, active, excluded_user_ids (JSON) |

**`token_transactions.type` values in use:** `purchase`, `admin_grant`, `admin_deduct`, `employer_to_manager`,
`employer_to_team`, `manager_to_employee`, `manager_retribution`, `role_change`, `scheduled_allocation` (or the rule label).

**Schema management:** in non-production, `server.js` runs `sequelize.sync({ alter: true })`. In production, schema
changes need a migration in `/migrations` (sequelize-cli, configured via `server/.sequelizerc`). Always add a migration when changing a model.

---

## API Routes (all under `/api`)

Full contract: [documentation/stage3.md](documentation/stage3.md). Summary (guards in brackets):

- **auth** — `POST /register`, `POST /login` (rate-limited), `POST /refresh`, `POST /logout` [auth], `GET /me` [auth]
- **users** — `GET /` & `GET /pending` [employer, admin], `GET /me/team`, `GET|PUT /:id`, `DELETE /:id` [employer (own company), admin],
  `GET /:id/history`, `PATCH /:id/activate` [employer, admin], `PATCH /:id/password`, `PATCH /:id/avatar`, `PATCH /:id/entry-date` [employer, admin, manager]
- **tokens** — `POST /allocate` [employer], `GET /balance/:userId`, `GET /transactions`, `GET /transactions/:id`,
  `POST /admin/deduct` [admin], `POST /subscribe` & `GET /subscription` [employer], `POST /webhook` [public, Stripe signature]
- **marketplace** — `GET /items`, `GET /items/:id`, `POST|PUT|DELETE /items[/:id]` [admin], `POST /redeem` & `GET /orders` [employee, manager, employer],
  `GET /company-orders` [employer, manager], `GET /admin/vouchers` & `GET /admin/history` [admin]
- **companies** — `POST /` [public, self-onboarding], `GET /:id/public` [public], `POST /admin` [admin, creates company + employer atomically],
  `GET /` [admin], `GET /:id` [own company or admin], `PUT /:id` [employer, admin], `POST /:id/tokens` [admin], `DELETE /:id` [admin]
- **employer** [employer, router-level] — `GET /teams`, `GET /managers/:id/team`, `PATCH /employees/:id/role`, `GET|POST /allocations`,
  `PATCH /allocations/:id`, `PATCH /teams/:teamId/retribution-rate`
- **manager** [manager, router-level + `teamScope` where targeting an employee] — `GET /team`, `POST /employees`, `POST /team/members`,
  `POST /tokens/give`, `GET /tokens/balance`, `GET /available-collaborators`, `GET|POST /scheduled`, `PATCH /scheduled/:id/toggle`, `DELETE /scheduled/:id`
- **scheduled-allocations** [employer, router-level] — `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/toggle`, `DELETE /:id`
- **favorites** [auth] — `GET /`, `POST /toggle`
- **upload** [admin] — voucher image upload
- `GET /health` (outside `/api`)

---

## Critical Business Logic

### Token purchase (Stripe subscription) — `stripe.service.js`
1. Employer picks a plan → `POST /tokens/subscribe` creates the Stripe Customer if needed, cancels any existing subscription,
   creates a monthly subscription and returns the PaymentIntent `client_secret`.
2. React renders the Stripe.js card form with it (card data never reaches the backend).
3. Stripe sends `invoice.payment_succeeded` → webhook verifies signature with `stripe.webhooks.constructEvent()`
   (raw body — `express.raw` is mounted on `/api/tokens/webhook` **before** `express.json()`), finds the company by
   `stripe_subscription_id`, credits the plan's tokens to `companies.token_balance` and inserts a `purchase` transaction — atomically.
4. Admin can also grant tokens without Stripe (`POST /companies/:id/tokens` → `admin_grant`).

### Token allocation — `token.service.js` (`allocate`), `employer.service.js`
- Debits `companies.token_balance`, credits the receiver(s), inserts `token_transactions` row(s).
- Targets resolved by `targetResolver.service.js` (`target_type` + `excluded_user_ids`).
- When the receiver is a manager with `target_account: 'team'`, tokens go to `teams.token_balance` (`employer_to_team`), otherwise to the user (`employer_to_manager` / personal).
- **Atomic** — `sequelize.transaction()` with `lock: true` (SELECT FOR UPDATE) on every balance row.

### Manager distribution — `manager.service.js` (`giveTokens`)
- Manager gives `amount` from the team envelope to a team member; manager earns `retribution = amount × retribution_rate / 100`.
- Team is debited `amount + retribution` (402 if insufficient); employee credited (`manager_to_employee`), manager credited (`manager_retribution`). Atomic, row-locked.
- `teamScope` middleware guarantees the target is an active member of the manager's active team.

### Voucher redemption — `marketplace.service.js` (`redeem`)
- Transaction with row locks on voucher + buyer. Vouchers are **single-use**: redemption sets `available = false`.
- Employees/managers pay from `users.token_balance`; **employers pay from `companies.token_balance`**.
- Inserts a `redemptions` row and returns the `promo_code`. Insufficient balance → `403`, any failure → ROLLBACK.

### Scheduled allocations — `cron.service.js`
- Daily at 09:00 UTC, executes active rules whose `next_run_at` is due, each in its own transaction, then advances `next_run_at`.

---

## API Response Conventions

- Success: `{ success: true, data: any, message: String }`
- Error: `{ error: String, code: Integer }` (services throw `httpError(message, status)`, `errorHandler` formats it)
- All protected endpoints require `Authorization: Bearer <token>`
- Dates are ISO 8601; IDs are UUIDs (validate with `isUUID()` in express-validator)

---

## Security Rules — NEVER BYPASS

- ALL protected routes use `verifyToken`; role-restricted routes use `roleGuard(...roles)` (or router-level `router.use(verifyToken, roleGuard(...))`)
- Manager routes that target an employee must use `teamScope` (`requireTeamScope`)
- Always scope data by `company_id` — an employer/manager must never read or modify another company's users, teams or tokens
- Every multi-row token write uses a Sequelize transaction with `lock: true` — no partial writes
- Never write a token movement without a corresponding `token_transactions` row
- Passwords hashed with bcrypt, **12 rounds minimum**
- JWT secrets live in env vars — never hardcoded, never logged
- Stripe webhook signature always verified with `STRIPE_WEBHOOK_SECRET` before processing
- Raw card data never touches the backend — Stripe.js only
- Validate every input with express-validator + `validate` middleware; never trust client-side balances — recompute server-side
- `.env` files are gitignored — never commit them

---

## Dev Commands

```bash
# Backend — http://localhost:5000
cd server
npm install
npm run dev            # nodemon server.js
npm test               # jest (unit + integration)
npm run test:e2e       # practical E2E against a live server + DB + Stripe test mode
npm run lint           # eslint
npm run format         # prettier
npm run db:seed        # seed vouchers

# Frontend — http://localhost:3000
cd client
npm install
npm start              # vite --host
npm run build          # tsc && vite build
npm run lint           # eslint (typescript-eslint + react-hooks)

# Docker (api + client; DB is the remote PostgreSQL from server/.env)
docker-compose up --build
docker-compose down

# Production migrations (from server/)
npx sequelize-cli db:migrate
```

---

## Environment Variables

### server/.env (never commit)
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host:5432/primo
JWT_SECRET=
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:3000     # comma-separated list of allowed CORS origins
```

### client/.env (copy from client/.env.example)
```
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

When adding an env var: update `render.yaml`, `docker-compose.yml` and the `.env.example` files.

---

## Code Conventions

- CommonJS (`require` / `module.exports`) on the server; **async/await** everywhere, no `.then()` chains
- Controllers stay thin — business logic lives in `/services`; services throw `httpError(msg, status)`
- Each file starts with a JSDoc header describing its responsibility; functions have JSDoc comments — keep this style
- Named exports in services/utils, default exports in React components
- TypeScript strict mode on the frontend; format token amounts with `client/src/utils/tokens.ts`
- Prettier + ESLint config in `server/` (`.prettierrc.json`, `eslint.config.js`)

---

## Git Workflow (GitHub Flow)

- `main` — production-ready; deploys to Render/Vercel
- Work on `feature/*` branches from `main` (a `dev` branch has also been used as an integration branch)
- Merge via PR after peer review (Loïc ↔ Véronique) — no self-merging
- Commit format: `type(scope): description` — types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`

---

## QA

| Test type | Location | Notes |
|---|---|---|
| Unit | `server/tests/**/*.service.test.js`, `tests/middleware/` | Jest with mocked models — no DB needed (153 tests, all green) |
| Integration | `server/tests/**/*.integration.test.js` | Supertest against the Express app |
| E2E | `server/tests/e2e/practical-test.js` | Live stack + Stripe test card `4242 4242 4242 4242`; writes `practical-test.md` |

**Definition of Done:** tests pass · new service logic has unit tests · PR reviewed · no ESLint/Prettier errors · Stripe-touching features manually tested.

---

## Known Gaps / TODO (as of 13 October 2026)

- Stripe webhook idempotence check runs outside the transaction and without a row lock: two concurrent deliveries of the same event could credit twice (ticket open)
- Registering with an already-used email returns 201 with a generic `{ message }` and no tokens. Enumeration is still possible because a new email gets `{ user, accessToken, refreshToken }`, so the two bodies differ. Also, `AuthContext.register` does not handle the generic body and stores `undefined` tokens (ticket open)
- Client ESLint: unused vars and `any` are warnings (≈ 90), not errors — existing debt to burn down
- Prettier has never been applied repo-wide (`prettier --check` fails on most files) — do it in a dedicated PR, not mixed with logic changes
- No CD step yet: CI (`.github/workflows/ci.yml`) runs lint → tests → client build → API Docker build; deploys remain Render/Vercel auto-deploys
- `server/database.sqlite` is tracked in git but unused (app runs on PostgreSQL)
- Root-level scratch files (`zyzx*.md`, `prompt-front.md`, `rapport-tests-*.md`, `render-db.md`) — keep out of commits

---

## What to Always Do

- Check existing middleware (`verifyToken`, `roleGuard`, `teamScope`, `validate`) before writing new validation logic
- Use a locked Sequelize transaction for ANY write touching balances
- `parseFloat()` DECIMAL values before math, server and client side
- Test auth, role guards and company scoping on every new route before business logic
- Add a migration in `/migrations` for every model change
- Keep Docker Compose / render.yaml in sync when adding services or env vars
- Update this CLAUDE.md when architecture decisions change

## What to Never Do

- Never hardcode secrets, API keys, connection strings, or Stripe keys
- Never trust frontend input or balances
- Never move tokens without a `token_transactions` row
- Never commit `.env` files
- Never let raw card data reach the backend
