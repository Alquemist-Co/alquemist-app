# Changelog

## 2026-02-16

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
