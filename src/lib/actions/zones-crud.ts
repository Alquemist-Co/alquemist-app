"use server";

import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { zones, facilities, zoneStructures } from "@/lib/db/schema";
import { zoneSchema, updateZoneSchema } from "@/lib/schemas/zone";
import type { ActionResult } from "./types";

export type ZoneListItem = {
  id: string;
  facilityId: string;
  facilityName: string;
  name: string;
  purpose: string;
  environment: string;
  areaM2: string;
  plantCapacity: number;
  status: string;
  batchCount: number;
  structureCount: number;
};

export async function getZonesCrud(): Promise<ZoneListItem[]> {
  const claims = await requireAuth();

  return db
    .select({
      id: zones.id,
      facilityId: zones.facilityId,
      facilityName: facilities.name,
      name: zones.name,
      purpose: zones.purpose,
      environment: zones.environment,
      areaM2: zones.areaM2,
      plantCapacity: zones.plantCapacity,
      status: zones.status,
      batchCount: sql<number>`(
        SELECT count(*)::int FROM batches
        WHERE zone_id = ${zones.id} AND status = 'active'
      )`,
      structureCount: sql<number>`(
        SELECT count(*)::int FROM zone_structures
        WHERE zone_id = ${zones.id}
      )`,
    })
    .from(zones)
    .innerJoin(facilities, eq(zones.facilityId, facilities.id))
    .where(eq(facilities.companyId, claims.companyId))
    .orderBy(facilities.name, zones.name);
}

export async function createZone(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin", "manager"]);
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const [row] = await db
    .insert(zones)
    .values({
      facilityId: parsed.data.facilityId,
      name: parsed.data.name,
      purpose: parsed.data.purpose,
      environment: parsed.data.environment,
      areaM2: String(parsed.data.areaM2),
      heightM: parsed.data.heightM ? String(parsed.data.heightM) : null,
      plantCapacity: parsed.data.plantCapacity ?? 0,
      createdBy: claims.userId,
    })
    .returning({ id: zones.id });

  return { success: true, data: { id: row.id } };
}

export async function updateZone(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin", "manager"]);
  const parsed = updateZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;
  const [updated] = await db
    .update(zones)
    .set({
      facilityId: data.facilityId,
      name: data.name,
      purpose: data.purpose,
      environment: data.environment,
      areaM2: String(data.areaM2),
      heightM: data.heightM ? String(data.heightM) : null,
      plantCapacity: data.plantCapacity ?? 0,
      updatedBy: claims.userId,
    })
    .where(eq(zones.id, id))
    .returning({ id: zones.id });

  if (!updated) {
    return { success: false, error: "Zona no encontrada" };
  }
  return { success: true };
}

export async function updateZoneStatus(
  id: string,
  status: "active" | "maintenance" | "inactive",
): Promise<ActionResult> {
  const claims = await requireAuth(["admin", "manager"]);

  if (status === "inactive") {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`batches`)
      .where(sql`zone_id = ${id} AND status = 'active'`);

    if (count > 0) {
      return {
        success: false,
        error: `No se puede desactivar: tiene ${count} batch(es) activo(s)`,
      };
    }
  }

  const [updated] = await db
    .update(zones)
    .set({ status, updatedBy: claims.userId })
    .where(eq(zones.id, id))
    .returning({ id: zones.id });

  if (!updated) {
    return { success: false, error: "Zona no encontrada" };
  }
  return { success: true };
}

// ── Zone Structures ──────────────────────────────────────────────

export type ZoneStructureItem = {
  id: string;
  zoneId: string;
  name: string;
  type: string;
  lengthM: string;
  widthM: string;
  isMobile: boolean;
  numLevels: number;
  positionsPerLevel: number | null;
  maxPositions: number | null;
};

export async function getZoneStructures(
  zoneId: string,
): Promise<ZoneStructureItem[]> {
  await requireAuth();

  return db
    .select({
      id: zoneStructures.id,
      zoneId: zoneStructures.zoneId,
      name: zoneStructures.name,
      type: zoneStructures.type,
      lengthM: zoneStructures.lengthM,
      widthM: zoneStructures.widthM,
      isMobile: zoneStructures.isMobile,
      numLevels: zoneStructures.numLevels,
      positionsPerLevel: zoneStructures.positionsPerLevel,
      maxPositions: zoneStructures.maxPositions,
    })
    .from(zoneStructures)
    .where(eq(zoneStructures.zoneId, zoneId))
    .orderBy(zoneStructures.name);
}
