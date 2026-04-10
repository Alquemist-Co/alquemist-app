-- =============================================================
-- SEED DATA — Alquemist Agroindustrial S.A.S.
-- Multi-crop: Cannabis, Café, Palma de Aceite
-- Users: admin@test.com / password123 (all roles share same pw)
-- =============================================================

DO $$
DECLARE
  -- Users
  v_user_admin      UUID := '00000000-0000-0000-0000-000000000001';
  v_user_gerente    UUID := '00000000-0000-0000-0000-000000000002';
  v_user_supervisor UUID := '00000000-0000-0000-0000-000000000003';
  v_user_operador   UUID := '00000000-0000-0000-0000-000000000004';
  v_user_visor      UUID := '00000000-0000-0000-0000-000000000005';

  -- Company
  v_company_id UUID := '00000000-0000-0000-0000-000000000010';

  -- Resource categories (0001 series)
  v_cat_vegetal   UUID := '00000000-0000-0000-0001-000000000001';
  v_cat_quimicos  UUID := '00000000-0000-0000-0001-000000000002';
  v_cat_equipos   UUID := '00000000-0000-0000-0001-000000000003';
  v_cat_sustratos UUID := '00000000-0000-0000-0001-000000000004';
  v_cat_semillas  UUID := '00000000-0000-0000-0001-000000000005';
  v_cat_empaques  UUID := '00000000-0000-0000-0001-000000000006';

  -- Units (0002 series)
  v_unit_g      UUID := '00000000-0000-0000-0002-000000000001';
  v_unit_kg     UUID := '00000000-0000-0000-0002-000000000002';
  v_unit_l      UUID := '00000000-0000-0000-0002-000000000003';
  v_unit_ml     UUID := '00000000-0000-0000-0002-000000000004';
  v_unit_und    UUID := '00000000-0000-0000-0002-000000000005';
  v_unit_ton    UUID := '00000000-0000-0000-0002-000000000006';
  v_unit_ha     UUID := '00000000-0000-0000-0002-000000000007';
  v_unit_arroba UUID := '00000000-0000-0000-0002-000000000008';

  -- Activity types (0003 series)
  v_atype_riego         UUID := '00000000-0000-0000-0003-000000000001';
  v_atype_fert          UUID := '00000000-0000-0000-0003-000000000002';
  v_atype_poda          UUID := '00000000-0000-0000-0003-000000000003';
  v_atype_cosecha       UUID := '00000000-0000-0000-0003-000000000004';
  v_atype_inspeccion    UUID := '00000000-0000-0000-0003-000000000005';
  v_atype_fitosanitario UUID := '00000000-0000-0000-0003-000000000006';
  v_atype_beneficio     UUID := '00000000-0000-0000-0003-000000000007';
  v_atype_polinizacion  UUID := '00000000-0000-0000-0003-000000000008';

  -- Crop types (0004 series)
  v_crop_cannabis UUID := '00000000-0000-0000-0004-000000000001';
  v_crop_cafe     UUID := '00000000-0000-0000-0004-000000000002';
  v_crop_palma    UUID := '00000000-0000-0000-0004-000000000003';

  -- Production phases: Cannabis (0005-0x01..07)
  v_pc_germ     UUID := '00000000-0000-0000-0005-000000000001';
  v_pc_plantula UUID := '00000000-0000-0000-0005-000000000002';
  v_pc_veg      UUID := '00000000-0000-0000-0005-000000000003';
  v_pc_flor     UUID := '00000000-0000-0000-0005-000000000004';
  v_pc_cosecha  UUID := '00000000-0000-0000-0005-000000000005';
  v_pc_secado   UUID := '00000000-0000-0000-0005-000000000006';
  v_pc_curado   UUID := '00000000-0000-0000-0005-000000000007';

  -- Production phases: Cafe (0005-0x11..17)
  v_pf_almacigo    UUID := '00000000-0000-0000-0005-000000000011';
  v_pf_levante     UUID := '00000000-0000-0000-0005-000000000012';
  v_pf_floracion   UUID := '00000000-0000-0000-0005-000000000013';
  v_pf_desarrollo  UUID := '00000000-0000-0000-0005-000000000014';
  v_pf_recoleccion UUID := '00000000-0000-0000-0005-000000000015';
  v_pf_beneficio   UUID := '00000000-0000-0000-0005-000000000016';
  v_pf_secado_c    UUID := '00000000-0000-0000-0005-000000000017';

  -- Production phases: Palma (0005-0x21..26)
  v_pp_previvero  UUID := '00000000-0000-0000-0005-000000000021';
  v_pp_vivero     UUID := '00000000-0000-0000-0005-000000000022';
  v_pp_inmaduro   UUID := '00000000-0000-0000-0005-000000000023';
  v_pp_productivo UUID := '00000000-0000-0000-0005-000000000024';
  v_pp_corte      UUID := '00000000-0000-0000-0005-000000000025';
  v_pp_extraccion UUID := '00000000-0000-0000-0005-000000000026';

  -- Cultivars (0006 series)
  v_cult_og_kush  UUID := '00000000-0000-0000-0006-000000000001';
  v_cult_blue_d   UUID := '00000000-0000-0000-0006-000000000002';
  v_cult_white_w  UUID := '00000000-0000-0000-0006-000000000003';
  v_cult_castillo UUID := '00000000-0000-0000-0006-000000000011';
  v_cult_geisha   UUID := '00000000-0000-0000-0006-000000000012';
  v_cult_caturra  UUID := '00000000-0000-0000-0006-000000000013';
  v_cult_tenera   UUID := '00000000-0000-0000-0006-000000000021';
  v_cult_oxg      UUID := '00000000-0000-0000-0006-000000000022';

  -- Activity templates (0007 series)
  v_tmpl_riego_cann    UUID := '00000000-0000-0000-0007-000000000001';
  v_tmpl_fert_cann     UUID := '00000000-0000-0000-0007-000000000002';
  v_tmpl_insp_cann     UUID := '00000000-0000-0000-0007-000000000003';
  v_tmpl_riego_cafe    UUID := '00000000-0000-0000-0007-000000000011';
  v_tmpl_fert_cafe     UUID := '00000000-0000-0000-0007-000000000012';
  v_tmpl_insp_cafe     UUID := '00000000-0000-0000-0007-000000000013';
  v_tmpl_recol_cafe    UUID := '00000000-0000-0000-0007-000000000014';
  v_tmpl_fert_palma    UUID := '00000000-0000-0000-0007-000000000021';
  v_tmpl_insp_palma    UUID := '00000000-0000-0000-0007-000000000022';
  v_tmpl_cosecha_palma UUID := '00000000-0000-0000-0007-000000000023';

  -- Cultivation schedules (0008 series)
  v_sched_og       UUID := '00000000-0000-0000-0008-000000000001';
  v_sched_castillo UUID := '00000000-0000-0000-0008-000000000002';
  v_sched_tenera   UUID := '00000000-0000-0000-0008-000000000003';

  -- Regulatory doc types (0009 series)
  v_rdt_coa   UUID := '00000000-0000-0000-0009-000000000001';
  v_rdt_sds   UUID := '00000000-0000-0000-0009-000000000002';
  v_rdt_phyto UUID := '00000000-0000-0000-0009-000000000003';
  v_rdt_fnc   UUID := '00000000-0000-0000-0009-000000000004';
  v_rdt_rspo  UUID := '00000000-0000-0000-0009-000000000005';

  -- Production orders (000a series)
  v_order_1 UUID := '00000000-0000-0000-000a-000000000001';
  v_order_2 UUID := '00000000-0000-0000-000a-000000000002';
  v_order_3 UUID := '00000000-0000-0000-000a-000000000003';
  v_order_4 UUID := '00000000-0000-0000-000a-000000000004';
  v_order_5 UUID := '00000000-0000-0000-000a-000000000005';
  v_order_6 UUID := '00000000-0000-0000-000a-000000000006';
  v_order_7 UUID := '00000000-0000-0000-000a-000000000007';
  v_order_8 UUID := '00000000-0000-0000-000a-000000000008';
  v_order_9 UUID := '00000000-0000-0000-000a-000000000009';
  v_order_10 UUID := '00000000-0000-0000-000a-000000000010';

  -- Batches (000b series)
  v_batch_1 UUID := '00000000-0000-0000-000b-000000000001';
  v_batch_2 UUID := '00000000-0000-0000-000b-000000000002';
  v_batch_3 UUID := '00000000-0000-0000-000b-000000000003';
  v_batch_4 UUID := '00000000-0000-0000-000b-000000000004';
  v_batch_5 UUID := '00000000-0000-0000-000b-000000000005';
  v_batch_6 UUID := '00000000-0000-0000-000b-000000000006';
  v_batch_7 UUID := '00000000-0000-0000-000b-000000000007';
  v_batch_8 UUID := '00000000-0000-0000-000b-000000000008';
  v_batch_9 UUID := '00000000-0000-0000-000b-000000000009';
  v_batch_10 UUID := '00000000-0000-0000-000b-000000000010';
  v_batch_11 UUID := '00000000-0000-0000-000b-000000000011';
  v_batch_12 UUID := '00000000-0000-0000-000b-000000000012';
  v_batch_13 UUID := '00000000-0000-0000-000b-000000000013';
  v_batch_14 UUID := '00000000-0000-0000-000b-000000000014';
  v_batch_15 UUID := '00000000-0000-0000-000b-000000000015';
  v_batch_16 UUID := '00000000-0000-0000-000b-000000000016';
  v_batch_17 UUID := '00000000-0000-0000-000b-000000000017';
  v_batch_18 UUID := '00000000-0000-0000-000b-000000000018';
  v_batch_19 UUID := '00000000-0000-0000-000b-000000000019';
  v_batch_20 UUID := '00000000-0000-0000-000b-000000000020';

  -- Phytosanitary agents (000f series)
  v_agent_spider_mite UUID := '00000000-0000-0000-000f-000000000001';
  v_agent_botrytis    UUID := '00000000-0000-0000-000f-000000000002';
  v_agent_nitrogen    UUID := '00000000-0000-0000-000f-000000000003';
  v_agent_broca       UUID := '00000000-0000-0000-000f-000000000004';
  v_agent_roya        UUID := '00000000-0000-0000-000f-000000000005';
  v_agent_picudo      UUID := '00000000-0000-0000-000f-000000000006';

BEGIN

-- =============================================================
-- 1. AUTH USERS (5 roles)
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
  v_user_admin,
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
), (
  v_user_gerente,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'gerente@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'company_id', v_company_id::text, 'role', 'manager'),
  '{}'::jsonb,
  now(), now(),
  '', '', '',
  '', '',
  '', '', '',
  false, false
), (
  v_user_supervisor,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'supervisor@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'company_id', v_company_id::text, 'role', 'supervisor'),
  '{}'::jsonb,
  now(), now(),
  '', '', '',
  '', '',
  '', '', '',
  false, false
), (
  v_user_operador,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'operador@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'company_id', v_company_id::text, 'role', 'operator'),
  '{}'::jsonb,
  now(), now(),
  '', '', '',
  '', '',
  '', '', '',
  false, false
), (
  v_user_visor,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'visor@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'company_id', v_company_id::text, 'role', 'viewer'),
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
) VALUES
  (v_user_admin, v_user_admin,
   jsonb_build_object('sub', v_user_admin::text, 'email', 'admin@test.com'),
   'email', v_user_admin::text, now(), now(), now()),
  (v_user_gerente, v_user_gerente,
   jsonb_build_object('sub', v_user_gerente::text, 'email', 'gerente@test.com'),
   'email', v_user_gerente::text, now(), now(), now()),
  (v_user_supervisor, v_user_supervisor,
   jsonb_build_object('sub', v_user_supervisor::text, 'email', 'supervisor@test.com'),
   'email', v_user_supervisor::text, now(), now(), now()),
  (v_user_operador, v_user_operador,
   jsonb_build_object('sub', v_user_operador::text, 'email', 'operador@test.com'),
   'email', v_user_operador::text, now(), now(), now()),
  (v_user_visor, v_user_visor,
   jsonb_build_object('sub', v_user_visor::text, 'email', 'visor@test.com'),
   'email', v_user_visor::text, now(), now(), now());

-- =============================================================
-- 2. COMPANY
-- =============================================================
INSERT INTO companies (id, name, legal_id, country, timezone, currency, created_by, settings)
VALUES (
  v_company_id,
  'Alquemist Agroindustrial S.A.S.',
  'NIT-900123456-7',
  'CO',
  'America/Bogota',
  'COP',
  v_user_admin,
  jsonb_build_object(
    'regulatory_mode', 'standard',
    'regulatory_blocking_enabled', false,
    'features_enabled', jsonb_build_object(
      'quality', true,
      'regulatory', true,
      'iot', true,
      'field_app', true,
      'cost_tracking', true
    )
  )
);

-- =============================================================
-- 3. USER RECORDS
-- =============================================================
INSERT INTO users (id, company_id, email, full_name, phone, role, created_by) VALUES
  (v_user_admin,      v_company_id, 'admin@test.com',      'Carlos Administrador', '+573001234567', 'admin',      v_user_admin),
  (v_user_gerente,    v_company_id, 'gerente@test.com',    'Laura Gerente',        '+573002345678', 'manager',    v_user_admin),
  (v_user_supervisor, v_company_id, 'supervisor@test.com', 'Miguel Supervisor',    '+573003456789', 'supervisor', v_user_admin),
  (v_user_operador,   v_company_id, 'operador@test.com',   'Ana Operadora',        '+573004567890', 'operator',   v_user_admin),
  (v_user_visor,      v_company_id, 'visor@test.com',      'Pedro Visor',          '+573005678901', 'viewer',     v_user_admin);

-- =============================================================
-- 4. RESOURCE CATEGORIES
-- =============================================================
INSERT INTO resource_categories (id, company_id, code, name, is_consumable, is_transformable, default_lot_tracking) VALUES
  (v_cat_vegetal,   v_company_id, 'MAT_VEG',  'Material Vegetal',              true,  true,  'required'),
  (v_cat_quimicos,  v_company_id, 'QUIMICOS', 'Agroquimicos y Fertilizantes',  true,  false, 'required'),
  (v_cat_equipos,   v_company_id, 'EQUIPOS',  'Equipos y Herramientas',        false, false, 'none'),
  (v_cat_sustratos, v_company_id, 'SUSTRATO', 'Sustratos y Medios',            true,  false, 'optional'),
  (v_cat_semillas,  v_company_id, 'SEMILLAS', 'Semillas y Plantulas',          true,  false, 'required'),
  (v_cat_empaques,  v_company_id, 'EMPAQUES', 'Empaques y Empaque',            true,  false, 'optional');

-- =============================================================
-- 5. UNITS OF MEASURE
-- =============================================================
INSERT INTO units_of_measure (id, company_id, code, name, dimension, to_base_factor) VALUES
  (v_unit_g,      v_company_id, 'g',   'Gramos',      'mass',   1),
  (v_unit_kg,     v_company_id, 'kg',  'Kilogramos',  'mass',   1000),
  (v_unit_l,      v_company_id, 'L',   'Litros',      'volume', 1),
  (v_unit_ml,     v_company_id, 'ml',  'Mililitros',  'volume', 0.001),
  (v_unit_und,    v_company_id, 'und', 'Unidades',    'count',  1),
  (v_unit_ton,    v_company_id, 'ton', 'Toneladas',   'mass',   1000000),
  (v_unit_ha,     v_company_id, 'ha',  'Hectareas',   'area',   1),
  (v_unit_arroba, v_company_id, '@',   'Arrobas',     'mass',   12500);

UPDATE units_of_measure SET base_unit_id = v_unit_g WHERE id = v_unit_kg;
UPDATE units_of_measure SET base_unit_id = v_unit_l WHERE id = v_unit_ml;
UPDATE units_of_measure SET base_unit_id = v_unit_g WHERE id = v_unit_ton;
UPDATE units_of_measure SET base_unit_id = v_unit_g WHERE id = v_unit_arroba;

-- =============================================================
-- 6. ACTIVITY TYPES
-- =============================================================
INSERT INTO activity_types (id, company_id, name, category) VALUES
  (v_atype_riego,         v_company_id, 'Riego',                'mantenimiento'),
  (v_atype_fert,          v_company_id, 'Fertilizacion',        'nutricion'),
  (v_atype_poda,          v_company_id, 'Poda',                 'mantenimiento'),
  (v_atype_cosecha,       v_company_id, 'Cosecha',              'produccion'),
  (v_atype_inspeccion,    v_company_id, 'Inspeccion',           'control'),
  (v_atype_fitosanitario, v_company_id, 'Control Fitosanitario','control'),
  (v_atype_beneficio,     v_company_id, 'Beneficio',            'produccion'),
  (v_atype_polinizacion,  v_company_id, 'Polinizacion',         'produccion');

-- =============================================================
-- 7. CROP TYPES
-- =============================================================
INSERT INTO crop_types (id, company_id, code, name, scientific_name, category, regulatory_framework) VALUES
  (v_crop_cannabis, v_company_id, 'CANN',  'Cannabis Medicinal', 'Cannabis sativa L.',              'annual',    'Resolucion 227/2022 MinJusticia'),
  (v_crop_cafe,     v_company_id, 'CAFE',  'Cafe Arabica',       'Coffea arabica',                  'perennial', 'FNC / Res. ICA 30021/2017'),
  (v_crop_palma,    v_company_id, 'PALMA', 'Palma de Aceite',    'Elaeis guineensis Jacq.',         'perennial', 'Fedepalma / RSPO');

-- =============================================================
-- 8. PRODUCTION PHASES
-- =============================================================

-- Cannabis (7 phases)
INSERT INTO production_phases (id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, can_be_entry_point, can_be_exit_point) VALUES
  (v_pc_germ,     v_crop_cannabis, 'GERM',    'Germinacion',  1, 7,   false, true,  false),
  (v_pc_plantula, v_crop_cannabis, 'PLANT',   'Plantula',     2, 14,  false, false, false),
  (v_pc_veg,      v_crop_cannabis, 'VEG',     'Vegetativo',   3, 28,  false, false, false),
  (v_pc_flor,     v_crop_cannabis, 'FLOR',    'Floracion',    4, 63,  false, false, false),
  (v_pc_cosecha,  v_crop_cannabis, 'COSECHA', 'Cosecha',      5, 3,   true,  false, false),
  (v_pc_secado,   v_crop_cannabis, 'SECADO',  'Secado',       6, 14,  true,  false, false),
  (v_pc_curado,   v_crop_cannabis, 'CURADO',  'Curado',       7, 28,  true,  false, true);

-- Cafe (7 phases)
INSERT INTO production_phases (id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, can_be_entry_point, can_be_exit_point) VALUES
  (v_pf_almacigo,    v_crop_cafe, 'ALMACIGO', 'Almacigo',              1, 120, false, true,  false),
  (v_pf_levante,     v_crop_cafe, 'LEVANTE',  'Levante',               2, 365, false, false, false),
  (v_pf_floracion,   v_crop_cafe, 'FLORA_C',  'Floracion',             3, 30,  false, false, false),
  (v_pf_desarrollo,  v_crop_cafe, 'DESARRO',  'Desarrollo del Fruto',  4, 270, false, false, false),
  (v_pf_recoleccion, v_crop_cafe, 'RECOL',    'Recoleccion',           5, 60,  true,  false, false),
  (v_pf_beneficio,   v_crop_cafe, 'BENEF',    'Beneficio',             6, 5,   true,  false, false),
  (v_pf_secado_c,    v_crop_cafe, 'SECADO_C', 'Secado',               7, 15,  true,  false, true);

