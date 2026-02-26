-- Regulatory configuration: doc types, product requirements, shipment requirements
-- PRD 13 — /settings/regulatory-config

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE doc_category AS ENUM ('quality', 'transport', 'compliance', 'origin', 'safety', 'commercial');
CREATE TYPE compliance_scope AS ENUM ('per_batch', 'per_lot', 'per_product', 'per_facility');
CREATE TYPE compliance_frequency AS ENUM ('once', 'per_production', 'annual', 'per_shipment');
CREATE TYPE shipment_doc_applies_when AS ENUM ('always', 'interstate', 'international', 'regulated_material');

-- =============================================================
-- REGULATORY DOC TYPES (Pattern 1 RLS with company_id)
-- =============================================================
CREATE TABLE regulatory_doc_types (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  code                VARCHAR(50) NOT NULL,
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  category            doc_category NOT NULL,
  valid_for_days      INT,
  issuing_authority   VARCHAR(200),
  required_fields     JSONB NOT NULL DEFAULT '{"fields": []}',
  sort_order          INT NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  updated_by          UUID
);

CREATE UNIQUE INDEX idx_rdt_code_company
  ON regulatory_doc_types (company_id, LOWER(code));
CREATE INDEX idx_rdt_company
  ON regulatory_doc_types (company_id);
CREATE INDEX idx_rdt_category
  ON regulatory_doc_types (category);

ALTER TABLE regulatory_doc_types ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON regulatory_doc_types
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- PRODUCT REGULATORY REQUIREMENTS (Pattern 1 via doc_type company)
-- product_id is plain UUID — FK to products deferred to Phase 3
-- =============================================================
CREATE TABLE product_regulatory_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID,
  category_id       UUID REFERENCES resource_categories(id),
  doc_type_id       UUID NOT NULL REFERENCES regulatory_doc_types(id),
  is_mandatory      BOOLEAN NOT NULL DEFAULT true,
  applies_to_scope  compliance_scope NOT NULL,
  frequency         compliance_frequency NOT NULL,
  notes             TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID,
  CONSTRAINT prr_product_xor_category CHECK (
    (product_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND category_id IS NOT NULL)
  )
);

CREATE INDEX idx_prr_doc_type ON product_regulatory_requirements (doc_type_id);
CREATE INDEX idx_prr_product ON product_regulatory_requirements (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_prr_category ON product_regulatory_requirements (category_id) WHERE category_id IS NOT NULL;

ALTER TABLE product_regulatory_requirements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON product_regulatory_requirements
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- SHIPMENT DOC REQUIREMENTS (Pattern 2 via doc_type)
-- product_id is plain UUID — FK to products deferred to Phase 3
-- =============================================================
CREATE TABLE shipment_doc_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID,
  category_id     UUID REFERENCES resource_categories(id),
  doc_type_id     UUID NOT NULL REFERENCES regulatory_doc_types(id),
  is_mandatory    BOOLEAN NOT NULL DEFAULT true,
  applies_when    shipment_doc_applies_when NOT NULL,
  notes           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID,
  CONSTRAINT sdr_product_xor_category CHECK (
    (product_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND category_id IS NOT NULL)
  )
);

CREATE INDEX idx_sdr_doc_type ON shipment_doc_requirements (doc_type_id);
CREATE INDEX idx_sdr_product ON shipment_doc_requirements (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_sdr_category ON shipment_doc_requirements (category_id) WHERE category_id IS NOT NULL;

ALTER TABLE shipment_doc_requirements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON shipment_doc_requirements
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RLS POLICIES: regulatory_doc_types (Pattern 1 + Pattern 3)
-- =============================================================

CREATE POLICY "rdt_select_company" ON regulatory_doc_types
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "rdt_insert_admin_manager" ON regulatory_doc_types
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "rdt_update_admin_manager" ON regulatory_doc_types
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "rdt_service_role" ON regulatory_doc_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: product_regulatory_requirements (Pattern 2 via doc_type)
-- =============================================================

CREATE POLICY "prr_select" ON product_regulatory_requirements
  FOR SELECT USING (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "prr_insert_admin_manager" ON product_regulatory_requirements
  FOR INSERT WITH CHECK (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "prr_update_admin_manager" ON product_regulatory_requirements
  FOR UPDATE
  USING (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "prr_delete_admin_manager" ON product_regulatory_requirements
  FOR DELETE USING (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "prr_service_role" ON product_regulatory_requirements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: shipment_doc_requirements (Pattern 2 via doc_type)
-- =============================================================

CREATE POLICY "sdr_select" ON shipment_doc_requirements
  FOR SELECT USING (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "sdr_insert_admin_manager" ON shipment_doc_requirements
  FOR INSERT WITH CHECK (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "sdr_update_admin_manager" ON shipment_doc_requirements
  FOR UPDATE
  USING (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "sdr_delete_admin_manager" ON shipment_doc_requirements
  FOR DELETE USING (
    doc_type_id IN (
      SELECT id FROM regulatory_doc_types WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "sdr_service_role" ON shipment_doc_requirements
  FOR ALL TO service_role USING (true) WITH CHECK (true);
