-- =============================================================
-- Migration 23: Phase 6 — Integrity fixes from code review
-- Fixes: CRITICAL-1 (RLS), CRITICAL-2 (Realtime partitions),
--        CRITICAL-3 (enum gap), WARNING-1 (aggregation bucketing)
-- =============================================================

-- =============================================================
-- CRITICAL-1: Add 'supervisor' to sensors UPDATE RLS policy
-- The UI allows supervisors to toggle is_active, but RLS blocked them.
-- =============================================================
DROP POLICY IF EXISTS "sensors_update_roles" ON sensors;
CREATE POLICY "sensors_update_roles" ON sensors
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

-- =============================================================
-- CRITICAL-2: Enable publish_via_partition_root for Realtime
-- Without this, INSERTs into child partitions of environmental_readings
-- are not published to Realtime subscribers on the parent table.
-- =============================================================
ALTER PUBLICATION supabase_realtime SET (publish_via_partition_root = true);

-- =============================================================
-- CRITICAL-3: Add 'soil_moisture' to env_parameter enum
-- sensor_type has 'soil_moisture' but env_parameter was missing it.
-- Without this, readings from soil_moisture sensors fail on INSERT.
-- =============================================================
ALTER TYPE env_parameter ADD VALUE IF NOT EXISTS 'soil_moisture' AFTER 'ph';

-- =============================================================
-- WARNING-1: Fix get_env_readings_aggregated bucketing for >1h intervals
-- Old logic: date_trunc('hour') + sub-hour offset → always hourly for 4h intervals
-- New logic: epoch-based bucketing that works for any interval size
-- =============================================================
CREATE OR REPLACE FUNCTION get_env_readings_aggregated(
  p_zone_id UUID,
  p_parameter env_parameter,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_interval INTERVAL DEFAULT '1 hour'
)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  avg_value DECIMAL,
  min_value DECIMAL,
  max_value DECIMAL,
  reading_count BIGINT
) AS $$
DECLARE
  interval_secs DOUBLE PRECISION;
BEGIN
  interval_secs := EXTRACT(EPOCH FROM p_interval);

  RETURN QUERY
  SELECT
    to_timestamp(
      FLOOR(EXTRACT(EPOCH FROM er.timestamp) / interval_secs) * interval_secs
    ) AS bucket,
    ROUND(AVG(er.value), 2) AS avg_value,
    MIN(er.value) AS min_value,
    MAX(er.value) AS max_value,
    COUNT(*) AS reading_count
  FROM environmental_readings er
  WHERE er.zone_id = p_zone_id
    AND er.parameter = p_parameter
    AND er.timestamp >= p_start
    AND er.timestamp < p_end
  GROUP BY 1
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
