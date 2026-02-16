-- 08_indices.sql
-- Composite indices for frequent queries

-- Inventory transactions: cost by batch, type and time
CREATE INDEX idx_inv_transactions_batch_type_ts
  ON inventory_transactions (batch_id, type, timestamp);

-- Activities: timeline by batch, phase, and time
CREATE INDEX idx_activities_batch_phase_at
  ON activities (batch_id, phase_id, performed_at);

-- Scheduled activities: dashboard of pending activities
CREATE INDEX idx_scheduled_activities_batch_status_date
  ON scheduled_activities (batch_id, status, planned_date);

-- Plant positions: zone occupancy
CREATE INDEX idx_plant_positions_zone_status
  ON plant_positions (zone_id, status);

-- Environmental readings: time series by zone and parameter
CREATE INDEX idx_env_readings_zone_param_ts
  ON environmental_readings (zone_id, parameter, timestamp);

-- Quality tests: pending tests by batch
CREATE INDEX idx_quality_tests_batch_status
  ON quality_tests (batch_id, status);

-- Alerts: active alerts by entity
CREATE INDEX idx_alerts_entity_resolved
  ON alerts (entity_type, entity_id, resolved_at);

-- Batches: by company for RLS
CREATE INDEX idx_batches_company
  ON batches (company_id);

-- Activities: by company for RLS
CREATE INDEX idx_activities_company
  ON activities (company_id);

-- Inventory transactions: by company for RLS
CREATE INDEX idx_inv_transactions_company
  ON inventory_transactions (company_id);

-- Users: by company
CREATE INDEX idx_users_company
  ON users (company_id);

-- Facilities: by company
CREATE INDEX idx_facilities_company
  ON facilities (company_id);

-- Zones: by facility
CREATE INDEX idx_zones_facility
  ON zones (facility_id);

-- Products: by category
CREATE INDEX idx_products_category
  ON products (category_id);

-- Inventory items: by product and zone
CREATE INDEX idx_inv_items_product_zone
  ON inventory_items (product_id, zone_id);

-- Production orders: by company and status
CREATE INDEX idx_prod_orders_company_status
  ON production_orders (company_id, status);

-- Batches: by zone and status
CREATE INDEX idx_batches_zone_status
  ON batches (zone_id, status);
