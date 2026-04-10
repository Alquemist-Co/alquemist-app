# Production UX Improvements — Design Spec

## Context

The production module (Phase 4) is fully implemented with 4 PRDs (22-25) covering orders and batches. Current pain points:

1. `/production` is a dead-end redirect to `/production/orders` — no overview of production state
2. The batches list shows a flat table with basic KPIs — no visual pipeline view showing batches by phase
3. The batch detail page displays phases in a 10-column data table — functional but dense, lacking visual hierarchy

These changes improve the operator/manager experience without requiring new database tables or migrations. All data already exists.

---

## Feature 1: Production Dashboard (`/production`)

### Goal

Replace the redirect stub with a dashboard page that gives managers a quick overview of all active production by phase.

### Two Views (toggle via URL param `?view=summary|kanban`)

#### Summary View (default)

- **4 KPI cards** at top (same pattern as batches page): Activos, En transicion, En espera, Completados (mes)
- **Phase bars section**: One horizontal bar per production phase, sized proportionally to the phase with the most batches
  - Each bar shows: phase name, batch count, total plant count
  - Bars ordered by `production_phases.sort_order`
  - Bars clickable -> navigate to `/production/batches?current_phase_id=<id>`
  - Use phase `color` column if populated, otherwise default color palette

#### Kanban View

- **Columns per production phase** in a horizontal scrollable container
- Column header: phase name + batch count badge
- **Batch cards** stacked in each column:
  - Batch code (monospace)
  - Cultivar name
  - Plant count + zone name
  - Days in current phase
  - Status badge (active/phase_transition/on_hold)
- Cards clickable -> navigate to `/production/batches/<id>`
- Empty columns show "Sin lotes en esta fase" in muted text
- Only active batches shown (status in: active, phase_transition, on_hold)

### Data Requirements

Server component runs 7 parallel Supabase queries:

1. **Active batches** with joins (cultivar, phase with sort_order, zone with facility, order)
2. **In-progress order phases** (to compute days in current phase via `actual_start_date`)
3. **All production phases** ordered by sort_order (for column headers/ordering)
4. **KPI: active count** (status in active, phase_transition)
5. **KPI: transition count** (status = phase_transition)
6. **KPI: on hold count** (status = on_hold)
7. **KPI: completed this month** (status = completed, updated_at >= first of month)

No pagination needed — dashboard shows all active batches (typically low hundreds max).

### View Toggle

URL search param `?view=summary|kanban`, defaulting to `summary`. Uses shadcn `Tabs` component wired to `useSearchParams` + `router.push` — same pattern as existing tab wrappers in the codebase.

### Files

| File | Action | Purpose |
|------|--------|---------|
| `app/(dashboard)/production/page.tsx` | Rewrite | Server component: data fetching + render client |
| `components/production/dashboard-client.tsx` | Create | Client component with view toggle |
| `components/production/dashboard-shared.tsx` | Create | Types: `DashboardBatchRow`, `DashboardPhase` |
| `components/dashboard/nav-main.tsx` | Modify | Add "Dashboard" as first child under Produccion |

### Types

```typescript
// dashboard-shared.tsx
export type DashboardBatchRow = {
  id: string
  code: string
  status: string
  cultivar_name: string
  phase_id: string
  phase_name: string
  phase_sort_order: number
  zone_name: string
  facility_name: string
  plant_count: number | null
  days_in_phase: number
}

export type DashboardPhase = {
  id: string
  name: string
  code: string
  sort_order: number
  color: string | null
  batch_count: number
  total_plants: number
}
```

---

## Feature 2: Phase Cards in Batch Detail

### Goal

Replace the 10-column phase table in batch detail with expandable cards that provide better visual hierarchy and readability.

### Card Design

Each phase renders as a collapsible card:

**Header (always visible):**
- Status icon: `CheckCircle2` (completed, green), `Circle` (current, blue), `CircleDashed` (pending, gray)
- Phase name (bold)
- Status badge (reuses `orderPhaseStatusBadgeStyles` from `orders-shared.tsx`)
- Expand/collapse chevron

**Expanded content (grid layout):**
- Duracion: `{planned_duration_days} dias`
- Zona: `{zone_name}`
- Rendimiento: `{expected_input_qty} -> {expected_output_qty} ({yield_pct}%)`
- Planificado: `{planned_start_date} — {planned_end_date}`
- Real: `{actual_start_date} — {actual_end_date}`

### Visual States

| State | Default | Style |
|-------|---------|-------|
| Completed | Collapsed | Normal text, green check icon |
| Current (phase_id matches batch.phase_id) | Expanded | `border-l-2 border-blue-500`, `bg-blue-50/50 dark:bg-blue-950/20` |
| Pending/Ready | Collapsed | `text-muted-foreground`, subtle opacity |
| Skipped | Collapsed | Strikethrough phase name, gray icon |

### Section Header

"Timeline de fases" title with completion counter ("{N} de {M} fases completadas") — moved from the table section into the cards component.

### Files

| File | Action | Purpose |
|------|--------|---------|
| `components/production/batch-phase-cards.tsx` | Create | Phase cards component |
| `components/production/batch-detail-client.tsx` | Modify | Replace phase table (lines ~362-430) with `<BatchPhaseCards>` |

### Props

```typescript
type BatchPhaseCardsProps = {
  phases: OrderPhaseData[]  // Existing type
  currentPhaseId: string    // batch.phase_id
}
```

### Reuse

- `OrderPhaseData` type from `batch-detail-client.tsx`
- `orderPhaseStatusLabels`, `orderPhaseStatusBadgeStyles` from `orders-shared.tsx`
- `formatDate`, `fmtQty`, `fmtPct` helpers (extract or inline)
- shadcn: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `Badge`
- lucide-react: `CheckCircle2`, `Circle`, `CircleDashed`, `ChevronDown`

### Information Preservation

All 10 columns from the current table are preserved in the card format:
- `#` (sort_order) -> implicit in card order
- `Fase` -> card header
- `Estado` -> badge in header
- `Duracion` -> expanded content
- `Zona` -> expanded content
- `Inicio plan.` / `Fin plan.` -> combined "Planificado" line
- `Inicio real` / `Fin real` -> combined "Real" line
- `Rend.%` -> expanded with input/output context

---

## Out of Scope

- No new database tables or migrations
- No changes to the order pages (PRD 22-23)
- No drag-and-drop in kanban (read-only view)
- No real-time updates (standard page refresh)
- No changes to the batches list page (PRD 24) — the dashboard complements, not replaces it
