"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { overheadCosts } from "@/lib/db/schema";
import { createOverheadSchema, updateOverheadSchema } from "@/lib/schemas/overhead";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type OverheadListItem = {
  id: string;
  facilityName: string;
  zoneName: string | null;
  costType: string;
  description: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  allocationBasis: string;
};

export type OverheadFormData = {
  facilities: {
    id: string;
    name: string;
    zones: { id: string; name: string }[];
  }[];
};

export type AllocationItem = {
  batchId: string;
  batchCode: string;
  cultivarName: string;
  percentage: number;
  allocatedAmount: number;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getOverheadCosts(facilityId?: string): Promise<OverheadListItem[]> {
  const claims = await requireAuth();

  const facilityFilter = facilityId
    ? sql`AND oc.facility_id = ${facilityId}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      oc.id, oc.cost_type, oc.description, oc.amount, oc.currency,
      oc.period_start, oc.period_end, oc.allocation_basis,
      f.name AS facility_name,
      z.name AS zone_name
    FROM overhead_costs oc
    INNER JOIN facilities f ON oc.facility_id = f.id
    LEFT JOIN zones z ON oc.zone_id = z.id
    WHERE f.company_id = ${claims.companyId}
      ${facilityFilter}
    ORDER BY oc.period_start DESC
  `);

  return (rows as unknown as {
    id: string;
    facility_name: string;
    zone_name: string | null;
    cost_type: string;
    description: string;
    amount: string;
    currency: string;
    period_start: string;
    period_end: string;
    allocation_basis: string;
  }[]).map((r) => ({
    id: r.id,
    facilityName: r.facility_name,
    zoneName: r.zone_name,
    costType: r.cost_type,
    description: r.description,
    amount: parseFloat(r.amount),
    currency: r.currency,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    allocationBasis: r.allocation_basis,
  }));
}

export async function getOverheadFormData(): Promise<OverheadFormData> {
  const claims = await requireAuth();

  const rows = await db.execute(sql`
    SELECT f.id AS facility_id, f.name AS facility_name, z.id AS zone_id, z.name AS zone_name
    FROM facilities f
    INNER JOIN zones z ON z.facility_id = f.id
    WHERE f.company_id = ${claims.companyId} AND f.is_active = true
    ORDER BY f.name, z.name
  `);

  const map = new Map<string, { id: string; name: string; zones: { id: string; name: string }[] }>();

  for (const row of rows as unknown as {
    facility_id: string;
    facility_name: string;
    zone_id: string;
    zone_name: string;
  }[]) {
    if (!map.has(row.facility_id)) {
      map.set(row.facility_id, { id: row.facility_id, name: row.facility_name, zones: [] });
    }
    map.get(row.facility_id)!.zones.push({ id: row.zone_id, name: row.zone_name });
  }

  return { facilities: Array.from(map.values()) };
}

export async function getAllocations(overheadCostId: string): Promise<AllocationItem[]> {
  await requireAuth();

  // Get the overhead cost details
  const [oc] = await db.execute(sql`
    SELECT facility_id, zone_id, amount, allocation_basis
    FROM overhead_costs WHERE id = ${overheadCostId}
  `) as unknown as {
    facility_id: string;
    zone_id: string | null;
    amount: string;
    allocation_basis: string;
  }[];

  if (!oc) return [];

  const amount = parseFloat(oc.amount);

  // Get active batches in the facility (or zone if specified)
  const zoneFilter = oc.zone_id
    ? sql`AND b.zone_id = ${oc.zone_id}`
    : sql``;

  const batches = await db.execute(sql`
    SELECT
      b.id, b.code, b.plant_count,
      cv.name AS cultivar_name,
      z.area_m2
    FROM batches b
    INNER JOIN cultivars cv ON b.cultivar_id = cv.id
    INNER JOIN zones z ON b.zone_id = z.id
    WHERE z.facility_id = ${oc.facility_id}
      AND b.status = 'active'
      ${zoneFilter}
    ORDER BY b.code
  `) as unknown as {
    id: string;
    code: string;
    plant_count: number;
    cultivar_name: string;
    area_m2: string;
  }[];

  if (batches.length === 0) return [];

  // Calculate allocation based on basis
  const totalPlants = batches.reduce((s, b) => s + b.plant_count, 0);
  const totalArea = batches.reduce((s, b) => s + parseFloat(b.area_m2), 0);

  return batches.map((b) => {
    let pct: number;

    switch (oc.allocation_basis) {
      case "per_m2":
        pct = totalArea > 0 ? parseFloat(b.area_m2) / totalArea : 1 / batches.length;
        break;
      case "per_plant":
        pct = totalPlants > 0 ? b.plant_count / totalPlants : 1 / batches.length;
        break;
      case "per_batch":
      case "even_split":
        pct = 1 / batches.length;
        break;
      case "per_zone": {
        // Count batches per zone, split evenly within zone
        const zoneCount = batches.filter(() => true).length; // All in same zone if zone_id is set
        pct = 1 / zoneCount;
        break;
      }
      default:
        pct = 1 / batches.length;
    }

    return {
      batchId: b.id,
      batchCode: b.code,
      cultivarName: b.cultivar_name,
      percentage: Math.round(pct * 100),
      allocatedAmount: Math.round(amount * pct * 100) / 100,
    };
  });
}

// ── Mutations ─────────────────────────────────────────────────────

export async function registerOverhead(input: unknown): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["manager", "admin"]);

  const parsed = createOverheadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  const [row] = await db
    .insert(overheadCosts)
    .values({
      facilityId: data.facilityId,
      zoneId: data.zoneId || null,
      costType: data.costType,
      description: data.description,
      amount: String(data.amount),
      currency: data.currency,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      allocationBasis: data.allocationBasis,
      notes: data.notes || null,
      createdBy: claims.userId,
    })
    .returning({ id: overheadCosts.id });

  revalidatePath("/operations/costs");
  return { success: true, data: { id: row.id } };
}

export async function updateOverhead(input: unknown): Promise<ActionResult> {
  await requireAuth(["manager", "admin"]);

  const parsed = updateOverheadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  await db
    .update(overheadCosts)
    .set({
      facilityId: data.facilityId,
      zoneId: data.zoneId || null,
      costType: data.costType,
      description: data.description,
      amount: String(data.amount),
      currency: data.currency,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      allocationBasis: data.allocationBasis,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(overheadCosts.id, data.id));

  revalidatePath("/operations/costs");
  return { success: true };
}
