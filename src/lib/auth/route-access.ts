import type { UserRole } from "./types";

/**
 * Routes that are accessible without authentication.
 */
const PUBLIC_ROUTES = ["/login", "/design-system"];
const PUBLIC_PREFIXES = ["/api/webhooks/"];

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Route-to-role restriction map.
 * Only restricted routes are listed — all other authenticated routes
 * are accessible to every role.
 */
const RESTRICTED_ROUTES: Record<string, UserRole[]> = {
  "/orders": ["supervisor", "manager", "admin", "viewer"],
  "/settings": ["supervisor", "manager", "admin"],
};

/**
 * Check if a role has access to a given pathname.
 * Returns true if the route is unrestricted or the role is allowed.
 */
export function canAccessRoute(pathname: string, role: UserRole): boolean {
  for (const [route, allowedRoles] of Object.entries(RESTRICTED_ROUTES)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return allowedRoles.includes(role);
    }
  }
  return true;
}
