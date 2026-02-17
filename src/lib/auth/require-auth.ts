import { createClient } from "@/lib/supabase/server";
import type { AuthClaims, UserRole } from "./types";

const VALID_ROLES: UserRole[] = [
  "operator",
  "supervisor",
  "manager",
  "admin",
  "viewer",
];

/**
 * Server-side auth guard for Server Actions.
 * Verifies the user session and optionally checks role access.
 *
 * @param allowedRoles - If provided, only these roles are allowed.
 * @returns The authenticated user's claims.
 * @throws Error("Unauthorized") if no session.
 * @throws Error("Forbidden: role <role>") if role not allowed.
 */
export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<AuthClaims> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const rawRole = user.app_metadata?.role as string | undefined;
  const role: UserRole =
    rawRole && VALID_ROLES.includes(rawRole as UserRole)
      ? (rawRole as UserRole)
      : "viewer";

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new Error(`Forbidden: role ${role}`);
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role,
    companyId: (user.app_metadata?.company_id as string) ?? "",
    facilityId: (user.app_metadata?.facility_id as string) ?? null,
    fullName: (user.user_metadata?.full_name as string) ?? "",
  };
}
