-- 09_rls_policies.sql
-- US-003-006: Row Level Security policies
-- Type A: company_id direct
-- Type B: via facility -> company
-- Type C: company_id redundant (auto-populated by triggers)
-- Type D: global catalogs (read all, write admin only)

-- ============================================================
-- TYPE A — Tables with company_id direct
-- companies, users, suppliers, production_orders, cultivation_schedules,
-- recipes, overhead_costs, sensors, alerts
-- ============================================================

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON companies FOR SELECT USING (id = public.current_company_id());
CREATE POLICY "tenant_insert" ON companies FOR INSERT WITH CHECK (id = public.current_company_id());
CREATE POLICY "tenant_update" ON companies FOR UPDATE USING (id = public.current_company_id());
CREATE POLICY "tenant_delete" ON companies FOR DELETE USING (id = public.current_company_id());

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON users FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON users FOR INSERT WITH CHECK (company_id = public.current_company_id() AND public.current_user_role() = 'admin');
CREATE POLICY "tenant_update" ON users FOR UPDATE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');
CREATE POLICY "tenant_delete" ON users FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON suppliers FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON suppliers FOR INSERT WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "tenant_update" ON suppliers FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON suppliers FOR DELETE USING (company_id = public.current_company_id());

-- production_orders
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON production_orders FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON production_orders FOR INSERT
  WITH CHECK (company_id = public.current_company_id() AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON production_orders FOR UPDATE
  USING (company_id = public.current_company_id() AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON production_orders FOR DELETE
  USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- cultivation_schedules
ALTER TABLE cultivation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON cultivation_schedules FOR SELECT USING (true);
CREATE POLICY "tenant_insert" ON cultivation_schedules FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON cultivation_schedules FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON cultivation_schedules FOR DELETE USING (public.current_user_role() = 'admin');

-- recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON recipes FOR SELECT USING (true);
CREATE POLICY "tenant_insert" ON recipes FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON recipes FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON recipes FOR DELETE USING (public.current_user_role() = 'admin');

-- overhead_costs
ALTER TABLE overhead_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON overhead_costs FOR SELECT
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON overhead_costs FOR INSERT
  WITH CHECK (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_update" ON overhead_costs FOR UPDATE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "tenant_delete" ON overhead_costs FOR DELETE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id())
    AND public.current_user_role() = 'admin');

-- sensors
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON sensors FOR SELECT
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON sensors FOR INSERT
  WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON sensors FOR UPDATE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON sensors FOR DELETE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));

-- alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON alerts FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON alerts FOR INSERT WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "tenant_update" ON alerts FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON alerts FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- ============================================================
-- TYPE B — Tables that inherit via facility -> company
-- facilities, zones, zone_structures, plant_positions
-- ============================================================

-- facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON facilities FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON facilities FOR INSERT WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "tenant_update" ON facilities FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON facilities FOR DELETE USING (company_id = public.current_company_id());

-- zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON zones FOR SELECT
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON zones FOR INSERT
  WITH CHECK (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON zones FOR UPDATE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON zones FOR DELETE
  USING (facility_id IN (SELECT id FROM facilities WHERE company_id = public.current_company_id()));

-- zone_structures
ALTER TABLE zone_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON zone_structures FOR SELECT
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON zone_structures FOR INSERT
  WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON zone_structures FOR UPDATE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON zone_structures FOR DELETE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));

-- plant_positions
ALTER TABLE plant_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON plant_positions FOR SELECT
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON plant_positions FOR INSERT
  WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON plant_positions FOR UPDATE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));
CREATE POLICY "tenant_delete" ON plant_positions FOR DELETE
  USING (zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id()));

-- ============================================================
-- TYPE C — Tables with redundant company_id (auto-populated by triggers)
-- batches, activities, inventory_transactions
-- Also: batch_lineage, scheduled_activities, activity_resources,
--        activity_observations, quality_tests, quality_test_results,
--        recipe_executions, production_order_phases
-- ============================================================

-- batches (has company_id, auto-populated)
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON batches FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON batches FOR INSERT WITH CHECK (
  zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
);
CREATE POLICY "tenant_update" ON batches FOR UPDATE USING (company_id = public.current_company_id());
CREATE POLICY "tenant_delete" ON batches FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- activities (has company_id, auto-populated)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON activities FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON activities FOR INSERT WITH CHECK (
  zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  AND public.current_user_role() IN ('operator', 'supervisor', 'manager', 'admin')
);
CREATE POLICY "tenant_update" ON activities FOR UPDATE USING (
  company_id = public.current_company_id()
  AND public.current_user_role() IN ('operator', 'supervisor', 'manager', 'admin')
);
CREATE POLICY "tenant_delete" ON activities FOR DELETE USING (company_id = public.current_company_id() AND public.current_user_role() = 'admin');

-- inventory_transactions (has company_id, auto-populated)
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON inventory_transactions FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "tenant_insert" ON inventory_transactions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE company_id = public.current_company_id())
);
-- No UPDATE/DELETE policies: append-only table (enforced by trigger)

-- batch_lineage (via batch -> company)
ALTER TABLE batch_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON batch_lineage FOR SELECT
  USING (parent_batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON batch_lineage FOR INSERT
  WITH CHECK (parent_batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));

-- scheduled_activities (via batch or schedule)
ALTER TABLE scheduled_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON scheduled_activities FOR SELECT
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON scheduled_activities FOR INSERT
  WITH CHECK (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON scheduled_activities FOR UPDATE
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));