-- Palma (6 phases)
INSERT INTO production_phases (id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, can_be_entry_point, can_be_exit_point) VALUES
  (v_pp_previvero,  v_crop_palma, 'PREVIV',  'Previvero',          1, 90,   false, true,  false),
  (v_pp_vivero,     v_crop_palma, 'VIVERO',  'Vivero',             2, 300,  false, false, false),
  (v_pp_inmaduro,   v_crop_palma, 'INMAT',   'Inmaduro',           3, 730,  false, false, false),
  (v_pp_productivo, v_crop_palma, 'PRODUC',  'Productivo',         4, 3650, false, false, false),
  (v_pp_corte,      v_crop_palma, 'CORTE',   'Corte de Racimos',   5, 1,    true,  false, false),
  (v_pp_extraccion, v_crop_palma, 'EXTRAC',  'Extraccion',         6, 1,    true,  false, true);

-- Phase dependencies: Cannabis
UPDATE production_phases SET depends_on_phase_id = v_pc_germ     WHERE id = v_pc_plantula;
UPDATE production_phases SET depends_on_phase_id = v_pc_plantula WHERE id = v_pc_veg;
UPDATE production_phases SET depends_on_phase_id = v_pc_veg      WHERE id = v_pc_flor;
UPDATE production_phases SET depends_on_phase_id = v_pc_flor     WHERE id = v_pc_cosecha;
UPDATE production_phases SET depends_on_phase_id = v_pc_cosecha  WHERE id = v_pc_secado;
UPDATE production_phases SET depends_on_phase_id = v_pc_secado   WHERE id = v_pc_curado;

-- Phase dependencies: Cafe
UPDATE production_phases SET depends_on_phase_id = v_pf_almacigo    WHERE id = v_pf_levante;
UPDATE production_phases SET depends_on_phase_id = v_pf_levante     WHERE id = v_pf_floracion;
UPDATE production_phases SET depends_on_phase_id = v_pf_floracion   WHERE id = v_pf_desarrollo;
UPDATE production_phases SET depends_on_phase_id = v_pf_desarrollo  WHERE id = v_pf_recoleccion;
UPDATE production_phases SET depends_on_phase_id = v_pf_recoleccion WHERE id = v_pf_beneficio;
UPDATE production_phases SET depends_on_phase_id = v_pf_beneficio   WHERE id = v_pf_secado_c;

-- Phase dependencies: Palma
UPDATE production_phases SET depends_on_phase_id = v_pp_previvero  WHERE id = v_pp_vivero;
UPDATE production_phases SET depends_on_phase_id = v_pp_vivero     WHERE id = v_pp_inmaduro;
UPDATE production_phases SET depends_on_phase_id = v_pp_inmaduro   WHERE id = v_pp_productivo;
UPDATE production_phases SET depends_on_phase_id = v_pp_productivo WHERE id = v_pp_corte;
UPDATE production_phases SET depends_on_phase_id = v_pp_corte      WHERE id = v_pp_extraccion;

-- =============================================================
-- 9. CULTIVARS
-- =============================================================
INSERT INTO cultivars (id, crop_type_id, code, name, breeder, genetics, default_cycle_days, expected_yield_per_plant_g, expected_dry_ratio, quality_grade, density_plants_per_m2, phase_durations, target_profile, optimal_conditions)
VALUES
  -- Cannabis
  (v_cult_og_kush, v_crop_cannabis, 'OGK', 'OG Kush', 'DNA Genetics', 'Indica dominante (75/25)', 157, 450, 0.22,
   'Premium', 9,
   jsonb_build_object(v_pc_germ::text, 7, v_pc_plantula::text, 14, v_pc_veg::text, 28, v_pc_flor::text, 63, v_pc_cosecha::text, 3, v_pc_secado::text, 14, v_pc_curado::text, 28),
   jsonb_build_object('thc', '18-24%', 'cbd', '<1%', 'terpene_dominant', 'Myrcene'),
   jsonb_build_object('temp', jsonb_build_object('min', 20, 'max', 28, 'unit', '°C'), 'humidity', jsonb_build_object('min', 40, 'max', 60, 'unit', '%'))
  ),
  (v_cult_blue_d, v_crop_cannabis, 'BLD', 'Blue Dream', 'Humboldt Seeds', 'Sativa dominante (60/40)', 167, 550, 0.20,
   'AAA', 7,
   jsonb_build_object(v_pc_germ::text, 7, v_pc_plantula::text, 14, v_pc_veg::text, 35, v_pc_flor::text, 67, v_pc_cosecha::text, 3, v_pc_secado::text, 14, v_pc_curado::text, 27),
   jsonb_build_object('thc', '17-24%', 'cbd', '1-2%', 'terpene_dominant', 'Pinene'),
   NULL
  ),
  (v_cult_white_w, v_crop_cannabis, 'WWD', 'White Widow', 'Green House Seeds', 'Hibrido balanceado (50/50)', 148, 400, 0.23,
   'Premium', 8,
   jsonb_build_object(v_pc_germ::text, 7, v_pc_plantula::text, 12, v_pc_veg::text, 25, v_pc_flor::text, 60, v_pc_cosecha::text, 3, v_pc_secado::text, 14, v_pc_curado::text, 27),
   jsonb_build_object('thc', '18-25%', 'cbd', '<1%', 'terpene_dominant', 'Caryophyllene'),
   NULL
  ),
  -- Cafe
  (v_cult_castillo, v_crop_cafe, 'CAS', 'Castillo', 'Cenicafe', 'Variedad compuesta (resistente a roya)', 865, 1200, 0.18,
   'Especial', 0.5,
   jsonb_build_object(v_pf_almacigo::text, 120, v_pf_levante::text, 365, v_pf_floracion::text, 30, v_pf_desarrollo::text, 270, v_pf_recoleccion::text, 60, v_pf_beneficio::text, 5, v_pf_secado_c::text, 15),
   jsonb_build_object('cup_score', '80-84', 'acidity', 'medium-high', 'body', 'medium', 'aroma', 'chocolate-citrico'),
   jsonb_build_object('temp', jsonb_build_object('min', 18, 'max', 22, 'unit', '°C'), 'humidity', jsonb_build_object('min', 70, 'max', 80, 'unit', '%'), 'altitude', jsonb_build_object('min', 1400, 'max', 1800, 'unit', 'masl'))
  ),
  (v_cult_geisha, v_crop_cafe, 'GEI', 'Geisha', 'Hacienda La Esmeralda (adaptada Colombia)', 'Variedad Geisha/Gesha', 900, 800, 0.17,
   'Micro-lote', 0.4,
   jsonb_build_object(v_pf_almacigo::text, 120, v_pf_levante::text, 380, v_pf_floracion::text, 30, v_pf_desarrollo::text, 280, v_pf_recoleccion::text, 60, v_pf_beneficio::text, 5, v_pf_secado_c::text, 25),
   jsonb_build_object('cup_score', '85+', 'aroma', 'floral-jasmine-tropical'),
   jsonb_build_object('temp', jsonb_build_object('min', 17, 'max', 21, 'unit', '°C'), 'altitude', jsonb_build_object('min', 1600, 'max', 2000, 'unit', 'masl'))
  ),
  (v_cult_caturra, v_crop_cafe, 'CAT', 'Caturra', 'IBCR/Cenicafe', 'Mutacion Bourbon (porte bajo)', 830, 1000, 0.19,
   'Especial', 0.5,
   jsonb_build_object(v_pf_almacigo::text, 110, v_pf_levante::text, 350, v_pf_floracion::text, 30, v_pf_desarrollo::text, 260, v_pf_recoleccion::text, 60, v_pf_beneficio::text, 5, v_pf_secado_c::text, 15),
   jsonb_build_object('cup_score', '78-82', 'aroma', 'nutty-caramel'),
   jsonb_build_object('temp', jsonb_build_object('min', 19, 'max', 23, 'unit', '°C'), 'altitude', jsonb_build_object('min', 1200, 'max', 1700, 'unit', 'masl'))
  ),
  -- Palma
  (v_cult_tenera, v_crop_palma, 'TEN', 'Tenera DxP', 'Cenipalma/ASD', 'Dura x Pisifera', 1120, 25000, 0.22,
   'Standard', 0.0143,
   jsonb_build_object(v_pp_previvero::text, 90, v_pp_vivero::text, 300, v_pp_inmaduro::text, 730),
   jsonb_build_object('OER', '22-25%', 'FFA', '<5%', 'DOBI', '>2.5'),
   jsonb_build_object('temp', jsonb_build_object('min', 24, 'max', 32, 'unit', '°C'), 'humidity', jsonb_build_object('min', 75, 'max', 90, 'unit', '%'), 'rainfall', jsonb_build_object('min', 1800, 'max', 2500, 'unit', 'mm'))
  ),
  (v_cult_oxg, v_crop_palma, 'OXG', 'Coari x La Me OxG', 'Cenipalma', 'E. oleifera x E. guineensis', 1120, 18000, 0.18,
   'Premium', 0.0128,
   jsonb_build_object(v_pp_previvero::text, 90, v_pp_vivero::text, 300, v_pp_inmaduro::text, 730),
   jsonb_build_object('OER', '18-22%', 'carotene', 'high', 'FFA', '<3%'),
   jsonb_build_object('temp', jsonb_build_object('min', 24, 'max', 30, 'unit', '°C'))
  );

-- =============================================================
-- 10. PHASE PRODUCT FLOWS
-- =============================================================

-- Cannabis
INSERT INTO phase_product_flows (cultivar_id, phase_id, direction, product_role, product_category_id, expected_yield_pct, unit_id, is_required, sort_order) VALUES
  -- Cosecha: input planta viva, output flor humeda 70% + residuo 30%
  (v_cult_og_kush, v_pc_cosecha, 'input',  'primary', v_cat_vegetal, NULL, v_unit_g, true,  0),
  (v_cult_og_kush, v_pc_cosecha, 'output', 'primary', v_cat_vegetal, 70,  v_unit_g, true,  0),
  (v_cult_og_kush, v_pc_cosecha, 'output', 'waste',   v_cat_vegetal, 30,  v_unit_g, true,  1),
  -- Secado: input flor humeda, output flor seca 22%
  (v_cult_og_kush, v_pc_secado, 'input',  'primary', v_cat_vegetal, NULL, v_unit_g, true,  0),
  (v_cult_og_kush, v_pc_secado, 'output', 'primary', v_cat_vegetal, 22,  v_unit_g, true,  0),
  -- Curado: input flor seca, output curado 95%
  (v_cult_og_kush, v_pc_curado, 'input',  'primary', v_cat_vegetal, NULL, v_unit_g, true,  0),
  (v_cult_og_kush, v_pc_curado, 'output', 'primary', v_cat_vegetal, 95,  v_unit_g, true,  0);

-- Cafe
INSERT INTO phase_product_flows (cultivar_id, phase_id, direction, product_role, product_category_id, expected_yield_pct, unit_id, is_required, sort_order) VALUES
  -- Recoleccion: cereza → cafe lavado 60%
  (v_cult_castillo, v_pf_recoleccion, 'input',  'primary', v_cat_vegetal, NULL, v_unit_kg, true, 0),
  (v_cult_castillo, v_pf_recoleccion, 'output', 'primary', v_cat_vegetal, 60,  v_unit_kg, true, 0),
  -- Beneficio: cafe lavado → pergamino 50%
  (v_cult_castillo, v_pf_beneficio, 'input',  'primary', v_cat_vegetal, NULL, v_unit_kg, true, 0),
  (v_cult_castillo, v_pf_beneficio, 'output', 'primary', v_cat_vegetal, 50,  v_unit_kg, true, 0),
  -- Secado: pergamino humedo → pergamino seco 85%
  (v_cult_castillo, v_pf_secado_c, 'input',  'primary', v_cat_vegetal, NULL, v_unit_kg, true, 0),
  (v_cult_castillo, v_pf_secado_c, 'output', 'primary', v_cat_vegetal, 85,  v_unit_kg, true, 0);

-- Palma
INSERT INTO phase_product_flows (cultivar_id, phase_id, direction, product_role, product_category_id, expected_yield_pct, unit_id, is_required, sort_order) VALUES
  -- Corte: racimo entero 100%
  (v_cult_tenera, v_pp_corte, 'input',  'primary', v_cat_vegetal, NULL, v_unit_ton, true, 0),
  (v_cult_tenera, v_pp_corte, 'output', 'primary', v_cat_vegetal, 100, v_unit_ton, true, 0),
  -- Extraccion: aceite 22% + palmiste 5%
  (v_cult_tenera, v_pp_extraccion, 'input',  'primary',   v_cat_vegetal, NULL, v_unit_ton, true, 0),
  (v_cult_tenera, v_pp_extraccion, 'output', 'primary',   v_cat_vegetal, 22,  v_unit_ton, true, 0),
  (v_cult_tenera, v_pp_extraccion, 'output', 'byproduct', v_cat_vegetal, 5,   v_unit_ton, true, 1);

-- =============================================================
-- 11. ACTIVITY TEMPLATES
-- =============================================================

-- Cannabis templates
INSERT INTO activity_templates (id, company_id, code, activity_type_id, name, frequency, estimated_duration_min, trigger_day_from, trigger_day_to, triggers_transformation) VALUES
  (v_tmpl_riego_cann, v_company_id, 'RIEGO_CANN', v_atype_riego,      'Riego cannabis',        'daily',     30, 8,   157, false),
  (v_tmpl_fert_cann,  v_company_id, 'FERT_CANN',  v_atype_fert,       'Fertilizacion cannabis', 'weekly',   45, 15,  98,  false),
  (v_tmpl_insp_cann,  v_company_id, 'INSP_CANN',  v_atype_inspeccion, 'Inspeccion cannabis',    'daily',    20, 1,   157, false);

-- Cafe templates
INSERT INTO activity_templates (id, company_id, code, activity_type_id, name, frequency, estimated_duration_min, trigger_day_from, trigger_day_to, triggers_transformation) VALUES
  (v_tmpl_riego_cafe, v_company_id, 'RIEGO_CAFE', v_atype_riego,      'Riego cafe',              'weekly',    60,  1,   865, false),
  (v_tmpl_fert_cafe,  v_company_id, 'FERT_CAFE',  v_atype_fert,       'Fertilizacion cafe',      'biweekly', 120, 120, 785, false),
  (v_tmpl_insp_cafe,  v_company_id, 'INSP_CAFE',  v_atype_inspeccion, 'Inspeccion cafetal',      'weekly',    90,  1,  865, false),
  (v_tmpl_recol_cafe, v_company_id, 'RECOL_CAFE', v_atype_cosecha,    'Recoleccion selectiva',   'on_demand', 480, 786, 845, false);

-- Palma templates
INSERT INTO activity_templates (id, company_id, code, activity_type_id, name, frequency, estimated_duration_min, trigger_day_from, trigger_day_to, triggers_transformation) VALUES
  (v_tmpl_fert_palma,    v_company_id, 'FERT_PALMA',    v_atype_fert,       'Fertilizacion palma',  'biweekly',  180, 391,  4770, false),
  (v_tmpl_insp_palma,    v_company_id, 'INSP_PALMA',    v_atype_inspeccion, 'Inspeccion palma',     'weekly',    120, 1,    4770, false),
  (v_tmpl_cosecha_palma, v_company_id, 'COSECHA_PALMA', v_atype_cosecha,    'Corte de racimos',     'on_demand', 480, 1120, 4770, false);

-- Template phase associations: Cannabis
INSERT INTO activity_template_phases (template_id, phase_id) VALUES
  (v_tmpl_riego_cann, v_pc_plantula),
  (v_tmpl_riego_cann, v_pc_veg),
  (v_tmpl_riego_cann, v_pc_flor),
  (v_tmpl_fert_cann,  v_pc_veg),
  (v_tmpl_fert_cann,  v_pc_flor),
  (v_tmpl_insp_cann,  v_pc_germ),
  (v_tmpl_insp_cann,  v_pc_plantula),
  (v_tmpl_insp_cann,  v_pc_veg),
  (v_tmpl_insp_cann,  v_pc_flor),
  (v_tmpl_insp_cann,  v_pc_cosecha),
  (v_tmpl_insp_cann,  v_pc_secado),
  (v_tmpl_insp_cann,  v_pc_curado);

-- Template phase associations: Cafe
INSERT INTO activity_template_phases (template_id, phase_id) VALUES
  (v_tmpl_riego_cafe, v_pf_almacigo),
  (v_tmpl_riego_cafe, v_pf_levante),
  (v_tmpl_riego_cafe, v_pf_floracion),
  (v_tmpl_riego_cafe, v_pf_desarrollo),
  (v_tmpl_fert_cafe,  v_pf_levante),
  (v_tmpl_fert_cafe,  v_pf_floracion),
  (v_tmpl_fert_cafe,  v_pf_desarrollo),
  (v_tmpl_insp_cafe,  v_pf_almacigo),
  (v_tmpl_insp_cafe,  v_pf_levante),
  (v_tmpl_insp_cafe,  v_pf_floracion),
  (v_tmpl_insp_cafe,  v_pf_desarrollo),
  (v_tmpl_insp_cafe,  v_pf_recoleccion),
  (v_tmpl_insp_cafe,  v_pf_beneficio),
  (v_tmpl_insp_cafe,  v_pf_secado_c),
  (v_tmpl_recol_cafe, v_pf_recoleccion);

-- Template phase associations: Palma
INSERT INTO activity_template_phases (template_id, phase_id) VALUES
  (v_tmpl_fert_palma,    v_pp_inmaduro),
  (v_tmpl_fert_palma,    v_pp_productivo),
  (v_tmpl_insp_palma,    v_pp_previvero),
  (v_tmpl_insp_palma,    v_pp_vivero),
  (v_tmpl_insp_palma,    v_pp_inmaduro),
  (v_tmpl_insp_palma,    v_pp_productivo),
  (v_tmpl_insp_palma,    v_pp_corte),
  (v_tmpl_insp_palma,    v_pp_extraccion),
  (v_tmpl_cosecha_palma, v_pp_productivo);

-- Template resources
INSERT INTO activity_template_resources (template_id, quantity, quantity_basis, sort_order, notes) VALUES
  (v_tmpl_riego_cann, 2.5, 'per_plant', 0, 'Agua con pH 6.0-6.5'),
  (v_tmpl_fert_cann,  1.0, 'per_L_solution', 0, 'Flora Bloom/Grow/Micro segun fase'),
  (v_tmpl_riego_cafe, 5.0, 'per_plant', 0, 'Agua de riego'),
  (v_tmpl_fert_cafe,  50,  'per_plant', 0, 'g NPK por planta'),
  (v_tmpl_fert_palma, 2000, 'per_plant', 0, 'g KCl por palma');

