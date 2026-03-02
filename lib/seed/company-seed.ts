import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type AdminClient = SupabaseClient<Database>

function generateSeedIds() {
  const uuid = () => crypto.randomUUID()
  return {
    // Resource categories
    catVegetal: uuid(),
    catQuimicos: uuid(),
    catEquipos: uuid(),
    catSustratos: uuid(),
    // Units of measure
    unitG: uuid(),
    unitKg: uuid(),
    unitL: uuid(),
    unitMl: uuid(),
    unitUnd: uuid(),
    // Activity types
    atypeRiego: uuid(),
    atypeFert: uuid(),
    atypePoda: uuid(),
    atypeCosecha: uuid(),
    atypeInspeccion: uuid(),
    // Crop types
    cropCannabis: uuid(),
    cropFlores: uuid(),
    // Production phases (cannabis)
    phaseGerm: uuid(),
    phaseVeg: uuid(),
    phaseFlor: uuid(),
    phaseCosecha: uuid(),
    phaseSecado: uuid(),
    // Production phases (flores)
    phaseFSiem: uuid(),
    phaseFCrec: uuid(),
    phaseFFlor: uuid(),
    phaseFCos: uuid(),
    // Cultivars
    cultOgKush: uuid(),
    cultBlueD: uuid(),
    // Activity templates
    tmplRiegoVeg: uuid(),
    tmplFertFlor: uuid(),
    tmplInspDiaria: uuid(),
    // Cultivation schedules
    schedOg: uuid(),
    // Regulatory doc types
    rdtCoa: uuid(),
    rdtSds: uuid(),
    rdtPhyto: uuid(),
    // Suppliers
    supSemillas: uuid(),
    supQuimicos: uuid(),
    supBiocontrol: uuid(),
    supSustratos: uuid(),
    // Products
    prodSemOgK: uuid(),
    prodSemBluD: uuid(),
    prodFlorOgK: uuid(),
    prodFlorBluD: uuid(),
    prodFertBase: uuid(),
    prodFertFlor: uuid(),
    prodSustCoco: uuid(),
    prodSustPerlita: uuid(),
    prodBioNeem: uuid(),
    prodBioTricho: uuid(),
    // Facilities
    facBodega: uuid(),
    facInvernadero: uuid(),
    // Zones
    zonAlmacen: uuid(),
    zonSecado: uuid(),
    zonPropagacion: uuid(),
    zonVegetativo: uuid(),
    zonFloracion: uuid(),
    zonProcesado: uuid(),
    // Zone structures
    zsRackAlmacen1: uuid(),
    zsRackAlmacen2: uuid(),
    zsBenchProp: uuid(),
    zsBenchVeg1: uuid(),
    zsBenchVeg2: uuid(),
    zsBenchFlor1: uuid(),
    zsBenchFlor2: uuid(),
    zsBenchFlor3: uuid(),
  }
}

type SeedIds = ReturnType<typeof generateSeedIds>

async function seedResourceCategories(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('resource_categories').insert([
    { id: ids.catVegetal, company_id: companyId, code: 'MAT_VEG', name: 'Material Vegetal', is_consumable: true, is_transformable: true, default_lot_tracking: 'required' as const },
    { id: ids.catQuimicos, company_id: companyId, code: 'QUIMICOS', name: 'Químicos y Fertil.', is_consumable: true, is_transformable: false, default_lot_tracking: 'required' as const },
    { id: ids.catEquipos, company_id: companyId, code: 'EQUIPOS', name: 'Equipos', is_consumable: false, is_transformable: false, default_lot_tracking: 'none' as const },
    { id: ids.catSustratos, company_id: companyId, code: 'SUSTRATO', name: 'Sustratos', is_consumable: true, is_transformable: false, default_lot_tracking: 'optional' as const },
  ])
  if (error) throw error
}

async function seedUnitsOfMeasure(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error: insertError } = await admin.from('units_of_measure').insert([
    { id: ids.unitG, company_id: companyId, code: 'g', name: 'Gramos', dimension: 'mass' as const, to_base_factor: 1 },
    { id: ids.unitKg, company_id: companyId, code: 'kg', name: 'Kilogramos', dimension: 'mass' as const, to_base_factor: 1000 },
    { id: ids.unitL, company_id: companyId, code: 'L', name: 'Litros', dimension: 'volume' as const, to_base_factor: 1 },
    { id: ids.unitMl, company_id: companyId, code: 'ml', name: 'Mililitros', dimension: 'volume' as const, to_base_factor: 0.001 },
    { id: ids.unitUnd, company_id: companyId, code: 'und', name: 'Unidades', dimension: 'count' as const, to_base_factor: 1 },
  ])
  if (insertError) throw insertError
}

