-- Areas domain: facilities, zones, zone_structures
-- PRD 14 — /areas/facilities, PRD 15 — /areas/zones

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE facility_type AS ENUM ('indoor_warehouse', 'greenhouse', 'tunnel', 'open_field', 'vertical_farm');
CREATE TYPE zone_purpose AS ENUM ('propagation', 'vegetation', 'flowering', 'drying', 'processing', 'storage', 'multipurpose');
CREATE TYPE zone_environment AS ENUM ('indoor_controlled', 'greenhouse', 'tunnel', 'open_field');
CREATE TYPE zone_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE structure_type AS ENUM ('mobile_rack', 'fixed_rack', 'rolling_bench', 'row', 'bed', 'trellis_row', 'nft_channel');

-- =============================================================
-- FACILITIES (Pattern 1 RLS with company_id)
-- =============================================================
CREATE TABLE facilities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  name                  VARCHAR(200) NOT NULL,
  type                  facility_type NOT NULL,
  total_footprint_m2    DECIMAL(12,2) NOT NULL,
  total_growing_area_m2 DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_plant_capacity  INT NOT NULL DEFAULT 0,
  address               TEXT NOT NULL,
  latitude              DECIMAL(10,7),
  longitude             DECIMAL(10,7),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_by            UUID
);

CREATE UNIQUE INDEX idx_facilities_name_company
  ON facilities (company_id, LOWER(name));
CREATE INDEX idx_facilities_company
  ON facilities (company_id);
CREATE INDEX idx_facilities_active
  ON facilities (company_id, is_active);

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- ZONES (Pattern 2 RLS via facility → company_id)
-- =============================================================
CREATE TABLE zones (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id              UUID NOT NULL REFERENCES facilities(id),
  name                     VARCHAR(200) NOT NULL,
  purpose                  zone_purpose NOT NULL,
  environment              zone_environment NOT NULL,
  area_m2                  DECIMAL(12,2) NOT NULL,
  height_m                 DECIMAL(6,2),
  effective_growing_area_m2 DECIMAL(12,2) NOT NULL DEFAULT 0,
  plant_capacity           INT NOT NULL DEFAULT 0,
  climate_config           JSONB,
  status                   zone_status NOT NULL DEFAULT 'active',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by               UUID,
  updated_by               UUID
);

CREATE UNIQUE INDEX idx_zones_name_facility
  ON zones (facility_id, LOWER(name));
CREATE INDEX idx_zones_facility
  ON zones (facility_id);
CREATE INDEX idx_zones_status
  ON zones (facility_id, status);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- ZONE STRUCTURES (Pattern 2 via zone → facility → company)
