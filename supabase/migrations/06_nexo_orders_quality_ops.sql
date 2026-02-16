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
