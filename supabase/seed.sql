-- =============================================================
-- SEED DATA FOR PHASE 2 TESTING
-- Test user: admin@test.com / password123
-- =============================================================

-- Fixed UUIDs for referential integrity
DO $$
DECLARE
  v_user_id    UUID := '00000000-0000-0000-0000-000000000001';
  v_company_id UUID := '00000000-0000-0000-0000-000000000010';
  -- Resource categories
  v_cat_vegetal   UUID := '00000000-0000-0000-0001-000000000001';
  v_cat_quimicos  UUID := '00000000-0000-0000-0001-000000000002';
  v_cat_equipos   UUID := '00000000-0000-0000-0001-000000000003';
  v_cat_sustratos UUID := '00000000-0000-0000-0001-000000000004';
  -- Units
  v_unit_g    UUID := '00000000-0000-0000-0002-000000000001';
  v_unit_kg   UUID := '00000000-0000-0000-0002-000000000002';
  v_unit_l    UUID := '00000000-0000-0000-0002-000000000003';
  v_unit_ml   UUID := '00000000-0000-0000-0002-000000000004';
  v_unit_und  UUID := '00000000-0000-0000-0002-000000000005';
  -- Activity types
  v_atype_riego     UUID := '00000000-0000-0000-0003-000000000001';
  v_atype_fert      UUID := '00000000-0000-0000-0003-000000000002';
  v_atype_poda      UUID := '00000000-0000-0000-0003-000000000003';
  v_atype_cosecha   UUID := '00000000-0000-0000-0003-000000000004';
  v_atype_inspeccion UUID := '00000000-0000-0000-0003-000000000005';
  -- Crop types
  v_crop_cannabis UUID := '00000000-0000-0000-0004-000000000001';
  v_crop_flores   UUID := '00000000-0000-0000-0004-000000000002';
  -- Production phases (cannabis)
  v_phase_germ    UUID := '00000000-0000-0000-0005-000000000001';
  v_phase_veg     UUID := '00000000-0000-0000-0005-000000000002';
  v_phase_flor    UUID := '00000000-0000-0000-0005-000000000003';
  v_phase_cosecha UUID := '00000000-0000-0000-0005-000000000004';
  v_phase_secado  UUID := '00000000-0000-0000-0005-000000000005';
  -- Production phases (flores)
  v_phase_f_siem  UUID := '00000000-0000-0000-0005-000000000011';
  v_phase_f_crec  UUID := '00000000-0000-0000-0005-000000000012';
  v_phase_f_flor  UUID := '00000000-0000-0000-0005-000000000013';
  v_phase_f_cos   UUID := '00000000-0000-0000-0005-000000000014';
  -- Cultivars
  v_cult_og_kush  UUID := '00000000-0000-0000-0006-000000000001';
  v_cult_blue_d   UUID := '00000000-0000-0000-0006-000000000002';
  -- Activity templates
  v_tmpl_riego_veg UUID := '00000000-0000-0000-0007-000000000001';
  v_tmpl_fert_flor UUID := '00000000-0000-0000-0007-000000000002';
  v_tmpl_insp_diaria UUID := '00000000-0000-0000-0007-000000000003';
  -- Cultivation schedules
  v_sched_og UUID := '00000000-0000-0000-0008-000000000001';
  -- Regulatory doc types
  v_rdt_coa   UUID := '00000000-0000-0000-0009-000000000001';
  v_rdt_sds   UUID := '00000000-0000-0000-0009-000000000002';
  v_rdt_phyto UUID := '00000000-0000-0000-0009-000000000003';
BEGIN

-- =============================================================
-- 1. AUTH USER (admin@test.com / password123)
-- =============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token,
  is_sso_user, is_anonymous
) VALUES (
  v_user_id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'admin@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'company_id', v_company_id::text, 'role', 'admin'),
  '{}'::jsonb,
  now(), now(),
  '', '', '',
  '', '',
  '', '', '',
  false, false
);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES (
  v_user_id, v_user_id,
  jsonb_build_object('sub', v_user_id::text, 'email', 'admin@test.com'),
  'email', v_user_id::text,
  now(), now(), now()
);

