"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { sensors, zones, facilities } from "@/lib/db/schema";
import { createSensorSchema, updateSensorSchema } from "@/lib/schemas/sensor";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type SensorListItem = {
  id: string;
  zoneId: string;
  zoneName: string;
  facilityName: string;
  type: string;
  brandModel: string | null;
  serialNumber: string | null;
  calibrationDate: string | null;
  isActive: boolean;
};

export type SensorFormData = {
  facilities: {
    id: string;
    name: string;
    zones: { id: string; name: string }[];
  }[];
};

// ── Queries ───────────────────────────────────────────────────────

export async function getSensors(
  zoneFilter?: string,
): Promise<SensorListItem[]> {
  const claims = await requireAuth();

  const rows = await db
    .select({
      id: sensors.id,
      zoneId: sensors.zoneId,
      zoneName: zones.name,
      facilityName: facilities.name,
      type: sensors.type,
      brandModel: sensors.brandModel,
      serialNumber: sensors.serialNumber,
      calibrationDate: sensors.calibrationDate,
      isActive: sensors.isActive,
    })
    .from(sensors)
    .innerJoin(zones, eq(sensors.zoneId, zones.id))
    .innerJoin(facilities, eq(zones.facilityId, facilities.id))
    .where(
      zoneFilter
        ? sql`${facilities.companyId} = ${claims.companyId} AND ${sensors.zoneId} = ${zoneFilter}`
        : sql`${facilities.companyId} = ${claims.companyId}`,
    )
    .orderBy(facilities.name, zones.name, sensors.type);

  return rows;
}

export async function getSensorFormData(): Promise<SensorFormData> {
  const claims = await requireAuth();

  const rows = await db
    .select({
      facilityId: facilities.id,
      facilityName: facilities.name,
      zoneId: zones.id,
      zoneName: zones.name,
    })
    .from(facilities)
    .innerJoin(zones, eq(zones.facilityId, facilities.id))
    .where(
      sql`${facilities.companyId} = ${claims.companyId} AND ${facilities.isActive} = true AND ${zones.status} = 'active'`,
    )
    .orderBy(facilities.name, zones.name);

  const facilityMap = new Map<
    string,
    { id: string; name: string; zones: { id: string; name: string }[] }
  >();

  for (const row of rows) {
    if (!facilityMap.has(row.facilityId)) {
      facilityMap.set(row.facilityId, {
        id: row.facilityId,
        name: row.facilityName,
        zones: [],
      });
    }
    facilityMap.get(row.facilityId)!.zones.push({
      id: row.zoneId,
      name: row.zoneName,
    });
  }

  return { facilities: Array.from(facilityMap.values()) };
}

// ── Mutations ─────────────────────────────────────────────────────

export async function createSensor(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = createSensorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Check serial uniqueness
  if (data.serialNumber) {
    const [existing] = await db
      .select({ id: sensors.id })
      .from(sensors)
      .where(eq(sensors.serialNumber, data.serialNumber))
      .limit(1);

    if (existing) {
      return {
        success: false,
        error: "Ya existe un sensor con este serial",
      };
    }
  }

  const [row] = await db
    .insert(sensors)
    .values({
      zoneId: data.zoneId,
      type: data.type,
      brandModel: data.brandModel || null,
      serialNumber: data.serialNumber || null,
      calibrationDate: data.calibrationDate || null,
      isActive: data.isActive,
    })
    .returning({ id: sensors.id });

  revalidatePath("/operations/sensors");
  return { success: true, data: { id: row.id } };
}

export async function updateSensor(
  input: unknown,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = updateSensorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Check serial uniqueness (excluding self)
  if (data.serialNumber) {
    const [existing] = await db
      .select({ id: sensors.id })
      .from(sensors)
      .where(
        sql`${sensors.serialNumber} = ${data.serialNumber} AND ${sensors.id} != ${data.id}`,
      )
      .limit(1);

    if (existing) {
      return {
        success: false,
        error: "Ya existe un sensor con este serial",
      };
    }
  }

  await db
    .update(sensors)
    .set({
      zoneId: data.zoneId,
      type: data.type,
      brandModel: data.brandModel || null,
      serialNumber: data.serialNumber || null,
      calibrationDate: data.calibrationDate || null,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(sensors.id, data.id));

  revalidatePath("/operations/sensors");
  return { success: true };
}

export async function deactivateSensor(
  id: string,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  await db
    .update(sensors)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(sensors.id, id));

  revalidatePath("/operations/sensors");
  return { success: true };
}
