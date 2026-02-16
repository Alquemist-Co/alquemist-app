-- 02_auth_helpers.sql
-- US-003-001: Auth helper functions for RLS
-- Created in public schema (auth schema is managed by Supabase).
-- They extract tenant info from the Supabase JWT (app_metadata).
-- Return NULL if the claim doesn't exist (secure by default).

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.current_facility_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'facility_id')::uuid;
$$ LANGUAGE sql STABLE;
