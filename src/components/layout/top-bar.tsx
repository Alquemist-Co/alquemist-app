"use client";

import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Breadcrumbs } from "./breadcrumbs";
import { UserMenu } from "./user-menu";
import { getModuleByHref } from "@/lib/nav/navigation";

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Inicio";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0) {
    const mod = getModuleByHref(`/${segments[0]}`);
    if (mod) return mod.label;
  }
  return "Alquemist";
}

export function TopBar() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface",
        "h-(--height-topbar-mobile) px-4",
        "lg:h-(--height-topbar) lg:px-6"
      )}
    >
      {/* Left: breadcrumbs (desktop) / page title (mobile) */}
      <div className="min-w-0">
        <div className="hidden lg:block">
          <Breadcrumbs />
        </div>
        <h1 className="text-base font-bold text-text-primary truncate lg:hidden">
          {pageTitle}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Buscar (Cmd+K)"
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            "text-text-secondary hover:bg-white hover:text-text-primary",
            "transition-colors duration-150 cursor-pointer"
          )}
        >
          <Search className="size-5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Notificaciones"
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            "text-text-secondary hover:bg-white hover:text-text-primary",
            "transition-colors duration-150 cursor-pointer"
          )}
        >
          <Bell className="size-5" strokeWidth={1.5} />
        </button>
        <div className="hidden lg:block">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
