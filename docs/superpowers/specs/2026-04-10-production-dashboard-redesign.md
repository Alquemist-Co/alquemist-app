# Production Dashboard Redesign — Spec

## Context

The current production dashboard (`/production`) has a flat layout with KPI cards, an attention panel, and two tab views (Cultivars + Kanban). It works but lacks operational clarity: information is spread across views, there's no way to see production flow per crop type, and the mobile experience is limited.

This redesign replaces the entire page with a **stepper-based phase pipeline view** grouped by crop type, optimized for both supervisors (daily operations) and managers (macro overview).

## Design Decisions

- **Crop type dropdown** drives the page — production_phases are per crop_type (`production_phases.crop_type_id`), so switching crop type changes which phases are shown
- **Stepper layout** — vertical cards connected by a stepper line, one per phase, ordered by `sort_order`
- **Mobile-first** — 2-line compact rows on mobile, single-line on desktop
- **Collapsible batch lists** — show first 2 batches per phase, "+N más" to expand
- **URL state** — all filters stored in search params for shareable/bookmarkable views

## Architecture

### Server Component: `app/(dashboard)/production/page.tsx`

Fetches all data in parallel, passes to client component. Replaces the current implementation entirely.

**Queries:**
1. Active batches with joins (cultivar, phase, zone, facility) — same as current but also join `crop_types` via cultivar
2. Production phases with `crop_type_id` — ordered by `sort_order`
3. Crop types (distinct from active batches) — for the dropdown
4. In-progress order phases — for days-in-phase calculation (same as current)
5. KPI counts — active, transition, on_hold, completed this month (same as current)

### Client Component: `components/production/dashboard-client.tsx`

Complete rewrite. Single component file with sub-components.

### Shared Types: `components/production/dashboard-shared.tsx`

Update types to include `crop_type_id` on phases and `crop_type_id` on batches.

## Page Sections

### 1. Global KPIs (top)

5 cards in a row, responsive: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`

**KPIs are global** — they do NOT change when crop type or filters change. They always reflect the full production state across all crop types.

| KPI | Source | Color | Click target |
|-----|--------|-------|-------------|
| Lotes activos | count(active + phase_transition) | default | `/production/batches?status=active` |
| En transición | count(phase_transition) | yellow if > 0 | `/production/batches?status=phase_transition` |
| En espera | count(on_hold) | red if > 0 | `/production/batches?status=on_hold` |
| Completados (mes) | count(completed, this month) | green | `/production/batches?status=completed` |
| Duración prom. | avg days from start_date to now for active batches | default | — |

Subtitle on "Lotes activos": total plant count formatted with `es-CO` locale.

### 2. Toolbar

Flex row, wraps on mobile.

**Left side:**
- **Crop type dropdown** — `Select` component (shadcn). Options from crop types that have active batches. Default: first crop type with most active batches. URL param: `crop_type`
- **Filter button** — `FilterPopover` (existing component). Filters inside:
  - Instalación (facility) — single select from available facilities
  - Estado — checkboxes: activo, en transición, en espera (default: all checked)
  - Cultivar — single select from available cultivars for the selected crop type

**Right side:**
- Summary text: "{N} lotes · {M} instalaciones" (muted, text-xs/text-sm)

### 3. Phase Stepper

Vertical stepper layout. Each phase of the selected crop type rendered as a card.

#### Stepper structure:
```
[Circle 1] ─── Phase Card 1 (header + batch rows)
    │
[Circle 2] ─── Phase Card 2 (header + batch rows)
    │