-- Template checklist
INSERT INTO activity_template_checklist (template_id, step_order, instruction, is_critical, requires_photo) VALUES
  (v_tmpl_riego_cann, 1, 'Verificar pH del agua (6.0-6.5)',   true,  false),
  (v_tmpl_riego_cann, 2, 'Verificar EC del agua (1.2-1.8)',    true,  false),
  (v_tmpl_riego_cann, 3, 'Regar hasta 20% de runoff',          false, false),
  (v_tmpl_fert_cann,  1, 'Mezclar bien la solucion',           true,  false),
  (v_tmpl_fert_cann,  2, 'Aplicar en suelo humedo',            false, false),
  (v_tmpl_insp_cann,  1, 'Revisar color de hojas',             false, true),
  (v_tmpl_insp_cann,  2, 'Verificar presencia de plagas',      true,  true),
  (v_tmpl_insp_cann,  3, 'Medir temperatura y humedad',        true,  false),
  (v_tmpl_insp_cafe,  1, 'Revisar presencia de roya',          true,  true),
  (v_tmpl_insp_cafe,  2, 'Verificar incidencia de broca',      true,  true),
  (v_tmpl_insp_cafe,  3, 'Evaluar estado foliar general',      false, false),
  (v_tmpl_riego_cafe, 1, 'Verificar estado del sustrato',      false, false),
  (v_tmpl_riego_cafe, 2, 'Verificar drenaje',                  true,  false),
  (v_tmpl_fert_cafe,  1, 'Verificar dosis por planta',         true,  false),
  (v_tmpl_fert_cafe,  2, 'Aplicar metodo corona',              true,  false),
  (v_tmpl_recol_cafe, 1, 'Solo cereza madura, no verde',       true,  true),
  (v_tmpl_recol_cafe, 2, 'Registrar peso recolectado',         true,  false),
  (v_tmpl_fert_palma, 1, 'Corona limpia antes de aplicar',     true,  false),
  (v_tmpl_fert_palma, 2, 'Distribucion uniforme alrededor',    true,  false),
  (v_tmpl_insp_palma, 1, 'Revisar presencia de picudo',        true,  true),
  (v_tmpl_insp_palma, 2, 'Evaluar PC (pudricion de cogollo)',  true,  true),
  (v_tmpl_insp_palma, 3, 'Evaluar estado foliar',              false, false),
  (v_tmpl_cosecha_palma, 1, 'Verificar racimo maduro',         true,  true),
  (v_tmpl_cosecha_palma, 2, 'Chisel desinfectado',             true,  false),
  (v_tmpl_cosecha_palma, 3, 'Registrar peso',                  true,  false);

-- =============================================================
-- 12. CULTIVATION SCHEDULES
-- =============================================================
INSERT INTO cultivation_schedules (id, company_id, name, cultivar_id, total_days, phase_config)
VALUES
  (v_sched_og, v_company_id, 'OG Kush Standard 157d', v_cult_og_kush, 157,
   jsonb_build_array(
     jsonb_build_object('phase_id', v_pc_germ::text,     'duration_days', 7,  'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_insp_cann::text))),
     jsonb_build_object('phase_id', v_pc_plantula::text,  'duration_days', 14, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_riego_cann::text), jsonb_build_object('template_id', v_tmpl_insp_cann::text))),
     jsonb_build_object('phase_id', v_pc_veg::text,       'duration_days', 28, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_riego_cann::text), jsonb_build_object('template_id', v_tmpl_fert_cann::text), jsonb_build_object('template_id', v_tmpl_insp_cann::text))),
     jsonb_build_object('phase_id', v_pc_flor::text,      'duration_days', 63, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_riego_cann::text), jsonb_build_object('template_id', v_tmpl_fert_cann::text), jsonb_build_object('template_id', v_tmpl_insp_cann::text))),
     jsonb_build_object('phase_id', v_pc_cosecha::text,   'duration_days', 3,  'templates', '[]'::jsonb),
     jsonb_build_object('phase_id', v_pc_secado::text,    'duration_days', 14, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_insp_cann::text))),
     jsonb_build_object('phase_id', v_pc_curado::text,    'duration_days', 28, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_insp_cann::text)))
   )
  ),
  (v_sched_castillo, v_company_id, 'Castillo Ciclo Completo', v_cult_castillo, 865,
   jsonb_build_array(
     jsonb_build_object('phase_id', v_pf_almacigo::text,    'duration_days', 120, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_riego_cafe::text), jsonb_build_object('template_id', v_tmpl_insp_cafe::text))),
     jsonb_build_object('phase_id', v_pf_levante::text,     'duration_days', 365, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_riego_cafe::text), jsonb_build_object('template_id', v_tmpl_fert_cafe::text), jsonb_build_object('template_id', v_tmpl_insp_cafe::text))),
     jsonb_build_object('phase_id', v_pf_floracion::text,   'duration_days', 30,  'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_insp_cafe::text))),
     jsonb_build_object('phase_id', v_pf_desarrollo::text,  'duration_days', 270, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_fert_cafe::text), jsonb_build_object('template_id', v_tmpl_insp_cafe::text))),
     jsonb_build_object('phase_id', v_pf_recoleccion::text, 'duration_days', 60,  'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_recol_cafe::text))),
     jsonb_build_object('phase_id', v_pf_beneficio::text,   'duration_days', 5,   'templates', '[]'::jsonb),
     jsonb_build_object('phase_id', v_pf_secado_c::text,    'duration_days', 15,  'templates', '[]'::jsonb)
   )
  ),
  (v_sched_tenera, v_company_id, 'Tenera DxP Ciclo Vivero-Produccion', v_cult_tenera, 1120,
   jsonb_build_array(
     jsonb_build_object('phase_id', v_pp_previvero::text,  'duration_days', 90,  'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_insp_palma::text))),
     jsonb_build_object('phase_id', v_pp_vivero::text,     'duration_days', 300, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_insp_palma::text))),
     jsonb_build_object('phase_id', v_pp_inmaduro::text,   'duration_days', 730, 'templates', jsonb_build_array(jsonb_build_object('template_id', v_tmpl_fert_palma::text), jsonb_build_object('template_id', v_tmpl_insp_palma::text)))
   )
  );

-- =============================================================
-- 13. REGULATORY DOC TYPES
-- =============================================================
INSERT INTO regulatory_doc_types (id, company_id, code, name, description, category, valid_for_days, issuing_authority, sort_order, required_fields)
VALUES
  (v_rdt_coa, v_company_id, 'COA', 'Certificado de Analisis (CoA)',
   'Documento que certifica los resultados de analisis de laboratorio para un batch de producto.',
   'quality', 365, 'Lab acreditado', 0,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'lab_name',       'label', 'Nombre del laboratorio', 'type', 'text',     'required', true),
     jsonb_build_object('key', 'sample_date',    'label', 'Fecha de muestreo',      'type', 'date',     'required', true),
     jsonb_build_object('key', 'analysis_type',  'label', 'Tipo de analisis',       'type', 'select',   'required', true, 'options', jsonb_build_array('Potencia', 'Contaminantes', 'Residuos', 'Completo')),
     jsonb_build_object('key', 'overall_pass',   'label', 'Resultado aprobado?',    'type', 'boolean',  'required', true),
     jsonb_build_object('key', 'observations',   'label', 'Observaciones',          'type', 'textarea', 'required', false, 'placeholder', 'Notas adicionales sobre el analisis')
   ))
  ),
  (v_rdt_sds, v_company_id, 'SDS', 'Hoja de Seguridad (SDS)',
   'Safety Data Sheet para productos quimicos utilizados.',
   'safety', NULL, 'Fabricante', 1,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'manufacturer',  'label', 'Fabricante',         'type', 'text',   'required', true),
     jsonb_build_object('key', 'cas_number',    'label', 'Numero CAS',        'type', 'text',   'required', false, 'placeholder', 'Ej: 7732-18-5'),
     jsonb_build_object('key', 'hazard_class',  'label', 'Clase de peligro',  'type', 'select', 'required', true, 'options', jsonb_build_array('Inflamable', 'Corrosivo', 'Toxico', 'Irritante', 'No peligroso')),
     jsonb_build_object('key', 'revision_date', 'label', 'Fecha de revision', 'type', 'date',   'required', true)
   ))
  ),
  (v_rdt_phyto, v_company_id, 'PHYTO', 'Certificado Fitosanitario',
   'Documento que certifica que el material vegetal cumple con requisitos fitosanitarios para transporte.',
   'transport', 30, 'ICA', 2,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'inspector_name',  'label', 'Nombre del inspector', 'type', 'text',    'required', true),
     jsonb_build_object('key', 'inspection_date', 'label', 'Fecha de inspeccion',  'type', 'date',    'required', true),
     jsonb_build_object('key', 'destination',     'label', 'Destino',              'type', 'text',    'required', true, 'placeholder', 'Ciudad o departamento de destino'),
     jsonb_build_object('key', 'quantity_kg',     'label', 'Cantidad (kg)',        'type', 'number',  'required', true),
     jsonb_build_object('key', 'pest_free',       'label', 'Libre de plagas?',    'type', 'boolean', 'required', true)
   ))
  ),
  (v_rdt_fnc, v_company_id, 'FNC', 'Certificado FNC Exportacion',
   'Certificado de la Federacion Nacional de Cafeteros para exportacion de cafe.',
   'commercial', 180, 'FNC', 3,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'exporter_name',      'label', 'Nombre del exportador',  'type', 'text',   'required', true),
     jsonb_build_object('key', 'contract_number',    'label', 'Numero de contrato',     'type', 'text',   'required', true),
     jsonb_build_object('key', 'destination_country','label', 'Pais de destino',        'type', 'text',   'required', true),
     jsonb_build_object('key', 'quantity_kg',        'label', 'Cantidad (kg)',           'type', 'number', 'required', true),
     jsonb_build_object('key', 'cup_score',          'label', 'Puntaje de taza',        'type', 'number', 'required', true)
   ))
  ),
  (v_rdt_rspo, v_company_id, 'RSPO', 'Certificacion RSPO',
   'Certificacion de produccion sostenible de aceite de palma.',
   'compliance', 365, 'RSPO', 4,
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'certification_number', 'label', 'Numero de certificacion', 'type', 'text',   'required', true),
     jsonb_build_object('key', 'audit_date',           'label', 'Fecha de auditoria',      'type', 'date',   'required', true),
     jsonb_build_object('key', 'certification_scope',  'label', 'Alcance de certificacion','type', 'select', 'required', true, 'options', jsonb_build_array('Identity Preserved', 'Segregated', 'Mass Balance')),
     jsonb_build_object('key', 'next_audit_date',      'label', 'Proxima auditoria',       'type', 'date',   'required', true)
   ))
  );

-- =============================================================
-- 14. PRODUCT REGULATORY REQUIREMENTS (by category)
-- =============================================================
INSERT INTO product_regulatory_requirements (category_id, doc_type_id, is_mandatory, applies_to_scope, frequency, notes, sort_order) VALUES
  (v_cat_vegetal,  v_rdt_coa,   true,  'per_batch',   'per_production', 'CoA requerido para cada batch de produccion',                   0),
  (v_cat_vegetal,  v_rdt_phyto, true,  'per_product', 'per_shipment',   'Fitosanitario requerido para movilizacion de material vegetal', 1),
  (v_cat_quimicos, v_rdt_sds,   true,  'per_product', 'once',           'SDS del fabricante, se obtiene una vez',                        2),
  (v_cat_semillas, v_rdt_phyto, true,  'per_product', 'per_shipment',   'Fitosanitario requerido para envio de semillas',                3);

-- =============================================================
-- 15. SHIPMENT DOC REQUIREMENTS
-- =============================================================
INSERT INTO shipment_doc_requirements (category_id, doc_type_id, is_mandatory, applies_when, notes, sort_order) VALUES
  (v_cat_vegetal,  v_rdt_phyto, true,  'always',     'Siempre requerido para transporte de material vegetal', 0),
  (v_cat_quimicos, v_rdt_sds,   true,  'always',     'SDS debe acompanar envios de quimicos',                 1),
  (v_cat_vegetal,  v_rdt_coa,   false, 'interstate', 'CoA recomendado para envios interdepartamentales',      2),
  (v_cat_semillas, v_rdt_phyto, true,  'always',     'Fitosanitario requerido para semillas',                  3);

-- =============================================================
-- 16. FACILITIES
-- =============================================================
INSERT INTO facilities (company_id, name, type, total_footprint_m2, total_growing_area_m2, total_plant_capacity, address, latitude, longitude, is_active) VALUES
  (v_company_id, 'Nave Cannabis Indoor',         'indoor_warehouse', 2000,   1500,   12000, 'Km 5 Via Rionegro, Antioquia',              6.1534,  -75.3766, true),
  (v_company_id, 'Invernadero Propagacion',      'greenhouse',        800,    650,    8000, 'Km 5 Via Rionegro, Antioquia',              6.1540,  -75.3770, true),
  (v_company_id, 'Finca Cafetera La Esperanza',  'open_field',      65000,  65000,  32500, 'Vereda La Esperanza, Salgar, Antioquia',    5.9612,  -75.9834, true),
  (v_company_id, 'Beneficiadero Central',        'indoor_warehouse',  400,    200,       0, 'Vereda La Esperanza, Salgar, Antioquia',    5.9615,  -75.9830, true),
  (v_company_id, 'Plantacion Palma Magdalena',   'open_field',     250000, 250000,   3575, 'Km 40 Via Zona Bananera, Magdalena',       10.7667,  -74.1500, true),
  (v_company_id, 'Planta Extractora',            'indoor_warehouse', 2000,    500,       0, 'Km 40 Via Zona Bananera, Magdalena',       10.7670,  -74.1495, true);

-- =============================================================
-- 17. ZONES
-- =============================================================

-- Nave Cannabis Indoor
INSERT INTO zones (facility_id, name, purpose, environment, status, area_m2, plant_capacity) VALUES
  ((SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   'Vegetativo A', 'vegetation', 'indoor_controlled', 'active', 400, 3600),
  ((SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   'Vegetativo B', 'vegetation', 'indoor_controlled', 'active', 400, 3600),
  ((SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   'Floracion A', 'flowering', 'indoor_controlled', 'active', 350, 2450),
  ((SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   'Floracion B', 'flowering', 'indoor_controlled', 'maintenance', 350, 2450),
  ((SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   'Secado/Curado', 'drying', 'indoor_controlled', 'active', 250, 0),
  ((SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   'Almacen Cannabis', 'storage', 'indoor_controlled', 'active', 200, 0);

-- Invernadero Propagacion
INSERT INTO zones (facility_id, name, purpose, environment, status, area_m2, plant_capacity) VALUES
  ((SELECT id FROM facilities WHERE name = 'Invernadero Propagacion' AND company_id = v_company_id),
   'Propagacion Cannabis', 'propagation', 'greenhouse', 'active', 300, 3000),
  ((SELECT id FROM facilities WHERE name = 'Invernadero Propagacion' AND company_id = v_company_id),
   'Almacigo Cafe', 'propagation', 'greenhouse', 'active', 350, 5000);

-- Finca Cafetera La Esperanza
INSERT INTO zones (facility_id, name, purpose, environment, status, area_m2, plant_capacity) VALUES
  ((SELECT id FROM facilities WHERE name = 'Finca Cafetera La Esperanza' AND company_id = v_company_id),
   'Lote 1 Castillo', 'vegetation', 'open_field', 'active', 30000, 15000),
  ((SELECT id FROM facilities WHERE name = 'Finca Cafetera La Esperanza' AND company_id = v_company_id),
   'Lote 2 Geisha', 'vegetation', 'open_field', 'active', 15000, 6000),
  ((SELECT id FROM facilities WHERE name = 'Finca Cafetera La Esperanza' AND company_id = v_company_id),
   'Lote 3 Caturra', 'vegetation', 'open_field', 'active', 20000, 10000);

-- Beneficiadero Central
INSERT INTO zones (facility_id, name, purpose, environment, status, area_m2, plant_capacity) VALUES
  ((SELECT id FROM facilities WHERE name = 'Beneficiadero Central' AND company_id = v_company_id),
   'Despulpado y Fermentacion', 'processing', 'indoor_controlled', 'active', 100, 0),
  ((SELECT id FROM facilities WHERE name = 'Beneficiadero Central' AND company_id = v_company_id),
   'Secado Mecanico', 'drying', 'indoor_controlled', 'active', 80, 0),
  ((SELECT id FROM facilities WHERE name = 'Beneficiadero Central' AND company_id = v_company_id),
   'Bodega Pergamino', 'storage', 'indoor_controlled', 'active', 150, 0);

-- Plantacion Palma Magdalena
INSERT INTO zones (facility_id, name, purpose, environment, status, area_m2, plant_capacity) VALUES
  ((SELECT id FROM facilities WHERE name = 'Plantacion Palma Magdalena' AND company_id = v_company_id),
   'Lote A Tenera', 'vegetation', 'open_field', 'active', 150000, 2145),
  ((SELECT id FROM facilities WHERE name = 'Plantacion Palma Magdalena' AND company_id = v_company_id),
   'Lote B OxG', 'vegetation', 'open_field', 'active', 100000, 1280);

-- Planta Extractora
INSERT INTO zones (facility_id, name, purpose, environment, status, area_m2, plant_capacity) VALUES
  ((SELECT id FROM facilities WHERE name = 'Planta Extractora' AND company_id = v_company_id),
   'Recepcion Racimos', 'processing', 'indoor_controlled', 'active', 200, 0),
  ((SELECT id FROM facilities WHERE name = 'Planta Extractora' AND company_id = v_company_id),
   'Extraccion', 'processing', 'indoor_controlled', 'active', 200, 0),
  ((SELECT id FROM facilities WHERE name = 'Planta Extractora' AND company_id = v_company_id),
   'Almacen CPO', 'storage', 'indoor_controlled', 'active', 100, 0);

-- =============================================================
-- 18. ZONE STRUCTURES
-- =============================================================

-- Vegetativo A: 4 rolling benches
INSERT INTO zone_structures (zone_id, name, type, length_m, width_m, num_levels, positions_per_level) VALUES
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.name = 'Nave Cannabis Indoor'),
   'Bench A1', 'rolling_bench', 3.0, 1.2, 1, 30),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.name = 'Nave Cannabis Indoor'),
   'Bench A2', 'rolling_bench', 3.0, 1.2, 1, 30),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.name = 'Nave Cannabis Indoor'),
   'Bench A3', 'rolling_bench', 3.0, 1.2, 1, 30),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.name = 'Nave Cannabis Indoor'),
   'Bench A4', 'rolling_bench', 3.0, 1.2, 1, 30);

-- Floracion A: 3 mobile racks
INSERT INTO zone_structures (zone_id, name, type, length_m, width_m, num_levels, positions_per_level) VALUES
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.name = 'Nave Cannabis Indoor'),
   'Rack F1', 'mobile_rack', 4.0, 1.5, 2, 32),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.name = 'Nave Cannabis Indoor'),
   'Rack F2', 'mobile_rack', 4.0, 1.5, 2, 32),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.name = 'Nave Cannabis Indoor'),
   'Rack F3', 'mobile_rack', 4.0, 1.5, 2, 32);

-- Propagacion Cannabis: 2 fixed racks
INSERT INTO zone_structures (zone_id, name, type, length_m, width_m, num_levels, positions_per_level) VALUES
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis' AND f.name = 'Invernadero Propagacion'),
   'Rack P1', 'fixed_rack', 2.5, 1.0, 1, 30),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis' AND f.name = 'Invernadero Propagacion'),
   'Rack P2', 'fixed_rack', 2.5, 1.0, 1, 30);

