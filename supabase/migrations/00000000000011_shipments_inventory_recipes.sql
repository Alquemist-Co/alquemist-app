-- Shipments, Inventory, and Recipes tables
-- PRD 19 (Shipments List), PRD 20 (Shipment Detail), PRD 21 (Recipes)
-- Phase 3 — Areas + Inventory

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE shipment_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE shipment_status AS ENUM (
  'scheduled', 'in_transit', 'received', 'inspecting',
  'accepted', 'partial_accepted', 'rejected', 'cancelled'
);
CREATE TYPE inspection_result AS ENUM (
  'accepted', 'accepted_with_observations', 'rejected', 'quarantine'
);
CREATE TYPE source_type AS ENUM ('purchase', 'production', 'transfer', 'transformation');
CREATE TYPE lot_status AS ENUM ('available', 'quarantine', 'expired', 'depleted');
CREATE TYPE transaction_type AS ENUM (
  'receipt', 'consumption', 'application',
  'transfer_out', 'transfer_in',
  'transformation_out', 'transformation_in',
  'adjustment', 'waste', 'return',
  'reservation', 'release'
);

-- =============================================================
-- SHIPMENT CODE GENERATOR
-- =============================================================
CREATE OR REPLACE FUNCTION generate_shipment_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT;
  v_seq  INT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(shipment_code FROM 'SHP-' || v_year || '-(\d+)') AS INT)
  ), 0) + 1
  INTO v_seq
  FROM shipments
  WHERE company_id = NEW.company_id
    AND shipment_code LIKE 'SHP-' || v_year || '-%';

  NEW.shipment_code := 'SHP-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- =============================================================
-- SHIPMENTS
-- =============================================================
CREATE TABLE shipments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  shipment_code           VARCHAR(20) NOT NULL,
  type                    shipment_direction NOT NULL,
  status                  shipment_status NOT NULL DEFAULT 'scheduled',
  supplier_id             UUID REFERENCES suppliers(id),
  origin_name             VARCHAR(300),
  origin_address          TEXT,
  origin_latitude         DECIMAL(9,6),
  origin_longitude        DECIMAL(9,6),
  destination_facility_id UUID NOT NULL REFERENCES facilities(id),
  carrier_name            VARCHAR(200),
  carrier_vehicle         VARCHAR(200),
  carrier_driver          VARCHAR(200),
  carrier_contact         VARCHAR(50),
  dispatch_date           TIMESTAMPTZ,
  estimated_arrival_date  TIMESTAMPTZ,
  actual_arrival_date     TIMESTAMPTZ,
  transport_conditions    JSONB,
  purchase_order_ref      VARCHAR(100),
  notes                   TEXT,
  received_by             UUID REFERENCES users(id),
  inspected_by            UUID REFERENCES users(id),
  inspected_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID,
  updated_by              UUID
);

CREATE UNIQUE INDEX idx_shipments_code_company
  ON shipments (company_id, shipment_code);
