# Technical Documentation — PRIM'O MVP

PRIM'O is a B2B SaaS platform enabling real-time meritocratic recognition in SMEs. Employers allocate tokens to employees, who exchange them for vouchers on an integrated marketplace. This document covers the full technical architecture of the MVP, serving as the primary reference for system design, API contracts, database structure, and QA practices.

---
## Table of Contents

- [0. User Stories and Mockup](#0-user-stories-and-mockup)
  - [0.1 Prioritized User Stories (MoSCoW)](#01-prioritized-user-stories-moscow)
    - [0.1.1 Must Have (MVP Core)](#011-must-have-mvp-core)
    - [0.1.2 Should Have](#012-should-have)
    - [0.1.3 Could Have](#013-could-have)
    - [0.1.4 Won't Have (Next Phase)](#014-wont-have-next-phase)
- [1. Design System Architecture](#1-design-system-architecture)
- [2. Components, Classes, and Database Design](#2-components-classes-and-database-design)
  - [2.1 Class Descriptions](#21-class-descriptions)
    - [2.1.1 Class: User](#211-class-user)
    - [2.1.2 Class: TokenTransaction](#212-class-tokentransaction)
    - [2.1.3 Class: Voucher](#213-class-voucher)
  - [2.2 Database Design & Relational Logic](#22-database-design--relational-logic)
    - [Key Cardinalities](#key-cardinalities)
  - [2.3 Components](#23-components)
- [3. High-Level Sequence Diagrams](#3-high-level-sequence-diagrams)
  - [3.1 Token Purchase by the Employer](#31-token-purchase-by-the-employer)
  - [3.2 Voucher Redemption by the Employee](#32-voucher-redemption-by-the-employee)
- [4. Document External and Internal APIs](#4-document-external-and-internal-apis)
  - [4.1 External APIs](#41-external-apis)
  - [4.2 Internal APIs](#42-internal-apis)
- [5. SCM, QA, and Deployment Lifecycle](#5-scm-qa-and-deployment-lifecycle)
  - [5.1 SCM Strategy — GitHub Flow](#51-scm-strategy--github-flow)
  - [5.2 QA Strategy](#52-qa-strategy)
  - [5.3 CI/CD Pipeline — Planned with GitHub Actions](#53-cicd-pipeline--planned-with-github-actions)
  - [5.4 Definition of Done](#54-definition-of-done)
---

## 0. User Stories and Mockup

In this section, we list what the application needs to do first. Our goal is to meet Julien and Sandrine's main requirement: rewarding hard work immediately. We have ranked these needs from most to least important to ensure that the core features (giving tokens and exchanging them for rewards) work perfectly before adding extra options. The screen designs (mockups) show how we planned a very simple and easy-to-use mobile application.

### 0.1 Prioritized User Stories (MoSCoW)

This list defines the scope of the MVP so that we can focus on the key features.

#### 0.1.1 Must Have (MVP Core)

- As an **Employer**, I want to create a company account and add my employees, so that I can manage my team on the platform.
- As an **Employer**, I want to deposit funds and convert them into tokens, so that I have a rewards budget ready for distribution.
- As an **Employer**, I want to manually attribute tokens to an employee the moment they perform well, so that the reward is instant.
- As an **Employee**, I want to see my token balance in real-time on my smartphone, so that I feel immediate recognition for my efforts.
- As an **Employee**, I want to browse a catalog of exclusive offers, so that I can see the value of my earned tokens.
- As an **Employee**, I want to exchange my tokens for a promo code in one click, so that I can use my reward immediately.

#### 0.1.2 Should Have (High Priority)

- As an **Employee**, I want to receive push notifications when I earn tokens, so that I am instantly alerted to my success.
- As an **Employer**, I want to view a history of all distributed tokens, so that I can track my rewards budget and team performance.

#### 0.1.3 Could Have (Future Enhancements)

- As an **Employee**, I want to see a "Live Feed" of peer achievements (without amounts), so that I feel part of a high-performing team culture.
- As an **Employer**, I want to set up recurring token rewards (e.g., work anniversaries), so that I can automate basic recognition.

### 0.2 Front-end Mockup

The Figma mockup covers all user roles — Employer, Employee. It illustrates the main user flows, screen layouts, and navigation structure of the platform, including the token allocation Dashboard and the voucher Marketplace.

🔗 [View Figma Mockup](https://nimbus-hack-73904302.figma.site/)

*Exemple :*
![maquette1](images/maquette1.png) ![maquette2](images/maquette2.png)




---

## 1. Design System Architecture

This section shows the technical organization of PRIM'O. The diagram illustrates how our React application communicates with our Node.js server and PostgreSQL database to ensure that tokens are assigned correctly and in real-time.

![diagram](images/diagram-package.png)

The **5 layers** identified for the MVP:

| Layer | Description |
|---|---|
| **Client & Front-end** | A mobile-friendly application built with React and TypeScript. It adapts its display automatically depending on who is logged in (Employer dashboard, Employee marketplace, or Administrator view). |
| **Back-end** | A Node.js and Express server organized into clear parts: a gateway to direct traffic, an authentication module for secure logins, and a token service that handles all the main actions (giving tokens and exchanging them for vouchers). |
| **Database** | A PostgreSQL database. This relational model naturally connects our data: a Company has multiple Users, who make Token Transactions and redeem Promo Codes. |
| **External Services** | Stripe handles all credit card payments. When an employer tops up their budget, Stripe processes the payment and alerts our server so the tokens can be safely credited. We use Stripe's test mode for this MVP phase. |
| **Infrastructure & Workflow** | Docker is used to make sure the application runs exactly the same way on all our computers. Security keys and database passwords are saved in a hidden file (`.env`) so they are never exposed on GitHub. |

---

## 2. Components, Classes, and Database Design

This section details the internal organization of PRIM'O. We have chosen to use PostgreSQL to ensure absolute data integrity, especially during token transfers. Here, we present the classes that handle business logic, the user interface components, and the relational database schema. This technical plan ensures that every transaction, from the employer's fund deposit to the employee's token exchange, is secure and traceable.

### 2.1 Class Descriptions

#### 2.1.1 Class: `User`

**Description:** Manages user identities, roles (Employer/Employee), and their associated balances.

**Attributes:**
- `id` (UUID)
- `email` (String)
- `password_hash` (String)
- `role` (Enum)
- `token_balance` (Decimal)
- `company_id` (UUID)

**Methods:**
- `authenticate()` — Handles secure user login and session management.
- `updateBalance(amount)` — Adjusts the user's token balance after a transfer or an exchange.
- `getProfileData()` — Retrieves account details for the Profile and Settings pages.

---

#### 2.1.2 Class: `TokenTransaction`

**Description:** Handles the logic for transferring tokens between accounts and maintaining a secure history.

**Attributes:**
- `id` (UUID)
- `sender_id` (UUID)
- `receiver_id` (UUID)
- `amount` (Decimal)
- `timestamp` (DateTime)

**Methods:**
- `executeTransaction()` — Performs the atomic transfer (debiting the sender and crediting the receiver).
- `validateTransaction()` — Checks if the employer has sufficient funds before processing the award.
- `getTransactionHistory(userId)` — Fetches a list of all past incoming and outgoing transactions for a specific user.

---

#### 2.1.3 Class: `Voucher`

**Description:** Manages the catalog of rewards, stock levels, and the redemption process.

**Attributes:**
- `id` (UUID)
- `partner_name` (String)
- `token_cost` (Integer)
- `promo_code` (String)
- `is_redeemed` (Boolean)

**Methods:**
- `claimVoucher(userId)` — Assigns a unique promo code to an employee and marks it as used in the database.
- `checkAvailability()` — Verifies if there is remaining stock for a specific partner offer before allowing an exchange.

---

### 2.2 ER Diagram

![diagram](images/diagram_class.png)

**5 tables** and their relational logic:

| Table | Description |
|---|---|
| **COMPANIES** | The company subscribed to PRIM'O. It holds a global `token_balance` (topped up via Stripe) and is the root of all relationships. |
| **USERS** | Stores all account information for both employers and employees. Each user is linked to their respective company via a `company_id`. The `role` field (enum: `employer` / `employee` / `admin`) is used to manage JWT-based permissions and access control. Each user maintains their own `token_balance`. |
| **TOKEN_TRANSACTIONS** | A comprehensive ledger of all token movements within the platform. Tracks **Purchase** (employer tops up budget, includes `stripe_payment_id`), **Allocation** (employer grants tokens to an employee), and **Redemption** (employee spends tokens for a voucher). Uses `sender_id` and `receiver_id` as Foreign Keys for full auditability. |
| **VOUCHERS** | The catalog of vouchers available on the marketplace (managed by admins). `token_cost` is the price in tokens; `available` allows disabling a voucher without deleting it. |
| **REDEMPTIONS** | Every voucher exchange made by an employee. Links `user_id → voucher_id` and stores the `promo_code` returned by the partner. Written during the atomic transaction. |

**Key cardinalities:**
- `Companies ↔ Users` : One-to-Many (one company has multiple employees)
- `Users ↔ Redemptions` : One-to-Many (one employee can redeem multiple vouchers)
- `Vouchers ↔ Redemptions` : One-to-Many (one voucher type can be redeemed by many users)
- `Users ↔ Token_Transactions` : One-to-Many (each user is linked to multiple transaction records as either sender or receiver)

---

### 2.3 Components

| Component / Page | Type | Description |
|---|---|---|
| `HomePage` | Page | Public landing page presenting the PRIM'O solution |
| `LoginPage` | Page | User login with password and email address |
| `RegisterPage` | Page | Creating a user account (Employer or Employee) |
| `EmployerDashboard` | Page | Management space with employee list and token distribution |
| `AdminDashboard` | Page | List of employers |
| `Catalogue` | Page | Marketplace displaying the list of available vouchers |
| `Profil` | Page | User profile page to manage personal information and security settings |
| `Parameters` | Page | User settings page for application preferences and notifications |
| `Navbar` | Layout component | Persistent navigation menu for fast switching between app sections |
| `TokenBalance` | UI component | Displays the real-time token balance for the user |
| `TotalTokenBalance` | UI component | Displays the employer's total remaining budget for token distribution |
| `TransferForm` | UI component | A form for the employer to select an employee and input the number of tokens to award |
| `CategoryFilter` | UI component | UI component used to filter rewards by theme (e.g., Food, Tech, Leisure) |

---

## 3. High-Level Sequence Diagrams

This section illustrates how the system components communicate with each other to perform the platform's two main actions. We have chosen to detail the following workflows:

- **Token Purchase by the Employer** — shows how the application manages fund deposits and the update of the company's budget.
- **Voucher Redemption by the Employee** — details the process of converting tokens into vouchers within the partner catalog.

These diagrams visualize the dialogue between the Front-end, the Back-end, and the PostgreSQL database to ensure fast and secure transactions.

### 3.1 Token Purchase by the Employer

![diagram](images/diagram_seq1.png)

The diagram covers **18 steps** across three phases:

1. **Initiation (steps 1–4):** The employer selects an amount in the React UI, which fires a `POST /tokens/purchase`. The API Gateway validates the JWT before forwarding the request to the Token Service.

2. **Stripe setup (steps 5–9):** The Token Service creates a `PaymentIntent` server-side via the Stripe API and gets back a `client_secret`. This secret travels back to the React UI, which uses it to render the secure Stripe.js payment form.

3. **Payment & settlement (steps 10–17):** The employer confirms, React calls `stripe.confirmPayment()` directly to Stripe. From here the `alt` block kicks in:
   - **On success** → Stripe fires a `payment_intent.succeeded` webhook to the Token Service, which does the `INSERT` into PostgreSQL and returns the credited balance.
   - **On failure** → Stripe returns the error to React, which displays it without touching the database.

4. **Dashboard update (step 18):** React refreshes the employer's token balance from the API.

> **N.B.:** The webhook (step 13) verifies Stripe's signature using `stripe.webhooks.constructEvent()` and the `STRIPE_WEBHOOK_SECRET` from `.env`.

---

### 3.2 Voucher Redemption by the Employee

![diagram](images/diagram_seq2.png)

The diagram covers **18 steps**, organized into 3 key phases:

1. **Browsing (steps 1–7):** The employee opens the marketplace. React sends a `GET /vouchers` request, the API Gateway validates the JWT, and the Token Service performs a `SELECT` query in PostgreSQL. It returns the list of available vouchers with their respective token costs.

2. **Selection & Validation (steps 8–11):** The employee selects a specific voucher. React sends a `POST /vouchers/redeem` request. After a new JWT security check, the request is forwarded to the Token Service.

3. **Atomic Transaction (steps 12–17):** This is the critical part of the flow, handled via an `alt` block:
   - **Sufficient Balance:** The Token Service checks the user's balance (`SELECT balance`). If valid, it opens a PostgreSQL transaction: an `UPDATE` debits the tokens from the user's account, and an `INSERT` creates a new record in the `redemptions` table with the associated promo code. If both operations succeed, a `COMMIT` is executed; otherwise, an automatic `ROLLBACK` occurs. The promo code is then sent back to the employee.
   - **Insufficient Balance:** The database returns an insufficient balance error. The Token Service sends a `403 Forbidden` status, and React displays the error message to the user.

4. **Display (step 18):** React updates the UI to show the redeemed promo code and the new token balance.

---

## 4. External and Internal APIs

This section details how PRIM'O connects and communicates with different services, divided into two main areas:

- **External APIs** — Third-party tools integrated into the platform to handle specific, secure tasks.
- **Internal APIs** — Custom endpoints created by the team. These are the technical bridges allowing the React front-end to request, send, and update information securely on the Node.js server.

### 4.1 External APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payment_intents` | Called server-side by the Token Service to open a payment session with Stripe. |
| `POST` | `/webhook` (inbound) | Stripe calls this endpoint when a payment completes; the Token Service verifies the signature with `stripe.webhooks.constructEvent()` before crediting tokens. |
| — | `Stripe.js` (client-side) | Loaded directly in the React frontend; `confirmPayment()` sends card data straight to Stripe, bypassing the backend entirely so raw card data never touches the server. |

---

### 4.2 Internal APIs

#### 4.2.1 Route Groups

![diagram](images/diagram_endpoint.png)

4 internal route groups, all behind the API Gateway's `authMiddleware` + `roleGuard`:

| Group | Color | Routes |
|---|---|---|
| **Auth** | Blue | `register`, `login`, `token refresh`, `logout`. The only group accessible without a valid JWT. |
| **Tokens** | Amber | `purchase`, `allocate to employee`, `check balance`, `transaction history`, and the inbound Stripe webhook at `/tokens/webhook`. |
| **Vouchers** | Teal | `browse catalog`, `redeem` (employee), `create` and `edit` (admin only via `roleGuard`). |
| **Users** | Purple | Self-profile read/update, plus admin-only list and delete. |

**PostgreSQL table bindings:**
- `Auth` → `USERS`
- `Tokens` → `TOKEN_TRANSACTIONS` + `COMPANIES`
- `Vouchers` → `VOUCHERS` + `REDEMPTIONS`
- `Users` → `USERS`

---

#### 4.2.2 Input / Output (JSON)

##### Auth / JWT

| Method | Endpoint | Description | Input (JSON) | Output (JSON) |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new account | `{ "email": "string", "password": "string", "role": "employer\|employee", "companyId": "integer?" }` | `{ "token": "string", "user": { "id", "email", "role" } }` |
| `POST` | `/api/auth/login` | Login | `{ "email": "string", "password": "string" }` | `{ "token": "string", "refreshToken": "string", "user": { "id", "email", "role" } }` |
| `POST` | `/api/auth/logout` | Invalidate token | `{}` (header: Bearer token) | `{ "message": "Logged out" }` |
| `GET` | `/api/auth/me` | Get current user from token | (header: Bearer token) | `{ "id": "integer", "email", "role", "companyId": "integer" }` |
| `POST` | `/api/auth/refresh` | Refresh JWT | `{ "refreshToken": "string" }` | `{ "token": "string" }` |

---

##### Users

| Method | Endpoint | Description | Input (JSON) | Output (JSON) |
|---|---|---|---|---|
| `GET` | `/api/users` | List users (admin/employer) | (query: `role`, `companyId`) | `[ { "id": "integer", "email", "role", "companyId": "integer" } ]` |
| `GET` | `/api/users/:id` | Get user details | (params: `id`) | `{ "id": "integer", "email", "role", "companyId": "integer", "tokenBalance": "integer" }` |
| `PUT` | `/api/users/:id` | Update user profile | `{ "email"?, "password"?, "name"? }` | `{ "id": "integer", "email", "name" }` |
| `DELETE` | `/api/users/:id` | Delete a user | (params: `id`) | `{ "message": "User deleted" }` |
| `GET` | `/api/users/:id/history` | Get token activity history | (params: `id`) | `[ { "type", "amount": "integer", "date", "description" } ]` |

---

##### Tokens

| Method | Endpoint | Description | Input (JSON) | Output (JSON) |
|---|---|---|---|---|
| `POST` | `/api/tokens/allocate` | Employer allocates tokens to an employee | `{ "employeeId": "integer", "amount": "integer", "reason": "string" }` | `{ "transactionId": "integer", "employeeId": "integer", "amount": "integer", "newBalance": "integer" }` |
| `GET` | `/api/tokens/balance/:userId` | Get token balance | (params: `userId`) | `{ "userId": "integer", "balance": "integer" }` |
| `GET` | `/api/tokens/transactions` | List transactions | (query: `userId`, `from`, `to`) | `[ { "id": "integer", "fromUserId": "integer", "toUserId": "integer", "amount": "integer", "reason", "createdAt" } ]` |
| `GET` | `/api/tokens/transactions/:id` | Get transaction details | (params: `id`) | `{ "id": "integer", "fromUserId": "integer", "toUserId": "integer", "amount": "integer", "reason", "createdAt" }` |

---

##### Marketplace / Promo Codes

| Method | Endpoint | Description | Input (JSON) | Output (JSON) |
|---|---|---|---|---|
| `GET` | `/api/marketplace/items` | List available offers | (query: `category`, `maxCost`) | `[ { "id": "integer", "title", "description", "cost": "integer", "category", "stock": "integer" } ]` |
| `GET` | `/api/marketplace/items/:id` | Get offer details | (params: `id`) | `{ "id": "integer", "title", "description", "cost": "integer", "category", "stock": "integer" }` |
| `POST` | `/api/marketplace/items` | Create an offer (admin) | `{ "title": "string", "description": "string", "cost": "integer", "category": "string", "stock": "integer", "promoCode": "string" }` | `{ "id": "integer", "title", "cost": "integer" }` |
| `PUT` | `/api/marketplace/items/:id` | Update an offer (admin) | `{ "title"?: "string", "cost"?: "integer", "stock"?: "integer" }` | `{ "id": "integer", "title", "cost": "integer", "stock": "integer" }` |
| `DELETE` | `/api/marketplace/items/:id` | Delete an offer (admin) | (params: `id`) | `{ "message": "Item deleted" }` |
| `POST` | `/api/marketplace/redeem` | Employee redeems tokens for a promo code | `{ "itemId": "integer" }` (header: Bearer token) | `{ "promoCode": "string", "remainingBalance": "integer" }` |
| `GET` | `/api/marketplace/orders` | List employee redemption history | (query: `userId`) | `[ { "id": "integer", "itemId": "integer", "promoCode": "string", "cost": "integer", "redeemedAt" } ]` |

---

**Global conventions:**
- All protected endpoints require `Authorization: Bearer <token>` in the header
- Errors return `{ "error": "string", "code": "integer" }`
- Dates are ISO 8601 (`2026-05-19T10:00:00Z`)
- All IDs are PostgreSQL `SERIAL` / `INTEGER` primary keys

---

## 5. SCM and QA Strategies

### 5.1 SCM Strategy — GitHub Flow

The repository follows **GitHub Flow**, keeping the workflow simple and suited to a two-person team with a short MVP timeline.

- **`main`** is the single protected branch. It always reflects production-ready code. Direct pushes are blocked — all changes go through a pull request.
- **`feature/*`** branches are created from `main` for every new feature or fix (e.g. `feature/token-purchase`, `feature/stripe-webhook`). Once the work is reviewed and approved, the branch is merged into `main` and deleted.
- Commit messages follow the **Conventional Commits** format: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`. This keeps the history readable and prepares for automated changelog generation.
- Each pull request requires at least **one peer review** (between Loïc and Véronique) before merging. No self-merging on `main`.

---

### 5.2 QA Strategy

Given the MVP scope and timeline, the testing strategy is pragmatic — focused on the critical business logic rather than full coverage.

| Test Type | Scope | Framework |
|---|---|---|
| **Unit tests** | Service layer: `TokenService`, `AuthService`, `StripeService`. Key cases: token allocation logic, balance checks before redemption, JWT generation/verification, bcrypt password comparison. | Jest (Node.js) |
| **Integration tests** | API routes end-to-end against a test PostgreSQL database (seeded with fixtures). Each route group (`/auth`, `/tokens`, `/vouchers`, `/users`) gets a test suite validating correct HTTP status codes, response shapes, and database state after mutations. | Supertest + Jest |
| **Manual QA** | The two critical user flows — employer buying tokens and employee redeeming a voucher — tested against the Stripe test environment using test card numbers (`4242 4242 4242 4242`). | — |

---

### 5.3 CI/CD Pipeline — Planned with GitHub Actions

The pipeline triggers on every push to a `feature/*` branch and on every pull request targeting `main`.

```
on: push (feature/*) + pull_request (main)
│
├── lint         ESLint + Prettier check
├── test         Jest unit + integration (against test DB container)
├── build        Docker image build (front + back)
└── deploy       (post-merge to main) → deploy to staging environment
```

The pipeline uses a **PostgreSQL service container** spun up by GitHub Actions for integration tests, so no external database dependency is needed in CI. Environment secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `DATABASE_URL`) are stored in GitHub repository secrets and injected at runtime — never hardcoded.

---

### 5.4 Definition of Done

A feature branch is considered **merge-ready** when:

- [ ] All existing tests pass in CI
- [ ] New code is covered by at least unit tests for service-layer logic
- [ ] The PR has been reviewed and approved by the other team member
- [ ] No ESLint errors or Prettier violations
- [ ] Manually tested against the Stripe test environment if the feature touches the payment flow

test.