-- Lote 1 Castillo: 3 rows
INSERT INTO zone_structures (zone_id, name, type, length_m, width_m, num_levels, positions_per_level) VALUES
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo' AND f.name = 'Finca Cafetera La Esperanza'),
   'Surco 1', 'row', 100, 0.5, 1, 500),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo' AND f.name = 'Finca Cafetera La Esperanza'),
   'Surco 2', 'row', 100, 0.5, 1, 500),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo' AND f.name = 'Finca Cafetera La Esperanza'),
   'Surco 3', 'row', 100, 0.5, 1, 500);

-- Lote A Tenera: 2 rows
INSERT INTO zone_structures (zone_id, name, type, length_m, width_m, num_levels, positions_per_level) VALUES
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera' AND f.name = 'Plantacion Palma Magdalena'),
   'Hilera A1', 'row', 200, 8, 1, 143),
  ((SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera' AND f.name = 'Plantacion Palma Magdalena'),
   'Hilera A2', 'row', 200, 8, 1, 143);

-- =============================================================
-- 19. SUPPLIERS
-- =============================================================
INSERT INTO suppliers (company_id, name, contact_info, payment_terms) VALUES
  (v_company_id, 'AgroSemillas Colombia',
   '{"contact_name": "Carlos Mendoza", "email": "carlos@agrosemillas.co", "phone": "+573001112233", "city": "Bogota", "country": "Colombia"}'::jsonb,
   '30 dias neto'),
  (v_company_id, 'NutriGrow Fertilizantes',
   '{"contact_name": "Laura Ruiz", "email": "ventas@nutrigrow.com", "phone": "+573004445566", "city": "Medellin", "country": "Colombia"}'::jsonb,
   'Contado'),
  (v_company_id, 'PlastiAgro',
   '{"contact_name": "Pedro Gomez", "email": "pedro@plastiagro.co", "phone": "+573002223344", "city": "Cali", "country": "Colombia"}'::jsonb,
   '15 dias neto'),
  (v_company_id, 'BioControl SAS',
   '{"contact_name": "Ana Maria Torres", "email": "ana@biocontrol.co", "phone": "+573005556677", "city": "Rionegro", "country": "Colombia", "notes": "Especialistas en control biologico de plagas"}'::jsonb,
   '30 dias neto'),
  (v_company_id, 'Vivero Cenicafe',
   '{"contact_name": "Dr. Fernando Ospina", "email": "fospina@cenicafe.org", "phone": "+576089900", "city": "Chinchina, Caldas", "country": "Colombia"}'::jsonb,
   '60 dias neto'),
  (v_company_id, 'Vivero Cenipalma',
   '{"contact_name": "Ing. Patricia Rios", "email": "prios@cenipalma.org", "phone": "+576206611", "city": "Barrancabermeja", "country": "Colombia"}'::jsonb,
   '90 dias neto'),
  (v_company_id, 'Lab Analitico del Valle',
   '{"contact_name": "Dr. Roberto Sanchez", "email": "rsanchez@labvalle.com", "phone": "+572334455", "city": "Cali", "country": "Colombia", "website": "https://labvalle.com"}'::jsonb,
   NULL);

-- =============================================================
-- 20. PRODUCTS
-- =============================================================
INSERT INTO products (company_id, sku, name, category_id, default_unit_id, cultivar_id, procurement_type, lot_tracking, preferred_supplier_id, default_price, price_currency, requires_regulatory_docs) VALUES
  -- Cannabis Seeds
  (v_company_id, 'SEM-OGK-FEM', 'Semilla OG Kush Feminizada', v_cat_semillas, v_unit_und, v_cult_og_kush, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'AgroSemillas Colombia' AND company_id = v_company_id),
   25000, 'COP', true),
  (v_company_id, 'SEM-BLD-FEM', 'Semilla Blue Dream Feminizada', v_cat_semillas, v_unit_und, v_cult_blue_d, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'AgroSemillas Colombia' AND company_id = v_company_id),
   28000, 'COP', true),
  (v_company_id, 'SEM-WWD-FEM', 'Semilla White Widow Feminizada', v_cat_semillas, v_unit_und, v_cult_white_w, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'AgroSemillas Colombia' AND company_id = v_company_id),
   22000, 'COP', true),
  -- Cannabis Fertilizers
  (v_company_id, 'FERT-FLORA-B', 'Flora Bloom 1L', v_cat_quimicos, v_unit_l, NULL, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
   85000, 'COP', true),
  (v_company_id, 'FERT-FLORA-G', 'Flora Grow 1L', v_cat_quimicos, v_unit_l, NULL, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
   82000, 'COP', true),
  (v_company_id, 'FERT-FLORA-M', 'Flora Micro 1L', v_cat_quimicos, v_unit_l, NULL, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
   88000, 'COP', false),
  -- Cannabis Bio
  (v_company_id, 'BIO-TRICHO', 'Trichoderma harzianum 500g', v_cat_quimicos, v_unit_g, NULL, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'BioControl SAS' AND company_id = v_company_id),
   120000, 'COP', false),
  -- Cannabis Output
  (v_company_id, 'FLOR-SECA', 'Flor Seca (generico)', v_cat_vegetal, v_unit_g, NULL, 'produced', 'required',
   NULL, NULL, NULL, true),
  -- Cafe Seedlings
  (v_company_id, 'PLAN-CAS', 'Plantula Castillo', v_cat_semillas, v_unit_und, v_cult_castillo, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'Vivero Cenicafe' AND company_id = v_company_id),
   1500, 'COP', true),
  (v_company_id, 'PLAN-GEI', 'Plantula Geisha', v_cat_semillas, v_unit_und, v_cult_geisha, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'Vivero Cenicafe' AND company_id = v_company_id),
   3500, 'COP', true),
  (v_company_id, 'PLAN-CAT', 'Plantula Caturra', v_cat_semillas, v_unit_und, v_cult_caturra, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'Vivero Cenicafe' AND company_id = v_company_id),
   1200, 'COP', true),
  -- Cafe Chemicals
  (v_company_id, 'FERT-NPK-17', 'NPK 17-6-18 25kg', v_cat_quimicos, v_unit_kg, NULL, 'purchased', 'optional',
   (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
   85000, 'COP', false),
  (v_company_id, 'FUNG-CUPRI', 'Fungicida Cuprico 1L', v_cat_quimicos, v_unit_l, NULL, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'BioControl SAS' AND company_id = v_company_id),
   45000, 'COP', true),
  -- Cafe Output
  (v_company_id, 'CAFE-PERG', 'Cafe Pergamino Seco', v_cat_vegetal, v_unit_kg, NULL, 'produced', 'required',
   NULL, NULL, NULL, true),
  -- Palma Seedlings
  (v_company_id, 'PLAN-TEN', 'Plantula Tenera DxP', v_cat_semillas, v_unit_und, v_cult_tenera, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'Vivero Cenipalma' AND company_id = v_company_id),
   15000, 'COP', true),
  (v_company_id, 'PLAN-OXG', 'Plantula OxG Hibrido', v_cat_semillas, v_unit_und, v_cult_oxg, 'purchased', 'required',
   (SELECT id FROM suppliers WHERE name = 'Vivero Cenipalma' AND company_id = v_company_id),
   25000, 'COP', true),
  -- Palma Chemicals
  (v_company_id, 'FERT-KCL', 'Cloruro de Potasio 50kg', v_cat_quimicos, v_unit_kg, NULL, 'purchased', 'optional',
   (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
   120000, 'COP', false),
  (v_company_id, 'FERT-BORAX', 'Borax 25kg', v_cat_quimicos, v_unit_kg, NULL, 'purchased', 'optional',
   (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
   65000, 'COP', false),
  -- Palma Outputs
  (v_company_id, 'PALMA-FFB', 'Racimo de Fruta Fresca (FFB)', v_cat_vegetal, v_unit_ton, NULL, 'produced', 'required',
   NULL, NULL, NULL, false),
  (v_company_id, 'PALMA-CPO', 'Aceite Crudo de Palma (CPO)', v_cat_vegetal, v_unit_ton, NULL, 'produced', 'required',
   NULL, NULL, NULL, true),
  -- Shared
  (v_company_id, 'SUST-COCO', 'Fibra de Coco 50L', v_cat_sustratos, v_unit_und, NULL, 'purchased', 'optional',
   (SELECT id FROM suppliers WHERE name = 'PlastiAgro' AND company_id = v_company_id),
   35000, 'COP', false);

-- =============================================================
-- 21. PRODUCT REGULATORY REQUIREMENTS (per product)
-- =============================================================
INSERT INTO product_regulatory_requirements (product_id, doc_type_id, is_mandatory, applies_to_scope, frequency, notes, sort_order) VALUES
  ((SELECT id FROM products WHERE sku = 'SEM-OGK-FEM'), v_rdt_phyto, true,  'per_product', 'per_shipment',   'Fitosanitario para cada envio de semillas', 0),
  ((SELECT id FROM products WHERE sku = 'SEM-OGK-FEM'), v_rdt_coa,   false, 'per_batch',   'per_production', 'CoA opcional para lotes de semilla',        1),
  ((SELECT id FROM products WHERE sku = 'FERT-FLORA-B'), v_rdt_sds,  true,  'per_product', 'once',           'SDS del fabricante requerido',              0),
  ((SELECT id FROM products WHERE sku = 'FERT-FLORA-G'), v_rdt_sds,  true,  'per_product', 'once',           'SDS del fabricante requerido',              0),
  ((SELECT id FROM products WHERE sku = 'FERT-FLORA-M'), v_rdt_sds,  true,  'per_product', 'once',           'SDS del fabricante requerido',              0),
  ((SELECT id FROM products WHERE sku = 'FLOR-SECA'),    v_rdt_coa,  true,  'per_batch',   'per_production', 'CoA obligatorio por batch',                 0),
  ((SELECT id FROM products WHERE sku = 'FUNG-CUPRI'),   v_rdt_sds,  true,  'per_product', 'once',           'SDS del fabricante requerido',              0),
  ((SELECT id FROM products WHERE sku = 'CAFE-PERG'),    v_rdt_fnc,  true,  'per_batch',   'per_production', 'FNC exportacion por batch',                 0),
  ((SELECT id FROM products WHERE sku = 'PALMA-CPO'),    v_rdt_rspo, true,  'per_facility','annual',         'RSPO certificacion anual',                  0);

-- =============================================================
-- 22. SHIPMENTS
-- =============================================================

-- SHP-2026-0001: Inbound, accepted. Seeds from AgroSemillas → Invernadero Propagacion
INSERT INTO shipments (
  company_id, shipment_code, type, status, supplier_id,
  destination_facility_id, carrier_name, carrier_vehicle, carrier_driver,
  dispatch_date, estimated_arrival_date, actual_arrival_date,
  transport_conditions, purchase_order_ref, received_by, notes
) VALUES (
  v_company_id, 'SHP-2026-0001', 'inbound', 'accepted',
  (SELECT id FROM suppliers WHERE name = 'AgroSemillas Colombia' AND company_id = v_company_id),
  (SELECT id FROM facilities WHERE name = 'Invernadero Propagacion' AND company_id = v_company_id),
  'Servientrega', 'ABC-123', 'Juan Rodriguez',
  now() - interval '5 days', now() - interval '3 days', now() - interval '3 days',
  '{"temperature_controlled": true, "temperature_range_c": "18-25", "packaging_type": "Caja refrigerada"}'::jsonb,
  'PO-2026-001', v_user_admin, 'Envio de semillas para ciclo Q1 2026'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, received_quantity, rejected_quantity, unit_id, supplier_lot_number, cost_per_unit, destination_zone_id, inspection_result, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0001'),
   (SELECT id FROM products WHERE sku = 'SEM-OGK-FEM'), 100, 98, 2, v_unit_und, 'LOT-AGS-2026-A1', 25000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   'accepted_with_observations', 0),
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0001'),
   (SELECT id FROM products WHERE sku = 'SEM-BLD-FEM'), 50, 50, 0, v_unit_und, 'LOT-AGS-2026-B1', 28000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   'accepted', 1);

-- SHP-2026-0002: Inbound, scheduled. Fertilizers from NutriGrow → Nave Cannabis Almacen
INSERT INTO shipments (
  company_id, shipment_code, type, status, supplier_id,
  destination_facility_id, estimated_arrival_date,
  purchase_order_ref, notes
) VALUES (
  v_company_id, 'SHP-2026-0002', 'inbound', 'scheduled',
  (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
  (SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
  now() + interval '5 days',
  'PO-2026-002', 'Restock trimestral de fertilizantes'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, unit_id, cost_per_unit, destination_zone_id, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0002'),
   (SELECT id FROM products WHERE sku = 'FERT-FLORA-B'), 12, v_unit_l, 85000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacen Cannabis'),
   0),
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0002'),
   (SELECT id FROM products WHERE sku = 'FERT-FLORA-G'), 12, v_unit_l, 82000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacen Cannabis'),
   1),
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0002'),
   (SELECT id FROM products WHERE sku = 'FERT-FLORA-M'), 12, v_unit_l, 88000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacen Cannabis'),
   2);

-- SHP-2026-0003: Inbound, in_transit. Coffee seedlings
INSERT INTO shipments (
  company_id, shipment_code, type, status, supplier_id,
  destination_facility_id, dispatch_date, estimated_arrival_date,
  carrier_name, purchase_order_ref
) VALUES (
  v_company_id, 'SHP-2026-0003', 'inbound', 'in_transit',
  (SELECT id FROM suppliers WHERE name = 'Vivero Cenicafe' AND company_id = v_company_id),
  (SELECT id FROM facilities WHERE name = 'Invernadero Propagacion' AND company_id = v_company_id),
  now() - interval '1 day', now() + interval '2 days',
  'TCC', 'PO-2026-003'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, unit_id, cost_per_unit, destination_zone_id, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0003'),
   (SELECT id FROM products WHERE sku = 'PLAN-CAS'), 500, v_unit_und, 1500,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe'),
   0),
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0003'),
   (SELECT id FROM products WHERE sku = 'PLAN-GEI'), 200, v_unit_und, 3500,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe'),
   1);

-- SHP-2026-0004: Inbound, inspecting (partial). NPK + KCl
INSERT INTO shipments (
  company_id, shipment_code, type, status, supplier_id,
  destination_facility_id, actual_arrival_date,
  received_by, purchase_order_ref, notes
) VALUES (
  v_company_id, 'SHP-2026-0004', 'inbound', 'inspecting',
  (SELECT id FROM suppliers WHERE name = 'NutriGrow Fertilizantes' AND company_id = v_company_id),
  (SELECT id FROM facilities WHERE name = 'Beneficiadero Central' AND company_id = v_company_id),
  now() - interval '1 day',
  v_user_admin, 'PO-2026-004', 'Partial inspection scenario'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, received_quantity, rejected_quantity, unit_id, supplier_lot_number, cost_per_unit, destination_zone_id, inspection_result, inspection_notes, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0004'),
   (SELECT id FROM products WHERE sku = 'FERT-NPK-17'), 10, 10, 0, v_unit_kg, 'LOT-NG-2026-NPK1', 85000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Bodega Pergamino'),
   'accepted', 'Buen estado, sin humedad', 0),
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0004'),
   (SELECT id FROM products WHERE sku = 'FERT-KCL'), 5, NULL, NULL, v_unit_kg, 'LOT-NG-2026-KCL1', 120000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Bodega Pergamino'),
   NULL, NULL, 1);

-- SHP-2026-0005: Inbound, inspecting, all rejected (contaminated Trichoderma)
INSERT INTO shipments (
  company_id, shipment_code, type, status, supplier_id,
  destination_facility_id, actual_arrival_date,
  received_by, inspected_by, inspected_at, purchase_order_ref
) VALUES (
  v_company_id, 'SHP-2026-0005', 'inbound', 'inspecting',
  (SELECT id FROM suppliers WHERE name = 'BioControl SAS' AND company_id = v_company_id),
  (SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
  now() - interval '2 days',
  v_user_admin, v_user_admin, now() - interval '2 days', 'PO-2026-005'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, received_quantity, rejected_quantity, unit_id, supplier_lot_number, cost_per_unit, inspection_result, inspection_notes, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0005'),
   (SELECT id FROM products WHERE sku = 'BIO-TRICHO'), 500, 0, 500, v_unit_g, 'LOT-BC-2026-T1', 120000,
   'rejected', 'Producto contaminado, olor anormal. Rechazado completamente.', 0);

-- SHP-2026-0006: Inbound, inspecting, quarantine (palm seedlings with possible pest)
INSERT INTO shipments (
  company_id, shipment_code, type, status, supplier_id,
  destination_facility_id, actual_arrival_date,
  received_by, inspected_by, inspected_at
) VALUES (
  v_company_id, 'SHP-2026-0006', 'inbound', 'inspecting',
  (SELECT id FROM suppliers WHERE name = 'Vivero Cenipalma' AND company_id = v_company_id),
  (SELECT id FROM facilities WHERE name = 'Plantacion Palma Magdalena' AND company_id = v_company_id),
  now() - interval '1 day',
  v_user_admin, v_user_admin, now() - interval '1 day'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, received_quantity, rejected_quantity, unit_id, supplier_lot_number, cost_per_unit, destination_zone_id, inspection_result, inspection_notes, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0006'),
   (SELECT id FROM products WHERE sku = 'PLAN-TEN'), 200, 200, 0, v_unit_und, 'LOT-CP-2026-T1', 15000,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera'),
   'quarantine', 'Plantulas con posible contaminacion de picudo. En cuarentena para analisis.', 0);

-- SHP-2026-0007: Outbound, scheduled. Coffee from Beneficiadero → destination
INSERT INTO shipments (
  company_id, shipment_code, type, status,
  origin_name, origin_address,
  destination_facility_id,
  carrier_name, carrier_vehicle, carrier_driver,
  dispatch_date, estimated_arrival_date,
  notes
) VALUES (
  v_company_id, 'SHP-2026-0007', 'outbound', 'scheduled',
  'Beneficiadero Central',
  'Vereda La Esperanza, Salgar, Antioquia',
  (SELECT id FROM facilities WHERE name = 'Beneficiadero Central' AND company_id = v_company_id),
  'Envios Express', 'XYZ-789', 'Maria Lopez',
  now() + interval '3 days', now() + interval '4 days',
  'Envio de cafe pergamino para exportacion'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, unit_id, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0007'),
   (SELECT id FROM products WHERE sku = 'CAFE-PERG'), 500, v_unit_kg, 0);

-- SHP-2026-0008: Inbound, cancelled. Substrates from PlastiAgro
INSERT INTO shipments (
  company_id, shipment_code, type, status, supplier_id,
  destination_facility_id,
  estimated_arrival_date,
  purchase_order_ref, notes
) VALUES (
  v_company_id, 'SHP-2026-0008', 'inbound', 'cancelled',
  (SELECT id FROM suppliers WHERE name = 'PlastiAgro' AND company_id = v_company_id),
  (SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
  now() - interval '10 days',
  'PO-2026-006', 'Cancelado por proveedor - producto agotado'
);

INSERT INTO shipment_items (shipment_id, product_id, expected_quantity, unit_id, cost_per_unit, sort_order)
VALUES
  ((SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0008'),
   (SELECT id FROM products WHERE sku = 'SUST-COCO'), 30, v_unit_und, 35000, 0);

-- =============================================================
-- 23. INVENTORY ITEMS
-- =============================================================

-- 1. 98 OGK seeds, Propagacion Cannabis, available (from SHP-0001)
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, supplier_lot_number, cost_per_unit, source_type, lot_status,
  shipment_item_id, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'SEM-OGK-FEM'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
  98, v_unit_und, 'SHP-2026-0001-1', 'LOT-AGS-2026-A1', 25000,
  'purchase', 'available',
  (SELECT si.id FROM shipment_items si JOIN shipments s ON s.id = si.shipment_id WHERE s.shipment_code = 'SHP-2026-0001' AND si.sort_order = 0),
  v_user_admin
);

-- 2. 50 BLD seeds, Propagacion Cannabis, available (from SHP-0001)
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, supplier_lot_number, cost_per_unit, source_type, lot_status,
  shipment_item_id, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'SEM-BLD-FEM'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
  50, v_unit_und, 'SHP-2026-0001-2', 'LOT-AGS-2026-B1', 28000,
  'purchase', 'available',
  (SELECT si.id FROM shipment_items si JOIN shipments s ON s.id = si.shipment_id WHERE s.shipment_code = 'SHP-2026-0001' AND si.sort_order = 1),
  v_user_admin
);

-- 3. 5L Flora Bloom, Almacen Cannabis, available (pre-existing)
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-FLORA-B'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacen Cannabis'),
  5, v_unit_l, 'INV-FLORA-B-001', 85000,
  'purchase', 'available', v_user_admin
);

