"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-logout";
import { getMoreMenuModules } from "@/lib/nav/navigation";

interface MoreMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MoreMenu({ open, onClose }: MoreMenuProps) {
  const router = useRouter();
  const { role } = useAuth();
  const { logout } = useLogout();

  const modules = role ? getMoreMenuModules(role) : [];

  function handleNavigate(href: string) {
    onClose();
    router.push(href);
  }

  async function handleLogout() {
    onClose();
    await logout();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Mas">
      <div className="rounded-card bg-brand p-4">
        <div className="grid grid-cols-3 gap-4">
          {modules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => handleNavigate(mod.href)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-badge p-3",
                "text-brand-light hover:bg-white/10",
                "transition-colors duration-150 cursor-pointer"
              )}
            >
              <mod.icon className="size-6" strokeWidth={1.5} />
              <span className="text-xs font-medium">{mod.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-badge px-3 py-2.5",
            "text-sm font-medium text-text-secondary",
            "hover:bg-surface hover:text-text-primary",
            "transition-colors duration-150 cursor-pointer"
          )}
        >
          <LogOut className="size-5" strokeWidth={1.5} />
          Cerrar sesion
        </button>
      </div>
    </Dialog>
  );
}
