"use server";

import { eq, sql, desc, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  batches,
  cultivars,
  cropTypes,
  productionPhases,
  zones,
  facilities,
  productionOrders,
  productionOrderPhases,
} from "@/lib/db/schema";

// ── Types ─────────────────────────────────────────────────────────

export type BatchListItem = {
  id: string;
  code: string;
  cultivarName: string;
  cropTypeName: string;
  currentPhaseName: string;
  currentPhaseId: string;
  zoneName: string;
  zoneId: string;
  facilityName: string;
  plantCount: number;
  status: string;
  startDate: string;
  expectedEndDate: string | null;
  orderCode: string | null;
};

export type BatchDetail = {
  id: string;
  code: string;
  cultivarId: string;
  cultivarName: string;
  cropTypeName: string;
  currentPhaseId: string;
  currentPhaseName: string;
  zoneId: string;
  zoneName: string;
  facilityName: string;
  plantCount: number;
  status: string;
  startDate: string;
  expectedEndDate: string | null;
  yieldWetKg: string | null;
  yieldDryKg: string | null;
  orderCode: string | null;
  orderId: string | null;
  createdAt: Date;
  phases: BatchPhaseInfo[];
};

export type BatchPhaseInfo = {
  id: string;
  phaseId: string;
  phaseName: string;
  sortOrder: number;
  status: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  zoneName: string | null;
  inputQuantity: string | null;
  outputQuantity: string | null;
  yieldPct: string | null;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getBatches(): Promise<BatchListItem[]> {
  await requireAuth();

  return db
    .select({
      id: batches.id,
      code: batches.code,
      cultivarName: cultivars.name,
      cropTypeName: cropTypes.name,
      currentPhaseName: productionPhases.name,
      currentPhaseId: batches.currentPhaseId,
      zoneName: zones.name,
      zoneId: batches.zoneId,
      facilityName: facilities.name,
      plantCount: batches.plantCount,
      status: batches.status,
      startDate: batches.startDate,
      expectedEndDate: batches.expectedEndDate,
      orderCode: sql<string | null>`po.code`,
    })
    .from(batches)
    .innerJoin(cultivars, eq(batches.cultivarId, cultivars.id))
    .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
    .innerJoin(productionPhases, eq(batches.currentPhaseId, productionPhases.id))
    .innerJoin(zones, eq(batches.zoneId, zones.id))
    .innerJoin(facilities, eq(zones.facilityId, facilities.id))
    .leftJoin(
      sql`production_orders po`,
      sql`po.id = ${batches.productionOrderId}`,
    )
    .orderBy(desc(batches.createdAt));
}

export async function getBatch(id: string): Promise<BatchDetail | null> {
  await requireAuth();

  const rows = await db
    .select({
      id: batches.id,
      code: batches.code,
      cultivarId: batches.cultivarId,
      cultivarName: cultivars.name,
      cropTypeName: cropTypes.name,
      currentPhaseId: batches.currentPhaseId,
      currentPhaseName: productionPhases.name,
      zoneId: batches.zoneId,
      zoneName: zones.name,
      facilityName: facilities.name,
      plantCount: batches.plantCount,
      status: batches.status,
      startDate: batches.startDate,
      expectedEndDate: batches.expectedEndDate,
      yieldWetKg: batches.yieldWetKg,
      yieldDryKg: batches.yieldDryKg,
      orderCode: sql<string | null>`po.code`,
      orderId: batches.productionOrderId,
      createdAt: batches.createdAt,
    })
    .from(batches)
    .innerJoin(cultivars, eq(batches.cultivarId, cultivars.id))
    .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
    .innerJoin(productionPhases, eq(batches.currentPhaseId, productionPhases.id))
    .innerJoin(zones, eq(batches.zoneId, zones.id))
    .innerJoin(facilities, eq(zones.facilityId, facilities.id))
    .leftJoin(
      sql`production_orders po`,
      sql`po.id = ${batches.productionOrderId}`,
    )
    .where(eq(batches.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const batch = rows[0];

  // Fetch order phases if this batch has an order
  let phases: BatchPhaseInfo[] = [];
  if (batch.orderId) {
    phases = await db
      .select({
        id: productionOrderPhases.id,
        phaseId: productionOrderPhases.phaseId,
        phaseName: productionPhases.name,
        sortOrder: productionOrderPhases.sortOrder,
        status: productionOrderPhases.status,
        plannedStartDate: productionOrderPhases.plannedStartDate,
        plannedEndDate: productionOrderPhases.plannedEndDate,
        actualStartDate: productionOrderPhases.actualStartDate,
        actualEndDate: productionOrderPhases.actualEndDate,
        zoneName: zones.name,
        inputQuantity: productionOrderPhases.inputQuantity,
        outputQuantity: productionOrderPhases.outputQuantity,
        yieldPct: productionOrderPhases.yieldPct,
      })
      .from(productionOrderPhases)
      .innerJoin(
        productionPhases,
        eq(productionOrderPhases.phaseId, productionPhases.id),
      )
      .leftJoin(zones, eq(productionOrderPhases.zoneId, zones.id))
      .where(eq(productionOrderPhases.orderId, batch.orderId))
      .orderBy(asc(productionOrderPhases.sortOrder));
  }

  return {
    ...batch,
    phases,
  };
}

// ── Filter options ────────────────────────────────────────────────

export type BatchFilterOptions = {
  statuses: string[];
  phases: { id: string; name: string }[];
  zones: { id: string; name: string }[];
  cultivars: { id: string; name: string }[];
};

export async function getBatchFilterOptions(): Promise<BatchFilterOptions> {
  await requireAuth();

  const [phaseRows, zoneRows, cultivarRows] = await Promise.all([
    db
      .select({ id: productionPhases.id, name: productionPhases.name })
      .from(productionPhases)
      .orderBy(productionPhases.name),
    db
      .select({ id: zones.id, name: zones.name })
      .from(zones)
      .where(eq(zones.status, "active"))
      .orderBy(zones.name),
    db
      .select({ id: cultivars.id, name: cultivars.name })
      .from(cultivars)
      .where(eq(cultivars.isActive, true))
      .orderBy(cultivars.name),
  ]);

  return {
    statuses: ["active", "phase_transition", "completed", "cancelled", "on_hold"],
    phases: phaseRows,
    zones: zoneRows,
    cultivars: cultivarRows,
  };
}
