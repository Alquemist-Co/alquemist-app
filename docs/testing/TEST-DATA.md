# Test Data Index — Seed Entities

Reference for all seed data in `supabase/seed.sql`. Use `npm run db:reset` to load.

---

## Credentials

| Rol | Email | Password | UUID |
|-----|-------|----------|------|
| admin | admin@agrotech.co | Admin123! | `222...201` |
| supervisor | supervisor@agrotech.co | Super123! | `222...202` |
| operator | operator@agrotech.co | Oper123! | `222...203` |
| manager | manager@agrotech.co | Mgr123! | `222...204` |
| viewer | viewer@agrotech.co | View123! | `222...205` |

---

## Company & Facility

| Entity | Name | UUID | Notes |
|--------|------|------|-------|
| Company | AgroTech Colombia SAS | `111...111` | CO, COP, medicinal mode |
| Facility | Invernadero Principal | `333...301` | greenhouse, 500m² |

## Zones (3)

| UUID suffix | Name | Purpose | Capacity | Area |
|-------------|------|---------|----------|------|
| `444...401` | Sala Propagacion | propagation | 200 | 25m² |
| `444...402` | Sala Vegetativo A | vegetation | 100 | 80m² |
| `444...403` | Sala Floracion A | flowering | 80 | 120m² |

## Crop Types & Cultivars

| Type | Cultivar | Code | Cycle | UUID (cultivar) |
|------|----------|------|-------|-----------------|
| Cannabis | Gelato #41 | GELATO-41 | 127d | `666...601` |
| Cannabis | OG Kush | OG-KUSH | 120d | `666...602` |
| Blueberry | Duke | DUKE-BB | 365d | `666...603` |

## Production Phases (Cannabis)

| # | Code | Name | Duration | UUID suffix |
|---|------|------|----------|-------------|
| 1 | germination | Germinacion | 7d | `777...701` |
| 2 | propagation | Propagacion | 14d | `777...702` |
| 3 | vegetative | Vegetativo | 28d | `777...703` |
| 4 | flowering | Floracion | 63d | `777...704` |
| 5 | harvest | Cosecha | 1d | `777...705` |
| 6 | drying | Secado | 14d | `777...706` |
| 7 | packaging | Empaque | 1d | `777...707` |

## Suppliers (2)

| UUID suffix | Name | Payment |
|-------------|------|---------|
| `ddd...d01` | AgroInsumos SAS | Net 30 |
| `ddd...d02` | BioNutrientes Ltda | Net 15 |

## Products (10)

| UUID suffix | SKU | Name | Category | Threshold |
|-------------|-----|------|----------|-----------|
| `aaa...001` | SEM-GELATO-FEM | Semilla Gelato #41 | Seeds | 20u |
| `aaa...002` | CLN-GELATO | Clon Gelato #41 | Vegetal | — |
| `aaa...003` | CANO3-25KG | Nitrato de Calcio 25kg | Nutrients | 5000g |
| `aaa...004` | WET-GELATO | Flor Humeda Gelato | Vegetal | — |
| `aaa...005` | DRY-GELATO | Flor Seca Gelato | Vegetal | — |
| `aaa...006` | COCO-70-30 | Sustrato Coco/Perlita | Substrate | — |
| `aaa...007` | FUNG-COPPER | Fungicida Cobre 1L | Supplies | 500mL |
| `aaa...008` | ROOT-GEL-500 | Gel Enraizador 500mL | Nutrients | 200mL |
| `aaa...009` | SEM-OGK-FEM | Semilla OG Kush | Seeds | — |
| `aaa...010` | TRIM-GELATO | Trim Gelato #41 | Vegetal | — |

## Production Orders (5)

| UUID suffix | Code | Cultivar | Status | Priority |
|-------------|------|----------|--------|----------|
| `bbb...b01` | OP-2026-001 | Gelato | approved | normal |
| `bbb...b02` | OP-2026-002 | OG Kush | draft | low |
| `bbb...b03` | OP-2026-003 | Gelato | in_progress | high |
| `bbb...b04` | OP-2026-004 | Gelato | completed | normal |
| `bbb...b05` | OP-2026-005 | OG Kush | cancelled | normal |

## Batches (5)

| UUID suffix | Code | Phase | Status | Order | Parent |
|-------------|------|-------|--------|-------|--------|
| `ccc...c01` | LOT-GELATO-260301 | germination | active | OP-001 | — |
| `ccc...c02` | LOT-GELATO-260201 | vegetative | active | OP-003 | — |
| `ccc...c03` | LOT-GELATO-260101 | drying | active | OP-004 | — |
| `ccc...c04` | LOT-GELATO-260101-A | drying | active | OP-004 | c03 |
| `ccc...c05` | LOT-GELATO-260101-B | drying | completed | OP-004 | c03 |

## Activity Types (4)

| UUID suffix | Name | Category |
|-------------|------|----------|
| `eee...e01` | Fertirrigacion | nutricion |
| `eee...e02` | Poda | mantenimiento |
| `eee...e03` | Inspeccion | monitoreo |
| `eee...e04` | Cosecha | produccion |

## Activity Templates (4)

