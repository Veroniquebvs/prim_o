-- =========================================================================
-- PRIM'O - Database Seed Script (Development Data)
-- =========================================================================

-- 1. CLEANING UP (Ensures a fresh start during testing)
TRUNCATE TABLE redemptions, token_transactions, users, vouchers, companies RESTART IDENTITY CASCADE;

-- 2. SEED COMPANIES
INSERT INTO companies (id, name, token_balance, street, zip_code, city, created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    'TechCorp Inc.', 
    5000, 
    '12 Rue de la Paix', 
    '75002', 
    'Paris', 
    NOW(), 
    NOW()
);

-- 3. SEED USERS
INSERT INTO users (id, company_id, first_name, last_name, email, password, role, token_balance, created_at, updated_at)
VALUES 
-- The Employer (Manager)
(
    '11111111-2222-3333-4444-555555555555', 
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    'Jean', 
    'Dupont', 
    'jean.dupont@techcorp.com', 
    'securepassword123', 
    'employer', 
    0, 
    NOW(), 
    NOW()
),
-- The Employee (Staff member)
(
    '66666666-7777-8888-9999-000000000000', 
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    'Alice', 
    'Martin', 
    'alice.martin@techcorp.com', 
    'passwordemployee', 
    'employee', 
    150, 
    NOW(), 
    NOW()
);

-- 4. SEED VOUCHERS (The Marketplace Catalog)
INSERT INTO vouchers (id, title, partner, token_cost, available, created_at, updated_at)
VALUES 
(
    'v1111111-1111-1111-1111-111111111111', 
    'Carte Cadeau Fnac 20€', 
    'Fnac', 
    100, 
    TRUE, 
    NOW(), 
    NOW()
),
(
    'v2222222-2222-2222-2222-222222222222', 
    'Bon d''achat Décathlon 50€', 
    'Decathlon', 
    250, 
    TRUE, 
    NOW(), 
    NOW()
),
(
    'v3333333-3333-3333-3333-333333333333', 
    'Abonnement Streaming 1 Mois', 
    'Netflix', 
    50, 
    FALSE, 
    NOW(), 
    NOW()
);

-- 5. SEED TOKEN TRANSACTIONS (History Ledger)
INSERT INTO token_transactions (id, company_id, sender_id, receiver_id, amount, type, stripe_payment_id, created_at, updated_at)
VALUES (
    't1111111-1111-1111-1111-111111111111',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '11111111-2222-3333-4444-555555555555', 
    '66666666-7777-8888-9999-000000000000', 
    150,
    'distribution',
    NULL, 
    NOW(),
    NOW()
);