-- 4. 3L Flora Grow, Almacen Cannabis, available
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-FLORA-G'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacen Cannabis'),
  3, v_unit_l, 'INV-FLORA-G-001', 82000,
  'purchase', 'available', v_user_admin
);

-- 5. 4L Flora Micro, Almacen Cannabis, available
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-FLORA-M'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacen Cannabis'),
  4, v_unit_l, 'INV-FLORA-M-001', 88000,
  'purchase', 'available', v_user_admin
);

-- 6. 0.5L Flora Bloom, Secado/Curado (low stock), available
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-FLORA-B'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
  0.5, v_unit_l, 'INV-FLORA-B-LOW', 85000,
  'purchase', 'available', v_user_admin
);

-- 7. 0 Flora Grow, Almacen Cannabis, depleted
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-FLORA-G'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacen Cannabis'),
  0, v_unit_l, 'INV-FLORA-G-DEPLETED', 82000,
  'purchase', 'depleted', v_user_admin
);

-- 8. 200 OGK seeds, Propagacion Cannabis, quarantine (from SHP-0006 mapping)
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, supplier_lot_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'PLAN-TEN'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera'),
  200, v_unit_und, 'INV-TEN-QUAR', 'LOT-CP-2026-T1', 15000,
  'purchase', 'quarantine', v_user_admin
);

-- 9. 10 bags NPK 25kg, Bodega Pergamino, available
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, supplier_lot_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-NPK-17'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Bodega Pergamino'),
  10, v_unit_kg, 'INV-NPK-001', 'LOT-NG-2026-NPK1', 85000,
  'purchase', 'available', v_user_admin
);

-- 10. 500 Castillo seedlings, Almacigo Cafe, available (pre-existing stock)
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'PLAN-CAS'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe'),
  500, v_unit_und, 'INV-CAS-001', 1500,
  'purchase', 'available', v_user_admin
);

-- 11. 1.5L Flora Micro, Secado/Curado, expired (14 days ago)
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, expiration_date, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-FLORA-M'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
  1.5, v_unit_l, 'INV-FLORA-M-EXP', 88000,
  (now() - interval '14 days')::date,
  'purchase', 'expired', v_user_admin
);

-- 12. 50kg Borax, Lote A Tenera, available (pre-existing)
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'FERT-BORAX'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera'),
  50, v_unit_kg, 'INV-BORAX-001', 65000,
  'purchase', 'available', v_user_admin
);

-- 13. 8 Coco substrate, Vegetativo A, available
INSERT INTO inventory_items (
  company_id, product_id, zone_id, quantity_available, unit_id,
  batch_number, cost_per_unit, source_type, lot_status, created_by
) VALUES (
  v_company_id,
  (SELECT id FROM products WHERE sku = 'SUST-COCO'),
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A'),
  8, v_unit_und, 'INV-COCO-001', 35000,
  'purchase', 'available', v_user_admin
);

-- =============================================================
-- 24. INVENTORY TRANSACTIONS — receipt for all items with qty > 0
-- =============================================================
INSERT INTO inventory_transactions (
  company_id, type, inventory_item_id, quantity, unit_id, zone_id, cost_per_unit, cost_total, user_id
)
SELECT
  v_company_id, 'receipt', ii.id, ii.quantity_available, ii.unit_id, ii.zone_id,
  ii.cost_per_unit, COALESCE(ii.cost_per_unit, 0) * ii.quantity_available, v_user_admin
FROM inventory_items ii
WHERE ii.company_id = v_company_id
  AND ii.quantity_available > 0;

-- Adjustment: +2 OGK seeds (physical count)
INSERT INTO inventory_transactions (
  company_id, type, inventory_item_id, quantity, unit_id, zone_id,
  cost_per_unit, cost_total, user_id, reason
)
SELECT
  v_company_id, 'adjustment', ii.id, 2, v_unit_und, ii.zone_id,
  ii.cost_per_unit, COALESCE(ii.cost_per_unit, 0) * 2, v_user_admin,
  'Conteo fisico 01/03/2026 — encontradas 2 unidades adicionales'
FROM inventory_items ii
WHERE ii.batch_number = 'SHP-2026-0001-1' AND ii.company_id = v_company_id;

-- Consumption: 0.5L Flora Bloom
INSERT INTO inventory_transactions (
  company_id, type, inventory_item_id, quantity, unit_id, zone_id,
  cost_per_unit, cost_total, user_id
)
SELECT
  v_company_id, 'consumption', ii.id, 0.5, v_unit_l, ii.zone_id,
  ii.cost_per_unit, COALESCE(ii.cost_per_unit, 0) * 0.5, v_user_admin
FROM inventory_items ii
WHERE ii.batch_number = 'INV-FLORA-B-001' AND ii.company_id = v_company_id;

-- Consumption: 0.3L Flora Grow
INSERT INTO inventory_transactions (
  company_id, type, inventory_item_id, quantity, unit_id, zone_id,
  cost_per_unit, cost_total, user_id
)
SELECT
  v_company_id, 'consumption', ii.id, 0.3, v_unit_l, ii.zone_id,
  ii.cost_per_unit, COALESCE(ii.cost_per_unit, 0) * 0.3, v_user_admin
FROM inventory_items ii
WHERE ii.batch_number = 'INV-FLORA-G-001' AND ii.company_id = v_company_id;

-- Application: 0.2L Flora Micro
INSERT INTO inventory_transactions (
  company_id, type, inventory_item_id, quantity, unit_id, zone_id,
  cost_per_unit, cost_total, user_id
)
SELECT
  v_company_id, 'application', ii.id, 0.2, v_unit_l, ii.zone_id,
  ii.cost_per_unit, COALESCE(ii.cost_per_unit, 0) * 0.2, v_user_admin
FROM inventory_items ii
WHERE ii.batch_number = 'INV-FLORA-M-001' AND ii.company_id = v_company_id;

-- Waste: 0.1L Flora Bloom (spill)
INSERT INTO inventory_transactions (
  company_id, type, inventory_item_id, quantity, unit_id, zone_id,
  cost_per_unit, cost_total, user_id, reason
)
SELECT
  v_company_id, 'waste', ii.id, 0.1, v_unit_l, ii.zone_id,
  ii.cost_per_unit, COALESCE(ii.cost_per_unit, 0) * 0.1, v_user_admin,
  'Derrame accidental durante preparacion de solucion'
FROM inventory_items ii
WHERE ii.batch_number = 'INV-FLORA-B-001' AND ii.company_id = v_company_id;

-- =============================================================
-- 25. RECIPES
-- =============================================================
INSERT INTO recipes (company_id, code, name, output_product_id, base_quantity, base_unit_id, items) VALUES
  (v_company_id, 'SOL-FLORA-1K', 'Solucion Flora Bloom 1000L',
   (SELECT id FROM products WHERE sku = 'FERT-FLORA-B'),
   1000, v_unit_l,
   jsonb_build_array(
     jsonb_build_object('product_id', (SELECT id FROM products WHERE sku = 'FERT-FLORA-B')::text, 'quantity', 3, 'unit_id', v_unit_l::text),
     jsonb_build_object('product_id', (SELECT id FROM products WHERE sku = 'FERT-FLORA-M')::text, 'quantity', 2, 'unit_id', v_unit_l::text)
   )),
  (v_company_id, 'SOL-GROW-1K', 'Solucion Flora Grow 1000L',
   (SELECT id FROM products WHERE sku = 'FERT-FLORA-G'),
   1000, v_unit_l,
   jsonb_build_array(
     jsonb_build_object('product_id', (SELECT id FROM products WHERE sku = 'FERT-FLORA-G')::text, 'quantity', 2.5, 'unit_id', v_unit_l::text),
     jsonb_build_object('product_id', (SELECT id FROM products WHERE sku = 'FERT-FLORA-M')::text, 'quantity', 1.5, 'unit_id', v_unit_l::text)
   )),
  (v_company_id, 'SOL-NPK-100', 'Solucion NPK 100L para cafe',
   (SELECT id FROM products WHERE sku = 'FERT-NPK-17'),
   100, v_unit_l,
   jsonb_build_array(
     jsonb_build_object('product_id', (SELECT id FROM products WHERE sku = 'FERT-NPK-17')::text, 'quantity', 5, 'unit_id', v_unit_kg::text)
   ));

-- Recipe execution for SOL-GROW-1K
INSERT INTO recipe_executions (
  company_id, recipe_id, executed_by, scale_factor,
  output_quantity_expected, output_quantity_actual, yield_pct
) VALUES (
  v_company_id,
  (SELECT id FROM recipes WHERE code = 'SOL-GROW-1K' AND company_id = v_company_id),
  v_user_admin, 0.5,
  500, 490, 98.00
);

-- =============================================================
-- 26. REGULATORY DOCUMENTS (non-batch — batch-linked docs deferred to 28b)
-- =============================================================

-- 1. Phyto for SHP-0001: valid
INSERT INTO regulatory_documents (
  company_id, doc_type_id, shipment_id,
  document_number, issue_date, expiry_date, status,
  field_data
) VALUES (
  v_company_id,
  v_rdt_phyto,
  (SELECT id FROM shipments WHERE shipment_code = 'SHP-2026-0001'),
  'PHYTO-ICA-2026-00145',
  CURRENT_DATE - interval '5 days',
  CURRENT_DATE + interval '25 days',
  'valid',
  jsonb_build_object(
    'inspector_name', 'Dr. Alejandro Vargas',
    'inspection_date', (CURRENT_DATE - interval '6 days')::text,
    'destination', 'Antioquia',
    'quantity_kg', 5.0,
    'pest_free', true
  )
);

-- 3. Expired phyto for Nave Cannabis facility
INSERT INTO regulatory_documents (
  company_id, doc_type_id, facility_id,
  document_number, issue_date, expiry_date, status, field_data,
  created_by, updated_by
) VALUES (
  v_company_id, v_rdt_phyto,
  (SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
  'PHYTO-ICA-2025-00098', CURRENT_DATE - interval '400 days', CURRENT_DATE - interval '35 days',
  'expired',
  jsonb_build_object(
    'inspector_name', 'Dr. Maria Lopez',
    'inspection_date', (CURRENT_DATE - interval '401 days')::text,
    'destination', 'Bogota',
    'pest_free', true
  ),
  v_user_admin, v_user_admin
);

-- 5. RSPO cert for Plantacion Palma facility: expired
INSERT INTO regulatory_documents (
  company_id, doc_type_id, facility_id,
  document_number, issue_date, expiry_date, status, field_data,
  created_by, updated_by
) VALUES (
  v_company_id, v_rdt_rspo,
  (SELECT id FROM facilities WHERE name = 'Plantacion Palma Magdalena' AND company_id = v_company_id),
  'RSPO-2025-CO-00456', CURRENT_DATE - interval '400 days', CURRENT_DATE - interval '35 days',
  'expired',
  jsonb_build_object(
    'certification_number', 'RSPO-CO-00456',
    'audit_date', (CURRENT_DATE - interval '410 days')::text,
    'certification_scope', 'Identity Preserved',
    'next_audit_date', (CURRENT_DATE - interval '35 days')::text
  ),
  v_user_admin, v_user_admin
);

-- =============================================================
-- 27. PRODUCTION ORDERS
-- =============================================================

-- Order 1: Cannabis OG Kush, in_progress, high priority, 100 seeds
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  initial_product_id,
  expected_output_quantity, expected_output_unit_id,
  zone_id, planned_start_date, planned_end_date,
  assigned_to, status, priority, notes
) VALUES (
  v_order_1, v_company_id, 'OP-2026-0001', v_cult_og_kush,
  v_pc_germ, v_pc_curado,
  100, v_unit_und,
  (SELECT id FROM products WHERE sku = 'SEM-OGK-FEM'),
  6930, v_unit_g,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
  CURRENT_DATE - interval '21 days',
  CURRENT_DATE + interval '136 days',
  v_user_admin, 'in_progress', 'high',
  'Ciclo completo OG Kush Q1 2026 — 100 semillas feminizadas'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, planned_start_date, planned_end_date) VALUES
  (v_order_1, v_pc_germ,     1, 7,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   100, 100, 100, CURRENT_DATE - interval '21 days', CURRENT_DATE - interval '14 days'),
  (v_order_1, v_pc_plantula, 2, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   100, 100, 100, CURRENT_DATE - interval '14 days', CURRENT_DATE),
  (v_order_1, v_pc_veg,      3, 28,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A'),
   100, 100, 100, CURRENT_DATE, CURRENT_DATE + interval '28 days'),
  (v_order_1, v_pc_flor,     4, 63,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A'),
   100, 100, 100, CURRENT_DATE + interval '28 days', CURRENT_DATE + interval '91 days'),
  (v_order_1, v_pc_cosecha,  5, 3,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   100, 70, 70,   CURRENT_DATE + interval '91 days', CURRENT_DATE + interval '94 days'),
  (v_order_1, v_pc_secado,   6, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   70, 15.4, 22,  CURRENT_DATE + interval '94 days', CURRENT_DATE + interval '108 days'),
  (v_order_1, v_pc_curado,   7, 28,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   15.4, 14.63, 95, CURRENT_DATE + interval '108 days', CURRENT_DATE + interval '136 days');

-- Order 2: Cannabis Blue Dream, draft, normal priority
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  planned_start_date, planned_end_date,
  status, priority, notes
) VALUES (
  v_order_2, v_company_id, 'OP-2026-0002', v_cult_blue_d,
  v_pc_germ, v_pc_curado,
  50, v_unit_und,
  CURRENT_DATE + interval '14 days',
  CURRENT_DATE + interval '181 days',
  'draft', 'normal',
  'Blue Dream batch prueba — 50 semillas'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, expected_input_qty, expected_output_qty, yield_pct, planned_start_date, planned_end_date) VALUES
  (v_order_2, v_pc_germ,     1, 7,  50, 50, 100, CURRENT_DATE + interval '14 days', CURRENT_DATE + interval '21 days'),
  (v_order_2, v_pc_plantula, 2, 14, 50, 50, 100, CURRENT_DATE + interval '21 days', CURRENT_DATE + interval '35 days'),
  (v_order_2, v_pc_veg,      3, 35, 50, 50, 100, CURRENT_DATE + interval '35 days', CURRENT_DATE + interval '70 days'),
  (v_order_2, v_pc_flor,     4, 67, 50, 50, 100, CURRENT_DATE + interval '70 days', CURRENT_DATE + interval '137 days'),
  (v_order_2, v_pc_cosecha,  5, 3,  50, 35, 70,  CURRENT_DATE + interval '137 days', CURRENT_DATE + interval '140 days'),
  (v_order_2, v_pc_secado,   6, 14, 35, 7.7, 22, CURRENT_DATE + interval '140 days', CURRENT_DATE + interval '154 days'),
  (v_order_2, v_pc_curado,   7, 27, 7.7, 7.3, 95, CURRENT_DATE + interval '154 days', CURRENT_DATE + interval '181 days');

-- Order 3: Coffee Castillo, in_progress, normal
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  zone_id, planned_start_date, planned_end_date,
  assigned_to, status, priority, notes
) VALUES (
  v_order_3, v_company_id, 'OP-2026-0003', v_cult_castillo,
  v_pf_almacigo, v_pf_secado_c,
  500, v_unit_und,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe'),
  CURRENT_DATE - interval '290 days',
  CURRENT_DATE + interval '575 days',
  v_user_supervisor, 'in_progress', 'normal',
  'Castillo ciclo completo — 500 plantulas Lote 1'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, planned_start_date, planned_end_date) VALUES
  (v_order_3, v_pf_almacigo,    1, 120,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe'),
   500, 500, 100, CURRENT_DATE - interval '290 days', CURRENT_DATE - interval '170 days'),
  (v_order_3, v_pf_levante,     2, 365,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo'),
   500, 500, 100, CURRENT_DATE - interval '170 days', CURRENT_DATE + interval '195 days'),
  (v_order_3, v_pf_floracion,   3, 30,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo'),
   500, 500, 100, CURRENT_DATE + interval '195 days', CURRENT_DATE + interval '225 days'),
  (v_order_3, v_pf_desarrollo,  4, 270,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo'),
   500, 500, 100, CURRENT_DATE + interval '225 days', CURRENT_DATE + interval '495 days'),
  (v_order_3, v_pf_recoleccion, 5, 60,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo'),
   500, 300, 60,  CURRENT_DATE + interval '495 days', CURRENT_DATE + interval '555 days'),
  (v_order_3, v_pf_beneficio,   6, 5,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Despulpado y Fermentacion'),
   300, 150, 50,  CURRENT_DATE + interval '555 days', CURRENT_DATE + interval '560 days'),
  (v_order_3, v_pf_secado_c,    7, 15,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado Mecanico'),
   150, 127.5, 85, CURRENT_DATE + interval '560 days', CURRENT_DATE + interval '575 days');

