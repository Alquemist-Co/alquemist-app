-- 00_extensions.sql
-- Enable required PostgreSQL extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 01_enums.sql
-- All PostgreSQL ENUMs used across the 43 tables

-- Sistema
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'supervisor', 'operator', 'viewer');

-- Produccion
CREATE TYPE crop_category AS ENUM ('annual', 'perennial', 'biennial');
CREATE TYPE flow_direction AS ENUM ('input', 'output');
CREATE TYPE product_role AS ENUM ('primary', 'secondary', 'byproduct', 'waste');

-- Areas
CREATE TYPE facility_type AS ENUM ('indoor_warehouse', 'greenhouse', 'tunnel', 'open_field', 'vertical_farm');
CREATE TYPE zone_purpose AS ENUM ('propagation', 'vegetation', 'flowering', 'drying', 'processing', 'storage', 'multipurpose');
CREATE TYPE zone_environment AS ENUM ('indoor_controlled', 'greenhouse', 'tunnel', 'open_field');
CREATE TYPE zone_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE structure_type AS ENUM ('mobile_rack', 'fixed_rack', 'rolling_bench', 'row', 'bed', 'trellis_row', 'nft_channel');
CREATE TYPE position_status AS ENUM ('empty', 'planted', 'harvested', 'maintenance');

-- Inventario
CREATE TYPE lot_tracking AS ENUM ('required', 'optional', 'none');
CREATE TYPE procurement_type AS ENUM ('purchased', 'produced', 'both');
CREATE TYPE dimension_type AS ENUM ('mass', 'volume', 'count', 'area', 'energy', 'time', 'concentration');
CREATE TYPE source_type AS ENUM ('purchase', 'production', 'transfer', 'transformation');
CREATE TYPE lot_status AS ENUM ('available', 'quarantine', 'expired', 'depleted');
CREATE TYPE transaction_type AS ENUM (
  'receipt', 'consumption', 'application',
  'transfer_out', 'transfer_in',
  'transformation_out', 'transformation_in',
  'adjustment', 'waste', 'return',
  'reservation', 'release'
);

-- Actividades
CREATE TYPE activity_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'once', 'on_demand');
CREATE TYPE quantity_basis AS ENUM ('fixed', 'per_plant', 'per_m2', 'per_zone', 'per_L_solution');
CREATE TYPE scheduled_activity_status AS ENUM ('pending', 'completed', 'skipped', 'overdue');
CREATE TYPE activity_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE observation_type AS ENUM ('pest', 'disease', 'deficiency', 'environmental', 'general', 'measurement');
CREATE TYPE severity_level AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- Nexo (Batches)
CREATE TYPE batch_status AS ENUM ('active', 'phase_transition', 'completed', 'cancelled', 'on_hold');
CREATE TYPE lineage_operation AS ENUM ('split', 'merge');

-- Ordenes
CREATE TYPE order_status AS ENUM ('draft', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE order_phase_status AS ENUM ('pending', 'ready', 'in_progress', 'completed', 'skipped');

-- Calidad
CREATE TYPE test_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'rejected');