async function seedActivityTypes(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('activity_types').insert([
    { id: ids.atypeRiego, company_id: companyId, name: 'Riego', category: 'mantenimiento' as const },
    { id: ids.atypeFert, company_id: companyId, name: 'Fertilización', category: 'nutricion' as const },
    { id: ids.atypePoda, company_id: companyId, name: 'Poda', category: 'mantenimiento' as const },
    { id: ids.atypeCosecha, company_id: companyId, name: 'Cosecha', category: 'produccion' as const },
    { id: ids.atypeInspeccion, company_id: companyId, name: 'Inspección', category: 'control' as const },
  ])
  if (error) throw error
}

async function seedCropTypes(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('crop_types').insert([
    { id: ids.cropCannabis, company_id: companyId, code: 'CANN', name: 'Cannabis', scientific_name: 'Cannabis sativa L.', category: 'annual' as const, regulatory_framework: 'Resolución 227/2022 MinJusticia' },
    { id: ids.cropFlores, company_id: companyId, code: 'FLOR', name: 'Flores', scientific_name: 'Varios', category: 'perennial' as const, regulatory_framework: null },
  ])
  if (error) throw error
}

async function seedRegulatoryDocTypes(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('regulatory_doc_types').insert([
    {
      id: ids.rdtCoa, company_id: companyId, code: 'COA', name: 'Certificado de Análisis (CoA)',
      description: 'Documento que certifica los resultados de análisis de laboratorio para un batch de producto.',
      category: 'quality' as const, valid_for_days: 365, issuing_authority: 'Lab acreditado', sort_order: 0,
      required_fields: {
        fields: [
          { key: 'lab_name', label: 'Nombre del laboratorio', type: 'text', required: true },
          { key: 'sample_date', label: 'Fecha de muestreo', type: 'date', required: true },
          { key: 'analysis_type', label: 'Tipo de análisis', type: 'select', required: true, options: ['Potencia', 'Contaminantes', 'Residuos', 'Completo'] },
          { key: 'overall_pass', label: '¿Resultado aprobado?', type: 'boolean', required: true },
          { key: 'observations', label: 'Observaciones', type: 'textarea', required: false, placeholder: 'Notas adicionales sobre el análisis' },
        ],
      },
    },
    {
      id: ids.rdtSds, company_id: companyId, code: 'SDS', name: 'Hoja de Seguridad (SDS)',
      description: 'Safety Data Sheet para productos químicos utilizados.',
      category: 'safety' as const, valid_for_days: null, issuing_authority: 'Fabricante', sort_order: 1,
      required_fields: {
        fields: [
          { key: 'manufacturer', label: 'Fabricante', type: 'text', required: true },
          { key: 'cas_number', label: 'Número CAS', type: 'text', required: false, placeholder: 'Ej: 7732-18-5' },
          { key: 'hazard_class', label: 'Clase de peligro', type: 'select', required: true, options: ['Inflamable', 'Corrosivo', 'Tóxico', 'Irritante', 'No peligroso'] },
          { key: 'revision_date', label: 'Fecha de revisión', type: 'date', required: true },
        ],
      },
    },
    {
      id: ids.rdtPhyto, company_id: companyId, code: 'PHYTO', name: 'Certificado Fitosanitario',
      description: 'Documento que certifica que el material vegetal cumple con requisitos fitosanitarios para transporte.',
      category: 'transport' as const, valid_for_days: 30, issuing_authority: 'ICA', sort_order: 2,
      required_fields: {
        fields: [
          { key: 'inspector_name', label: 'Nombre del inspector', type: 'text', required: true },
          { key: 'inspection_date', label: 'Fecha de inspección', type: 'date', required: true },
          { key: 'destination', label: 'Destino', type: 'text', required: true, placeholder: 'Ciudad o departamento de destino' },
          { key: 'quantity_kg', label: 'Cantidad (kg)', type: 'number', required: true },
          { key: 'pest_free', label: '¿Libre de plagas?', type: 'boolean', required: true },
        ],
      },
    },
  ])
  if (error) throw error
}

