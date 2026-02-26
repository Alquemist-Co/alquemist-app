-- Activity templates, checklist, resources, phases, and cultivation schedules
-- PRD 12 — /settings/activity-templates

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE activity_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'once', 'on_demand');
CREATE TYPE quantity_basis AS ENUM ('fixed', 'per_plant', 'per_m2', 'per_zone', 'per_L_solution');

-- =============================================================
-- ACTIVITY TEMPLATES (Pattern 1 RLS with company_id)
-- =============================================================
CREATE TABLE activity_templates (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  code                        VARCHAR(50) NOT NULL,
  activity_type_id            UUID NOT NULL REFERENCES activity_types(id),
  name                        VARCHAR(200) NOT NULL,
  frequency                   activity_frequency NOT NULL,
  estimated_duration_min      INT NOT NULL,
  trigger_day_from            INT,
  trigger_day_to              INT,
  depends_on_template_id      UUID REFERENCES activity_templates(id),
  triggers_phase_change_id    UUID REFERENCES production_phases(id),
  triggers_transformation     BOOLEAN NOT NULL DEFAULT false,
  metadata                    JSONB,
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID,
  updated_by                  UUID
);

CREATE UNIQUE INDEX idx_activity_templates_code_company
  ON activity_templates (company_id, LOWER(code));
CREATE INDEX idx_activity_templates_company
  ON activity_templates (company_id);
CREATE INDEX idx_activity_templates_type
  ON activity_templates (activity_type_id);

ALTER TABLE activity_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON activity_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- ACTIVITY TEMPLATE PHASES (junction — Pattern 2 via template FK)
-- =============================================================
CREATE TABLE activity_template_phases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES activity_templates(id) ON DELETE CASCADE,
  phase_id      UUID NOT NULL REFERENCES production_phases(id) ON DELETE CASCADE,
  UNIQUE(template_id, phase_id)
);

CREATE INDEX idx_atp_template ON activity_template_phases (template_id);
CREATE INDEX idx_atp_phase ON activity_template_phases (phase_id);

ALTER TABLE activity_template_phases ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- ACTIVITY TEMPLATE RESOURCES (Pattern 2 via template FK)
-- =============================================================
CREATE TABLE activity_template_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES activity_templates(id) ON DELETE CASCADE,
  product_id      UUID,  -- FK to products added in Phase 3 when products table exists
  quantity        DECIMAL NOT NULL,
  quantity_basis  quantity_basis NOT NULL,
  is_optional     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_atr_template ON activity_template_resources (template_id);

ALTER TABLE activity_template_resources ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON activity_template_resources
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- ACTIVITY TEMPLATE CHECKLIST (Pattern 2 via template FK)
-- =============================================================
CREATE TABLE activity_template_checklist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES activity_templates(id) ON DELETE CASCADE,
  step_order      INT NOT NULL DEFAULT 0,
  instruction     TEXT NOT NULL,
  is_critical     BOOLEAN NOT NULL DEFAULT false,
  requires_photo  BOOLEAN NOT NULL DEFAULT false,
  expected_value  VARCHAR(100),
  tolerance       VARCHAR(50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_atc_template ON activity_template_checklist (template_id);

ALTER TABLE activity_template_checklist ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON activity_template_checklist
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- CULTIVATION SCHEDULES (Pattern 1 RLS with company_id)
-- =============================================================
CREATE TABLE cultivation_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  name            VARCHAR(200) NOT NULL,
  cultivar_id     UUID NOT NULL REFERENCES cultivars(id),
  total_days      INT,
  phase_config    JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_cs_company ON cultivation_schedules (company_id);
CREATE INDEX idx_cs_cultivar ON cultivation_schedules (cultivar_id);

ALTER TABLE cultivation_schedules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON cultivation_schedules
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- RLS POLICIES: activity_templates (Pattern 1 + Pattern 3)
-- =============================================================

CREATE POLICY "at_select_company" ON activity_templates
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "at_insert_admin_manager" ON activity_templates
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "at_update_admin_manager" ON activity_templates
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "at_service_role" ON activity_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: activity_template_phases (Pattern 2 via template)
-- =============================================================

CREATE POLICY "atp_select" ON activity_template_phases
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "atp_insert_admin_manager" ON activity_template_phases
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atp_delete_admin_manager" ON activity_template_phases
  FOR DELETE USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atp_service_role" ON activity_template_phases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: activity_template_resources (Pattern 2 via template)
-- =============================================================

CREATE POLICY "atr_select" ON activity_template_resources
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "atr_insert_admin_manager" ON activity_template_resources
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atr_update_admin_manager" ON activity_template_resources
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atr_delete_admin_manager" ON activity_template_resources
  FOR DELETE USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atr_service_role" ON activity_template_resources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: activity_template_checklist (Pattern 2 via template)
-- =============================================================

CREATE POLICY "atc_select" ON activity_template_checklist
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "atc_insert_admin_manager" ON activity_template_checklist
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atc_update_admin_manager" ON activity_template_checklist
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atc_delete_admin_manager" ON activity_template_checklist
  FOR DELETE USING (
    template_id IN (
      SELECT id FROM activity_templates WHERE company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "atc_service_role" ON activity_template_checklist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: cultivation_schedules (Pattern 1 + Pattern 3)
-- =============================================================

CREATE POLICY "cs_select_company" ON cultivation_schedules
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "cs_insert_admin_manager" ON cultivation_schedules
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "cs_update_admin_manager" ON cultivation_schedules
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "cs_service_role" ON cultivation_schedules
  FOR ALL TO service_role USING (true) WITH CHECK (true);
