import {
  Home,
  Sprout,
  ClipboardList,
  Zap,
  Package,
  MapPin,
  FlaskConical,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/types";
import { canAccessModule } from "@/lib/auth/permissions";

export interface NavModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_MODULES: NavModule[] = [
  { id: "dashboard", label: "Inicio", href: "/", icon: Home },
  { id: "batches", label: "Batches", href: "/batches", icon: Sprout },
  { id: "orders", label: "Ordenes", href: "/orders", icon: ClipboardList },
  { id: "activities", label: "Actividades", href: "/activities", icon: Zap },
  { id: "inventory", label: "Inventario", href: "/inventory", icon: Package },
  { id: "areas", label: "Areas", href: "/areas", icon: MapPin },
  { id: "quality", label: "Calidad", href: "/quality", icon: FlaskConical },
  { id: "operations", label: "Operaciones", href: "/operations", icon: Radio },
  { id: "settings", label: "Configuracion", href: "/settings", icon: Settings },
];

/** Get modules accessible by a role */
export function getModulesForRole(role: UserRole): NavModule[] {
  return NAV_MODULES.filter((m) => canAccessModule(role, m.id));
}

/** Get a module by its href (for breadcrumbs) */
export function getModuleByHref(href: string): NavModule | undefined {
  return NAV_MODULES.find((m) => m.href === href);
}

/** Bottom bar tabs: 4 primary tabs per role (the 5th is always "Mas") */
export const BOTTOM_BAR_TABS: Record<UserRole, string[]> = {
  operator: ["/", "/activities", "/inventory", "/batches"],
  supervisor: ["/", "/batches", "/activities", "/operations"],
  manager: ["/", "/orders", "/batches", "/operations"],
  admin: ["/", "/settings", "/batches", "/operations"],
  viewer: ["/", "/batches", "/orders", "/quality"],
};

/** Get bottom bar tab modules for a role */
export function getBottomBarTabs(role: UserRole): NavModule[] {
  const hrefs = BOTTOM_BAR_TABS[role];
  return hrefs
    .map((href) => NAV_MODULES.find((m) => m.href === href))
    .filter((m): m is NavModule => m !== undefined);
}

/** Get modules for the "More" menu (accessible modules minus bottom bar tabs) */
export function getMoreMenuModules(role: UserRole): NavModule[] {
  const bottomHrefs = new Set(BOTTOM_BAR_TABS[role]);
  return getModulesForRole(role).filter((m) => !bottomHrefs.has(m.href));
}

/** Role display labels */
export const ROLE_LABELS: Record<UserRole, string> = {
  operator: "Operador",
  supervisor: "Supervisor",
  manager: "Gerente",
  admin: "Administrador",
  viewer: "Viewer",
};
