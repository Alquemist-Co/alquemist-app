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
    catSemillas: uuid(),
    catEmpaques: uuid(),
    // Units of measure
    unitG: uuid(),
    unitKg: uuid(),
    unitL: uuid(),
    unitMl: uuid(),
    unitUnd: uuid(),
    unitTon: uuid(),
    unitHa: uuid(),
    unitArroba: uuid(),
    // Activity types
    atypeRiego: uuid(),
    atypeFert: uuid(),
    atypePoda: uuid(),
    atypeCosecha: uuid(),
    atypeInspeccion: uuid(),
    atypeFitosanitario: uuid(),
    atypeBeneficio: uuid(),
    atypePolinizacion: uuid(),
    // Crop types
    cropCannabis: uuid(),
    cropCafe: uuid(),
    cropPalma: uuid(),
    // Production phases (cannabis)
    pcGerm: uuid(),
    pcPlantula: uuid(),
    pcVeg: uuid(),
    pcFlor: uuid(),
    pcCosecha: uuid(),
    pcSecado: uuid(),
    pcCurado: uuid(),
    // Production phases (café)
    pfAlmacigo: uuid(),
    pfLevante: uuid(),
    pfFloracion: uuid(),
    pfDesarrollo: uuid(),
    pfRecoleccion: uuid(),
    pfBeneficio: uuid(),
    pfSecadoC: uuid(),
    // Production phases (palma)
    ppPrevivero: uuid(),
    ppVivero: uuid(),
    ppInmaduro: uuid(),
    ppProductivo: uuid(),
    ppCorte: uuid(),
    ppExtraccion: uuid(),
    // Cultivars
    cultOgKush: uuid(),
    cultBlueD: uuid(),
    cultWhiteW: uuid(),
    cultCastillo: uuid(),
    cultGeisha: uuid(),
    cultCaturra: uuid(),
    cultTenera: uuid(),
    cultOxg: uuid(),
    // Activity templates — cannabis
    tmplRiegoCann: uuid(),
    tmplFertCann: uuid(),
    tmplInspCann: uuid(),
    // Activity templates — café
    tmplRiegoCafe: uuid(),
    tmplFertCafe: uuid(),
    tmplInspCafe: uuid(),
    tmplRecolCafe: uuid(),
    // Activity templates — palma
    tmplFertPalma: uuid(),
    tmplInspPalma: uuid(),
    tmplCosechaPalma: uuid(),
    // Cultivation schedules
    schedOgKush: uuid(),
    schedCastillo: uuid(),
    schedTenera: uuid(),
    // Regulatory doc types
    rdtCoa: uuid(),
    rdtSds: uuid(),
    rdtPhyto: uuid(),
    rdtFnc: uuid(),
    rdtRspo: uuid(),
    // Suppliers
    supSemillas: uuid(),
    supQuimicos: uuid(),
    supBiocontrol: uuid(),
    supSustratos: uuid(),
    supCenicafe: uuid(),
    supCenipalma: uuid(),
    supLab: uuid(),
    // Products — cannabis
    prodSemOgK: uuid(),
    prodSemBluD: uuid(),
    prodSemWW: uuid(),
    prodFertFloraB: uuid(),
    prodFertFloraG: uuid(),
    prodFertFloraM: uuid(),
    prodBioTricho: uuid(),
    prodFlorSeca: uuid(),
    // Products — café
    prodPlanCas: uuid(),
    prodPlanGei: uuid(),
    prodPlanCat: uuid(),
    prodFertNpk: uuid(),
    prodFungCupri: uuid(),
    prodCafePerg: uuid(),
    // Products — palma
    prodPlanTen: uuid(),
    prodPlanOxg: uuid(),
    prodFertKcl: uuid(),
    prodFertBorax: uuid(),
    prodPalmaFfb: uuid(),
    prodPalmaCpo: uuid(),
    // Products — shared
    prodSustCoco: uuid(),
    // Facilities
    facNaveCannabis: uuid(),
    facInvernadero: uuid(),
    facFincaCafe: uuid(),
    facBeneficiadero: uuid(),
    facPlantacionPalma: uuid(),
    facExtractora: uuid(),
    // Zones — cannabis
    zonVegA: uuid(),
    zonVegB: uuid(),
    zonFlorA: uuid(),
    zonFlorB: uuid(),
    zonSecadoCurado: uuid(),
    zonAlmacenCann: uuid(),
    // Zones — invernadero
    zonPropCann: uuid(),
    zonAlmacigoCafe: uuid(),
    // Zones — café
    zonLote1Cas: uuid(),
    zonLote2Gei: uuid(),
    zonLote3Cat: uuid(),
    // Zones — beneficiadero
    zonDespulpado: uuid(),
    zonSecadoMec: uuid(),
    zonBodegaPerg: uuid(),
    // Zones — palma
    zonLoteATen: uuid(),
    zonLoteBOxg: uuid(),
    // Zones — extractora
    zonRecepcion: uuid(),
    zonExtraccion: uuid(),
    zonAlmacenCpo: uuid(),
  }
}

type SeedIds = ReturnType<typeof generateSeedIds>

// ── Layer 1: Independent tables ──────────────────────────────────────

async function seedResourceCategories(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('resource_categories').insert([
    { id: ids.catVegetal, company_id: companyId, code: 'MAT_VEG', name: 'Material Vegetal', is_consumable: true, is_transformable: true, default_lot_tracking: 'required' as const },
    { id: ids.catQuimicos, company_id: companyId, code: 'QUIMICOS', name: 'Agroquímicos y Fertilizantes', is_consumable: true, is_transformable: false, default_lot_tracking: 'required' as const },
    { id: ids.catEquipos, company_id: companyId, code: 'EQUIPOS', name: 'Equipos y Herramientas', is_consumable: false, is_transformable: false, default_lot_tracking: 'none' as const },
    { id: ids.catSustratos, company_id: companyId, code: 'SUSTRATO', name: 'Sustratos y Medios', is_consumable: true, is_transformable: false, default_lot_tracking: 'optional' as const },
    { id: ids.catSemillas, company_id: companyId, code: 'SEMILLAS', name: 'Semillas y Plántulas', is_consumable: true, is_transformable: false, default_lot_tracking: 'required' as const },
    { id: ids.catEmpaques, company_id: companyId, code: 'EMPAQUES', name: 'Empaques y Empaque', is_consumable: true, is_transformable: false, default_lot_tracking: 'optional' as const },
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
    { id: ids.unitTon, company_id: companyId, code: 'ton', name: 'Toneladas', dimension: 'mass' as const, to_base_factor: 1000000 },
    { id: ids.unitHa, company_id: companyId, code: 'ha', name: 'Hectáreas', dimension: 'area' as const, to_base_factor: 1 },
    { id: ids.unitArroba, company_id: companyId, code: '@', name: 'Arrobas', dimension: 'mass' as const, to_base_factor: 12500 },
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
    { id: ids.atypeFitosanitario, company_id: companyId, name: 'Control Fitosanitario', category: 'control' as const },
    { id: ids.atypeBeneficio, company_id: companyId, name: 'Beneficio', category: 'produccion' as const },
    { id: ids.atypePolinizacion, company_id: companyId, name: 'Polinización', category: 'produccion' as const },
  ])
  if (error) throw error
}