-- =============================================================
-- 2. COMPANY
-- =============================================================
INSERT INTO companies (id, name, legal_id, country, timezone, currency, created_by, settings)
VALUES (
  v_company_id,
  'Alquemist Test Farm',
  'NIT-123456789',
  'CO',
  'America/Bogota',
  'COP',
  v_user_id,
  jsonb_build_object(
    'regulatory_mode', 'standard',
    'regulatory_blocking_enabled', false,
    'features_enabled', jsonb_build_object(
      'quality', true,
      'regulatory', true,
      'iot', false,
      'field_app', false,
      'cost_tracking', false
    )
  )
);

-- =============================================================
-- 3. USER RECORD
-- =============================================================
INSERT INTO users (id, company_id, email, full_name, phone, role, created_by)
VALUES (v_user_id, v_company_id, 'admin@test.com', 'Admin Test', '+573001234567', 'admin', v_user_id);

-- =============================================================
-- 4. RESOURCE CATEGORIES (PRD 09 — Catalog)
-- =============================================================
INSERT INTO resource_categories (id, company_id, code, name, is_consumable, is_transformable, default_lot_tracking) VALUES
  (v_cat_vegetal,   v_company_id, 'MAT_VEG',  'Material Vegetal',   true,  true,  'required'),
  (v_cat_quimicos,  v_company_id, 'QUIMICOS', 'Químicos y Fertil.', true,  false, 'required'),
  (v_cat_equipos,   v_company_id, 'EQUIPOS',  'Equipos',            false, false, 'none'),
  (v_cat_sustratos, v_company_id, 'SUSTRATO', 'Sustratos',          true,  false, 'optional');

-- =============================================================
-- 5. UNITS OF MEASURE (PRD 09 — Catalog)
-- =============================================================
INSERT INTO units_of_measure (id, company_id, code, name, dimension, to_base_factor) VALUES
  (v_unit_g,   v_company_id, 'g',   'Gramos',      'mass',   1),
  (v_unit_kg,  v_company_id, 'kg',  'Kilogramos',  'mass',   1000),
  (v_unit_l,   v_company_id, 'L',   'Litros',      'volume', 1),
  (v_unit_ml,  v_company_id, 'ml',  'Mililitros',  'volume', 0.001),
  (v_unit_und, v_company_id, 'und', 'Unidades',    'count',  1);

UPDATE units_of_measure SET base_unit_id = v_unit_g  WHERE id = v_unit_kg;
UPDATE units_of_measure SET base_unit_id = v_unit_l  WHERE id = v_unit_ml;

-- =============================================================
-- 6. ACTIVITY TYPES (PRD 09 — Catalog)
-- =============================================================
INSERT INTO activity_types (id, company_id, name, category) VALUES
  (v_atype_riego,      v_company_id, 'Riego',       'mantenimiento'),
  (v_atype_fert,       v_company_id, 'Fertilización', 'nutricion'),
  (v_atype_poda,       v_company_id, 'Poda',        'mantenimiento'),
  (v_atype_cosecha,    v_company_id, 'Cosecha',     'produccion'),
  (v_atype_inspeccion, v_company_id, 'Inspección',  'control');

-- =============================================================
-- 7. CROP TYPES (PRD 10)
-- =============================================================
INSERT INTO crop_types (id, company_id, code, name, scientific_name, category, regulatory_framework) VALUES
  (v_crop_cannabis, v_company_id, 'CANN', 'Cannabis',  'Cannabis sativa L.',   'annual', 'Resolución 227/2022 MinJusticia'),
  (v_crop_flores,   v_company_id, 'FLOR', 'Flores',    'Varios',               'perennial', NULL);

