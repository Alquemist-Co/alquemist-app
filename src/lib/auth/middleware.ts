import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { updateSession } from "@/lib/supabase/proxy";
import { isPublicRoute, canAccessRoute } from "./route-access";
import type { UserRole } from "./types";

export async function handleAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes — avoid updateSession() if no auth cookies
  if (isPublicRoute(pathname)) {
    const hasAuthCookies = request.cookies
      .getAll()
      .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));

    if (!hasAuthCookies) {
      return NextResponse.next({ request });
    }

    const { response, user } = await updateSession(request);

    // Authenticated user visiting /login → redirect to dashboard
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return response;
  }

  // Refresh session + get user
  const { response, user, sessionCleared } = await updateSession(request);

  // No session → redirect to login
  if (!user) {
    return redirectToLogin(request, pathname, sessionCleared);
  }

  // Extract role from app_metadata
  const role = extractRole(user);

  // Check route-level access
  if (!canAccessRoute(pathname, role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("forbidden", "true");
    return NextResponse.redirect(url);
  }

  // Inject auth headers for Server Components
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-role", role);
  response.headers.set(
    "x-company-id",
    (user.app_metadata?.company_id as string) ?? ""
  );
  response.headers.set(
    "x-facility-id",
    (user.app_metadata?.facility_id as string) ?? ""
  );

  return response;
}

function redirectToLogin(
  request: NextRequest,
  pathname: string,
  expired = false
) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("redirectTo", pathname);
  if (expired) {
    url.searchParams.set("expired", "true");
  }
  return NextResponse.redirect(url);
}

function extractRole(user: User): UserRole {
  const role = user.app_metadata?.role as string | undefined;
  const validRoles: UserRole[] = [
    "operator",
    "supervisor",
    "manager",
    "admin",
    "viewer",
  ];
  if (role && validRoles.includes(role as UserRole)) {
    return role as UserRole;
  }
  return "viewer";
}