-- Operaciones
CREATE TYPE cost_type AS ENUM ('energy', 'rent', 'depreciation', 'insurance', 'maintenance', 'labor_fixed', 'other');
CREATE TYPE allocation_basis AS ENUM ('per_m2', 'per_plant', 'per_batch', 'per_zone', 'even_split');
CREATE TYPE sensor_type AS ENUM ('temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd');
CREATE TYPE reading_parameter AS ENUM ('temperature', 'humidity', 'co2', 'light_ppfd', 'ec', 'ph', 'vpd');
CREATE TYPE alert_type AS ENUM (
  'overdue_activity', 'low_inventory', 'stale_batch',
  'expiring_item', 'env_out_of_range', 'order_delayed', 'quality_failed'
);
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
-- 02_auth_helpers.sql
-- US-003-001: Auth helper functions for RLS
-- Created in public schema (auth schema is managed by Supabase).
-- They extract tenant info from the Supabase JWT (app_metadata).
-- Return NULL if the claim doesn't exist (secure by default).

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.current_facility_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'facility_id')::uuid;
$$ LANGUAGE sql STABLE;
-- 03_system_production.sql
-- US-003-002: System (2 tables) + Production (5 tables) = 7 tables
-- Note: users.assigned_facility_id created as UUID without FK (facilities doesn't exist yet)
-- Note: phase_product_flows.product_id and cultivar_products.product_id without FK (products doesn't exist yet)

-- ============================================================
-- DOMAIN: SYSTEM
-- ============================================================

CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- 04_areas_inventory.sql
-- US-003-003: Areas (4 tables) + Inventory (8 tables) = 12 tables
-- Note: plant_positions.current_batch_id without FK (batches doesn't exist yet)
-- Note: inventory_transactions has several deferred FKs (batches, activities don't exist yet)

-- ============================================================
-- DOMAIN: AREAS
-- ============================================================

CREATE TABLE facilities (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id),
  name                    VARCHAR NOT NULL,
  type                    facility_type NOT NULL,
  total_footprint_m2      DECIMAL NOT NULL,
  total_growing_area_m2   DECIMAL NOT NULL DEFAULT 0,
  total_plant_capacity    INT NOT NULL DEFAULT 0,
  address                 TEXT NOT NULL,
  latitude                DECIMAL,
  longitude               DECIMAL,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES users(id),
  updated_by              UUID REFERENCES users(id)
);

CREATE TABLE zones (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id               UUID NOT NULL REFERENCES facilities(id),
  name                      VARCHAR NOT NULL,
  purpose                   zone_purpose NOT NULL,
  environment               zone_environment NOT NULL,
  area_m2                   DECIMAL NOT NULL,
  height_m                  DECIMAL,
  effective_growing_area_m2 DECIMAL NOT NULL DEFAULT 0,
  plant_capacity            INT NOT NULL DEFAULT 0,
  climate_config            JSONB,
  status                    zone_status NOT NULL DEFAULT 'active',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                UUID REFERENCES users(id),
  updated_by                UUID REFERENCES users(id)
);

CREATE TABLE zone_structures (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id             UUID NOT NULL REFERENCES zones(id),
  name                VARCHAR NOT NULL,
  type                structure_type NOT NULL,
  length_m            DECIMAL NOT NULL,
  width_m             DECIMAL NOT NULL,
  is_mobile           BOOLEAN NOT NULL DEFAULT false,
  num_levels          INT NOT NULL DEFAULT 1,
  positions_per_level INT,
  max_positions       INT,
  level_config        JSONB,
  spacing_cm          DECIMAL,
  pot_size_l          DECIMAL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id)
);

CREATE TABLE plant_positions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id           UUID NOT NULL REFERENCES zones(id),
  structure_id      UUID REFERENCES zone_structures(id),
  level_number      INT,
  position_index    INT NOT NULL,
  label             VARCHAR,
  status            position_status NOT NULL DEFAULT 'empty',
  current_batch_id  UUID, -- FK added later (batches doesn't exist yet)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id)
);

-- ============================================================
-- DOMAIN: INVENTORY
-- ============================================================

CREATE TABLE resource_categories (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id             UUID REFERENCES resource_categories(id),
  name                  VARCHAR NOT NULL,
  code                  VARCHAR NOT NULL,
  icon                  VARCHAR,
  color                 VARCHAR,
  is_consumable         BOOLEAN NOT NULL DEFAULT false,
  is_depreciable        BOOLEAN NOT NULL DEFAULT false,
  is_transformable      BOOLEAN NOT NULL DEFAULT false,
  default_lot_tracking  lot_tracking NOT NULL DEFAULT 'none',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES users(id),
  updated_by            UUID REFERENCES users(id)
);

CREATE TABLE units_of_measure (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR NOT NULL,
  name            VARCHAR NOT NULL,
  dimension       dimension_type NOT NULL,
  base_unit_id    UUID REFERENCES units_of_measure(id),
  to_base_factor  DECIMAL NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            VARCHAR NOT NULL,
  contact_info    JSONB NOT NULL DEFAULT '{}',
  payment_terms   VARCHAR,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                     VARCHAR NOT NULL UNIQUE,
  name                    VARCHAR NOT NULL,
  category_id             UUID NOT NULL REFERENCES resource_categories(id),
  default_unit_id         UUID NOT NULL REFERENCES units_of_measure(id),
  cultivar_id             UUID REFERENCES cultivars(id),
  procurement_type        procurement_type NOT NULL DEFAULT 'purchased',
  lot_tracking            lot_tracking NOT NULL DEFAULT 'none',
  shelf_life_days         INT,
  phi_days                INT,
  rei_hours               INT,
  default_yield_pct       DECIMAL,
  density_g_per_ml        DECIMAL,
  conversion_properties   JSONB,
  default_price           DECIMAL,
  price_currency          CHAR(3),
  preferred_supplier_id   UUID REFERENCES suppliers(id),
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES users(id),
  updated_by              UUID REFERENCES users(id)
);

CREATE TABLE inventory_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id            UUID NOT NULL REFERENCES products(id),
  zone_id               UUID REFERENCES zones(id),
  quantity_available    DECIMAL NOT NULL DEFAULT 0,
  quantity_reserved     DECIMAL NOT NULL DEFAULT 0,
  quantity_committed    DECIMAL NOT NULL DEFAULT 0,
  unit_id               UUID NOT NULL REFERENCES units_of_measure(id),
  batch_number          VARCHAR,
  supplier_lot_number   VARCHAR,
  cost_per_unit         DECIMAL,
  expiration_date       DATE,
  source_type           source_type NOT NULL DEFAULT 'purchase',
  lot_status            lot_status NOT NULL DEFAULT 'available',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES users(id),
  updated_by            UUID REFERENCES users(id)
);

CREATE TABLE inventory_transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                    transaction_type NOT NULL,
  inventory_item_id       UUID NOT NULL REFERENCES inventory_items(id),
  quantity                DECIMAL NOT NULL,
  unit_id                 UUID NOT NULL REFERENCES units_of_measure(id),
  timestamp               TIMESTAMPTZ NOT NULL DEFAULT now(),
  zone_id                 UUID REFERENCES zones(id),
  batch_id                UUID, -- FK added later (batches doesn't exist yet)
  phase_id                UUID REFERENCES production_phases(id),
  activity_id             UUID, -- FK added later (activities doesn't exist yet)
  recipe_execution_id     UUID, -- FK added later (recipe_executions created below)
  related_transaction_id  UUID REFERENCES inventory_transactions(id),
  target_item_id          UUID REFERENCES inventory_items(id),
  cost_per_unit           DECIMAL,
  cost_total              DECIMAL,
  user_id                 UUID NOT NULL REFERENCES users(id),
  reason                  TEXT,
  company_id              UUID REFERENCES companies(id), -- redundant for RLS Type C
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at: append-only table
);

CREATE TABLE recipes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR NOT NULL,
  code                VARCHAR NOT NULL,
  output_product_id   UUID NOT NULL REFERENCES products(id),
  base_quantity       DECIMAL NOT NULL,
  base_unit_id        UUID NOT NULL REFERENCES units_of_measure(id),
  items               JSONB NOT NULL DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id)
);

