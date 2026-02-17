"use server";

import { eq, sql, desc, asc, and, inArray } from "drizzle-orm";
import { z } from "zod";
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
  scheduledActivities,
} from "@/lib/db/schema";
import type { ActionResult } from "./types";

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

// ── Advance Phase ────────────────────────────────────────────────

export type AdvancePhaseData = {
  batchCode: string;
  currentPhaseName: string;
  nextPhaseName: string | null;
  nextPhaseId: string | null;
  requiresZoneChange: boolean;
  isExitPhase: boolean;
  pendingActivities: { id: string; name: string; plannedDate: string }[];
  availableZones: {
    id: string;
    name: string;
    plantCapacity: number;
    currentOccupancy: number;
  }[];
};

export async function getAdvancePhaseData(
  batchId: string,
): Promise<ActionResult<AdvancePhaseData>> {
  await requireAuth(["supervisor", "manager", "admin"]);

  // Get batch with order info
  const batchRows = await db
    .select({
      id: batches.id,
      code: batches.code,
      status: batches.status,
      currentPhaseId: batches.currentPhaseId,
      productionOrderId: batches.productionOrderId,
      plantCount: batches.plantCount,
      zoneId: batches.zoneId,
    })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (batchRows.length === 0) {
    return { success: false, error: "Batch no encontrado." };
  }

  const batch = batchRows[0];

  if (batch.status !== "active") {
    return {
      success: false,
      error: `El batch esta en estado "${batch.status}". Solo se pueden avanzar batches activos.`,
    };
  }

  if (!batch.productionOrderId) {
    return {
      success: false,
      error: "El batch no tiene una orden de produccion asociada.",
    };
  }

  // Get order phases in sort_order
  const orderPhases = await db
    .select({
      id: productionOrderPhases.id,
      phaseId: productionOrderPhases.phaseId,
      sortOrder: productionOrderPhases.sortOrder,
      status: productionOrderPhases.status,
      phaseName: productionPhases.name,
      requiresZoneChange: productionPhases.requiresZoneChange,
    })
    .from(productionOrderPhases)
    .innerJoin(
      productionPhases,
      eq(productionOrderPhases.phaseId, productionPhases.id),
    )
    .where(eq(productionOrderPhases.orderId, batch.productionOrderId))
    .orderBy(asc(productionOrderPhases.sortOrder));

  // Find current phase index
  const currentIdx = orderPhases.findIndex(
    (p) => p.phaseId === batch.currentPhaseId,
  );
  if (currentIdx === -1) {
    return { success: false, error: "Fase actual no encontrada en la orden." };
  }

  const currentPhase = orderPhases[currentIdx];

  // Check if this is the last phase (exit phase)
  const isExitPhase = currentIdx === orderPhases.length - 1;

  // Find next non-skipped phase
  let nextPhase: (typeof orderPhases)[number] | null = null;
  if (!isExitPhase) {
    for (let i = currentIdx + 1; i < orderPhases.length; i++) {
      if (orderPhases[i].status !== "skipped") {
        nextPhase = orderPhases[i];
        break;
      }
    }
  }

  // Get pending scheduled activities for current phase
  const pendingActivitiesRows = await db
    .select({
      id: scheduledActivities.id,
      plannedDate: scheduledActivities.plannedDate,
      templateName: sql<string>`at.name`,
    })
    .from(scheduledActivities)
    .innerJoin(
      sql`activity_templates at`,
      sql`at.id = ${scheduledActivities.templateId}`,
    )
    .where(
      and(
        eq(scheduledActivities.batchId, batchId),
        eq(scheduledActivities.phaseId, batch.currentPhaseId),
        inArray(scheduledActivities.status, ["pending", "overdue"]),
      ),
    );

  const pendingActivities = pendingActivitiesRows.map((a) => ({
    id: a.id,
    name: a.templateName,
    plannedDate: a.plannedDate,
  }));

  // Get available zones with occupancy if zone change required
  let availableZones: AdvancePhaseData["availableZones"] = [];
  const requiresZoneChange = nextPhase?.requiresZoneChange ?? false;

  if (requiresZoneChange || isExitPhase === false) {
    // Always fetch zones so the user can optionally change zone
    const zoneRows = await db
      .select({
        id: zones.id,
        name: zones.name,
        plantCapacity: zones.plantCapacity,
        currentOccupancy: sql<number>`COALESCE(
          (SELECT SUM(b.plant_count) FROM batches b WHERE b.zone_id = ${zones.id} AND b.status = 'active'),
          0
        )`,
      })
      .from(zones)
      .where(eq(zones.status, "active"))
      .orderBy(zones.name);

    availableZones = zoneRows.map((z) => ({
      id: z.id,
      name: z.name,
      plantCapacity: z.plantCapacity,
      currentOccupancy: Number(z.currentOccupancy),
    }));
  }

  return {
    success: true,
    data: {
      batchCode: batch.code,
      currentPhaseName: currentPhase.phaseName,
      nextPhaseName: nextPhase?.phaseName ?? null,
      nextPhaseId: nextPhase?.phaseId ?? null,
      requiresZoneChange,
      isExitPhase,
      pendingActivities,
      availableZones,
    },
  };
}

