import { describe, it, expect } from "vitest";
import {
  canAccessModule,
  hasPermission,
} from "@/lib/auth/permissions";

describe("canAccessModule", () => {
  it("allows all roles to access dashboard", () => {
    const roles = ["operator", "supervisor", "manager", "admin", "viewer"] as const;
    for (const role of roles) {
      expect(canAccessModule(role, "dashboard")).toBe(true);
    }
  });

  it("restricts orders from operator", () => {
    expect(canAccessModule("operator", "orders")).toBe(false);
    expect(canAccessModule("supervisor", "orders")).toBe(true);
    expect(canAccessModule("manager", "orders")).toBe(true);
  });

  it("restricts settings from operator and viewer", () => {
    expect(canAccessModule("operator", "settings")).toBe(false);
    expect(canAccessModule("viewer", "settings")).toBe(false);
    expect(canAccessModule("supervisor", "settings")).toBe(true);
    expect(canAccessModule("admin", "settings")).toBe(true);
  });

  it("returns false for unknown module", () => {
    expect(canAccessModule("admin", "nonexistent")).toBe(false);
  });
});

describe("hasPermission", () => {
  it("only admin can manage_users", () => {
    expect(hasPermission("admin", "manage_users")).toBe(true);
    expect(hasPermission("manager", "manage_users")).toBe(false);
    expect(hasPermission("supervisor", "manage_users")).toBe(false);
    expect(hasPermission("operator", "manage_users")).toBe(false);
  });

  it("operator and supervisor can execute_activity", () => {
    expect(hasPermission("operator", "execute_activity")).toBe(true);
    expect(hasPermission("supervisor", "execute_activity")).toBe(true);
    expect(hasPermission("manager", "execute_activity")).toBe(false);
  });

  it("manager and admin can approve_order", () => {
    expect(hasPermission("manager", "approve_order")).toBe(true);
    expect(hasPermission("admin", "approve_order")).toBe(true);
    expect(hasPermission("supervisor", "approve_order")).toBe(false);
  });

  it("viewer can view_costs but not manage them", () => {
    expect(hasPermission("viewer", "view_costs")).toBe(true);
    expect(hasPermission("viewer", "manage_overhead_costs")).toBe(false);
  });

  it("returns false for unknown action", () => {
    expect(hasPermission("admin", "fly_to_mars")).toBe(false);
  });
});
