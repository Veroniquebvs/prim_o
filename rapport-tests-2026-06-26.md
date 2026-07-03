# Test Report — PRIM'O (June 26, 2026)

> [!NOTE]
> This report presents the complete summary of the test strategy executed and validated on **June 26, 2026** by Véronique on the `feature/tests` branch.
> 
> **Global Result** : **141 tests executed, 141 tests passed (100% success rate)**.
> All tests run in isolation using Jest and Supertest within the Docker environment.

---

## Results Summary by Module

| Module | Test Type | Test File(s) | Passed Tests | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Authentication** | Unit & Integration | `auth.service.test.js` <br> `auth.integration.test.js` | **19** | Success |
| **Token Management & Stripe** | Unit & Integration | `token.service.test.js` <br> `stripe.service.test.js` <br> `tokens.integration.test.js` | **26** | Success |
| **Marketplace & Vouchers** | Unit & Integration | `marketplace.service.test.js` <br> `marketplace.integration.test.js` | **26** | Success |
| **Users & Multi-tenancy** | Unit & Integration | `users.service.test.js` <br> `users.integration.test.js` | **70** | Success |
| **Total** | | | **141** | **100% Success** |

---

## Test Details by Module

### 1. Authentication (`Auth`)

This suite validates user registration, secure password management, JSON Web Token (JWT) issuance, token refreshing, and session security constraints.

#### A. Unit Tests (`auth.service.test.js`)
* **Registration (`register`)**
  * *Description* : Validates user creation in the database. Verifies that a "clean" user object (without sensitive data) and access tokens are returned.
  * *Result  **Success**. The user is created successfully.
  * *Description* : Verifies that the Access Token contains the required claims (`id`, `role`, `company_id`).
  * *Result* : **Success**. Role and company information are correctly encoded.
  * *Description* : Registration attempt with an email that is already in use.
  * *Result*: **Success**. A conflict exception (HTTP 409) is correctly thrown.
  * *Description* : Validates password hashing using Bcrypt (minimum 12 rounds) before storing it in the database.
  * *Result* : **Success**. The plain text password is never stored.
* **Login (`login`)**
  * *Description* : Log in with valid credentials.
  * *Result* : **Success**. Returns the Access Token, Refresh Token, and the user object without their password.
  * *Description* : Log in attempt with a non-existent email.
  * *Result* : **Success**. An unauthorized exception (HTTP 401) is thrown.
  * *Description* : Log in attempt with an incorrect password.
  * *Result* : **Success**. Throws an HTTP 401 exception.
* **Logout (`logout`)**
  * *Description* : Stateless logout on the server.
  * *Result* : **Success**. Resolves without error.
* **User Profile (`getProfile`)**
  * *Description* : Retrieves the user profile.
  * *Result* : **Success**. The user object is returned while hiding the `password_hash` field.
  * *Description* : Retrieves a profile that does not exist.
  * *Result* : **Success**. Throws a resource not found exception (HTTP 404).
* **Token Refresh (`refreshToken`)**
  * *Description* : Renews the Access Token using a valid Refresh Token.
  * *Result*: **Success**. A new Access Token is generated.
  * *Description* : Token refresh request without providing a token.
  * *Result*: **Success**. Throws an HTTP 400 error.
  * *Description* : Using an expired Refresh Token or one signed with an invalid secret key.
  * *Result* : **Success**. Throws an HTTP 401 authentication error.
  * *Description* : Refresh attempt for a user who has been deleted from the database.
  * *Result* : **Success**. Throws an HTTP 404 error.

#### B. Integration Tests (`auth.integration.test.js`)
* **Route `/api/auth/register`**
  * *Description* : Account creation via real HTTP POST request.
  * *Result* : **Success** (HTTP 201).
  * *Description* : Incomplete registration request (missing required fields).
  * *Result* : **Success** (HTTP 400 Bad Request).
  * *Description* : Registration with duplicate email.
  * *Result* : **Success** (HTTP 409 Conflict).
* **Route `/api/auth/login`**
  * *Description* : Login attempt via POST request.
  * *Result* : **Success** (HTTP 200) with tokens returned.
  * *Description* : Login with incorrect credentials.
  * *Result* : **Success** (HTTP 401 Unauthorized).
* **Route `/api/auth/me`**
  * *Description* : Accesses the authenticated user profile using the `Authorization` header.
  * *Result* : **Success** (HTTP 200).
  * *Description* : Accesses the profile without an authorization header.
  * *Result* : **Success** (HTTP 401).
* **Route `/api/auth/refresh`**
  * *Description* : Refresh request via HTTP route.
  * *Result* : **Success** (HTTP 200) with a new token returned.

---

### 2. Token Management & Stripe (`Tokens`)

