-- 10_seed.sql
-- US-003-008: Seed data de ejemplo
-- Idempotente: ON CONFLICT DO NOTHING
-- UUIDs explicitos para consistencia de FKs

-- ============================================================
-- UUID Constants
-- ============================================================

-- Company
-- company: 11111111-1111-1111-1111-111111111111

-- Users (auth.users + public.users)
-- admin:      22222222-2222-2222-2222-222222222201
-- supervisor: 22222222-2222-2222-2222-222222222202
-- operator:   22222222-2222-2222-2222-222222222203

-- Facility
-- facility: 33333333-3333-3333-3333-333333333301

-- Zones
-- zone_prop:  44444444-4444-4444-4444-444444444401
-- zone_veg:   44444444-4444-4444-4444-444444444402
-- zone_flor:  44444444-4444-4444-4444-444444444403

-- Crop types
-- cannabis:  55555555-5555-5555-5555-555555555501
-- blueberry: 55555555-5555-5555-5555-555555555502

-- Cultivars
-- gelato:    66666666-6666-6666-6666-666666666601
-- og_kush:   66666666-6666-6666-6666-666666666602
-- duke:      66666666-6666-6666-6666-666666666603

-- Production phases (cannabis 7, blueberry 4 = 11 total)
-- cannabis germination:  77777777-7777-7777-7777-777777777701
-- cannabis propagation:  77777777-7777-7777-7777-777777777702
-- cannabis vegetative:   77777777-7777-7777-7777-777777777703
-- cannabis flowering:    77777777-7777-7777-7777-777777777704
-- cannabis harvest:      77777777-7777-7777-7777-777777777705
-- cannabis drying:       77777777-7777-7777-7777-777777777706
-- cannabis packaging:    77777777-7777-7777-7777-777777777707
-- blueberry dormancy:    77777777-7777-7777-7777-777777777711
-- blueberry flowering:   77777777-7777-7777-7777-777777777712
-- blueberry fruiting:    77777777-7777-7777-7777-777777777713
-- blueberry harvest:     77777777-7777-7777-7777-777777777714

-- Resource categories
-- cat_seed:      88888888-8888-8888-8888-888888888801
-- cat_nutrient:  88888888-8888-8888-8888-888888888802
-- cat_substrate: 88888888-8888-8888-8888-888888888803
-- cat_vegetal:   88888888-8888-8888-8888-888888888804
-- cat_supplies:  88888888-8888-8888-8888-888888888805

-- Units
-- unit_g:     99999999-9999-9999-9999-999999999901
-- unit_kg:    99999999-9999-9999-9999-999999999902
-- unit_ml:    99999999-9999-9999-9999-999999999903
-- unit_l:     99999999-9999-9999-9999-999999999904
-- unit_unit:  99999999-9999-9999-9999-999999999905

-- Products
-- prod_seed:     aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001
-- prod_clone:    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002
-- prod_cano3:    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003
-- prod_wet:      aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004
-- prod_dry:      aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005
-- prod_coco:     aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006

-- Production orders
-- order_001: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01  (approved, Gelato)
-- order_002: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02  (draft, OG Kush)
-- order_003: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03  (in_progress, Gelato)
-- order_004: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04  (completed, Gelato)
-- order_005: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05  (cancelled, OG Kush)

-- Batches
-- batch_001: cccccccc-cccc-cccc-cccc-cccccccccc01  (germination, Gelato)
-- batch_002: cccccccc-cccc-cccc-cccc-cccccccccc02  (vegetative, Gelato)
-- batch_003: cccccccc-cccc-cccc-cccc-cccccccccc03  (drying, Gelato — parent for split)
-- batch_003a: cccccccc-cccc-cccc-cccc-cccccccccc04 (drying, split child A)
-- batch_003b: cccccccc-cccc-cccc-cccc-cccccccccc05 (drying, split child B)

-- Suppliers
-- supplier_01: dddddddd-dddd-dddd-dddd-dddddddddd01
-- supplier_02: dddddddd-dddd-dddd-dddd-dddddddddd02

-- Additional products
-- prod_fungicide:  aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007
-- prod_rootgel:    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008
-- prod_ogkseed:    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa009
-- prod_trim:       aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa010

-- Activity types
-- atype_fertiriego:  eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01
-- atype_poda:        eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02
-- atype_inspeccion:  eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03
-- atype_cosecha:     eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04

-- Activity templates
-- atpl_fertiriego_veg:  eeeeeeee-eeee-eeee-eeee-eeeeeeeee101
-- atpl_poda_veg:        eeeeeeee-eeee-eeee-eeee-eeeeeeeee102
-- atpl_inspeccion_gen:  eeeeeeee-eeee-eeee-eeee-eeeeeeeee103
-- atpl_cosecha_flor:    eeeeeeee-eeee-eeee-eeee-eeeeeeeee104

-- Cultivation schedules
-- sched_gelato: eeeeeeee-eeee-eeee-eeee-eeeeeeeee201
-- sched_ogkush: eeeeeeee-eeee-eeee-eeee-eeeeeeeee202

-- Sensors (8 total, prefix ffffffff)
-- Inventory items (prefix dddddddd...ii)
-- Quality tests (prefix dddddddd...qq)
-- Zone structures (prefix dddddddd...zz)
-- Alerts (prefix dddddddd...aa)
-- Overhead costs (prefix dddddddd...oo)

-- ============================================================
-- 1. Company
-- ============================================================

INSERT INTO companies (id, name, legal_id, country, timezone, currency, settings, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'AgroTech Colombia SAS',
  '900.123.456-7',
  'CO',
  'America/Bogota',
  'COP',
  '{"logo_url": null, "regulatory_mode": "medicinal", "features_enabled": ["batches", "inventory", "quality", "activities"]}',
  true
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Auth users (Supabase auth.users with app_metadata)
-- ============================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, email_change_confirm_status, reauthentication_token,
  created_at, updated_at
)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '00000000-0000-0000-0000-000000000000',
    'admin@agrotech.co',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "company_id": "11111111-1111-1111-1111-111111111111", "role": "admin", "facility_id": "33333333-3333-3333-3333-333333333301"}',
    '{"full_name": "Carlos Admin"}',
    'authenticated',
    'authenticated',
    '', '', '', '', '', 0, '',
    now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '00000000-0000-0000-0000-000000000000',
    'supervisor@agrotech.co',
    crypt('Super123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "company_id": "11111111-1111-1111-1111-111111111111", "role": "supervisor", "facility_id": "33333333-3333-3333-3333-333333333301"}',
    '{"full_name": "Maria Supervisor"}',
    'authenticated',
    'authenticated',
    '', '', '', '', '', 0, '',
    now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '00000000-0000-0000-0000-000000000000',
    'operator@agrotech.co',
    crypt('Oper123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "company_id": "11111111-1111-1111-1111-111111111111", "role": "operator", "facility_id": "33333333-3333-3333-3333-333333333301"}',
    '{"full_name": "Juan Operador"}',
    'authenticated',
    'authenticated',
    '', '', '', '', '', 0, '',
    now(), now()
  )
ON CONFLICT DO NOTHING;

-- Auth identities (required by Supabase Auth for signInWithPassword)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '22222222-2222-2222-2222-222222222201',
    'admin@agrotech.co',
    '{"sub": "22222222-2222-2222-2222-222222222201", "email": "admin@agrotech.co", "email_verified": true, "phone_verified": false}',
    'email',
    now(), now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '22222222-2222-2222-2222-222222222202',
    'supervisor@agrotech.co',
    '{"sub": "22222222-2222-2222-2222-222222222202", "email": "supervisor@agrotech.co", "email_verified": true, "phone_verified": false}',
    'email',
    now(), now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '22222222-2222-2222-2222-222222222203',
    'operator@agrotech.co',
    '{"sub": "22222222-2222-2222-2222-222222222203", "email": "operator@agrotech.co", "email_verified": true, "phone_verified": false}',
    'email',
    now(), now(), now()
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Public users
-- ============================================================

INSERT INTO users (id, company_id, email, full_name, role, is_active)
VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'admin@agrotech.co', 'Carlos Admin', 'admin', true),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'supervisor@agrotech.co', 'Maria Supervisor', 'supervisor', true),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'operator@agrotech.co', 'Juan Operador', 'operator', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Facility
-- ============================================================

INSERT INTO facilities (id, company_id, name, type, total_footprint_m2, address, is_active)
VALUES (
  '33333333-3333-3333-3333-333333333301',
  '11111111-1111-1111-1111-111111111111',
  'Invernadero Principal',
  'greenhouse',
  500.00,
  'Km 12 Via Chia-Cajica, Cundinamarca, Colombia',
  true
) ON CONFLICT DO NOTHING;

-- Update users with facility
UPDATE users SET assigned_facility_id = '33333333-3333-3333-3333-333333333301'
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================
-- 5. Zones
-- ============================================================

INSERT INTO zones (id, facility_id, name, purpose, environment, area_m2, plant_capacity, status)
VALUES
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'Sala Propagacion', 'propagation', 'indoor_controlled', 25.00, 200, 'active'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', 'Sala Vegetativo A', 'vegetation', 'indoor_controlled', 80.00, 100, 'active'),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301', 'Sala Floracion A', 'flowering', 'indoor_controlled', 120.00, 80, 'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Crop Types
-- ============================================================