CREATE TABLE recipe_executions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id                 UUID NOT NULL REFERENCES recipes(id),
  executed_by               UUID NOT NULL REFERENCES users(id),
  scale_factor              DECIMAL NOT NULL DEFAULT 1,
  output_quantity_expected  DECIMAL NOT NULL,
  output_quantity_actual    DECIMAL,
  yield_pct                 DECIMAL,
  batch_id                  UUID, -- FK added later (batches doesn't exist yet)
  executed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DEFERRED FKs from US-003-002 (now that tables exist)
-- ============================================================

-- users.assigned_facility_id -> facilities
ALTER TABLE users
  ADD CONSTRAINT fk_users_assigned_facility FOREIGN KEY (assigned_facility_id) REFERENCES facilities(id);

-- phase_product_flows.product_id -> products
ALTER TABLE phase_product_flows
  ADD CONSTRAINT fk_ppf_product FOREIGN KEY (product_id) REFERENCES products(id);

-- phase_product_flows.product_category_id -> resource_categories
ALTER TABLE phase_product_flows
  ADD CONSTRAINT fk_ppf_category FOREIGN KEY (product_category_id) REFERENCES resource_categories(id);

-- phase_product_flows.unit_id -> units_of_measure
ALTER TABLE phase_product_flows
  ADD CONSTRAINT fk_ppf_unit FOREIGN KEY (unit_id) REFERENCES units_of_measure(id);

-- cultivar_products.product_id -> products
ALTER TABLE cultivar_products
  ADD CONSTRAINT fk_cp_product FOREIGN KEY (product_id) REFERENCES products(id);

-- inventory_transactions.recipe_execution_id -> recipe_executions
ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_it_recipe_execution FOREIGN KEY (recipe_execution_id) REFERENCES recipe_executions(id);
-- 05_activities.sql
-- US-003-004: Activities domain (10 tables)
-- Note: scheduled_activities.batch_id, activities.batch_id without FK (batches doesn't exist yet)
-- Note: activities needs company_id redundant for RLS Type C

-- ============================================================
-- DOMAIN: ACTIVITIES
-- ============================================================

CREATE TABLE activity_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR NOT NULL,
  category    VARCHAR,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES users(id),
  updated_by  UUID REFERENCES users(id)
);

CREATE TABLE activity_templates (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                        VARCHAR NOT NULL UNIQUE,
  activity_type_id            UUID NOT NULL REFERENCES activity_types(id),
  name                        VARCHAR NOT NULL,
  frequency                   activity_frequency NOT NULL DEFAULT 'on_demand',
  estimated_duration_min      INT NOT NULL,
  trigger_day_from            INT,
  trigger_day_to              INT,
  depends_on_template_id      UUID REFERENCES activity_templates(id),
  triggers_phase_change_id    UUID REFERENCES production_phases(id),
  triggers_transformation     BOOLEAN NOT NULL DEFAULT false,
  metadata                    JSONB,
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID REFERENCES users(id),
  updated_by                  UUID REFERENCES users(id)
);

CREATE TABLE activity_template_phases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id   UUID NOT NULL REFERENCES activity_templates(id),
  phase_id      UUID NOT NULL REFERENCES production_phases(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, phase_id)
);

