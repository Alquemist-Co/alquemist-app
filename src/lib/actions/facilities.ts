"use server";

import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { facilities } from "@/lib/db/schema";
import { facilitySchema, updateFacilitySchema } from "@/lib/schemas/facility";
import type { ActionResult } from "./types";

export type FacilityListItem = {
  id: string;
  name: string;
  type: string;
  totalFootprintM2: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  isActive: boolean;
  zoneCount: number;
  userCount: number;
};

export async function getFacilities(): Promise<FacilityListItem[]> {
  const claims = await requireAuth();

  return db
    .select({
      id: facilities.id,
      name: facilities.name,
      type: facilities.type,
      totalFootprintM2: facilities.totalFootprintM2,
      address: facilities.address,
      latitude: facilities.latitude,
      longitude: facilities.longitude,
      isActive: facilities.isActive,
      zoneCount: sql<number>`(
        SELECT count(*)::int FROM zones WHERE facility_id = ${facilities.id}
      )`,
      userCount: sql<number>`(
        SELECT count(*)::int FROM users
        WHERE assigned_facility_id = ${facilities.id} AND company_id = ${claims.companyId}
      )`,
    })
    .from(facilities)
    .where(eq(facilities.companyId, claims.companyId))
    .orderBy(facilities.name);
}

export async function createFacility(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin"]);
  const parsed = facilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const [row] = await db
      .insert(facilities)
      .values({
        companyId: claims.companyId,
        name: parsed.data.name,
        type: parsed.data.type,
        totalFootprintM2: String(parsed.data.totalFootprintM2),
        address: parsed.data.address,
        latitude: parsed.data.latitude ? String(parsed.data.latitude) : null,
        longitude: parsed.data.longitude ? String(parsed.data.longitude) : null,
        createdBy: claims.userId,
      })
      .returning({ id: facilities.id });
    return { success: true, data: { id: row.id } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe una facility con este nombre" };
    }
    throw err;
  }
}

export async function updateFacility(
  input: unknown,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);
  const parsed = updateFacilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;
  const [updated] = await db
    .update(facilities)
    .set({
      name: data.name,
      type: data.type,
      totalFootprintM2: String(data.totalFootprintM2),
      address: data.address,
      latitude: data.latitude ? String(data.latitude) : null,
      longitude: data.longitude ? String(data.longitude) : null,
      updatedBy: claims.userId,
    })
    .where(eq(facilities.id, id))
    .returning({ id: facilities.id });

  if (!updated) {
    return { success: false, error: "Facility no encontrada" };
  }
  return { success: true };
}

export async function toggleFacilityActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  if (!active) {
    // Check for active zones before deactivating
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`zones`)
      .where(sql`facility_id = ${id} AND status = 'active'`);

    if (count > 0) {
      return {
        success: false,
        error: `No se puede desactivar: tiene ${count} zona(s) activa(s)`,
      };
    }
  }

  const [updated] = await db
    .update(facilities)
    .set({ isActive: active, updatedBy: claims.userId })
    .where(eq(facilities.id, id))
    .returning({ id: facilities.id });

  if (!updated) {
    return { success: false, error: "Facility no encontrada" };
  }
  return { success: true };
}