CREATE INDEX idx_shipments_company ON shipments (company_id);
CREATE INDEX idx_shipments_status ON shipments (company_id, status);
CREATE INDEX idx_shipments_type ON shipments (company_id, type);
CREATE INDEX idx_shipments_supplier ON shipments (supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_shipments_facility ON shipments (destination_facility_id);
CREATE INDEX idx_shipments_arrival ON shipments (company_id, estimated_arrival_date);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_generate_shipment_code
  BEFORE INSERT ON shipments
  FOR EACH ROW EXECUTE FUNCTION generate_shipment_code();

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- SHIPMENT ITEMS
-- =============================================================
CREATE TABLE shipment_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id           UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES products(id),
  expected_quantity     DECIMAL(12,4) NOT NULL,
  received_quantity     DECIMAL(12,4),
  rejected_quantity     DECIMAL(12,4),
  unit_id               UUID NOT NULL REFERENCES units_of_measure(id),
  supplier_lot_number   VARCHAR(100),
  supplier_batch_ref    VARCHAR(100),
  cost_per_unit         DECIMAL(12,4),
  destination_zone_id   UUID REFERENCES zones(id),
  expiration_date       DATE,
  inspection_result     inspection_result,
  inspection_notes      TEXT,
  inspection_data       JSONB,
  inventory_item_id     UUID,  -- FK added after inventory_items created
  transaction_id        UUID,  -- FK added after inventory_transactions created
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipment_items_shipment ON shipment_items (shipment_id);
CREATE INDEX idx_shipment_items_product ON shipment_items (product_id);

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON shipment_items
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- INVENTORY ITEMS
-- =============================================================
CREATE TABLE inventory_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  product_id            UUID NOT NULL REFERENCES products(id),
  zone_id               UUID REFERENCES zones(id),
  quantity_available    DECIMAL(12,4) NOT NULL DEFAULT 0,
  quantity_reserved     DECIMAL(12,4) NOT NULL DEFAULT 0,
  quantity_committed    DECIMAL(12,4) NOT NULL DEFAULT 0,
  unit_id               UUID NOT NULL REFERENCES units_of_measure(id),
  batch_number          VARCHAR(100),
  supplier_lot_number   VARCHAR(100),
  cost_per_unit         DECIMAL(12,4),
  expiration_date       DATE,
  source_type           source_type NOT NULL,
  lot_status            lot_status NOT NULL DEFAULT 'available',
  shipment_item_id      UUID REFERENCES shipment_items(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_by            UUID
);

CREATE INDEX idx_inventory_items_company ON inventory_items (company_id);
CREATE INDEX idx_inventory_items_product ON inventory_items (company_id, product_id);
CREATE INDEX idx_inventory_items_zone ON inventory_items (zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX idx_inventory_items_status ON inventory_items (company_id, lot_status);
CREATE INDEX idx_inventory_items_expiration ON inventory_items (expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_inventory_items_shipment_item ON inventory_items (shipment_item_id) WHERE shipment_item_id IS NOT NULL;

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- INVENTORY TRANSACTIONS (IMMUTABLE — no UPDATE trigger)
-- =============================================================
CREATE TABLE inventory_transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  type                    transaction_type NOT NULL,
  inventory_item_id       UUID NOT NULL REFERENCES inventory_items(id),
  quantity                DECIMAL(12,4) NOT NULL,
  unit_id                 UUID NOT NULL REFERENCES units_of_measure(id),
  timestamp               TIMESTAMPTZ NOT NULL DEFAULT now(),
  zone_id                 UUID REFERENCES zones(id),
  batch_id                UUID,  -- FK to batches deferred to Phase 4
  phase_id                UUID,  -- FK to production_phases deferred
  activity_id             UUID,  -- FK to activities deferred
  recipe_execution_id     UUID,  -- FK added after recipe_executions created
  related_transaction_id  UUID REFERENCES inventory_transactions(id),
  target_item_id          UUID REFERENCES inventory_items(id),
  cost_per_unit           DECIMAL(12,4),
  cost_total              DECIMAL(12,4),
  user_id                 UUID NOT NULL REFERENCES users(id),
  reason                  TEXT
);

CREATE INDEX idx_inv_tx_company ON inventory_transactions (company_id);
CREATE INDEX idx_inv_tx_item ON inventory_transactions (inventory_item_id);
CREATE INDEX idx_inv_tx_type ON inventory_transactions (company_id, type);
CREATE INDEX idx_inv_tx_timestamp ON inventory_transactions (company_id, timestamp);
CREATE INDEX idx_inv_tx_zone ON inventory_transactions (zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX idx_inv_tx_user ON inventory_transactions (user_id);
CREATE INDEX idx_inv_tx_related ON inventory_transactions (related_transaction_id) WHERE related_transaction_id IS NOT NULL;

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- No update trigger: transactions are immutable

-- =============================================================
-- RECIPES
-- =============================================================
CREATE TABLE recipes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  code              VARCHAR(50) NOT NULL,
  name              VARCHAR(200) NOT NULL,
  output_product_id UUID NOT NULL REFERENCES products(id),
  base_quantity     DECIMAL(12,4) NOT NULL,
  base_unit_id      UUID NOT NULL REFERENCES units_of_measure(id),
  items             JSONB NOT NULL DEFAULT '[]',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID
);

CREATE UNIQUE INDEX idx_recipes_code_company
  ON recipes (company_id, LOWER(code));
CREATE INDEX idx_recipes_company ON recipes (company_id);
CREATE INDEX idx_recipes_product ON recipes (output_product_id);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RECIPE EXECUTIONS
-- =============================================================
CREATE TABLE recipe_executions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  recipe_id                 UUID NOT NULL REFERENCES recipes(id),
  executed_by               UUID NOT NULL REFERENCES users(id),
  scale_factor              DECIMAL(8,4) NOT NULL DEFAULT 1.0,
  output_quantity_expected  DECIMAL(12,4) NOT NULL,
  output_quantity_actual    DECIMAL(12,4),
  yield_pct                 DECIMAL(8,2),
  batch_id                  UUID,  -- FK to batches deferred to Phase 4
  executed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_exec_company ON recipe_executions (company_id);
CREATE INDEX idx_recipe_exec_recipe ON recipe_executions (recipe_id);
CREATE INDEX idx_recipe_exec_user ON recipe_executions (executed_by);

ALTER TABLE recipe_executions ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- REGULATORY DOCUMENTS (needed by PRD 20 for shipment doc uploads)
-- =============================================================
CREATE TABLE regulatory_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  doc_type_id     UUID NOT NULL REFERENCES regulatory_doc_types(id),
  shipment_id     UUID REFERENCES shipments(id),
  batch_id        UUID,  -- FK deferred to Phase 4
  document_number VARCHAR(100),
  issue_date      DATE NOT NULL,
  expiry_date     DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'valid',
  field_data      JSONB NOT NULL DEFAULT '{}',
  file_path       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_reg_docs_company ON regulatory_documents (company_id);
CREATE INDEX idx_reg_docs_doc_type ON regulatory_documents (doc_type_id);
CREATE INDEX idx_reg_docs_shipment ON regulatory_documents (shipment_id) WHERE shipment_id IS NOT NULL;

ALTER TABLE regulatory_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON regulatory_documents
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- DEFERRED FKs
-- =============================================================
ALTER TABLE shipment_items
  ADD CONSTRAINT si_inventory_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);
ALTER TABLE shipment_items
  ADD CONSTRAINT si_transaction_fkey FOREIGN KEY (transaction_id) REFERENCES inventory_transactions(id);
ALTER TABLE inventory_transactions
  ADD CONSTRAINT inv_tx_recipe_exec_fkey FOREIGN KEY (recipe_execution_id) REFERENCES recipe_executions(id);

-- =============================================================
-- STORAGE BUCKET: shipment-documents
-- =============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('shipment-documents', 'shipment-documents', false);

CREATE POLICY "shipment_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'shipment-documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
  );

