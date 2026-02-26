-- Crop types and production phases
-- PRD 10 — /settings/crop-types

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE crop_category AS ENUM ('annual', 'perennial', 'biennial');

-- =============================================================
-- CROP TYPES
-- =============================================================
CREATE TABLE crop_types (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  code                  VARCHAR(50) NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  scientific_name       VARCHAR(200),
  category              crop_category NOT NULL,
  regulatory_framework  VARCHAR(200),
  icon                  VARCHAR(50),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_by            UUID
);

CREATE UNIQUE INDEX idx_crop_types_code_company
  ON crop_types (company_id, LOWER(code));
CREATE INDEX idx_crop_types_company
  ON crop_types (company_id);

ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON crop_types
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- PRODUCTION PHASES (child of crop_types — Pattern 2 RLS)
-- =============================================================
CREATE TABLE production_phases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_id          UUID NOT NULL REFERENCES crop_types(id) ON DELETE CASCADE,
  code                  VARCHAR(50) NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  sort_order            INT NOT NULL DEFAULT 1,
  default_duration_days INT,
  is_transformation     BOOLEAN NOT NULL DEFAULT false,
  is_destructive        BOOLEAN NOT NULL DEFAULT false,
  requires_zone_change  BOOLEAN NOT NULL DEFAULT false,
  can_skip              BOOLEAN NOT NULL DEFAULT false,
  can_be_entry_point    BOOLEAN NOT NULL DEFAULT false,
  can_be_exit_point     BOOLEAN NOT NULL DEFAULT false,
  depends_on_phase_id   UUID REFERENCES production_phases(id),
  icon                  VARCHAR(50),
  color                 VARCHAR(20),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_by            UUID
);

-- Unique code per crop_type
CREATE UNIQUE INDEX idx_production_phases_code_crop
  ON production_phases (crop_type_id, LOWER(code));
CREATE INDEX idx_production_phases_crop_type
  ON production_phases (crop_type_id);

ALTER TABLE production_phases ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON production_phases
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RLS POLICIES: crop_types (Pattern 1 + Pattern 3)
-- =============================================================

CREATE POLICY "ct_select_company" ON crop_types
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "ct_insert_admin_manager" ON crop_types
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "ct_update_admin_manager" ON crop_types
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "ct_service_role" ON crop_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: production_phases (Pattern 2 — inherits via FK)
-- =============================================================

CREATE POLICY "pp_select" ON production_phases
  FOR SELECT USING (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "pp_insert_admin_manager" ON production_phases
  FOR INSERT WITH CHECK (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "pp_update_admin_manager" ON production_phases
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

CREATE POLICY "pp_delete_admin_manager" ON production_phases
  FOR DELETE USING (
    crop_type_id IN (
      SELECT id FROM crop_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "pp_service_role" ON production_phases
  FOR ALL TO service_role USING (true) WITH CHECK (true);
