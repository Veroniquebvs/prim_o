-- =========================================================================
-- PRIM'O - Database Seed Script (Development Data)
-- =========================================================================

-- 1. CLEANING UP
TRUNCATE TABLE redemptions, token_transactions, users, vouchers, companies RESTART IDENTITY CASCADE;

-- 2. SEED COMPANIES
-- email required (NOT NULL), address fields required
INSERT INTO companies (id, name, email, street, zip_code, city, siret, token_balance, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'TechCorp Inc.',
  'contact@techcorp.com',
  '12 Rue de la Paix',
  '75002',
  'Paris',
  '12345678901234',
  5000,
  NOW(),
  NOW()
);

-- 3. SEED USERS
-- password_hash for 'securepassword123'  → bcrypt 12 rounds
-- password_hash for 'passwordemployee'   → bcrypt 12 rounds
INSERT INTO users (id, company_id, first_name, name, email, password_hash, role, token_balance, created_at, updated_at)
VALUES
(
  '11111111-2222-3333-4444-555555555555',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Jean',
  'Dupont',
  'jean.dupont@techcorp.com',
  '$2b$12$xRqH9kmZnS/ABBH9nw/X0OVxKHB/b1wXgoAbUdK.v8RL0QTK9Geta',
  'employer',
  0,
  NOW(),
  NOW()
),
(
  '66666666-7777-8888-9999-000000000000',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Alice',
  'Martin',
  'alice.martin@techcorp.com',
  '$2b$12$G5UTZwH64vCFFStEpsKEN.DPfSOQ6Qwvz8Kbkb3movfEcKMXYCwVm',
  'employee',
  150,
  NOW(),
  NOW()
);

-- 4. SEED VOUCHERS
INSERT INTO vouchers (id, title, partner, token_cost, available, created_at, updated_at)
VALUES
(
  'a0111111-1111-1111-1111-111111111111',
  'Carte Cadeau Fnac 20€',
  'Fnac',
  100,
  TRUE,
  NOW(),
  NOW()
),
(
  'b0222222-2222-2222-2222-222222222222',
  'Bon d''achat Décathlon 50€',
  'Decathlon',
  250,
  TRUE,
  NOW(),
  NOW()
),
(
  'c0333333-3333-3333-3333-333333333333',
  'Abonnement Streaming 1 Mois',
  'Netflix',
  50,
  FALSE,
  NOW(),
  NOW()
);

-- 5. SEED TOKEN TRANSACTIONS
-- type 'allocation' matches what token.service.js produces
INSERT INTO token_transactions (id, company_id, sender_id, receiver_id, amount, type, stripe_payment_id, created_at, updated_at)
VALUES (
  'd0111111-1111-1111-1111-111111111111',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  '11111111-2222-3333-4444-555555555555',
  '66666666-7777-8888-9999-000000000000',
  150,
  'allocation',
  NULL,
  NOW(),
  NOW()
);
