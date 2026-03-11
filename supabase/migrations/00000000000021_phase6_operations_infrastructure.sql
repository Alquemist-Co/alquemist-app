-- =============================================================
-- Migration 21: Phase 6 — Operations Infrastructure
-- Tables: attachments, alerts, sensors, environmental_readings, overhead_costs
-- ENUMs: alert_type, alert_severity, alert_status, sensor_type,
--        env_parameter, cost_type, allocation_basis
-- Also: trg_batch_cost_update (deferred from architecture doc)
-- =============================================================

-- =============================================================
-- ENUMs
-- =============================================================
CREATE TYPE alert_type AS ENUM (
  'overdue_activity',
  'low_inventory',
  'stale_batch',
  'expiring_item',
  'env_out_of_range',
  'order_delayed',
  'quality_failed',
  'regulatory_expiring',
  'regulatory_missing',
  'pest_detected',
  'phi_violation'
);

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('pending', 'acknowledged', 'resolved');

CREATE TYPE sensor_type AS ENUM (
  'temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd'
);

CREATE TYPE env_parameter AS ENUM (
  'temperature', 'humidity', 'co2', 'light_ppfd', 'ec', 'ph', 'vpd'
);

CREATE TYPE cost_type AS ENUM (
  'energy', 'rent', 'depreciation', 'insurance', 'maintenance', 'labor_fixed', 'other'
);

CREATE TYPE allocation_basis AS ENUM (
  'per_m2', 'per_plant', 'per_batch', 'per_zone', 'even_split'
);

-- =============================================================
-- attachments — generic polymorphic file metadata (Pattern 1 via company_id)
-- =============================================================
CREATE TABLE attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  entity_type     VARCHAR(50) NOT NULL,  -- 'activity', 'batch', 'quality_test', 'observation'
  entity_id       UUID NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       VARCHAR(100) NOT NULL,  -- 'image/jpeg', 'application/pdf'
  file_size_bytes INT,
  description     VARCHAR(255),
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_attachments_entity ON attachments (entity_type, entity_id);
CREATE INDEX idx_attachments_company ON attachments (company_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments (uploaded_by);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- alerts — system alerts with polymorphic entity reference (Pattern 1 via company_id)
-- =============================================================
CREATE TABLE alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  type              alert_type NOT NULL,
  severity          alert_severity NOT NULL DEFAULT 'info',
  title             VARCHAR(255),
  entity_type       VARCHAR(100) NOT NULL,  -- 'batch', 'inventory_item', 'scheduled_activity', 'sensor', 'regulatory_document', 'shipment', 'activity_observation'
  entity_id         UUID NOT NULL,
  batch_id          UUID REFERENCES batches(id),  -- optional cross-domain link
  message           TEXT NOT NULL,
  triggered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by   UUID REFERENCES users(id),
  acknowledged_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  status            alert_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID
);

