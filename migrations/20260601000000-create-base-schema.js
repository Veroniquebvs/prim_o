"use strict";

/**
 * Base schema — creates every table of PRIM'O as defined by the Sequelize models (9 tables,
 * UUID primary keys, DECIMAL(10,2) balances, enums, unique keys and foreign keys).
 *
 * Until now the base tables only existed through sequelize.sync(), so `db:migrate` could not
 * build a new database. This migration runs first (oldest timestamp). The SQL was generated
 * from the models (sync on an empty PostgreSQL, then pg_dump --schema-only) on 13/10/2026, so
 * it matches them exactly. The later migrations are idempotent and skip what already exists.
 *
 * On a database that was already built by sync (the users table exists), it does nothing.
 */
const SCHEMA = `
CREATE TYPE enum_scheduled_allocations_frequency AS ENUM (
    'monthly',
    'annual'
);
CREATE TYPE enum_scheduled_allocations_target_account AS ENUM (
    'personal',
    'team'
);
CREATE TYPE enum_scheduled_allocations_target_type AS ENUM (
    'user',
    'all_company',
    'all_employees',
    'all_managers',
    'team',
    'team_and_manager'
);
CREATE TYPE enum_users_status AS ENUM (
    'pending',
    'active'
);
CREATE TABLE companies (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    street character varying(255) NOT NULL,
    zip_code character varying(5) NOT NULL,
    city character varying(255) NOT NULL,
    siret character varying(14) NOT NULL,
    token_balance numeric(10,2) DEFAULT 0 NOT NULL,
    feedback_enabled boolean DEFAULT false NOT NULL,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    subscription_plan character varying(255),
    subscription_status character varying(255),
    subscription_next_billing timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);
CREATE TABLE favorites (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    voucher_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);
CREATE TABLE redemptions (
    id uuid NOT NULL,
    promo_code character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id uuid,
    voucher_id uuid
);
CREATE TABLE scheduled_allocations (
    id uuid NOT NULL,
    target_type enum_scheduled_allocations_target_type DEFAULT 'all_company'::enum_scheduled_allocations_target_type NOT NULL,
    target_team_id uuid,
    target_account enum_scheduled_allocations_target_account DEFAULT 'personal'::enum_scheduled_allocations_target_account NOT NULL,
    amount numeric(10,2) NOT NULL,
    label character varying(255),
    frequency enum_scheduled_allocations_frequency NOT NULL,
    day_of_month integer NOT NULL,
    month integer,
    next_run_at timestamp with time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    excluded_user_ids json DEFAULT '[]'::json NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    company_id uuid,
    sender_id uuid,
    receiver_id uuid
);
CREATE TABLE team_members (
    id uuid NOT NULL,
    joined_at timestamp with time zone NOT NULL,
    left_at timestamp with time zone,
    team_id uuid,
    user_id uuid
);
CREATE TABLE teams (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    dissolved_at timestamp with time zone,
    token_balance numeric(10,2) DEFAULT 0 NOT NULL,
    retribution_rate numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    company_id uuid,
    manager_id uuid
);
CREATE TABLE token_transactions (
    id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    type character varying(255) NOT NULL,
    reason character varying(255),
    stripe_payment_id character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    company_id uuid,
    sender_id uuid,
    receiver_id uuid
);
CREATE TABLE users (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(255) NOT NULL,
    token_balance numeric(10,2) DEFAULT 0 NOT NULL,
    status enum_users_status DEFAULT 'pending'::enum_users_status NOT NULL,
    entry_date date,
    avatar_index integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    company_id uuid
);
CREATE TABLE vouchers (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    partner character varying(255) NOT NULL,
    token_cost integer NOT NULL,
    available boolean DEFAULT true NOT NULL,
    category character varying(255),
    images text[] DEFAULT ARRAY[]::text[] NOT NULL,
    promo_code character varying(255),
    is_featured boolean DEFAULT false NOT NULL,
    is_weekly boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);
ALTER TABLE ONLY companies
    ADD CONSTRAINT companies_email_key UNIQUE (email);
ALTER TABLE ONLY companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);
ALTER TABLE ONLY redemptions
    ADD CONSTRAINT redemptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY scheduled_allocations
    ADD CONSTRAINT scheduled_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);
ALTER TABLE ONLY teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);
ALTER TABLE ONLY token_transactions
    ADD CONSTRAINT token_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY vouchers
    ADD CONSTRAINT vouchers_promo_code_key UNIQUE (promo_code);
CREATE UNIQUE INDEX favorites_user_id_voucher_id ON favorites USING btree (user_id, voucher_id);
ALTER TABLE ONLY favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY favorites
    ADD CONSTRAINT favorites_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY redemptions
    ADD CONSTRAINT redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY redemptions
    ADD CONSTRAINT redemptions_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY scheduled_allocations
    ADD CONSTRAINT scheduled_allocations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY scheduled_allocations
    ADD CONSTRAINT scheduled_allocations_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY scheduled_allocations
    ADD CONSTRAINT scheduled_allocations_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY scheduled_allocations
    ADD CONSTRAINT scheduled_allocations_target_team_id_fkey FOREIGN KEY (target_team_id) REFERENCES teams(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY teams
    ADD CONSTRAINT teams_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY teams
    ADD CONSTRAINT teams_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY token_transactions
    ADD CONSTRAINT token_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY token_transactions
    ADD CONSTRAINT token_transactions_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY token_transactions
    ADD CONSTRAINT token_transactions_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
`;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('users')) return;
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(SCHEMA, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS favorites, redemptions, scheduled_allocations, team_members, token_transactions, teams, users, vouchers, companies CASCADE;
      DROP TYPE IF EXISTS enum_scheduled_allocations_frequency, enum_scheduled_allocations_target_account, enum_scheduled_allocations_target_type, enum_users_status;
    `);
  },
};