// Zod schema for advance phase
const advancePhaseSchema = z.object({
  batchId: z.string().uuid(),
  targetZoneId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export async function advancePhase(
  input: z.infer<typeof advancePhaseSchema>,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = advancePhaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos." };
  }

  const { batchId, targetZoneId } = parsed.data;

  // Get batch
  const batchRows = await db
    .select({
      id: batches.id,
      code: batches.code,
      status: batches.status,
      currentPhaseId: batches.currentPhaseId,
      productionOrderId: batches.productionOrderId,
      zoneId: batches.zoneId,
    })
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.status, "active")))
    .limit(1);

  if (batchRows.length === 0) {
    return {
      success: false,
      error: "Batch no encontrado o no esta activo.",
    };
  }

  const batch = batchRows[0];

  if (!batch.productionOrderId) {
    return {
      success: false,
      error: "El batch no tiene una orden de produccion asociada.",
    };
  }

  // Get order phases
  const orderPhases = await db
    .select({
      id: productionOrderPhases.id,
      phaseId: productionOrderPhases.phaseId,
      sortOrder: productionOrderPhases.sortOrder,
      status: productionOrderPhases.status,
      requiresZoneChange: productionPhases.requiresZoneChange,
      phaseName: productionPhases.name,
    })
    .from(productionOrderPhases)
    .innerJoin(
      productionPhases,
      eq(productionOrderPhases.phaseId, productionPhases.id),
    )
    .where(eq(productionOrderPhases.orderId, batch.productionOrderId))
    .orderBy(asc(productionOrderPhases.sortOrder));

  const currentIdx = orderPhases.findIndex(
    (p) => p.phaseId === batch.currentPhaseId,
  );
  if (currentIdx === -1) {
    return { success: false, error: "Fase actual no encontrada en la orden." };
  }

  const currentOrderPhase = orderPhases[currentIdx];
  const isExitPhase = currentIdx === orderPhases.length - 1;

  // If exit phase → complete the batch
  if (isExitPhase) {
    return completeBatch(batch, currentOrderPhase, batchId);
  }

  // Find next non-skipped phase
  let nextPhase: (typeof orderPhases)[number] | null = null;
  for (let i = currentIdx + 1; i < orderPhases.length; i++) {
    if (orderPhases[i].status !== "skipped") {
      nextPhase = orderPhases[i];
      break;
    }
  }

  if (!nextPhase) {
    return {
      success: false,
      error: "No hay una fase siguiente disponible.",
    };
  }

  // Validate zone change requirement
  if (nextPhase.requiresZoneChange && !targetZoneId) {
    return {
      success: false,
      error: `La fase "${nextPhase.phaseName}" requiere cambio de zona. Selecciona una zona destino.`,
    };
  }

  const newZoneId = targetZoneId ?? batch.zoneId;
  const today = new Date().toISOString().split("T")[0];

  // Execute advance in transaction
  await db.transaction(async (tx) => {
    // 1. Update batch: new phase, optionally new zone
    await tx
      .update(batches)
      .set({
        currentPhaseId: nextPhase!.phaseId,
        ...(targetZoneId ? { zoneId: targetZoneId } : {}),
      })
      .where(eq(batches.id, batchId));

    // 2. Mark current order phase as completed
    await tx
      .update(productionOrderPhases)
      .set({ status: "completed", actualEndDate: today })
      .where(eq(productionOrderPhases.id, currentOrderPhase.id));

    // 3. Mark next order phase as in_progress
    await tx
      .update(productionOrderPhases)
      .set({
        status: "in_progress",
        actualStartDate: today,
        ...(targetZoneId ? { zoneId: newZoneId } : {}),
      })
      .where(eq(productionOrderPhases.id, nextPhase!.id));

    // 4. Skip pending/overdue activities for old phase
    await tx
      .update(scheduledActivities)
      .set({ status: "skipped" })
      .where(
        and(
          eq(scheduledActivities.batchId, batchId),
          eq(scheduledActivities.phaseId, batch.currentPhaseId),
          inArray(scheduledActivities.status, ["pending", "overdue"]),
        ),
      );
  });

  return { success: true };
}

// Helper: complete batch at exit phase
async function completeBatch(
  batch: { id: string; productionOrderId: string | null },
  currentOrderPhase: { id: string },
  batchId: string,
): Promise<ActionResult> {
  const today = new Date().toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    // 1. Mark batch as completed
    await tx
      .update(batches)
      .set({ status: "completed" })
      .where(eq(batches.id, batchId));

    // 2. Mark current (final) order phase as completed
    await tx
      .update(productionOrderPhases)
      .set({ status: "completed", actualEndDate: today })
      .where(eq(productionOrderPhases.id, currentOrderPhase.id));

    // 3. Skip remaining pending activities
    await tx
      .update(scheduledActivities)
      .set({ status: "skipped" })
      .where(
        and(
          eq(scheduledActivities.batchId, batchId),
          inArray(scheduledActivities.status, ["pending", "overdue"]),
        ),
      );

    // 4. Check if order should be completed (all batches done)
    if (batch.productionOrderId) {
      const activeBatches = await tx
        .select({ id: batches.id })
        .from(batches)
        .where(
          and(
            eq(batches.productionOrderId, batch.productionOrderId),
            eq(batches.status, "active"),
          ),
        )
        .limit(1);

      if (activeBatches.length === 0) {
        await tx
          .update(productionOrders)
          .set({ status: "completed" })
          .where(eq(productionOrders.id, batch.productionOrderId));
      }
    }
  });

  return { success: true };
}
