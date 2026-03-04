# Lessons Learned

<!-- Patterns, corrections, and rules captured after user feedback -->

## Phase 3 Hardening (2026-03-02)

### Zod v4 UUID validation is strict
- `z.string().uuid()` in Zod v4 validates RFC 4122 format: version nibble `[1-8]`, variant nibble `[89abAB]`.
- Test UUIDs like `00000000-0000-0000-0000-000000000001` are **rejected** — use proper v4 UUIDs in tests (e.g. `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`).

### `z.record()` requires 2 args in strict TypeScript
- Zod v4: `z.record(z.string(), z.unknown())` — both key and value schemas are required.
- Missing the value schema causes type errors.

### Trigger-generated NOT NULL columns need DEFAULT for clean Supabase types
- If a column is `NOT NULL` and populated by a `BEFORE INSERT` trigger, Supabase's generated Insert types make it required.
- Fix: add `DEFAULT ''` (or appropriate default) so the column becomes optional in generated types. The trigger overwrites the default before the row is visible.

### Supabase `Json` type requires explicit `as Json` casts
- JSONB fields in Supabase Insert/Update payloads need `as Json` cast when the TS type is more specific than `Json`.
- Example: `field_data: docFieldData as Json`.

### `supabase gen types` debug output must be filtered
- `supabase gen types typescript --local` prints "Connecting to db ..." to stdout, corrupting the generated file.
- Fix: redirect stderr with `2>/dev/null` in the `gen:types` script.

### Storage RLS policies must match upload path structure exactly
- If storage RLS checks `(storage.foldername(name))[1] = company_id`, then the upload path **must** start with `{company_id}/...`.
- Using `{shipment_id}/...` directly causes RLS violations.

### Deferred FK constraints for transactional Edge Functions
- When an Edge Function creates related records in the same transaction (e.g., shipment_items → inventory_items), use `DEFERRABLE INITIALLY DEFERRED` on the FK constraint.
- Pattern: `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... DEFERRABLE INITIALLY DEFERRED`.

### Deferred features need explicit ownership in future PRDs
- When deferring a feature from PRD N to Phase M, update THREE places:
  1. The source PRD (mark RF as DIFERIDO with cross-reference)
  2. The master plan (Phase M pre-work section)
  3. The target PRD (add Pre-requisitos section that explicitly owns the migration/implementation)
- Without explicit ownership, deferred items become orphaned and create data integrity gaps.
- Example: Phase 5 deferred pg_cron jobs (expire_documents, check_overdue_activities) — without them, documents never expire and activities never get marked overdue.

### useSearchParams() requires Suspense boundary in Next.js 16
- Pages using `useSearchParams()` fail during static generation without a `<Suspense>` boundary.
- Fix: wrap children in auth layout (or relevant layout) with `<Suspense>`.