INSERT INTO crop_types (id, code, name, scientific_name, category, regulatory_framework, is_active)
VALUES
  ('55555555-5555-5555-5555-555555555501', 'cannabis', 'Cannabis Medicinal', 'Cannabis sativa L.', 'annual', 'Resolucion 227/2022', true),
  ('55555555-5555-5555-5555-555555555502', 'blueberry', 'Arandano', 'Vaccinium corymbosum', 'perennial', null, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Cultivars
-- ============================================================

INSERT INTO cultivars (id, crop_type_id, code, name, breeder, genetics, default_cycle_days, phase_durations, expected_yield_per_plant_g, expected_dry_ratio, optimal_conditions, density_plants_per_m2, is_active)
VALUES
  (
    '66666666-6666-6666-6666-666666666601',
    '55555555-5555-5555-5555-555555555501',
    'GELATO-41',
    'Gelato #41',
    'Seed Junky Genetics',
    'Sunset Sherbet x Thin Mint GSC',
    127,
    '{"germination": 7, "propagation": 14, "vegetative": 28, "flowering": 63, "harvest": 1, "drying": 14, "packaging": 1}',
    500,
    0.25,
    '{"temp": "20-26°C", "RH": "40-60%", "EC": "1.2-2.4", "pH": "5.8-6.2"}',
    9,
    true
  ),
  (
    '66666666-6666-6666-6666-666666666602',
    '55555555-5555-5555-5555-555555555501',
    'OG-KUSH',
    'OG Kush',
    'Unknown',
    'Chemdawg x Hindu Kush',
    120,
    '{"germination": 7, "propagation": 14, "vegetative": 21, "flowering": 56, "harvest": 1, "drying": 14, "packaging": 1}',
    450,
    0.22,
    '{"temp": "20-28°C", "RH": "40-55%", "EC": "1.0-2.0", "pH": "5.8-6.2"}',
    9,
    true
  ),
  (
    '66666666-6666-6666-6666-666666666603',
    '55555555-5555-5555-5555-555555555502',
    'DUKE-BB',
    'Duke',
    'USDA Cooperator',
    null,
    365,
    '{"dormancy": 90, "flowering": 30, "fruiting": 60, "harvest": 14}',
    3000,
    null,
    '{"temp": "15-25°C", "RH": "60-80%", "pH": "4.5-5.5"}',
    2.5,
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. Production Phases — Cannabis (7)
-- ============================================================

INSERT INTO production_phases (id, crop_type_id, code, name, sort_order, is_transformation, is_destructive, default_duration_days, requires_zone_change, can_be_entry_point, can_be_exit_point)
VALUES
  ('77777777-7777-7777-7777-777777777701', '55555555-5555-5555-5555-555555555501', 'germination', 'Germinacion', 1, false, false, 7, false, true, false),
  ('77777777-7777-7777-7777-777777777702', '55555555-5555-5555-5555-555555555501', 'propagation', 'Propagacion', 2, false, false, 14, false, true, false),
  ('77777777-7777-7777-7777-777777777703', '55555555-5555-5555-5555-555555555501', 'vegetative', 'Vegetativo', 3, false, false, 28, true, false, false),
  ('77777777-7777-7777-7777-777777777704', '55555555-5555-5555-5555-555555555501', 'flowering', 'Floracion', 4, false, false, 63, true, false, false),
  ('77777777-7777-7777-7777-777777777705', '55555555-5555-5555-5555-555555555501', 'harvest', 'Cosecha', 5, true, true, 1, false, false, true),
  ('77777777-7777-7777-7777-777777777706', '55555555-5555-5555-5555-555555555501', 'drying', 'Secado', 6, true, false, 14, true, true, true),
  ('77777777-7777-7777-7777-777777777707', '55555555-5555-5555-5555-555555555501', 'packaging', 'Empaque', 7, true, false, 1, false, false, true)
ON CONFLICT DO NOTHING;

-- depends_on_phase_id links
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777701' WHERE id = '77777777-7777-7777-7777-777777777702';
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777702' WHERE id = '77777777-7777-7777-7777-777777777703';
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777703' WHERE id = '77777777-7777-7777-7777-777777777704';
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777704' WHERE id = '77777777-7777-7777-7777-777777777705';
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777705' WHERE id = '77777777-7777-7777-7777-777777777706';
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777706' WHERE id = '77777777-7777-7777-7777-777777777707';

-- ============================================================
-- 9. Production Phases — Blueberry (4)
-- ============================================================

INSERT INTO production_phases (id, crop_type_id, code, name, sort_order, is_transformation, is_destructive, default_duration_days, requires_zone_change, can_be_entry_point, can_be_exit_point)
VALUES
  ('77777777-7777-7777-7777-777777777711', '55555555-5555-5555-5555-555555555502', 'dormancy', 'Dormancia', 1, false, false, 90, false, true, false),
  ('77777777-7777-7777-7777-777777777712', '55555555-5555-5555-5555-555555555502', 'flowering', 'Floracion', 2, false, false, 30, false, false, false),
  ('77777777-7777-7777-7777-777777777713', '55555555-5555-5555-5555-555555555502', 'fruiting', 'Fructificacion', 3, false, false, 60, false, false, false),
  ('77777777-7777-7777-7777-777777777714', '55555555-5555-5555-5555-555555555502', 'harvest', 'Cosecha', 4, true, false, 14, false, false, true)
ON CONFLICT DO NOTHING;

UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777711' WHERE id = '77777777-7777-7777-7777-777777777712';
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777712' WHERE id = '77777777-7777-7777-7777-777777777713';
UPDATE production_phases SET depends_on_phase_id = '77777777-7777-7777-7777-777777777713' WHERE id = '77777777-7777-7777-7777-777777777714';

-- ============================================================
-- 10. Resource Categories
-- ============================================================

INSERT INTO resource_categories (id, name, code, is_consumable, is_depreciable, is_transformable, default_lot_tracking, is_active)
VALUES
  ('88888888-8888-8888-8888-888888888801', 'Semillas', 'SEED', true, false, true, 'required', true),
  ('88888888-8888-8888-8888-888888888802', 'Nutrientes', 'NUTRIENT', true, false, false, 'optional', true),
  ('88888888-8888-8888-8888-888888888803', 'Sustratos', 'SUBSTRATE', true, false, false, 'none', true),
  ('88888888-8888-8888-8888-888888888804', 'Material Vegetal', 'VEGETAL', false, false, true, 'required', true),
  ('88888888-8888-8888-8888-888888888805', 'Suministros', 'SUPPLIES', true, false, false, 'none', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. Units of Measure
-- ============================================================

INSERT INTO units_of_measure (id, code, name, dimension, base_unit_id, to_base_factor)
VALUES
  ('99999999-9999-9999-9999-999999999901', 'g', 'Gramo', 'mass', null, 1),
  ('99999999-9999-9999-9999-999999999902', 'kg', 'Kilogramo', 'mass', '99999999-9999-9999-9999-999999999901', 1000),
  ('99999999-9999-9999-9999-999999999903', 'mL', 'Mililitro', 'volume', null, 1),
  ('99999999-9999-9999-9999-999999999904', 'L', 'Litro', 'volume', '99999999-9999-9999-9999-999999999903', 1000),
  ('99999999-9999-9999-9999-999999999905', 'u', 'Unidad', 'count', null, 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. Products
-- ============================================================

INSERT INTO products (id, sku, name, category_id, default_unit_id, cultivar_id, procurement_type, lot_tracking, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'SEM-GELATO-FEM', 'Semilla Gelato #41 Feminizada', '88888888-8888-8888-8888-888888888801', '99999999-9999-9999-9999-999999999905', '66666666-6666-6666-6666-666666666601', 'purchased', 'required', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'CLN-GELATO', 'Clon Gelato #41', '88888888-8888-8888-8888-888888888804', '99999999-9999-9999-9999-999999999905', '66666666-6666-6666-6666-666666666601', 'produced', 'required', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'CANO3-25KG', 'Nitrato de Calcio 25kg', '88888888-8888-8888-8888-888888888802', '99999999-9999-9999-9999-999999999901', null, 'purchased', 'optional', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'WET-GELATO', 'Flor Humeda Gelato #41', '88888888-8888-8888-8888-888888888804', '99999999-9999-9999-9999-999999999901', '66666666-6666-6666-6666-666666666601', 'produced', 'required', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', 'DRY-GELATO', 'Flor Seca Gelato #41', '88888888-8888-8888-8888-888888888804', '99999999-9999-9999-9999-999999999901', '66666666-6666-6666-6666-666666666601', 'produced', 'required', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006', 'COCO-70-30', 'Sustrato Coco/Perlita 70/30', '88888888-8888-8888-8888-888888888803', '99999999-9999-9999-9999-999999999904', null, 'purchased', 'none', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 13. Production Order
-- ============================================================

INSERT INTO production_orders (id, code, company_id, cultivar_id, entry_phase_id, exit_phase_id, initial_quantity, initial_unit_id, planned_start_date, status, priority)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
  'OP-2026-001',
  '11111111-1111-1111-1111-111111111111',
  '66666666-6666-6666-6666-666666666601',
  '77777777-7777-7777-7777-777777777701',
  '77777777-7777-7777-7777-777777777707',
  50,
  '99999999-9999-9999-9999-999999999905',
  '2026-03-01',
  'approved',
  'normal'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 14. Batch
-- ============================================================

INSERT INTO batches (id, code, cultivar_id, zone_id, plant_count, current_phase_id, production_order_id, start_date, status)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccc01',
  'LOT-GELATO-260301',
  '66666666-6666-6666-6666-666666666601',
  '44444444-4444-4444-4444-444444444401',
  50,
  '77777777-7777-7777-7777-777777777701',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
  '2026-03-01',
  'active'
) ON CONFLICT DO NOTHING;

-- ############################################################
-- ENHANCED SEED DATA — Test coverage for Phases 0-3
-- ############################################################

-- ============================================================
-- 15. Additional Auth Users (manager + viewer = 5-role coverage)
-- ============================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, email_change_confirm_status, reauthentication_token,
  created_at, updated_at
)
VALUES
  (
    '22222222-2222-2222-2222-222222222204',
    '00000000-0000-0000-0000-000000000000',
    'manager@agrotech.co',
    crypt('Mgr123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "company_id": "11111111-1111-1111-1111-111111111111", "role": "manager", "facility_id": "33333333-3333-3333-3333-333333333301"}',
    '{"full_name": "Ana Gerente"}',
    'authenticated', 'authenticated',
    '', '', '', '', '', 0, '',
    now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    '00000000-0000-0000-0000-000000000000',
    'viewer@agrotech.co',
    crypt('View123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "company_id": "11111111-1111-1111-1111-111111111111", "role": "viewer", "facility_id": "33333333-3333-3333-3333-333333333301"}',
    '{"full_name": "Luis Viewer"}',
    'authenticated', 'authenticated',
    '', '', '', '', '', 0, '',
    now(), now()
  )
ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (
    '22222222-2222-2222-2222-222222222204',
    '22222222-2222-2222-2222-222222222204',
    'manager@agrotech.co',
    '{"sub": "22222222-2222-2222-2222-222222222204", "email": "manager@agrotech.co", "email_verified": true, "phone_verified": false}',
    'email', now(), now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    '22222222-2222-2222-2222-222222222205',
    'viewer@agrotech.co',
    '{"sub": "22222222-2222-2222-2222-222222222205", "email": "viewer@agrotech.co", "email_verified": true, "phone_verified": false}',
    'email', now(), now(), now()
  )
ON CONFLICT DO NOTHING;

INSERT INTO users (id, company_id, email, full_name, role, is_active, assigned_facility_id)
VALUES
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'manager@agrotech.co', 'Ana Gerente', 'manager', true, '33333333-3333-3333-3333-333333333301'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'viewer@agrotech.co', 'Luis Viewer', 'viewer', true, '33333333-3333-3333-3333-333333333301')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 16. Suppliers
-- ============================================================

INSERT INTO suppliers (id, company_id, name, contact_info, payment_terms, is_active)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', '11111111-1111-1111-1111-111111111111', 'AgroInsumos SAS', '{"phone": "+57 310 555 1234", "email": "ventas@agroinsumos.co", "city": "Bogota"}', 'Net 30', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddd02', '11111111-1111-1111-1111-111111111111', 'BioNutrientes Ltda', '{"phone": "+57 315 555 5678", "email": "info@bionutrientes.co", "city": "Medellin"}', 'Net 15', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 17. Additional Products + update existing with thresholds
-- ============================================================

INSERT INTO products (id, sku, name, category_id, default_unit_id, cultivar_id, procurement_type, lot_tracking, shelf_life_days, preferred_supplier_id, default_price, price_currency, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', 'FUNG-COPPER', 'Fungicida Cobre 1L', '88888888-8888-8888-8888-888888888805', '99999999-9999-9999-9999-999999999903', null, 'purchased', 'optional', 365, 'dddddddd-dddd-dddd-dddd-dddddddddd01', 45000, 'COP', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', 'ROOT-GEL-500', 'Gel Enraizador 500mL', '88888888-8888-8888-8888-888888888802', '99999999-9999-9999-9999-999999999903', null, 'purchased', 'none', 180, 'dddddddd-dddd-dddd-dddd-dddddddddd02', 32000, 'COP', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa009', 'SEM-OGK-FEM', 'Semilla OG Kush Feminizada', '88888888-8888-8888-8888-888888888801', '99999999-9999-9999-9999-999999999905', '66666666-6666-6666-6666-666666666602', 'purchased', 'required', null, 'dddddddd-dddd-dddd-dddd-dddddddddd01', 15000, 'COP', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa010', 'TRIM-GELATO', 'Trim Gelato #41', '88888888-8888-8888-8888-888888888804', '99999999-9999-9999-9999-999999999901', '66666666-6666-6666-6666-666666666601', 'produced', 'required', null, null, null, null, true)
ON CONFLICT DO NOTHING;

-- Set min_stock_threshold on key products
UPDATE products SET min_stock_threshold = 20 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001'; -- seeds
UPDATE products SET min_stock_threshold = 5000 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003'; -- CaNO3
UPDATE products SET min_stock_threshold = 500 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007'; -- fungicide
UPDATE products SET min_stock_threshold = 200 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008'; -- root gel

-- ============================================================
-- 18. Additional Production Orders
-- ============================================================

INSERT INTO production_orders (id, code, company_id, cultivar_id, entry_phase_id, exit_phase_id, initial_quantity, initial_unit_id, planned_start_date, planned_end_date, status, priority, notes, created_by)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'OP-2026-002', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666602', '77777777-7777-7777-7777-777777777701', '77777777-7777-7777-7777-777777777707', 30, '99999999-9999-9999-9999-999999999905', '2026-04-01', '2026-08-01', 'draft', 'low', 'Lote experimental OG Kush', '22222222-2222-2222-2222-222222222204'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'OP-2026-003', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666601', '77777777-7777-7777-7777-777777777701', '77777777-7777-7777-7777-777777777707', 40, '99999999-9999-9999-9999-999999999905', '2026-02-01', '2026-06-01', 'in_progress', 'high', null, '22222222-2222-2222-2222-222222222204'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'OP-2026-004', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666601', '77777777-7777-7777-7777-777777777701', '77777777-7777-7777-7777-777777777706', 25, '99999999-9999-9999-9999-999999999905', '2026-01-01', '2026-04-15', 'completed', 'normal', 'Primer lote del ano', '22222222-2222-2222-2222-222222222201'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'OP-2026-005', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666602', '77777777-7777-7777-7777-777777777701', '77777777-7777-7777-7777-777777777707', 20, '99999999-9999-9999-9999-999999999905', '2026-03-15', null, 'cancelled', 'normal', 'Cancelado por falta de semillas', '22222222-2222-2222-2222-222222222204')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 19. Additional Batches
-- ============================================================

INSERT INTO batches (id, code, cultivar_id, zone_id, plant_count, current_phase_id, production_order_id, start_date, expected_end_date, status, company_id)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'LOT-GELATO-260201', '66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444402', 40, '77777777-7777-7777-7777-777777777703', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', '2026-02-01', '2026-06-01', 'active', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', 'LOT-GELATO-260101', '66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444403', 25, '77777777-7777-7777-7777-777777777706', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '2026-01-01', '2026-04-15', 'active', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Split children of batch_003 (LOT-GELATO-260101)
INSERT INTO batches (id, code, cultivar_id, zone_id, plant_count, current_phase_id, production_order_id, parent_batch_id, start_date, status, company_id)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', 'LOT-GELATO-260101-A', '66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444403', 15, '77777777-7777-7777-7777-777777777706', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'cccccccc-cccc-cccc-cccc-cccccccccc03', '2026-01-01', 'active', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc05', 'LOT-GELATO-260101-B', '66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444403', 10, '77777777-7777-7777-7777-777777777706', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'cccccccc-cccc-cccc-cccc-cccccccccc03', '2026-01-01', 'completed', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 20. Batch Lineage (split records)
-- ============================================================

INSERT INTO batch_lineage (id, operation, parent_batch_id, child_batch_id, quantity_transferred, unit_id, reason, performed_by)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddd11', 'split', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'cccccccc-cccc-cccc-cccc-cccccccccc04', 15, '99999999-9999-9999-9999-999999999905', 'Split para separar fenotipo A', '22222222-2222-2222-2222-222222222202'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd12', 'split', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'cccccccc-cccc-cccc-cccc-cccccccccc05', 10, '99999999-9999-9999-9999-999999999905', 'Split para separar fenotipo B', '22222222-2222-2222-2222-222222222202')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 21. Production Order Phases (for orders 001, 003, 004)
-- ============================================================

-- Order 001 phases (approved — all pending)
INSERT INTO production_order_phases (id, order_id, phase_id, sort_order, planned_start_date, planned_end_date, planned_duration_days, zone_id, status)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddd0b01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '77777777-7777-7777-7777-777777777701', 1, '2026-03-01', '2026-03-08', 7, '44444444-4444-4444-4444-444444444401', 'ready'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '77777777-7777-7777-7777-777777777702', 2, '2026-03-08', '2026-03-22', 14, '44444444-4444-4444-4444-444444444401', 'pending'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b03', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '77777777-7777-7777-7777-777777777703', 3, '2026-03-22', '2026-04-19', 28, '44444444-4444-4444-4444-444444444402', 'pending'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '77777777-7777-7777-7777-777777777704', 4, '2026-04-19', '2026-06-21', 63, '44444444-4444-4444-4444-444444444403', 'pending')
ON CONFLICT DO NOTHING;

-- Order 003 phases (in_progress — first 2 completed)
INSERT INTO production_order_phases (id, order_id, phase_id, sort_order, planned_start_date, planned_end_date, planned_duration_days, zone_id, status, actual_start_date, actual_end_date, batch_id)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddd0b11', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', '77777777-7777-7777-7777-777777777701', 1, '2026-02-01', '2026-02-08', 7, '44444444-4444-4444-4444-444444444401', 'completed', '2026-02-01', '2026-02-07', 'cccccccc-cccc-cccc-cccc-cccccccccc02'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b12', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', '77777777-7777-7777-7777-777777777702', 2, '2026-02-08', '2026-02-22', 14, '44444444-4444-4444-4444-444444444401', 'completed', '2026-02-07', '2026-02-20', 'cccccccc-cccc-cccc-cccc-cccccccccc02'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b13', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', '77777777-7777-7777-7777-777777777703', 3, '2026-02-22', '2026-03-22', 28, '44444444-4444-4444-4444-444444444402', 'in_progress', '2026-02-20', null, 'cccccccc-cccc-cccc-cccc-cccccccccc02'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b14', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', '77777777-7777-7777-7777-777777777704', 4, '2026-03-22', '2026-05-24', 63, '44444444-4444-4444-4444-444444444403', 'pending', null, null, null)
ON CONFLICT DO NOTHING;

-- Order 004 phases (completed — all done)
INSERT INTO production_order_phases (id, order_id, phase_id, sort_order, planned_start_date, planned_end_date, planned_duration_days, zone_id, status, actual_start_date, actual_end_date, batch_id, input_quantity, output_quantity, yield_pct)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddd0b21', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '77777777-7777-7777-7777-777777777701', 1, '2026-01-01', '2026-01-08', 7, '44444444-4444-4444-4444-444444444401', 'completed', '2026-01-01', '2026-01-07', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 25, 24, 96),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b22', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '77777777-7777-7777-7777-777777777702', 2, '2026-01-08', '2026-01-22', 14, '44444444-4444-4444-4444-444444444401', 'completed', '2026-01-07', '2026-01-21', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 24, 24, 100),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b23', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '77777777-7777-7777-7777-777777777703', 3, '2026-01-22', '2026-02-12', 28, '44444444-4444-4444-4444-444444444402', 'completed', '2026-01-21', '2026-02-11', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 24, 23, 96),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b24', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '77777777-7777-7777-7777-777777777704', 4, '2026-02-12', '2026-03-26', 63, '44444444-4444-4444-4444-444444444403', 'completed', '2026-02-11', '2026-03-25', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 23, 23, 100),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b25', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '77777777-7777-7777-7777-777777777705', 5, '2026-03-26', '2026-03-27', 1, '44444444-4444-4444-4444-444444444403', 'completed', '2026-03-25', '2026-03-26', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 23, 23, 100),
  ('dddddddd-dddd-dddd-dddd-dddddddd0b26', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '77777777-7777-7777-7777-777777777706', 6, '2026-03-27', '2026-04-10', 14, '44444444-4444-4444-4444-444444444403', 'completed', '2026-03-26', '2026-04-09', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 23, 25, 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 22. Activity Types
-- ============================================================

INSERT INTO activity_types (id, name, category, is_active)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'Fertirrigacion', 'nutricion', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 'Poda', 'mantenimiento', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'Inspeccion', 'monitoreo', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', 'Cosecha', 'produccion', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 23. Activity Templates
-- ============================================================

INSERT INTO activity_templates (id, code, activity_type_id, name, frequency, estimated_duration_min, trigger_day_from, trigger_day_to, is_active)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'FERT-VEG-D', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'Fertirrigacion Vegetativo Diaria', 'daily', 30, 1, 28, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', 'PODA-VEG-W', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 'Poda Apical Semanal', 'weekly', 45, 7, 21, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'INSP-GEN-D', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'Inspeccion General Diaria', 'daily', 20, 1, null, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee104', 'COS-FLOR-O', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', 'Cosecha de Floracion', 'once', 120, null, null, true)
ON CONFLICT DO NOTHING;

-- Template-to-phase linkages
INSERT INTO activity_template_phases (id, template_id, phase_id)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', '77777777-7777-7777-7777-777777777703'), -- fertiriego -> vegetative
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee112', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', '77777777-7777-7777-7777-777777777704'), -- fertiriego -> flowering
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee113', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', '77777777-7777-7777-7777-777777777703'), -- poda -> vegetative
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee114', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', '77777777-7777-7777-7777-777777777701'), -- inspeccion -> germination
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee115', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', '77777777-7777-7777-7777-777777777702'), -- inspeccion -> propagation
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee116', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', '77777777-7777-7777-7777-777777777703'), -- inspeccion -> vegetative
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee117', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', '77777777-7777-7777-7777-777777777704'), -- inspeccion -> flowering
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee118', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee104', '77777777-7777-7777-7777-777777777705')  -- cosecha -> harvest
ON CONFLICT DO NOTHING;

