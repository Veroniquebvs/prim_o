-- =========================================================================
-- PRIM'O - Database Infrastructure Initialization
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── companies ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  street       VARCHAR(255) NOT NULL,
  zip_code     VARCHAR(5)   NOT NULL,
  city         VARCHAR(255) NOT NULL,
  siret        VARCHAR(14),
  token_balance    INTEGER NOT NULL DEFAULT 0,
  feedback_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  first_name    VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL CHECK (role IN ('admin', 'employer', 'employee')),
  token_balance INTEGER NOT NULL DEFAULT 0,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── vouchers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouchers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  partner     VARCHAR(255) NOT NULL,
  token_cost  INTEGER NOT NULL DEFAULT 0 CHECK (token_cost >= 0),
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_weekly   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── token_transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount            INTEGER NOT NULL,
  type              VARCHAR(50) NOT NULL,
  stripe_payment_id VARCHAR(255),
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  sender_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  receiver_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── redemptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS redemptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code VARCHAR(255) NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
