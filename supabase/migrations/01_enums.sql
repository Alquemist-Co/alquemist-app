-- 01_enums.sql
-- All PostgreSQL ENUMs used across the 43 tables

-- Sistema
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'supervisor', 'operator', 'viewer');

-- Produccion
CREATE TYPE crop_category AS ENUM ('annual', 'perennial', 'biennial');
CREATE TYPE flow_direction AS ENUM ('input', 'output');
CREATE TYPE product_role AS ENUM ('primary', 'secondary', 'byproduct', 'waste');

-- Areas
CREATE TYPE facility_type AS ENUM ('indoor_warehouse', 'greenhouse', 'tunnel', 'open_field', 'vertical_farm');
CREATE TYPE zone_purpose AS ENUM ('propagation', 'vegetation', 'flowering', 'drying', 'processing', 'storage', 'multipurpose');
CREATE TYPE zone_environment AS ENUM ('indoor_controlled', 'greenhouse', 'tunnel', 'open_field');
CREATE TYPE zone_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE structure_type AS ENUM ('mobile_rack', 'fixed_rack', 'rolling_bench', 'row', 'bed', 'trellis_row', 'nft_channel');
CREATE TYPE position_status AS ENUM ('empty', 'planted', 'harvested', 'maintenance');

-- Inventario
CREATE TYPE lot_tracking AS ENUM ('required', 'optional', 'none');
CREATE TYPE procurement_type AS ENUM ('purchased', 'produced', 'both');
CREATE TYPE dimension_type AS ENUM ('mass', 'volume', 'count', 'area', 'energy', 'time', 'concentration');
CREATE TYPE source_type AS ENUM ('purchase', 'production', 'transfer', 'transformation');
CREATE TYPE lot_status AS ENUM ('available', 'quarantine', 'expired', 'depleted');
CREATE TYPE transaction_type AS ENUM (
  'receipt', 'consumption', 'application',
  'transfer_out', 'transfer_in',
  'transformation_out', 'transformation_in',
  'adjustment', 'waste', 'return',
  'reservation', 'release'
);

-- Actividades
CREATE TYPE activity_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'once', 'on_demand');
CREATE TYPE quantity_basis AS ENUM ('fixed', 'per_plant', 'per_m2', 'per_zone', 'per_L_solution');
CREATE TYPE scheduled_activity_status AS ENUM ('pending', 'completed', 'skipped', 'overdue');
CREATE TYPE activity_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE observation_type AS ENUM ('pest', 'disease', 'deficiency', 'environmental', 'general', 'measurement');
CREATE TYPE severity_level AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- Nexo (Batches)
CREATE TYPE batch_status AS ENUM ('active', 'phase_transition', 'completed', 'cancelled', 'on_hold');
CREATE TYPE lineage_operation AS ENUM ('split', 'merge');

-- Ordenes
CREATE TYPE order_status AS ENUM ('draft', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE order_phase_status AS ENUM ('pending', 'ready', 'in_progress', 'completed', 'skipped');

-- Calidad
CREATE TYPE test_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'rejected');

-- Operaciones
CREATE TYPE cost_type AS ENUM ('energy', 'rent', 'depreciation', 'insurance', 'maintenance', 'labor_fixed', 'other');
CREATE TYPE allocation_basis AS ENUM ('per_m2', 'per_plant', 'per_batch', 'per_zone', 'even_split');
CREATE TYPE sensor_type AS ENUM ('temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd');
CREATE TYPE reading_parameter AS ENUM ('temperature', 'humidity', 'co2', 'light_ppfd', 'ec', 'ph', 'vpd');
CREATE TYPE alert_type AS ENUM (
  'overdue_activity', 'low_inventory', 'stale_batch',
  'expiring_item', 'env_out_of_range', 'order_delayed', 'quality_failed'
);
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
