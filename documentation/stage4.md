# PRIM'O — MVP Development & Sprint Documentation

## Project Overview

**PRIM'O** is a B2B2C SaaS platform enabling real-time meritocratic recognition in SMEs.  
Employers allocate tokens to employees instantly upon observed performance.  
Employees redeem tokens for exclusive vouchers (promo codes) via an integrated marketplace.

**Team :** Loïc Cerqueira (Tech Lead / Security) · Véronique Beauvais (UX / Data)  
**Stage 4 period :** May 26 – July 2, 2026  
**Repository :** [github.com/Veroniquebvs/prim_o](https://github.com/Veroniquebvs/prim_o)

---

## MVP Goal

The goal of this MVP is to :
- Deliver a fully functional platform allowing employers to purchase tokens via Stripe and instantly allocate them to employees.
- Provide employees with a mobile-friendly interface to view their balance, browse the marketplace, and redeem vouchers.
- Introduce a **Manager** tier (new role added during development) so team leads can distribute tokens to their collaborators independently.
- Establish a secure, tested architecture ready for a pilot deployment with real SME customers.

---

## 0. Sprint Planning

### Objective
Structure development into four focused sprints, each with a clear scope and deliverables, to cover the full stack in five weeks.

### Methodology: MoSCoW (inherited from Stage 3)

| Priority | Description |
|---|---|
| **Must Have** | JWT authentication, token allocation (atomic), Stripe payment flow, voucher marketplace, admin and employer dashboards. |
| **Should Have** | Employee push notifications, transaction history, employer analytics feed. |
| **Could Have** | Manager role, scheduled allocations, avatar customization, QR-code onboarding. |
| **Won't Have** | Geolocation, multi-language support, native mobile app (beyond MVP scope). |

### Sprint Structure

- **Duration :** ~1–2 weeks per sprint.
- **Tools :** GitHub Projects for issue tracking, GitHub Flow for SCM, Postman for API validation.
- **Roles :** 
  - **Loïc :** Backend architecture, API, security, DevOps (Render deployment).
  - **Véronique :** Frontend (React/TypeScript), UX, Vercel deployment.
- **Merge policy :** All work goes through `feature/*` or `dev` branches, reviewed via PR before merging into `main`. No direct pushes to `main`.

---

## 1. Sprint 1 — Foundation (May 26 – June 7, 2026)

### Goal
Stand up the project skeleton : Express server, PostgreSQL models, JWT authentication, and core middleware.

### Completed Tasks

**Backend**
- Initialized Node.js project with Express.js, ESLint, and Prettier.
- Configured PostgreSQL connection via Sequelize ORM.
- Implemented all database models : `User`, `Company`, `TokenTransaction`, `Voucher`, `Redemption`, `Team`, `TeamMember`, `ScheduledAllocation`, `Favorite`.
- Scaffolded all route/controller/service layers for `auth`, `users`, `tokens`, `marketplace`, `companies`.
- Implemented `verifyToken` JWT middleware with unit tests.
- Implemented `roleGuard` middleware (employer / employee / admin / manager).
- Set up `.env` / `.env.example` with all required secrets (never committed).
- Added `/health` endpoint for uptime monitoring.

**Infrastructure**
- Set up root workspace `package.json` with client/server sub-projects.
- Added GitHub Actions workflow triggering on `feature/*` pushes and PRs to `main`.

### Deliverable
A running Express server connected to PostgreSQL, with auth working end-to-end (register → login → JWT → protected route).

---

## 2. Sprint 2 — Core Services & API (June 8 – June 18, 2026)

### Goal
Implement the full backend business logic : token system, Stripe integration, and marketplace.

### Completed Tasks

**Token System**
- Implemented `TokenService` with atomic allocation logic (PostgreSQL `BEGIN / COMMIT / ROLLBACK`).
- `POST /api/tokens/allocate` : debits company balance, credits employee balance, inserts `TOKEN_TRANSACTIONS` row in a single transaction.
- `GET /api/tokens/balance/:userId` : server-side balance recompute.
- `GET /api/tokens/transactions` and `GET /api/tokens/transactions/:id`.

**Stripe Integration**
- `POST /api/tokens/purchase` : creates a `PaymentIntent` server-side, returns `client_secret`.
- `POST /api/tokens/webhook` : verifies Stripe signature with `stripe.webhooks.constructEvent()`, credits `companies.token_balance` on `payment_intent.succeeded`.
- Raw card data never touches the backend : `Stripe.js` handles it client-side.

**Marketplace**
- Full voucher CRUD for admins (`POST`, `PUT`, `DELETE /api/marketplace/items`).
- `GET /api/marketplace/items` with category and cost filters.
- `POST /api/marketplace/redeem`  atomic redemption : deducts employee tokens, inserts `redemptions` row, returns promo code.
- `GET /api/marketplace/orders`  employee redemption history.

**Companies**
- `GET /api/companies` : list companies (admin).
- `GET /api/companies/:id` : company detail with associated employees.
- `POST /api/companies` : create company.

**Extras added beyond original spec**
- `POST /api/upload` : image upload endpoint for voucher artwork.
- `GET /api/favorites` · `POST /api/favorites` · `DELETE /api/favorites/:id` : employee favorites system for vouchers.
- `GET/POST/PUT/DELETE /api/scheduled-allocations` : recurring token allocations (cron-driven, monthly/annual, per-employee or company-wide with exclusion list).

**Frontend scaffold**
- Initialized React + TypeScript project (Vite).
- Implemented `AuthContext` with JWT persistence.
- Set up routing : public pages + `ProtectedRoute` with role-based redirect.
- Created `LoginPage`, `RegisterPage`, `HomePage`.
- Added `ErrorBoundary` component.

### Deliverable
A complete, tested backend API. Stripe payment flow validated end-to-end with test card `4242 4242 4242 4242`. Frontend routing and auth context functional.

---

## 3. Sprint 3 — Frontend Features (June 19 – June 25, 2026)

### Goal
Build all role-specific UI dashboards and introduce the Manager tier.

### Completed Tasks

**Employer Dashboard**
- Company budget stat card + team size counter.
- `TransferForm` : select employee, input amount, optional reason (via `MotifSelectionModal`), confirm allocation.
- `PrintableQRCode` : generates a QR code poster for employee self-onboarding.
- Pending employee validation (approve entry date before activating account).
- Scheduled allocation manager : create/edit/toggle/delete recurring rules with modal form.
- Real-time activity feed toggle (`feedback_enabled` flag per company).
- Manager list table.

**Manager Role (new role, not in original Stage 3 spec)**
- New `role: 'manager'` added to `USERS` table.
- `Team` and `TeamMember` models for grouping employees under a manager.
- `POST /api/manager/promote` : employer promotes an employee to manager and creates their team.
- Manager-specific `PourToi` dashboard : lists collaborators, allocates tokens to them.
- `CollaborateurDetail` page : read-only view of collaborator profile, balance history, stats.

**Employee Pages**
- `Catalogue` : marketplace with `CategoryFilter`, carousel rows by category, favorites toggle.
- `VoucherDetail` : full voucher page with redemption CTA and promo code display.
- `CategorieDetail` : filtered view per category.
- `Historique` : color-coded token transaction history (received / spent).
- `Profil` : personal info, avatar picker (`AvatarPickerModal`), account settings.
- `Parameters` : notification preferences, subscription info, FAQ, CGU links.
- `Panier` : cart managed by `useCart` hook with local persistence.
- `Avis` : review/feedback page.

**Admin Pages**
- `AdminDashboard` : company list with token budgets.
- `AdminCompanyDetail` : per-company drill-down with colored token balance indicator.
- `AdminBons` : voucher catalog management.
- `AdminVoucherDetail` : edit/delete individual voucher.
- `AdminRachats` : redemption log.
- `AdminStats` : global platform statistics.
- `AdminStatMotifs`, `AdminStatRachats`, `AdminTauxRachat` : analytics sub-pages.

**Layout & Navigation**
- `Layout` component — role-aware : renders `TotalTokenBalance` for employers, `TokenBalance` for employees/managers, wraps every protected page.
- `BottomNav` and `TopNav` : persistent navigation with swipe-to-go-back gesture support.
- `SplashScreen` : animated intro on first load.

**UI Components added**
- `AvatarPickerModal` : 10-avatar selection palette, persisted via `PUT /api/users/:id`.
- `CompanySelectionModal`, `TargetSelectionModal`, `UserSelectionModal` : reusable selection modals.
- `CarouselRow` : horizontal scroll row for voucher categories.

### Deliverable
Full UI for all three roles (employer, employee, admin) plus the new manager role. Mobile-first, responsive layout with swipe navigation.

---

## 4. Sprint 4 — QA, Testing & Polish (June 26 – July 2, 2026)

### Goal
Write comprehensive test suites, fix identified bugs, and ship production-ready formatting and UI polish.

### Completed Tasks

**Test suites written**
- `auth.service.test.js` : unit tests for `AuthService` (register, login, JWT generation, bcrypt comparison).
- `auth.integration.test.js` full route coverage : `POST /register`, `POST /login`, `GET /profile`, `POST /refresh`.
- `token.service.test.js` unit tests for `TokenService` (allocate with insufficient balance → 402, successful allocation → commit, intermediate failure → rollback, `getBalance`, `listTransactions`).
- `tokens.integration.test.js` route-level tests for all `/api/tokens/*` endpoints.
- `stripe.service.test.js` unit tests for `StripeService` (PaymentIntent creation, webhook verification).
- `marketplace.service.test.js` unit tests for `MarketplaceService` (list items, redeem with sufficient/insufficient balance, atomic rollback on failure).
- `marketplace.integration.test.js` end-to-end route tests for `/api/marketplace/*`.
- `users.service.test.js` unit tests for `UsersService`.
- `users.integration.test.js` route coverage for `/api/users/*`.
- `verifyToken.test.js` middleware tests (valid token, expired token, missing header).
- `roleGuard.test.js` middleware tests (correct role passes, wrong role → 403, no user → 401).

**Bug fixes**
- Fixed CORS configuration preventing frontend calls from Vercel domain.
- Fixed layout structure, duplicate/missing closing tags in `Layout.tsx` and `PourToi.tsx`.
- Fixed top-nav link visibility on white-background pages.
- Fixed `scheduled.service` crash when the API returns an error ; added error boundary around fetch.
- Fixed voucher and transaction ID mismatches in seed scripts.
- Fixed avatar index resolution returning `undefined` on fresh profiles.
- Disabled verbose Sequelize logging during schema sync in development.

**Polish**
- `formatTokens` utility — consistent token number formatting across all pages (e.g., `1 250 ₮`).
- Logo image replaced with styled text fallback on `HomePage` (image load failure recovery).
- Admin company detail page : colored token balance backgrounds (green / orange / red tiers).
- `Layout` component made fully responsive with role-based token display switching.

### Deliverable
11 test files covering auth, tokens, marketplace, users, and middleware. All bugs from integration testing resolved. Platform deployed to production on Render + Vercel.

---

## 3. Sprint Reviews

### Sprint 1 Review (June 7, 2026)

**Demonstrated :**
- Express server running and responding to `/health`.
- `POST /api/auth/register` → `POST /api/auth/login` → protected `GET /api/auth/profile` flow working end-to-end with JWT.
- All Sequelize models in sync with the PostgreSQL schema.
- `verifyToken` middleware blocking unauthenticated requests.

**Acceptance :** Backend skeleton validated. Database schema locked and matches Stage 3 specification.

---

### Sprint 2 Review (June 18, 2026)

**Demonstrated :**
- Stripe flow : employer selects amount → `PaymentIntent` created → Stripe.js form → payment confirmed → webhook fires → `companies.token_balance` incremented.
- Token allocation : employer allocates 50 tokens to an employee → company balance decremented, employee balance incremented, `TOKEN_TRANSACTIONS` row inserted ; all in a single atomic transaction.
- Marketplace : employee browses vouchers, redeems one → tokens deducted, promo code returned, `redemptions` row inserted.
- Stripe test card `4242 4242 4242 4242` validated.
- Favorites and scheduled allocation endpoints working.

**Acceptance :** All Must Have backend features delivered. Stripe webhook signature verification confirmed. Atomic transaction rollback on failure verified manually.

---

### Sprint 3 Review (June 25, 2026)

**Demonstrated :**
- Employer logs in → sees dashboard with company budget and employee list → allocates tokens via `TransferForm` modal → employee instantly sees updated balance.
- Employee logs in → browses marketplace → filters by category → opens `VoucherDetail` → redeems voucher → promo code displayed.
- Manager role : employer promotes employee → manager logs in → sees their team via `PourToi` → allocates tokens to a collaborator.
- QR code poster generated and printable.
- Scheduled allocation rule created (monthly, all employees, 10 tokens) → triggers automatically via cron.
- Admin dashboard : company list, per-company token drill-down, voucher CRUD.
- Avatar selection : employee picks avatar → persisted across sessions.

**Acceptance :** Full user journey demonstrated for all four roles (admin, employer, manager, employee). Mobile-first layout validated on Chrome DevTools (375px iPhone viewport). Swipe-to-go-back gesture functional.

---

### Sprint 4 Review (July 2, 2026)

**Demonstrated :**
- `npm test` runs all 11 test suites ; all passing in CI.
- Postman collection : all API routes validated with correct status codes and response shapes.
- Production URLs live : Vercel frontend + Render backend communicating correctly.
- `formatTokens` utility rendering consistent token display across all pages.
- Bug regression : all fixed issues confirmed resolved on production build.

**Acceptance :** Definition of Done met — CI green, peer review approved, no ESLint errors, Stripe-touching flows manually tested.

---

## 4. Retrospectives

### Sprint 1 Retrospective

| Topic | Notes |
|---|---|
| ✅ What went well | Clean project scaffold from day one. Sequelize models matched the Stage 3 schema with no structural changes needed. Conventional Commits enforced from the first PR, keeping history readable. |
| ⚠️ What didn't | Initial Express configuration caused duplicate route registrations — caught early via the health check. Setting up the GitHub Actions PostgreSQL service container took longer than expected. |
| 🔧 What to improve | Document environment variable setup in `.env.example` more completely. Write middleware tests at the same time as the middleware itself, not after. |

---

### Sprint 2 Retrospective

| Topic | Notes |
|---|---|
| ✅ What went well | Stripe webhook integration worked first try thanks to careful signature verification setup. Atomic transactions (BEGIN/COMMIT/ROLLBACK) gave immediate confidence in data integrity under failures. |
| ⚠️ What didn't | CORS misconfiguration blocked the first frontend-to-backend call in staging — wasted half a day. Seed scripts had voucher ID mismatches that broke the first manual QA pass. |
| 🔧 What to improve | Add CORS configuration to the `.env.example` comments. Validate seed scripts against the live schema before each sprint QA session. |

---

### Sprint 3 Retrospective

| Topic | Notes |
|---|---|
| ✅ What went well | The Manager role was not in the original spec but was identified as a genuine user need during UX review and implemented cleanly by adding a new role, two new models, and a new route group without touching existing flows. Avatar picker was a quick win that significantly improved the feel of the app. |
| ⚠️ What didn't | Layout closing-tag bugs caused a white-screen crash in production — caught by Véronique during QA after merge. Top-nav links were invisible on white-background pages for nearly two days before the fix. The `scheduled.service` fetch crashed the employer dashboard on a network error. |
| 🔧 What to improve | Add `ErrorBoundary` coverage at the route level, not just the app root. Review every new component for both light and dark background contrast before merging. |

---

### Sprint 4 Retrospective

| Topic | Notes |
|---|---|
| ✅ What went well | Comprehensive test suites caught two edge cases in `TokenService` (insufficient balance returning the wrong HTTP code, rollback not being called on model-level failures) before they reached production. |
| ⚠️ What didn't | Test setup time was higher than expected because models needed to be fully mocked — the mocking boilerplate is verbose. Avatar index resolution bug only appeared on fresh profiles with no saved avatar ; it was not caught by any test because the tests always seeded a valid avatar index. |
| 🔧 What to improve | Write a test fixture helper to reduce mocking boilerplate. Add edge-case tests for zero-state profiles (new user, empty balance, no redemptions). |

---

## 5. Source Repository

**URL :** [https://github.com/Veroniquebvs/prim_o](https://github.com/Veroniquebvs/prim_o)

### Branching Strategy — GitHub Flow

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only. Protected — direct pushes blocked. All changes go through a PR. |
| `dev` | Integration branch — features are merged here first before going to `main`. |
| `feature/*` | One branch per feature or fix (e.g. `feature/improve_front`, `feature/tests`). Created from `dev` or `main`, merged via PR. |

### Pull Request Summary

| PR | Branch | Description | Status |
|---|---|---|---|
| #1 | feature/init | Initialize Express server | Merged |
| #4 | feature.data | Implement DB models | Merged |
| #5 | feature/init | Add middleware, ESLint, Prettier | Merged |
| #18 | feat/front | Scaffold frontend routing and layout | Merged |
| #19 | feat/doc | Add Stage 3 technical documentation | Merged |
| #20–#27 | feature/improve_front | Iterative frontend feature delivery | Merged |
| #28 | dev | Admin, Stripe, token service | Merged |
| #29 | feature/tests | Full test suite (11 test files) | Merged |
| #30 | dev | Scheduled allocations, QR codes | Merged |
| #31 | feature/improve_front | Responsive layout, swipe nav | Merged |
| #32 | dev | Admin polish, avatar management | Merged |

**Total commits :** 241  
**Commit format :** `type(scope): description` — `feat`, `fix`, `chore`, `refactor`, `test`, `docs`

---

## 6. Bug Tracking

Bugs were identified through manual QA sessions, code review comments, and CI failures. Each was fixed in a dedicated `fix:` commit and merged via PR.

| # | Bug | Severity | Found In | Fix |
|---|---|---|---|---|
| B-01 | CORS misconfiguration blocked all frontend API calls on staging | High | Sprint 2 QA | Added `FRONTEND_URL` to CORS allowed origins in server config |
| B-02 | `Layout.tsx` / `PourToi.tsx` had duplicate/missing closing JSX tags → white-screen crash | High | Sprint 3 post-merge | Corrected JSX tree structure in both components |
| B-03 | Top-nav links invisible on white-background pages (manager/employee) | Medium | Sprint 3 QA | Set explicit dark color on `TopNav` link styles |
| B-04 | `scheduled.service` fetch threw unhandled exception → crashed employer dashboard | Medium | Sprint 3 QA | Wrapped fetch in `try/catch`, returns empty array on error |
| B-05 | Voucher and transaction IDs mismatched in seed scripts | Medium | Sprint 2 QA | Re-aligned IDs in all seed files against live schema |
| B-06 | Avatar index returned `undefined` for fresh profiles without saved avatar | Low | Sprint 4 discovery | Added fallback to index `0` in `resolveAvatarIndex()` |
| B-07 | Sequelize logged verbose schema sync output in development → polluted console | Low | Sprint 2 dev | Set `logging: false` on `sync()` in development config |
| B-08 | `.env` file added to `.gitignore` after initial commit (was momentarily tracked) | Critical | Sprint 1 | Removed from tracking with `git rm --cached`, rotated secrets |

---

## 7. Testing Evidence and Results

### Test Stack

| Tool | Role |
|---|---|
| **Jest** | Test runner and assertion library |
| **Supertest** | HTTP integration testing against the Express app |
| **Mocked Sequelize** | DB layer mocked per test file — no real PostgreSQL needed for unit/integration tests |

### Test Suites

| File | Type | Cases Covered |
|---|---|---|
| `auth/auth.service.test.js` | Unit | `register()` hashes password, creates user · `login()` rejects bad password · JWT generation produces valid token · `bcrypt.compare` correctly validates hashes |
| `auth/auth.integration.test.js` | Integration | `POST /register` → 201 + token · `POST /login` → 200 + JWT + refreshToken · `GET /profile` without token → 401 · `POST /refresh` with valid refreshToken → 200 + new JWT |
| `tokens/token.service.test.js` | Unit | `allocate()` with insufficient company balance → 402 · successful allocation → company decremented, receiver incremented, `TokenTransaction` created, `commit()` called · error mid-allocation → `rollback()` called · `getBalance()` returns user balance · `listTransactions()` returns array |
| `tokens/tokens.integration.test.js` | Integration | `POST /allocate` → 200 · `GET /balance/:userId` → 200 + balance · `GET /transactions` → 200 + array · `GET /transactions/:id` → 200 + object |
| `tokens/stripe.service.test.js` | Unit | `createPaymentIntent()` calls Stripe SDK with correct params · `constructWebhookEvent()` throws on invalid signature · valid event returns structured object |
| `marketplace/marketplace.service.test.js` | Unit | `listItems()` returns available vouchers · `redeemVoucher()` with insufficient balance → 402 · successful redemption → user balance decremented, redemption inserted, commit called · failure during INSERT → rollback called |
| `marketplace/marketplace.integration.test.js` | Integration | `GET /items` → 200 + array · `POST /redeem` authenticated employee → 200 + promoCode · `POST /redeem` without token → 401 · `POST /items` employee (not admin) → 403 |
| `users/users.service.test.js` | Unit | `getById()` returns user · `update()` hashes new password if provided · `delete()` calls model destroy |
| `users/users.integration.test.js` | Integration | `GET /users` employer → 200 · `GET /users/:id` → 200 · `PUT /users/:id` own profile → 200 · `DELETE /users/:id` non-admin → 403 |
| `middleware/verifyToken.test.js` | Unit | Valid Bearer token → `req.user` populated · Expired token → 401 · Missing Authorization header → 401 · Malformed token → 401 |
| `middleware/roleGuard.test.js` | Unit | Correct role → `next()` called · Wrong role → 403 · No `req.user` → 401 |

### CI Results

All 11 test suites pass in the GitHub Actions pipeline on every push to `feature/*` and every PR targeting `main`.

```
PASS  tests/auth/auth.service.test.js
PASS  tests/auth/auth.integration.test.js
PASS  tests/tokens/token.service.test.js
PASS  tests/tokens/tokens.integration.test.js
PASS  tests/tokens/stripe.service.test.js
PASS  tests/marketplace/marketplace.service.test.js
PASS  tests/marketplace/marketplace.integration.test.js
PASS  tests/users/users.service.test.js
PASS  tests/users/users.integration.test.js
PASS  tests/middleware/verifyToken.test.js
PASS  tests/middleware/roleGuard.test.js

Test Suites: 11 passed, 11 total
```

### Manual QA

Critical flows tested against the Stripe test environment:

| Flow | Test Card | Result |
|---|---|---|
| Employer purchases 500 tokens | `4242 4242 4242 4242` | ✅ Webhook received, `companies.token_balance` incremented |
| Employer allocates 50 tokens to employee | — | ✅ Balances updated atomically, `TOKEN_TRANSACTIONS` row inserted |
| Employee redeems voucher (200 tokens) | — | ✅ Promo code returned, balance deducted, `redemptions` row inserted |
| Employee redeems with insufficient balance | — | ✅ 403 returned, no DB change |
| Stripe webhook with invalid signature | — | ✅ 400 returned, no tokens credited |

---

## 8. Production Environment

### Architecture

```
Browser / Mobile
       │
       ▼
  Vercel (CDN)
  React + TypeScript
  prim-o.vercel.app
       │
       │ HTTPS REST API
       ▼
  Render (Web Service)
  Node.js + Express
  prim-o-api.onrender.com
       │
       ▼
  PostgreSQL (Render DB)
       │
       ▼
  Stripe API (test mode)
```

### Services

| Service | Provider | URL | Notes |
|---|---|---|---|
| Frontend | Vercel | `prim-o.vercel.app` | Auto-deploys on merge to `main` |
| Backend API | Render | `prim-o-api.onrender.com` | Web Service — auto-deploys on merge to `main` |
| Database | Render PostgreSQL | Internal connection string | Managed, daily backups |
| Payments | Stripe | — | Test mode — no real charges |

### Environment Variables (production)

All secrets injected at runtime from platform environment variable stores ; never committed to the repository.

**Render (backend) :**
```
PORT
NODE_ENV=production
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FRONTEND_URL
```

**Vercel (frontend) :**
```
VITE_API_URL
VITE_STRIPE_PUBLIC_KEY
```

### Deployment Flow

```
git push origin feature/*
        │
        ▼
GitHub Actions CI
├── lint     ESLint + Prettier
├── test     Jest (11 suites)
└── build    Vite (frontend) + Node (backend)
        │
        ▼ (on merge to main)
Render auto-deploy (backend)
Vercel auto-deploy (frontend)
```

---

## MVP Delivery Summary

| Feature | Status | Notes |
|---|---|---|
| JWT Authentication (register / login / refresh / logout) | ✅ | bcrypt 12 rounds, refresh token rotation |
| Role-based access (employer / employee / admin) | ✅ | `roleGuard` middleware on all protected routes |
| Manager role + team management | ✅ | Added beyond original spec; employer promotes employees to manager |
| Stripe token purchase | ✅ | PaymentIntent flow, webhook verification |
| Token allocation (atomic) | ✅ | PostgreSQL transaction, company + user balance update |
| Scheduled allocations (cron) | ✅ | Monthly / annual, per-employee or company-wide |
| Voucher marketplace | ✅ | Category filter, carousel display, favorites |
| Voucher redemption (atomic) | ✅ | Promo code returned, rollback on failure |
| Employee token history | ✅ | Color-coded feed (received / spent) |
| Employer analytics feed | ✅ | Real-time activity toggle per company |
| QR code onboarding | ✅ | Printable poster for employee registration |
| Avatar customization | ✅ | 10-avatar palette, persisted server-side |
| Admin dashboard + analytics | ✅ | Company management, voucher CRUD, redemption stats |
| Unit tests (service layer) | ✅ | auth, tokens, marketplace, users, Stripe |
| Integration tests (API routes) | ✅ | All route groups covered |
| CI/CD pipeline | ✅ | GitHub Actions → Render + Vercel |
| Production deployment | ✅ | Live on Render (API) + Vercel (frontend) |
| Dark mode | ❌ | Out of scope for MVP |
| Native push notifications | ⚙️ | UI toggle present; backend hook in place; delivery not wired |

---

## What's Next

1. Wire push notification delivery (FCM / APNs) to the existing `feedback_enabled` toggle.
2. Add image upload to the voucher creation form (Cloudinary or Supabase storage).
3. Implement email confirmation on registration.
4. Add employer analytics charts (token spend over time, top performers).
5. Conduct a security audit and penetration test before onboarding the first pilot SME.
6. Migrate Stripe from test mode to live mode.

---

## Acknowledgements

We would like to thank our instructors and the entire cohort for their feedback throughout the sprints.

This project pushed us beyond the original spec — the Manager role, scheduled allocations, QR-code onboarding, and avatar system were all born from real UX insights during development, not from the initial backlog. Building a production-deployed, fully-tested full-stack SaaS in five weeks was ambitious, and it taught us the value of atomic database transactions, early CI setup, and never skipping peer review — even under deadline pressure.

---

**© 2026 — PRIM'O**  
Developed by **Loïc Cerqueira** & **Véronique Beauvais**  
*"Recognise performance. Instantly."*
