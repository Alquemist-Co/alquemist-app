-- =============================================================
-- Migration 18: Phase 5 — Quality, Regulatory expansion, Activities
-- =============================================================

-- =============================================================
-- ENUMs
-- =============================================================
CREATE TYPE test_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'rejected');
CREATE TYPE doc_status AS ENUM ('draft', 'valid', 'expired', 'revoked', 'superseded');
CREATE TYPE scheduled_activity_status AS ENUM ('pending', 'completed', 'skipped', 'overdue');
CREATE TYPE activity_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE observation_type AS ENUM ('pest', 'disease', 'deficiency', 'environmental', 'general', 'measurement');
CREATE TYPE observation_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE plant_part AS ENUM ('root', 'stem', 'leaf', 'flower', 'fruit', 'whole_plant');
CREATE TYPE incidence_unit AS ENUM ('count', 'percentage');

-- =============================================================
-- quality_tests — RLS Pattern 2 via batch → zone → facility → company
-- =============================================================
CREATE TABLE quality_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES batches(id),
  phase_id        UUID REFERENCES production_phases(id),
  test_type       VARCHAR(100) NOT NULL,
  lab_name        VARCHAR(200),
  lab_reference   VARCHAR(100),
  sample_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  result_date     DATE,
  status          test_status NOT NULL DEFAULT 'pending',
  overall_pass    BOOLEAN,
  notes           TEXT,
  performed_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_quality_tests_batch ON quality_tests (batch_id);
CREATE INDEX idx_quality_tests_status ON quality_tests (status);
CREATE INDEX idx_quality_tests_sample_date ON quality_tests (sample_date);
CREATE INDEX idx_quality_tests_type ON quality_tests (test_type);

ALTER TABLE quality_tests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON quality_tests
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- quality_test_results — RLS via test → batch chain
-- =============================================================
CREATE TABLE quality_test_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID NOT NULL REFERENCES quality_tests(id) ON DELETE CASCADE,
  parameter       VARCHAR(200) NOT NULL,
  value           VARCHAR(200) NOT NULL,
  numeric_value   DECIMAL,
  unit            VARCHAR(50),
  min_threshold   DECIMAL,
  max_threshold   DECIMAL,
  passed          BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID
);

CREATE INDEX idx_quality_results_test ON quality_test_results (test_id);

ALTER TABLE quality_test_results ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON quality_test_results
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- ALTER regulatory_documents — add Phase 5 columns
-- =============================================================

-- Add new FK columns
ALTER TABLE regulatory_documents
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id),
  ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES inventory_items(id),
  ADD COLUMN IF NOT EXISTS quality_test_id UUID REFERENCES quality_tests(id),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS superseded_by_id UUID REFERENCES regulatory_documents(id),
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add batch_id FK (was deferred from Phase 4)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'regulatory_documents_batch_id_fkey'
      AND table_name = 'regulatory_documents'
  ) THEN
    ALTER TABLE regulatory_documents
      ADD CONSTRAINT regulatory_documents_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES batches(id);
  END IF;
END $$;

-- Convert status from VARCHAR to doc_status ENUM
ALTER TABLE regulatory_documents
  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE regulatory_documents
  ALTER COLUMN status TYPE doc_status USING status::doc_status;
ALTER TABLE regulatory_documents
  ALTER COLUMN status SET DEFAULT 'draft';

