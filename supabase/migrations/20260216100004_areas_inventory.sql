-- 04_areas_inventory.sql
-- US-003-003: Areas (4 tables) + Inventory (8 tables) = 12 tables
-- Note: plant_positions.current_batch_id without FK (batches doesn't exist yet)
-- Note: inventory_transactions has several deferred FKs (batches, activities don't exist yet)

-- ============================================================
-- DOMAIN: AREAS
-- ============================================================

CREATE TABLE facilities (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
