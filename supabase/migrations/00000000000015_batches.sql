-- =============================================================
-- Migration 15: Production Batches (PRD 24)
-- =============================================================

-- ENUMs
CREATE TYPE batch_status AS ENUM ('active', 'phase_transition', 'completed', 'cancelled', 'on_hold');
CREATE TYPE lineage_operation AS ENUM ('split', 'merge');

-- =============================================================
-- batches
-- =============================================================
CREATE TABLE batches (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                      VARCHAR(30) NOT NULL DEFAULT '',
  cultivar_id               UUID NOT NULL REFERENCES cultivars(id),
  zone_id                   UUID NOT NULL REFERENCES zones(id),
  plant_count               INT,
  area_m2                   DECIMAL,
  source_inventory_item_id  UUID REFERENCES inventory_items(id),
  current_product_id        UUID REFERENCES products(id),
  schedule_id               UUID,
  current_phase_id          UUID NOT NULL REFERENCES production_phases(id),
  production_order_id       UUID REFERENCES production_orders(id),
  parent_batch_id           UUID REFERENCES batches(id),
  start_date                DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date         DATE,
  status                    batch_status NOT NULL DEFAULT 'active',
  yield_wet_kg              DECIMAL,
  yield_dry_kg              DECIMAL,
  total_cost                DECIMAL NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                UUID,
  updated_by                UUID
);

-- =============================================================
-- batch_lineage (structure only for PRD 25)
-- =============================================================
CREATE TABLE batch_lineage (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation                 lineage_operation NOT NULL,
  parent_batch_id           UUID NOT NULL REFERENCES batches(id),
  child_batch_id            UUID NOT NULL REFERENCES batches(id),
  quantity_transferred      DECIMAL,
  unit_id                   UUID REFERENCES units_of_measure(id),
  reason                    TEXT,
  performed_by              UUID REFERENCES users(id),
  performed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- Indexes
-- =============================================================
CREATE UNIQUE INDEX idx_batches_code ON batches (code) WHERE code != '';
CREATE INDEX idx_batches_zone ON batches (zone_id);
CREATE INDEX idx_batches_cultivar ON batches (cultivar_id);
CREATE INDEX idx_batches_status ON batches (status);
CREATE INDEX idx_batches_current_phase ON batches (current_phase_id);
CREATE INDEX idx_batches_production_order ON batches (production_order_id);
CREATE INDEX idx_batches_parent ON batches (parent_batch_id);
CREATE INDEX idx_batches_start_date ON batches (start_date);

-- =============================================================
-- generate_batch_code() — LOT-{CULTIVAR_CODE}-{YYMMDD}-{NNN}
-- =============================================================
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cultivar_code TEXT;
  v_date_part TEXT;
  v_seq INT;
  v_prefix TEXT;
BEGIN
  -- Guard clause: skip if code already set (seed data)
  IF NEW.code IS NOT NULL AND NEW.code != '' THEN
    RETURN NEW;
  END IF;

  SELECT code INTO v_cultivar_code FROM cultivars WHERE id = NEW.cultivar_id;
  IF v_cultivar_code IS NULL THEN
    v_cultivar_code := 'UNK';
  END IF;

  v_date_part := to_char(now(), 'YYMMDD');
  v_prefix := 'LOT-' || v_cultivar_code || '-' || v_date_part || '-';

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM v_prefix || '(\d+)') AS INT)
  ), 0) + 1
  INTO v_seq
  FROM batches
  WHERE code LIKE v_prefix || '%';

  NEW.code := v_prefix || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_batch_code
  BEFORE INSERT ON batches
  FOR EACH ROW EXECUTE FUNCTION generate_batch_code();

-- =============================================================
-- Triggers
-- =============================================================
CREATE TRIGGER trg_update_timestamps
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- FK: production_order_phases.batch_id → batches(id)
-- Column exists at migration 14 line 53 without FK constraint
-- =============================================================
ALTER TABLE production_order_phases
  ADD CONSTRAINT fk_pop_batch_id FOREIGN KEY (batch_id) REFERENCES batches(id);

-- =============================================================
-- RLS — Pattern 2 via zone_id → facilities.company_id
-- =============================================================
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_lineage ENABLE ROW LEVEL SECURITY;

-- batches: SELECT — any authenticated user in same company
CREATE POLICY "batch_select_company"
  ON batches FOR SELECT
  USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
  );

-- batches: INSERT — admin/manager/supervisor
CREATE POLICY "batch_insert_roles"
  ON batches FOR INSERT
  WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  );

-- batches: UPDATE — admin/manager/supervisor
CREATE POLICY "batch_update_roles"
  ON batches FOR UPDATE
  USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  );

-- batches: service_role bypass
CREATE POLICY "batch_service_role"
  ON batches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- batch_lineage: SELECT via parent_batch_id
CREATE POLICY "bl_select_company"
  ON batch_lineage FOR SELECT
  USING (
    parent_batch_id IN (
      SELECT b.id FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE f.company_id = (SELECT get_my_company_id())
    )
  );

-- batch_lineage: service_role bypass
CREATE POLICY "bl_service_role"
  ON batch_lineage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================
-- fn_approve_production_order() — SECURITY DEFINER
-- Atomic: lock order → insert batch → update order → update first phase
-- =============================================================
CREATE OR REPLACE FUNCTION fn_approve_production_order(
  p_order_id UUID,
  p_zone_id UUID,
  p_schedule_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_batch_id UUID;
  v_batch_code TEXT;
  v_first_phase_id UUID;
  v_start_date DATE;
BEGIN
  -- 1. Lock order and verify status
  SELECT po.id, po.status, po.cultivar_id, po.entry_phase_id,
         po.initial_quantity, po.planned_start_date
  INTO v_order
  FROM public.production_orders po
  WHERE po.id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Production order not found';
  END IF;

  IF v_order.status != 'draft' THEN
    RAISE EXCEPTION 'Order must be in draft status to approve (current: %)', v_order.status;
  END IF;

  -- 2. Determine start date
  v_start_date := COALESCE(v_order.planned_start_date, CURRENT_DATE);

  -- 3. Insert batch
  INSERT INTO public.batches (
    cultivar_id, zone_id, current_phase_id, production_order_id,
    plant_count, start_date, status, schedule_id,
    created_by, updated_by
  ) VALUES (
    v_order.cultivar_id, p_zone_id, v_order.entry_phase_id, p_order_id,
    v_order.initial_quantity::INT, v_start_date, 'active', p_schedule_id,
    p_user_id, p_user_id
  )
  RETURNING id, code INTO v_batch_id, v_batch_code;

  -- 4. Update order status → approved
  UPDATE public.production_orders
  SET status = 'approved', updated_by = p_user_id
  WHERE id = p_order_id;

  -- 5. Update first phase → status='ready', set batch_id
  SELECT pop.id INTO v_first_phase_id
  FROM public.production_order_phases pop
  WHERE pop.order_id = p_order_id
  ORDER BY pop.sort_order ASC
  LIMIT 1;

  IF v_first_phase_id IS NOT NULL THEN
    UPDATE public.production_order_phases
    SET status = 'ready', batch_id = v_batch_id, updated_by = p_user_id
    WHERE id = v_first_phase_id;
  END IF;

  -- 6. Return result
  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'batch_code', v_batch_code,
    'scheduled_activities_count', 0
  );
END;
$$;