CREATE POLICY "shipment_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'shipment-documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "shipment_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'shipment-documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

-- =============================================================
-- fn_confirm_shipment_receipt — atomic receipt confirmation
-- Called by Edge Function confirm-shipment-receipt
-- =============================================================
CREATE OR REPLACE FUNCTION fn_confirm_shipment_receipt(
  p_shipment_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment     RECORD;
  v_item         RECORD;
  v_inv_item_id  UUID;
  v_tx_id        UUID;
  v_items_created INT := 0;
  v_all_accepted  BOOLEAN := true;
  v_any_accepted  BOOLEAN := false;
  v_final_status  shipment_status;
  v_lot_stat      lot_status;
  v_company_id    UUID;
BEGIN
  -- 1. Lock and verify shipment
  SELECT * INTO v_shipment
  FROM shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;

  IF v_shipment.status NOT IN ('received', 'inspecting') THEN
    RAISE EXCEPTION 'Shipment must be in received or inspecting status, got: %', v_shipment.status;
  END IF;

  v_company_id := v_shipment.company_id;

  -- 2. Verify all lines are inspected
  IF EXISTS (
    SELECT 1 FROM shipment_items
    WHERE shipment_id = p_shipment_id
      AND inspection_result IS NULL
  ) THEN
    RAISE EXCEPTION 'All shipment lines must be inspected before confirming';
  END IF;

  -- 3. Process each item
  FOR v_item IN
    SELECT * FROM shipment_items
    WHERE shipment_id = p_shipment_id
    ORDER BY sort_order
  LOOP
    IF v_item.inspection_result = 'rejected' THEN
      v_all_accepted := false;
      CONTINUE;
    END IF;

    v_any_accepted := true;

    -- Determine lot status
    IF v_item.inspection_result = 'quarantine' THEN
      v_lot_stat := 'quarantine';
    ELSE
      v_lot_stat := 'available';
    END IF;

    -- Create inventory_item
    INSERT INTO inventory_items (
      company_id, product_id, zone_id, quantity_available, unit_id,
      batch_number, supplier_lot_number, cost_per_unit, expiration_date,
      source_type, lot_status, shipment_item_id, created_by
    ) VALUES (
      v_company_id, v_item.product_id, v_item.destination_zone_id,
      COALESCE(v_item.received_quantity, 0), v_item.unit_id,
      COALESCE(v_item.supplier_lot_number, 'SHP-' || v_shipment.shipment_code || '-' || (v_items_created + 1)),
      v_item.supplier_lot_number, v_item.cost_per_unit, v_item.expiration_date,
      'purchase', v_lot_stat, v_item.id, p_user_id
    )
    RETURNING id INTO v_inv_item_id;

    -- Create receipt transaction
    INSERT INTO inventory_transactions (
      company_id, type, inventory_item_id, quantity, unit_id,
      zone_id, cost_per_unit, cost_total, user_id
    ) VALUES (
      v_company_id, 'receipt', v_inv_item_id,
      COALESCE(v_item.received_quantity, 0), v_item.unit_id,
      v_item.destination_zone_id, v_item.cost_per_unit,
      COALESCE(v_item.cost_per_unit, 0) * COALESCE(v_item.received_quantity, 0),
      p_user_id
    )
    RETURNING id INTO v_tx_id;

    -- Link back to shipment_item
    UPDATE shipment_items
    SET inventory_item_id = v_inv_item_id,
        transaction_id = v_tx_id
    WHERE id = v_item.id;

    v_items_created := v_items_created + 1;

    -- Check if this line had observations → not fully accepted
    IF v_item.inspection_result IN ('accepted_with_observations', 'quarantine') THEN
      v_all_accepted := false;
    END IF;
  END LOOP;

  -- 4. Determine final status
  IF NOT v_any_accepted THEN
    v_final_status := 'rejected';
  ELSIF v_all_accepted THEN
    v_final_status := 'accepted';
  ELSE
    v_final_status := 'partial_accepted';
  END IF;

  -- 5. Update shipment
  UPDATE shipments
  SET status = v_final_status,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_shipment_id;

  RETURN jsonb_build_object(
    'status', v_final_status::text,
    'items_created', v_items_created,
    'shipment_id', p_shipment_id
  );
END;
$$;

-- =============================================================
-- fn_execute_recipe — atomic recipe execution with FIFO
-- Called by Edge Function execute-recipe
-- =============================================================
CREATE OR REPLACE FUNCTION fn_execute_recipe(
  p_recipe_id UUID,
  p_user_id UUID,
  p_scale_factor DECIMAL,
  p_output_quantity_actual DECIMAL DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe              RECORD;
  v_item                JSONB;
  v_product_id          UUID;
  v_needed_qty          DECIMAL;
  v_remaining           DECIMAL;
  v_inv_item            RECORD;
  v_consume_qty         DECIMAL;
  v_tx_id               UUID;
  v_execution_id        UUID;
  v_output_expected     DECIMAL;
  v_output_actual       DECIMAL;
  v_yield               DECIMAL;
  v_output_inv_id       UUID;
  v_output_tx_id        UUID;
  v_company_id          UUID;
BEGIN
  -- 1. Lock and verify recipe
  SELECT * INTO v_recipe
  FROM recipes
  WHERE id = p_recipe_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipe not found or inactive';
  END IF;

  v_company_id := v_recipe.company_id;
  v_output_expected := v_recipe.base_quantity * p_scale_factor;
  v_output_actual := COALESCE(p_output_quantity_actual, v_output_expected);

  -- 2. Create recipe execution record
  INSERT INTO recipe_executions (
    company_id, recipe_id, executed_by, scale_factor,
    output_quantity_expected, output_quantity_actual, yield_pct, batch_id
  ) VALUES (
    v_company_id, p_recipe_id, p_user_id, p_scale_factor,
    v_output_expected, v_output_actual,
    ROUND((v_output_actual / NULLIF(v_output_expected, 0)) * 100, 2),
    p_batch_id
  )
  RETURNING id INTO v_execution_id;

  -- 3. Consume ingredients (FIFO)
  -- CONCURRENCY NOTES:
  -- - FOR UPDATE on recipes (step 1) serializes concurrent executions of the same recipe.
  -- - FOR UPDATE on inventory_items (below) prevents double-consumption of the same lot.
  -- - READ COMMITTED isolation is sufficient for supervised operations (one operator at a time).
  -- - If unsupervised concurrent execution is needed, upgrade to SERIALIZABLE or add
  --   application-level advisory locks.
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_recipe.items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::UUID;
    v_needed_qty := (v_item ->> 'quantity')::DECIMAL * p_scale_factor;
    v_remaining := v_needed_qty;

    -- FIFO: consume from oldest lots first
    FOR v_inv_item IN
      SELECT * FROM inventory_items
      WHERE company_id = v_company_id
        AND product_id = v_product_id
        AND lot_status = 'available'
        AND quantity_available > 0
      ORDER BY created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_consume_qty := LEAST(v_inv_item.quantity_available, v_remaining);

      -- Deduct from inventory
      UPDATE inventory_items
      SET quantity_available = quantity_available - v_consume_qty,
          lot_status = CASE
            WHEN quantity_available - v_consume_qty <= 0 THEN 'depleted'::lot_status
            ELSE lot_status
          END,
          updated_at = now()
      WHERE id = v_inv_item.id;

      -- Create consumption transaction
      INSERT INTO inventory_transactions (
        company_id, type, inventory_item_id, quantity, unit_id,
        recipe_execution_id, cost_per_unit, cost_total, user_id
      ) VALUES (
        v_company_id, 'consumption', v_inv_item.id,
        v_consume_qty, v_inv_item.unit_id,
        v_execution_id, v_inv_item.cost_per_unit,
        COALESCE(v_inv_item.cost_per_unit, 0) * v_consume_qty,
        p_user_id
      );

      v_remaining := v_remaining - v_consume_qty;
    END LOOP;

    IF v_remaining > 0 THEN
      RAISE EXCEPTION 'Insufficient stock for product %: needed %, short by %',
        v_product_id, v_needed_qty, v_remaining;
    END IF;
  END LOOP;

  -- 4. Create output inventory_item
  INSERT INTO inventory_items (
    company_id, product_id, quantity_available, unit_id,
    batch_number, source_type, lot_status, created_by
  ) VALUES (
    v_company_id, v_recipe.output_product_id,
    v_output_actual, v_recipe.base_unit_id,
    'RCP-' || v_recipe.code || '-' || to_char(now(), 'YYYYMMDD-HH24MI'),
    'production', 'available', p_user_id
  )
  RETURNING id INTO v_output_inv_id;

  -- 5. Create production transaction
  INSERT INTO inventory_transactions (
    company_id, type, inventory_item_id, quantity, unit_id,
    recipe_execution_id, user_id
  ) VALUES (
    v_company_id, 'transformation_in', v_output_inv_id,
    v_output_actual, v_recipe.base_unit_id,
    v_execution_id, p_user_id
  )
  RETURNING id INTO v_output_tx_id;

  -- 6. Calculate yield
  v_yield := ROUND((v_output_actual / NULLIF(v_output_expected, 0)) * 100, 2);
  UPDATE recipe_executions SET yield_pct = v_yield WHERE id = v_execution_id;

  RETURN jsonb_build_object(
    'execution_id', v_execution_id,
    'output_inventory_item_id', v_output_inv_id,
    'output_quantity_actual', v_output_actual,
    'yield_pct', v_yield
  );
END;
$$;

-- =============================================================
-- RLS POLICIES: shipments (Pattern 1 + Pattern 3 supervisor+)
-- =============================================================
CREATE POLICY "ship_select_company" ON shipments
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "ship_insert_roles" ON shipments
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "ship_update_roles" ON shipments
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "ship_service_role" ON shipments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: shipment_items (Pattern 2 via shipment)
-- =============================================================
CREATE POLICY "si_select" ON shipment_items
  FOR SELECT USING (
    shipment_id IN (SELECT id FROM shipments WHERE company_id = (SELECT get_my_company_id()))
  );

CREATE POLICY "si_insert_roles" ON shipment_items
  FOR INSERT WITH CHECK (
    shipment_id IN (SELECT id FROM shipments WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "si_update_roles" ON shipment_items
  FOR UPDATE
  USING (
    shipment_id IN (SELECT id FROM shipments WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    shipment_id IN (SELECT id FROM shipments WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "si_delete_roles" ON shipment_items
  FOR DELETE USING (
    shipment_id IN (SELECT id FROM shipments WHERE company_id = (SELECT get_my_company_id()))
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "si_service_role" ON shipment_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: inventory_items (Pattern 1 + Pattern 3)
-- =============================================================
CREATE POLICY "inv_item_select_company" ON inventory_items
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "inv_item_insert_roles" ON inventory_items
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "inv_item_update_roles" ON inventory_items
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "inv_item_service_role" ON inventory_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: inventory_transactions (Pattern 1, read-only for users, write via service)
-- =============================================================
CREATE POLICY "inv_tx_select_company" ON inventory_transactions
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "inv_tx_insert_roles" ON inventory_transactions
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "inv_tx_service_role" ON inventory_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: recipes (Pattern 1 + Pattern 3)
-- =============================================================
CREATE POLICY "recipe_select_company" ON recipes
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "recipe_insert_admin_manager" ON recipes
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "recipe_update_admin_manager" ON recipes
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "recipe_service_role" ON recipes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: recipe_executions (Pattern 1 + supervisor can execute)
-- =============================================================
CREATE POLICY "rexec_select_company" ON recipe_executions
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "rexec_insert_roles" ON recipe_executions
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "rexec_service_role" ON recipe_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: regulatory_documents (Pattern 1 + Pattern 3)
-- =============================================================
CREATE POLICY "regdoc_select_company" ON regulatory_documents
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "regdoc_insert_roles" ON regulatory_documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "regdoc_update_roles" ON regulatory_documents
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "regdoc_service_role" ON regulatory_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);
