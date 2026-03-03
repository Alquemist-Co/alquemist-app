-- =============================================================
-- Migration 14: Production Orders (PRD 22)
-- =============================================================

-- ENUMs
CREATE TYPE order_status AS ENUM ('draft', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE order_phase_status AS ENUM ('pending', 'ready', 'in_progress', 'completed', 'skipped');

-- =============================================================
-- production_orders
-- =============================================================
CREATE TABLE production_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  code                      VARCHAR(20) NOT NULL DEFAULT '',
  cultivar_id               UUID NOT NULL REFERENCES cultivars(id),
  entry_phase_id            UUID NOT NULL REFERENCES production_phases(id),
  exit_phase_id             UUID NOT NULL REFERENCES production_phases(id),
  initial_quantity          DECIMAL NOT NULL,
  initial_unit_id           UUID NOT NULL REFERENCES units_of_measure(id),
  initial_product_id        UUID REFERENCES products(id),
  expected_output_quantity  DECIMAL,
  expected_output_product_id UUID REFERENCES products(id),
  expected_output_unit_id   UUID REFERENCES units_of_measure(id),
  zone_id                   UUID REFERENCES zones(id),
  planned_start_date        DATE,
  planned_end_date          DATE,
  assigned_to               UUID REFERENCES users(id),
  status                    order_status NOT NULL DEFAULT 'draft',
  priority                  order_priority NOT NULL DEFAULT 'normal',
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                UUID,
  updated_by                UUID
);

-- =============================================================
-- production_order_phases
-- =============================================================
CREATE TABLE production_order_phases (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  phase_id                  UUID NOT NULL REFERENCES production_phases(id),
  sort_order                INT NOT NULL DEFAULT 0,
  planned_duration_days     INT,
  zone_id                   UUID REFERENCES zones(id),
  expected_input_qty        DECIMAL,
  expected_output_qty       DECIMAL,
  expected_output_product_id UUID REFERENCES products(id),
  yield_pct                 DECIMAL,
  batch_id                  UUID,
  input_quantity            DECIMAL,
  output_quantity           DECIMAL,
  status                    order_phase_status NOT NULL DEFAULT 'pending',
  planned_start_date        DATE,
  planned_end_date          DATE,
  actual_start_date         DATE,
  actual_end_date           DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                UUID,
  updated_by                UUID
);

-- =============================================================
-- Indexes
-- =============================================================
CREATE UNIQUE INDEX idx_production_orders_company_code ON production_orders (company_id, code);
CREATE INDEX idx_production_orders_company_status ON production_orders (company_id, status);
CREATE INDEX idx_production_orders_company_start ON production_orders (company_id, planned_start_date);
CREATE INDEX idx_production_orders_cultivar ON production_orders (cultivar_id);
CREATE INDEX idx_production_orders_assigned ON production_orders (assigned_to);
CREATE INDEX idx_production_order_phases_order ON production_order_phases (order_id, sort_order);

-- =============================================================
-- Triggers
-- =============================================================
CREATE TRIGGER trg_update_timestamps
  BEFORE UPDATE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

CREATE TRIGGER trg_update_timestamps
  BEFORE UPDATE ON production_order_phases
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- generate_order_code() — OP-{YYYY}-{NNNN} per company/year
-- =============================================================
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT;
  v_seq  INT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 'OP-' || v_year || '-(\d+)') AS INT)
  ), 0) + 1
  INTO v_seq
  FROM production_orders
  WHERE company_id = NEW.company_id
    AND code LIKE 'OP-' || v_year || '-%';

  NEW.code := 'OP-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_order_code
  BEFORE INSERT ON production_orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_code();