async function seedProductionPhases(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('production_phases').insert([
    // Cannabis phases
    { id: ids.phaseGerm, crop_type_id: ids.cropCannabis, code: 'GERM', name: 'Germinación', sort_order: 1, default_duration_days: 7, is_transformation: false, can_be_entry_point: true, can_be_exit_point: false },
    { id: ids.phaseVeg, crop_type_id: ids.cropCannabis, code: 'VEG', name: 'Vegetativo', sort_order: 2, default_duration_days: 28, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.phaseFlor, crop_type_id: ids.cropCannabis, code: 'FLOR', name: 'Floración', sort_order: 3, default_duration_days: 63, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.phaseCosecha, crop_type_id: ids.cropCannabis, code: 'COSECHA', name: 'Cosecha', sort_order: 4, default_duration_days: 3, is_transformation: true, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.phaseSecado, crop_type_id: ids.cropCannabis, code: 'SECADO', name: 'Secado/Curado', sort_order: 5, default_duration_days: 21, is_transformation: true, can_be_entry_point: false, can_be_exit_point: true },
    // Flores phases
    { id: ids.phaseFSiem, crop_type_id: ids.cropFlores, code: 'SIEM', name: 'Siembra', sort_order: 1, default_duration_days: 14, is_transformation: false, can_be_entry_point: true, can_be_exit_point: false },
    { id: ids.phaseFCrec, crop_type_id: ids.cropFlores, code: 'CREC', name: 'Crecimiento', sort_order: 2, default_duration_days: 45, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.phaseFFlor, crop_type_id: ids.cropFlores, code: 'FLOR', name: 'Floración', sort_order: 3, default_duration_days: 30, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.phaseFCos, crop_type_id: ids.cropFlores, code: 'COS', name: 'Cosecha', sort_order: 4, default_duration_days: 5, is_transformation: true, can_be_entry_point: false, can_be_exit_point: true },
  ])
  if (error) throw error
}

async function seedPhaseDependencies(admin: AdminClient, ids: SeedIds) {
  const updates = [
    { id: ids.phaseVeg, depends_on_phase_id: ids.phaseGerm },
    { id: ids.phaseFlor, depends_on_phase_id: ids.phaseVeg },
    { id: ids.phaseCosecha, depends_on_phase_id: ids.phaseFlor },
    { id: ids.phaseSecado, depends_on_phase_id: ids.phaseCosecha },
  ]
  for (const u of updates) {
    const { error } = await admin.from('production_phases').update({ depends_on_phase_id: u.depends_on_phase_id }).eq('id', u.id)
    if (error) throw error
  }
}

async function seedUnitBaseUnits(admin: AdminClient, ids: SeedIds) {
  const updates = [
    { id: ids.unitKg, base_unit_id: ids.unitG },
    { id: ids.unitMl, base_unit_id: ids.unitL },
  ]
  for (const u of updates) {
    const { error } = await admin.from('units_of_measure').update({ base_unit_id: u.base_unit_id }).eq('id', u.id)
    if (error) throw error
  }
}

async function seedCultivars(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('cultivars').insert([
    {
      id: ids.cultOgKush, crop_type_id: ids.cropCannabis, code: 'OGK', name: 'OG Kush',
      breeder: 'DNA Genetics', genetics: 'Indica dominante (75/25)',
      default_cycle_days: 122, expected_yield_per_plant_g: 450, expected_dry_ratio: 0.22,
      quality_grade: 'Premium', density_plants_per_m2: 9,
      phase_durations: {
        [ids.phaseGerm]: 7, [ids.phaseVeg]: 28, [ids.phaseFlor]: 63,
        [ids.phaseCosecha]: 3, [ids.phaseSecado]: 21,
      },
      target_profile: { thc: '18-24%', cbd: '<1%', terpene_dominant: 'Myrcene' },
      optimal_conditions: {
        temp: { min: 20, max: 28, unit: '°C' },
        humidity: { min: 40, max: 60, unit: '%' },
      },
    },
    {
      id: ids.cultBlueD, crop_type_id: ids.cropCannabis, code: 'BLD', name: 'Blue Dream',
      breeder: 'Humboldt Seeds', genetics: 'Sativa dominante (60/40)',
      default_cycle_days: 130, expected_yield_per_plant_g: 550, expected_dry_ratio: 0.20,
      quality_grade: 'AAA', density_plants_per_m2: 7,
      phase_durations: {
        [ids.phaseGerm]: 7, [ids.phaseVeg]: 35, [ids.phaseFlor]: 67,
        [ids.phaseCosecha]: 3, [ids.phaseSecado]: 18,
      },
      target_profile: { thc: '17-24%', cbd: '1-2%', terpene_dominant: 'Pinene' },
      optimal_conditions: null,
    },
  ])
  if (error) throw error
}

