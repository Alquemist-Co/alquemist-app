# Changelog

## 2026-02-16

### F-004: Autenticacion y middleware de roles — Done
- US-004-001: Pantalla de login con Supabase Auth (RHF + Zod + signInWithPassword)
- US-004-002: Middleware de proteccion de rutas por rol (getUser, route-access matrix, header injection)
- US-004-003: Sistema de permisos por rol en frontend (permissions map, Zustand auth store, useAuth hook, AuthProvider, RoleGate, PermissionGate, requireAuth server helper)
- US-004-004: Logout y manejo de sesion expirada (useLogout hook, LogoutButton, clearAuth)
- **Commits**: 8bcb4c8, 189aa6c, 13cdd55, 5069665
- **Notas**: proxy.ts migrado de getClaims() a getUser() (mas seguro). Route groups (auth)/(dashboard). 5 roles con ~25 action-level permissions. AuthProvider con useRef guard para StrictMode. requireAuth() pattern para Server Actions.

### F-002: Design system (componentes base UI) — Done
- US-002-001: Button (primary, secondary, ghost) con cva, loading, icon, sizes
- US-002-002: Card base + StatCard con DM Mono, left border semántico, href opcional
- US-002-003: Input (forwardRef, RHF compatible, error states) + Toggle (switch role)
- US-002-004: Badge (filled, outlined, success, warning, error, info) con truncation
- US-002-005: Dialog nativo con bottom sheet mobile (drag-to-dismiss) + modal desktop
- US-002-006: Table responsive (desktop table + mobile cards) con sort client-side
- US-002-007: Toast con store Zustand (success/error/warning/info, auto-dismiss)
- US-002-008: ProgressBar (aria-progressbar) + Skeleton (shimmer) + EmptyState (icon + CTA)
- US-002-009: Página /design-system con catálogo completo interactivo
- **Commits**: 7d225d5, 3dfdb77, dc42780, 114a8b8, 874a2d6, 648b436, f7af7ff, 1d5c09a, 935bb6d
- **Notas**: Dependencies: class-variance-authority, clsx, tailwind-merge. Utility cn() en lib/utils/cn.ts. ToastContainer global en layout.tsx. Tokens extendidos: radius-dialog, radius-progress, overlay color, keyframe animations (shimmer, slide-up, slide-down, fade-in).

### F-003: Schema de base de datos — Done
- US-003-001: Auth helper functions (auth.company_id, auth.user_role, auth.facility_id)
- US-003-002: Sistema (2) + Produccion (5) = 7 tablas
- US-003-003: Areas (4) + Inventario (8) = 12 tablas
- US-003-004: Actividades (10 tablas)
- US-003-005: Nexo (2) + Ordenes (2) + Calidad (2) + Operaciones (5) = 11 tablas
- US-003-006: RLS policies tipo A, B, C, D para todas las tablas
- US-003-007: Drizzle ORM schema tipado por dominio + postgres.js driver
- US-003-008: Seed data (1 company, 3 users, 2 crop types, 3 cultivars, 11 phases, 1 order, 1 batch)
- **Commits**: 83c795a, 881866e, 8e3a292, ee08f6d, 334db57, 066dd4f, 5ac3a99, 0627112
- **Notas**: SQL manual (no drizzle-kit generate). FKs diferidas con ALTER TABLE para dependencias circulares. ~32 ENUMs. Triggers para updated_at, inmutabilidad de inventory_transactions, auto-populate company_id. Indices compuestos para queries frecuentes.

### F-001: Setup del proyecto y deploy — Done
- US-001-001: Proyecto Next.js 16 + TypeScript + Tailwind v4
- US-001-002: Dependencias core instaladas
- US-001-003: Supabase client helpers + env configurado
- US-001-004: Tailwind v4 brand tokens + DM Sans/Mono
- US-001-005: Deploy en Vercel con CI/CD
- **Commits**: fd2da48, a139654
- **Notas**: Tailwind v4 usa @theme inline en CSS. Supabase API migro a publishable key + proxy.ts + getClaims().
