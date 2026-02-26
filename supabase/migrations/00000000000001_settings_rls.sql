-- Refine RLS policies for users and companies tables.
-- Splits broad "FOR ALL" tenant_isolation policies into granular per-operation policies.

-- Helper: get the current user's role from JWT app_metadata
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::public.user_role
$$;

-- =============================================================
-- USERS: replace tenant_isolation (FOR ALL) with per-operation
-- =============================================================
DROP POLICY "tenant_isolation" ON users;

-- SELECT: any authenticated user sees users in their company
CREATE POLICY "users_select_company" ON users
  FOR SELECT
  USING (company_id = (SELECT get_my_company_id()));

-- UPDATE: user can update their own record
CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: admin can update any user in their company
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  )
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  );

-- INSERT: admin can invite users to their company
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  );

-- DELETE: admin can deactivate users in their company
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE
  USING (
    company_id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  );

-- =============================================================
-- COMPANIES: replace tenant_isolation (FOR ALL) with per-operation
-- =============================================================
DROP POLICY "tenant_isolation" ON companies;

-- SELECT: any authenticated user sees their own company
CREATE POLICY "companies_select_tenant" ON companies
  FOR SELECT
  USING (id = (SELECT get_my_company_id()));

-- UPDATE: only admin can update company settings
CREATE POLICY "companies_update_admin" ON companies
  FOR UPDATE
  USING (
    id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  )
  WITH CHECK (
    id = (SELECT get_my_company_id())
    AND (SELECT get_my_role()) = 'admin'
  );
