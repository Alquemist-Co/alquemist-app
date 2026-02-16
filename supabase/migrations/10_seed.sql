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

-- Production order
-- order: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01

-- Batch
-- batch: cccccccc-cccc-cccc-cccc-cccccccccc01

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

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
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
    now(), now()
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
