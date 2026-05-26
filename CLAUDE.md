# PRIM'O — Agent Context

## Project Overview
PRIM'O is a B2B2C SaaS platform enabling real-time meritocratic recognition in SMEs.
Employers allocate tokens to employees instantly upon observed performance.
Employees redeem tokens for vouchers (promo codes) via an integrated marketplace.

**Team:** Loïc Cerqueira (Tech Lead / Security) · Véronique Beauvais (UX / Data)
**Stage:** MVP — active development, nothing coded yet as of May 2026.

**Figma mockup:** https://nimbus-hack-73904302.figma.site/

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Backend framework | Express.js |
| Database | PostgreSQL (via ORM/pg) |
| Frontend | React + TypeScript |
| Authentication | JWT (jsonwebtoken) + Bcrypt |
| Payments | Stripe (test mode for MVP) |
| Containerization | Docker + Docker Compose |
| Deployment | Render (backend) + Vercel (frontend) |
| Version control | GitHub |
| CI/CD | GitHub Actions |
| Dev tooling | VSCode, Postman |

---

## Project Structure

```
prim_o/
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/         # DB connection, env config
│   │   ├── controllers/    # Request handlers (auth, tokens, marketplace, users)
│   │   ├── middleware/      # verifyToken, roleGuard, errorHandler
│   │   ├── models/         # PostgreSQL table definitions / ORM models
│   │   ├── routes/         # Express route definitions
│   │   └── services/       # TokenService, AuthService, StripeService
│   ├── tests/
│   ├── .env                # Never commit — gitignored
│   ├── .env.example
│   ├── server.js
│   └── Dockerfile
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── employer/   # Dashboard, allocation form, analytics
│   │   │   └── employee/   # Wallet, history, marketplace
│   │   ├── context/        # AuthContext
│   │   ├── hooks/
│   │   └── services/       # API call wrappers
│   ├── .env.example
│   └── Dockerfile
├── docker/                 # Docker configuration files
├── docs/                   # Additional technical documentation
├── docker-compose.yml
├── .gitignore
└── CLAUDE.md               # This file
```

---

## Database Schema (PostgreSQL)

### COMPANIES
```sql
id           SERIAL PRIMARY KEY
name         VARCHAR
token_balance INTEGER  -- topped up via Stripe
created_at   TIMESTAMP
```

### USERS
```sql
id            SERIAL PRIMARY KEY
email         VARCHAR UNIQUE
password_hash VARCHAR
role          ENUM('employer', 'employee', 'admin')
token_balance INTEGER DEFAULT 0
company_id    INTEGER REFERENCES companies(id)
created_at    TIMESTAMP
```

### TOKEN_TRANSACTIONS
```sql
id                SERIAL PRIMARY KEY
sender_id         INTEGER REFERENCES users(id)
receiver_id       INTEGER REFERENCES users(id)
amount            INTEGER
reason            VARCHAR   -- 'allocation' | 'purchase' | 'marketplace_claim'
stripe_payment_id VARCHAR   -- populated on purchase transactions
created_at        TIMESTAMP
```

### VOUCHERS
```sql
id           SERIAL PRIMARY KEY
partner_name VARCHAR
description  TEXT
token_cost   INTEGER
promo_code   VARCHAR
available    BOOLEAN DEFAULT TRUE
created_at   TIMESTAMP
```