-- Order 4: Coffee Geisha, approved, high
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  zone_id, planned_start_date, planned_end_date,
  status, priority, notes
) VALUES (
  v_order_4, v_company_id, 'OP-2026-0004', v_cult_geisha,
  v_pf_almacigo, v_pf_secado_c,
  200, v_unit_und,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe'),
  CURRENT_DATE - interval '107 days',
  CURRENT_DATE + interval '793 days',
  'approved', 'high',
  'Geisha micro-lote — 200 plantulas para cafe de especialidad'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, planned_start_date, planned_end_date) VALUES
  (v_order_4, v_pf_almacigo,    1, 120,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe'),
   200, 200, 100, CURRENT_DATE - interval '107 days', CURRENT_DATE + interval '13 days'),
  (v_order_4, v_pf_levante,     2, 380,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 2 Geisha'),
   200, 200, 100, CURRENT_DATE + interval '13 days', CURRENT_DATE + interval '393 days'),
  (v_order_4, v_pf_floracion,   3, 30,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 2 Geisha'),
   200, 200, 100, CURRENT_DATE + interval '393 days', CURRENT_DATE + interval '423 days'),
  (v_order_4, v_pf_desarrollo,  4, 280,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 2 Geisha'),
   200, 200, 100, CURRENT_DATE + interval '423 days', CURRENT_DATE + interval '703 days'),
  (v_order_4, v_pf_recoleccion, 5, 60,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 2 Geisha'),
   200, 120, 60,  CURRENT_DATE + interval '703 days', CURRENT_DATE + interval '763 days'),
  (v_order_4, v_pf_beneficio,   6, 5,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Despulpado y Fermentacion'),
   120, 60, 50,   CURRENT_DATE + interval '763 days', CURRENT_DATE + interval '768 days'),
  (v_order_4, v_pf_secado_c,    7, 25,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado Mecanico'),
   60, 51, 85,    CURRENT_DATE + interval '768 days', CURRENT_DATE + interval '793 days');

-- Order 5: Palma Tenera, in_progress, normal
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  zone_id, planned_start_date, planned_end_date,
  assigned_to, status, priority, notes
) VALUES (
  v_order_5, v_company_id, 'OP-2026-0005', v_cult_tenera,
  v_pp_previvero, v_pp_extraccion,
  100, v_unit_und,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera'),
  CURRENT_DATE - interval '200 days',
  CURRENT_DATE + interval '920 days',
  v_user_gerente, 'in_progress', 'normal',
  'Tenera DxP ciclo vivero a produccion — 100 plantulas'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, planned_start_date, planned_end_date) VALUES
  (v_order_5, v_pp_previvero,  1, 90,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera'),
   100, 100, 100, CURRENT_DATE - interval '200 days', CURRENT_DATE - interval '110 days'),
  (v_order_5, v_pp_vivero,     2, 300,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera'),
   100, 100, 100, CURRENT_DATE - interval '110 days', CURRENT_DATE + interval '190 days'),
  (v_order_5, v_pp_inmaduro,   3, 730,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera'),
   100, 100, 100, CURRENT_DATE + interval '190 days', CURRENT_DATE + interval '920 days');

-- Order 6: Cannabis OG Kush, completed, normal, 80 seeds (partial cycle completed)
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  expected_output_quantity, expected_output_unit_id,
  planned_start_date, planned_end_date,
  status, priority, notes
) VALUES (
  v_order_6, v_company_id, 'OP-2026-0006', v_cult_og_kush,
  v_pc_cosecha, v_pc_curado,
  80, v_unit_g,
  12320, v_unit_g,
  CURRENT_DATE - interval '130 days',
  CURRENT_DATE - interval '85 days',
  'completed', 'normal',
  'Cosecha de lote anterior — ciclo COSECHA a CURADO completado'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date) VALUES
  (v_order_6, v_pc_cosecha, 1, 3,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   80, 56, 70, 'completed', CURRENT_DATE - interval '130 days', CURRENT_DATE - interval '127 days', CURRENT_DATE - interval '130 days', CURRENT_DATE - interval '127 days'),
  (v_order_6, v_pc_secado,  2, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   56, 12.3, 22, 'completed', CURRENT_DATE - interval '127 days', CURRENT_DATE - interval '113 days', CURRENT_DATE - interval '127 days', CURRENT_DATE - interval '113 days'),
  (v_order_6, v_pc_curado,  3, 28,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   12.3, 11.7, 95, 'completed', CURRENT_DATE - interval '113 days', CURRENT_DATE - interval '85 days', CURRENT_DATE - interval '113 days', CURRENT_DATE - interval '85 days');

-- Order 7: Coffee Caturra, cancelled, low
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  planned_start_date, planned_end_date,
  status, priority, notes
) VALUES (
  v_order_7, v_company_id, 'OP-2026-0007', v_cult_caturra,
  v_pf_almacigo, v_pf_secado_c,
  300, v_unit_und,
  CURRENT_DATE - interval '60 days',
  CURRENT_DATE + interval '770 days',
  'cancelled', 'low',
  'Caturra ciclo completo — cancelado por reasignacion de recursos'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, expected_input_qty, expected_output_qty, yield_pct, status, planned_start_date, planned_end_date) VALUES
  (v_order_7, v_pf_almacigo,    1, 110, 300, 300, 100, 'skipped', CURRENT_DATE - interval '60 days', CURRENT_DATE + interval '50 days'),
  (v_order_7, v_pf_levante,     2, 350, 300, 300, 100, 'skipped', CURRENT_DATE + interval '50 days', CURRENT_DATE + interval '400 days'),
  (v_order_7, v_pf_floracion,   3, 30,  300, 300, 100, 'skipped', CURRENT_DATE + interval '400 days', CURRENT_DATE + interval '430 days'),
  (v_order_7, v_pf_desarrollo,  4, 260, 300, 300, 100, 'skipped', CURRENT_DATE + interval '430 days', CURRENT_DATE + interval '690 days'),
  (v_order_7, v_pf_recoleccion, 5, 60,  300, 180, 60,  'skipped', CURRENT_DATE + interval '690 days', CURRENT_DATE + interval '750 days'),
  (v_order_7, v_pf_beneficio,   6, 5,   180, 90,  50,  'skipped', CURRENT_DATE + interval '750 days', CURRENT_DATE + interval '755 days'),
  (v_order_7, v_pf_secado_c,    7, 15,  90, 76.5, 85,  'skipped', CURRENT_DATE + interval '755 days', CURRENT_DATE + interval '770 days');

-- Order 8: Cannabis Blue Dream, COMPLETED - ciclo completo con yields
-- Shows a fully completed cannabis production cycle from germination to curing
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  expected_output_quantity, expected_output_unit_id,
  zone_id, planned_start_date, planned_end_date,
  assigned_to, status, priority, notes
) VALUES (
  v_order_8, v_company_id, 'OP-2025-0008', v_cult_blue_d,
  v_pc_germ, v_pc_curado,
  150, v_unit_und,
  18540, v_unit_g,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
  CURRENT_DATE - interval '180 days',
  CURRENT_DATE - interval '23 days',
  v_user_supervisor, 'completed', 'high',
  'Blue Dream premium — ciclo completo exitoso, rendimiento excepcional'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date) VALUES
  (v_order_8, v_pc_germ,     1, 7,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   150, 142, 95, 'completed', CURRENT_DATE - interval '180 days', CURRENT_DATE - interval '173 days', CURRENT_DATE - interval '180 days', CURRENT_DATE - interval '174 days'),
  (v_order_8, v_pc_plantula, 2, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   142, 138, 97, 'completed', CURRENT_DATE - interval '173 days', CURRENT_DATE - interval '159 days', CURRENT_DATE - interval '174 days', CURRENT_DATE - interval '160 days'),
  (v_order_8, v_pc_veg,      3, 35,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo B'),
   138, 135, 98, 'completed', CURRENT_DATE - interval '159 days', CURRENT_DATE - interval '124 days', CURRENT_DATE - interval '160 days', CURRENT_DATE - interval '122 days'),
  (v_order_8, v_pc_flor,     4, 63,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A'),
   135, 135, 100, 'completed', CURRENT_DATE - interval '124 days', CURRENT_DATE - interval '61 days', CURRENT_DATE - interval '122 days', CURRENT_DATE - interval '58 days'),
  (v_order_8, v_pc_cosecha,  5, 3,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   135, 94.5, 70, 'completed', CURRENT_DATE - interval '61 days', CURRENT_DATE - interval '58 days', CURRENT_DATE - interval '58 days', CURRENT_DATE - interval '55 days'),
  (v_order_8, v_pc_secado,   6, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   94.5, 20.8, 22, 'completed', CURRENT_DATE - interval '58 days', CURRENT_DATE - interval '44 days', CURRENT_DATE - interval '55 days', CURRENT_DATE - interval '41 days'),
  (v_order_8, v_pc_curado,   7, 21,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   20.8, 18.5, 89, 'completed', CURRENT_DATE - interval '44 days', CURRENT_DATE - interval '23 days', CURRENT_DATE - interval '41 days', CURRENT_DATE - interval '20 days');

-- Order 9: Cannabis White Widow, IN_PROGRESS - 70% completado (en floración)
-- Shows mid-cycle order with mixed phase statuses
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  expected_output_quantity, expected_output_unit_id,
  zone_id, planned_start_date, planned_end_date,
  assigned_to, status, priority, notes
) VALUES (
  v_order_9, v_company_id, 'OP-2026-0009', v_cult_white_w,
  v_pc_germ, v_pc_curado,
  80, v_unit_und,
  9856, v_unit_g,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
  CURRENT_DATE - interval '95 days',
  CURRENT_DATE + interval '62 days',
  v_user_operador, 'in_progress', 'normal',
  'White Widow — lote medicinal, seguimiento estricto de calidad'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date) VALUES
  (v_order_9, v_pc_germ,     1, 7,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   80, 76, 95, 'completed', CURRENT_DATE - interval '95 days', CURRENT_DATE - interval '88 days', CURRENT_DATE - interval '95 days', CURRENT_DATE - interval '89 days'),
  (v_order_9, v_pc_plantula, 2, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   76, 74, 97, 'completed', CURRENT_DATE - interval '88 days', CURRENT_DATE - interval '74 days', CURRENT_DATE - interval '89 days', CURRENT_DATE - interval '75 days'),
  (v_order_9, v_pc_veg,      3, 35,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A'),
   74, 72, 97, 'completed', CURRENT_DATE - interval '74 days', CURRENT_DATE - interval '39 days', CURRENT_DATE - interval '75 days', CURRENT_DATE - interval '38 days'),
  (v_order_9, v_pc_flor,     4, 56,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion B'),
   72, 72, 100, 'in_progress', CURRENT_DATE - interval '39 days', CURRENT_DATE + interval '17 days', CURRENT_DATE - interval '38 days', NULL),
  (v_order_9, v_pc_cosecha,  5, 3,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   72, 50.4, 70, 'pending', CURRENT_DATE + interval '17 days', CURRENT_DATE + interval '20 days', NULL, NULL),
  (v_order_9, v_pc_secado,   6, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   50.4, 11.1, 22, 'pending', CURRENT_DATE + interval '20 days', CURRENT_DATE + interval '34 days', NULL, NULL),
  (v_order_9, v_pc_curado,   7, 28,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   11.1, 9.9, 89, 'pending', CURRENT_DATE + interval '34 days', CURRENT_DATE + interval '62 days', NULL, NULL);

-- Order 10: Cannabis OG Kush, IN_PROGRESS - 30% completado (en vegetativo temprano)
-- Shows early-stage order for comparison
INSERT INTO production_orders (
  id, company_id, code, cultivar_id,
  entry_phase_id, exit_phase_id,
  initial_quantity, initial_unit_id,
  expected_output_quantity, expected_output_unit_id,
  zone_id, planned_start_date, planned_end_date,
  assigned_to, status, priority, notes
) VALUES (
  v_order_10, v_company_id, 'OP-2026-0010', v_cult_og_kush,
  v_pc_germ, v_pc_curado,
  200, v_unit_und,
  24640, v_unit_g,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
  CURRENT_DATE - interval '28 days',
  CURRENT_DATE + interval '129 days',
  v_user_gerente, 'in_progress', 'urgent',
  'OG Kush premium — pedido urgente cliente mayorista'
);

INSERT INTO production_order_phases (order_id, phase_id, sort_order, planned_duration_days, zone_id, expected_input_qty, expected_output_qty, yield_pct, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date) VALUES
  (v_order_10, v_pc_germ,     1, 7,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   200, 190, 95, 'completed', CURRENT_DATE - interval '28 days', CURRENT_DATE - interval '21 days', CURRENT_DATE - interval '28 days', CURRENT_DATE - interval '22 days'),
  (v_order_10, v_pc_plantula, 2, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis'),
   190, 186, 98, 'completed', CURRENT_DATE - interval '21 days', CURRENT_DATE - interval '7 days', CURRENT_DATE - interval '22 days', CURRENT_DATE - interval '8 days'),
  (v_order_10, v_pc_veg,      3, 35,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo B'),
   186, 182, 98, 'in_progress', CURRENT_DATE - interval '7 days', CURRENT_DATE + interval '28 days', CURRENT_DATE - interval '8 days', NULL),
  (v_order_10, v_pc_flor,     4, 56,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A'),
   182, 182, 100, 'pending', CURRENT_DATE + interval '28 days', CURRENT_DATE + interval '84 days', NULL, NULL),
  (v_order_10, v_pc_cosecha,  5, 3,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   182, 127.4, 70, 'pending', CURRENT_DATE + interval '84 days', CURRENT_DATE + interval '87 days', NULL, NULL),
  (v_order_10, v_pc_secado,   6, 14,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   127.4, 28.0, 22, 'pending', CURRENT_DATE + interval '87 days', CURRENT_DATE + interval '101 days', NULL, NULL),
  (v_order_10, v_pc_curado,   7, 28,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado'),
   28.0, 24.6, 88, 'pending', CURRENT_DATE + interval '101 days', CURRENT_DATE + interval '129 days', NULL, NULL);

-- =============================================================
-- 28. BATCHES
-- =============================================================

-- Batch 1: Cannabis OG Kush, Vegetativo A, active, 100 plants, started 21d ago
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_1, 'LOT-OGK-260115-001', v_cult_og_kush,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.company_id = v_company_id),
  v_pc_veg, v_order_1,
  100, CURRENT_DATE - interval '21 days', CURRENT_DATE + interval '136 days',
  'active', v_user_admin, v_user_admin
);

-- Update order 1 phases: germ+plantula completed, veg in_progress
UPDATE production_order_phases
SET status = 'completed', batch_id = v_batch_1,
    actual_start_date = CURRENT_DATE - interval '35 days',
    actual_end_date = CURRENT_DATE - interval '28 days'
WHERE order_id = v_order_1 AND phase_id = v_pc_germ;

UPDATE production_order_phases
SET status = 'completed', batch_id = v_batch_1,
    actual_start_date = CURRENT_DATE - interval '28 days',
    actual_end_date = CURRENT_DATE - interval '14 days'
WHERE order_id = v_order_1 AND phase_id = v_pc_plantula;

UPDATE production_order_phases
SET status = 'in_progress', batch_id = v_batch_1,
    actual_start_date = CURRENT_DATE - interval '14 days'
WHERE order_id = v_order_1 AND phase_id = v_pc_veg;

-- Batch 2: Cannabis Blue Dream, Floracion A, active, 50 plants, started 56d ago
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_2, 'LOT-BLD-260201-001', v_cult_blue_d,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
  v_pc_flor,
  50, CURRENT_DATE - interval '56 days', CURRENT_DATE + interval '111 days',
  'active', v_user_admin, v_user_admin
);

-- Batch 3: Cannabis White Widow, Secado/Curado, active, 40 plants, started 70d ago
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_3, 'LOT-WWD-260110-001', v_cult_white_w,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado' AND f.company_id = v_company_id),
  v_pc_secado,
  40, CURRENT_DATE - interval '70 days', CURRENT_DATE + interval '78 days',
  'active', v_user_admin, v_user_admin
);

-- Batch 4: Coffee Castillo, Lote 1 Castillo, levante, active, 500 plants, started 290d ago
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_4, 'LOT-CAS-250601-001', v_cult_castillo,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo' AND f.company_id = v_company_id),
  v_pf_levante, v_order_3,
  500, CURRENT_DATE - interval '290 days', CURRENT_DATE + interval '575 days',
  'active', v_user_admin, v_user_admin
);

-- Update order 3 phases
UPDATE production_order_phases
SET status = 'completed', batch_id = v_batch_4,
    actual_start_date = CURRENT_DATE - interval '290 days',
    actual_end_date = CURRENT_DATE - interval '170 days'
WHERE order_id = v_order_3 AND phase_id = v_pf_almacigo;

UPDATE production_order_phases
SET status = 'in_progress', batch_id = v_batch_4,
    actual_start_date = CURRENT_DATE - interval '170 days'
WHERE order_id = v_order_3 AND phase_id = v_pf_levante;

-- Batch 5: Coffee Geisha, Almacigo Cafe, almacigo, active, 200 plants, started 107d ago
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_5, 'LOT-GEI-251201-001', v_cult_geisha,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Almacigo Cafe' AND f.company_id = v_company_id),
  v_pf_almacigo, v_order_4,
  200, CURRENT_DATE - interval '107 days', CURRENT_DATE + interval '793 days',
  'active', v_user_admin, v_user_admin
);

-- Update order 4 first phase
UPDATE production_order_phases
SET status = 'in_progress', batch_id = v_batch_5,
    actual_start_date = CURRENT_DATE - interval '107 days'
WHERE order_id = v_order_4 AND phase_id = v_pf_almacigo;

-- Batch 6: Coffee Caturra, Lote 3 Caturra, recoleccion, active, 10000 plants, started 750d ago
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_6, 'LOT-CAT-250301-001', v_cult_caturra,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 3 Caturra' AND f.company_id = v_company_id),
  v_pf_recoleccion,
  10000, CURRENT_DATE - interval '750 days', CURRENT_DATE + interval '80 days',
  'active', v_user_admin, v_user_admin
);

-- Batch 7: Palma Tenera, Lote A Tenera, vivero, active, 100 plants, started 200d ago
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_7, 'LOT-TEN-250601-001', v_cult_tenera,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera' AND f.company_id = v_company_id),
  v_pp_vivero, v_order_5,
  100, CURRENT_DATE - interval '200 days', CURRENT_DATE + interval '920 days',
  'active', v_user_admin, v_user_admin
);

-- Update order 5 phases
UPDATE production_order_phases
SET status = 'completed', batch_id = v_batch_7,
    actual_start_date = CURRENT_DATE - interval '200 days',
    actual_end_date = CURRENT_DATE - interval '110 days'
WHERE order_id = v_order_5 AND phase_id = v_pp_previvero;

UPDATE production_order_phases
SET status = 'in_progress', batch_id = v_batch_7,
    actual_start_date = CURRENT_DATE - interval '110 days'
WHERE order_id = v_order_5 AND phase_id = v_pp_vivero;

-- Batch 8: Cannabis OG Kush, Secado/Curado, curado, completed, 80 plants
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status,
  yield_wet_kg, yield_dry_kg, total_cost, created_by, updated_by
) VALUES (
  v_batch_8, 'LOT-OGK-251101-001', v_cult_og_kush,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado' AND f.company_id = v_company_id),
  v_pc_curado, v_order_6,
  80, CURRENT_DATE - interval '130 days', CURRENT_DATE - interval '85 days',
  'completed',
  56.0, 12.3, 4500.00, v_user_admin, v_user_admin
);

-- Link order 6 phases to batch 8
UPDATE production_order_phases SET batch_id = v_batch_8 WHERE order_id = v_order_6;

-- Batch 9: Coffee Castillo, Secado Mecanico, secado_c, on_hold, 300 plants
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, status, created_by, updated_by
) VALUES (
  v_batch_9, 'LOT-CAS-240601-001', v_cult_castillo,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado Mecanico' AND f.company_id = v_company_id),
  v_pf_secado_c,
  300, CURRENT_DATE - interval '650 days',
  'on_hold', v_user_admin, v_user_admin
);