-- =============================================================
-- calculate_cascade_yields()
-- Walks phases from entry to exit, applies yield percentages
-- Returns JSONB: { phases: [...], final_output_qty, final_output_product_id }
-- =============================================================
CREATE OR REPLACE FUNCTION calculate_cascade_yields(
  p_cultivar_id UUID,
  p_entry_phase_id UUID,
  p_exit_phase_id UUID,
  p_initial_quantity DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_sort INT;
  v_exit_sort INT;
  v_crop_type_id UUID;
  v_phase RECORD;
  v_current_qty DECIMAL;
  v_output_qty DECIMAL;
  v_yield_pct DECIMAL;
  v_product_id UUID;
  v_phases JSONB := '[]'::jsonb;
  v_result JSONB;
BEGIN
  -- Get crop_type_id from cultivar
  SELECT crop_type_id INTO v_crop_type_id
  FROM public.cultivars WHERE id = p_cultivar_id;

  IF v_crop_type_id IS NULL THEN
    RAISE EXCEPTION 'Cultivar not found';
  END IF;

  -- Get sort orders for entry/exit
  SELECT sort_order INTO v_entry_sort
  FROM public.production_phases WHERE id = p_entry_phase_id AND crop_type_id = v_crop_type_id;

  SELECT sort_order INTO v_exit_sort
  FROM public.production_phases WHERE id = p_exit_phase_id AND crop_type_id = v_crop_type_id;

  IF v_entry_sort IS NULL OR v_exit_sort IS NULL THEN
    RAISE EXCEPTION 'Invalid phase IDs for this cultivar';
  END IF;

  v_current_qty := p_initial_quantity;

  -- Walk phases in sort_order from entry to exit
  FOR v_phase IN
    SELECT pp.id AS phase_id, pp.name, pp.sort_order, pp.default_duration_days
    FROM public.production_phases pp
    WHERE pp.crop_type_id = v_crop_type_id
      AND pp.sort_order >= v_entry_sort
      AND pp.sort_order <= v_exit_sort
    ORDER BY pp.sort_order
  LOOP
    -- Get primary output yield for this phase+cultivar
    SELECT ppf.expected_yield_pct, ppf.product_id
    INTO v_yield_pct, v_product_id
    FROM public.phase_product_flows ppf
    WHERE ppf.cultivar_id = p_cultivar_id
      AND ppf.phase_id = v_phase.phase_id
      AND ppf.direction = 'output'
      AND ppf.product_role = 'primary'
    ORDER BY ppf.sort_order
    LIMIT 1;

    -- If no yield data, pass through at 100%
    IF v_yield_pct IS NULL THEN
      v_yield_pct := 100;
    END IF;

    v_output_qty := ROUND(v_current_qty * v_yield_pct / 100, 2);

    v_phases := v_phases || jsonb_build_object(
      'phase_id', v_phase.phase_id,
      'phase_name', v_phase.name,
      'sort_order', v_phase.sort_order,
      'default_duration_days', v_phase.default_duration_days,
      'input_qty', v_current_qty,
      'yield_pct', v_yield_pct,
      'output_qty', v_output_qty,
      'output_product_id', v_product_id
    );

    v_current_qty := v_output_qty;
  END LOOP;

  v_result := jsonb_build_object(
    'phases', v_phases,
    'final_output_qty', v_current_qty,
    'final_output_product_id', v_product_id
  );

  RETURN v_result;
END;
$$;

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_phases ENABLE ROW LEVEL SECURITY;

-- production_orders: Pattern 1 SELECT, Pattern 3 INSERT/UPDATE
CREATE POLICY "po_select_company"
  ON production_orders FOR SELECT
  USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "po_insert_roles"
  ON production_orders FOR INSERT
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "po_update_roles"
  ON production_orders FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "po_service_role"
  ON production_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- production_order_phases: Pattern 2 via parent order
CREATE POLICY "pop_select"
  ON production_order_phases FOR SELECT
  USING (order_id IN (SELECT id FROM production_orders WHERE company_id = (SELECT get_my_company_id())));

CREATE POLICY "pop_insert_roles"
  ON production_order_phases FOR INSERT
  WITH CHECK (
    order_id IN (SELECT id FROM production_orders WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "pop_update_roles"
  ON production_order_phases FOR UPDATE
  USING (
    order_id IN (SELECT id FROM production_orders WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    order_id IN (SELECT id FROM production_orders WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "pop_delete_roles"
  ON production_order_phases FOR DELETE
  USING (
    order_id IN (SELECT id FROM production_orders WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT (auth.jwt()->'app_metadata'->>'role')) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "pop_service_role"
  ON production_order_phases FOR ALL TO service_role
  USING (true) WITH CHECK (true);