CREATE TABLE activity_template_resources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES activity_templates(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        DECIMAL NOT NULL,
  quantity_basis  quantity_basis NOT NULL DEFAULT 'fixed',
  is_optional     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE TABLE activity_template_checklist (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES activity_templates(id),
  step_order      INT NOT NULL,
  instruction     TEXT NOT NULL,
  is_critical     BOOLEAN NOT NULL DEFAULT false,
  requires_photo  BOOLEAN NOT NULL DEFAULT false,
  expected_value  VARCHAR,
  tolerance       VARCHAR,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE TABLE cultivation_schedules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR NOT NULL,
  cultivar_id   UUID NOT NULL REFERENCES cultivars(id),
  total_days    INT NOT NULL,
  phase_config  JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES users(id),
  updated_by    UUID REFERENCES users(id)
);

CREATE TABLE scheduled_activities (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id             UUID NOT NULL REFERENCES cultivation_schedules(id),
  template_id             UUID NOT NULL REFERENCES activity_templates(id),
  batch_id                UUID, -- FK added later (batches doesn't exist yet)
  planned_date            DATE NOT NULL,
  crop_day                INT NOT NULL,
  phase_id                UUID NOT NULL REFERENCES production_phases(id),
  template_snapshot       JSONB,
  status                  scheduled_activity_status NOT NULL DEFAULT 'pending',
  completed_activity_id   UUID, -- FK added later (activities created below)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES users(id),
  updated_by              UUID REFERENCES users(id)
);

CREATE TABLE activities (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type_id        UUID NOT NULL REFERENCES activity_types(id),
  template_id             UUID REFERENCES activity_templates(id),
  scheduled_activity_id   UUID REFERENCES scheduled_activities(id),
  batch_id                UUID, -- FK added later (batches doesn't exist yet)
  zone_id                 UUID NOT NULL REFERENCES zones(id),
  performed_by            UUID NOT NULL REFERENCES users(id),
  performed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes        INT NOT NULL,
  phase_id                UUID NOT NULL REFERENCES production_phases(id),
  crop_day                INT,
  status                  activity_status NOT NULL DEFAULT 'in_progress',
  notes                   TEXT,
  company_id              UUID REFERENCES companies(id), -- redundant for RLS Type C
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES users(id),
  updated_by              UUID REFERENCES users(id)
);

-- scheduled_activities.completed_activity_id -> activities
ALTER TABLE scheduled_activities
  ADD CONSTRAINT fk_sa_completed_activity FOREIGN KEY (completed_activity_id) REFERENCES activities(id);

CREATE TABLE activity_resources (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id         UUID NOT NULL REFERENCES activities(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  inventory_item_id   UUID REFERENCES inventory_items(id),
  quantity_planned    DECIMAL,
  quantity_actual     DECIMAL NOT NULL,
  unit_id             UUID NOT NULL REFERENCES units_of_measure(id),
  cost_total          DECIMAL,
  transaction_id      UUID REFERENCES inventory_transactions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id)
);

CREATE TABLE activity_observations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id       UUID NOT NULL REFERENCES activities(id),
  type              observation_type NOT NULL,
  severity          severity_level NOT NULL DEFAULT 'info',
  description       TEXT NOT NULL,
  affected_plants   INT,
  action_taken      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id)
);

-- ============================================================
-- DEFERRED FK from US-003-003 (now that activities exists)
-- ============================================================

-- inventory_transactions.activity_id -> activities
ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_it_activity FOREIGN KEY (activity_id) REFERENCES activities(id);
-- 06_nexo_orders_quality_ops.sql
-- US-003-005: Nexo (2) + Orders (2) + Quality (2) + Operations (5) = 11 tables

-- ============================================================
-- DOMAIN: ORDERS (created before batches so batch can reference orders)
-- ============================================================

CREATE TABLE production_orders (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                        VARCHAR NOT NULL UNIQUE,
  company_id                  UUID NOT NULL REFERENCES companies(id),
  cultivar_id                 UUID NOT NULL REFERENCES cultivars(id),
  entry_phase_id              UUID NOT NULL REFERENCES production_phases(id),
  exit_phase_id               UUID NOT NULL REFERENCES production_phases(id),
  initial_quantity            DECIMAL NOT NULL,
  initial_unit_id             UUID NOT NULL REFERENCES units_of_measure(id),
  initial_product_id          UUID REFERENCES products(id),
  expected_output_quantity    DECIMAL,
  expected_output_product_id  UUID REFERENCES products(id),
  zone_id                     UUID REFERENCES zones(id),
  planned_start_date          DATE NOT NULL,
  planned_end_date            DATE,
  assigned_to                 UUID REFERENCES users(id),
  status                      order_status NOT NULL DEFAULT 'draft',
  priority                    order_priority NOT NULL DEFAULT 'normal',
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID REFERENCES users(id),
  updated_by                  UUID REFERENCES users(id)
);

-- ============================================================
-- DOMAIN: NEXO (Batches)
-- ============================================================

CREATE TABLE batches (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                      VARCHAR NOT NULL UNIQUE,
  cultivar_id               UUID NOT NULL REFERENCES cultivars(id),
  zone_id                   UUID NOT NULL REFERENCES zones(id),
  plant_count               INT NOT NULL,
  area_m2                   DECIMAL,
  source_inventory_item_id  UUID REFERENCES inventory_items(id),
  current_product_id        UUID REFERENCES products(id),
  schedule_id               UUID REFERENCES cultivation_schedules(id),
  current_phase_id          UUID NOT NULL REFERENCES production_phases(id),
  production_order_id       UUID REFERENCES production_orders(id),
  parent_batch_id           UUID REFERENCES batches(id),
  start_date                DATE NOT NULL,
  expected_end_date         DATE,
  status                    batch_status NOT NULL DEFAULT 'active',
  yield_wet_kg              DECIMAL,
  yield_dry_kg              DECIMAL,
  total_cost                DECIMAL,
  company_id                UUID REFERENCES companies(id), -- redundant for RLS Type C
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                UUID REFERENCES users(id),
  updated_by                UUID REFERENCES users(id)
);

CREATE TABLE batch_lineage (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation               lineage_operation NOT NULL,
  parent_batch_id         UUID NOT NULL REFERENCES batches(id),
  child_batch_id          UUID NOT NULL REFERENCES batches(id),
  quantity_transferred    DECIMAL NOT NULL,
  unit_id                 UUID NOT NULL REFERENCES units_of_measure(id),
  reason                  TEXT NOT NULL,
  performed_by            UUID NOT NULL REFERENCES users(id),
  performed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DOMAIN: ORDERS (continued — order phases need batches FK)
-- ============================================================

CREATE TABLE production_order_phases (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES production_orders(id),
  phase_id              UUID NOT NULL REFERENCES production_phases(id),
  sort_order            INT NOT NULL,
  planned_start_date    DATE,
  planned_end_date      DATE,
  planned_duration_days INT,
  zone_id               UUID REFERENCES zones(id),
  actual_start_date     DATE,
  actual_end_date       DATE,
  batch_id              UUID REFERENCES batches(id),
  input_quantity        DECIMAL,
  output_quantity       DECIMAL,
  yield_pct             DECIMAL,
  status                order_phase_status NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES users(id),
  updated_by            UUID REFERENCES users(id)
);

-- ============================================================
-- DOMAIN: QUALITY
-- ============================================================

CREATE TABLE quality_tests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id        UUID NOT NULL REFERENCES batches(id),
  phase_id        UUID REFERENCES production_phases(id),
  test_type       VARCHAR NOT NULL,
  lab_name        VARCHAR,
  lab_reference   VARCHAR,
  sample_date     DATE NOT NULL,
  result_date     DATE,
  status          test_status NOT NULL DEFAULT 'pending',
  overall_pass    BOOLEAN,
  notes           TEXT,
  performed_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE TABLE quality_test_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id         UUID NOT NULL REFERENCES quality_tests(id),
  parameter       VARCHAR NOT NULL,
  value           VARCHAR NOT NULL,
  numeric_value   DECIMAL,
  unit            VARCHAR,
  min_threshold   DECIMAL,
  max_threshold   DECIMAL,
  passed          BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DOMAIN: OPERATIONS
-- ============================================================

CREATE TABLE overhead_costs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id       UUID NOT NULL REFERENCES facilities(id),
  zone_id           UUID REFERENCES zones(id),
  cost_type         cost_type NOT NULL,
  description       VARCHAR NOT NULL,
  amount            DECIMAL NOT NULL,
  currency          CHAR(3) NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  allocation_basis  allocation_basis NOT NULL DEFAULT 'even_split',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id)
);