[Circle 3] ─── Phase Card 3 (collapsed)
```

#### Stepper circle:
- Numbered (1, 2, 3...)
- Color: phase color from `production_phases.color` (border + text)
- Background: phase color at 20% opacity
- Size: `w-7 h-7` (28px)
- Connecting line: 2px wide, gradient from current phase color to `border` color

#### Phase Card:

**Header row** (always visible):
- Phase color dot (8px)
- Phase name (font-semibold, 14px)
- Phase code badge (secondary, muted)
- Right side analytics:
  - `Lotes {N}` — batch count in this phase
  - `Plantas {N}` — total plants in this phase (formatted es-CO)
  - `Prom. {N} / {M} días` — average `days_in_phase` across filtered batches in this phase / `default_duration_days` from phase config. If no batches, show `— / {M} días`

**Batch rows** (inside card, below header):
- Default: show first 2 batches, collapsed
- "+N lotes más" button to expand all
- When phase has 0 batches: show subtle "Sin lotes en esta fase" text

#### Batch Row (desktop — `sm:` and above):

Single line with flex layout:

```
[dot] CODE    CULTIVAR    [BADGE?]     |   PLANTS 🌱   ZONE   DAYS/EXPECTED   [PROGRESS BAR]
```

- **Status dot** (7px): green = active, yellow = phase_transition, red = on_hold or overdue
- **Code**: mono font, font-medium, 12px. Class: `font-mono text-xs font-medium`
- **Cultivar name**: muted, truncate with `max-w-[120px] sm:max-w-[160px] truncate`
- **Status badge**: only shown if NOT "active". Uses existing `batchStatusBadgeStyles` and `batchStatusLabels`
- **Plants**: muted, 12px, with plant emoji or Sprout icon
- **Zone**: muted, 12px, `max-w-[100px] truncate` — shows zone name only, facility on tooltip
- **Days**: `{days_in_phase}` bold + `/ {expected}` muted. Red color if overdue
- **Progress bar**: 48px wide, 4px tall. Color: green < 80%, yellow 80-100%, red > 100%

**Row is clickable** → navigates to `/production/batches/{id}`

#### Batch Row (mobile — below `sm:`):

Two lines stacked:

```
Line 1: [dot]  CODE  CULTIVAR_TRUNCATED  [BADGE?]
Line 2:        PLANTS   ZONE_TRUNCATED   DAYS/EXPECTED  [PROGRESS BAR]
```

- Line 2 indented to align with text (not dot)
- Zone truncated to `max-w-[80px]`
- Same click behavior

### Responsive Breakpoints

| Element | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|---------|----------------|--------------------|--------------------|
| KPI grid | 2 cols | 3 cols | 5 cols |
| Toolbar | stacked (dropdown above, filters below) | single row | single row |
| Phase analytics | hidden, show only batch count | show all | show all |
| Batch rows | 2-line stacked | single line | single line |
| Zone text | truncate 80px | truncate 100px | truncate 140px |
| Cultivar text | truncate 100px | truncate 140px | truncate 180px |

### Empty States

- **No batches at all**: Full-page empty state with icon, message, and link to orders (same as current `EmptyState`)
- **No batches for selected crop type**: "No hay lotes activos para {crop_type_name}. Selecciona otro tipo de cultivo."
- **Phase with 0 batches**: Subtle inline text "Sin lotes" in phase card, no batch list rendered

### State Management

All filter state via URL search params (same pattern as current):
- `crop_type` — selected crop type ID (default: first with most batches)
- `facility` — selected facility name (default: all)
- `status` — comma-separated statuses (default: `active,phase_transition,on_hold`)
- `cultivar` — selected cultivar ID (default: all)

### Colors

Use existing phase colors from `production_phases.color` field. Fallback: `hsl(var(--primary))`.

Status dots and progress bars use the same semantic colors as current:
- Green: `#22c55e` (Tailwind green-500)
- Yellow: `#eab308` (Tailwind yellow-500)  
- Red: `#ef4444` (Tailwind red-500)

### Interactions

- **Click KPI card** → navigate to batches list with matching filter
- **Change crop type dropdown** → update URL param, re-filter phases and batches
- **Click filter** → popover with filter controls, applies on change
- **Click "+N lotes más"** → expand all batches in that phase (client state, no URL)
- **Click batch row** → navigate to `/production/batches/{id}`
- **Hover batch row** → subtle bg change (`hover:bg-muted/50`)

## Files to Modify

| File | Action |
|------|--------|
| `app/(dashboard)/production/page.tsx` | Rewrite — add crop_types query, restructure data |
| `components/production/dashboard-client.tsx` | Full rewrite — stepper layout |
| `components/production/dashboard-shared.tsx` | Update types — add crop_type_id to phases, add crop type list |

## Files to Delete

| File | Reason |
|------|--------|
| None | dashboard-client.tsx and dashboard-shared.tsx are rewritten in place |

## Reusable Existing Code

- `FilterPopover` from `components/settings/filter-popover.tsx` — for filter button
- `batchStatusLabels` and `batchStatusBadgeStyles` from `components/production/batches-shared.tsx`
- `Badge` from `components/ui/badge.tsx`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` from `components/ui/select.tsx`
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `components/ui/collapsible.tsx`
- `cn()` from `lib/utils.ts`
- `Link` from `next/link` for clickable KPI cards and batch rows

## Verification

1. `pnpm type-check` — no TypeScript errors
2. `pnpm lint` — no lint errors
3. `pnpm build` — successful build
4. Visual check on desktop (1440px): KPIs in 5 cols, full batch rows, stepper alignment
5. Visual check on tablet (768px): KPIs in 3 cols, batch rows still single-line
6. Visual check on mobile (375px): KPIs in 2 cols, 2-line batch rows, toolbar stacked
7. Functional: switching crop type changes visible phases
8. Functional: filter by facility/status/cultivar filters batch list correctly
9. Functional: clicking batch row navigates to detail page
10. Functional: "+N más" expands collapsed batches