-- =============================================================
-- 8. PRODUCTION PHASES (PRD 10)
-- =============================================================
-- Cannabis phases
INSERT INTO production_phases (id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, can_be_entry_point, can_be_exit_point) VALUES
  (v_phase_germ,    v_crop_cannabis, 'GERM',    'Germinación',  1, 7,   false, true,  false),
  (v_phase_veg,     v_crop_cannabis, 'VEG',     'Vegetativo',   2, 28,  false, false, false),
  (v_phase_flor,    v_crop_cannabis, 'FLOR',    'Floración',    3, 63,  false, false, false),
  (v_phase_cosecha, v_crop_cannabis, 'COSECHA', 'Cosecha',      4, 3,   true,  false, false),
  (v_phase_secado,  v_crop_cannabis, 'SECADO',  'Secado/Curado',5, 21,  true,  false, true);

-- Flores phases
INSERT INTO production_phases (id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, can_be_entry_point, can_be_exit_point) VALUES
  (v_phase_f_siem, v_crop_flores, 'SIEM',  'Siembra',     1, 14, false, true,  false),
  (v_phase_f_crec, v_crop_flores, 'CREC',  'Crecimiento', 2, 45, false, false, false),
  (v_phase_f_flor, v_crop_flores, 'FLOR',  'Floración',   3, 30, false, false, false),
  (v_phase_f_cos,  v_crop_flores, 'COS',   'Cosecha',     4, 5,  true,  false, true);

-- Phase dependencies
UPDATE production_phases SET depends_on_phase_id = v_phase_germ    WHERE id = v_phase_veg;
UPDATE production_phases SET depends_on_phase_id = v_phase_veg     WHERE id = v_phase_flor;
UPDATE production_phases SET depends_on_phase_id = v_phase_flor    WHERE id = v_phase_cosecha;
UPDATE production_phases SET depends_on_phase_id = v_phase_cosecha WHERE id = v_phase_secado;

-- =============================================================
-- 9. CULTIVARS (PRD 11)
-- =============================================================
INSERT INTO cultivars (id, crop_type_id, code, name, breeder, genetics, default_cycle_days, expected_yield_per_plant_g, expected_dry_ratio, quality_grade, density_plants_per_m2, phase_durations, target_profile, optimal_conditions)
VALUES
  (v_cult_og_kush, v_crop_cannabis, 'OGK', 'OG Kush', 'DNA Genetics', 'Indica dominante (75/25)', 122, 450, 0.22,
   'Premium',  9,
   jsonb_build_object(v_phase_germ::text, 7, v_phase_veg::text, 28, v_phase_flor::text, 63, v_phase_cosecha::text, 3, v_phase_secado::text, 21),
   jsonb_build_object('thc', '18-24%', 'cbd', '<1%', 'terpene_dominant', 'Myrcene'),
   jsonb_build_object('temp', jsonb_build_object('min', 20, 'max', 28, 'unit', '°C'), 'humidity', jsonb_build_object('min', 40, 'max', 60, 'unit', '%'))
  ),
  (v_cult_blue_d, v_crop_cannabis, 'BLD', 'Blue Dream', 'Humboldt Seeds', 'Sativa dominante (60/40)', 130, 550, 0.20,
   'AAA', 7,
   jsonb_build_object(v_phase_germ::text, 7, v_phase_veg::text, 35, v_phase_flor::text, 67, v_phase_cosecha::text, 3, v_phase_secado::text, 18),
   jsonb_build_object('thc', '17-24%', 'cbd', '1-2%', 'terpene_dominant', 'Pinene'),
   NULL
  );

-- =============================================================
-- 10. PHASE PRODUCT FLOWS (PRD 11)
-- =============================================================
INSERT INTO phase_product_flows (cultivar_id, phase_id, direction, product_role, product_category_id, expected_yield_pct, unit_id, is_required, sort_order) VALUES
  -- Cosecha: input planta viva, output flor húmeda + residuo
  (v_cult_og_kush, v_phase_cosecha, 'input',  'primary',   v_cat_vegetal, NULL, v_unit_g, true,  0),
  (v_cult_og_kush, v_phase_cosecha, 'output', 'primary',   v_cat_vegetal, 70,  v_unit_g, true,  0),
  (v_cult_og_kush, v_phase_cosecha, 'output', 'waste',     v_cat_vegetal, 30,  v_unit_g, true,  1),
  -- Secado: input flor húmeda, output flor seca
  (v_cult_og_kush, v_phase_secado,  'input',  'primary',   v_cat_vegetal, NULL, v_unit_g, true,  0),
  (v_cult_og_kush, v_phase_secado,  'output', 'primary',   v_cat_vegetal, 22,  v_unit_g, true,  0);

