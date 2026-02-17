import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very
  // hard to debug issues with users being randomly logged out.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  let sessionCleared = false;

  if (error) {
    console.warn(
      `[auth] getUser error: ${error.message} (${error.status ?? ""})`
    );

    // Clear stale auth cookies to break the redirect loop
    const staleCookies = request.cookies
      .getAll()
      .filter(
        ({ name }) => name.startsWith("sb-") && name.includes("-auth-token")
      );

    if (staleCookies.length > 0) {
      sessionCleared = true;
      supabaseResponse = NextResponse.next({ request });
      for (const { name } of staleCookies) {
        request.cookies.delete(name);
        supabaseResponse.cookies.set(name, "", { path: "/", maxAge: 0 });
      }
    }
  }

  return { response: supabaseResponse, user, sessionCleared };
}