-- Template resources
INSERT INTO activity_template_resources (id, template_id, product_id, quantity, quantity_basis, is_optional, sort_order, notes)
VALUES
  -- Fertiriego: CaNO3 2g/plant + Coco substrate 0.5L/plant
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee121', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 2, 'per_plant', false, 1, 'Disolver en solucion madre'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee122', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', 5, 'per_plant', true, 2, 'Solo si hay deficiencias'),
  -- Poda: Fungicida 10mL/zone
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee123', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', 10, 'per_zone', false, 1, 'Aplicar en cortes'),
  -- Cosecha: no resources (just labor)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee124', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', 5, 'fixed', true, 1, 'Solo si se detecta hongo')
ON CONFLICT DO NOTHING;

-- Template checklists
INSERT INTO activity_template_checklist (id, template_id, step_order, instruction, is_critical, requires_photo)
VALUES
  -- Fertiriego checklist
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee131', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 1, 'Verificar pH de solucion (5.8-6.2)', true, false),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee132', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 2, 'Verificar EC de solucion (1.2-2.4)', true, false),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee133', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 3, 'Registrar volumen aplicado por planta', false, false),
  -- Poda checklist
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee134', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', 1, 'Desinfectar herramientas con alcohol', true, false),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee135', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', 2, 'Retirar hojas amarillas y ramas bajas', false, false),
  -- Inspeccion checklist
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee136', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 1, 'Revisar enves de hojas buscando plagas', true, false),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee137', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 2, 'Verificar color y turgencia general', false, false),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee138', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 3, 'Medir altura de 3 plantas aleatorias', false, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 24. Cultivation Schedules
-- ============================================================

