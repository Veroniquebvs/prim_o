-- Migration : ajout feedback_enabled sur companies (idempotent)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS feedback_enabled BOOLEAN NOT NULL DEFAULT false;