-- Add indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_reg_docs_product ON regulatory_documents (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_docs_facility ON regulatory_documents (facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_docs_batch ON regulatory_documents (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_docs_quality_test ON regulatory_documents (quality_test_id) WHERE quality_test_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_docs_inventory_item ON regulatory_documents (inventory_item_id) WHERE inventory_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_docs_superseded_by ON regulatory_documents (superseded_by_id) WHERE superseded_by_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_docs_status ON regulatory_documents (status);
CREATE INDEX IF NOT EXISTS idx_reg_docs_expiry ON regulatory_documents (expiry_date) WHERE expiry_date IS NOT NULL;

-- =============================================================
-- phytosanitary_agents — catalog for observations
-- =============================================================
CREATE TABLE phytosanitary_agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL DEFAULT get_my_company_id() REFERENCES companies(id),
  type              VARCHAR(50) NOT NULL,  -- pest, disease, deficiency, abiotic
  category          VARCHAR(50) NOT NULL,  -- insect, mite, fungus, bacteria, virus, etc.
  code              VARCHAR(50),
  common_name       VARCHAR(200) NOT NULL,
  scientific_name   VARCHAR(200),
  default_plant_parts JSONB DEFAULT '[]',
  visual_symptoms   TEXT,
  recommended_actions TEXT,
  severity_scale    JSONB,
  crop_type_id      UUID REFERENCES crop_types(id),
  sort_order        INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID
);

CREATE INDEX idx_phyto_agents_company ON phytosanitary_agents (company_id);
CREATE INDEX idx_phyto_agents_crop_type ON phytosanitary_agents (crop_type_id) WHERE crop_type_id IS NOT NULL;
CREATE INDEX idx_phyto_agents_type ON phytosanitary_agents (type);

ALTER TABLE phytosanitary_agents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON phytosanitary_agents
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- scheduled_activities — RLS Pattern 2 via batch → zone → facility → company
-- =============================================================
CREATE TABLE scheduled_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id           UUID REFERENCES cultivation_schedules(id),
  template_id           UUID REFERENCES activity_templates(id),
  batch_id              UUID NOT NULL REFERENCES batches(id),
  planned_date          DATE NOT NULL,
  crop_day              INT,
  phase_id              UUID REFERENCES production_phases(id),
  template_snapshot     JSONB,
  status                scheduled_activity_status NOT NULL DEFAULT 'pending',
  completed_activity_id UUID,  -- FK deferred below (circular ref with activities)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_by            UUID
);

CREATE INDEX idx_sched_act_batch ON scheduled_activities (batch_id);
CREATE INDEX idx_sched_act_planned_date ON scheduled_activities (planned_date);
CREATE INDEX idx_sched_act_status ON scheduled_activities (status);
CREATE INDEX idx_sched_act_template ON scheduled_activities (template_id) WHERE template_id IS NOT NULL;

ALTER TABLE scheduled_activities ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON scheduled_activities
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- activities — real execution record
-- =============================================================
CREATE TABLE activities (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type_id        UUID NOT NULL REFERENCES activity_types(id),
  template_id             UUID REFERENCES activity_templates(id),
  scheduled_activity_id   UUID REFERENCES scheduled_activities(id),
  batch_id                UUID NOT NULL REFERENCES batches(id),
  zone_id                 UUID NOT NULL REFERENCES zones(id),
  performed_by            UUID NOT NULL REFERENCES users(id),
  performed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes        INT,
  phase_id                UUID REFERENCES production_phases(id),
  crop_day                INT,
  status                  activity_status NOT NULL DEFAULT 'in_progress',
  measurement_data        JSONB,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID,
  updated_by              UUID
);

-- Deferred FK: scheduled_activities.completed_activity_id → activities.id
ALTER TABLE scheduled_activities
  ADD CONSTRAINT sched_act_completed_activity_fkey
  FOREIGN KEY (completed_activity_id) REFERENCES activities(id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_activities_batch ON activities (batch_id);
CREATE INDEX idx_activities_zone ON activities (zone_id);
CREATE INDEX idx_activities_type ON activities (activity_type_id);
CREATE INDEX idx_activities_performed_at ON activities (performed_at);
CREATE INDEX idx_activities_status ON activities (status);
CREATE INDEX idx_activities_scheduled ON activities (scheduled_activity_id) WHERE scheduled_activity_id IS NOT NULL;

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_update_timestamps BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamps();

-- =============================================================
-- activity_resources — consumed resources
-- =============================================================
CREATE TABLE activity_resources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id       UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  quantity_planned  DECIMAL,
  quantity_actual   DECIMAL NOT NULL,
  unit_id           UUID NOT NULL REFERENCES units_of_measure(id),
  cost_total        DECIMAL,
  transaction_id    UUID REFERENCES inventory_transactions(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_act_resources_activity ON activity_resources (activity_id);
CREATE INDEX idx_act_resources_product ON activity_resources (product_id);

ALTER TABLE activity_resources ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- activity_observations — field observations
-- =============================================================
CREATE TABLE activity_observations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  type            observation_type NOT NULL,
  agent_id        UUID REFERENCES phytosanitary_agents(id),
  plant_part      plant_part,
  incidence_value DECIMAL,
  incidence_unit  incidence_unit,
  severity        observation_severity NOT NULL DEFAULT 'info',
  severity_pct    DECIMAL,
  sample_size     INT,
  description     TEXT NOT NULL,
  affected_plants INT,
  action_taken    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_act_obs_activity ON activity_observations (activity_id);
CREATE INDEX idx_act_obs_type ON activity_observations (type);
CREATE INDEX idx_act_obs_agent ON activity_observations (agent_id) WHERE agent_id IS NOT NULL;

ALTER TABLE activity_observations ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS POLICIES: quality_tests (Pattern 2 via batch → zone → facility → company)
-- =============================================================
CREATE POLICY "qt_select_company" ON quality_tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = quality_tests.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "qt_insert_roles" ON quality_tests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = quality_tests.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "qt_update_roles" ON quality_tests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = quality_tests.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = quality_tests.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "qt_delete_admin" ON quality_tests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = quality_tests.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) = 'admin'
  );

CREATE POLICY "qt_service_role" ON quality_tests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: quality_test_results (Pattern 2 via test → batch chain)
-- =============================================================
CREATE POLICY "qtr_select_company" ON quality_test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quality_tests qt
      JOIN batches b ON b.id = qt.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE qt.id = quality_test_results.test_id
        AND f.company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "qtr_insert_roles" ON quality_test_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quality_tests qt
      JOIN batches b ON b.id = qt.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE qt.id = quality_test_results.test_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "qtr_update_roles" ON quality_test_results
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quality_tests qt
      JOIN batches b ON b.id = qt.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE qt.id = quality_test_results.test_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quality_tests qt
      JOIN batches b ON b.id = qt.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE qt.id = quality_test_results.test_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "qtr_delete_roles" ON quality_test_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quality_tests qt
      JOIN batches b ON b.id = qt.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE qt.id = quality_test_results.test_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "qtr_service_role" ON quality_test_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: phytosanitary_agents (Pattern 1)
-- =============================================================
CREATE POLICY "phyto_select_company" ON phytosanitary_agents
  FOR SELECT USING (company_id = (SELECT get_my_company_id()));

CREATE POLICY "phyto_insert_roles" ON phytosanitary_agents
  FOR INSERT WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "phyto_update_roles" ON phytosanitary_agents
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

CREATE POLICY "phyto_service_role" ON phytosanitary_agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: scheduled_activities (Pattern 2 via batch)
-- =============================================================
CREATE POLICY "sched_act_select_company" ON scheduled_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = scheduled_activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "sched_act_insert_roles" ON scheduled_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = scheduled_activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "sched_act_update_roles" ON scheduled_activities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = scheduled_activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = scheduled_activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "sched_act_service_role" ON scheduled_activities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: activities (Pattern 2 via batch)
-- =============================================================
CREATE POLICY "act_select_company" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "act_insert_roles" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "act_update_roles" ON activities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE b.id = activities.batch_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "act_service_role" ON activities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: activity_resources (Pattern 2 via activity → batch)
-- =============================================================
CREATE POLICY "act_res_select_company" ON activity_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN batches b ON b.id = a.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE a.id = activity_resources.activity_id
        AND f.company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "act_res_insert_roles" ON activity_resources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN batches b ON b.id = a.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE a.id = activity_resources.activity_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "act_res_service_role" ON activity_resources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- RLS POLICIES: activity_observations (Pattern 2 via activity → batch)
-- =============================================================
CREATE POLICY "act_obs_select_company" ON activity_observations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN batches b ON b.id = a.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE a.id = activity_observations.activity_id
        AND f.company_id = (SELECT get_my_company_id())
    )
  );

CREATE POLICY "act_obs_insert_roles" ON activity_observations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN batches b ON b.id = a.batch_id
      JOIN zones z ON z.id = b.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE a.id = activity_observations.activity_id
        AND f.company_id = (SELECT get_my_company_id())
    )
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "act_obs_service_role" ON activity_observations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- STORAGE BUCKET: regulatory-documents
-- =============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('regulatory-documents', 'regulatory-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "reg_docs_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'regulatory-documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
  );

CREATE POLICY "reg_docs_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'regulatory-documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "reg_docs_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'regulatory-documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "reg_docs_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'regulatory-documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );

-- =============================================================
-- STORAGE BUCKET: activity-attachments (for activity photos)
-- =============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-attachments', 'activity-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "act_attach_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'activity-attachments'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
  );

CREATE POLICY "act_attach_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'activity-attachments'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) IN ('admin', 'manager', 'supervisor')
  );

CREATE POLICY "act_attach_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'activity-attachments'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) IN ('admin', 'manager')
  );