CREATE TABLE sensors (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id           UUID NOT NULL REFERENCES zones(id),
  type              sensor_type NOT NULL,
  brand_model       VARCHAR,
  serial_number     VARCHAR,
  calibration_date  DATE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id)
);

CREATE TABLE environmental_readings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id   UUID NOT NULL REFERENCES sensors(id),
  zone_id     UUID NOT NULL REFERENCES zones(id),
  parameter   reading_parameter NOT NULL,
  value       DECIMAL NOT NULL,
  unit        VARCHAR NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              alert_type NOT NULL,
  severity          alert_severity NOT NULL DEFAULT 'info',
  entity_type       VARCHAR NOT NULL,
  entity_id         UUID NOT NULL,
  message           TEXT NOT NULL,
  triggered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by   UUID REFERENCES users(id),
  acknowledged_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  company_id        UUID REFERENCES companies(id), -- for RLS Type A
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     VARCHAR NOT NULL,
  entity_id       UUID NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       VARCHAR NOT NULL,
  file_size_bytes INT,
  description     VARCHAR,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RESOLVE ALL REMAINING DEFERRED FKs
-- ============================================================

-- plant_positions.current_batch_id -> batches
ALTER TABLE plant_positions
  ADD CONSTRAINT fk_pp_current_batch FOREIGN KEY (current_batch_id) REFERENCES batches(id);

-- inventory_transactions.batch_id -> batches
ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_it_batch FOREIGN KEY (batch_id) REFERENCES batches(id);

-- recipe_executions.batch_id -> batches
ALTER TABLE recipe_executions
  ADD CONSTRAINT fk_re_batch FOREIGN KEY (batch_id) REFERENCES batches(id);

-- scheduled_activities.batch_id -> batches
ALTER TABLE scheduled_activities
  ADD CONSTRAINT fk_sa_batch FOREIGN KEY (batch_id) REFERENCES batches(id);

-- activities.batch_id -> batches
ALTER TABLE activities
  ADD CONSTRAINT fk_act_batch FOREIGN KEY (batch_id) REFERENCES batches(id);
