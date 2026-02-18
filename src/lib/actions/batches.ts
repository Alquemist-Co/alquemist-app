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
import { generateScheduledActivities } from "./scheduled-activities";

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

  // Generate scheduled activities for the new phase (non-blocking)
  generateScheduledActivities(batchId, nextPhase!.phaseId).catch(() => {
    // Silently fail — activities can be regenerated later
  });

  return { success: true };
}

// ── F-082: Hold / Resume / Cancel / Zone Change ──────────────────

const holdBatchSchema = z.object({
  batchId: z.string().uuid(),
  reason: z.string().min(10, "La razon debe tener al menos 10 caracteres."),
});

export async function holdBatch(
  input: z.infer<typeof holdBatchSchema>,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = holdBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { batchId, reason } = parsed.data;

  const batchRows = await db
    .select({ id: batches.id, status: batches.status })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (batchRows.length === 0) {
    return { success: false, error: "Batch no encontrado." };
  }
  if (batchRows[0].status !== "active") {
    return { success: false, error: "Solo se pueden pausar batches activos." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(batches)
      .set({ status: "on_hold" })
      .where(eq(batches.id, batchId));

    // Suspend pending/overdue activities
    await tx
      .update(scheduledActivities)
      .set({ status: "skipped" })
      .where(
        and(
          eq(scheduledActivities.batchId, batchId),
          inArray(scheduledActivities.status, ["pending", "overdue"]),
        ),
      );
  });

  void reason;
  return { success: true };
}

const resumeBatchSchema = z.object({
  batchId: z.string().uuid(),
});

export async function resumeBatch(
  input: z.infer<typeof resumeBatchSchema>,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = resumeBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos." };
  }

  const { batchId } = parsed.data;

  const batchRows = await db
    .select({ id: batches.id, status: batches.status, currentPhaseId: batches.currentPhaseId })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (batchRows.length === 0) {
    return { success: false, error: "Batch no encontrado." };
  }
  if (batchRows[0].status !== "on_hold") {
    return { success: false, error: "Solo se pueden resumir batches en pausa." };
  }

  await db
    .update(batches)
    .set({ status: "active" })
    .where(eq(batches.id, batchId));

  // Regenerate activities for current phase (non-blocking)
  generateScheduledActivities(batchRows[0].id, batchRows[0].currentPhaseId).catch(() => {});

  return { success: true };
}

const cancelBatchSchema = z.object({
  batchId: z.string().uuid(),
  reason: z.string().min(10, "La razon debe tener al menos 10 caracteres."),
});

export async function cancelBatch(
  input: z.infer<typeof cancelBatchSchema>,
): Promise<ActionResult> {
  await requireAuth(["manager", "admin"]);

  const parsed = cancelBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { batchId, reason } = parsed.data;

  const batchRows = await db
    .select({ id: batches.id, status: batches.status })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (batchRows.length === 0) {
    return { success: false, error: "Batch no encontrado." };
  }
  if (batchRows[0].status === "completed" || batchRows[0].status === "cancelled") {
    return { success: false, error: "El batch ya esta completado o cancelado." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(batches)
      .set({ status: "cancelled" })
      .where(eq(batches.id, batchId));

    await tx
      .update(scheduledActivities)
      .set({ status: "skipped" })
      .where(
        and(
          eq(scheduledActivities.batchId, batchId),
          inArray(scheduledActivities.status, ["pending", "overdue"]),
        ),
      );
  });

  void reason;
  return { success: true };
}

const changeBatchZoneSchema = z.object({
  batchId: z.string().uuid(),
  newZoneId: z.string().uuid(),
  reason: z.string().min(5).optional(),
});

export async function changeBatchZone(
  input: z.infer<typeof changeBatchZoneSchema>,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = changeBatchZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { batchId, newZoneId } = parsed.data;

  const batchRows = await db
    .select({ id: batches.id, status: batches.status, zoneId: batches.zoneId })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (batchRows.length === 0) {
    return { success: false, error: "Batch no encontrado." };
  }
  if (batchRows[0].status !== "active") {
    return { success: false, error: "Solo se puede cambiar la zona de batches activos." };
  }
  if (batchRows[0].zoneId === newZoneId) {
    return { success: false, error: "El batch ya esta en esa zona." };
  }

  const zoneRows = await db
    .select({ id: zones.id })
    .from(zones)
    .where(and(eq(zones.id, newZoneId), eq(zones.status, "active")))
    .limit(1);

  if (zoneRows.length === 0) {
    return { success: false, error: "Zona destino no encontrada o inactiva." };
  }

  await db.update(batches).set({ zoneId: newZoneId }).where(eq(batches.id, batchId));

  return { success: true };
}

// ── F-083: Manual Batch Creation ─────────────────────────────────

export type ManualBatchFormData = {
  cultivars: { id: string; name: string; cropTypeName: string }[];
  phases: { id: string; name: string; cropTypeId: string; sortOrder: number }[];
  zones: { id: string; name: string; plantCapacity: number; currentOccupancy: number }[];
};

export async function getManualBatchFormData(): Promise<ManualBatchFormData> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const [cultivarRows, phaseRows, zoneRows] = await Promise.all([
    db
      .select({
        id: cultivars.id,
        name: cultivars.name,
        cropTypeName: cropTypes.name,
      })
      .from(cultivars)
      .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
      .where(eq(cultivars.isActive, true))
      .orderBy(cultivars.name),
    db
      .select({
        id: productionPhases.id,
        name: productionPhases.name,
        cropTypeId: productionPhases.cropTypeId,
        sortOrder: productionPhases.sortOrder,
      })
      .from(productionPhases)
      .orderBy(asc(productionPhases.cropTypeId), asc(productionPhases.sortOrder)),
    db
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
      .orderBy(zones.name),
  ]);

  return {
    cultivars: cultivarRows,
    phases: phaseRows,
    zones: zoneRows.map((z) => ({ ...z, currentOccupancy: Number(z.currentOccupancy) })),
  };
}

const createManualBatchSchema = z.object({
  cultivarId: z.string().uuid(),
  phaseId: z.string().uuid(),
  zoneId: z.string().uuid(),
  plantCount: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  areaM2: z.number().positive().optional(),
});

export async function createManualBatch(
  input: z.infer<typeof createManualBatchSchema>,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = createManualBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { cultivarId, phaseId, zoneId, plantCount, startDate, areaM2 } = parsed.data;

  // Generate batch code: PREFIX-YY-NNNN
  const facilityRow = await db
    .select({ code: sql<string>`f.code` })
    .from(zones)
    .innerJoin(sql`facilities f`, sql`f.id = ${zones.facilityId}`)
    .where(eq(zones.id, zoneId))
    .limit(1);

  const prefix = facilityRow[0]?.code?.substring(0, 3).toUpperCase() ?? "BAT";
  const year = new Date().getFullYear().toString().slice(-2);

  const countRow = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(batches)
    .where(sql`${batches.code} LIKE ${`${prefix}-${year}-%`}`);

  const seq = (countRow[0]?.count ?? 0) + 1;
  const code = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;

  const [newBatch] = await db
    .insert(batches)
    .values({
      code,
      cultivarId,
      currentPhaseId: phaseId,
      zoneId,
      plantCount,
      startDate,
      areaM2: areaM2?.toString(),
      status: "active",
      createdBy: claims.userId,
      updatedBy: claims.userId,
    })
    .returning({ id: batches.id });

  generateScheduledActivities(newBatch.id, phaseId).catch(() => {});

  return { success: true, data: { id: newBatch.id } };
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
