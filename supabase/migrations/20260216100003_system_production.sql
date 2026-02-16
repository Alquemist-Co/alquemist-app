-- 03_system_production.sql
-- US-003-002: System (2 tables) + Production (5 tables) = 7 tables
-- Note: users.assigned_facility_id created as UUID without FK (facilities doesn't exist yet)
-- Note: phase_product_flows.product_id and cultivar_products.product_id without FK (products doesn't exist yet)

-- ============================================================
-- DOMAIN: SYSTEM
-- ============================================================

CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR NOT NULL,
  legal_id      VARCHAR,
  country       CHAR(2) NOT NULL,
  timezone      VARCHAR NOT NULL DEFAULT 'America/Bogota',
  currency      CHAR(3) NOT NULL DEFAULT 'COP',
  settings      JSONB,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID,
  updated_by    UUID
);

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES companies(id),
  email                VARCHAR NOT NULL UNIQUE,
  full_name            VARCHAR NOT NULL,
  role                 user_role NOT NULL,
  phone                VARCHAR,
  assigned_facility_id UUID, -- FK added later via ALTER TABLE (facilities doesn't exist yet)
  permissions          JSONB,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  last_login_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES users(id),
  updated_by           UUID REFERENCES users(id)
);

-- Self-referencing FKs for companies audit fields
ALTER TABLE companies
  ADD CONSTRAINT fk_companies_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_companies_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- ============================================================
-- DOMAIN: PRODUCTION
-- ============================================================

CREATE TABLE crop_types (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR NOT NULL UNIQUE,
  name                 VARCHAR NOT NULL,
  scientific_name      VARCHAR,
  category             crop_category NOT NULL,
  regulatory_framework VARCHAR,
  icon                 VARCHAR,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES users(id),
  updated_by           UUID REFERENCES users(id)
);

CREATE TABLE cultivars (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_id                UUID NOT NULL REFERENCES crop_types(id),
  code                        VARCHAR NOT NULL UNIQUE,
  name                        VARCHAR NOT NULL,
  breeder                     VARCHAR,
  genetics                    VARCHAR,
  default_cycle_days          INT,
  phase_durations             JSONB,
  expected_yield_per_plant_g  DECIMAL,
  expected_dry_ratio          DECIMAL,
  target_profile              JSONB,
  quality_grade               VARCHAR,
  optimal_conditions          JSONB,
  density_plants_per_m2       DECIMAL,
  notes                       TEXT,
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID REFERENCES users(id),
  updated_by                  UUID REFERENCES users(id)
);

CREATE TABLE production_phases (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_id           UUID NOT NULL REFERENCES crop_types(id),
  code                   VARCHAR NOT NULL,
  name                   VARCHAR NOT NULL,
  sort_order             INT NOT NULL,
  is_transformation      BOOLEAN NOT NULL DEFAULT false,
  is_destructive         BOOLEAN NOT NULL DEFAULT false,
  default_duration_days  INT,
  requires_zone_change   BOOLEAN NOT NULL DEFAULT false,
  can_skip               BOOLEAN NOT NULL DEFAULT false,
  can_be_entry_point     BOOLEAN NOT NULL DEFAULT false,
  can_be_exit_point      BOOLEAN NOT NULL DEFAULT false,
  depends_on_phase_id    UUID REFERENCES production_phases(id),
  icon                   VARCHAR,
  color                  VARCHAR,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID REFERENCES users(id),
  updated_by             UUID REFERENCES users(id)
);

CREATE TABLE phase_product_flows (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id                      UUID NOT NULL REFERENCES production_phases(id),
  direction                     flow_direction NOT NULL,
  product_role                  product_role NOT NULL,
  product_id                    UUID, -- FK added later (products doesn't exist yet)
  product_category_id           UUID, -- FK added later (resource_categories doesn't exist yet)
  expected_yield_pct            DECIMAL,
  expected_quantity_per_input   DECIMAL,
  unit_id                       UUID, -- FK added later (units_of_measure doesn't exist yet)
  is_required                   BOOLEAN NOT NULL DEFAULT true,
  sort_order                    INT NOT NULL,
  notes                         TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                    UUID REFERENCES users(id),
  updated_by                    UUID REFERENCES users(id)
);

CREATE TABLE cultivar_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id   UUID NOT NULL REFERENCES cultivars(id),
  product_id    UUID, -- FK added later (products doesn't exist yet)
  phase_id      UUID REFERENCES production_phases(id),
  is_primary    BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES users(id),
  updated_by    UUID REFERENCES users(id)
);
