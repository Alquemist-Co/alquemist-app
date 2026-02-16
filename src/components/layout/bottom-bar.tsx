"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { getBottomBarTabs } from "@/lib/nav/navigation";

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface BottomBarProps {
  onMorePress: () => void;
}

export function BottomBar({ onMorePress }: BottomBarProps) {
  const pathname = usePathname();
  const { role } = useAuth();

  const tabs = role ? getBottomBarTabs(role) : [];

  return (
    <nav
      aria-label="Navegacion principal"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex lg:hidden",
        "h-(--height-bottombar) items-center justify-around",
        "border-t border-border bg-white/90 backdrop-blur-sm",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href, pathname);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1",
              "text-[10px] font-medium transition-colors duration-150",
              active ? "text-brand" : "text-text-secondary"
            )}
          >
            <div className="relative">
              {active && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-brand" />
              )}
              <tab.icon className="size-5" strokeWidth={1.5} />
            </div>
            <span>{tab.label}</span>
          </Link>
        );
      })}

      {/* "Mas" tab */}
      <button
        type="button"
        onClick={onMorePress}
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1",
          "text-[10px] font-medium text-text-secondary",
          "transition-colors duration-150 cursor-pointer"
        )}
      >
        <MoreHorizontal className="size-5" strokeWidth={1.5} />
        <span>Mas</span>
      </button>
    </nav>
  );
}
