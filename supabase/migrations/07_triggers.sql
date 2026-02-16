-- 07_triggers.sql
-- Triggers: updated_at, immutability for inventory_transactions, auto-populate company_id

-- ============================================================
-- 1. Generic updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that have updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'companies', 'users', 'crop_types', 'cultivars', 'production_phases',
      'phase_product_flows', 'cultivar_products',
      'facilities', 'zones', 'zone_structures', 'plant_positions',
      'resource_categories', 'units_of_measure', 'suppliers', 'products',
      'inventory_items', 'recipes', 'recipe_executions',
      'activity_types', 'activity_templates', 'activity_template_resources',
      'activity_template_checklist', 'cultivation_schedules', 'scheduled_activities',
      'activities', 'activity_resources', 'activity_observations',
      'production_orders', 'production_order_phases',
      'batches', 'quality_tests', 'quality_test_results',
      'overhead_costs', 'sensors', 'alerts'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 2. Immutability trigger for inventory_transactions (append-only)
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_inventory_transaction_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'inventory_transactions is append-only: UPDATE and DELETE are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_transactions_immutable
  BEFORE UPDATE OR DELETE ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_inventory_transaction_mutation();

-- ============================================================
-- 3. Auto-populate company_id on batches from zone -> facility
-- ============================================================

CREATE OR REPLACE FUNCTION set_batch_company_id()
RETURNS trigger AS $$
BEGIN
  NEW.company_id := (
    SELECT f.company_id
    FROM zones z
    JOIN facilities f ON z.facility_id = f.id
    WHERE z.id = NEW.zone_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_batch_company
  BEFORE INSERT OR UPDATE ON batches
  FOR EACH ROW
  EXECUTE FUNCTION set_batch_company_id();

-- ============================================================
-- 4. Auto-populate company_id on activities from zone -> facility
-- ============================================================

CREATE OR REPLACE FUNCTION set_activity_company_id()
RETURNS trigger AS $$
BEGIN
  NEW.company_id := (
    SELECT f.company_id
    FROM zones z
    JOIN facilities f ON z.facility_id = f.id
    WHERE z.id = NEW.zone_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_company
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION set_activity_company_id();

-- ============================================================
-- 5. Auto-populate company_id on inventory_transactions from zone or user
-- ============================================================

CREATE OR REPLACE FUNCTION set_inv_transaction_company_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.zone_id IS NOT NULL THEN
    NEW.company_id := (
      SELECT f.company_id
      FROM zones z
      JOIN facilities f ON z.facility_id = f.id
      WHERE z.id = NEW.zone_id
    );
  ELSE
    NEW.company_id := (
      SELECT u.company_id FROM users u WHERE u.id = NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inv_transaction_company
  BEFORE INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_inv_transaction_company_id();