-- Batch 10: Cannabis OG Kush, phase_transition (plantula->vegetativo), 30 plants
-- Shows zone change in progress for dashboard variety
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_10, 'LOT-OGK-260320-001', v_cult_og_kush,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis' AND f.company_id = v_company_id),
  v_pc_plantula,
  30, CURRENT_DATE - interval '18 days', CURRENT_DATE + interval '139 days',
  'phase_transition', v_user_admin, v_user_admin
);

-- Batch 11: Cannabis Blue Dream, germinacion phase, active, 60 plants
-- New order starting, fills germinacion column in kanban
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_11, 'LOT-BLD-260405-001', v_cult_blue_d,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis' AND f.company_id = v_company_id),
  v_pc_germ,
  60, CURRENT_DATE - interval '4 days', CURRENT_DATE + interval '153 days',
  'active', v_user_admin, v_user_admin
);

-- Batch 12: Cannabis OG Kush, floracion phase, active, 45 plants
-- Fills floracion column with more variety
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_12, 'LOT-OGK-260201-001', v_cult_og_kush,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
  v_pc_flor,
  45, CURRENT_DATE - interval '67 days', CURRENT_DATE + interval '90 days',
  'active', v_user_admin, v_user_admin
);

-- Batch 13: Cannabis White Widow, cosecha phase, active, 25 plants
-- Fills cosecha column (currently empty)
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_13, 'LOT-WWD-260115-001', v_cult_white_w,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion B' AND f.company_id = v_company_id),
  v_pc_cosecha,
  25, CURRENT_DATE - interval '105 days', CURRENT_DATE + interval '52 days',
  'active', v_user_admin, v_user_admin
);

-- Batch 14: Cannabis White Widow, floracion phase, on_hold, 35 plants
-- Quality check pending - adds another on_hold for dashboard KPI
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_14, 'LOT-WWD-260215-001', v_cult_white_w,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion B' AND f.company_id = v_company_id),
  v_pc_flor,
  35, CURRENT_DATE - interval '52 days', CURRENT_DATE + interval '105 days',
  'on_hold', v_user_admin, v_user_admin
);

-- Batch 15: Cannabis Blue Dream COMPLETED - linked to order 8
-- Full cycle completed with yield data
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status,
  yield_wet_kg, yield_dry_kg, total_cost, created_by, updated_by
) VALUES (
  v_batch_15, 'LOT-BLD-251015-001', v_cult_blue_d,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado' AND f.company_id = v_company_id),
  v_pc_curado, v_order_8,
  135, CURRENT_DATE - interval '180 days', CURRENT_DATE - interval '20 days',
  'completed',
  94.5, 18.5, 12500.00, v_user_admin, v_user_admin
);

-- Link order 8 phases to batch 15
UPDATE production_order_phases SET batch_id = v_batch_15 WHERE order_id = v_order_8;

-- Batch 16: Cannabis White Widow - linked to order 9 (70% complete, in floracion)
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_16, 'LOT-WWD-260105-001', v_cult_white_w,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion B' AND f.company_id = v_company_id),
  v_pc_flor, v_order_9,
  72, CURRENT_DATE - interval '95 days', CURRENT_DATE + interval '62 days',
  'active', v_user_admin, v_user_admin
);

-- Link order 9 phases to batch 16
UPDATE production_order_phases SET batch_id = v_batch_16 WHERE order_id = v_order_9;

-- Batch 17: Cannabis OG Kush - linked to order 10 (30% complete, in vegetativo)
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id, production_order_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_17, 'LOT-OGK-260312-001', v_cult_og_kush,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo B' AND f.company_id = v_company_id),
  v_pc_veg, v_order_10,
  186, CURRENT_DATE - interval '28 days', CURRENT_DATE + interval '129 days',
  'active', v_user_admin, v_user_admin
);

-- Link order 10 phases to batch 17
UPDATE production_order_phases SET batch_id = v_batch_17 WHERE order_id = v_order_10;

-- Batch 18: Cannabis OG Kush COMPLETED - another completed batch for KPI
-- Older completed batch (2 months ago)
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status,
  yield_wet_kg, yield_dry_kg, total_cost, created_by, updated_by
) VALUES (
  v_batch_18, 'LOT-OGK-250901-001', v_cult_og_kush,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado' AND f.company_id = v_company_id),
  v_pc_curado,
  90, CURRENT_DATE - interval '200 days', CURRENT_DATE - interval '43 days',
  'completed',
  63.0, 13.9, 5200.00, v_user_admin, v_user_admin
);

-- Batch 19: Cannabis Blue Dream - plantula phase, active (early stage)
-- Fills plantula column in kanban
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status, created_by, updated_by
) VALUES (
  v_batch_19, 'LOT-BLD-260401-001', v_cult_blue_d,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Propagacion Cannabis' AND f.company_id = v_company_id),
  v_pc_plantula,
  55, CURRENT_DATE - interval '12 days', CURRENT_DATE + interval '145 days',
  'active', v_user_admin, v_user_admin
);

-- Batch 20: Cannabis White Widow - curado phase, active (late stage)
-- Shows batch in final curing stage
INSERT INTO batches (
  id, code, cultivar_id, zone_id, current_phase_id,
  plant_count, start_date, expected_end_date, status,
  yield_wet_kg, created_by, updated_by
) VALUES (
  v_batch_20, 'LOT-WWD-251201-001', v_cult_white_w,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Secado/Curado' AND f.company_id = v_company_id),
  v_pc_curado,
  38, CURRENT_DATE - interval '140 days', CURRENT_DATE + interval '17 days',
  'active',
  26.6, v_user_admin, v_user_admin
);

-- =============================================================
-- 28c. BATCH LINEAGE (split/merge operations)
-- =============================================================

-- Split: Batch 1 (100 plants veg) was split from a larger parent batch
-- This demonstrates lineage for traceability
INSERT INTO batch_lineage (
  operation, parent_batch_id, child_batch_id,
  quantity_transferred, unit_id, reason,
  performed_by, performed_at
) VALUES (
  'split', v_batch_18, v_batch_1,
  100, v_unit_und,
  'Division para optimizar espacio en Vegetativo A',
  v_user_supervisor, CURRENT_DATE - interval '21 days'
);

-- Split: Batch 12 was also split from batch 18 (same parent, different zone)
INSERT INTO batch_lineage (
  operation, parent_batch_id, child_batch_id,
  quantity_transferred, unit_id, reason,
  performed_by, performed_at
) VALUES (
  'split', v_batch_18, v_batch_12,
  45, v_unit_und,
  'Division para zona de floracion separada',
  v_user_supervisor, CURRENT_DATE - interval '67 days'
);

-- Merge: Batch 3 was created by merging two smaller batches
-- (Using batch 13 as the child that was merged into batch 3)
INSERT INTO batch_lineage (
  operation, parent_batch_id, child_batch_id,
  quantity_transferred, unit_id, reason,
  performed_by, performed_at
) VALUES (
  'merge', v_batch_13, v_batch_3,
  15, v_unit_und,
  'Consolidacion de lotes para secado conjunto',
  v_user_gerente, CURRENT_DATE - interval '70 days'
);

-- =============================================================
-- 28b. REGULATORY DOCUMENTS (batch-linked — deferred from section 26)
-- =============================================================

-- 2. CoA for batch 3 (White Widow secado): valid (quality_test_id linked after QT inserts)
INSERT INTO regulatory_documents (
  company_id, doc_type_id, batch_id,
  document_number, issue_date, expiry_date, status, field_data,
  verified_by, verified_at, created_by, updated_by
) VALUES (
  v_company_id, v_rdt_coa, v_batch_3,
  'COA-CHM-2026-00142', CURRENT_DATE - interval '7 days', CURRENT_DATE + interval '358 days',
  'valid',
  jsonb_build_object(
    'lab_name', 'ChemHistory Labs',
    'analysis_type', 'Full Potency Panel',
    'sample_id', 'CHM-2026-00142',
    'methodology', 'HPLC-UV'
  ),
  v_user_admin, now() - interval '6 days',
  v_user_admin, v_user_admin
);

-- 4. FNC export cert for coffee batch (Caturra completed)
INSERT INTO regulatory_documents (
  company_id, doc_type_id, batch_id,
  document_number, issue_date, expiry_date, status, field_data,
  created_by, updated_by
) VALUES (
  v_company_id, v_rdt_fnc, v_batch_6,
  'FNC-EXP-2026-00023', CURRENT_DATE - interval '30 days', CURRENT_DATE + interval '150 days',
  'valid',
  jsonb_build_object(
    'exporter_name', 'Alquemist Agroindustrial S.A.S.',
    'contract_number', 'FNC-2026-CO-00145',
    'destination_country', 'Estados Unidos',
    'quantity_kg', 500,
    'cup_score', 85
  ),
  v_user_admin, v_user_admin
);

-- 6. Expiring soon CoA for batch 1, expires in 15 days
INSERT INTO regulatory_documents (
  company_id, doc_type_id, batch_id,
  document_number, issue_date, expiry_date, status, field_data,
  created_by, updated_by
) VALUES (
  v_company_id, v_rdt_coa, v_batch_1,
  'COA-BLC-2026-00071', CURRENT_DATE - interval '350 days', CURRENT_DATE + interval '15 days',
  'valid',
  jsonb_build_object(
    'lab_name', 'BioLab Colombia',
    'analysis_type', 'Microbiological Screen',
    'sample_id', 'BLC-2026-00071'
  ),
  v_user_admin, v_user_admin
);

-- =============================================================
-- 29. QUALITY TESTS
-- =============================================================

-- Test 1: Cannabis potency PASSED — batch 3 (White Widow secado)
INSERT INTO quality_tests (
  id, batch_id, phase_id, test_type, lab_name, lab_reference,
  sample_date, result_date, status, overall_pass, notes, performed_by,
  created_by, updated_by
) VALUES (
  '00000000-0000-0000-000c-000000000001',
  v_batch_3, v_pc_cosecha, 'potency', 'ChemHistory Labs', 'CHM-2026-00142',
  CURRENT_DATE - interval '10 days', CURRENT_DATE - interval '7 days',
  'completed', true, 'Batch 3 potency analysis — all parameters within limits',
  v_user_admin, v_user_admin, v_user_admin
);

-- Test 2: Cannabis contaminants PENDING — batch 1 (OG Kush veg)
INSERT INTO quality_tests (
  id, batch_id, phase_id, test_type, lab_name, lab_reference,
  sample_date, status, performed_by, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000c-000000000002',
  v_batch_1, v_pc_flor, 'contaminants', 'BioLab Colombia', 'BLC-2026-00089',
  CURRENT_DATE - interval '2 days',
  'pending', v_user_admin, v_user_admin, v_user_admin
);

-- Test 3: Cannabis heavy metals FAILED — batch 2 (Blue Dream flor)
INSERT INTO quality_tests (
  id, batch_id, phase_id, test_type, lab_name, lab_reference,
  sample_date, result_date, status, overall_pass, notes, performed_by,
  created_by, updated_by
) VALUES (
  '00000000-0000-0000-000c-000000000003',
  v_batch_2, v_pc_flor, 'heavy_metals', 'ChemHistory Labs', 'CHM-2026-00155',
  CURRENT_DATE - interval '5 days', CURRENT_DATE - interval '3 days',
  'failed', false, 'Lead exceeded maximum threshold — batch on hold',
  v_user_admin, v_user_admin, v_user_admin
);

-- Test 4: Coffee cup score PASSED — batch 6 (Caturra recoleccion)
INSERT INTO quality_tests (
  id, batch_id, phase_id, test_type, lab_name, lab_reference,
  sample_date, result_date, status, overall_pass, notes, performed_by,
  created_by, updated_by
) VALUES (
  '00000000-0000-0000-000c-000000000004',
  v_batch_6, v_pf_recoleccion, 'cup_score', 'Lab Analitico del Valle', 'LAV-2026-00034',
  CURRENT_DATE - interval '15 days', CURRENT_DATE - interval '12 days',
  'completed', true, 'Caturra cup score analysis — 85 points total, all parameters pass',
  v_user_admin, v_user_admin, v_user_admin
);

-- Test 5: Coffee moisture PASSED — batch 9 (Castillo on_hold secado)
INSERT INTO quality_tests (
  id, batch_id, phase_id, test_type, lab_name, lab_reference,
  sample_date, result_date, status, overall_pass, notes, performed_by,
  created_by, updated_by
) VALUES (
  '00000000-0000-0000-000c-000000000005',
  v_batch_9, v_pf_secado_c, 'moisture', 'Lab Analitico del Valle', 'LAV-2026-00041',
  CURRENT_DATE - interval '20 days', CURRENT_DATE - interval '18 days',
  'completed', true, 'Moisture and screen size within acceptable range',
  v_user_admin, v_user_admin, v_user_admin
);

-- Test 6: Palm OER PASSED — batch 7 (Tenera vivero)
INSERT INTO quality_tests (
  id, batch_id, phase_id, test_type, lab_name, lab_reference,
  sample_date, result_date, status, overall_pass, notes, performed_by,
  created_by, updated_by
) VALUES (
  '00000000-0000-0000-000c-000000000006',
  v_batch_7, v_pp_vivero, 'oil_extraction', 'Lab Analitico del Valle', 'LAV-2026-00052',
  CURRENT_DATE - interval '8 days', CURRENT_DATE - interval '5 days',
  'completed', true, 'OER, FFA, DOBI and moisture all within specification',
  v_user_admin, v_user_admin, v_user_admin
);

-- Link CoA regulatory doc to quality test 1 (now that quality_tests exist)
UPDATE regulatory_documents
SET quality_test_id = '00000000-0000-0000-000c-000000000001'
WHERE document_number = 'COA-CHM-2026-00142';

-- =============================================================
-- 30. QUALITY TEST RESULTS
-- =============================================================

