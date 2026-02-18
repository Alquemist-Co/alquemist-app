"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-logout";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/nav/navigation";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fullName, email, role } = useAuth();
  const { logout } = useLogout();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex size-8 items-center justify-center rounded-full",
          "bg-brand text-white text-xs font-bold",
          "hover:ring-2 hover:ring-brand/30 transition-shadow duration-150",
          "cursor-pointer"
        )}
      >
        {getInitials(fullName)}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-64 z-50",
            "rounded-card bg-surface-card border border-border shadow-lg",
            "animate-[fade-in_150ms_ease-out]"
          )}
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-text-primary truncate">
              {fullName || "Usuario"}
            </p>
            <p className="text-xs text-text-secondary truncate">{email}</p>
            {role && (
              <Badge variant="filled" className="mt-1.5">
                {ROLE_LABELS[role]}
              </Badge>
            )}
          </div>
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-secondary",
                "hover:bg-surface hover:text-text-primary transition-colors duration-150",
              )}
            >
              <User className="size-4" strokeWidth={1.5} />
              Mi perfil
            </Link>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await logout();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-secondary",
                "hover:bg-surface hover:text-text-primary transition-colors duration-150",
                "cursor-pointer"
              )}
            >
              <LogOut className="size-4" strokeWidth={1.5} />
              Cerrar sesion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