-- 07_triggers.sql
-- Triggers: updated_at, immutability for inventory_transactions, auto-populate company_id

-- ============================================================
-- 1. Generic updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that have updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'companies', 'users', 'crop_types', 'cultivars', 'production_phases',
      'phase_product_flows', 'cultivar_products',
      'facilities', 'zones', 'zone_structures', 'plant_positions',
      'resource_categories', 'units_of_measure', 'suppliers', 'products',
      'inventory_items', 'recipes', 'recipe_executions',
      'activity_types', 'activity_templates', 'activity_template_resources',
      'activity_template_checklist', 'cultivation_schedules', 'scheduled_activities',
      'activities', 'activity_resources', 'activity_observations',
      'production_orders', 'production_order_phases',
      'batches', 'quality_tests', 'quality_test_results',
      'overhead_costs', 'sensors', 'alerts'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 2. Immutability trigger for inventory_transactions (append-only)
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_inventory_transaction_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'inventory_transactions is append-only: UPDATE and DELETE are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_transactions_immutable
  BEFORE UPDATE OR DELETE ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_inventory_transaction_mutation();

-- ============================================================
-- 3. Auto-populate company_id on batches from zone -> facility
-- ============================================================

CREATE OR REPLACE FUNCTION set_batch_company_id()
RETURNS trigger AS $$
BEGIN
  NEW.company_id := (
    SELECT f.company_id
    FROM zones z
    JOIN facilities f ON z.facility_id = f.id
    WHERE z.id = NEW.zone_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_batch_company
  BEFORE INSERT OR UPDATE ON batches
  FOR EACH ROW
  EXECUTE FUNCTION set_batch_company_id();

-- ============================================================
-- 4. Auto-populate company_id on activities from zone -> facility
-- ============================================================

CREATE OR REPLACE FUNCTION set_activity_company_id()
RETURNS trigger AS $$
BEGIN
  NEW.company_id := (
    SELECT f.company_id
    FROM zones z
    JOIN facilities f ON z.facility_id = f.id
    WHERE z.id = NEW.zone_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_company
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION set_activity_company_id();

-- ============================================================
-- 5. Auto-populate company_id on inventory_transactions from zone or user
-- ============================================================

CREATE OR REPLACE FUNCTION set_inv_transaction_company_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.zone_id IS NOT NULL THEN
    NEW.company_id := (
      SELECT f.company_id
      FROM zones z
      JOIN facilities f ON z.facility_id = f.id
      WHERE z.id = NEW.zone_id
    );
  ELSE
    NEW.company_id := (
      SELECT u.company_id FROM users u WHERE u.id = NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inv_transaction_company
  BEFORE INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_inv_transaction_company_id();
-- 08_indices.sql
-- Composite indices for frequent queries

-- Inventory transactions: cost by batch, type and time
CREATE INDEX idx_inv_transactions_batch_type_ts
  ON inventory_transactions (batch_id, type, timestamp);

-- Activities: timeline by batch, phase, and time
CREATE INDEX idx_activities_batch_phase_at
  ON activities (batch_id, phase_id, performed_at);

-- Scheduled activities: dashboard of pending activities
CREATE INDEX idx_scheduled_activities_batch_status_date
  ON scheduled_activities (batch_id, status, planned_date);

-- Plant positions: zone occupancy
CREATE INDEX idx_plant_positions_zone_status
  ON plant_positions (zone_id, status);

-- Environmental readings: time series by zone and parameter
CREATE INDEX idx_env_readings_zone_param_ts
  ON environmental_readings (zone_id, parameter, timestamp);

-- Quality tests: pending tests by batch
CREATE INDEX idx_quality_tests_batch_status
  ON quality_tests (batch_id, status);

-- Alerts: active alerts by entity
CREATE INDEX idx_alerts_entity_resolved
  ON alerts (entity_type, entity_id, resolved_at);

-- Batches: by company for RLS
CREATE INDEX idx_batches_company
  ON batches (company_id);

-- Activities: by company for RLS
CREATE INDEX idx_activities_company
  ON activities (company_id);

-- Inventory transactions: by company for RLS
CREATE INDEX idx_inv_transactions_company
  ON inventory_transactions (company_id);

-- Users: by company
CREATE INDEX idx_users_company
  ON users (company_id);

-- Facilities: by company
CREATE INDEX idx_facilities_company
  ON facilities (company_id);

-- Zones: by facility
CREATE INDEX idx_zones_facility
  ON zones (facility_id);

-- Products: by category
CREATE INDEX idx_products_category
  ON products (category_id);

-- Inventory items: by product and zone
CREATE INDEX idx_inv_items_product_zone
  ON inventory_items (product_id, zone_id);

-- Production orders: by company and status
CREATE INDEX idx_prod_orders_company_status
  ON production_orders (company_id, status);

-- Batches: by zone and status
CREATE INDEX idx_batches_zone_status
  ON batches (zone_id, status);
-- 09_rls_policies.sql
-- US-003-006: Row Level Security policies
-- Type A: company_id direct
-- Type B: via facility -> company
-- Type C: company_id redundant (auto-populated by triggers)
-- Type D: global catalogs (read all, write admin only)

-- ============================================================
-- TYPE A — Tables with company_id direct
-- companies, users, suppliers, production_orders, cultivation_schedules,
-- recipes, overhead_costs, sensors, alerts
-- ============================================================

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON companies FOR SELECT USING (id = public.current_company_id());
CREATE POLICY "tenant_insert" ON companies FOR INSERT WITH CHECK (id = public.current_company_id());
CREATE POLICY "tenant_update" ON companies FOR UPDATE USING (id = public.current_company_id());
CREATE POLICY "tenant_delete" ON companies FOR DELETE USING (id = public.current_company_id());

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON users FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON users FOR INSERT WITH CHECK (company_id = public.current_company_id() AND public.current_user_role() = 'admin');
CREATE POLICY "tenant_update" ON users FOR UPDATE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');
CREATE POLICY "tenant_delete" ON users FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON suppliers FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON suppliers FOR INSERT WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "tenant_update" ON suppliers FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON suppliers FOR DELETE USING (company_id = public.current_company_id());

-- production_orders
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON production_orders FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON production_orders FOR INSERT
  WITH CHECK (company_id = public.current_company_id() AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON production_orders FOR UPDATE
  USING (company_id = public.current_company_id() AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON production_orders FOR DELETE
  USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- cultivation_schedules
ALTER TABLE cultivation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON cultivation_schedules FOR SELECT USING (true);
CREATE POLICY "tenant_insert" ON cultivation_schedules FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON cultivation_schedules FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON cultivation_schedules FOR DELETE USING (public.current_user_role() = 'admin');

-- recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON recipes FOR SELECT USING (true);
CREATE POLICY "tenant_insert" ON recipes FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON recipes FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON recipes FOR DELETE USING (public.current_user_role() = 'admin');

-- overhead_costs
ALTER TABLE overhead_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON overhead_costs FOR SELECT
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON overhead_costs FOR INSERT
  WITH CHECK (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON overhead_costs FOR UPDATE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON overhead_costs FOR DELETE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id())
    AND public.current_user_role() = 'admin');

-- sensors
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON sensors FOR SELECT
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON sensors FOR INSERT
  WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON sensors FOR UPDATE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON sensors FOR DELETE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));

-- alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON alerts FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON alerts FOR INSERT WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "tenant_update" ON alerts FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON alerts FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- ============================================================
-- TYPE B — Tables that inherit via facility -> company
-- facilities, zones, zone_structures, plant_positions
-- ============================================================

-- facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON facilities FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON facilities FOR INSERT WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "tenant_update" ON facilities FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON facilities FOR DELETE USING (company_id = public.current_company_id());

-- zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON zones FOR SELECT
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON zones FOR INSERT
  WITH CHECK (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON zones FOR UPDATE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON zones FOR DELETE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));

-- zone_structures
ALTER TABLE zone_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON zone_structures FOR SELECT
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON zone_structures FOR INSERT
  WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON zone_structures FOR UPDATE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON zone_structures FOR DELETE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));