async function seedPhaseProductFlows(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('phase_product_flows').insert([
    { cultivar_id: ids.cultOgKush, phase_id: ids.phaseCosecha, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.phaseCosecha, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 70, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.phaseCosecha, direction: 'output' as const, product_role: 'waste' as const, product_category_id: ids.catVegetal, expected_yield_pct: 30, unit_id: ids.unitG, is_required: true, sort_order: 1 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.phaseSecado, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.phaseSecado, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 22, unit_id: ids.unitG, is_required: true, sort_order: 0 },
  ])
  if (error) throw error
}

async function seedActivityTemplates(admin: AdminClient, companyId: string, ids: SeedIds) {
  // Templates
  const { error: tmplError } = await admin.from('activity_templates').insert([
    { id: ids.tmplRiegoVeg, company_id: companyId, code: 'RIEGO_VEG', activity_type_id: ids.atypeRiego, name: 'Riego fase vegetativa', frequency: 'daily' as const, estimated_duration_min: 30, trigger_day_from: 8, trigger_day_to: 35, triggers_transformation: false },
    { id: ids.tmplFertFlor, company_id: companyId, code: 'FERT_FLOR', activity_type_id: ids.atypeFert, name: 'Fertilización floración', frequency: 'weekly' as const, estimated_duration_min: 45, trigger_day_from: 36, trigger_day_to: 98, triggers_transformation: false },
    { id: ids.tmplInspDiaria, company_id: companyId, code: 'INSP_DIA', activity_type_id: ids.atypeInspeccion, name: 'Inspección diaria', frequency: 'daily' as const, estimated_duration_min: 20, trigger_day_from: 1, trigger_day_to: 122, triggers_transformation: false },
  ])
  if (tmplError) throw tmplError

  // Template ↔ Phase associations
  const { error: phasesError } = await admin.from('activity_template_phases').insert([
    { template_id: ids.tmplRiegoVeg, phase_id: ids.phaseVeg },
    { template_id: ids.tmplFertFlor, phase_id: ids.phaseFlor },
    { template_id: ids.tmplInspDiaria, phase_id: ids.phaseGerm },
    { template_id: ids.tmplInspDiaria, phase_id: ids.phaseVeg },
    { template_id: ids.tmplInspDiaria, phase_id: ids.phaseFlor },
  ])
  if (phasesError) throw phasesError

  // Template resources
  const { error: resError } = await admin.from('activity_template_resources').insert([
    { template_id: ids.tmplRiegoVeg, quantity: 2.5, quantity_basis: 'per_plant' as const, sort_order: 0, notes: 'Agua con pH 6.0-6.5' },
    { template_id: ids.tmplFertFlor, quantity: 1.0, quantity_basis: 'per_L_solution' as const, sort_order: 0, notes: 'Flora Bloom 3ml/L' },
  ])
  if (resError) throw resError

  // Template checklist
  const { error: checkError } = await admin.from('activity_template_checklist').insert([
    { template_id: ids.tmplRiegoVeg, step_order: 1, instruction: 'Verificar pH del agua (6.0-6.5)', is_critical: true, requires_photo: false },
    { template_id: ids.tmplRiegoVeg, step_order: 2, instruction: 'Verificar EC del agua (1.2-1.8)', is_critical: true, requires_photo: false },
    { template_id: ids.tmplRiegoVeg, step_order: 3, instruction: 'Regar hasta 20% de runoff', is_critical: false, requires_photo: false },
    { template_id: ids.tmplInspDiaria, step_order: 1, instruction: 'Revisar color de hojas', is_critical: false, requires_photo: true },
    { template_id: ids.tmplInspDiaria, step_order: 2, instruction: 'Verificar presencia de plagas', is_critical: true, requires_photo: true },
    { template_id: ids.tmplInspDiaria, step_order: 3, instruction: 'Medir temperatura y humedad', is_critical: true, requires_photo: false },
  ])
  if (checkError) throw checkError
}

