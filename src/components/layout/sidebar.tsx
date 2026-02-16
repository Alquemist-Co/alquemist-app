"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useSidebarStore } from "@/stores/sidebar-store";
import { getModulesForRole, ROLE_LABELS } from "@/lib/nav/navigation";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { role, fullName, email } = useAuth();
  const { isExpanded, toggle } = useSidebarStore();

  const modules = role ? getModulesForRole(role) : [];

  // Keyboard shortcut: Cmd+B to toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <nav
      aria-label="Menu principal"
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 h-full z-40",
        "bg-brand transition-all duration-250",
        isExpanded ? "w-(--width-sidebar-expanded)" : "w-(--width-sidebar-collapsed)"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-badge bg-brand-light text-sm font-extrabold text-brand">
            A
          </span>
          {isExpanded && (
            <span className="text-sm font-extrabold tracking-wide text-white truncate">
              ALQUEMIST
            </span>
          )}
        </Link>
      </div>

      {/* Toggle button */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={isExpanded ? "Colapsar sidebar" : "Expandir sidebar"}
          className={cn(
            "flex size-8 items-center justify-center rounded-badge",
            "text-white/50 hover:text-white hover:bg-white/10",
            "transition-colors duration-150 cursor-pointer"
          )}
        >
          {isExpanded ? (
            <PanelLeftClose className="size-5" strokeWidth={1.5} />
          ) : (
            <PanelLeftOpen className="size-5" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-1">
          {modules.map((mod) => {
            const active = isActive(mod.href, pathname);
            return (
              <li key={mod.id}>
                <Link
                  href={mod.href}
                  aria-current={active ? "page" : undefined}
                  title={!isExpanded ? mod.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-badge px-3 py-2.5 text-sm font-medium",
                    "transition-colors duration-150 relative",
                    active
                      ? "text-brand-light bg-brand-light/[0.12] border-l-[3px] border-brand-light"
                      : "text-white/50 hover:text-white hover:bg-white/10 border-l-[3px] border-transparent"
                  )}
                >
                  <mod.icon className="size-5 shrink-0" strokeWidth={1.5} />
                  {isExpanded && (
                    <span className="truncate">{mod.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User profile */}
      <div className="border-t border-white/10 p-3">
        <div className={cn(
          "flex items-center gap-3 min-w-0",
          !isExpanded && "justify-center"
        )}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand">
            {getInitials(fullName)}
          </span>
          {isExpanded && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-white truncate">
                {fullName || email}
              </span>
              {role && (
                <Badge variant="outlined" className="mt-0.5 border-brand-light/30 text-brand-light text-[10px]">
                  {ROLE_LABELS[role]}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