INSERT INTO cultivation_schedules (id, name, cultivar_id, total_days, phase_config, is_active)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'Gelato Indoor Standard', '66666666-6666-6666-6666-666666666601', 127,
    '[{"phase_id":"77777777-7777-7777-7777-777777777701","duration":7},{"phase_id":"77777777-7777-7777-7777-777777777702","duration":14},{"phase_id":"77777777-7777-7777-7777-777777777703","duration":28},{"phase_id":"77777777-7777-7777-7777-777777777704","duration":63},{"phase_id":"77777777-7777-7777-7777-777777777705","duration":1},{"phase_id":"77777777-7777-7777-7777-777777777706","duration":14}]',
    true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee202', 'OG Kush Indoor Standard', '66666666-6666-6666-6666-666666666602', 120,
    '[{"phase_id":"77777777-7777-7777-7777-777777777701","duration":7},{"phase_id":"77777777-7777-7777-7777-777777777702","duration":14},{"phase_id":"77777777-7777-7777-7777-777777777703","duration":21},{"phase_id":"77777777-7777-7777-7777-777777777704","duration":56},{"phase_id":"77777777-7777-7777-7777-777777777705","duration":1},{"phase_id":"77777777-7777-7777-7777-777777777706","duration":14}]',
    true)
ON CONFLICT DO NOTHING;

-- Link schedules to batches
UPDATE batches SET schedule_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201' WHERE id IN ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'cccccccc-cccc-cccc-cccc-cccccccccc03');

-- ============================================================
-- 25. Scheduled Activities (~20 across batches)
-- ============================================================

