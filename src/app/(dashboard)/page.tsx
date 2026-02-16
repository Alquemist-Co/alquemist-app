import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.app_metadata?.role as string) ?? "unknown";
  const email = user.email ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-card bg-brand">
          <span className="text-2xl font-bold text-white">A</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-brand">
          Alquemist
        </h1>
        <p className="text-sm text-text-secondary">{email}</p>
        <div className="rounded-badge bg-brand-light px-4 py-2 text-sm font-medium text-brand-dark">
          Rol: {role}
        </div>
      </main>
    </div>
  );
}