-- =============================================================
CREATE TABLE zone_structures (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id             UUID NOT NULL REFERENCES zones(id),
  name                VARCHAR(200) NOT NULL,
  type                structure_type NOT NULL,
  length_m            DECIMAL(8,2) NOT NULL,
  width_m             DECIMAL(8,2) NOT NULL,
  is_mobile           BOOLEAN NOT NULL DEFAULT false,
  num_levels          INT NOT NULL DEFAULT 1,
  positions_per_level INT,
  max_positions       INT GENERATED ALWAYS AS (num_levels * positions_per_level) STORED,
  level_config        JSONB,
  spacing_cm          DECIMAL(6,2),
  pot_size_l          DECIMAL(6,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  updated_by          UUID
);

CREATE INDEX idx_zone_structures_zone
  ON zone_structures (zone_id);

ALTER TABLE zone_structures ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON zone_structures
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- TRIGGER: calculate_facility_totals
-- Recalculates total_growing_area_m2 and total_plant_capacity
-- on facilities when zones are inserted/updated/deleted.
-- Excludes inactive zones from sums.
-- =============================================================
CREATE OR REPLACE FUNCTION calculate_facility_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_facility_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_facility_id := OLD.facility_id;
  ELSE
    target_facility_id := NEW.facility_id;
  END IF;

  -- Also handle facility_id change on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.facility_id IS DISTINCT FROM NEW.facility_id THEN
    UPDATE facilities SET
      total_growing_area_m2 = COALESCE((
        SELECT SUM(effective_growing_area_m2) FROM zones
        WHERE facility_id = OLD.facility_id AND status != 'inactive'
      ), 0),
      total_plant_capacity = COALESCE((
        SELECT SUM(plant_capacity) FROM zones
        WHERE facility_id = OLD.facility_id AND status != 'inactive'
      ), 0)
    WHERE id = OLD.facility_id;
  END IF;

  UPDATE facilities SET
    total_growing_area_m2 = COALESCE((
      SELECT SUM(effective_growing_area_m2) FROM zones
      WHERE facility_id = target_facility_id AND status != 'inactive'
    ), 0),
    total_plant_capacity = COALESCE((
      SELECT SUM(plant_capacity) FROM zones
      WHERE facility_id = target_facility_id AND status != 'inactive'
    ), 0)
  WHERE id = target_facility_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_calculate_facility_totals
  AFTER INSERT OR UPDATE OR DELETE ON zones
  FOR EACH ROW EXECUTE FUNCTION calculate_facility_totals();

-- =============================================================
-- TRIGGER: calculate_zone_capacity
-- Recalculates effective_growing_area_m2 and plant_capacity
-- on zones when zone_structures are inserted/updated/deleted.
-- =============================================================
CREATE OR REPLACE FUNCTION calculate_zone_capacity()
RETURNS TRIGGER AS $$
DECLARE
  target_zone_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_zone_id := OLD.zone_id;
  ELSE
    target_zone_id := NEW.zone_id;
  END IF;

  -- Also handle zone_id change on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.zone_id IS DISTINCT FROM NEW.zone_id THEN
    UPDATE zones SET
      effective_growing_area_m2 = COALESCE((
        SELECT SUM(length_m * width_m * num_levels) FROM zone_structures
        WHERE zone_id = OLD.zone_id
      ), area_m2),
      plant_capacity = COALESCE((
        SELECT SUM(max_positions) FROM zone_structures
        WHERE zone_id = OLD.zone_id AND max_positions IS NOT NULL
      ), 0)
    WHERE id = OLD.zone_id;
  END IF;

  UPDATE zones SET
    effective_growing_area_m2 = COALESCE(
      NULLIF((SELECT SUM(length_m * width_m * num_levels) FROM zone_structures WHERE zone_id = target_zone_id), 0),
      area_m2
    ),
    plant_capacity = COALESCE((
      SELECT SUM(max_positions) FROM zone_structures
      WHERE zone_id = target_zone_id AND max_positions IS NOT NULL
    ), 0)
  WHERE id = target_zone_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_calculate_zone_capacity
  AFTER INSERT OR UPDATE OR DELETE ON zone_structures
  FOR EACH ROW EXECUTE FUNCTION calculate_zone_capacity();

-- =============================================================
-- FK: users.assigned_facility_id → facilities
-- =============================================================
ALTER TABLE users
  ADD CONSTRAINT fk_users_assigned_facility
  FOREIGN KEY (assigned_facility_id) REFERENCES facilities(id);

-- =============================================================
-- RLS POLICIES: facilities (Pattern 1 + Pattern 3)
-- =============================================================

CREATE POLICY "facilities_select_company" ON facilities
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "facilities_insert_admin_manager" ON facilities
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "facilities_update_admin_manager" ON facilities
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "facilities_service_role" ON facilities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: zones (Pattern 2 via facility)
-- =============================================================

CREATE POLICY "zones_select" ON zones
  FOR SELECT USING (
    facility_id IN (
      SELECT id FROM facilities WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "zones_insert_admin_manager" ON zones
  FOR INSERT WITH CHECK (
    facility_id IN (
      SELECT id FROM facilities WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "zones_update_admin_manager" ON zones
  FOR UPDATE
  USING (
    facility_id IN (
      SELECT id FROM facilities WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    facility_id IN (
      SELECT id FROM facilities WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "zones_service_role" ON zones
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: zone_structures (Pattern 2 via zone → facility)
-- =============================================================

CREATE POLICY "zs_select" ON zone_structures
  FOR SELECT USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "zs_insert_admin_manager" ON zone_structures
  FOR INSERT WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "zs_update_admin_manager" ON zone_structures
  FOR UPDATE
  USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "zs_service_role" ON zone_structures
  FOR ALL TO service_role USING (true) WITH CHECK (true);