async function seedCropTypes(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('crop_types').insert([
    { id: ids.cropCannabis, company_id: companyId, code: 'CANN', name: 'Cannabis Medicinal', scientific_name: 'Cannabis sativa L.', category: 'annual' as const, regulatory_framework: 'Resolución 227/2022 MinJusticia' },
    { id: ids.cropCafe, company_id: companyId, code: 'CAFE', name: 'Café Arábica', scientific_name: 'Coffea arabica', category: 'perennial' as const, regulatory_framework: 'FNC / Res. ICA 30021/2017' },
    { id: ids.cropPalma, company_id: companyId, code: 'PALMA', name: 'Palma de Aceite', scientific_name: 'Elaeis guineensis Jacq.', category: 'perennial' as const, regulatory_framework: 'Fedepalma / RSPO' },
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
    {
      id: ids.rdtFnc, company_id: companyId, code: 'FNC', name: 'Certificado FNC Exportación',
      description: 'Certificado de la Federación Nacional de Cafeteros para exportación de café.',
      category: 'commercial' as const, valid_for_days: 180, issuing_authority: 'FNC', sort_order: 3,
      required_fields: {
        fields: [
          { key: 'exporter_name', label: 'Nombre del exportador', type: 'text', required: true },
          { key: 'contract_number', label: 'Número de contrato', type: 'text', required: true },
          { key: 'destination_country', label: 'País de destino', type: 'text', required: true },
          { key: 'quantity_kg', label: 'Cantidad (kg)', type: 'number', required: true },
          { key: 'cup_score', label: 'Puntaje de taza (SCA)', type: 'number', required: true },
        ],
      },
    },
    {
      id: ids.rdtRspo, company_id: companyId, code: 'RSPO', name: 'Certificación RSPO',
      description: 'Certificación de producción sostenible de aceite de palma.',
      category: 'compliance' as const, valid_for_days: 365, issuing_authority: 'RSPO', sort_order: 4,
      required_fields: {
        fields: [
          { key: 'certification_number', label: 'Número de certificación', type: 'text', required: true },
          { key: 'audit_date', label: 'Fecha de auditoría', type: 'date', required: true },
          { key: 'certification_scope', label: 'Alcance', type: 'select', required: true, options: ['Identity Preserved', 'Segregated', 'Mass Balance'] },
          { key: 'next_audit_date', label: 'Próxima auditoría', type: 'date', required: true },
        ],
      },
    },
  ])
  if (error) throw error
}

// ── Layer 2: Production phases + base unit references ────────────────

async function seedProductionPhases(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('production_phases').insert([
    // Cannabis (7 phases)
    { id: ids.pcGerm, crop_type_id: ids.cropCannabis, code: 'GERM', name: 'Germinación', sort_order: 1, default_duration_days: 7, is_transformation: false, can_be_entry_point: true, can_be_exit_point: false },
    { id: ids.pcPlantula, crop_type_id: ids.cropCannabis, code: 'PLANT', name: 'Plántula', sort_order: 2, default_duration_days: 14, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pcVeg, crop_type_id: ids.cropCannabis, code: 'VEG', name: 'Vegetativo', sort_order: 3, default_duration_days: 28, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pcFlor, crop_type_id: ids.cropCannabis, code: 'FLOR', name: 'Floración', sort_order: 4, default_duration_days: 63, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pcCosecha, crop_type_id: ids.cropCannabis, code: 'COSECHA', name: 'Cosecha', sort_order: 5, default_duration_days: 3, is_transformation: true, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pcSecado, crop_type_id: ids.cropCannabis, code: 'SECADO', name: 'Secado', sort_order: 6, default_duration_days: 14, is_transformation: true, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pcCurado, crop_type_id: ids.cropCannabis, code: 'CURADO', name: 'Curado', sort_order: 7, default_duration_days: 28, is_transformation: true, can_be_entry_point: false, can_be_exit_point: true },
    // Café (7 phases)
    { id: ids.pfAlmacigo, crop_type_id: ids.cropCafe, code: 'ALMACIGO', name: 'Almácigo', sort_order: 1, default_duration_days: 120, is_transformation: false, can_be_entry_point: true, can_be_exit_point: false },
    { id: ids.pfLevante, crop_type_id: ids.cropCafe, code: 'LEVANTE', name: 'Levante', sort_order: 2, default_duration_days: 365, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pfFloracion, crop_type_id: ids.cropCafe, code: 'FLORA_C', name: 'Floración', sort_order: 3, default_duration_days: 30, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pfDesarrollo, crop_type_id: ids.cropCafe, code: 'DESARRO', name: 'Desarrollo del Fruto', sort_order: 4, default_duration_days: 270, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pfRecoleccion, crop_type_id: ids.cropCafe, code: 'RECOL', name: 'Recolección', sort_order: 5, default_duration_days: 60, is_transformation: true, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pfBeneficio, crop_type_id: ids.cropCafe, code: 'BENEF', name: 'Beneficio', sort_order: 6, default_duration_days: 5, is_transformation: true, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.pfSecadoC, crop_type_id: ids.cropCafe, code: 'SECADO_C', name: 'Secado', sort_order: 7, default_duration_days: 15, is_transformation: true, can_be_entry_point: false, can_be_exit_point: true },
    // Palma (6 phases)
    { id: ids.ppPrevivero, crop_type_id: ids.cropPalma, code: 'PREVIV', name: 'Previvero', sort_order: 1, default_duration_days: 90, is_transformation: false, can_be_entry_point: true, can_be_exit_point: false },
    { id: ids.ppVivero, crop_type_id: ids.cropPalma, code: 'VIVERO', name: 'Vivero', sort_order: 2, default_duration_days: 300, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.ppInmaduro, crop_type_id: ids.cropPalma, code: 'INMAT', name: 'Inmaduro', sort_order: 3, default_duration_days: 730, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.ppProductivo, crop_type_id: ids.cropPalma, code: 'PRODUC', name: 'Productivo', sort_order: 4, default_duration_days: 3650, is_transformation: false, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.ppCorte, crop_type_id: ids.cropPalma, code: 'CORTE', name: 'Corte de Racimos', sort_order: 5, default_duration_days: 1, is_transformation: true, can_be_entry_point: false, can_be_exit_point: false },
    { id: ids.ppExtraccion, crop_type_id: ids.cropPalma, code: 'EXTRAC', name: 'Extracción', sort_order: 6, default_duration_days: 1, is_transformation: true, can_be_entry_point: false, can_be_exit_point: true },
  ])
  if (error) throw error
}

async function seedUnitBaseUnits(admin: AdminClient, ids: SeedIds) {
  const updates = [
    { id: ids.unitKg, base_unit_id: ids.unitG },
    { id: ids.unitMl, base_unit_id: ids.unitL },
    { id: ids.unitTon, base_unit_id: ids.unitG },
    { id: ids.unitArroba, base_unit_id: ids.unitG },
  ]
  for (const u of updates) {
    const { error } = await admin.from('units_of_measure').update({ base_unit_id: u.base_unit_id }).eq('id', u.id)
    if (error) throw error
  }
}

// ── Layer 3: Phase dependencies + regulatory requirements ────────────

async function seedPhaseDependencies(admin: AdminClient, ids: SeedIds) {
  const updates = [
    // Cannabis
    { id: ids.pcPlantula, depends_on_phase_id: ids.pcGerm },
    { id: ids.pcVeg, depends_on_phase_id: ids.pcPlantula },
    { id: ids.pcFlor, depends_on_phase_id: ids.pcVeg },
    { id: ids.pcCosecha, depends_on_phase_id: ids.pcFlor },
    { id: ids.pcSecado, depends_on_phase_id: ids.pcCosecha },
    { id: ids.pcCurado, depends_on_phase_id: ids.pcSecado },
    // Café
    { id: ids.pfLevante, depends_on_phase_id: ids.pfAlmacigo },
    { id: ids.pfFloracion, depends_on_phase_id: ids.pfLevante },
    { id: ids.pfDesarrollo, depends_on_phase_id: ids.pfFloracion },
    { id: ids.pfRecoleccion, depends_on_phase_id: ids.pfDesarrollo },
    { id: ids.pfBeneficio, depends_on_phase_id: ids.pfRecoleccion },
    { id: ids.pfSecadoC, depends_on_phase_id: ids.pfBeneficio },
    // Palma
    { id: ids.ppVivero, depends_on_phase_id: ids.ppPrevivero },
    { id: ids.ppInmaduro, depends_on_phase_id: ids.ppVivero },
    { id: ids.ppProductivo, depends_on_phase_id: ids.ppInmaduro },
    { id: ids.ppCorte, depends_on_phase_id: ids.ppProductivo },
    { id: ids.ppExtraccion, depends_on_phase_id: ids.ppCorte },
  ]
  for (const u of updates) {
    const { error } = await admin.from('production_phases').update({ depends_on_phase_id: u.depends_on_phase_id }).eq('id', u.id)
    if (error) throw error
  }
}

