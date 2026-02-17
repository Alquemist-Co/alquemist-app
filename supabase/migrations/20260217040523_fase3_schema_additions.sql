-- Fase 3: Schema additions for Operations & Offline
-- Adds missing columns to alerts table (used by quality.ts but not in original schema)
-- Adds performance indices for environmental readings, alerts, and sensors

-- ── Alerts: missing columns ───────────────────────────────────────

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- ── Performance indices ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_env_readings_zone_ts
  ON environmental_readings (zone_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_env_readings_sensor_ts
  ON environmental_readings (sensor_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_company_unresolved
  ON alerts (company_id) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sensors_zone_active
  ON sensors (zone_id, is_active);
