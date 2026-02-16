-- 05_activities.sql
-- US-003-004: Activities domain (10 tables)
-- Note: scheduled_activities.batch_id, activities.batch_id without FK (batches doesn't exist yet)
-- Note: activities needs company_id redundant for RLS Type C

-- ============================================================
-- DOMAIN: ACTIVITIES
-- ============================================================

CREATE TABLE activity_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR NOT NULL,
  category    VARCHAR,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES users(id),
  updated_by  UUID REFERENCES users(id)
);

CREATE TABLE activity_templates (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                        VARCHAR NOT NULL UNIQUE,
  activity_type_id            UUID NOT NULL REFERENCES activity_types(id),
  name                        VARCHAR NOT NULL,
  frequency                   activity_frequency NOT NULL DEFAULT 'on_demand',
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
  created_by                  UUID REFERENCES users(id),
  updated_by                  UUID REFERENCES users(id)
);

CREATE TABLE activity_template_phases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id   UUID NOT NULL REFERENCES activity_templates(id),
  phase_id      UUID NOT NULL REFERENCES production_phases(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, phase_id)
);

CREATE TABLE activity_template_resources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES activity_templates(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        DECIMAL NOT NULL,
  quantity_basis  quantity_basis NOT NULL DEFAULT 'fixed',
  is_optional     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE TABLE activity_template_checklist (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES activity_templates(id),
  step_order      INT NOT NULL,
  instruction     TEXT NOT NULL,
  is_critical     BOOLEAN NOT NULL DEFAULT false,
  requires_photo  BOOLEAN NOT NULL DEFAULT false,
  expected_value  VARCHAR,
  tolerance       VARCHAR,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id)
);

CREATE TABLE cultivation_schedules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR NOT NULL,
  cultivar_id   UUID NOT NULL REFERENCES cultivars(id),
  total_days    INT NOT NULL,
  phase_config  JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES users(id),
  updated_by    UUID REFERENCES users(id)
);

CREATE TABLE scheduled_activities (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id             UUID NOT NULL REFERENCES cultivation_schedules(id),
  template_id             UUID NOT NULL REFERENCES activity_templates(id),
  batch_id                UUID, -- FK added later (batches doesn't exist yet)
  planned_date            DATE NOT NULL,
  crop_day                INT NOT NULL,
  phase_id                UUID NOT NULL REFERENCES production_phases(id),
  template_snapshot       JSONB,
  status                  scheduled_activity_status NOT NULL DEFAULT 'pending',
  completed_activity_id   UUID, -- FK added later (activities created below)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES users(id),
  updated_by              UUID REFERENCES users(id)
);

CREATE TABLE activities (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type_id        UUID NOT NULL REFERENCES activity_types(id),
  template_id             UUID REFERENCES activity_templates(id),
  scheduled_activity_id   UUID REFERENCES scheduled_activities(id),
  batch_id                UUID, -- FK added later (batches doesn't exist yet)
  zone_id                 UUID NOT NULL REFERENCES zones(id),
  performed_by            UUID NOT NULL REFERENCES users(id),
  performed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes        INT NOT NULL,
  phase_id                UUID NOT NULL REFERENCES production_phases(id),
  crop_day                INT,
  status                  activity_status NOT NULL DEFAULT 'in_progress',
  notes                   TEXT,
  company_id              UUID REFERENCES companies(id), -- redundant for RLS Type C
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES users(id),
  updated_by              UUID REFERENCES users(id)
);

-- scheduled_activities.completed_activity_id -> activities
ALTER TABLE scheduled_activities
  ADD CONSTRAINT fk_sa_completed_activity FOREIGN KEY (completed_activity_id) REFERENCES activities(id);

CREATE TABLE activity_resources (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id         UUID NOT NULL REFERENCES activities(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  inventory_item_id   UUID REFERENCES inventory_items(id),
  quantity_planned    DECIMAL,
  quantity_actual     DECIMAL NOT NULL,
  unit_id             UUID NOT NULL REFERENCES units_of_measure(id),
  cost_total          DECIMAL,
  transaction_id      UUID REFERENCES inventory_transactions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id)
);

CREATE TABLE activity_observations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id       UUID NOT NULL REFERENCES activities(id),
  type              observation_type NOT NULL,
  severity          severity_level NOT NULL DEFAULT 'info',
  description       TEXT NOT NULL,
  affected_plants   INT,
  action_taken      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id)
);

-- ============================================================
-- DEFERRED FK from US-003-003 (now that activities exists)
-- ============================================================

-- inventory_transactions.activity_id -> activities
ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_it_activity FOREIGN KEY (activity_id) REFERENCES activities(id);