async function seedRegulatoryRequirements(admin: AdminClient, ids: SeedIds) {
  const { error: prodError } = await admin.from('product_regulatory_requirements').insert([
    { category_id: ids.catVegetal, doc_type_id: ids.rdtCoa, is_mandatory: true, applies_to_scope: 'per_batch' as const, frequency: 'per_production' as const, notes: 'CoA requerido para cada batch de producción', sort_order: 0 },
    { category_id: ids.catVegetal, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Fitosanitario requerido para movilización de material vegetal', sort_order: 1 },
    { category_id: ids.catQuimicos, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante, se obtiene una vez', sort_order: 2 },
    { category_id: ids.catSemillas, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Fitosanitario para semillas y plántulas', sort_order: 3 },
  ])
  if (prodError) throw prodError

  const { error: shipError } = await admin.from('shipment_doc_requirements').insert([
    { category_id: ids.catVegetal, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_when: 'always' as const, notes: 'Siempre requerido para transporte de material vegetal', sort_order: 0 },
    { category_id: ids.catQuimicos, doc_type_id: ids.rdtSds, is_mandatory: true, applies_when: 'always' as const, notes: 'SDS debe acompañar envíos de químicos', sort_order: 1 },
    { category_id: ids.catVegetal, doc_type_id: ids.rdtCoa, is_mandatory: false, applies_when: 'interstate' as const, notes: 'CoA recomendado para envíos interdepartamentales', sort_order: 2 },
    { category_id: ids.catSemillas, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_when: 'always' as const, notes: 'Fitosanitario para transporte de semillas y plántulas', sort_order: 3 },
  ])
  if (shipError) throw shipError
}

// ── Layer 4: Cultivars ───────────────────────────────────────────────

async function seedCultivars(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('cultivars').insert([
    // Cannabis
    {
      id: ids.cultOgKush, crop_type_id: ids.cropCannabis, code: 'OGK', name: 'OG Kush',
      breeder: 'DNA Genetics', genetics: 'Indica dominante (75/25)',
      default_cycle_days: 157, expected_yield_per_plant_g: 450, expected_dry_ratio: 0.22,
      quality_grade: 'Premium', density_plants_per_m2: 9,
      phase_durations: { [ids.pcGerm]: 7, [ids.pcPlantula]: 14, [ids.pcVeg]: 28, [ids.pcFlor]: 63, [ids.pcCosecha]: 3, [ids.pcSecado]: 14, [ids.pcCurado]: 28 },
      target_profile: { thc: '18-24%', cbd: '<1%', terpene_dominant: 'Myrcene' },
      optimal_conditions: { temp: { min: 20, max: 28, unit: '°C' }, humidity: { min: 40, max: 60, unit: '%' } },
    },
    {
      id: ids.cultBlueD, crop_type_id: ids.cropCannabis, code: 'BLD', name: 'Blue Dream',
      breeder: 'Humboldt Seeds', genetics: 'Sativa dominante (60/40)',
      default_cycle_days: 167, expected_yield_per_plant_g: 550, expected_dry_ratio: 0.20,
      quality_grade: 'AAA', density_plants_per_m2: 7,
      phase_durations: { [ids.pcGerm]: 7, [ids.pcPlantula]: 14, [ids.pcVeg]: 35, [ids.pcFlor]: 67, [ids.pcCosecha]: 3, [ids.pcSecado]: 14, [ids.pcCurado]: 27 },
      target_profile: { thc: '17-24%', cbd: '1-2%', terpene_dominant: 'Pinene' },
      optimal_conditions: null,
    },
    {
      id: ids.cultWhiteW, crop_type_id: ids.cropCannabis, code: 'WWD', name: 'White Widow',
      breeder: 'Green House Seeds', genetics: 'Híbrido balanceado (50/50)',
      default_cycle_days: 148, expected_yield_per_plant_g: 400, expected_dry_ratio: 0.23,
      quality_grade: 'Premium', density_plants_per_m2: 8,
      phase_durations: { [ids.pcGerm]: 7, [ids.pcPlantula]: 12, [ids.pcVeg]: 25, [ids.pcFlor]: 60, [ids.pcCosecha]: 3, [ids.pcSecado]: 14, [ids.pcCurado]: 27 },
      target_profile: { thc: '18-25%', cbd: '<1%', terpene_dominant: 'Caryophyllene' },
      optimal_conditions: { temp: { min: 20, max: 28, unit: '°C' }, humidity: { min: 40, max: 55, unit: '%' } },
    },
    // Café
    {
      id: ids.cultCastillo, crop_type_id: ids.cropCafe, code: 'CAS', name: 'Castillo',
      breeder: 'Cenicafé', genetics: 'Variedad compuesta (resistente a roya)',
      default_cycle_days: 865, expected_yield_per_plant_g: 1200, expected_dry_ratio: 0.18,
      quality_grade: 'Especial', density_plants_per_m2: 0.5,
      phase_durations: { [ids.pfAlmacigo]: 120, [ids.pfLevante]: 365, [ids.pfFloracion]: 30, [ids.pfDesarrollo]: 270, [ids.pfRecoleccion]: 60, [ids.pfBeneficio]: 5, [ids.pfSecadoC]: 15 },
      target_profile: { cup_score: '80-84', acidity: 'medium-high', body: 'medium', aroma: 'chocolate-cítrico' },
      optimal_conditions: { temp: { min: 18, max: 22, unit: '°C' }, humidity: { min: 70, max: 80, unit: '%' }, altitude: { min: 1400, max: 1800, unit: 'masl' } },
    },
    {
      id: ids.cultGeisha, crop_type_id: ids.cropCafe, code: 'GEI', name: 'Geisha',
      breeder: 'Hacienda La Esmeralda (adaptada Colombia)', genetics: 'Variedad Geisha/Gesha',
      default_cycle_days: 900, expected_yield_per_plant_g: 800, expected_dry_ratio: 0.17,
      quality_grade: 'Micro-lote', density_plants_per_m2: 0.4,
      phase_durations: { [ids.pfAlmacigo]: 130, [ids.pfLevante]: 380, [ids.pfFloracion]: 30, [ids.pfDesarrollo]: 280, [ids.pfRecoleccion]: 60, [ids.pfBeneficio]: 5, [ids.pfSecadoC]: 15 },
      target_profile: { cup_score: '85+', floral: 'jasmine-tropical', acidity: 'bright-citric' },
      optimal_conditions: { temp: { min: 17, max: 21, unit: '°C' }, altitude: { min: 1600, max: 2000, unit: 'masl' } },
    },
    {
      id: ids.cultCaturra, crop_type_id: ids.cropCafe, code: 'CAT', name: 'Caturra',
      breeder: 'IBCR/Cenicafé', genetics: 'Mutación Bourbon (porte bajo)',
      default_cycle_days: 830, expected_yield_per_plant_g: 1000, expected_dry_ratio: 0.19,
      quality_grade: 'Especial', density_plants_per_m2: 0.5,
      phase_durations: { [ids.pfAlmacigo]: 110, [ids.pfLevante]: 350, [ids.pfFloracion]: 30, [ids.pfDesarrollo]: 260, [ids.pfRecoleccion]: 60, [ids.pfBeneficio]: 5, [ids.pfSecadoC]: 15 },
      target_profile: { cup_score: '78-82', aroma: 'nutty-caramel', body: 'medium-full' },
      optimal_conditions: { temp: { min: 19, max: 23, unit: '°C' }, altitude: { min: 1200, max: 1700, unit: 'masl' } },
    },
    // Palma
    {
      id: ids.cultTenera, crop_type_id: ids.cropPalma, code: 'TEN', name: 'Tenera DxP',
      breeder: 'Cenipalma/ASD', genetics: 'Dura × Pisifera',
      default_cycle_days: 1120, expected_yield_per_plant_g: 25000, expected_dry_ratio: 0.22,
      quality_grade: 'Standard', density_plants_per_m2: 0.0143,
      phase_durations: { [ids.ppPrevivero]: 90, [ids.ppVivero]: 300, [ids.ppInmaduro]: 730, [ids.ppProductivo]: 3650, [ids.ppCorte]: 1, [ids.ppExtraccion]: 1 },
      target_profile: { oer: '22-25%', ffa: '<5%', dobi: '>2.5' },
      optimal_conditions: { temp: { min: 24, max: 32, unit: '°C' }, humidity: { min: 75, max: 90, unit: '%' }, rainfall: { min: 1800, max: 2500, unit: 'mm/yr' } },
    },
    {
      id: ids.cultOxg, crop_type_id: ids.cropPalma, code: 'OXG', name: 'Coari x La Mé (OxG)',
      breeder: 'Cenipalma', genetics: 'E. oleifera × E. guineensis',
      default_cycle_days: 1120, expected_yield_per_plant_g: 18000, expected_dry_ratio: 0.18,
      quality_grade: 'Premium (alto caroteno)', density_plants_per_m2: 0.0128,
      phase_durations: { [ids.ppPrevivero]: 90, [ids.ppVivero]: 300, [ids.ppInmaduro]: 730, [ids.ppProductivo]: 3650, [ids.ppCorte]: 1, [ids.ppExtraccion]: 1 },
      target_profile: { oer: '18-22%', carotene: 'high', ffa: '<3%' },
      optimal_conditions: { temp: { min: 24, max: 30, unit: '°C' }, humidity: { min: 75, max: 90, unit: '%' } },
    },
  ])
  if (error) throw error
}

// ── Layer 5: Phase product flows + activity templates ────────────────

async function seedPhaseProductFlows(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('phase_product_flows').insert([
    // Cannabis cosecha: input → 70% flor húmeda + 30% waste
    { cultivar_id: ids.cultOgKush, phase_id: ids.pcCosecha, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.pcCosecha, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 70, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.pcCosecha, direction: 'output' as const, product_role: 'waste' as const, product_category_id: ids.catVegetal, expected_yield_pct: 30, unit_id: ids.unitG, is_required: true, sort_order: 1 },
    // Cannabis secado: input → 22% flor seca
    { cultivar_id: ids.cultOgKush, phase_id: ids.pcSecado, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.pcSecado, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 22, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    // Cannabis curado: input → 95% curado
    { cultivar_id: ids.cultOgKush, phase_id: ids.pcCurado, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultOgKush, phase_id: ids.pcCurado, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 95, unit_id: ids.unitG, is_required: true, sort_order: 0 },
    // Café recolección: input → 60% cereza
    { cultivar_id: ids.cultCastillo, phase_id: ids.pfRecoleccion, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitKg, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultCastillo, phase_id: ids.pfRecoleccion, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 60, unit_id: ids.unitKg, is_required: true, sort_order: 0 },
    // Café beneficio: input → 50%
    { cultivar_id: ids.cultCastillo, phase_id: ids.pfBeneficio, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitKg, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultCastillo, phase_id: ids.pfBeneficio, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 50, unit_id: ids.unitKg, is_required: true, sort_order: 0 },
    // Palma extracción: input → 22% CPO + 5% palmiste
    { cultivar_id: ids.cultTenera, phase_id: ids.ppExtraccion, direction: 'input' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: null, unit_id: ids.unitTon, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultTenera, phase_id: ids.ppExtraccion, direction: 'output' as const, product_role: 'primary' as const, product_category_id: ids.catVegetal, expected_yield_pct: 22, unit_id: ids.unitTon, is_required: true, sort_order: 0 },
    { cultivar_id: ids.cultTenera, phase_id: ids.ppExtraccion, direction: 'output' as const, product_role: 'byproduct' as const, product_category_id: ids.catVegetal, expected_yield_pct: 5, unit_id: ids.unitTon, is_required: false, sort_order: 1 },
  ])
  if (error) throw error
}

async function seedActivityTemplates(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error: tmplError } = await admin.from('activity_templates').insert([
    // Cannabis
    { id: ids.tmplRiegoCann, company_id: companyId, code: 'RIEGO_CANN', activity_type_id: ids.atypeRiego, name: 'Riego cannabis', frequency: 'daily' as const, estimated_duration_min: 30, trigger_day_from: 8, trigger_day_to: 157, triggers_transformation: false },
    { id: ids.tmplFertCann, company_id: companyId, code: 'FERT_CANN', activity_type_id: ids.atypeFert, name: 'Fertilización cannabis', frequency: 'weekly' as const, estimated_duration_min: 45, trigger_day_from: 15, trigger_day_to: 98, triggers_transformation: false },
    { id: ids.tmplInspCann, company_id: companyId, code: 'INSP_CANN', activity_type_id: ids.atypeInspeccion, name: 'Inspección cannabis', frequency: 'daily' as const, estimated_duration_min: 20, trigger_day_from: 1, trigger_day_to: 157, triggers_transformation: false },
    // Café
    { id: ids.tmplRiegoCafe, company_id: companyId, code: 'RIEGO_CAFE', activity_type_id: ids.atypeRiego, name: 'Riego café', frequency: 'weekly' as const, estimated_duration_min: 60, trigger_day_from: 1, trigger_day_to: 865, triggers_transformation: false },
    { id: ids.tmplFertCafe, company_id: companyId, code: 'FERT_CAFE', activity_type_id: ids.atypeFert, name: 'Fertilización café', frequency: 'biweekly' as const, estimated_duration_min: 120, trigger_day_from: 120, trigger_day_to: 785, triggers_transformation: false },
    { id: ids.tmplInspCafe, company_id: companyId, code: 'INSP_CAFE', activity_type_id: ids.atypeInspeccion, name: 'Inspección cafetal', frequency: 'weekly' as const, estimated_duration_min: 90, trigger_day_from: 1, trigger_day_to: 865, triggers_transformation: false },
    { id: ids.tmplRecolCafe, company_id: companyId, code: 'RECOL_CAFE', activity_type_id: ids.atypeCosecha, name: 'Recolección selectiva', frequency: 'on_demand' as const, estimated_duration_min: 480, trigger_day_from: 786, trigger_day_to: 845, triggers_transformation: false },
    // Palma
    { id: ids.tmplFertPalma, company_id: companyId, code: 'FERT_PALMA', activity_type_id: ids.atypeFert, name: 'Fertilización palma', frequency: 'biweekly' as const, estimated_duration_min: 180, trigger_day_from: 391, trigger_day_to: 4770, triggers_transformation: false },
    { id: ids.tmplInspPalma, company_id: companyId, code: 'INSP_PALMA', activity_type_id: ids.atypeInspeccion, name: 'Inspección palma', frequency: 'weekly' as const, estimated_duration_min: 120, trigger_day_from: 1, trigger_day_to: 4770, triggers_transformation: false },
    { id: ids.tmplCosechaPalma, company_id: companyId, code: 'COS_PALMA', activity_type_id: ids.atypeCosecha, name: 'Corte de racimos', frequency: 'on_demand' as const, estimated_duration_min: 480, trigger_day_from: 1120, trigger_day_to: 4770, triggers_transformation: false },
  ])
  if (tmplError) throw tmplError

  // Template ↔ Phase associations
  const { error: phasesError } = await admin.from('activity_template_phases').insert([
    // Cannabis
    { template_id: ids.tmplRiegoCann, phase_id: ids.pcPlantula },
    { template_id: ids.tmplRiegoCann, phase_id: ids.pcVeg },
    { template_id: ids.tmplRiegoCann, phase_id: ids.pcFlor },
    { template_id: ids.tmplFertCann, phase_id: ids.pcVeg },
    { template_id: ids.tmplFertCann, phase_id: ids.pcFlor },
    { template_id: ids.tmplInspCann, phase_id: ids.pcGerm },
    { template_id: ids.tmplInspCann, phase_id: ids.pcPlantula },
    { template_id: ids.tmplInspCann, phase_id: ids.pcVeg },
    { template_id: ids.tmplInspCann, phase_id: ids.pcFlor },
    // Café
    { template_id: ids.tmplRiegoCafe, phase_id: ids.pfAlmacigo },
    { template_id: ids.tmplRiegoCafe, phase_id: ids.pfLevante },
    { template_id: ids.tmplRiegoCafe, phase_id: ids.pfFloracion },
    { template_id: ids.tmplRiegoCafe, phase_id: ids.pfDesarrollo },
    { template_id: ids.tmplFertCafe, phase_id: ids.pfLevante },
    { template_id: ids.tmplFertCafe, phase_id: ids.pfFloracion },
    { template_id: ids.tmplFertCafe, phase_id: ids.pfDesarrollo },
    { template_id: ids.tmplInspCafe, phase_id: ids.pfAlmacigo },
    { template_id: ids.tmplInspCafe, phase_id: ids.pfLevante },
    { template_id: ids.tmplInspCafe, phase_id: ids.pfFloracion },
    { template_id: ids.tmplInspCafe, phase_id: ids.pfDesarrollo },
    { template_id: ids.tmplInspCafe, phase_id: ids.pfRecoleccion },
    { template_id: ids.tmplRecolCafe, phase_id: ids.pfRecoleccion },
    // Palma
    { template_id: ids.tmplFertPalma, phase_id: ids.ppInmaduro },
    { template_id: ids.tmplFertPalma, phase_id: ids.ppProductivo },
    { template_id: ids.tmplInspPalma, phase_id: ids.ppPrevivero },
    { template_id: ids.tmplInspPalma, phase_id: ids.ppVivero },
    { template_id: ids.tmplInspPalma, phase_id: ids.ppInmaduro },
    { template_id: ids.tmplInspPalma, phase_id: ids.ppProductivo },
    { template_id: ids.tmplCosechaPalma, phase_id: ids.ppProductivo },
  ])
  if (phasesError) throw phasesError

  // Template resources
  const { error: resError } = await admin.from('activity_template_resources').insert([
    { template_id: ids.tmplRiegoCann, quantity: 2.5, quantity_basis: 'per_plant' as const, sort_order: 0, notes: 'Agua con pH 6.0-6.5' },
    { template_id: ids.tmplFertCann, quantity: 1.0, quantity_basis: 'per_L_solution' as const, sort_order: 0, notes: 'Flora Bloom 3ml/L' },
    { template_id: ids.tmplRiegoCafe, quantity: 5.0, quantity_basis: 'per_plant' as const, sort_order: 0, notes: 'Litros por planta' },
    { template_id: ids.tmplFertCafe, quantity: 50, quantity_basis: 'per_plant' as const, sort_order: 0, notes: 'g NPK 17-6-18 por planta' },
    { template_id: ids.tmplFertPalma, quantity: 2000, quantity_basis: 'per_plant' as const, sort_order: 0, notes: 'g KCl por palma' },
  ])
  if (resError) throw resError

  // Template checklist
  const { error: checkError } = await admin.from('activity_template_checklist').insert([
    // Cannabis riego
    { template_id: ids.tmplRiegoCann, step_order: 1, instruction: 'Verificar pH del agua (6.0-6.5)', is_critical: true, requires_photo: false },
    { template_id: ids.tmplRiegoCann, step_order: 2, instruction: 'Verificar EC del agua (1.2-1.8)', is_critical: true, requires_photo: false },
    { template_id: ids.tmplRiegoCann, step_order: 3, instruction: 'Regar hasta 20% de runoff', is_critical: false, requires_photo: false },
    // Cannabis inspección
    { template_id: ids.tmplInspCann, step_order: 1, instruction: 'Revisar color de hojas', is_critical: false, requires_photo: true },
    { template_id: ids.tmplInspCann, step_order: 2, instruction: 'Verificar presencia de plagas', is_critical: true, requires_photo: true },
    { template_id: ids.tmplInspCann, step_order: 3, instruction: 'Medir temperatura y humedad', is_critical: true, requires_photo: false },
    // Café inspección
    { template_id: ids.tmplInspCafe, step_order: 1, instruction: 'Revisar presencia de roya en hojas', is_critical: true, requires_photo: true },
    { template_id: ids.tmplInspCafe, step_order: 2, instruction: 'Verificar infestación de broca en frutos', is_critical: true, requires_photo: true },
    { template_id: ids.tmplInspCafe, step_order: 3, instruction: 'Evaluar estado foliar general', is_critical: false, requires_photo: false },
    // Café recolección
    { template_id: ids.tmplRecolCafe, step_order: 1, instruction: 'Solo recolectar cereza madura (roja)', is_critical: true, requires_photo: true },
    { template_id: ids.tmplRecolCafe, step_order: 2, instruction: 'No incluir frutos verdes ni secos', is_critical: true, requires_photo: false },
    { template_id: ids.tmplRecolCafe, step_order: 3, instruction: 'Registrar peso total recolectado', is_critical: true, requires_photo: false },
    // Palma inspección
    { template_id: ids.tmplInspPalma, step_order: 1, instruction: 'Verificar presencia de picudo (trampas)', is_critical: true, requires_photo: true },
    { template_id: ids.tmplInspPalma, step_order: 2, instruction: 'Revisar síntomas de pudrición de cogollo (PC)', is_critical: true, requires_photo: true },
    { template_id: ids.tmplInspPalma, step_order: 3, instruction: 'Evaluar estado foliar y nutricional', is_critical: false, requires_photo: false },
    // Palma cosecha
    { template_id: ids.tmplCosechaPalma, step_order: 1, instruction: 'Verificar madurez del racimo (frutos desprendidos)', is_critical: true, requires_photo: true },
    { template_id: ids.tmplCosechaPalma, step_order: 2, instruction: 'Desinfectar chisel antes del corte', is_critical: true, requires_photo: false },
    { template_id: ids.tmplCosechaPalma, step_order: 3, instruction: 'Registrar peso del racimo', is_critical: true, requires_photo: false },
  ])
  if (checkError) throw checkError
}

// ── Layer 6: Cultivation schedules ───────────────────────────────────

async function seedCultivationSchedules(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('cultivation_schedules').insert([
    {
      id: ids.schedOgKush, company_id: companyId, name: 'OG Kush Standard 157d',
      cultivar_id: ids.cultOgKush, total_days: 157,
      phase_config: [
        { phase_id: ids.pcGerm, duration_days: 7, templates: [{ template_id: ids.tmplInspCann }] },
        { phase_id: ids.pcPlantula, duration_days: 14, templates: [{ template_id: ids.tmplRiegoCann }, { template_id: ids.tmplInspCann }] },
        { phase_id: ids.pcVeg, duration_days: 28, templates: [{ template_id: ids.tmplRiegoCann }, { template_id: ids.tmplFertCann }, { template_id: ids.tmplInspCann }] },
        { phase_id: ids.pcFlor, duration_days: 63, templates: [{ template_id: ids.tmplRiegoCann }, { template_id: ids.tmplFertCann }, { template_id: ids.tmplInspCann }] },
        { phase_id: ids.pcCosecha, duration_days: 3, templates: [] },
        { phase_id: ids.pcSecado, duration_days: 14, templates: [] },
        { phase_id: ids.pcCurado, duration_days: 28, templates: [] },
      ],
    },
    {
      id: ids.schedCastillo, company_id: companyId, name: 'Castillo Ciclo Completo',
      cultivar_id: ids.cultCastillo, total_days: 865,
      phase_config: [
        { phase_id: ids.pfAlmacigo, duration_days: 120, templates: [{ template_id: ids.tmplRiegoCafe }, { template_id: ids.tmplInspCafe }] },
        { phase_id: ids.pfLevante, duration_days: 365, templates: [{ template_id: ids.tmplRiegoCafe }, { template_id: ids.tmplFertCafe }, { template_id: ids.tmplInspCafe }] },
        { phase_id: ids.pfFloracion, duration_days: 30, templates: [{ template_id: ids.tmplInspCafe }] },
        { phase_id: ids.pfDesarrollo, duration_days: 270, templates: [{ template_id: ids.tmplRiegoCafe }, { template_id: ids.tmplFertCafe }, { template_id: ids.tmplInspCafe }] },
        { phase_id: ids.pfRecoleccion, duration_days: 60, templates: [{ template_id: ids.tmplRecolCafe }, { template_id: ids.tmplInspCafe }] },
        { phase_id: ids.pfBeneficio, duration_days: 5, templates: [] },
        { phase_id: ids.pfSecadoC, duration_days: 15, templates: [] },
      ],
    },
    {
      id: ids.schedTenera, company_id: companyId, name: 'Tenera DxP Vivero→Producción',
      cultivar_id: ids.cultTenera, total_days: 1120,
      phase_config: [
        { phase_id: ids.ppPrevivero, duration_days: 90, templates: [{ template_id: ids.tmplInspPalma }] },
        { phase_id: ids.ppVivero, duration_days: 300, templates: [{ template_id: ids.tmplInspPalma }] },
        { phase_id: ids.ppInmaduro, duration_days: 730, templates: [{ template_id: ids.tmplFertPalma }, { template_id: ids.tmplInspPalma }] },
        { phase_id: ids.ppProductivo, duration_days: 3650, templates: [{ template_id: ids.tmplFertPalma }, { template_id: ids.tmplInspPalma }, { template_id: ids.tmplCosechaPalma }] },
        { phase_id: ids.ppCorte, duration_days: 1, templates: [] },
        { phase_id: ids.ppExtraccion, duration_days: 1, templates: [] },
      ],
    },
  ])
  if (error) throw error
}

// ── Layer 7: Suppliers + Facilities ──────────────────────────────────

async function seedSuppliers(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('suppliers').insert([
    {
      id: ids.supSemillas, company_id: companyId, name: 'AgroSemillas Colombia',
      contact_info: { contact_name: 'Carlos Mendoza', email: 'carlos@agrosemillas.co', phone: '+573001112233', city: 'Bogotá', country: 'Colombia' },
      payment_terms: '30 días neto',
    },
    {
      id: ids.supQuimicos, company_id: companyId, name: 'NutriGrow Fertilizantes',
      contact_info: { contact_name: 'Laura Ruiz', email: 'ventas@nutrigrow.com', phone: '+573004445566', city: 'Medellín', country: 'Colombia' },
      payment_terms: 'Contado',
    },
    {
      id: ids.supBiocontrol, company_id: companyId, name: 'BioControl SAS',
      contact_info: { contact_name: 'Ana María Torres', email: 'ana@biocontrol.co', phone: '+573005556677', city: 'Rionegro', country: 'Colombia' },
      payment_terms: '30 días neto',
    },
    {
      id: ids.supSustratos, company_id: companyId, name: 'PlastiAgro',
      contact_info: { contact_name: 'Pedro Gómez', email: 'pedro@plastiagro.co', phone: '+573002223344', city: 'Cali', country: 'Colombia' },
      payment_terms: '15 días neto',
    },
    {
      id: ids.supCenicafe, company_id: companyId, name: 'Vivero Cenicafé',
      contact_info: { contact_name: 'Dr. Fernando Ospina', email: 'vivero@cenicafe.org', phone: '+576089900', city: 'Chinchiná, Caldas', country: 'Colombia' },
      payment_terms: '60 días neto',
    },
    {
      id: ids.supCenipalma, company_id: companyId, name: 'Vivero Cenipalma',
      contact_info: { contact_name: 'Ing. Patricia Ríos', email: 'vivero@cenipalma.org', phone: '+576206611', city: 'Barrancabermeja', country: 'Colombia' },
      payment_terms: '90 días neto',
    },
    {
      id: ids.supLab, company_id: companyId, name: 'Lab Analítico del Valle',
      contact_info: { contact_name: 'Dr. Roberto Sánchez', email: 'rsanchez@labvalle.com', phone: '+572334455', city: 'Cali', country: 'Colombia' },
      payment_terms: null,
    },
  ])
  if (error) throw error
}

async function seedFacilities(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('facilities').insert([
    { id: ids.facNaveCannabis, company_id: companyId, name: 'Nave Cannabis Indoor', type: 'indoor_warehouse' as const, total_footprint_m2: 2000, total_growing_area_m2: 1500, total_plant_capacity: 12000, address: 'Km 5 Vía Rionegro, Antioquia', latitude: 6.1534, longitude: -75.3766 },
    { id: ids.facInvernadero, company_id: companyId, name: 'Invernadero Propagación', type: 'greenhouse' as const, total_footprint_m2: 800, total_growing_area_m2: 650, total_plant_capacity: 8000, address: 'Km 5 Vía Rionegro, Antioquia', latitude: 6.1540, longitude: -75.3770 },
    { id: ids.facFincaCafe, company_id: companyId, name: 'Finca Cafetera La Esperanza', type: 'open_field' as const, total_footprint_m2: 65000, total_growing_area_m2: 65000, total_plant_capacity: 31000, address: 'Vereda La Esperanza, Salgar, Antioquia', latitude: 5.9612, longitude: -75.9834 },
    { id: ids.facBeneficiadero, company_id: companyId, name: 'Beneficiadero Central', type: 'indoor_warehouse' as const, total_footprint_m2: 400, total_growing_area_m2: 200, total_plant_capacity: 0, address: 'Vereda La Esperanza, Salgar, Antioquia', latitude: 5.9615, longitude: -75.9830 },
    { id: ids.facPlantacionPalma, company_id: companyId, name: 'Plantación Palma Magdalena', type: 'open_field' as const, total_footprint_m2: 250000, total_growing_area_m2: 250000, total_plant_capacity: 3425, address: 'Km 40 Vía Zona Bananera, Magdalena', latitude: 10.7667, longitude: -74.1500 },
    { id: ids.facExtractora, company_id: companyId, name: 'Planta Extractora', type: 'indoor_warehouse' as const, total_footprint_m2: 2000, total_growing_area_m2: 500, total_plant_capacity: 0, address: 'Km 40 Vía Zona Bananera, Magdalena', latitude: 10.7670, longitude: -74.1495 },
  ])
  if (error) throw error
}

// ── Layer 8: Products + Zones ────────────────────────────────────────

async function seedProducts(admin: AdminClient, companyId: string, ids: SeedIds) {
  const { error } = await admin.from('products').insert([
    // Cannabis seeds
    { id: ids.prodSemOgK, company_id: companyId, sku: 'SEM-OGK-FEM', name: 'Semilla OG Kush Feminizada', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultOgKush, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supSemillas, default_price: 25000, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodSemBluD, company_id: companyId, sku: 'SEM-BLD-FEM', name: 'Semilla Blue Dream Feminizada', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultBlueD, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supSemillas, default_price: 28000, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodSemWW, company_id: companyId, sku: 'SEM-WWD-FEM', name: 'Semilla White Widow Feminizada', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultWhiteW, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supSemillas, default_price: 22000, price_currency: 'COP', requires_regulatory_docs: true },
    // Cannabis fertilizers
    { id: ids.prodFertFloraB, company_id: companyId, sku: 'FERT-FLORA-B', name: 'Flora Bloom 1L', category_id: ids.catQuimicos, default_unit_id: ids.unitL, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supQuimicos, default_price: 85000, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodFertFloraG, company_id: companyId, sku: 'FERT-FLORA-G', name: 'Flora Grow 1L', category_id: ids.catQuimicos, default_unit_id: ids.unitL, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supQuimicos, default_price: 82000, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodFertFloraM, company_id: companyId, sku: 'FERT-FLORA-M', name: 'Flora Micro 1L', category_id: ids.catQuimicos, default_unit_id: ids.unitL, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supQuimicos, default_price: 88000, price_currency: 'COP', requires_regulatory_docs: false },
    { id: ids.prodBioTricho, company_id: companyId, sku: 'BIO-TRICHO', name: 'Trichoderma harzianum 500g', category_id: ids.catQuimicos, default_unit_id: ids.unitG, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supBiocontrol, default_price: 120000, price_currency: 'COP', requires_regulatory_docs: false },
    // Cannabis output
    { id: ids.prodFlorSeca, company_id: companyId, sku: 'FLOR-SECA', name: 'Flor Seca (genérico)', category_id: ids.catVegetal, default_unit_id: ids.unitG, procurement_type: 'produced' as const, lot_tracking: 'required' as const, requires_regulatory_docs: true },
    // Café seedlings
    { id: ids.prodPlanCas, company_id: companyId, sku: 'PLAN-CAS', name: 'Plántula Castillo', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultCastillo, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supCenicafe, default_price: 1500, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodPlanGei, company_id: companyId, sku: 'PLAN-GEI', name: 'Plántula Geisha', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultGeisha, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supCenicafe, default_price: 3500, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodPlanCat, company_id: companyId, sku: 'PLAN-CAT', name: 'Plántula Caturra', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultCaturra, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supCenicafe, default_price: 1200, price_currency: 'COP', requires_regulatory_docs: true },
    // Café fertilizers
    { id: ids.prodFertNpk, company_id: companyId, sku: 'FERT-NPK-17', name: 'NPK 17-6-18 25kg', category_id: ids.catQuimicos, default_unit_id: ids.unitKg, procurement_type: 'purchased' as const, lot_tracking: 'optional' as const, preferred_supplier_id: ids.supQuimicos, default_price: 85000, price_currency: 'COP', requires_regulatory_docs: false },
    { id: ids.prodFungCupri, company_id: companyId, sku: 'FUNG-CUPRI', name: 'Fungicida Cúprico 1L', category_id: ids.catQuimicos, default_unit_id: ids.unitL, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supBiocontrol, default_price: 45000, price_currency: 'COP', requires_regulatory_docs: true },
    // Café output
    { id: ids.prodCafePerg, company_id: companyId, sku: 'CAFE-PERG', name: 'Café Pergamino Seco', category_id: ids.catVegetal, default_unit_id: ids.unitKg, procurement_type: 'produced' as const, lot_tracking: 'required' as const, requires_regulatory_docs: true },
    // Palma seedlings
    { id: ids.prodPlanTen, company_id: companyId, sku: 'PLAN-TEN', name: 'Plántula Tenera DxP', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultTenera, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supCenipalma, default_price: 15000, price_currency: 'COP', requires_regulatory_docs: true },
    { id: ids.prodPlanOxg, company_id: companyId, sku: 'PLAN-OXG', name: 'Plántula OxG Híbrido', category_id: ids.catSemillas, default_unit_id: ids.unitUnd, cultivar_id: ids.cultOxg, procurement_type: 'purchased' as const, lot_tracking: 'required' as const, preferred_supplier_id: ids.supCenipalma, default_price: 25000, price_currency: 'COP', requires_regulatory_docs: true },
    // Palma fertilizers
    { id: ids.prodFertKcl, company_id: companyId, sku: 'FERT-KCL', name: 'Cloruro de Potasio 50kg', category_id: ids.catQuimicos, default_unit_id: ids.unitKg, procurement_type: 'purchased' as const, lot_tracking: 'optional' as const, preferred_supplier_id: ids.supQuimicos, default_price: 120000, price_currency: 'COP', requires_regulatory_docs: false },
    { id: ids.prodFertBorax, company_id: companyId, sku: 'FERT-BORAX', name: 'Bórax 25kg', category_id: ids.catQuimicos, default_unit_id: ids.unitKg, procurement_type: 'purchased' as const, lot_tracking: 'optional' as const, preferred_supplier_id: ids.supQuimicos, default_price: 65000, price_currency: 'COP', requires_regulatory_docs: false },
    // Palma outputs
    { id: ids.prodPalmaFfb, company_id: companyId, sku: 'PALMA-FFB', name: 'Racimo de Fruta Fresca (FFB)', category_id: ids.catVegetal, default_unit_id: ids.unitTon, procurement_type: 'produced' as const, lot_tracking: 'required' as const, requires_regulatory_docs: false },
    { id: ids.prodPalmaCpo, company_id: companyId, sku: 'PALMA-CPO', name: 'Aceite Crudo de Palma (CPO)', category_id: ids.catVegetal, default_unit_id: ids.unitTon, procurement_type: 'produced' as const, lot_tracking: 'required' as const, requires_regulatory_docs: true },
    // Shared
    { id: ids.prodSustCoco, company_id: companyId, sku: 'SUST-COCO', name: 'Fibra de Coco 50L', category_id: ids.catSustratos, default_unit_id: ids.unitUnd, procurement_type: 'purchased' as const, lot_tracking: 'optional' as const, preferred_supplier_id: ids.supSustratos, default_price: 35000, price_currency: 'COP', requires_regulatory_docs: false },
  ])
  if (error) throw error
}

async function seedZones(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('zones').insert([
    // Nave Cannabis Indoor
    { id: ids.zonVegA, facility_id: ids.facNaveCannabis, name: 'Vegetativo A', purpose: 'vegetation' as const, environment: 'indoor_controlled' as const, area_m2: 400, plant_capacity: 3600 },
    { id: ids.zonVegB, facility_id: ids.facNaveCannabis, name: 'Vegetativo B', purpose: 'vegetation' as const, environment: 'indoor_controlled' as const, area_m2: 400, plant_capacity: 3600 },
    { id: ids.zonFlorA, facility_id: ids.facNaveCannabis, name: 'Floración A', purpose: 'flowering' as const, environment: 'indoor_controlled' as const, area_m2: 350, plant_capacity: 2450 },
    { id: ids.zonFlorB, facility_id: ids.facNaveCannabis, name: 'Floración B', purpose: 'flowering' as const, environment: 'indoor_controlled' as const, status: 'maintenance' as const, area_m2: 350, plant_capacity: 2450 },
    { id: ids.zonSecadoCurado, facility_id: ids.facNaveCannabis, name: 'Secado/Curado', purpose: 'drying' as const, environment: 'indoor_controlled' as const, area_m2: 250, plant_capacity: 0 },
    { id: ids.zonAlmacenCann, facility_id: ids.facNaveCannabis, name: 'Almacén Cannabis', purpose: 'storage' as const, environment: 'indoor_controlled' as const, area_m2: 200, plant_capacity: 0 },
    // Invernadero Propagación
    { id: ids.zonPropCann, facility_id: ids.facInvernadero, name: 'Propagación Cannabis', purpose: 'propagation' as const, environment: 'greenhouse' as const, area_m2: 300, plant_capacity: 3000 },
    { id: ids.zonAlmacigoCafe, facility_id: ids.facInvernadero, name: 'Almácigo Café', purpose: 'propagation' as const, environment: 'greenhouse' as const, area_m2: 350, plant_capacity: 5000 },
    // Finca Cafetera
    { id: ids.zonLote1Cas, facility_id: ids.facFincaCafe, name: 'Lote 1 Castillo', purpose: 'vegetation' as const, environment: 'open_field' as const, area_m2: 30000, plant_capacity: 15000 },
    { id: ids.zonLote2Gei, facility_id: ids.facFincaCafe, name: 'Lote 2 Geisha', purpose: 'vegetation' as const, environment: 'open_field' as const, area_m2: 15000, plant_capacity: 6000 },
    { id: ids.zonLote3Cat, facility_id: ids.facFincaCafe, name: 'Lote 3 Caturra', purpose: 'vegetation' as const, environment: 'open_field' as const, area_m2: 20000, plant_capacity: 10000 },
    // Beneficiadero
    { id: ids.zonDespulpado, facility_id: ids.facBeneficiadero, name: 'Despulpado y Fermentación', purpose: 'processing' as const, environment: 'indoor_controlled' as const, area_m2: 100, plant_capacity: 0 },
    { id: ids.zonSecadoMec, facility_id: ids.facBeneficiadero, name: 'Secado Mecánico', purpose: 'drying' as const, environment: 'indoor_controlled' as const, area_m2: 80, plant_capacity: 0 },
    { id: ids.zonBodegaPerg, facility_id: ids.facBeneficiadero, name: 'Bodega Pergamino', purpose: 'storage' as const, environment: 'indoor_controlled' as const, area_m2: 150, plant_capacity: 0 },
    // Plantación Palma
    { id: ids.zonLoteATen, facility_id: ids.facPlantacionPalma, name: 'Lote A Tenera', purpose: 'vegetation' as const, environment: 'open_field' as const, area_m2: 150000, plant_capacity: 2145 },
    { id: ids.zonLoteBOxg, facility_id: ids.facPlantacionPalma, name: 'Lote B OxG', purpose: 'vegetation' as const, environment: 'open_field' as const, area_m2: 100000, plant_capacity: 1280 },
    // Planta Extractora
    { id: ids.zonRecepcion, facility_id: ids.facExtractora, name: 'Recepción Racimos', purpose: 'processing' as const, environment: 'indoor_controlled' as const, area_m2: 200, plant_capacity: 0 },
    { id: ids.zonExtraccion, facility_id: ids.facExtractora, name: 'Extracción', purpose: 'processing' as const, environment: 'indoor_controlled' as const, area_m2: 200, plant_capacity: 0 },
    { id: ids.zonAlmacenCpo, facility_id: ids.facExtractora, name: 'Almacén CPO', purpose: 'storage' as const, environment: 'indoor_controlled' as const, area_m2: 100, plant_capacity: 0 },
  ])
  if (error) throw error
}

// ── Layer 9: Product regulatory reqs + Zone structures ───────────────

async function seedProductRegReqs(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('product_regulatory_requirements').insert([
    { product_id: ids.prodSemOgK, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Fitosanitario para semillas', sort_order: 0 },
    { product_id: ids.prodSemBluD, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Fitosanitario para semillas', sort_order: 0 },
    { product_id: ids.prodSemWW, doc_type_id: ids.rdtPhyto, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'per_shipment' as const, notes: 'Fitosanitario para semillas', sort_order: 0 },
    { product_id: ids.prodFlorSeca, doc_type_id: ids.rdtCoa, is_mandatory: true, applies_to_scope: 'per_batch' as const, frequency: 'per_production' as const, notes: 'CoA obligatorio para flor seca', sort_order: 0 },
    { product_id: ids.prodFertFloraB, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante', sort_order: 0 },
    { product_id: ids.prodFertFloraG, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante', sort_order: 0 },
    { product_id: ids.prodFungCupri, doc_type_id: ids.rdtSds, is_mandatory: true, applies_to_scope: 'per_product' as const, frequency: 'once' as const, notes: 'SDS del fabricante', sort_order: 0 },
    { product_id: ids.prodCafePerg, doc_type_id: ids.rdtFnc, is_mandatory: true, applies_to_scope: 'per_batch' as const, frequency: 'per_production' as const, notes: 'Cert. FNC para exportación', sort_order: 0 },
    { product_id: ids.prodPalmaCpo, doc_type_id: ids.rdtRspo, is_mandatory: true, applies_to_scope: 'per_facility' as const, frequency: 'annual' as const, notes: 'Certificación RSPO anual', sort_order: 0 },
  ])
  if (error) throw error
}

async function seedZoneStructures(admin: AdminClient, ids: SeedIds) {
  const { error } = await admin.from('zone_structures').insert([
    // Vegetativo A: 4 rolling benches
    { zone_id: ids.zonVegA, name: 'Bench A1', type: 'rolling_bench' as const, length_m: 3.0, width_m: 1.2, num_levels: 1, positions_per_level: 30 },
    { zone_id: ids.zonVegA, name: 'Bench A2', type: 'rolling_bench' as const, length_m: 3.0, width_m: 1.2, num_levels: 1, positions_per_level: 30 },
    { zone_id: ids.zonVegA, name: 'Bench A3', type: 'rolling_bench' as const, length_m: 3.0, width_m: 1.2, num_levels: 1, positions_per_level: 30 },
    { zone_id: ids.zonVegA, name: 'Bench A4', type: 'rolling_bench' as const, length_m: 3.0, width_m: 1.2, num_levels: 1, positions_per_level: 30 },
    // Floración A: 3 mobile racks
    { zone_id: ids.zonFlorA, name: 'Rack F1', type: 'mobile_rack' as const, length_m: 4.0, width_m: 1.5, num_levels: 2, positions_per_level: 32 },
    { zone_id: ids.zonFlorA, name: 'Rack F2', type: 'mobile_rack' as const, length_m: 4.0, width_m: 1.5, num_levels: 2, positions_per_level: 32 },
    { zone_id: ids.zonFlorA, name: 'Rack F3', type: 'mobile_rack' as const, length_m: 4.0, width_m: 1.5, num_levels: 2, positions_per_level: 32 },
    // Propagación Cannabis: 2 fixed racks
    { zone_id: ids.zonPropCann, name: 'Rack P1', type: 'fixed_rack' as const, length_m: 2.5, width_m: 1.0, num_levels: 1, positions_per_level: 30 },
    { zone_id: ids.zonPropCann, name: 'Rack P2', type: 'fixed_rack' as const, length_m: 2.5, width_m: 1.0, num_levels: 1, positions_per_level: 30 },
    // Lote 1 Castillo: 3 row structures
    { zone_id: ids.zonLote1Cas, name: 'Surco 1', type: 'row' as const, length_m: 100, width_m: 0.5, num_levels: 1, positions_per_level: 500 },
    { zone_id: ids.zonLote1Cas, name: 'Surco 2', type: 'row' as const, length_m: 100, width_m: 0.5, num_levels: 1, positions_per_level: 500 },
    { zone_id: ids.zonLote1Cas, name: 'Surco 3', type: 'row' as const, length_m: 100, width_m: 0.5, num_levels: 1, positions_per_level: 500 },
    // Lote A Tenera: 2 row structures
    { zone_id: ids.zonLoteATen, name: 'Hilera A1', type: 'row' as const, length_m: 200, width_m: 8, num_levels: 1, positions_per_level: 143 },
    { zone_id: ids.zonLoteATen, name: 'Hilera A2', type: 'row' as const, length_m: 200, width_m: 8, num_levels: 1, positions_per_level: 143 },
  ])
  if (error) throw error
}

// ── Main entry point ─────────────────────────────────────────────────

/**
 * Seeds a newly created company with default catalog data for 3 crop types:
 * Cannabis, Café, and Palma de Aceite — including categories, units,
 * activity types, crop types, phases, cultivars, templates, schedules,
 * regulatory config, suppliers, products, facilities, zones, and structures.
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
    await Promise.all([
      seedProducts(admin, companyId, ids),
      seedZones(admin, ids),
    ])

    // Layer 9: Product regulatory reqs + Zone structures (parallel)
    await Promise.all([
      seedProductRegReqs(admin, ids),
      seedZoneStructures(admin, ids),
    ])
  } catch (error) {
    console.error('[seed] Failed to seed company data:', error)
  }
}