async function seedCultivationSchedules(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('cultivation_schedules').insert({
    id: ids.schedOg, company_id: companyId, name: 'OG Kush Standard 122d',
    cultivar_id: ids.cultOgKush, total_days: 122,
    phase_config: [
      { phase_id: ids.phaseGerm, duration_days: 7, templates: [{ template_id: ids.tmplInspDiaria }] },
      { phase_id: ids.phaseVeg, duration_days: 28, templates: [{ template_id: ids.tmplRiegoVeg }, { template_id: ids.tmplInspDiaria }] },
      { phase_id: ids.phaseFlor, duration_days: 63, templates: [{ template_id: ids.tmplFertFlor }, { template_id: ids.tmplInspDiaria }] },
      { phase_id: ids.phaseCosecha, duration_days: 3, templates: [] },
      { phase_id: ids.phaseSecado, duration_days: 21, templates: [] },
    ],
  })
  if (error) throw error
}

async function seedRegulatoryRequirements(admin: AdminClient, ids: SeedIds) {
  const { error: prodError } = await admin.from('product_regulatory_requirements').insert([
    { category_id: ids.catVegetal, doc_type_id: ids.rdtCoa, is_mandatory: true, applies_to_scope: 'per_batch' as const, frequency: 'per_production' as const, notes: 'CoA requerido para cada batch de producción', sort_order: 0 },
    { category_id: ids.catVegetal, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Fitosanitario requerido para movilización de material vegetal', sort_order: 1 },
    { category_id: ids.catQuimicos, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante, se obtiene una vez', sort_order: 2 },
  ])
  if (prodError) throw prodError

  const { error: shipError } = await admin.from('shipment_doc_requirements').insert([
    { category_id: ids.catVegetal, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_when: 'always' as const, notes: 'Siempre requerido para transporte de material vegetal', sort_order: 0 },
    { category_id: ids.catQuimicos, doc_type_id: ids.rdtSds, is_mandatory: true, applies_when: 'always' as const, notes: 'SDS debe acompañar envíos de químicos', sort_order: 1 },
    { category_id: ids.catVegetal, doc_type_id: ids.rdtCoa, is_mandatory: false, applies_when: 'interstate' as const, notes: 'CoA recomendado para envíos interdepartamentales', sort_order: 2 },
  ])
  if (shipError) throw shipError
}

async function seedSuppliers(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('suppliers').insert([
    {
      id: ids.supSemillas, company_id: companyId, name: 'Genética del Pacífico',
      contact_info: { contact_name: 'Carlos Mendoza', email: 'ventas@geneticapacifico.co', phone: '+57 310 555 0101', city: 'Cali' },
      payment_terms: 'Contado',
    },
    {
      id: ids.supQuimicos, company_id: companyId, name: 'AgroNutri Colombia',
      contact_info: { contact_name: 'Lucía Herrera', email: 'pedidos@agronutri.co', phone: '+57 311 555 0202', city: 'Bogotá' },
      payment_terms: 'Crédito 30 días',
    },
    {
      id: ids.supBiocontrol, company_id: companyId, name: 'BioProtección Andina',
      contact_info: { contact_name: 'Andrés Vargas', email: 'info@bioproteccion.co', phone: '+57 312 555 0303', city: 'Medellín' },
      payment_terms: 'Crédito 15 días',
    },
    {
      id: ids.supSustratos, company_id: companyId, name: 'Sustratos del Valle',
      contact_info: { contact_name: 'María Jiménez', email: 'ventas@sustratosvalle.co', phone: '+57 315 555 0404', city: 'Palmira' },
      payment_terms: 'Contado',
    },
  ])
  if (error) throw error
}

async function seedFacilities(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('facilities').insert([
    {
      id: ids.facBodega, company_id: companyId, name: 'Bodega Central',
      type: 'indoor_warehouse' as const, total_footprint_m2: 500,
      address: 'Zona Industrial, Lote 15, Cali, Valle del Cauca',
      latitude: 3.4516, longitude: -76.5320,
    },
    {
      id: ids.facInvernadero, company_id: companyId, name: 'Invernadero Principal',
      type: 'greenhouse' as const, total_footprint_m2: 2000,
      address: 'Finca La Esperanza, Km 5 vía Palmira, Valle del Cauca',
      latitude: 3.5394, longitude: -76.3036,
    },
  ])
  if (error) throw error
}

async function seedProducts(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('products').insert([
    // Seeds per cultivar (purchased, material vegetal)
    { id: ids.prodSemOgK, company_id: companyId, sku: 'SEM-OGK-001', name: 'Semillas OG Kush', category_id: ids.catVegetal, default_unit_id: ids.unitUnd, cultivar_id: ids.cultOgKush, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supSemillas, default_price: 15000, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodSemBluD, company_id: companyId, sku: 'SEM-BLD-001', name: 'Semillas Blue Dream', category_id: ids.catVegetal, default_unit_id: ids.unitUnd, cultivar_id: ids.cultBlueD, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supSemillas, default_price: 18000, price_currency: 'COP', requires_regulatory_docs: true },
    // Dried flower outputs (produced, no supplier)
    { id: ids.prodFlorOgK, company_id: companyId, sku: 'FLOR-OGK-001', name: 'Flor Seca OG Kush', category_id: ids.catVegetal, default_unit_id: ids.unitG, cultivar_id: ids.cultOgKush, procurement_type: 'produced' as const, lot_tracking: 'required' as const, default_yield_pct: 22, requires_regulatory_docs: true },
    { id: ids.prodFlorBluD, company_id: companyId, sku: 'FLOR-BLD-001', name: 'Flor Seca Blue Dream', category_id: ids.catVegetal, default_unit_id: ids.unitG, cultivar_id: ids.cultBlueD, procurement_type: 'produced' as const, lot_tracking: 'required' as const, default_yield_pct: 20, requires_regulatory_docs: true },
    // Fertilizers (purchased, químicos)
    { id: ids.prodFertBase, company_id: companyId, sku: 'FERT-BASE-001', name: 'Fertilizante Base Crecimiento', category_id: ids.catQuimicos, default_unit_id: ids.unitL, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supQuimicos, default_price: 85000, price_currency: 'COP', requires_regulatory_docs: true, phi_days: 0, rei_hours: 4 },
    { id: ids.prodFertFlor, company_id: companyId, sku: 'FERT-FLOR-001', name: 'Fertilizante Floración PK', category_id: ids.catQuimicos, default_unit_id: ids.unitL, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supQuimicos, default_price: 95000, price_currency: 'COP', requires_regulatory_docs: true, phi_days: 14, rei_hours: 4 },
    // Substrates (purchased, sustratos)
    { id: ids.prodSustCoco, company_id: companyId, sku: 'SUST-COCO-001', name: 'Fibra de Coco Prensada', category_id: ids.catSustratos, default_unit_id: ids.unitKg, procurement_type: 'purchased' as const, lot_tracking: 'optional' as const, preferred_supplier_id: ids.supSustratos, default_price: 25000, price_currency: 'COP', requires_regulatory_docs: false },
    { id: ids.prodSustPerlita, company_id: companyId, sku: 'SUST-PERL-001', name: 'Perlita Expandida', category_id: ids.catSustratos, default_unit_id: ids.unitKg, procurement_type: 'purchased' as const, lot_tracking: 'optional' as const, preferred_supplier_id: ids.supSustratos, default_price: 18000, price_currency: 'COP', requires_regulatory_docs: false },
    // Biocontrol (purchased, químicos)
    { id: ids.prodBioNeem, company_id: companyId, sku: 'BIO-NEEM-001', name: 'Aceite de Neem Concentrado', category_id: ids.catQuimicos, default_unit_id: ids.unitL, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supBiocontrol, default_price: 120000, price_currency: 'COP', requires_regulatory_docs: true, phi_days: 7, rei_hours: 12 },
    { id: ids.prodBioTricho, company_id: companyId, sku: 'BIO-TRICHO-001', name: 'Trichoderma harzianum', category_id: ids.catQuimicos, default_unit_id: ids.unitG, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supBiocontrol, default_price: 65000, price_currency: 'COP', requires_regulatory_docs: true, phi_days: 0, rei_hours: 0 },
  ])
  if (error) throw error
}

async function seedZones(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('zones').insert([
    // Bodega Central
    { id: ids.zonAlmacen, facility_id: ids.facBodega, name: 'Almacén General', purpose: 'storage' as const, environment: 'indoor_controlled' as const, area_m2: 200, height_m: 4.5, climate_config: { temp_min: 18, temp_max: 22, humidity_min: 45, humidity_max: 55 } },
    { id: ids.zonSecado, facility_id: ids.facBodega, name: 'Sala de Secado y Curado', purpose: 'drying' as const, environment: 'indoor_controlled' as const, area_m2: 80, height_m: 3.0, climate_config: { temp_min: 18, temp_max: 22, humidity_min: 55, humidity_max: 62 } },
    // Invernadero Principal
    { id: ids.zonPropagacion, facility_id: ids.facInvernadero, name: 'Propagación', purpose: 'propagation' as const, environment: 'greenhouse' as const, area_m2: 150, height_m: 3.0, climate_config: { temp_min: 22, temp_max: 28, humidity_min: 70, humidity_max: 85 } },
    { id: ids.zonVegetativo, facility_id: ids.facInvernadero, name: 'Vegetativo', purpose: 'vegetation' as const, environment: 'greenhouse' as const, area_m2: 400, height_m: 3.5, climate_config: { temp_min: 22, temp_max: 28, humidity_min: 55, humidity_max: 70 } },
    { id: ids.zonFloracion, facility_id: ids.facInvernadero, name: 'Floración', purpose: 'flowering' as const, environment: 'greenhouse' as const, area_m2: 800, height_m: 3.5, climate_config: { temp_min: 20, temp_max: 26, humidity_min: 40, humidity_max: 55 } },
    { id: ids.zonProcesado, facility_id: ids.facInvernadero, name: 'Procesado', purpose: 'processing' as const, environment: 'greenhouse' as const, area_m2: 100, height_m: 3.0, climate_config: { temp_min: 18, temp_max: 22, humidity_min: 45, humidity_max: 55 } },
  ])
  if (error) throw error
}

async function seedProductRegReqs(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('product_regulatory_requirements').insert([
    // Seeds → phytosanitary certificate per shipment
    { product_id: ids.prodSemOgK, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Certificado fitosanitario requerido para cada lote de semillas importadas', sort_order: 0 },
    { product_id: ids.prodSemBluD, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Certificado fitosanitario requerido para cada lote de semillas importadas', sort_order: 0 },
    // Dried flower → CoA per batch
    { product_id: ids.prodFlorOgK, doc_type_id: ids.rdtCoa, is_mandatory: true, applies_to_scope: 'per_batch' as const, frequency: 'per_production' as const, notes: 'CoA obligatorio para cada batch de flor seca', sort_order: 0 },
    { product_id: ids.prodFlorBluD, doc_type_id: ids.rdtCoa, is_mandatory: true, applies_to_scope: 'per_batch' as const, frequency: 'per_production' as const, notes: 'CoA obligatorio para cada batch de flor seca', sort_order: 0 },
    // Chemicals → SDS once
    { product_id: ids.prodFertBase, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante para fertilizante base', sort_order: 0 },
    { product_id: ids.prodFertFlor, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante para fertilizante de floración', sort_order: 0 },
    { product_id: ids.prodBioNeem, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante para aceite de neem concentrado', sort_order: 0 },
  ])
  if (error) throw error
}

async function seedZoneStructures(admin: AdminClient, ids: SeedIds) {
  // Note: max_positions is GENERATED ALWAYS — must NOT be in payload
  const { error } = await admin.from('zone_structures').insert([
    // Storage: 2 fixed racks
    { id: ids.zsRackAlmacen1, zone_id: ids.zonAlmacen, name: 'Rack A1', type: 'fixed_rack' as const, length_m: 6.0, width_m: 1.2, num_levels: 4, positions_per_level: 20, is_mobile: false, spacing_cm: 30 },
    { id: ids.zsRackAlmacen2, zone_id: ids.zonAlmacen, name: 'Rack A2', type: 'fixed_rack' as const, length_m: 6.0, width_m: 1.2, num_levels: 4, positions_per_level: 20, is_mobile: false, spacing_cm: 30 },
    // Propagation: 1 rolling bench
    { id: ids.zsBenchProp, zone_id: ids.zonPropagacion, name: 'Mesa Propagación 1', type: 'rolling_bench' as const, length_m: 12.0, width_m: 1.5, num_levels: 1, positions_per_level: 200, is_mobile: true, spacing_cm: 10, pot_size_l: 0.25 },
    // Vegetation: 2 rolling benches
    { id: ids.zsBenchVeg1, zone_id: ids.zonVegetativo, name: 'Mesa Veg 1', type: 'rolling_bench' as const, length_m: 15.0, width_m: 1.8, num_levels: 1, positions_per_level: 120, is_mobile: true, spacing_cm: 20, pot_size_l: 3.5 },
    { id: ids.zsBenchVeg2, zone_id: ids.zonVegetativo, name: 'Mesa Veg 2', type: 'rolling_bench' as const, length_m: 15.0, width_m: 1.8, num_levels: 1, positions_per_level: 120, is_mobile: true, spacing_cm: 20, pot_size_l: 3.5 },
    // Flowering: 3 rolling benches
    { id: ids.zsBenchFlor1, zone_id: ids.zonFloracion, name: 'Mesa Flor 1', type: 'rolling_bench' as const, length_m: 18.0, width_m: 1.8, num_levels: 1, positions_per_level: 90, is_mobile: true, spacing_cm: 30, pot_size_l: 11.0 },
    { id: ids.zsBenchFlor2, zone_id: ids.zonFloracion, name: 'Mesa Flor 2', type: 'rolling_bench' as const, length_m: 18.0, width_m: 1.8, num_levels: 1, positions_per_level: 90, is_mobile: true, spacing_cm: 30, pot_size_l: 11.0 },
    { id: ids.zsBenchFlor3, zone_id: ids.zonFloracion, name: 'Mesa Flor 3', type: 'rolling_bench' as const, length_m: 18.0, width_m: 1.8, num_levels: 1, positions_per_level: 90, is_mobile: true, spacing_cm: 30, pot_size_l: 11.0 },
  ])
  if (error) throw error
}

/**
 * Seeds a newly created company with default catalog data (categories, units,
 * activity types, crop types, phases, cultivars, templates, schedules,
 * regulatory config) plus operational data (suppliers, products, facilities,
 * zones, zone structures).
 *
 * Idempotent: skips if the company already has resource_categories.
 * Never throws: logs errors but lets signup succeed regardless.
 */
export async function seedCompanyData(
  admin: AdminClient,
  companyId: string,
  _userId: string,
): Promise<void> {
  try {
    // Idempotency guard — skip if company already has catalog data
    const { count } = await admin
      .from('resource_categories')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    if (count && count > 0) return

    const ids = generateSeedIds()

    // Layer 1: Independent tables (parallel)
    await Promise.all([
      seedResourceCategories(admin, companyId, ids),
      seedUnitsOfMeasure(admin, companyId, ids),
      seedActivityTypes(admin, companyId, ids),
      seedCropTypes(admin, companyId, ids),
      seedRegulatoryDocTypes(admin, companyId, ids),
    ])

    // Layer 2: base_unit references + production phases (parallel)
    await Promise.all([
      seedUnitBaseUnits(admin, ids),
      seedProductionPhases(admin, ids),
    ])

    // Layer 3: Phase dependencies + regulatory requirements (parallel)
    await Promise.all([
      seedPhaseDependencies(admin, ids),
      seedRegulatoryRequirements(admin, ids),
    ])

    // Layer 4: Cultivars (references phases for phase_durations JSONB)
    await seedCultivars(admin, ids)

    // Layer 5: Phase product flows + activity templates (parallel)
    await Promise.all([
      seedPhaseProductFlows(admin, ids),
      seedActivityTemplates(admin, companyId, ids),
    ])

    // Layer 6: Cultivation schedules (references phases + templates)
    await seedCultivationSchedules(admin, companyId, ids)

    // Layer 7: Suppliers + Facilities (both only need company_id, parallel)
    await Promise.all([
      seedSuppliers(admin, companyId, ids),
      seedFacilities(admin, companyId, ids),
    ])

    // Layer 8: Products + Zones (parallel)
    // Products need: categories (L1), units (L1), cultivars (L4), suppliers (L7)
    // Zones need: facilities (L7)
    await Promise.all([
      seedProducts(admin, companyId, ids),
      seedZones(admin, ids),
    ])

    // Layer 9: Product regulatory reqs + Zone structures (parallel)
    // Product reg reqs need: products (L8), doc_types (L1)
    // Zone structures need: zones (L8) — triggers cascade to update zone + facility totals
    await Promise.all([
      seedProductRegReqs(admin, ids),
      seedZoneStructures(admin, ids),
    ])
  } catch (error) {
    console.error('[seed] Failed to seed company data:', error)
  }
}