-- =============================================================
-- 11. ACTIVITY TEMPLATES (PRD 12)
-- =============================================================
INSERT INTO activity_templates (id, company_id, code, activity_type_id, name, frequency, estimated_duration_min, trigger_day_from, trigger_day_to, triggers_transformation) VALUES
  (v_tmpl_riego_veg,    v_company_id, 'RIEGO_VEG',  v_atype_riego,      'Riego fase vegetativa',    'daily',   30, 8,  35, false),
  (v_tmpl_fert_flor,    v_company_id, 'FERT_FLOR',  v_atype_fert,       'Fertilización floración',  'weekly',  45, 36, 98, false),
  (v_tmpl_insp_diaria,  v_company_id, 'INSP_DIA',   v_atype_inspeccion, 'Inspección diaria',        'daily',   20, 1,  122, false);

-- Template ↔ Phase associations
INSERT INTO activity_template_phases (template_id, phase_id) VALUES
  (v_tmpl_riego_veg,   v_phase_veg),
  (v_tmpl_fert_flor,   v_phase_flor),
  (v_tmpl_insp_diaria, v_phase_germ),
  (v_tmpl_insp_diaria, v_phase_veg),
  (v_tmpl_insp_diaria, v_phase_flor);

-- Template resources
INSERT INTO activity_template_resources (template_id, quantity, quantity_basis, sort_order, notes) VALUES
  (v_tmpl_riego_veg, 2.5, 'per_plant', 0, 'Agua con pH 6.0-6.5'),
  (v_tmpl_fert_flor, 1.0, 'per_L_solution', 0, 'Flora Bloom 3ml/L');

-- Template checklist
INSERT INTO activity_template_checklist (template_id, step_order, instruction, is_critical, requires_photo) VALUES
  (v_tmpl_riego_veg, 1, 'Verificar pH del agua (6.0-6.5)', true,  false),
  (v_tmpl_riego_veg, 2, 'Verificar EC del agua (1.2-1.8)',  true,  false),
  (v_tmpl_riego_veg, 3, 'Regar hasta 20% de runoff',        false, false),
  (v_tmpl_insp_diaria, 1, 'Revisar color de hojas',            false, true),
  (v_tmpl_insp_diaria, 2, 'Verificar presencia de plagas',     true,  true),
  (v_tmpl_insp_diaria, 3, 'Medir temperatura y humedad',       true,  false);

-- =============================================================
-- 12. CULTIVATION SCHEDULES (PRD 12)
-- =============================================================
INSERT INTO cultivation_schedules (id, company_id, name, cultivar_id, total_days, phase_config)
VALUES (
  v_sched_og, v_company_id, 'OG Kush Standard 122d', v_cult_og_kush, 122,
  jsonb_build_array(
    jsonb_build_object('phase_id', v_phase_germ::text,    'duration_days', 7,  'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_insp_diaria::text))),
    jsonb_build_object('phase_id', v_phase_veg::text,     'duration_days', 28, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_riego_veg::text), jsonb_build_object('template_id', v_tmpl_insp_diaria::text))),
    jsonb_build_object('phase_id', v_phase_flor::text,    'duration_days', 63, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_fert_flor::text), jsonb_build_object('template_id', v_tmpl_insp_diaria::text))),
    jsonb_build_object('phase_id', v_phase_cosecha::text, 'duration_days', 3,  'templates', '[]'::jsonb),
    jsonb_build_object('phase_id', v_phase_secado::text,  'duration_days', 21, 'templates', '[]'::jsonb)
  )
);