INSERT INTO scheduled_activities (id, schedule_id, template_id, batch_id, planned_date, crop_day, phase_id, status, template_snapshot)
VALUES
  -- Batch 002 (vegetative) — 6 pending for today/future
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee301', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE, 22, '77777777-7777-7777-7777-777777777703', 'pending', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[{"product_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003","quantity":2,"basis":"per_plant"}]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee302', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE, 22, '77777777-7777-7777-7777-777777777703', 'pending', '{"name":"Inspeccion General Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee303', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE + 1, 23, '77777777-7777-7777-7777-777777777703', 'pending', '{"name":"Poda Apical Semanal","resources":[{"product_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007","quantity":10,"basis":"per_zone"}]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee304', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE + 1, 23, '77777777-7777-7777-7777-777777777703', 'pending', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[{"product_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003","quantity":2,"basis":"per_plant"}]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee305', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE + 2, 24, '77777777-7777-7777-7777-777777777703', 'pending', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee306', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE + 2, 24, '77777777-7777-7777-7777-777777777703', 'pending', '{"name":"Inspeccion General Diaria","resources":[]}'),

  -- Batch 002 — 4 overdue (past dates, still pending -> overdue)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee307', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 2, 20, '77777777-7777-7777-7777-777777777703', 'overdue', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee308', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 2, 20, '77777777-7777-7777-7777-777777777703', 'overdue', '{"name":"Inspeccion General Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee309', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 1, 21, '77777777-7777-7777-7777-777777777703', 'overdue', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee310', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 1, 21, '77777777-7777-7777-7777-777777777703', 'overdue', '{"name":"Inspeccion General Diaria","resources":[]}'),

  -- Batch 002 — 6 completed (earlier dates)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee311', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 5, 17, '77777777-7777-7777-7777-777777777703', 'completed', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee312', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 5, 17, '77777777-7777-7777-7777-777777777703', 'completed', '{"name":"Inspeccion General Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee313', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 4, 18, '77777777-7777-7777-7777-777777777703', 'completed', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee314', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 4, 18, '77777777-7777-7777-7777-777777777703', 'completed', '{"name":"Inspeccion General Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee315', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 3, 19, '77777777-7777-7777-7777-777777777703', 'completed', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee316', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 3, 19, '77777777-7777-7777-7777-777777777703', 'completed', '{"name":"Inspeccion General Diaria","resources":[]}'),

  -- Batch 002 — 4 skipped
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee317', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 7, 15, '77777777-7777-7777-7777-777777777703', 'skipped', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee318', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 7, 15, '77777777-7777-7777-7777-777777777703', 'skipped', '{"name":"Inspeccion General Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee319', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 6, 16, '77777777-7777-7777-7777-777777777703', 'skipped', '{"name":"Fertirrigacion Vegetativo Diaria","resources":[]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee320', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee201', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', 'cccccccc-cccc-cccc-cccc-cccccccccc02', CURRENT_DATE - 6, 16, '77777777-7777-7777-7777-777777777703', 'skipped', '{"name":"Poda Apical Semanal","resources":[]}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 26. Executed Activities (6 with resource consumption)
-- ============================================================

INSERT INTO activities (id, activity_type_id, template_id, scheduled_activity_id, batch_id, zone_id, performed_by, performed_at, duration_minutes, phase_id, crop_day, status, notes, company_id)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee401', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee311', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '5 days', 25, '77777777-7777-7777-7777-777777777703', 17, 'completed', 'pH 6.0, EC 1.8', '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee402', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee312', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '5 days', 15, '77777777-7777-7777-7777-777777777703', 17, 'completed', 'Sin novedades', '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee403', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee313', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '4 days', 30, '77777777-7777-7777-7777-777777777703', 18, 'completed', 'pH 5.9, EC 2.0', '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee404', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee314', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '4 days', 20, '77777777-7777-7777-7777-777777777703', 18, 'completed', 'Detectados 2 hojas amarillas', '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee405', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee315', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '3 days', 28, '77777777-7777-7777-7777-777777777703', 19, 'completed', 'pH 6.1, EC 1.9', '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee406', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee316', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '3 days', 18, '77777777-7777-7777-7777-777777777703', 19, 'completed', 'Todo normal', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Link completed scheduled activities to their executed activities
UPDATE scheduled_activities SET completed_activity_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee401' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee311';
UPDATE scheduled_activities SET completed_activity_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee402' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee312';
UPDATE scheduled_activities SET completed_activity_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee403' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee313';
UPDATE scheduled_activities SET completed_activity_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee404' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee314';
UPDATE scheduled_activities SET completed_activity_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee405' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee315';
UPDATE scheduled_activities SET completed_activity_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee406' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee316';

-- ============================================================
-- 27. Inventory Items (~15 across products and zones)
-- ============================================================

INSERT INTO inventory_items (id, product_id, zone_id, quantity_available, quantity_reserved, unit_id, batch_number, supplier_lot_number, cost_per_unit, expiration_date, source_type, lot_status)
VALUES
  -- Seeds (propagation zone)
  ('dddddddd-dddd-dddd-dddd-ddddddda1001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '44444444-4444-4444-4444-444444444401', 85, 0, '99999999-9999-9999-9999-999999999905', 'SEM-2026-001', 'SJG-2025-F42', 12000, null, 'purchase', 'available'),
  ('dddddddd-dddd-dddd-dddd-ddddddda1002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa009', '44444444-4444-4444-4444-444444444401', 15, 0, '99999999-9999-9999-9999-999999999905', 'SEM-2026-002', 'OGK-2025-R11', 15000, null, 'purchase', 'available'),
  -- CaNO3 (veg zone — low stock)
  ('dddddddd-dddd-dddd-dddd-ddddddda1003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', '44444444-4444-4444-4444-444444444402', 3500, 0, '99999999-9999-9999-9999-999999999901', 'CANO3-2026-01', 'AI-LOT-4521', 80, '2027-06-15', 'purchase', 'available'),
  -- CaNO3 (flowering zone)
  ('dddddddd-dddd-dddd-dddd-ddddddda1004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', '44444444-4444-4444-4444-444444444403', 8000, 0, '99999999-9999-9999-9999-999999999901', 'CANO3-2026-02', 'AI-LOT-4522', 80, '2027-06-15', 'purchase', 'available'),
  -- Coco substrate (veg zone)
  ('dddddddd-dddd-dddd-dddd-ddddddda1005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006', '44444444-4444-4444-4444-444444444402', 120, 0, '99999999-9999-9999-9999-999999999904', null, null, 25000, null, 'purchase', 'available'),
  -- Fungicide (propagation — expiring soon)
  ('dddddddd-dddd-dddd-dddd-ddddddda1006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', '44444444-4444-4444-4444-444444444401', 250, 0, '99999999-9999-9999-9999-999999999903', 'FUNG-2025-01', 'AI-FUNG-8801', 45, CURRENT_DATE + 15, 'purchase', 'available'),
  -- Root gel (propagation)
  ('dddddddd-dddd-dddd-dddd-ddddddda1007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', '44444444-4444-4444-4444-444444444401', 350, 0, '99999999-9999-9999-9999-999999999903', 'ROOT-2026-01', 'BN-ROOT-1122', 64, CURRENT_DATE + 90, 'purchase', 'available'),
  -- Expired item (quarantine)
  ('dddddddd-dddd-dddd-dddd-ddddddda1008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', '44444444-4444-4444-4444-444444444402', 100, 0, '99999999-9999-9999-9999-999999999903', 'FUNG-2025-OLD', 'AI-FUNG-7701', 45, CURRENT_DATE - 30, 'purchase', 'expired'),
  -- Wet flower (production output from batch 003)
  ('dddddddd-dddd-dddd-dddd-ddddddda1009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', '44444444-4444-4444-4444-444444444403', 11500, 0, '99999999-9999-9999-9999-999999999901', 'LOT-GELATO-260101', null, null, null, 'production', 'available'),
  -- Dry flower (production output)
  ('dddddddd-dddd-dddd-dddd-ddddddda1010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', '44444444-4444-4444-4444-444444444403', 2800, 0, '99999999-9999-9999-9999-999999999901', 'LOT-GELATO-260101-A', null, null, null, 'production', 'available'),
  -- Trim (byproduct)
  ('dddddddd-dddd-dddd-dddd-ddddddda1011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa010', '44444444-4444-4444-4444-444444444403', 800, 0, '99999999-9999-9999-9999-999999999901', 'LOT-GELATO-260101-TRIM', null, null, null, 'production', 'available'),
  -- Clones (produced)
  ('dddddddd-dddd-dddd-dddd-ddddddda1012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '44444444-4444-4444-4444-444444444401', 30, 0, '99999999-9999-9999-9999-999999999905', 'CLN-2026-01', null, null, null, 'production', 'available'),
  -- Depleted item
  ('dddddddd-dddd-dddd-dddd-ddddddda1013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006', '44444444-4444-4444-4444-444444444401', 0, 0, '99999999-9999-9999-9999-999999999904', null, null, 25000, null, 'purchase', 'depleted'),
  -- OG Kush seeds (low — 15 < 20 threshold)
  ('dddddddd-dddd-dddd-dddd-ddddddda1014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa009', '44444444-4444-4444-4444-444444444402', 8, 0, '99999999-9999-9999-9999-999999999905', 'SEM-OGK-2026-02', 'OGK-2025-R12', 15000, null, 'purchase', 'available')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 28. Inventory Transactions (~25 records)
-- ============================================================

INSERT INTO inventory_transactions (id, type, inventory_item_id, quantity, unit_id, timestamp, zone_id, batch_id, user_id, reason, company_id, cost_per_unit, cost_total)
VALUES
  -- Receipts (purchases)
  ('dddddddd-dddd-dddd-dddd-ddddddde0001', 'receipt', 'dddddddd-dddd-dddd-dddd-ddddddda1001', 100, '99999999-9999-9999-9999-999999999905', CURRENT_TIMESTAMP - interval '30 days', '44444444-4444-4444-4444-444444444401', null, '22222222-2222-2222-2222-222222222202', 'Compra semillas Gelato', '11111111-1111-1111-1111-111111111111', 12000, 1200000),
  ('dddddddd-dddd-dddd-dddd-ddddddde0002', 'receipt', 'dddddddd-dddd-dddd-dddd-ddddddda1003', 25000, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '25 days', '44444444-4444-4444-4444-444444444402', null, '22222222-2222-2222-2222-222222222202', 'Compra CaNO3 25kg', '11111111-1111-1111-1111-111111111111', 80, 2000000),
  ('dddddddd-dddd-dddd-dddd-ddddddde0003', 'receipt', 'dddddddd-dddd-dddd-dddd-ddddddda1004', 25000, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '25 days', '44444444-4444-4444-4444-444444444403', null, '22222222-2222-2222-2222-222222222202', 'Compra CaNO3 25kg', '11111111-1111-1111-1111-111111111111', 80, 2000000),
  ('dddddddd-dddd-dddd-dddd-ddddddde0004', 'receipt', 'dddddddd-dddd-dddd-dddd-ddddddda1005', 200, '99999999-9999-9999-9999-999999999904', CURRENT_TIMESTAMP - interval '20 days', '44444444-4444-4444-4444-444444444402', null, '22222222-2222-2222-2222-222222222202', 'Sustrato coco/perlita', '11111111-1111-1111-1111-111111111111', 25000, 5000000),
  ('dddddddd-dddd-dddd-dddd-ddddddde0005', 'receipt', 'dddddddd-dddd-dddd-dddd-ddddddda1006', 1000, '99999999-9999-9999-9999-999999999903', CURRENT_TIMESTAMP - interval '20 days', '44444444-4444-4444-4444-444444444401', null, '22222222-2222-2222-2222-222222222202', 'Fungicida cobre', '11111111-1111-1111-1111-111111111111', 45, 45000),
  ('dddddddd-dddd-dddd-dddd-ddddddde0006', 'receipt', 'dddddddd-dddd-dddd-dddd-ddddddda1007', 500, '99999999-9999-9999-9999-999999999903', CURRENT_TIMESTAMP - interval '18 days', '44444444-4444-4444-4444-444444444401', null, '22222222-2222-2222-2222-222222222202', 'Gel enraizador', '11111111-1111-1111-1111-111111111111', 64, 32000),

  -- Consumptions (activities)
  ('dddddddd-dddd-dddd-dddd-ddddddde0007', 'consumption', 'dddddddd-dddd-dddd-dddd-ddddddda1001', -15, '99999999-9999-9999-9999-999999999905', CURRENT_TIMESTAMP - interval '28 days', '44444444-4444-4444-4444-444444444401', 'cccccccc-cccc-cccc-cccc-cccccccccc01', '22222222-2222-2222-2222-222222222203', 'Siembra batch 001 (germination)', '11111111-1111-1111-1111-111111111111', 12000, 180000),
  ('dddddddd-dddd-dddd-dddd-ddddddde0008', 'consumption', 'dddddddd-dddd-dddd-dddd-ddddddda1003', -80, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '5 days', '44444444-4444-4444-4444-444444444402', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '22222222-2222-2222-2222-222222222203', 'Fertiriego dia 17', '11111111-1111-1111-1111-111111111111', 80, 6400),
  ('dddddddd-dddd-dddd-dddd-ddddddde0009', 'consumption', 'dddddddd-dddd-dddd-dddd-ddddddda1003', -80, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '4 days', '44444444-4444-4444-4444-444444444402', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '22222222-2222-2222-2222-222222222203', 'Fertiriego dia 18', '11111111-1111-1111-1111-111111111111', 80, 6400),
  ('dddddddd-dddd-dddd-dddd-ddddddde0010', 'consumption', 'dddddddd-dddd-dddd-dddd-ddddddda1003', -80, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '3 days', '44444444-4444-4444-4444-444444444402', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '22222222-2222-2222-2222-222222222203', 'Fertiriego dia 19', '11111111-1111-1111-1111-111111111111', 80, 6400),
  ('dddddddd-dddd-dddd-dddd-ddddddde0011', 'consumption', 'dddddddd-dddd-dddd-dddd-ddddddda1006', -50, '99999999-9999-9999-9999-999999999903', CURRENT_TIMESTAMP - interval '15 days', '44444444-4444-4444-4444-444444444401', 'cccccccc-cccc-cccc-cccc-cccccccccc01', '22222222-2222-2222-2222-222222222203', 'Aplicacion preventiva propagation', '11111111-1111-1111-1111-111111111111', 45, 2250),
  ('dddddddd-dddd-dddd-dddd-ddddddde0012', 'consumption', 'dddddddd-dddd-dddd-dddd-ddddddda1005', -40, '99999999-9999-9999-9999-999999999904', CURRENT_TIMESTAMP - interval '15 days', '44444444-4444-4444-4444-444444444402', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '22222222-2222-2222-2222-222222222203', 'Trasplante a vegetativo', '11111111-1111-1111-1111-111111111111', 25000, 1000000),

  -- Transformation (harvest output)
  ('dddddddd-dddd-dddd-dddd-ddddddde0013', 'transformation_in', 'dddddddd-dddd-dddd-dddd-ddddddda1009', 11500, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '10 days', '44444444-4444-4444-4444-444444444403', 'cccccccc-cccc-cccc-cccc-cccccccccc03', '22222222-2222-2222-2222-222222222202', 'Cosecha batch 003 — flor humeda', '11111111-1111-1111-1111-111111111111', null, null),
  ('dddddddd-dddd-dddd-dddd-ddddddde0014', 'transformation_in', 'dddddddd-dddd-dddd-dddd-ddddddda1010', 2800, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '5 days', '44444444-4444-4444-4444-444444444403', 'cccccccc-cccc-cccc-cccc-cccccccccc04', '22222222-2222-2222-2222-222222222202', 'Secado batch 003-A — flor seca', '11111111-1111-1111-1111-111111111111', null, null),
  ('dddddddd-dddd-dddd-dddd-ddddddde0015', 'transformation_in', 'dddddddd-dddd-dddd-dddd-ddddddda1011', 800, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '5 days', '44444444-4444-4444-4444-444444444403', 'cccccccc-cccc-cccc-cccc-cccccccccc04', '22222222-2222-2222-2222-222222222202', 'Trim de secado', '11111111-1111-1111-1111-111111111111', null, null),

  -- Adjustments
  ('dddddddd-dddd-dddd-dddd-ddddddde0016', 'adjustment', 'dddddddd-dddd-dddd-dddd-ddddddda1006', -700, '99999999-9999-9999-9999-999999999903', CURRENT_TIMESTAMP - interval '2 days', '44444444-4444-4444-4444-444444444401', null, '22222222-2222-2222-2222-222222222202', 'Ajuste por evaporacion en almacenamiento', '11111111-1111-1111-1111-111111111111', null, null),
  ('dddddddd-dddd-dddd-dddd-ddddddde0017', 'adjustment', 'dddddddd-dddd-dddd-dddd-ddddddda1007', -150, '99999999-9999-9999-9999-999999999903', CURRENT_TIMESTAMP - interval '1 day', '44444444-4444-4444-4444-444444444401', null, '22222222-2222-2222-2222-222222222202', 'Ajuste por rotura de envase', '11111111-1111-1111-1111-111111111111', null, null),

  -- Transfer (between zones)
  ('dddddddd-dddd-dddd-dddd-ddddddde0018', 'transfer_out', 'dddddddd-dddd-dddd-dddd-ddddddda1003', -5000, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '12 days', '44444444-4444-4444-4444-444444444402', null, '22222222-2222-2222-2222-222222222203', 'Transfer CaNO3 a floracion', '11111111-1111-1111-1111-111111111111', 80, 400000),
  ('dddddddd-dddd-dddd-dddd-ddddddde0019', 'transfer_in', 'dddddddd-dddd-dddd-dddd-ddddddda1004', 5000, '99999999-9999-9999-9999-999999999901', CURRENT_TIMESTAMP - interval '12 days', '44444444-4444-4444-4444-444444444403', null, '22222222-2222-2222-2222-222222222203', 'Transfer CaNO3 desde veg', '11111111-1111-1111-1111-111111111111', 80, 400000)
-- Note: related_transaction_id not set due to append-only trigger
ON CONFLICT DO NOTHING;

-- Note: transfer pair link (related_transaction_id) cannot be set via UPDATE
-- because inventory_transactions has an append-only trigger.
-- Insert the transfer_out with related_transaction_id pointing to the transfer_in (inserted after).
-- We accept that only one direction is linked in seed data.

-- ============================================================
-- 29. Quality Tests (6 across batches)
-- ============================================================

INSERT INTO quality_tests (id, batch_id, phase_id, test_type, lab_name, lab_reference, sample_date, result_date, status, overall_pass, notes, performed_by)
VALUES
  -- Batch 003 (drying) — completed pass
  ('dddddddd-dddd-dddd-dddd-dddddddcc001', 'cccccccc-cccc-cccc-cccc-cccccccccc03', '77777777-7777-7777-7777-777777777706', 'Cannabinoids', 'LabCanna Colombia', 'LC-2026-0451', CURRENT_DATE - 8, CURRENT_DATE - 3, 'completed', true, 'Resultados dentro de rango', '22222222-2222-2222-2222-222222222202'),
  -- Batch 003 — completed fail (microbiology)
  ('dddddddd-dddd-dddd-dddd-dddddddcc002', 'cccccccc-cccc-cccc-cccc-cccccccccc03', '77777777-7777-7777-7777-777777777706', 'Microbiology', 'LabCanna Colombia', 'LC-2026-0452', CURRENT_DATE - 8, CURRENT_DATE - 2, 'completed', false, 'Excede limite de mohos', '22222222-2222-2222-2222-222222222202'),
  -- Batch 004 (split A) — pending
  ('dddddddd-dddd-dddd-dddd-dddddddcc003', 'cccccccc-cccc-cccc-cccc-cccccccccc04', '77777777-7777-7777-7777-777777777706', 'Cannabinoids', 'LabCanna Colombia', 'LC-2026-0460', CURRENT_DATE - 1, null, 'pending', null, null, '22222222-2222-2222-2222-222222222202'),
  -- Batch 002 (vegetative) — in_progress
  ('dddddddd-dddd-dddd-dddd-dddddddcc004', 'cccccccc-cccc-cccc-cccc-cccccccccc02', '77777777-7777-7777-7777-777777777703', 'Pesticides', 'AgroLab SAS', 'AL-2026-1122', CURRENT_DATE - 3, null, 'in_progress', null, 'Analisis en proceso', '22222222-2222-2222-2222-222222222202'),
  -- Batch 005 (split B, completed) — completed pass
  ('dddddddd-dddd-dddd-dddd-dddddddcc005', 'cccccccc-cccc-cccc-cccc-cccccccccc05', '77777777-7777-7777-7777-777777777706', 'Cannabinoids', 'LabCanna Colombia', 'LC-2026-0470', CURRENT_DATE - 10, CURRENT_DATE - 5, 'completed', true, 'THC 24.3%, CBD 0.8%', '22222222-2222-2222-2222-222222222202'),
  -- Batch 001 (germination) — pending
  ('dddddddd-dddd-dddd-dddd-dddddddcc006', 'cccccccc-cccc-cccc-cccc-cccccccccc01', '77777777-7777-7777-7777-777777777701', 'Seed Viability', null, null, CURRENT_DATE, null, 'pending', null, 'Test de viabilidad de semillas', '22222222-2222-2222-2222-222222222202')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 30. Quality Test Results (~18 records)
-- ============================================================

INSERT INTO quality_test_results (id, test_id, parameter, value, numeric_value, unit, min_threshold, max_threshold, passed)
VALUES
  -- Test 001 (cannabinoids — pass)
  ('dddddddd-dddd-dddd-dddd-dddddddcd001', 'dddddddd-dddd-dddd-dddd-dddddddcc001', 'THC', '22.5', 22.5, '%', 15, 30, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd002', 'dddddddd-dddd-dddd-dddd-dddddddcc001', 'CBD', '0.6', 0.6, '%', 0, 5, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd003', 'dddddddd-dddd-dddd-dddd-dddddddcc001', 'CBN', '0.1', 0.1, '%', 0, 1, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd004', 'dddddddd-dddd-dddd-dddd-dddddddcc001', 'Moisture', '11.2', 11.2, '%', 8, 15, true),

  -- Test 002 (microbiology — fail)
  ('dddddddd-dddd-dddd-dddd-dddddddcd005', 'dddddddd-dddd-dddd-dddd-dddddddcc002', 'Total Aerobic', '800', 800, 'CFU/g', 0, 10000, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd006', 'dddddddd-dddd-dddd-dddd-dddddddcc002', 'Yeast & Mold', '1200', 1200, 'CFU/g', 0, 1000, false),
  ('dddddddd-dddd-dddd-dddd-dddddddcd007', 'dddddddd-dddd-dddd-dddd-dddddddcc002', 'E. coli', 'Not detected', null, 'CFU/g', null, null, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd008', 'dddddddd-dddd-dddd-dddd-dddddddcc002', 'Salmonella', 'Not detected', null, 'per 25g', null, null, true),

  -- Test 004 (pesticides — in_progress, partial results)
  ('dddddddd-dddd-dddd-dddd-dddddddcd009', 'dddddddd-dddd-dddd-dddd-dddddddcc004', 'Bifenazate', '<LOQ', 0, 'ppm', 0, 0.5, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd010', 'dddddddd-dddd-dddd-dddd-dddddddcc004', 'Myclobutanil', '<LOQ', 0, 'ppm', 0, 0.5, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd011', 'dddddddd-dddd-dddd-dddd-dddddddcc004', 'Spinosad', '0.08', 0.08, 'ppm', 0, 0.5, true),

  -- Test 005 (cannabinoids — pass)
  ('dddddddd-dddd-dddd-dddd-dddddddcd012', 'dddddddd-dddd-dddd-dddd-dddddddcc005', 'THC', '24.3', 24.3, '%', 15, 30, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd013', 'dddddddd-dddd-dddd-dddd-dddddddcc005', 'CBD', '0.8', 0.8, '%', 0, 5, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd014', 'dddddddd-dddd-dddd-dddd-dddddddcc005', 'CBN', '0.05', 0.05, '%', 0, 1, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd015', 'dddddddd-dddd-dddd-dddd-dddddddcc005', 'Moisture', '10.8', 10.8, '%', 8, 15, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd016', 'dddddddd-dddd-dddd-dddd-dddddddcc005', 'Water Activity', '0.55', 0.55, 'aw', 0, 0.65, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd017', 'dddddddd-dddd-dddd-dddd-dddddddcc005', 'Total Terpenes', '3.2', 3.2, '%', 1, 8, true),
  ('dddddddd-dddd-dddd-dddd-dddddddcd018', 'dddddddd-dddd-dddd-dddd-dddddddcc005', 'Foreign Matter', '0.02', 0.02, '%', 0, 0.5, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 31. Zone Structures (4 structures)
-- ============================================================

INSERT INTO zone_structures (id, zone_id, name, type, length_m, width_m, is_mobile, num_levels, positions_per_level, max_positions, spacing_cm, pot_size_l)
VALUES
  ('dddddddd-dddd-dddd-dddd-ddddddddab01', '44444444-4444-4444-4444-444444444401', 'Rack Propagacion A', 'mobile_rack', 2.4, 1.2, true, 3, 24, 72, 15, 0.5),
  ('dddddddd-dddd-dddd-dddd-ddddddddab02', '44444444-4444-4444-4444-444444444401', 'Rack Propagacion B', 'mobile_rack', 2.4, 1.2, true, 3, 24, 72, 15, 0.5),
  ('dddddddd-dddd-dddd-dddd-ddddddddab03', '44444444-4444-4444-4444-444444444402', 'Mesa Vegetativo 1', 'fixed_rack', 4.0, 1.5, false, 1, 20, 20, 25, 7),
  ('dddddddd-dddd-dddd-dddd-ddddddddab04', '44444444-4444-4444-4444-444444444403', 'Mesa Floracion 1', 'fixed_rack', 5.0, 1.5, false, 1, 16, 16, 30, 11)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 32. Plant Positions (~20 across structures)
-- ============================================================

INSERT INTO plant_positions (id, zone_id, structure_id, level_number, position_index, label, status, current_batch_id)
VALUES
  -- Rack Prop A — 8 planted with batch 001
  ('dddddddd-dddd-dddd-dddd-ddddddddbc01', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 1, 1, 'A1-L1-P1', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc02', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 1, 2, 'A1-L1-P2', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc03', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 1, 3, 'A1-L1-P3', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc04', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 1, 4, 'A1-L1-P4', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc05', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 2, 1, 'A1-L2-P1', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc06', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 2, 2, 'A1-L2-P2', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc07', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 2, 3, 'A1-L2-P3', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc08', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 2, 4, 'A1-L2-P4', 'planted', 'cccccccc-cccc-cccc-cccc-cccccccccc01'),
  -- Rack Prop A — 6 empty
  ('dddddddd-dddd-dddd-dddd-ddddddddbc09', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 3, 1, 'A1-L3-P1', 'empty', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc10', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 3, 2, 'A1-L3-P2', 'empty', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc11', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 3, 3, 'A1-L3-P3', 'empty', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc12', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab01', 3, 4, 'A1-L3-P4', 'empty', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc13', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab02', 1, 1, 'B1-L1-P1', 'empty', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc14', '44444444-4444-4444-4444-444444444401', 'dddddddd-dddd-dddd-dddd-ddddddddab02', 1, 2, 'B1-L1-P2', 'empty', null),
  -- Mesa Veg — 4 harvested (previous batch)
  ('dddddddd-dddd-dddd-dddd-ddddddddbc15', '44444444-4444-4444-4444-444444444402', 'dddddddd-dddd-dddd-dddd-ddddddddab03', 1, 1, 'V1-P1', 'harvested', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc16', '44444444-4444-4444-4444-444444444402', 'dddddddd-dddd-dddd-dddd-ddddddddab03', 1, 2, 'V1-P2', 'harvested', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc17', '44444444-4444-4444-4444-444444444402', 'dddddddd-dddd-dddd-dddd-ddddddddab03', 1, 3, 'V1-P3', 'harvested', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc18', '44444444-4444-4444-4444-444444444402', 'dddddddd-dddd-dddd-dddd-ddddddddab03', 1, 4, 'V1-P4', 'harvested', null),
  -- Mesa Flor — 2 maintenance
  ('dddddddd-dddd-dddd-dddd-ddddddddbc19', '44444444-4444-4444-4444-444444444403', 'dddddddd-dddd-dddd-dddd-ddddddddab04', 1, 1, 'F1-P1', 'maintenance', null),
  ('dddddddd-dddd-dddd-dddd-ddddddddbc20', '44444444-4444-4444-4444-444444444403', 'dddddddd-dddd-dddd-dddd-ddddddddab04', 1, 2, 'F1-P2', 'maintenance', null)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 33. Sensors (8 across 3 zones)
-- ============================================================

INSERT INTO sensors (id, zone_id, type, brand_model, serial_number, calibration_date, is_active)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffff01', '44444444-4444-4444-4444-444444444401', 'temperature', 'SHT40-AD1B', 'SHT-PROP-T01', CURRENT_DATE - 30, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffff02', '44444444-4444-4444-4444-444444444401', 'humidity', 'SHT40-AD1B', 'SHT-PROP-H01', CURRENT_DATE - 30, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffff03', '44444444-4444-4444-4444-444444444402', 'temperature', 'SHT40-AD1B', 'SHT-VEG-T01', CURRENT_DATE - 15, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffff04', '44444444-4444-4444-4444-444444444402', 'humidity', 'SHT40-AD1B', 'SHT-VEG-H01', CURRENT_DATE - 15, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffff05', '44444444-4444-4444-4444-444444444402', 'co2', 'MH-Z19C', 'CO2-VEG-01', CURRENT_DATE - 15, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffff06', '44444444-4444-4444-4444-444444444403', 'temperature', 'SHT40-AD1B', 'SHT-FLOR-T01', CURRENT_DATE - 10, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffff07', '44444444-4444-4444-4444-444444444403', 'humidity', 'SHT40-AD1B', 'SHT-FLOR-H01', CURRENT_DATE - 10, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffff08', '44444444-4444-4444-4444-444444444403', 'co2', 'MH-Z19C', 'CO2-FLOR-01', CURRENT_DATE - 10, false) -- inactive sensor
ON CONFLICT DO NOTHING;

-- ============================================================
-- 34. Environmental Readings (7 days hourly via generate_series)
-- ============================================================

-- Propagation temperature (~22-25°C)
INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffff01',
  '44444444-4444-4444-4444-444444444401',
  'temperature',
  22 + (random() * 3)::numeric(4,1),
  '°C',
  ts
FROM generate_series(
  CURRENT_TIMESTAMP - interval '7 days',
  CURRENT_TIMESTAMP,
  interval '1 hour'
) AS ts;

-- Propagation humidity (~70-85%)
INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffff02',
  '44444444-4444-4444-4444-444444444401',
  'humidity',
  70 + (random() * 15)::numeric(4,1),
  '%',
  ts
FROM generate_series(
  CURRENT_TIMESTAMP - interval '7 days',
  CURRENT_TIMESTAMP,
  interval '1 hour'
) AS ts;

-- Vegetative temperature (~22-27°C)
INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffff03',
  '44444444-4444-4444-4444-444444444402',
  'temperature',
  22 + (random() * 5)::numeric(4,1),
  '°C',
  ts
FROM generate_series(
  CURRENT_TIMESTAMP - interval '7 days',
  CURRENT_TIMESTAMP,
  interval '1 hour'
) AS ts;

-- Vegetative humidity (~50-65%)
INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffff04',
  '44444444-4444-4444-4444-444444444402',
  'humidity',
  50 + (random() * 15)::numeric(4,1),
  '%',
  ts
FROM generate_series(
  CURRENT_TIMESTAMP - interval '7 days',
  CURRENT_TIMESTAMP,
  interval '1 hour'
) AS ts;

-- Vegetative CO2 (~600-1200 ppm)
INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffff05',
  '44444444-4444-4444-4444-444444444402',
  'co2',
  600 + (random() * 600)::numeric(6,0),
  'ppm',
  ts
FROM generate_series(
  CURRENT_TIMESTAMP - interval '7 days',
  CURRENT_TIMESTAMP,
  interval '1 hour'
) AS ts;

-- Flowering temperature (~20-26°C)
INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffff06',
  '44444444-4444-4444-4444-444444444403',
  'temperature',
  20 + (random() * 6)::numeric(4,1),
  '°C',
  ts
FROM generate_series(
  CURRENT_TIMESTAMP - interval '7 days',
  CURRENT_TIMESTAMP,
  interval '1 hour'
) AS ts;

-- Flowering humidity (~40-60%)
INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffff07',
  '44444444-4444-4444-4444-444444444403',
  'humidity',
  40 + (random() * 20)::numeric(4,1),
  '%',
  ts
FROM generate_series(
  CURRENT_TIMESTAMP - interval '7 days',
  CURRENT_TIMESTAMP,
  interval '1 hour'
) AS ts;

-- ============================================================
-- 35. Alerts (12 across types and severities)
-- ============================================================

INSERT INTO alerts (id, type, severity, entity_type, entity_id, message, triggered_at, acknowledged_by, acknowledged_at, resolved_at, company_id)
VALUES
  -- Pending alerts
  ('dddddddd-dddd-dddd-dddd-ddddddddae01', 'overdue_activity', 'warning', 'scheduled_activity', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee307', 'Fertirrigacion atrasada 2 dias — Batch LOT-GELATO-260201', CURRENT_TIMESTAMP - interval '2 days', null, null, null, '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae02', 'overdue_activity', 'warning', 'scheduled_activity', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee309', 'Fertirrigacion atrasada 1 dia — Batch LOT-GELATO-260201', CURRENT_TIMESTAMP - interval '1 day', null, null, null, '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae03', 'low_inventory', 'warning', 'product', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'CaNO3 bajo stock en Sala Vegetativo A (3500g < 5000g)', CURRENT_TIMESTAMP - interval '3 hours', null, null, null, '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae04', 'expiring_item', 'info', 'inventory_item', 'dddddddd-dddd-dddd-dddd-ddddddda1006', 'Fungicida Cobre vence en 15 dias — Lote FUNG-2025-01', CURRENT_TIMESTAMP - interval '1 day', null, null, null, '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae05', 'quality_failed', 'critical', 'quality_test', 'dddddddd-dddd-dddd-dddd-dddddddcc002', 'Test de microbiologia FALLO — Batch LOT-GELATO-260101 excede mohos', CURRENT_TIMESTAMP - interval '2 days', null, null, null, '11111111-1111-1111-1111-111111111111'),

  -- Acknowledged alerts
  ('dddddddd-dddd-dddd-dddd-ddddddddae06', 'env_out_of_range', 'critical', 'sensor', 'ffffffff-ffff-ffff-ffff-ffffffffff03', 'Temperatura Sala Vegetativo A: 31.2°C (max 28°C)', CURRENT_TIMESTAMP - interval '6 hours', '22222222-2222-2222-2222-222222222202', CURRENT_TIMESTAMP - interval '5 hours', null, '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae07', 'env_out_of_range', 'warning', 'sensor', 'ffffffff-ffff-ffff-ffff-ffffffffff04', 'Humedad Sala Vegetativo A: 38% (min 40%)', CURRENT_TIMESTAMP - interval '4 hours', '22222222-2222-2222-2222-222222222202', CURRENT_TIMESTAMP - interval '3 hours', null, '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae08', 'low_inventory', 'warning', 'product', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', 'Gel Enraizador bajo stock (350mL < umbral ajustado)', CURRENT_TIMESTAMP - interval '12 hours', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '10 hours', null, '11111111-1111-1111-1111-111111111111'),

  -- Resolved alerts
  ('dddddddd-dddd-dddd-dddd-ddddddddae09', 'overdue_activity', 'warning', 'scheduled_activity', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee317', 'Fertirrigacion atrasada — resuelta al marcar como skipped', CURRENT_TIMESTAMP - interval '7 days', '22222222-2222-2222-2222-222222222203', CURRENT_TIMESTAMP - interval '7 days', CURRENT_TIMESTAMP - interval '7 days', '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae10', 'env_out_of_range', 'critical', 'sensor', 'ffffffff-ffff-ffff-ffff-ffffffffff06', 'Temperatura Sala Floracion A: 32.5°C — ventilacion activada', CURRENT_TIMESTAMP - interval '3 days', '22222222-2222-2222-2222-222222222202', CURRENT_TIMESTAMP - interval '3 days', CURRENT_TIMESTAMP - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae11', 'stale_batch', 'info', 'batch', 'cccccccc-cccc-cccc-cccc-cccccccccc05', 'Batch LOT-GELATO-260101-B sin actividad por 10+ dias', CURRENT_TIMESTAMP - interval '5 days', '22222222-2222-2222-2222-222222222202', CURRENT_TIMESTAMP - interval '4 days', CURRENT_TIMESTAMP - interval '3 days', '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-ddddddddae12', 'order_delayed', 'warning', 'production_order', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'Orden OP-2026-003 atrasada vs plan — fase vegetativo', CURRENT_TIMESTAMP - interval '2 days', '22222222-2222-2222-2222-222222222204', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP - interval '12 hours', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 36. Overhead Costs (5 entries)
-- ============================================================

INSERT INTO overhead_costs (id, facility_id, zone_id, cost_type, description, amount, currency, period_start, period_end, allocation_basis, notes)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddd0001', '33333333-3333-3333-3333-333333333301', null, 'energy', 'Electricidad Febrero 2026', 4500000, 'COP', '2026-02-01', '2026-02-28', 'per_m2', 'Incluye iluminacion, HVAC, bombas'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0002', '33333333-3333-3333-3333-333333333301', null, 'rent', 'Arriendo bodega Febrero 2026', 8000000, 'COP', '2026-02-01', '2026-02-28', 'per_m2', null),
  ('dddddddd-dddd-dddd-dddd-dddddddd0003', '33333333-3333-3333-3333-333333333301', null, 'labor_fixed', 'Nomina operarios Febrero 2026', 12000000, 'COP', '2026-02-01', '2026-02-28', 'per_plant', '3 operarios tiempo completo'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0004', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444403', 'maintenance', 'Mantenimiento HVAC Floracion', 1200000, 'COP', '2026-02-01', '2026-02-28', 'per_zone', 'Servicio preventivo mensual'),
  ('dddddddd-dddd-dddd-dddd-dddddddd0005', '33333333-3333-3333-3333-333333333301', null, 'insurance', 'Poliza todo riesgo Q1 2026', 3600000, 'COP', '2026-01-01', '2026-03-31', 'even_split', 'Cobertura incendio, robo, cosecha')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 37. Activity Resources (for executed activities)
-- ============================================================

INSERT INTO activity_resources (id, activity_id, product_id, quantity_planned, quantity_actual, unit_id, cost_total)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee501', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee401', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 80, 80, '99999999-9999-9999-9999-999999999901', 6400),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee502', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee403', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 80, 80, '99999999-9999-9999-9999-999999999901', 6400),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee503', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee405', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 80, 85, '99999999-9999-9999-9999-999999999901', 6800)
ON CONFLICT DO NOTHING;