### REDEMPTIONS
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id)
voucher_id  INTEGER REFERENCES vouchers(id)
promo_code  VARCHAR
redeemed_at TIMESTAMP
```

**Key cardinalities:**
- `Companies ↔ Users` : One-to-Many
- `Users ↔ Redemptions` : One-to-Many
- `Vouchers ↔ Redemptions` : One-to-Many
- `Users ↔ Token_Transactions` : One-to-Many (as sender or receiver)

---

## API Routes Reference

### Auth
| Method | Route | Role | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register a new account |
| POST | /api/auth/login | Public | Login, returns JWT + refreshToken |
| POST | /api/auth/logout | Any | Invalidate token |
| GET | /api/auth/me | Any | Get current user profile |
| POST | /api/auth/refresh | Any | Refresh JWT |

### Users
| Method | Route | Role | Description |
|---|---|---|---|
| GET | /api/users | Admin/Employer | List users (filter by role, companyId) |
| GET | /api/users/:id | Any | Get user details |
| PUT | /api/users/:id | Any | Update user profile |
| DELETE | /api/users/:id | Admin | Delete a user |
| GET | /api/users/:id/history | Any | Get token activity history |

### Tokens
| Method | Route | Role | Description |
|---|---|---|---|
| POST | /api/tokens/allocate | Employer | Allocate tokens to employee |
| GET | /api/tokens/balance/:userId | Any | Get token balance |
| GET | /api/tokens/transactions | Any | List transactions (filter by userId, date) |
| GET | /api/tokens/transactions/:id | Any | Get transaction details |
| POST | /api/tokens/webhook | Public (Stripe) | Inbound Stripe webhook — credits tokens on payment success |

### Marketplace
| Method | Route | Role | Description |
|---|---|---|---|
| GET | /api/marketplace/items | Employee | List available vouchers |
| GET | /api/marketplace/items/:id | Employee | Get voucher details |
| POST | /api/marketplace/items | Admin | Create a voucher |
| PUT | /api/marketplace/items/:id | Admin | Update a voucher |
| DELETE | /api/marketplace/items/:id | Admin | Delete a voucher |
| POST | /api/marketplace/redeem | Employee | Redeem tokens for a promo code |
| GET | /api/marketplace/orders | Employee | List own redemption history |

---

## Security Rules — NEVER BYPASS

- ALL token movement routes require `verifyToken` middleware
- ALL employer-only routes require `roleGuard('employer')` middleware
- ALL admin-only routes require `roleGuard('admin')` middleware
- Token allocation and redemption use **PostgreSQL transactions (COMMIT/ROLLBACK)** — no partial writes
- Passwords are hashed with **bcrypt (min 12 rounds)** before storage
- JWT secret lives in `.env` — never hardcoded, never logged
- Stripe webhook signature verified with `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`
- Raw card data never touches the backend — Stripe.js handles it client-side
- `.env` is gitignored — use `.env.example` with empty values for documentation
- Never trust client-side token balances — always recompute server-side

---

## Critical Business Logic

### Token Purchase (via Stripe)
1. Employer selects an amount → `POST /tokens/purchase` hits Token Service
2. Token Service creates a `PaymentIntent` server-side via Stripe API → returns `client_secret`
3. React uses `client_secret` to render the Stripe.js payment form
4. On `payment_intent.succeeded` webhook → Token Service `INSERT`s into `TOKEN_TRANSACTIONS` and credits `companies.token_balance`
5. On failure → Stripe returns error to React; database is untouched

### Token Allocation
- Employer selects employee + amount + optional reason
- Deducts from `companies.token_balance`
- Credits `users.token_balance` for the employee
- Inserts a row into `TOKEN_TRANSACTIONS` (reason: `'allocation'`)
- Triggers push notification to employee
- **Must be atomic** — use a PostgreSQL transaction (BEGIN / COMMIT / ROLLBACK)

### Voucher Redemption
- Check `vouchers.available = TRUE` and employee has sufficient balance
- Open a PostgreSQL transaction:
  - `UPDATE users SET token_balance = token_balance - cost WHERE id = :userId`
  - `INSERT INTO redemptions (user_id, voucher_id, promo_code, redeemed_at) VALUES (...)`
- `COMMIT` on success → return `promo_code` to employee
- `ROLLBACK` on any failure → return `403 Forbidden`

---

## API Response Conventions

- Success: `{ success: Boolean, data: any, message: String }`
- Error: `{ error: String, code: Integer }`
- All protected endpoints require `Authorization: Bearer <token>` header
- Dates are ISO 8601 (`2026-05-19T10:00:00Z`)
- All IDs are PostgreSQL `SERIAL` / `INTEGER` primary keys

---

## Dev Commands

```bash
# Backend — http://localhost:5000
cd server
npm install
npm run dev          # nodemon server.js
npm test             # jest + supertest

# Frontend — http://localhost:3000
cd client
npm install
npm start

# Docker (full stack — recommended)
docker-compose up --build
docker-compose down