-- plant_positions
ALTER TABLE plant_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON plant_positions FOR SELECT
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON plant_positions FOR INSERT
  WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON plant_positions FOR UPDATE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON plant_positions FOR DELETE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));

-- ============================================================
-- TYPE C — Tables with redundant company_id (auto-populated by triggers)
-- batches, activities, inventory_transactions
-- Also: batch_lineage, scheduled_activities, activity_resources,
--        activity_observations, quality_tests, quality_test_results,
--        recipe_executions, production_order_phases
-- ============================================================

-- batches (has company_id, auto-populated)
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON batches FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON batches FOR INSERT WITH CHECK (
  zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
);
CREATE POLICY "tenant_update" ON batches FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON batches FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- activities (has company_id, auto-populated)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON activities FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON activities FOR INSERT WITH CHECK (
  zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  AND public.current_user_role() IN ('operator', 'supervisor', 'manager', 'admin')
);
CREATE POLICY "tenant_update" ON activities FOR UPDATE USING (
  company_id = public.current_company_id()
  AND public.current_user_role() IN ('operator', 'supervisor', 'manager', 'admin')
);
CREATE POLICY "tenant_delete" ON activities FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- inventory_transactions (has company_id, auto-populated)
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON inventory_transactions FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON inventory_transactions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE company_id = public.current_company_id())
);
-- No UPDATE/DELETE policies: append-only table (enforced by trigger)

-- batch_lineage (via batch -> company)
ALTER TABLE batch_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON batch_lineage FOR SELECT
  USING (parent_batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON batch_lineage FOR INSERT
  WITH CHECK (parent_batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));

-- scheduled_activities (via batch or schedule)
ALTER TABLE scheduled_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON scheduled_activities FOR SELECT
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON scheduled_activities FOR INSERT
  WITH CHECK (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON scheduled_activities FOR UPDATE
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));

