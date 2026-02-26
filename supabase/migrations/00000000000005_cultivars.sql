-- Cultivars and phase product flows
-- PRD 11 — /settings/cultivars

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE flow_direction AS ENUM ('input', 'output');
CREATE TYPE product_role AS ENUM ('primary', 'secondary', 'byproduct', 'waste');

-- =============================================================
-- CULTIVARS (child of crop_types — Pattern 2 RLS)
-- =============================================================
CREATE TABLE cultivars (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_id                UUID NOT NULL REFERENCES crop_types(id) ON DELETE CASCADE,
  code                        VARCHAR(50) NOT NULL,
  name                        VARCHAR(200) NOT NULL,
  breeder                     VARCHAR(200),
  genetics                    VARCHAR(200),
  default_cycle_days          INT,
  phase_durations             JSONB,
  expected_yield_per_plant_g  DECIMAL,
  expected_dry_ratio          DECIMAL,
  target_profile              JSONB,
  quality_grade               VARCHAR(100),
  optimal_conditions          JSONB,
  density_plants_per_m2       DECIMAL,
  notes                       TEXT,
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID,
  updated_by                  UUID
);

-- Code is unique globally per company (via crop_types company_id)
-- Using a function to get company from crop_type for the unique index
CREATE UNIQUE INDEX idx_cultivars_code
  ON cultivars (crop_type_id, LOWER(code));
CREATE INDEX idx_cultivars_crop_type
  ON cultivars (crop_type_id);

ALTER TABLE cultivars ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON cultivars
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- PHASE PRODUCT FLOWS (child of cultivars — Pattern 2 RLS nested)
-- =============================================================
CREATE TABLE phase_product_flows (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id                   UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  phase_id                      UUID NOT NULL REFERENCES production_phases(id) ON DELETE CASCADE,
  direction                     flow_direction NOT NULL,
  product_role                  product_role NOT NULL,
  product_id                    UUID,  -- FK to products added in Phase 3 migration when products table exists
  product_category_id           UUID REFERENCES resource_categories(id),
  expected_yield_pct            DECIMAL,
  expected_quantity_per_input   DECIMAL,
  unit_id                       UUID REFERENCES units_of_measure(id),
  is_required                   BOOLEAN NOT NULL DEFAULT true,
  sort_order                    INT NOT NULL DEFAULT 0,
  notes                         TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                    UUID,
  updated_by                    UUID
);

CREATE INDEX idx_ppf_cultivar
  ON phase_product_flows (cultivar_id);
CREATE INDEX idx_ppf_phase
  ON phase_product_flows (phase_id);
CREATE INDEX idx_ppf_cultivar_phase
  ON phase_product_flows (cultivar_id, phase_id, direction, sort_order);

ALTER TABLE phase_product_flows ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON phase_product_flows
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RLS POLICIES: cultivars (Pattern 2 — inherits via crop_types FK)
-- =============================================================

CREATE POLICY "cv_select" ON cultivars
  FOR SELECT USING (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "cv_insert_admin_manager" ON cultivars
  FOR INSERT WITH CHECK (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "cv_update_admin_manager" ON cultivars
  FOR UPDATE
  USING (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "cv_delete_admin_manager" ON cultivars
  FOR DELETE USING (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "cv_service_role" ON cultivars
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: phase_product_flows (Pattern 2 — nested via cultivars → crop_types)
-- =============================================================

CREATE POLICY "ppf_select" ON phase_product_flows
  FOR SELECT USING (
    cultivar_id IN (
      SELECT id FROM cultivars
      WHERE crop_type_id IN (
        SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
      )
    )
  );

CREATE POLICY "ppf_insert_admin_manager" ON phase_product_flows
  FOR INSERT WITH CHECK (
    cultivar_id IN (
      SELECT id FROM cultivars
      WHERE crop_type_id IN (
        SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
      )
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "ppf_update_admin_manager" ON phase_product_flows
  FOR UPDATE
  USING (
    cultivar_id IN (
      SELECT id FROM cultivars
      WHERE crop_type_id IN (
        SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
      )
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    cultivar_id IN (
      SELECT id FROM cultivars
      WHERE crop_type_id IN (
        SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
      )
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "ppf_delete_admin_manager" ON phase_product_flows
  FOR DELETE USING (
    cultivar_id IN (
      SELECT id FROM cultivars
      WHERE crop_type_id IN (
        SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
      )
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "ppf_service_role" ON phase_product_flows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