This section tests the logic for token allocation between employer/manager and employees, database transactional integrity, handling Stripe webhooks to credit tokens after a purchase, and access control.

#### A. TokenService Unit Tests (`token.service.test.js`)
* **Token Allocation (`allocate`)**
  * *Description*: Nominal allocation scenario: debits the company account, credits the employee account, and logs the transaction in the history under a single PostgreSQL transaction.
  * *Result*: **Success** (Commit performed).
  * *Description*: Uses a custom reason/motif in the transaction.
  * *Result*: **Success**. The reason is saved in the database.
  * *Description*: Allocation attempt with insufficient company balance.
  * *Result*: **Success**. The service rejects the request (HTTP 402 Payment Required) and triggers a complete Rollback.
  * *Description*: Allocation to a user who does not belong to the company or does not exist.
  * *Result*: **Success**. Rejected (HTTP 404) without initiating a database transaction.
  * *Description*: Allocating a negative amount or zero.
  * *Result*: **Success**. Rejected (HTTP 400 Bad Request).
* **Balance and Transactions (`getBalance`, `listTransactions`, `getTransaction`)**
  * *Description*: Reads the balance of an existing user.
  * *Result*: **Success** (returns the user ID and balance).
  * *Description*: Reads the balance of a non-existent user.
  * *Result*: **Success** (HTTP 404).
  * *Description*: Lists all transactions (without filters) and filters by user or by date.
  * *Result*: **Success**. SQL queries correctly filter the `sender_id` and `receiver_id` columns.

#### B. StripeService Unit Tests (`stripe.service.test.js`)
* **Signature Verification**
  * *Description*: Attempt to process a Stripe webhook with an invalid signature.
  * *Result*: **Success**. The system rejects the call (HTTP 400).
* **Ignored Events**
  * *Description*: Stripe webhook receiving an event other than `invoice.payment_succeeded` or an invoice without a subscription ID.
  * *Result*: **Success**. The request is accepted but no action/credit is performed (passive behavior is correct).
* **Successful Payment Processing (`invoice.payment_succeeded`)**
  * *Description*: Receiving a successful payment webhook for a valid subscription.
  * *Result*: **Success**. The database credits the company's token balance with the amount matching the subscribed plan and inserts a transaction of type `'purchase'`.
  * *Description*: Webhook error handling (company not found for the subscription, or unknown/invalid plan).
  * *Result*: **Success**. Rejects the request (HTTP 404 / 400) and rolls back any changes in the database.

#### C. Integration Tests (`tokens.integration.test.js`)
* **Route `/api/tokens/allocate`**
  * *Description*: Token allocation from an employer to their employee.
  * *Result*: **Success** (HTTP 200).
  * *Description*: Token allocation attempt initiated by an employee (unauthorized role).
  * *Result*: **Success** (HTTP 403 Forbidden).
  * *Description*: Allocation with an invalid amount (e.g. decimals or text).
  * *Result*: **Success** (HTTP 400).
* **Route `/api/tokens/balance/:userId`**
  * *Description*: Reads the token balance via HTTP GET request.
  * *Result*: **Success** (HTTP 200) with the correct response format.
  * *Description*: Request with an ID that does not conform to the UUID v4 format.
  * *Result*: **Success** (HTTP 400).
* **Route `/api/tokens/admin/deduct`**
  * *Description*: Manual deduction of tokens from a company by the system administrator.
  * *Result*: **Success** (HTTP 200).
  * *Description*: Manual deduction attempt by an employer or an employee.
  * *Result*: **Success** (HTTP 403).
* **Stripe Subscriptions Security**
  * *Description*: Attempt to subscribe to plans or view subscription details by an employee.
  * *Result*: **Success** (HTTP 403).

---

### 3. Vouchers & Marketplace (`Marketplace`)

This module tests the catalog for exchanging tokens for partner promo codes (vouchers) and ensures the administrative security of the items.

#### A. Marketplace Service Unit Tests (`marketplace.service.test.js`)
* **Catalog Consultation (`listItems`, `getItem`)**
  * *Description*: Retrieves available vouchers.
  * *Result*: **Success**. Vouchers marked as unavailable or out of stock are correctly hidden from the public catalog.
  * *Description*: Reads a voucher with a non-existent ID.
  * *Result*: **Success** (HTTP 404).
* **Creating and Modifying Vouchers (`createItem`, `updateItem`, `deleteItem`)**
  * *Description*: Creates a voucher with all required fields, or with optional fields (such as default availability).
  * *Result*: **Success**. The item is added to the database.
  * *Description*: Attempt to create a voucher with missing required fields.
  * *Result*: **Success** (HTTP 400).
  * *Description*: Updates the fields of an existing voucher and handles unknown fields.
  * *Result*: **Success**. Only authorized fields are modified.