-- Test 1 results (potency — passed)
INSERT INTO quality_test_results (test_id, parameter, value, numeric_value, unit, min_threshold, max_threshold, passed, created_by, updated_by) VALUES
  ('00000000-0000-0000-000c-000000000001', 'THC',      '22.5', 22.5, '%', 0,    35, true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000001', 'CBD',      '0.8',  0.8,  '%', 0,    30, true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000001', 'CBN',      '0.3',  0.3,  '%', 0,    5,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000001', 'Moisture', '11.2', 11.2, '%', null, 15, true, v_user_admin, v_user_admin);

-- Test 3 results (heavy metals — failed on lead)
INSERT INTO quality_test_results (test_id, parameter, value, numeric_value, unit, min_threshold, max_threshold, passed, created_by, updated_by) VALUES
  ('00000000-0000-0000-000c-000000000003', 'Lead',    '0.72', 0.72, 'ppm', null, 0.5, false, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000003', 'Arsenic', '0.08', 0.08, 'ppm', null, 0.2, true,  v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000003', 'Cadmium', '0.12', 0.12, 'ppm', null, 0.2, true,  v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000003', 'Mercury', '0.02', 0.02, 'ppm', null, 0.1, true,  v_user_admin, v_user_admin);

-- Test 4 results (cup score — passed)
INSERT INTO quality_test_results (test_id, parameter, value, numeric_value, unit, min_threshold, max_threshold, passed, created_by, updated_by) VALUES
  ('00000000-0000-0000-000c-000000000004', 'Aroma',     '7.5', 7.5, '/10',  6,   10,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000004', 'Flavor',    '7.0', 7.0, '/10',  6,   10,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000004', 'Aftertaste','6.5', 6.5, '/10',  5,   10,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000004', 'Acidity',   '7.5', 7.5, '/10',  6,   10,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000004', 'Body',      '7.0', 7.0, '/10',  5,   10,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000004', 'Balance',   '7.0', 7.0, '/10',  5,   10,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000004', 'Overall',   '7.5', 7.5, '/10',  6,   10,  true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000004', 'Total',     '85',  85,  '/100', 80,  100, true, v_user_admin, v_user_admin);

-- Test 5 results (moisture — passed)
INSERT INTO quality_test_results (test_id, parameter, value, numeric_value, unit, min_threshold, max_threshold, passed, created_by, updated_by) VALUES
  ('00000000-0000-0000-000c-000000000005', 'Moisture',    '11.5', 11.5, '%',  null, 12.5, true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000005', 'Screen Size', '14',   14,   'mm', 12,   null, true, v_user_admin, v_user_admin);

-- Test 6 results (palm OER — passed)
INSERT INTO quality_test_results (test_id, parameter, value, numeric_value, unit, min_threshold, max_threshold, passed, created_by, updated_by) VALUES
  ('00000000-0000-0000-000c-000000000006', 'OER',      '23.5', 23.5, '%',  20,   null, true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000006', 'FFA',      '3.2',  3.2,  '%',  null, 5,    true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000006', 'DOBI',     '2.8',  2.8,  '',   2.5,  null, true, v_user_admin, v_user_admin),
  ('00000000-0000-0000-000c-000000000006', 'Moisture', '0.15', 0.15, '%',  null, 0.5,  true, v_user_admin, v_user_admin);

-- =============================================================
-- 31. PHYTOSANITARY AGENTS
-- =============================================================

-- 1. Spider mite (pest/mite, cannabis)
INSERT INTO phytosanitary_agents (
  id, company_id, type, category, code, common_name, scientific_name,
  crop_type_id, default_plant_parts, visual_symptoms, recommended_actions,
  severity_scale, is_active, sort_order, created_by, updated_by
) VALUES (
  v_agent_spider_mite, v_company_id, 'pest', 'mite', 'SPIDER-MITE',
  'Acaro rojo', 'Tetranychus urticae',
  v_crop_cannabis, '["leaf", "stem"]'::jsonb,
  'Puntos amarillos en hojas, telaranas finas en enves',
  'Aplicar acaricida (abamectina), liberar Phytoseiulus persimilis',
  '{"low": "< 5 individuos/hoja", "medium": "5-15 individuos/hoja", "high": "15-30 individuos/hoja", "critical": "> 30 individuos/hoja"}'::jsonb,
  true, 1, v_user_admin, v_user_admin
);

-- 2. Botrytis (disease/fungus, cannabis)
INSERT INTO phytosanitary_agents (
  id, company_id, type, category, code, common_name, scientific_name,
  crop_type_id, default_plant_parts, visual_symptoms, recommended_actions,
  severity_scale, is_active, sort_order, created_by, updated_by
) VALUES (
  v_agent_botrytis, v_company_id, 'disease', 'fungus', 'BOTRYTIS',
  'Moho gris', 'Botrytis cinerea',
  v_crop_cannabis, '["flower", "stem"]'::jsonb,
  'Moho gris en cogollos, necrosis en tallos',
  'Eliminar partes afectadas, mejorar ventilacion, reducir humedad < 50%',
  '{"low": "1-2 cogollos afectados", "medium": "3-5 cogollos", "high": "6-10 cogollos", "critical": "> 10 cogollos o sistemico"}'::jsonb,
  true, 2, v_user_admin, v_user_admin
);

-- 3. N-deficiency (deficiency/nutrient, cannabis)
INSERT INTO phytosanitary_agents (
  id, company_id, type, category, code, common_name, scientific_name,
  crop_type_id, default_plant_parts, visual_symptoms, recommended_actions,
  is_active, sort_order, created_by, updated_by
) VALUES (
  v_agent_nitrogen, v_company_id, 'deficiency', 'nutrient', 'N-DEF',
  'Deficiencia de nitrogeno', null,
  v_crop_cannabis, '["leaf", "whole_plant"]'::jsonb,
  'Clorosis generalizada comenzando en hojas bajas, crecimiento lento',
  'Aumentar fertilizacion nitrogenada, revisar pH del sustrato (6.0-6.5)',
  true, 3, v_user_admin, v_user_admin
);

-- 4. Broca (pest/insect, coffee)
INSERT INTO phytosanitary_agents (
  id, company_id, type, category, code, common_name, scientific_name,
  crop_type_id, default_plant_parts, visual_symptoms, recommended_actions,
  severity_scale, is_active, sort_order, created_by, updated_by
) VALUES (
  v_agent_broca, v_company_id, 'pest', 'insect', 'BROCA',
  'Broca del cafe', 'Hypothenemus hampei',
  v_crop_cafe, '["fruit"]'::jsonb,
  'Perforacion en base del fruto, polvo de barrenado',
  'Trampeo con atrayente, Beauveria bassiana, recoleccion sanitaria',
  '{"low": "< 2% incidencia", "medium": "2-5%", "high": "5-10%", "critical": "> 10%"}'::jsonb,
  true, 4, v_user_admin, v_user_admin
);

-- 5. Roya (disease/fungus, coffee)
INSERT INTO phytosanitary_agents (
  id, company_id, type, category, code, common_name, scientific_name,
  crop_type_id, default_plant_parts, visual_symptoms, recommended_actions,
  severity_scale, is_active, sort_order, created_by, updated_by
) VALUES (
  v_agent_roya, v_company_id, 'disease', 'fungus', 'ROYA',
  'Roya del cafe', 'Hemileia vastatrix',
  v_crop_cafe, '["leaf"]'::jsonb,
  'Pustulas amarillo-anaranjadas en enves de hojas',
  'Fungicida cuprico, poda de ventilacion, variedades resistentes',
  '{"low": "< 5% incidencia", "medium": "5-15%", "high": "15-30%", "critical": "> 30%"}'::jsonb,
  true, 5, v_user_admin, v_user_admin
);

-- 6. Picudo (pest/insect, palma)
INSERT INTO phytosanitary_agents (
  id, company_id, type, category, code, common_name, scientific_name,
  crop_type_id, default_plant_parts, visual_symptoms, recommended_actions,
  severity_scale, is_active, sort_order, created_by, updated_by
) VALUES (
  v_agent_picudo, v_company_id, 'pest', 'insect', 'PICUDO',
  'Picudo negro', 'Rhynchophorus palmarum',
  v_crop_palma, '["stem", "flower"]'::jsonb,
  'Exudado marron en base de hojas, larvas en corona',
  'Trampeo con feromonas, saneamiento de palmas afectadas',
  '{"low": "1 adulto/trampa", "medium": "2-5", "high": "6-10", "critical": "> 10"}'::jsonb,
  true, 6, v_user_admin, v_user_admin
);

-- =============================================================
-- 32. SCHEDULED ACTIVITIES
-- =============================================================

-- 1. Cannabis: Riego veg pending, batch 1, day 45, 2d from now
INSERT INTO scheduled_activities (
  id, schedule_id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000001',
  v_sched_og, v_tmpl_riego_cann, v_batch_1,
  CURRENT_DATE + interval '2 days', 45, v_pc_veg, 'pending',
  jsonb_build_object('name', 'Riego cannabis', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- 2. Cannabis: Fertilizacion pending, batch 1, day 44, tomorrow
INSERT INTO scheduled_activities (
  id, schedule_id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000002',
  v_sched_og, v_tmpl_fert_cann, v_batch_1,
  CURRENT_DATE + interval '1 day', 44, v_pc_veg, 'pending',
  jsonb_build_object('name', 'Fertilizacion cannabis', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- 3. Cannabis: Inspeccion completed, batch 1, day 42, yesterday
INSERT INTO scheduled_activities (
  id, schedule_id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000003',
  v_sched_og, v_tmpl_insp_cann, v_batch_1,
  CURRENT_DATE - interval '1 day', 42, v_pc_veg, 'completed',
  jsonb_build_object('name', 'Inspeccion cannabis', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- 4. Cannabis: Riego overdue, batch 2, day 10, 3d overdue
INSERT INTO scheduled_activities (
  id, schedule_id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000004',
  v_sched_og, v_tmpl_riego_cann, v_batch_2,
  CURRENT_DATE - interval '3 days', 10, v_pc_flor, 'overdue',
  jsonb_build_object('name', 'Riego cannabis', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- 5. Coffee: Inspeccion pending, batch 4, day 280, today
INSERT INTO scheduled_activities (
  id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000005',
  v_tmpl_insp_cafe, v_batch_4,
  CURRENT_DATE, 280, v_pf_levante, 'pending',
  jsonb_build_object('name', 'Inspeccion cafetal', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- 6. Coffee: Fertilizacion pending, batch 6, day 740, 2d from now
INSERT INTO scheduled_activities (
  id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000006',
  v_tmpl_fert_cafe, v_batch_6,
  CURRENT_DATE + interval '2 days', 740, v_pf_recoleccion, 'pending',
  jsonb_build_object('name', 'Fertilizacion cafe', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- 7. Palma: Inspeccion pending, batch 7, day 190, tomorrow
INSERT INTO scheduled_activities (
  id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000007',
  v_tmpl_insp_palma, v_batch_7,
  CURRENT_DATE + interval '1 day', 190, v_pp_vivero, 'pending',
  jsonb_build_object('name', 'Inspeccion palma', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- 8. Cannabis: Fertilizacion skipped, batch 3, day 85, 5d ago
INSERT INTO scheduled_activities (
  id, template_id, batch_id,
  planned_date, crop_day, phase_id, status,
  template_snapshot, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000d-000000000008',
  v_tmpl_fert_cann, v_batch_3,
  CURRENT_DATE - interval '5 days', 85, v_pc_secado, 'skipped',
  jsonb_build_object('name', 'Fertilizacion cannabis', 'resources', '[]'::jsonb, 'checklist', '[]'::jsonb),
  v_user_admin, v_user_admin
);

-- =============================================================
-- 33. EXECUTED ACTIVITIES
-- =============================================================

-- Activity 1: Cannabis inspeccion (linked to scheduled 3), batch 1, Vegetativo A
INSERT INTO activities (
  id, activity_type_id, template_id, scheduled_activity_id, batch_id, zone_id,
  performed_by, performed_at, duration_minutes, phase_id, crop_day,
  status, notes, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000e-000000000001',
  v_atype_inspeccion, v_tmpl_insp_cann,
  '00000000-0000-0000-000d-000000000003',
  v_batch_1,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.company_id = v_company_id),
  v_user_admin, now() - interval '1 day', 30,
  v_pc_veg, 42,
  'completed', 'Inspeccion de rutina — acaro rojo detectado + deficiencia leve de N',
  v_user_admin, v_user_admin
);

-- Link the completed scheduled activity
UPDATE scheduled_activities
SET completed_activity_id = '00000000-0000-0000-000e-000000000001'
WHERE id = '00000000-0000-0000-000d-000000000003';

-- Activity 2: Coffee inspeccion (ad-hoc), batch 4, Lote 1 Castillo
INSERT INTO activities (
  id, activity_type_id, batch_id, zone_id,
  performed_by, performed_at, duration_minutes, phase_id, crop_day,
  status, notes, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000e-000000000002',
  v_atype_inspeccion,
  v_batch_4,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo' AND f.company_id = v_company_id),
  v_user_supervisor, now() - interval '2 days', 90,
  v_pf_levante, 288,
  'completed', 'Inspeccion de rutina cafetal — roya detectada nivel medio',
  v_user_supervisor, v_user_supervisor
);

-- Activity 3: Palma inspeccion (ad-hoc), batch 7, Lote A Tenera
INSERT INTO activities (
  id, activity_type_id, batch_id, zone_id,
  performed_by, performed_at, duration_minutes, phase_id, crop_day,
  status, notes, created_by, updated_by
) VALUES (
  '00000000-0000-0000-000e-000000000003',
  v_atype_inspeccion,
  v_batch_7,
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera' AND f.company_id = v_company_id),
  v_user_operador, now() - interval '4 days', 120,
  v_pp_vivero, 196,
  'completed', 'Inspeccion general — mediciones de suelo y temperatura',
  v_user_operador, v_user_operador
);

-- =============================================================
-- 34. ACTIVITY OBSERVATIONS
-- =============================================================

-- Activity 1 obs: Spider mite (pest, medium)
INSERT INTO activity_observations (
  activity_id, type, agent_id, plant_part,
  incidence_value, incidence_unit, severity,
  sample_size, affected_plants,
  description, action_taken
) VALUES (
  '00000000-0000-0000-000e-000000000001',
  'pest', v_agent_spider_mite, 'leaf',
  12, 'count', 'medium',
  10, 3,
  'Colonias pequenas de acaro rojo en enves de hojas medias',
  'Programar aplicacion de acaricida'
);

-- Activity 1 obs: N-deficiency (deficiency, low)
INSERT INTO activity_observations (
  activity_id, type, agent_id, plant_part,
  severity, description
) VALUES (
  '00000000-0000-0000-000e-000000000001',
  'deficiency', v_agent_nitrogen, 'leaf',
  'low',
  'Ligera clorosis en hojas bajas — posible deficiencia de N'
);

-- Activity 2 obs: Roya (disease, medium, 8% incidence)
INSERT INTO activity_observations (
  activity_id, type, agent_id, plant_part,
  incidence_value, incidence_unit, severity,
  description, action_taken
) VALUES (
  '00000000-0000-0000-000e-000000000002',
  'disease', v_agent_roya, 'leaf',
  8, 'percentage', 'medium',
  'Roya del cafe detectada — 8% de incidencia foliar en hojas medias y bajas',
  'Aplicar fungicida cuprico, programar poda de ventilacion'
);

-- Activity 3 obs: General measurement (env reading)
INSERT INTO activity_observations (
  activity_id, type, plant_part,
  severity, description
) VALUES (
  '00000000-0000-0000-000e-000000000003',
  'measurement', 'root',
  'info',
  'Temperatura suelo 28.5°C, humedad suelo 35%. Condiciones normales para la epoca.'
);

-- =============================================================
-- 35. SENSORS
-- =============================================================
INSERT INTO sensors (id, company_id, zone_id, type, brand_model, serial_number, calibration_date, is_active, created_by, updated_by)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.company_id = v_company_id),
   'temperature', 'Trolmaster HCS-1', 'TM-HCS1-001', CURRENT_DATE - interval '30 days', true, v_user_admin, v_user_admin),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.company_id = v_company_id),
   'humidity', 'Trolmaster HCS-1', 'TM-HCS1-002', CURRENT_DATE - interval '30 days', true, v_user_admin, v_user_admin),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
   'temperature', 'Trolmaster HCS-1', 'TM-HCS1-003', CURRENT_DATE - interval '15 days', true, v_user_admin, v_user_admin),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
   'humidity', 'Trolmaster HCS-1', 'TM-HCS1-004', CURRENT_DATE - interval '15 days', true, v_user_admin, v_user_admin),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
   'co2', 'Autopilot APC-8200', 'AP-8200-001', CURRENT_DATE - interval '60 days', true, v_user_admin, v_user_admin),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo' AND f.company_id = v_company_id),
   'soil_moisture', 'Decagon EC-5', 'DEC-EC5-001', CURRENT_DATE - interval '45 days', true, v_user_admin, v_user_admin),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera' AND f.company_id = v_company_id),
   'temperature', 'Generic DHT22', 'DHT22-001', NULL, true, v_user_admin, v_user_admin),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', v_company_id,
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion B' AND f.company_id = v_company_id),
   'temperature', 'Trolmaster HCS-1', 'TM-HCS1-005', CURRENT_DATE - interval '180 days', false, v_user_admin, v_user_admin);

-- =============================================================
-- 36. ENVIRONMENTAL READINGS (last 6 hours, 30min intervals)
-- =============================================================

-- Vegetativo A temperature: 23-27°C
INSERT INTO environmental_readings (company_id, sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  v_company_id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.company_id = v_company_id),
  'temperature',
  23 + (random() * 4)::numeric(4,1),
  '°C',
  now() - (n * interval '30 minutes')
FROM generate_series(0, 11) AS n;

-- Vegetativo A humidity: 45-60%
INSERT INTO environmental_readings (company_id, sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  v_company_id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Vegetativo A' AND f.company_id = v_company_id),
  'humidity',
  45 + (random() * 15)::numeric(4,1),
  '%RH',
  now() - (n * interval '30 minutes')
FROM generate_series(0, 11) AS n;

-- Floracion A temperature: some out of range (>28°C for first 3 readings)
INSERT INTO environmental_readings (company_id, sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  v_company_id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
  'temperature',
  CASE WHEN n < 3 THEN 30 + (random() * 2)::numeric(4,1)
       ELSE 22 + (random() * 5)::numeric(4,1)
  END,
  '°C',
  now() - (n * interval '30 minutes')
FROM generate_series(0, 11) AS n;

-- Floracion A CO2: 800-1200 ppm
INSERT INTO environmental_readings (company_id, sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  v_company_id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
  'co2',
  800 + (random() * 400)::numeric(6,1),
  'ppm',
  now() - (n * interval '30 minutes')
FROM generate_series(0, 11) AS n;

-- Lote 1 Castillo soil_moisture: 25-40%
INSERT INTO environmental_readings (company_id, sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  v_company_id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06',
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote 1 Castillo' AND f.company_id = v_company_id),
  'humidity',
  25 + (random() * 15)::numeric(4,1),
  '%vol',
  now() - (n * interval '30 minutes')
FROM generate_series(0, 11) AS n;

-- Lote A Tenera temperature: 26-32°C
INSERT INTO environmental_readings (company_id, sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  v_company_id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07',
  (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Lote A Tenera' AND f.company_id = v_company_id),
  'temperature',
  26 + (random() * 6)::numeric(4,1),
  '°C',
  now() - (n * interval '30 minutes')
FROM generate_series(0, 11) AS n;

-- =============================================================
-- 37. ALERTS
-- =============================================================
INSERT INTO alerts (id, company_id, type, severity, title, entity_type, entity_id, batch_id, message, triggered_at, status, acknowledged_by, acknowledged_at, resolved_at)
VALUES
  -- 1. Pending critical: env out of range, Floracion A temp 31.2°C
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', v_company_id, 'env_out_of_range', 'critical',
   'Floracion A: temperature fuera de rango',
   'sensor', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', v_batch_2,
   'temperature = 31.2 °C (rango optimo: 20 - 28) en zona Floracion A.',
   now() - interval '15 minutes', 'pending', NULL, NULL, NULL),

  -- 2. Pending warning: stale batch, batch 8 (completed OGK)
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', v_company_id, 'stale_batch', 'warning',
   'Batch sin actividad: LOT-OGK-251101-001',
   'batch', v_batch_8, v_batch_8,
   'El batch no tiene actividad reciente.',
   now() - interval '2 hours', 'pending', NULL, NULL, NULL),

  -- 3. Acknowledged warning: overdue activity, linked to scheduled for batch 2
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', v_company_id, 'overdue_activity', 'warning',
   'Actividad vencida: Riego cannabis',
   'scheduled_activity', '00000000-0000-0000-000d-000000000004', v_batch_2,
   'La actividad "Riego cannabis" del batch esta vencida.',
   now() - interval '1 day', 'acknowledged', v_user_admin, now() - interval '12 hours', NULL),

  -- 4. Resolved info: regulatory expiring
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', v_company_id, 'regulatory_expiring', 'info',
   'Documento regulatorio por vencer',
   'regulatory_document', (SELECT id FROM regulatory_documents WHERE document_number = 'COA-BLC-2026-00071'), NULL,
   'Un documento regulatorio esta proximo a vencer.',
   now() - interval '3 days', 'resolved', v_user_admin, now() - interval '2 days', now() - interval '1 day'),

  -- 5. Pending high: low inventory, fertilizer
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', v_company_id, 'low_inventory', 'high',
   'Inventario bajo: Flora Bloom',
   'inventory_item', (SELECT id FROM inventory_items WHERE batch_number = 'INV-FLORA-B-LOW' AND company_id = v_company_id), NULL,
   'Flora Bloom tiene stock bajo (0.5L).',
   now() - interval '6 hours', 'pending', NULL, NULL, NULL),

  -- 6. Pending warning: pest detected, roya in coffee
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', v_company_id, 'pest_detected', 'warning',
   'Roya detectada en cafetal',
   'activity_observation', (SELECT id FROM activity_observations WHERE activity_id = '00000000-0000-0000-000e-000000000002' LIMIT 1), v_batch_4,
   'Roya del cafe detectada con 8% de incidencia en Lote 1 Castillo.',
   now() - interval '2 days', 'pending', NULL, NULL, NULL);

-- =============================================================
-- 38. OVERHEAD COSTS
-- =============================================================
INSERT INTO overhead_costs (id, company_id, facility_id, zone_id, cost_type, description, amount, currency, period_start, period_end, allocation_basis, created_by, updated_by)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', v_company_id,
   (SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   NULL, 'energy', 'Electricidad Febrero 2026', 4500000, 'COP',
   '2026-02-01', '2026-02-28', 'per_m2', v_user_admin, v_user_admin),

  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', v_company_id,
   (SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   NULL, 'rent', 'Arriendo Febrero 2026', 8000000, 'COP',
   '2026-02-01', '2026-02-28', 'even_split', v_user_admin, v_user_admin),

  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', v_company_id,
   (SELECT id FROM facilities WHERE name = 'Nave Cannabis Indoor' AND company_id = v_company_id),
   (SELECT z.id FROM zones z JOIN facilities f ON f.id = z.facility_id WHERE z.name = 'Floracion A' AND f.company_id = v_company_id),
   'maintenance', 'Mantenimiento HVAC Floracion A', 1200000, 'COP',
   '2026-02-01', '2026-02-28', 'per_batch', v_user_admin, v_user_admin),

  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', v_company_id,
   (SELECT id FROM facilities WHERE name = 'Invernadero Propagacion' AND company_id = v_company_id),
   NULL, 'insurance', 'Seguro Invernadero Q1 2026', 3000000, 'COP',
   '2026-01-01', '2026-03-31', 'even_split', v_user_admin, v_user_admin),

  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', v_company_id,
   (SELECT id FROM facilities WHERE name = 'Finca Cafetera La Esperanza' AND company_id = v_company_id),
   NULL, 'labor_fixed', 'Nomina fija operarios Febrero', 15000000, 'COP',
   '2026-02-01', '2026-02-28', 'per_plant', v_user_admin, v_user_admin),

  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06', v_company_id,
   (SELECT id FROM facilities WHERE name = 'Plantacion Palma Magdalena' AND company_id = v_company_id),
   NULL, 'energy', 'Electricidad Febrero 2026', 6000000, 'COP',
   '2026-02-01', '2026-02-28', 'per_m2', v_user_admin, v_user_admin);

END $$;
