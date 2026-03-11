-- =============================================================
-- Migration 22: Phase 6 — pg_cron SQL Functions + Utility Functions
-- 6 cron job functions + 3 utility query functions
-- =============================================================

-- =============================================================
-- CRON JOB 1: expire_documents (daily 1:00 AM)
-- Fixes Phase 5 data integrity gap: documents never auto-expired.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_expire_documents()
RETURNS void AS $$
BEGIN
  UPDATE regulatory_documents
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'valid'
    AND expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- CRON JOB 2: check_overdue_activities (hourly)
-- Fixes Phase 5 data integrity gap: activities never marked overdue.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_check_overdue_activities()
RETURNS void AS $$
BEGIN
  UPDATE scheduled_activities
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'pending'
    AND planned_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- CRON JOB 3: check_expiring_documents (daily 6:00 AM)
-- Generates alerts for documents expiring within 30 days.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_check_expiring_documents()
RETURNS void AS $$
BEGIN
  INSERT INTO alerts (company_id, type, severity, title, entity_type, entity_id, message, triggered_at, status)
  SELECT
    rd.company_id,
    'regulatory_expiring'::alert_type,
    CASE
      WHEN rd.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'high'::alert_severity
      ELSE 'warning'::alert_severity
    END,
    'Documento regulatorio por vencer: ' || COALESCE(rd.title, rd.doc_type::text),
    'regulatory_document',
    rd.id,
    'El documento "' || COALESCE(rd.title, rd.doc_type::text) || '" vence el ' || rd.expiry_date::text || '.',
    now(),
    'pending'::alert_status
  FROM regulatory_documents rd
  WHERE rd.status = 'valid'
    AND rd.expiry_date IS NOT NULL
    AND rd.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    -- Avoid duplicate alerts: don't alert if one already exists for this entity in the last 24h
    AND NOT EXISTS (
      SELECT 1 FROM alerts a
      WHERE a.entity_type = 'regulatory_document'
        AND a.entity_id = rd.id
        AND a.type = 'regulatory_expiring'
        AND a.triggered_at > now() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- CRON JOB 4: check_low_inventory (daily 7:00 AM)
-- Generates alerts for inventory items with quantity below threshold.
-- Uses a default threshold of 10% of initial receipt quantity.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_check_low_inventory()
RETURNS void AS $$
BEGIN
  INSERT INTO alerts (company_id, type, severity, title, entity_type, entity_id, message, triggered_at, status)
  SELECT
    ii.company_id,
    'low_inventory'::alert_type,
    CASE
      WHEN ii.quantity_available <= 0 THEN 'critical'::alert_severity
      ELSE 'warning'::alert_severity
    END,
    'Inventario bajo: ' || p.name,
    'inventory_item',
    ii.id,
    'El item "' || p.name || '" tiene ' || ii.quantity_available || ' unidades disponibles en ' || COALESCE(z.name, 'sin ubicacion') || '.',
    now(),
    'pending'::alert_status
  FROM inventory_items ii
  JOIN products p ON p.id = ii.product_id
  LEFT JOIN zones z ON z.id = ii.zone_id
  WHERE ii.lot_status = 'available'
    AND ii.quantity_available <= GREATEST(
      -- 10% of the first receipt for this product+zone, minimum 1 unit
      (SELECT COALESCE(
        (SELECT ABS(it.quantity) * 0.1
         FROM inventory_transactions it
         WHERE it.inventory_item_id = ii.id
           AND it.type = 'receipt'
         ORDER BY it.timestamp ASC
         LIMIT 1),
        1
      )),
      1
    )
    -- Avoid duplicate alerts in last 24h
    AND NOT EXISTS (
      SELECT 1 FROM alerts a
      WHERE a.entity_type = 'inventory_item'
        AND a.entity_id = ii.id
        AND a.type = 'low_inventory'
        AND a.triggered_at > now() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- CRON JOB 5: check_stale_batches (daily 8:00 AM)
-- Alerts for active batches with no activity in 7+ days.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_check_stale_batches()
RETURNS void AS $$
BEGIN
  INSERT INTO alerts (company_id, type, severity, title, entity_type, entity_id, batch_id, message, triggered_at, status)
  SELECT
    f.company_id,
    'stale_batch'::alert_type,
    CASE
      WHEN last_activity < now() - INTERVAL '14 days' THEN 'high'::alert_severity
      ELSE 'warning'::alert_severity
    END,
    'Batch sin actividad: ' || b.code,
    'batch',
    b.id,
    b.id,
    'El batch "' || b.code || '" no tiene actividad desde ' ||
      COALESCE(last_activity::date::text, b.start_date::text) || '.',
    now(),
    'pending'::alert_status
  FROM batches b
  JOIN zones z ON z.id = b.zone_id
  JOIN facilities f ON f.id = z.facility_id
  LEFT JOIN LATERAL (
    SELECT MAX(a.performed_at) AS last_activity
    FROM activities a
    WHERE a.batch_id = b.id
  ) la ON true
  WHERE b.status = 'active'
    AND COALESCE(la.last_activity, b.start_date::timestamptz) < now() - INTERVAL '7 days'
    -- Avoid duplicate alerts in last 24h
    AND NOT EXISTS (
      SELECT 1 FROM alerts al
      WHERE al.entity_type = 'batch'
        AND al.entity_id = b.id
        AND al.type = 'stale_batch'
        AND al.triggered_at > now() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- CRON JOB 6: check_env_readings (every 15 min)
-- Compares latest readings against cultivar optimal_conditions.
-- Generates env_out_of_range alerts when readings exceed bounds.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_check_env_readings()
RETURNS void AS $$
DECLARE
  rec RECORD;
  opt_min DECIMAL;
  opt_max DECIMAL;
  param_key TEXT;
BEGIN
  -- Get latest reading per zone+parameter for active sensors
  FOR rec IN
    SELECT DISTINCT ON (er.zone_id, er.parameter)
      er.zone_id,
      er.sensor_id,
      er.company_id,
      er.parameter,
      er.value,
      er.unit,
      er.timestamp,
      z.name AS zone_name,
      b.id AS batch_id,
      c.optimal_conditions
    FROM environmental_readings er
    JOIN zones z ON z.id = er.zone_id
    LEFT JOIN batches b ON b.zone_id = er.zone_id AND b.status = 'active'
    LEFT JOIN cultivars c ON c.id = b.cultivar_id
    WHERE er.timestamp > now() - INTERVAL '30 minutes'
      AND c.optimal_conditions IS NOT NULL
    ORDER BY er.zone_id, er.parameter, er.timestamp DESC
  LOOP
    -- Map env_parameter to optimal_conditions JSON key
    -- Handle naming differences (e.g., 'temperature' -> 'temp' in some cultivar data)
    param_key := rec.parameter::text;
    IF NOT (rec.optimal_conditions ? param_key) THEN
      -- Try common aliases
      CASE param_key
        WHEN 'temperature' THEN param_key := 'temp';
        WHEN 'light_ppfd' THEN param_key := 'light';
        ELSE NULL;
      END CASE;
    END IF;

    -- Extract min/max from cultivar optimal_conditions JSONB
    -- Expected format: {"temperature": {"min": 20, "max": 28}, "humidity": {"min": 40, "max": 70}, ...}
    opt_min := (rec.optimal_conditions -> param_key ->> 'min')::DECIMAL;
    opt_max := (rec.optimal_conditions -> param_key ->> 'max')::DECIMAL;

    -- Skip if no optimal range defined for this parameter
    IF opt_min IS NULL AND opt_max IS NULL THEN
      CONTINUE;
    END IF;

    -- Check if out of range
    IF (opt_min IS NOT NULL AND rec.value < opt_min) OR (opt_max IS NOT NULL AND rec.value > opt_max) THEN
      -- Avoid duplicate alerts in last 30 minutes
      IF NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.entity_type = 'sensor'
          AND a.entity_id = rec.sensor_id
          AND a.type = 'env_out_of_range'
          AND a.triggered_at > now() - INTERVAL '30 minutes'
      ) THEN
        INSERT INTO alerts (company_id, type, severity, title, entity_type, entity_id, batch_id, message, triggered_at, status)
        VALUES (
          rec.company_id,
          'env_out_of_range'::alert_type,
          CASE
            WHEN rec.value < COALESCE(opt_min, rec.value) - (COALESCE(opt_max, opt_min) - COALESCE(opt_min, opt_max)) * 0.2
              OR rec.value > COALESCE(opt_max, rec.value) + (COALESCE(opt_max, opt_min) - COALESCE(opt_min, opt_max)) * 0.2
            THEN 'critical'::alert_severity
            ELSE 'high'::alert_severity
          END,
          rec.zone_name || ': ' || param_key || ' fuera de rango',
          'sensor',
          rec.sensor_id,
          rec.batch_id,
          param_key || ' = ' || rec.value || ' ' || rec.unit ||
            ' (rango optimo: ' || COALESCE(opt_min::text, '?') || ' - ' || COALESCE(opt_max::text, '?') || ')' ||
            ' en zona ' || rec.zone_name || '.',
          now(),
          'pending'::alert_status
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- pg_cron SCHEDULES (local dev only — production via Dashboard SQL Editor)
-- =============================================================
-- Note: pg_cron extension must be enabled. In Supabase local dev,
-- it's available by default. In production, enable via Dashboard.
DO $$
BEGIN
  -- Only schedule if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('expire_documents', '0 1 * * *', 'SELECT fn_expire_documents()');
    PERFORM cron.schedule('check_overdue_activities', '0 * * * *', 'SELECT fn_check_overdue_activities()');
    PERFORM cron.schedule('check_expiring_documents', '0 6 * * *', 'SELECT fn_check_expiring_documents()');
    PERFORM cron.schedule('check_low_inventory', '0 7 * * *', 'SELECT fn_check_low_inventory()');
    PERFORM cron.schedule('check_stale_batches', '0 8 * * *', 'SELECT fn_check_stale_batches()');
    PERFORM cron.schedule('check_env_readings', '*/15 * * * *', 'SELECT fn_check_env_readings()');
  END IF;
END $$;

-- =============================================================
-- UTILITY FUNCTION: get_env_readings_aggregated
-- Aggregates environmental readings for time-series charts.
-- Returns avg, min, max per interval for a given zone and period.
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
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('hour', er.timestamp) +
      (EXTRACT(EPOCH FROM p_interval) * FLOOR(
        EXTRACT(EPOCH FROM (er.timestamp - date_trunc('hour', er.timestamp))) /
        EXTRACT(EPOCH FROM p_interval)
      )) * INTERVAL '1 second' AS bucket,
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

-- =============================================================
-- UTILITY FUNCTION: get_sensors_last_reading
-- Batch-fetches the latest reading for an array of sensor IDs.
-- Used for sensor connectivity status on the sensors list page.
-- =============================================================
CREATE OR REPLACE FUNCTION get_sensors_last_reading(p_sensor_ids UUID[])
RETURNS TABLE (
  sensor_id UUID,
  parameter env_parameter,
  value DECIMAL,
  unit VARCHAR,
  last_reading_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (er.sensor_id)
    er.sensor_id,
    er.parameter,
    er.value,
    er.unit,
    er.timestamp AS last_reading_at
  FROM environmental_readings er
  WHERE er.sensor_id = ANY(p_sensor_ids)
  ORDER BY er.sensor_id, er.timestamp DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================
-- UTILITY FUNCTION: calculate_batch_cogs
-- Calculates Cost of Goods Sold per batch:
--   Direct costs (from inventory_transactions.cost_total) +
--   Allocated overhead (from overhead_costs prorated by allocation_basis)
-- =============================================================
CREATE OR REPLACE FUNCTION calculate_batch_cogs(
  p_company_id UUID,
  p_facility_id UUID DEFAULT NULL,
  p_batch_status batch_status DEFAULT NULL
)
RETURNS TABLE (
  batch_id UUID,
  batch_code VARCHAR,
  direct_cost DECIMAL,
  overhead_allocated DECIMAL,
  total_cogs DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH batch_direct AS (
    -- Direct costs already accumulated in batches.total_cost via trigger
    SELECT
      b.id AS batch_id,
      b.code AS batch_code,
      b.total_cost AS direct_cost,
      b.zone_id,
      b.area_m2,
      b.plant_count,
      z.facility_id
    FROM batches b
    JOIN zones z ON z.id = b.zone_id
    JOIN facilities f ON f.id = z.facility_id
    WHERE f.company_id = p_company_id
      AND (p_facility_id IS NULL OR z.facility_id = p_facility_id)
      AND (p_batch_status IS NULL OR b.status = p_batch_status)
  ),
  overhead AS (
    -- Overhead costs for the relevant facilities/zones during batch active period
    SELECT
      oc.id AS cost_id,
      oc.facility_id,
      oc.zone_id AS cost_zone_id,
      oc.amount,
      oc.allocation_basis,
      oc.period_start,
      oc.period_end
    FROM overhead_costs oc
    WHERE oc.company_id = p_company_id
      AND (p_facility_id IS NULL OR oc.facility_id = p_facility_id)
  ),
  active_batches_per_facility AS (
    SELECT
      bd.facility_id,
      COUNT(DISTINCT bd.batch_id) AS batch_count,
      SUM(COALESCE(bd.area_m2, 0)) AS total_area,
      SUM(COALESCE(bd.plant_count, 0)) AS total_plants
    FROM batch_direct bd
    GROUP BY bd.facility_id
  ),
  allocated AS (
    SELECT
      bd.batch_id,
      SUM(
        CASE o.allocation_basis
          WHEN 'even_split' THEN
            o.amount / GREATEST(af.batch_count, 1)
          WHEN 'per_m2' THEN
            CASE WHEN af.total_area > 0
              THEN o.amount * COALESCE(bd.area_m2, 0) / af.total_area
              ELSE o.amount / GREATEST(af.batch_count, 1)
            END
          WHEN 'per_plant' THEN
            CASE WHEN af.total_plants > 0
              THEN o.amount * COALESCE(bd.plant_count, 0) / af.total_plants
              ELSE o.amount / GREATEST(af.batch_count, 1)
            END
          WHEN 'per_batch' THEN
            o.amount / GREATEST(af.batch_count, 1)
          WHEN 'per_zone' THEN
            o.amount / GREATEST(
              (SELECT COUNT(DISTINCT bd2.zone_id) FROM batch_direct bd2 WHERE bd2.facility_id = bd.facility_id), 1
            )
          ELSE 0
        END
      ) AS overhead_total
    FROM batch_direct bd
    JOIN overhead o ON o.facility_id = bd.facility_id
      AND (o.cost_zone_id IS NULL OR o.cost_zone_id = bd.zone_id)
    JOIN active_batches_per_facility af ON af.facility_id = bd.facility_id
    GROUP BY bd.batch_id
  )
  SELECT
    bd.batch_id,
    bd.batch_code,
    ROUND(bd.direct_cost, 2) AS direct_cost,
    ROUND(COALESCE(al.overhead_total, 0), 2) AS overhead_allocated,
    ROUND(bd.direct_cost + COALESCE(al.overhead_total, 0), 2) AS total_cogs
  FROM batch_direct bd
  LEFT JOIN allocated al ON al.batch_id = bd.batch_id
  ORDER BY bd.batch_code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================
-- UTILITY FUNCTION: auto-create next month's partition
-- Run monthly via pg_cron to ensure partition exists before data arrives.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_create_next_env_partition()
RETURNS void AS $$
DECLARE
  next_month_start DATE;
  next_month_end DATE;
  partition_name TEXT;
BEGIN
  next_month_start := date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date;
  next_month_end := (next_month_start + INTERVAL '1 month')::date;
  partition_name := 'environmental_readings_' ||
    to_char(next_month_start, 'YYYY_MM');

  -- Only create if partition doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF environmental_readings FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      next_month_start,
      next_month_end
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule monthly partition creation (1st of each month at midnight)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('create_env_partition', '0 0 1 * *', 'SELECT fn_create_next_env_partition()');
  END IF;
END $$;