-- =============================================================
-- 13. REGULATORY DOC TYPES (PRD 13)
-- =============================================================
INSERT INTO regulatory_doc_types (id, company_id, code, name, description, category, valid_for_days, issuing_authority, sort_order, required_fields)
VALUES
  (v_rdt_coa, v_company_id, 'COA', 'Certificado de Análisis (CoA)', 'Documento que certifica los resultados de análisis de laboratorio para un batch de producto.', 'quality', 365, 'Lab acreditado', 0,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'lab_name',       'label', 'Nombre del laboratorio', 'type', 'text',     'required', true),
     jsonb_build_object('key', 'sample_date',    'label', 'Fecha de muestreo',      'type', 'date',     'required', true),
     jsonb_build_object('key', 'analysis_type',  'label', 'Tipo de análisis',       'type', 'select',   'required', true, 'options', jsonb_build_array('Potencia', 'Contaminantes', 'Residuos', 'Completo')),
     jsonb_build_object('key', 'overall_pass',   'label', '¿Resultado aprobado?',   'type', 'boolean',  'required', true),
     jsonb_build_object('key', 'observations',   'label', 'Observaciones',          'type', 'textarea', 'required', false, 'placeholder', 'Notas adicionales sobre el análisis')
   ))
  ),
  (v_rdt_sds, v_company_id, 'SDS', 'Hoja de Seguridad (SDS)', 'Safety Data Sheet para productos químicos utilizados.', 'safety', NULL, 'Fabricante', 1,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'manufacturer',  'label', 'Fabricante',         'type', 'text',   'required', true),
     jsonb_build_object('key', 'cas_number',    'label', 'Número CAS',        'type', 'text',   'required', false, 'placeholder', 'Ej: 7732-18-5'),
     jsonb_build_object('key', 'hazard_class',  'label', 'Clase de peligro',  'type', 'select', 'required', true, 'options', jsonb_build_array('Inflamable', 'Corrosivo', 'Tóxico', 'Irritante', 'No peligroso')),
     jsonb_build_object('key', 'revision_date', 'label', 'Fecha de revisión', 'type', 'date',   'required', true)
   ))
  ),
  (v_rdt_phyto, v_company_id, 'PHYTO', 'Certificado Fitosanitario', 'Documento que certifica que el material vegetal cumple con requisitos fitosanitarios para transporte.', 'transport', 30, 'ICA', 2,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'inspector_name',  'label', 'Nombre del inspector', 'type', 'text',    'required', true),
     jsonb_build_object('key', 'inspection_date', 'label', 'Fecha de inspección',  'type', 'date',    'required', true),
     jsonb_build_object('key', 'destination',     'label', 'Destino',              'type', 'text',    'required', true, 'placeholder', 'Ciudad o departamento de destino'),
     jsonb_build_object('key', 'quantity_kg',     'label', 'Cantidad (kg)',        'type', 'number',  'required', true),
     jsonb_build_object('key', 'pest_free',       'label', '¿Libre de plagas?',   'type', 'boolean', 'required', true)
   ))
  );

-- =============================================================
-- 14. PRODUCT REGULATORY REQUIREMENTS (PRD 13)
-- =============================================================
INSERT INTO product_regulatory_requirements (category_id, doc_type_id, is_mandatory, applies_to_scope, frequency, notes, sort_order) VALUES
  (v_cat_vegetal,  v_rdt_coa,   true,  'per_batch',    'per_production', 'CoA requerido para cada batch de producción', 0),
  (v_cat_vegetal,  v_rdt_phyto, true,  'per_product',  'per_shipment',   'Fitosanitario requerido para movilización de material vegetal', 1),
  (v_cat_quimicos, v_rdt_sds,   true,  'per_product',  'once',           'SDS del fabricante, se obtiene una vez', 2);

-- =============================================================
-- 15. SHIPMENT DOC REQUIREMENTS (PRD 13)
-- =============================================================
INSERT INTO shipment_doc_requirements (category_id, doc_type_id, is_mandatory, applies_when, notes, sort_order) VALUES
  (v_cat_vegetal,  v_rdt_phyto, true, 'always',             'Siempre requerido para transporte de material vegetal', 0),
  (v_cat_quimicos, v_rdt_sds,   true, 'always',             'SDS debe acompañar envíos de químicos',                1),
  (v_cat_vegetal,  v_rdt_coa,   false, 'interstate',        'CoA recomendado para envíos interdepartamentales',     2);

END $$;