| UUID suffix | Code | Name | Frequency |
|-------------|------|------|-----------|
| `eee...101` | FERT-VEG-D | Fertirrigacion Veg Diaria | daily |
| `eee...102` | PODA-VEG-W | Poda Apical Semanal | weekly |
| `eee...103` | INSP-GEN-D | Inspeccion General Diaria | daily |
| `eee...104` | COS-FLOR-O | Cosecha de Floracion | once |

## Scheduled Activities (~20 for batch 002)

| Status | Count | Date range |
|--------|-------|------------|
| pending | 6 | today, +1, +2 |
| overdue | 4 | -2, -1 |
| completed | 6 | -5, -4, -3 |
| skipped | 4 | -7, -6 |

## Executed Activities (6)

All performed by operator (222...203) on batch 002 in Sala Vegetativo A.
3 fertiriego + 3 inspeccion over days 17-19.

## Inventory Items (14)

| UUID suffix | Product | Zone | Qty | Status | Notes |
|-------------|---------|------|-----|--------|-------|
| `ii001` | Semilla Gelato | Prop | 85u | available | — |
| `ii002` | Semilla OG Kush | Prop | 15u | available | — |
| `ii003` | CaNO3 | Veg | 3500g | available | **LOW** (< 5000) |
| `ii004` | CaNO3 | Flor | 8000g | available | — |
| `ii005` | Coco/Perlita | Veg | 120L | available | — |
| `ii006` | Fungicida | Prop | 250mL | available | **Expires in 15d** |
| `ii007` | Root Gel | Prop | 350mL | available | — |
| `ii008` | Fungicida (old) | Veg | 100mL | **expired** | -30d |
| `ii009` | Flor Humeda | Flor | 11500g | available | batch 003 |
| `ii010` | Flor Seca | Flor | 2800g | available | batch 004-A |
| `ii011` | Trim | Flor | 800g | available | byproduct |
| `ii012` | Clones | Prop | 30u | available | produced |
| `ii013` | Coco/Perlita | Prop | 0L | **depleted** | — |
| `ii014` | OG Kush seeds | Veg | 8u | available | **LOW** |

## Inventory Transactions (19)

| Type | Count | Notes |
|------|-------|-------|
| receipt | 6 | Initial purchases |
| consumption | 6 | Activity-driven |
| transformation_in | 3 | Harvest + drying outputs |
| adjustment | 2 | Evaporation, breakage |
| transfer_out/in | 2 | CaNO3 veg→flor (paired) |

## Quality Tests (6)

| UUID suffix | Batch | Type | Status | Pass? |
|-------------|-------|------|--------|-------|
| `qq001` | c03 (drying) | Cannabinoids | completed | yes |
| `qq002` | c03 (drying) | Microbiology | completed | **NO** |
| `qq003` | c04 (split A) | Cannabinoids | pending | — |
| `qq004` | c02 (veg) | Pesticides | in_progress | — |
| `qq005` | c05 (split B) | Cannabinoids | completed | yes |
| `qq006` | c01 (germ) | Seed Viability | pending | — |

## Zone Structures (4)

| UUID suffix | Zone | Name | Type | Positions |
|-------------|------|------|------|-----------|
| `zz01` | Prop | Rack Propagacion A | mobile_rack | 72 (3 levels) |
| `zz02` | Prop | Rack Propagacion B | mobile_rack | 72 (3 levels) |
| `zz03` | Veg | Mesa Vegetativo 1 | fixed_rack | 20 (1 level) |
| `zz04` | Flor | Mesa Floracion 1 | fixed_rack | 16 (1 level) |

## Plant Positions (20)

| Status | Count | Zone | Notes |
|--------|-------|------|-------|
| planted | 8 | Prop (Rack A) | batch 001 |
| empty | 6 | Prop (Rack A+B) | — |
| harvested | 4 | Veg (Mesa 1) | previous batch |
| maintenance | 2 | Flor (Mesa 1) | — |

## Sensors (8)

| UUID suffix | Zone | Type | Active |
|-------------|------|------|--------|
| `ff...01` | Prop | temperature | yes |
| `ff...02` | Prop | humidity | yes |
| `ff...03` | Veg | temperature | yes |
| `ff...04` | Veg | humidity | yes |
| `ff...05` | Veg | co2 | yes |
| `ff...06` | Flor | temperature | yes |
| `ff...07` | Flor | humidity | yes |
| `ff...08` | Flor | co2 | **no** |

## Environmental Readings

~1176 rows (7 days × 24h/day × 7 sensor series). Generated via `generate_series`.

## Alerts (12)

| Status | Count | Types |
|--------|-------|-------|
| Pending | 5 | overdue_activity(2), low_inventory, expiring_item, quality_failed |
| Acknowledged | 3 | env_out_of_range(2), low_inventory |
| Resolved | 4 | overdue_activity, env_out_of_range, stale_batch, order_delayed |

## Overhead Costs (5)

| UUID suffix | Type | Amount (COP) | Basis |
|-------------|------|-------------|-------|
| `oo01` | energy | 4,500,000 | per_m2 |
| `oo02` | rent | 8,000,000 | per_m2 |
| `oo03` | labor_fixed | 12,000,000 | per_plant |
| `oo04` | maintenance | 1,200,000 | per_zone |
| `oo05` | insurance | 3,600,000 | even_split |