-- activity_resources (via activity -> company)
ALTER TABLE activity_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON activity_resources FOR SELECT
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON activity_resources FOR INSERT
  WITH CHECK (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON activity_resources FOR UPDATE
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));

-- activity_observations (via activity -> company)
ALTER TABLE activity_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON activity_observations FOR SELECT
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON activity_observations FOR INSERT
  WITH CHECK (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON activity_observations FOR UPDATE
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));

-- quality_tests (via batch -> company)
ALTER TABLE quality_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON quality_tests FOR SELECT
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON quality_tests FOR INSERT
  WITH CHECK (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));
CREATE POLICY "tenant_update" ON quality_tests FOR UPDATE
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));

-- quality_test_results (via test -> batch -> company)
ALTER TABLE quality_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON quality_test_results FOR SELECT
  USING (test_id IN (SELECT qt.id FROM quality_tests qt JOIN batches b ON qt.batch_id = b.id WHERE b.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON quality_test_results FOR INSERT
  WITH CHECK (test_id IN (SELECT qt.id FROM quality_tests qt JOIN batches b ON qt.batch_id = b.id WHERE b.company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));
CREATE POLICY "tenant_update" ON quality_test_results FOR UPDATE
  USING (test_id IN (SELECT qt.id FROM quality_tests qt JOIN batches b ON qt.batch_id = b.id WHERE b.company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));

-- recipe_executions (via recipe — global catalog, but batch scoped)
ALTER TABLE recipe_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON recipe_executions FOR SELECT
  USING (executed_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON recipe_executions FOR INSERT
  WITH CHECK (executed_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON recipe_executions FOR UPDATE
  USING (executed_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));

-- production_order_phases (via order -> company)
ALTER TABLE production_order_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON production_order_phases FOR SELECT
  USING (order_id IN (SELECT id FROM production_orders WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON production_order_phases FOR INSERT
  WITH CHECK (order_id IN (SELECT id FROM production_orders WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON production_order_phases FOR UPDATE
  USING (order_id IN (SELECT id FROM production_orders WHERE company_id = public.current_company_id()));

-- inventory_items (via product/zone - use zone path for tenant isolation)
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON inventory_items FOR SELECT
  USING (
    zone_id IS NULL
    OR zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  );
CREATE POLICY "tenant_insert" ON inventory_items FOR INSERT
  WITH CHECK (
    zone_id IS NULL
    OR zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  );
CREATE POLICY "tenant_update" ON inventory_items FOR UPDATE
  USING (
    zone_id IS NULL
    OR zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  );

-- attachments (polymorphic — use uploaded_by for tenant isolation)
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON attachments FOR SELECT
  USING (uploaded_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON attachments FOR INSERT
  WITH CHECK (uploaded_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));

-- ============================================================
-- TYPE D — Global catalogs (read all, write admin only)
-- crop_types, production_phases, phase_product_flows,
-- resource_categories, units_of_measure, activity_types,
-- activity_templates, activity_template_phases,
-- activity_template_resources, activity_template_checklist
-- ============================================================

-- crop_types
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON crop_types FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON crop_types FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON crop_types FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON crop_types FOR DELETE USING (public.current_user_role() = 'admin');

-- cultivars
ALTER TABLE cultivars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON cultivars FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON cultivars FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON cultivars FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON cultivars FOR DELETE USING (public.current_user_role() = 'admin');

-- production_phases
ALTER TABLE production_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON production_phases FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON production_phases FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON production_phases FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON production_phases FOR DELETE USING (public.current_user_role() = 'admin');

-- phase_product_flows
ALTER TABLE phase_product_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON phase_product_flows FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON phase_product_flows FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON phase_product_flows FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON phase_product_flows FOR DELETE USING (public.current_user_role() = 'admin');

-- cultivar_products
ALTER TABLE cultivar_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON cultivar_products FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON cultivar_products FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON cultivar_products FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON cultivar_products FOR DELETE USING (public.current_user_role() = 'admin');

-- resource_categories
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON resource_categories FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON resource_categories FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON resource_categories FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON resource_categories FOR DELETE USING (public.current_user_role() = 'admin');

-- units_of_measure
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON units_of_measure FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON units_of_measure FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON units_of_measure FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON units_of_measure FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_types
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_types FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_types FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON activity_types FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON activity_types FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_templates
ALTER TABLE activity_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_templates FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_templates FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_templates FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_templates FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_template_phases
ALTER TABLE activity_template_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_template_phases FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_template_phases FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_template_phases FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_template_phases FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_template_resources
ALTER TABLE activity_template_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_template_resources FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_template_resources FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_template_resources FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_template_resources FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_template_checklist
ALTER TABLE activity_template_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_template_checklist FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_template_checklist FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_template_checklist FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_template_checklist FOR DELETE USING (public.current_user_role() = 'admin');
