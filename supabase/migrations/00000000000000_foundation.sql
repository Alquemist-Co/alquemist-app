-- Foundation migration: ENUMs, helper functions, companies, users

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE user_role AS ENUM ('admin','manager','supervisor','operator','viewer');

-- =============================================================
-- HELPER FUNCTIONS
-- =============================================================

-- Auto-update updated_at and updated_by on row modification
CREATE OR REPLACE FUNCTION trigger_update_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Extract company_id from JWT app_metadata (used in RLS policies)
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
$$;

-- =============================================================
-- COMPANIES
-- =============================================================
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR NOT NULL,
  legal_id    VARCHAR,
  country     CHAR(2) NOT NULL,
  timezone    VARCHAR NOT NULL,
  currency    CHAR(3) NOT NULL,
  settings    JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID,
  updated_by  UUID
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY,  -- matches auth.users.id
  company_id            UUID NOT NULL REFERENCES companies(id),
  email                 VARCHAR NOT NULL UNIQUE,
  full_name             VARCHAR NOT NULL,
  role                  user_role NOT NULL,
  phone                 VARCHAR,
  assigned_facility_id  UUID,  -- FK added later when facilities table exists
  permissions           JSONB,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_by            UUID
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX idx_users_company ON users (company_id);
CREATE INDEX idx_users_email ON users (email);

-- =============================================================
-- TRIGGERS
-- =============================================================
CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RLS POLICIES: companies
-- =============================================================
-- Tenant isolation: users see only their own company
CREATE POLICY "tenant_isolation" ON companies
  FOR ALL USING (id = (SELECT get_my_company_id()))
  WITH CHECK (id = (SELECT get_my_company_id()));

-- Service role bypass (for signup server action and admin ops)
CREATE POLICY "service_role_all" ON companies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: users
-- =============================================================
-- Tenant isolation: users see only users in their company
CREATE POLICY "tenant_isolation" ON users
  FOR ALL USING (company_id = (SELECT get_my_company_id()))
  WITH CHECK (company_id = (SELECT get_my_company_id()));

-- Service role bypass
CREATE POLICY "service_role_all" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);