* **Purchase / Exchange (`redeem`)**
  * *Description*: Nominal voucher exchange by an employee: debits their personal balance, marks the voucher as unavailable, records the transaction, and delivers the promo code (SQL ACID transaction).
  * *Result*: **Success** (Commit).
  * *Description*: Voucher exchange directly by a company/employer (debits the company account).
  * *Result*: **Success**. The company balance is transactionally debited.
  * *Description*: Attempting to purchase an unavailable voucher, insufficient balance (employee or employer), or user not found.
  * *Result*: **Success**. All of these attempts throw an HTTP 403 or 404 error and trigger a full database Rollback (no tokens are lost).

#### B. Integration Tests (`marketplace.integration.test.js`)
* **Consultation and Purchase**
  * *Description*: HTTP retrieval of the shop and voucher redemption by an employee via `/api/marketplace/redeem`.
  * *Result*: **Success** (HTTP 200).
  * *Description*: Attempting to purchase a voucher that is out of stock.
  * *Result*: **Success** (HTTP 403).
  * *Description*: Viewing personal order/redemption history via `/api/marketplace/orders`.
  * *Result*: **Success** (HTTP 200).
* **Administrative Security (RBAC)**
  * *Description*: Voucher creation by a system administrator.
  * *Result*: **Success** (HTTP 201).
  * *Description*: Voucher creation, update, or deletion attempts initiated by an employer or employee.
  * *Result*: **Success** (HTTP 403).
  * *Description*: Attempting to list all vouchers (raw admin catalog with visible promo codes) or view the global redemption history by a non-admin role.
  * *Result*: **Success** (HTTP 403).

---

### 4. User Management & Multi-tenancy Isolation (`Users`)

This suite validates user update processes and enforces multi-tenant boundary constraints (data isolation per company) as well as role restrictions (RBAC).

#### A. UserService Unit Tests (`users.service.test.js`)
* **Lists and Retrieval (`list`, `getById`)**
  * *Description*: Retrieves users with or without filters (role, company ID).
  * *Result*: **Success**. The critical `password_hash` attribute is always excluded from queries.
* **Updates and Deletion (`update`, `remove`)**
  * *Description*: Modifies user information.
  * *Result*: **Success**. Sensitive fields (such as role, token balance, hashed password, or company ID) are ignored during update to prevent privilege escalation.
  * *Description*: Physical deletion of a user from the database.
  * *Result*: **Success**. The user is deleted.

#### B. Integration Tests (`users.integration.test.js`)
* **Accessing User Lists (`GET /api/users` & `/api/users/pending`)**
  * *Description*: Accesses the list of users / pending accounts by an employer or system administrator.
  * *Result*: **Success** (HTTP 200).
  * *Description*: Accesses these lists initiated by an employee (unauthorized role).
  * *Result*: **Success** (HTTP 403).
* **Multi-tenant Isolation**
  * *Description*: An employer or manager from Company A attempts to view the profile (`GET /api/users/:id`), modify the profile (`PUT /api/users/:id`), activate the account (`PATCH /api/users/:id/activate`), or modify the entry date (`PATCH /api/users/:id/entry-date`) of an employee belonging to Company B.
  * *Result*: **Success**. The backend systematically blocks these requests by returning an **HTTP 404 User not found** error instead of an HTTP 403. This completely masks the existence of the user from the other company, guaranteeing perfect data isolation.
* **Entry Date**
  * *Description*: Modifies a collaborator's entry date by their employer or manager.
  * *Result*: **Success** (HTTP 200).
  * *Description*: Attempt to modify their own entry date or another employee's entry date by a collaborator.
  * *Result*: **Success** (HTTP 403).
* **Personal Avatar Constraint**
  * *Description*: Updates their own avatar by the connected user.
  * *Result*: **Success** (HTTP 200).
  * *Description*: Attempt to modify another user's avatar.
  * *Result*: **Success** (HTTP 403). Access is strictly restricted to the account owner.
* **Account Deletion**
  * *Description*: Account deletion by a system administrator.
  * *Result*: **Success** (HTTP 200).
  * *Description*: Account deletion attempt initiated by an employer or employee.
  * *Result*: **Success** (HTTP 403).

---

## Technical Conclusion of the Report
The tests completed on June 26, 2026 confirm:
1. **Transactional Integrity**: No tokens can be created, moved, or exchanged without being wrapped in a PostgreSQL transaction. In case of network failure, database error, or insufficient balance, the database performs an immediate and clean Rollback to the initial state.
2. **Robustness of Multi-tenant Isolation**: Companies hosted on the PRIM'O platform are hermetically isolated from each other. Cross-tenant information leakage is blocked at the API level.
3. **Compliance with the Permissions Model (RBAC)**: Employee, manager, employer, and admin roles have clear and secure boundaries. Critical data (such as password hashes) never leaks in the clear inside JSON API responses.
