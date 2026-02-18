"use server";

import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type UserListItem = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  facilityName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserDetail = UserListItem & {
  phone: string | null;
  facilityId: string | null;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getUsers(): Promise<UserListItem[]> {
  const claims = await requireAuth(["admin"]);

  const rows = await db.execute(sql`
    SELECT
      u.id, u.email, u.full_name, u.role, u.is_active,
      u.last_login_at, u.created_at,
      f.name AS facility_name
    FROM users u
    LEFT JOIN facilities f ON u.assigned_facility_id = f.id
    WHERE u.company_id = ${claims.companyId}
    ORDER BY u.full_name
  `);

  return (
    rows as unknown as {
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
      last_login_at: string | null;
      created_at: string;
      facility_name: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    facilityName: r.facility_name,
    isActive: r.is_active,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  }));
}

export async function getUserById(
  userId: string,
): Promise<UserDetail | null> {
  const claims = await requireAuth(["admin"]);

  const [row] = (await db.execute(sql`
    SELECT
      u.id, u.email, u.full_name, u.role, u.phone,
      u.assigned_facility_id, u.is_active,
      u.last_login_at, u.created_at,
      f.name AS facility_name
    FROM users u
    LEFT JOIN facilities f ON u.assigned_facility_id = f.id
    WHERE u.id = ${userId} AND u.company_id = ${claims.companyId}
  `)) as unknown as {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone: string | null;
    assigned_facility_id: string | null;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    facility_name: string | null;
  }[];

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone,
    facilityId: row.assigned_facility_id,
    facilityName: row.facility_name,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

// ── Mutations ─────────────────────────────────────────────────────

export async function updateUser(
  userId: string,
  data: {
    fullName: string;
    role: string;
    facilityId: string | null;
    phone: string | null;
  },
): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  // Validate not modifying self role
  if (userId === claims.userId && data.role !== claims.role) {
    return { success: false, error: "No puedes cambiar tu propio rol" };
  }

  // Check last admin protection
  if (data.role !== "admin") {
    const [adminCount] = (await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM users
      WHERE company_id = ${claims.companyId}
        AND role = 'admin' AND is_active = true AND id != ${userId}
    `)) as unknown as { count: number }[];
    if (adminCount.count === 0) {
      return {
        success: false,
        error: "Debe haber al menos un administrador activo",
      };
    }
  }

  await db.execute(sql`
    UPDATE users SET
      full_name = ${data.fullName},
      role = ${data.role},
      assigned_facility_id = ${data.facilityId},
      phone = ${data.phone},
      updated_by = ${claims.userId},
      updated_at = NOW()
    WHERE id = ${userId} AND company_id = ${claims.companyId}
  `);

  return { success: true };
}

export async function toggleUserActive(
  userId: string,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  // Check not self-deactivating
  if (userId === claims.userId) {
    return { success: false, error: "No puedes desactivar tu propia cuenta" };
  }

  // Get current state
  const [user] = (await db.execute(sql`
    SELECT role, is_active FROM users
    WHERE id = ${userId} AND company_id = ${claims.companyId}
  `)) as unknown as { role: string; is_active: boolean }[];

  if (!user) return { success: false, error: "Usuario no encontrado" };

  // If deactivating admin, check last admin
  if (user.is_active && user.role === "admin") {
    const [adminCount] = (await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM users
      WHERE company_id = ${claims.companyId}
        AND role = 'admin' AND is_active = true AND id != ${userId}
    `)) as unknown as { count: number }[];
    if (adminCount.count === 0) {
      return {
        success: false,
        error: "No puedes desactivar al ultimo administrador",
      };
    }
  }

  await db.execute(sql`
    UPDATE users SET
      is_active = NOT is_active,
      updated_by = ${claims.userId},
      updated_at = NOW()
    WHERE id = ${userId} AND company_id = ${claims.companyId}
  `);

  return { success: true };
}
