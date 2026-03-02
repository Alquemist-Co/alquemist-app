-- Products catalog: suppliers, products, product_regulatory_requirements
-- PRD 17 — /inventory/products
-- Also creates suppliers table (PRD 18 adds the CRUD UI)

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE product_procurement_type AS ENUM ('purchased', 'produced', 'both');

-- compliance_scope + compliance_frequency already exist in _007_regulatory_config.sql
-- lot_tracking already exists in _003_catalog_tables.sql

-- =============================================================
-- SUPPLIERS (minimal — full CRUD in PRD 18)
-- =============================================================
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  name            VARCHAR(200) NOT NULL,
  contact_info    JSONB,
  payment_terms   VARCHAR(200),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_suppliers_company ON suppliers (company_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- PRODUCTS
-- =============================================================
CREATE TABLE products (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  sku                       VARCHAR(50) NOT NULL,
  name                      VARCHAR(200) NOT NULL,
  category_id               UUID NOT NULL REFERENCES resource_categories(id),
  default_unit_id           UUID NOT NULL REFERENCES units_of_measure(id),
  cultivar_id               UUID REFERENCES cultivars(id),
  procurement_type          product_procurement_type NOT NULL DEFAULT 'purchased',
  lot_tracking              lot_tracking NOT NULL DEFAULT 'none',
  shelf_life_days           INT,
  phi_days                  INT,
  rei_hours                 INT,
  default_yield_pct         DECIMAL(5,2),
  density_g_per_ml          DECIMAL(8,4),
  conversion_properties     JSONB,
  default_price             DECIMAL(12,2),
  price_currency            CHAR(3),
  preferred_supplier_id     UUID REFERENCES suppliers(id),
  requires_regulatory_docs  BOOLEAN NOT NULL DEFAULT false,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                UUID,
  updated_by                UUID
);

CREATE UNIQUE INDEX idx_products_sku_company
  ON products (company_id, LOWER(sku));
CREATE INDEX idx_products_company
  ON products (company_id);
CREATE INDEX idx_products_category
  ON products (category_id);
CREATE INDEX idx_products_cultivar
  ON products (cultivar_id) WHERE cultivar_id IS NOT NULL;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- PRODUCT REGULATORY REQUIREMENTS — add FK to products
-- (table + indexes + RLS + trigger already exist in _007)
-- =============================================================
ALTER TABLE product_regulatory_requirements
  ADD CONSTRAINT prr_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Deferred FKs from earlier migrations
ALTER TABLE phase_product_flows
  ADD CONSTRAINT ppf_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE shipment_doc_requirements
  ADD CONSTRAINT sdr_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- =============================================================
-- RLS POLICIES: suppliers (Pattern 1 + Pattern 3)
-- =============================================================

CREATE POLICY "sup_select_company" ON suppliers
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "sup_insert_admin_manager" ON suppliers
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "sup_update_admin_manager" ON suppliers
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "sup_service_role" ON suppliers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: products (Pattern 1 + Pattern 3)
-- =============================================================

CREATE POLICY "prod_select_company" ON products
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "prod_insert_admin_manager" ON products
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "prod_update_admin_manager" ON products
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "prod_service_role" ON products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: product_regulatory_requirements
-- Replace _007 doc_type-based policies with product/category-based
-- =============================================================

DROP POLICY IF EXISTS "prr_select" ON product_regulatory_requirements;
DROP POLICY IF EXISTS "prr_insert_admin_manager" ON product_regulatory_requirements;
DROP POLICY IF EXISTS "prr_update_admin_manager" ON product_regulatory_requirements;
DROP POLICY IF EXISTS "prr_delete_admin_manager" ON product_regulatory_requirements;
DROP POLICY IF EXISTS "prr_service_role" ON product_regulatory_requirements;

CREATE POLICY "prr_select" ON product_regulatory_requirements
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE company_id = (SELECT get_my_company_id()))
    OR category_id IN (SELECT id FROM resource_categories WHERE company_id = (SELECT get_my_company_id()))
  );

CREATE POLICY "prr_insert_admin_manager" ON product_regulatory_requirements
  FOR INSERT WITH CHECK (
    (SELECT get_my_role()) IN ('admin', 'manager')
    AND (
      product_id IN (SELECT id FROM products WHERE company_id = (SELECT get_my_company_id()))
      OR category_id IN (SELECT id FROM resource_categories WHERE company_id = (SELECT get_my_company_id()))
    )
  );

CREATE POLICY "prr_update_admin_manager" ON product_regulatory_requirements
  FOR UPDATE
  USING (
    (SELECT get_my_role()) IN ('admin', 'manager')
    AND (
      product_id IN (SELECT id FROM products WHERE company_id = (SELECT get_my_company_id()))
      OR category_id IN (SELECT id FROM resource_categories WHERE company_id = (SELECT get_my_company_id()))
    )
  )
  WITH CHECK (
    (SELECT get_my_role()) IN ('admin', 'manager')
    AND (
      product_id IN (SELECT id FROM products WHERE company_id = (SELECT get_my_company_id()))
      OR category_id IN (SELECT id FROM resource_categories WHERE company_id = (SELECT get_my_company_id()))
    )
  );

CREATE POLICY "prr_delete_admin_manager" ON product_regulatory_requirements
  FOR DELETE USING (
    (SELECT get_my_role()) IN ('admin', 'manager')
    AND (
      product_id IN (SELECT id FROM products WHERE company_id = (SELECT get_my_company_id()))
      OR category_id IN (SELECT id FROM resource_categories WHERE company_id = (SELECT get_my_company_id()))
    )
  );

CREATE POLICY "prr_service_role" ON product_regulatory_requirements
  FOR ALL TO service_role USING (true) WITH CHECK (true);