CREATE INDEX idx_alerts_company_status ON alerts (company_id, status, created_at DESC);
CREATE INDEX idx_alerts_entity ON alerts (entity_type, entity_id);
CREATE INDEX idx_alerts_batch ON alerts (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_alerts_severity ON alerts (severity) WHERE status = 'pending';
CREATE INDEX idx_alerts_triggered ON alerts (triggered_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- sensors — IoT sensors installed in zones (Pattern 1 via company_id)
-- =============================================================
CREATE TABLE sensors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  zone_id           UUID NOT NULL REFERENCES zones(id),
  type              sensor_type NOT NULL,
  brand_model       VARCHAR(200),
  serial_number     VARCHAR(100),
  calibration_date  DATE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID
);

CREATE INDEX idx_sensors_company ON sensors (company_id);
CREATE INDEX idx_sensors_zone ON sensors (zone_id);
CREATE INDEX idx_sensors_type ON sensors (type);
CREATE INDEX idx_sensors_serial ON sensors (serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX idx_sensors_active ON sensors (company_id) WHERE is_active = true;

ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON sensors
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- environmental_readings — sensor data, partitioned by month
-- Denormalized company_id + zone_id for fast RLS + queries
-- =============================================================
CREATE TABLE environmental_readings (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  sensor_id       UUID NOT NULL REFERENCES sensors(id),
  zone_id         UUID NOT NULL REFERENCES zones(id),
  parameter       env_parameter NOT NULL,
  value           DECIMAL NOT NULL,
  unit            VARCHAR(20) NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions: 2026-01 through 2027-01 (13 months)
CREATE TABLE environmental_readings_2026_01 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE environmental_readings_2026_02 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE environmental_readings_2026_03 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE environmental_readings_2026_04 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE environmental_readings_2026_05 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE environmental_readings_2026_06 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE environmental_readings_2026_07 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE environmental_readings_2026_08 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE environmental_readings_2026_09 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE environmental_readings_2026_10 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE environmental_readings_2026_11 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE environmental_readings_2026_12 PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE environmental_readings_2027_01 PARTITION OF environmental_readings
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

CREATE INDEX idx_env_readings_zone_param_ts ON environmental_readings (zone_id, parameter, timestamp DESC);
CREATE INDEX idx_env_readings_sensor ON environmental_readings (sensor_id, timestamp DESC);
CREATE INDEX idx_env_readings_company ON environmental_readings (company_id);

ALTER TABLE environmental_readings ENABLE ROW LEVEL SECURITY;

-- No update trigger on readings — they are immutable (append-only)

-- =============================================================
-- overhead_costs — indirect costs allocatable to batches (Pattern 1 via company_id)
-- =============================================================
CREATE TABLE overhead_costs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  facility_id       UUID NOT NULL REFERENCES facilities(id),
  zone_id           UUID REFERENCES zones(id),  -- null = applies to whole facility
  cost_type         cost_type NOT NULL,
  description       VARCHAR(255) NOT NULL,
  amount            DECIMAL NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  allocation_basis  allocation_basis NOT NULL DEFAULT 'even_split',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID
);

CREATE INDEX idx_overhead_costs_company ON overhead_costs (company_id);
CREATE INDEX idx_overhead_costs_facility ON overhead_costs (facility_id);
CREATE INDEX idx_overhead_costs_period ON overhead_costs (period_start, period_end);
CREATE INDEX idx_overhead_costs_type ON overhead_costs (cost_type);

ALTER TABLE overhead_costs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON overhead_costs
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RLS POLICIES: attachments (Pattern 1)
-- =============================================================
CREATE POLICY "attach_select_company" ON attachments
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "attach_insert_roles" ON attachments
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor', 'operator')
  );

CREATE POLICY "attach_update_roles" ON attachments
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "attach_delete_roles" ON attachments
  FOR DELETE USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "attach_service_role" ON attachments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: alerts (Pattern 1)
-- =============================================================
CREATE POLICY "alerts_select_company" ON alerts
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

-- Alerts are created by system (cron jobs run as superuser bypassing RLS;
-- Edge Functions use service_role which has its own policy below).
-- No direct user INSERT needed.

CREATE POLICY "alerts_update_roles" ON alerts
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "alerts_service_role" ON alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: sensors (Pattern 1 via company_id)
-- =============================================================
CREATE POLICY "sensors_select_company" ON sensors
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "sensors_insert_roles" ON sensors
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "sensors_update_roles" ON sensors
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "sensors_delete_admin" ON sensors
  FOR DELETE USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  );

CREATE POLICY "sensors_service_role" ON sensors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: environmental_readings (Pattern 1 via company_id)
-- =============================================================
CREATE POLICY "env_readings_select_company" ON environmental_readings
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

-- Readings are inserted by Edge Function (ingest-reading) using service_role.
-- No direct user INSERT needed.

CREATE POLICY "env_readings_service_role" ON environmental_readings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: overhead_costs (Pattern 1)
-- =============================================================
CREATE POLICY "costs_select_company" ON overhead_costs
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "costs_insert_roles" ON overhead_costs
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "costs_update_roles" ON overhead_costs
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "costs_delete_admin" ON overhead_costs
  FOR DELETE USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  );

CREATE POLICY "costs_service_role" ON overhead_costs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- TRIGGER: trg_batch_cost_update — updates batches.total_cost
-- when inventory_transactions with batch_id are inserted.
-- Deferred from architecture doc — never implemented.
-- =============================================================
CREATE OR REPLACE FUNCTION trigger_batch_cost_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL AND NEW.cost_total IS NOT NULL THEN
    UPDATE batches
    SET total_cost = total_cost + NEW.cost_total,
        updated_at = now()
    WHERE id = NEW.batch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_batch_cost_update
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_batch_cost_update();

-- =============================================================
-- Enable Supabase Realtime for alerts and environmental_readings
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE environmental_readings;
