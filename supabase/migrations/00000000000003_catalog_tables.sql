-- Catalog tables: resource_categories, units_of_measure, activity_types
-- PRD 09 — /settings/catalog

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE lot_tracking AS ENUM ('required', 'optional', 'none');
CREATE TYPE unit_dimension AS ENUM ('mass', 'volume', 'count', 'area', 'energy', 'time', 'concentration');

-- =============================================================
-- RESOURCE CATEGORIES (hierarchical)
-- =============================================================
CREATE TABLE resource_categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  parent_id             UUID REFERENCES resource_categories(id),
  code                  VARCHAR(50) NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  icon                  VARCHAR(50),
  color                 VARCHAR(20),
  is_consumable         BOOLEAN NOT NULL DEFAULT false,
  is_depreciable        BOOLEAN NOT NULL DEFAULT false,
  is_transformable      BOOLEAN NOT NULL DEFAULT false,
  default_lot_tracking  lot_tracking NOT NULL DEFAULT 'none',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_by            UUID
);

-- Unique code per company (case-insensitive)
CREATE UNIQUE INDEX idx_resource_categories_code_company
  ON resource_categories (company_id, LOWER(code));
CREATE INDEX idx_resource_categories_company
  ON resource_categories (company_id);
CREATE INDEX idx_resource_categories_parent
  ON resource_categories (parent_id);

ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON resource_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- UNITS OF MEASURE
-- =============================================================
CREATE TABLE units_of_measure (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  code            VARCHAR(20) NOT NULL,
  name            VARCHAR(100) NOT NULL,
  dimension       unit_dimension NOT NULL,
  base_unit_id    UUID REFERENCES units_of_measure(id),
  to_base_factor  DECIMAL NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

-- Unique code per company
CREATE UNIQUE INDEX idx_units_of_measure_code_company
  ON units_of_measure (company_id, LOWER(code));
CREATE INDEX idx_units_of_measure_company
  ON units_of_measure (company_id);
CREATE INDEX idx_units_of_measure_dimension
  ON units_of_measure (company_id, dimension);

ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON units_of_measure
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- ACTIVITY TYPES
-- =============================================================
CREATE TABLE activity_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(100),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID,
  updated_by  UUID
);

CREATE INDEX idx_activity_types_company
  ON activity_types (company_id);

ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON activity_types
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RLS POLICIES: resource_categories
-- =============================================================

-- SELECT: any authenticated user reads their company's categories
CREATE POLICY "rc_select_company" ON resource_categories
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

-- INSERT: admin/manager only
CREATE POLICY "rc_insert_admin_manager" ON resource_categories
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

-- UPDATE: admin/manager only
CREATE POLICY "rc_update_admin_manager" ON resource_categories
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

-- Service role bypass
CREATE POLICY "rc_service_role" ON resource_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: units_of_measure
-- =============================================================

CREATE POLICY "uom_select_company" ON units_of_measure
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "uom_insert_admin_manager" ON units_of_measure
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "uom_update_admin_manager" ON units_of_measure
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "uom_delete_admin_manager" ON units_of_measure
  FOR DELETE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "uom_service_role" ON units_of_measure
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: activity_types
-- =============================================================

CREATE POLICY "at_select_company" ON activity_types
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "at_insert_admin_manager" ON activity_types
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "at_update_admin_manager" ON activity_types
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "at_service_role" ON activity_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);
