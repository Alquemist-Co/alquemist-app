import type { UserRole } from "./types";

/**
 * Module-level access: which roles can see each navigation module.
 * Based on docs/alquemist-pwa-reqs.md "Matriz de Acceso por Rol"
 */
export const MODULE_ACCESS: Record<string, UserRole[]> = {
  dashboard: ["operator", "supervisor", "manager", "admin", "viewer"],
  batches: ["operator", "supervisor", "manager", "admin", "viewer"],
  orders: ["supervisor", "manager", "admin", "viewer"],
  activities: ["operator", "supervisor", "manager", "admin", "viewer"],
  inventory: ["operator", "supervisor", "manager", "admin", "viewer"],
  areas: ["operator", "supervisor", "manager", "admin", "viewer"],
  quality: ["operator", "supervisor", "manager", "admin", "viewer"],
  operations: ["operator", "supervisor", "manager", "admin", "viewer"],
  settings: ["supervisor", "manager", "admin"],
};

/**
 * Action-level permissions derived from docs/alquemist-features.md
 * component-level policies.
 */
export const ACTION_PERMISSIONS: Record<string, UserRole[]> = {
  // Production orders
  create_order: ["manager", "admin"],
  approve_order: ["manager", "admin"],

  // Batches
  advance_phase: ["supervisor", "manager", "admin"],
  split_batch: ["supervisor", "manager", "admin"],

  // Activities
  create_activity: ["operator", "supervisor", "admin"],
  execute_activity: ["operator", "supervisor"],

  // Inventory
  create_inventory_transaction: ["supervisor", "manager", "admin"],
  manage_products: ["supervisor", "manager", "admin"],

  // Quality
  create_quality_test: ["supervisor", "manager", "admin"],
  record_quality_result: ["supervisor", "manager", "admin"],

  // Operations
  manage_overhead_costs: ["manager", "admin"],

  // Settings / Users
  manage_users: ["admin"],
  manage_settings: ["supervisor", "manager", "admin"],
  manage_crop_config: ["admin"],
  manage_templates: ["manager", "admin"],

  // Areas
  manage_areas: ["manager", "admin"],
};

/**
 * Check if a role can access a navigation module.
 */
export function canAccessModule(role: UserRole, module: string): boolean {
  const allowed = MODULE_ACCESS[module];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Check if a role has permission for a specific action.
 */
export function hasPermission(role: UserRole, action: string): boolean {
  const allowed = ACTION_PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
}