-- activity_resources (via activity -> company)
ALTER TABLE activity_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON activity_resources FOR SELECT
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON activity_resources FOR INSERT
  WITH CHECK (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON activity_resources FOR UPDATE
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));

-- activity_observations (via activity -> company)
ALTER TABLE activity_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON activity_observations FOR SELECT
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON activity_observations FOR INSERT
  WITH CHECK (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON activity_observations FOR UPDATE
  USING (activity_id IN (SELECT id FROM activities WHERE company_id = public.current_company_id()));

-- quality_tests (via batch -> company)
ALTER TABLE quality_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON quality_tests FOR SELECT
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON quality_tests FOR INSERT
  WITH CHECK (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));
CREATE POLICY "tenant_update" ON quality_tests FOR UPDATE
  USING (batch_id IN (SELECT id FROM batches WHERE company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));

-- quality_test_results (via test -> batch -> company)
ALTER TABLE quality_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON quality_test_results FOR SELECT
  USING (test_id IN (SELECT qt.id FROM quality_tests qt JOIN batches b ON qt.batch_id = b.id WHERE b.company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON quality_test_results FOR INSERT
  WITH CHECK (test_id IN (SELECT qt.id FROM quality_tests qt JOIN batches b ON qt.batch_id = b.id WHERE b.company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));
CREATE POLICY "tenant_update" ON quality_test_results FOR UPDATE
  USING (test_id IN (SELECT qt.id FROM quality_tests qt JOIN batches b ON qt.batch_id = b.id WHERE b.company_id = public.current_company_id())
    AND public.current_user_role() IN ('supervisor', 'manager', 'admin'));

-- recipe_executions (via recipe — global catalog, but batch scoped)
ALTER TABLE recipe_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON recipe_executions FOR SELECT
  USING (executed_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON recipe_executions FOR INSERT
  WITH CHECK (executed_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON recipe_executions FOR UPDATE
  USING (executed_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));

-- production_order_phases (via order -> company)
ALTER TABLE production_order_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON production_order_phases FOR SELECT
  USING (order_id IN (SELECT id FROM production_orders WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON production_order_phases FOR INSERT
  WITH CHECK (order_id IN (SELECT id FROM production_orders WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_update" ON production_order_phases FOR UPDATE
  USING (order_id IN (SELECT id FROM production_orders WHERE company_id = public.current_company_id()));

-- inventory_items (via product/zone - use zone path for tenant isolation)
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON inventory_items FOR SELECT
  USING (
    zone_id IS NULL
    OR zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  );
CREATE POLICY "tenant_insert" ON inventory_items FOR INSERT
  WITH CHECK (
    zone_id IS NULL
    OR zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  );
CREATE POLICY "tenant_update" ON inventory_items FOR UPDATE
  USING (
    zone_id IS NULL
    OR zone_id IN (SELECT z.id FROM zones z JOIN facilities f ON z.facility_id = f.id WHERE f.company_id = public.current_company_id())
  );

-- attachments (polymorphic — use uploaded_by for tenant isolation)
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON attachments FOR SELECT
  USING (uploaded_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));
CREATE POLICY "tenant_insert" ON attachments FOR INSERT
  WITH CHECK (uploaded_by IN (SELECT id FROM users WHERE company_id = public.current_company_id()));

-- ============================================================
-- TYPE D — Global catalogs (read all, write admin only)
-- crop_types, production_phases, phase_product_flows,
-- resource_categories, units_of_measure, activity_types,
-- activity_templates, activity_template_phases,
-- activity_template_resources, activity_template_checklist
-- ============================================================

-- crop_types
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON crop_types FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON crop_types FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON crop_types FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON crop_types FOR DELETE USING (public.current_user_role() = 'admin');

-- cultivars
ALTER TABLE cultivars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON cultivars FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON cultivars FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON cultivars FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON cultivars FOR DELETE USING (public.current_user_role() = 'admin');

-- production_phases
ALTER TABLE production_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON production_phases FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON production_phases FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON production_phases FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON production_phases FOR DELETE USING (public.current_user_role() = 'admin');

-- phase_product_flows
ALTER TABLE phase_product_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON phase_product_flows FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON phase_product_flows FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON phase_product_flows FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON phase_product_flows FOR DELETE USING (public.current_user_role() = 'admin');

-- cultivar_products
ALTER TABLE cultivar_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON cultivar_products FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON cultivar_products FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON cultivar_products FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON cultivar_products FOR DELETE USING (public.current_user_role() = 'admin');

-- resource_categories
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON resource_categories FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON resource_categories FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON resource_categories FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON resource_categories FOR DELETE USING (public.current_user_role() = 'admin');

-- units_of_measure
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON units_of_measure FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON units_of_measure FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON units_of_measure FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON units_of_measure FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_types
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_types FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_types FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "admin_update" ON activity_types FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY "admin_delete" ON activity_types FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_templates
ALTER TABLE activity_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_templates FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_templates FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_templates FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_templates FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_template_phases
ALTER TABLE activity_template_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_template_phases FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_template_phases FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_template_phases FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_template_phases FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_template_resources
ALTER TABLE activity_template_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_template_resources FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_template_resources FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_template_resources FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_template_resources FOR DELETE USING (public.current_user_role() = 'admin');

-- activity_template_checklist
ALTER TABLE activity_template_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON activity_template_checklist FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON activity_template_checklist FOR INSERT WITH CHECK (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_update" ON activity_template_checklist FOR UPDATE USING (public.current_user_role() IN ('manager', 'admin'));
CREATE POLICY "admin_delete" ON activity_template_checklist FOR DELETE USING (public.current_user_role() = 'admin');