# PostgreSQL
# Connection string lives in server/.env as DATABASE_URL
```

---

## Environment Variables

### server/.env (never commit — copy from server/.env.example)
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/primo_dev
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### client/.env (copy from client/.env.example)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
```

---

## Code Conventions

- **Async/await** everywhere — no raw `.then()` chains
- **Try/catch** wrapping all DB operations
- Controllers stay thin — business logic goes in `/services` (TokenService, AuthService, StripeService)
- Use **named exports** in services/utils, **default exports** in React components
- TypeScript strict mode enabled on frontend

---

## Git Workflow (GitHub Flow)

- `main` — production-ready only, protected. Direct pushes blocked.
- `feature/*` branches created from `main` for every feature or fix (e.g. `feature/token-purchase`, `feature/stripe-webhook`)
- Merged into `main` via PR after review, then deleted
- PRs require **one peer review** (Loïc ↔ Véronique) — no self-merging
- Commit format: `type(scope): description` (e.g., `feat(auth): add JWT middleware`)
- Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`

---

## CI/CD Pipeline (GitHub Actions)

Triggers on push to `feature/*` and on PRs targeting `main`:

```
├── lint      ESLint + Prettier check
├── test      Jest unit + Supertest integration (PostgreSQL service container)
├── build     Docker image build (front + back)
└── deploy    (post-merge to main) → deploy to staging
```

Secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `DATABASE_URL`) stored in GitHub repository secrets — never hardcoded.

---

## QA Strategy

| Test Type | Scope | Framework |
|---|---|---|
| Unit tests | `TokenService`, `AuthService`, `StripeService` — token allocation logic, balance checks, JWT generation/verification, bcrypt comparison | Jest |
| Integration tests | API routes end-to-end against a test PostgreSQL DB (seeded with fixtures). Each route group gets a suite validating HTTP status codes, response shapes, and DB state after mutations. | Supertest + Jest |
| Manual QA | Critical flows (employer buying tokens, employee redeeming a voucher) tested against Stripe test environment using card `4242 4242 4242 4242`. | — |

**Definition of Done:** All existing tests pass in CI · new service-layer logic has unit tests · PR reviewed and approved · no ESLint/Prettier errors · Stripe-touching features manually tested.

---

## Frontend Components

| Component / Page | Type | Description |
|---|---|---|
| `HomePage` | Page | Public landing page |
| `LoginPage` | Page | Email + password login |
| `RegisterPage` | Page | Account creation (Employer or Employee) |
| `EmployerDashboard` | Page | Employee list + token distribution |
| `AdminDashboard` | Page | List of employers |
| `Catalogue` | Page | Marketplace — available vouchers |
| `Profil` | Page | Personal info + security settings |
| `Parameters` | Page | App preferences + notifications |
| `Navbar` | Layout | Persistent navigation |
| `TokenBalance` | UI | Real-time token balance |
| `TotalTokenBalance` | UI | Employer's remaining distribution budget |
| `TransferForm` | UI | Select employee + input token amount |
| `CategoryFilter` | UI | Filter vouchers by category (Food, Tech, Leisure…) |

---

## Current Sprint (Phase A — May 2026)

- [x] Week 1: Backlog finalized, User Stories written (MoSCoW)
- [x] Week 2: Wireframes (Figma) + visual identity
- [x] Week 3: DB schema + API specification locked
- [ ] Week 4: Boilerplate setup + PostgreSQL connected + JWT + Stripe baseline

**Nothing is coded yet. Start from scratch following the structure above.**

---

## What to Always Do

- Check for existing middleware before writing new validation logic
- Use PostgreSQL transactions (BEGIN/COMMIT/ROLLBACK) for ANY multi-table write involving tokens
- Test auth and role guards on every new route before business logic
- Keep Docker Compose in sync when adding new services or env vars
- Verify Stripe webhook signature before processing any payment event
- Update this CLAUDE.md when architecture decisions change

## What to Never Do

- Never hardcode secrets, API keys, connection strings, or Stripe keys
- Never skip server-side validation by trusting frontend input
- Never write a token operation without a corresponding row in `TOKEN_TRANSACTIONS`
- Never merge directly to `main`
- Never commit `.env` files
- Never let raw card data reach the backend — always use Stripe.js client-side
