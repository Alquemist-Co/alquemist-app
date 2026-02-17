"use server";

import { eq, sql, asc, desc, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  cultivars,
  cropTypes,
  productionPhases,
  phaseProductFlows,
  productionOrders,
  productionOrderPhases,
  batches,
  zones,
  facilities,
  users,
} from "@/lib/db/schema";
import { createOrderSchema } from "@/lib/schemas/order";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type WizardCultivar = {
  id: string;
  name: string;
  code: string;
  cropTypeId: string;
  cropTypeName: string;
  cropTypeCategory: string;
  breeder: string | null;
  defaultCycleDays: number | null;
  expectedYieldPerPlantG: string | null;
  phaseDurations: Record<string, number> | null;
};

export type WizardPhase = {
  id: string;
  cropTypeId: string;
  code: string;
  name: string;
  sortOrder: number;
  defaultDurationDays: number | null;
  canBeEntryPoint: boolean;
  canBeExitPoint: boolean;
  canSkip: boolean;
  requiresZoneChange: boolean;
  isTransformation: boolean;
  icon: string | null;
  color: string | null;
};

export type WizardPhaseFlow = {
  phaseId: string;
  direction: string;
  productRole: string;
  expectedYieldPct: string | null;
};

export type WizardZone = {
  id: string;
  name: string;
  facilityName: string;
  purpose: string;
  plantCapacity: number;
};

export type WizardUser = {
  id: string;
  fullName: string;
  role: string;
};

export type WizardUnit = {
  id: string;
  code: string;
  name: string;
};

export type WizardProduct = {
  id: string;
  sku: string;
  name: string;
};

export type OrderWizardData = {
  cultivars: WizardCultivar[];
  phases: WizardPhase[];
  phaseFlows: WizardPhaseFlow[];
  zones: WizardZone[];
  users: WizardUser[];
  units: WizardUnit[];
  products: WizardProduct[];
};

// ── Wizard data query ─────────────────────────────────────────────

export async function getOrderWizardData(): Promise<OrderWizardData> {
  await requireAuth(["manager", "admin"]);

  const [
    cultivarRows,
    phaseRows,
    flowRows,
    zoneRows,
    userRows,
    unitRows,
    productRows,
  ] = await Promise.all([
    // Active cultivars with crop type
    db
      .select({
        id: cultivars.id,
        name: cultivars.name,
        code: cultivars.code,
        cropTypeId: cultivars.cropTypeId,
        cropTypeName: cropTypes.name,
        cropTypeCategory: cropTypes.category,
        breeder: cultivars.breeder,
        defaultCycleDays: cultivars.defaultCycleDays,
        expectedYieldPerPlantG: cultivars.expectedYieldPerPlantG,
        phaseDurations: cultivars.phaseDurations,
      })
      .from(cultivars)
      .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
      .where(and(eq(cultivars.isActive, true), eq(cropTypes.isActive, true)))
      .orderBy(cultivars.name),

    // All phases for active crop types
    db
      .select({
        id: productionPhases.id,
        cropTypeId: productionPhases.cropTypeId,
        code: productionPhases.code,
        name: productionPhases.name,
        sortOrder: productionPhases.sortOrder,
        defaultDurationDays: productionPhases.defaultDurationDays,
        canBeEntryPoint: productionPhases.canBeEntryPoint,
        canBeExitPoint: productionPhases.canBeExitPoint,
        canSkip: productionPhases.canSkip,
        requiresZoneChange: productionPhases.requiresZoneChange,
        isTransformation: productionPhases.isTransformation,
        icon: productionPhases.icon,
        color: productionPhases.color,
      })
      .from(productionPhases)
      .innerJoin(cropTypes, eq(productionPhases.cropTypeId, cropTypes.id))
      .where(eq(cropTypes.isActive, true))
      .orderBy(asc(productionPhases.sortOrder)),

    // Phase flows for yield cascade (output primary flows)
    db
      .select({
        phaseId: phaseProductFlows.phaseId,
        direction: phaseProductFlows.direction,
        productRole: phaseProductFlows.productRole,
        expectedYieldPct: phaseProductFlows.expectedYieldPct,
      })
      .from(phaseProductFlows)
      .orderBy(asc(phaseProductFlows.sortOrder)),

    // Active zones with facility name
    db
      .select({
        id: zones.id,
        name: zones.name,
        facilityName: facilities.name,
        purpose: zones.purpose,
        plantCapacity: zones.plantCapacity,
      })
      .from(zones)
      .innerJoin(facilities, eq(zones.facilityId, facilities.id))
      .where(eq(zones.status, "active"))
      .orderBy(facilities.name, zones.name),

    // Users who can be assigned (managers, supervisors)
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          inArray(users.role, ["manager", "supervisor"]),
        ),
      )
      .orderBy(users.fullName),

    // Units
    db
      .select({
        id: sql<string>`id`,
        code: sql<string>`code`,
        name: sql<string>`name`,
      })
      .from(sql`units_of_measure`)
      .orderBy(sql`name`),

    // Products
    db
      .select({
        id: sql<string>`id`,
        sku: sql<string>`sku`,
        name: sql<string>`name`,
      })
      .from(sql`products`)
      .where(sql`is_active = true`)
      .orderBy(sql`name`),
  ]);

  return {
    cultivars: cultivarRows.map((r) => ({
      ...r,
      phaseDurations: r.phaseDurations as Record<string, number> | null,
    })),
    phases: phaseRows,
    phaseFlows: flowRows,
    zones: zoneRows,
    users: userRows,
    units: unitRows,
    products: productRows,
  };
}

// ── Create Order ──────────────────────────────────────────────────

export async function createOrder(
  input: unknown,
): Promise<ActionResult<{ id: string; code: string }>> {
  const claims = await requireAuth(["manager", "admin"]);

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Validate: entry phase sort_order < exit phase sort_order
  const entryExit = await db
    .select({
      id: productionPhases.id,
      sortOrder: productionPhases.sortOrder,
      cropTypeId: productionPhases.cropTypeId,
    })
    .from(productionPhases)
    .where(
      inArray(productionPhases.id, [data.entryPhaseId, data.exitPhaseId]),
    );

  const entryPhase = entryExit.find((p) => p.id === data.entryPhaseId);
  const exitPhase = entryExit.find((p) => p.id === data.exitPhaseId);

  if (!entryPhase || !exitPhase) {
    return { success: false, error: "Fases de entrada o salida no encontradas" };
  }

  if (entryPhase.sortOrder >= exitPhase.sortOrder) {
    return {
      success: false,
      error: "La fase de salida debe ser posterior a la fase de entrada",
    };
  }

  if (entryPhase.cropTypeId !== exitPhase.cropTypeId) {
    return {
      success: false,
      error: "Las fases deben pertenecer al mismo tipo de cultivo",
    };
  }

  // Get all phases in range for the order_phases
  const phasesInRange = await db
    .select({
      id: productionPhases.id,
      sortOrder: productionPhases.sortOrder,
    })
    .from(productionPhases)
    .where(eq(productionPhases.cropTypeId, entryPhase.cropTypeId))
    .orderBy(asc(productionPhases.sortOrder));

  const rangePhases = phasesInRange.filter(
    (p) =>
      p.sortOrder >= entryPhase.sortOrder &&
      p.sortOrder <= exitPhase.sortOrder,
  );

  // Generate order code: OP-YYYY-NNN
  const year = new Date().getFullYear();
  const prefix = `OP-${year}-`;

  const [maxCode] = await db
    .select({ code: productionOrders.code })
    .from(productionOrders)
    .where(sql`code LIKE ${prefix + "%"}`)
    .orderBy(sql`code DESC`)
    .limit(1);

  let seq = 1;
  if (maxCode?.code) {
    const lastSeq = parseInt(maxCode.code.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  const orderCode = `${prefix}${seq.toString().padStart(3, "0")}`;

  // Build phase config map from wizard input
  const phaseConfigMap = new Map(
    data.phaseConfig.map((pc) => [pc.phaseId, pc]),
  );

  // Calculate planned end date from phase durations
  let lastEndDate = data.plannedStartDate;

  try {
    const result = await db.transaction(async (tx) => {
      // Insert the order
      const [order] = await tx
        .insert(productionOrders)
        .values({
          code: orderCode,
          companyId: claims.companyId,
          cultivarId: data.cultivarId,
          entryPhaseId: data.entryPhaseId,
          exitPhaseId: data.exitPhaseId,
          initialQuantity: data.initialQuantity.toString(),
          initialUnitId: data.initialUnitId,
          initialProductId: data.initialProductId || null,
          plannedStartDate: data.plannedStartDate,
          assignedTo: data.assignedTo || null,
          priority: data.priority,
          notes: data.notes || null,
          createdBy: claims.userId,
          updatedBy: claims.userId,
        })
        .returning({ id: productionOrders.id, code: productionOrders.code });

      // Insert order phases
      let currentStartDate = data.plannedStartDate;

      const orderPhasesData = rangePhases.map((phase, idx) => {
        const config = phaseConfigMap.get(phase.id);
        const durationDays = config?.durationDays ?? null;
        const zoneId = config?.zoneId || null;
        const skipped = config?.skipped ?? false;

        let phaseEndDate: string | null = null;
        if (durationDays) {
          const start = new Date(currentStartDate);
          start.setDate(start.getDate() + durationDays);
          phaseEndDate = start.toISOString().split("T")[0];
        }

        const phaseData = {
          orderId: order.id,
          phaseId: phase.id,
          sortOrder: idx + 1,
          plannedStartDate: currentStartDate,
          plannedEndDate: phaseEndDate,
          plannedDurationDays: durationDays,
          zoneId,
          status: skipped
            ? ("skipped" as const)
            : ("pending" as const),
          createdBy: claims.userId,
          updatedBy: claims.userId,
        };

        // Next phase starts when this one ends
        if (phaseEndDate) {
          currentStartDate = phaseEndDate;
          lastEndDate = phaseEndDate;
        }

        return phaseData;
      });

      if (orderPhasesData.length > 0) {
        await tx.insert(productionOrderPhases).values(orderPhasesData);
      }

      // Update planned end date on the order
      if (lastEndDate !== data.plannedStartDate) {
        await tx
          .update(productionOrders)
          .set({ plannedEndDate: lastEndDate })
          .where(eq(productionOrders.id, order.id));
      }

      return order;
    });

    return { success: true, data: { id: result.id, code: result.code } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      // Retry with next code on race condition
      return { success: false, error: "Error de codigo duplicado. Intente de nuevo." };
    }
    throw err;
  }
}

// ── Get Order Detail ──────────────────────────────────────────────

export type OrderDetail = {
  id: string;
  code: string;
  cultivarName: string;
  cropTypeName: string;
  entryPhaseName: string;
  exitPhaseName: string;
  initialQuantity: string;
  unitName: string;
  unitCode: string;
  plannedStartDate: string;
  plannedEndDate: string | null;
  assigneeName: string | null;
  status: string;
  priority: string;
  notes: string | null;
  batchId: string | null;
  batchCode: string | null;
  createdAt: Date;
  phases: OrderPhaseDetail[];
};

export type OrderPhaseDetail = {
  id: string;
  phaseId: string;
  phaseName: string;
  sortOrder: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  plannedDurationDays: number | null;
  zoneName: string | null;
  status: string;
};

export async function getOrder(id: string): Promise<OrderDetail | null> {
  await requireAuth();

  const rows = await db
    .select({
      id: productionOrders.id,
      code: productionOrders.code,
      cultivarName: cultivars.name,
      cropTypeName: cropTypes.name,
      entryPhaseName: sql<string>`ep.name`,
      exitPhaseName: sql<string>`xp.name`,
      initialQuantity: productionOrders.initialQuantity,
      unitName: sql<string>`u.name`,
      unitCode: sql<string>`u.code`,
      plannedStartDate: productionOrders.plannedStartDate,
      plannedEndDate: productionOrders.plannedEndDate,
      assigneeName: sql<string | null>`au.full_name`,
      status: productionOrders.status,
      priority: productionOrders.priority,
      notes: productionOrders.notes,
      batchId: sql<string | null>`b.id`,
      batchCode: sql<string | null>`b.code`,
      createdAt: productionOrders.createdAt,
    })
    .from(productionOrders)
    .innerJoin(cultivars, eq(productionOrders.cultivarId, cultivars.id))
    .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
    .innerJoin(
      sql`production_phases ep`,
      sql`ep.id = ${productionOrders.entryPhaseId}`,
    )
    .innerJoin(
      sql`production_phases xp`,
      sql`xp.id = ${productionOrders.exitPhaseId}`,
    )
    .innerJoin(
      sql`units_of_measure u`,
      sql`u.id = ${productionOrders.initialUnitId}`,
    )
    .leftJoin(
      sql`users au`,
      sql`au.id = ${productionOrders.assignedTo}`,
    )
    .leftJoin(
      sql`batches b`,
      sql`b.production_order_id = ${productionOrders.id}`,
    )
    .where(eq(productionOrders.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const order = rows[0];

  // Fetch order phases
  const phaseRows = await db
    .select({
      id: productionOrderPhases.id,
      phaseId: productionOrderPhases.phaseId,
      phaseName: productionPhases.name,
      sortOrder: productionOrderPhases.sortOrder,
      plannedStartDate: productionOrderPhases.plannedStartDate,
      plannedEndDate: productionOrderPhases.plannedEndDate,
      plannedDurationDays: productionOrderPhases.plannedDurationDays,
      zoneName: zones.name,
      status: productionOrderPhases.status,
    })
    .from(productionOrderPhases)
    .innerJoin(
      productionPhases,
      eq(productionOrderPhases.phaseId, productionPhases.id),
    )
    .leftJoin(zones, eq(productionOrderPhases.zoneId, zones.id))
    .where(eq(productionOrderPhases.orderId, id))
    .orderBy(asc(productionOrderPhases.sortOrder));

  return {
    ...order,
    phases: phaseRows,
  };
}

// ── Get Orders List ───────────────────────────────────────────────

export type OrderListItem = {
  id: string;
  code: string;
  cultivarName: string;
  cropTypeName: string;
  status: string;
  priority: string;
  initialQuantity: string;
  unitCode: string;
  plannedStartDate: string;
  batchCode: string | null;
  createdAt: Date;
};

export async function getOrders(): Promise<OrderListItem[]> {
  await requireAuth();

  return db
    .select({
      id: productionOrders.id,
      code: productionOrders.code,
      cultivarName: cultivars.name,
      cropTypeName: cropTypes.name,
      status: productionOrders.status,
      priority: productionOrders.priority,
      initialQuantity: productionOrders.initialQuantity,
      unitCode: sql<string>`u.code`,
      plannedStartDate: productionOrders.plannedStartDate,
      batchCode: sql<string | null>`b.code`,
      createdAt: productionOrders.createdAt,
    })
    .from(productionOrders)
    .innerJoin(cultivars, eq(productionOrders.cultivarId, cultivars.id))
    .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
    .innerJoin(
      sql`units_of_measure u`,
      sql`u.id = ${productionOrders.initialUnitId}`,
    )
    .leftJoin(
      sql`batches b`,
      sql`b.production_order_id = ${productionOrders.id}`,
    )
    .orderBy(desc(productionOrders.createdAt));
}

// ── Approve Order ─────────────────────────────────────────────────

export async function approveOrder(
  orderId: string,
): Promise<ActionResult<{ batchId: string; batchCode: string }>> {
  const claims = await requireAuth(["manager", "admin"]);

  // Fetch the order with its first phase
  const [order] = await db
    .select({
      id: productionOrders.id,
      status: productionOrders.status,
      cultivarId: productionOrders.cultivarId,
      entryPhaseId: productionOrders.entryPhaseId,
      initialQuantity: productionOrders.initialQuantity,
      plannedStartDate: productionOrders.plannedStartDate,
      plannedEndDate: productionOrders.plannedEndDate,
      companyId: productionOrders.companyId,
    })
    .from(productionOrders)
    .where(eq(productionOrders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: "Orden no encontrada" };
  }

  if (order.status !== "draft") {
    if (order.status === "cancelled") {
      return { success: false, error: "No se puede aprobar una orden cancelada" };
    }
    return { success: false, error: "Orden ya aprobada" };
  }

  // Get the first non-skipped order phase to determine zone
  const [firstPhase] = await db
    .select({
      id: productionOrderPhases.id,
      zoneId: productionOrderPhases.zoneId,
    })
    .from(productionOrderPhases)
    .where(
      and(
        eq(productionOrderPhases.orderId, orderId),
        sql`${productionOrderPhases.status} != 'skipped'`,
      ),
    )
    .orderBy(asc(productionOrderPhases.sortOrder))
    .limit(1);

  // Resolve zone: from first phase, or get any active zone
  let batchZoneId = firstPhase?.zoneId;
  if (!batchZoneId) {
    const [anyZone] = await db
      .select({ id: zones.id })
      .from(zones)
      .where(eq(zones.status, "active"))
      .limit(1);
    batchZoneId = anyZone?.id ?? null;
  }

  if (!batchZoneId) {
    return { success: false, error: "No hay zonas activas disponibles" };
  }

  // Generate batch code: BAT-YYYY-NNN
  const year = new Date().getFullYear();
  const batchPrefix = `BAT-${year}-`;

  const [maxBatch] = await db
    .select({ code: batches.code })
    .from(batches)
    .where(sql`code LIKE ${batchPrefix + "%"}`)
    .orderBy(sql`code DESC`)
    .limit(1);

  let batchSeq = 1;
  if (maxBatch?.code) {
    const lastSeq = parseInt(maxBatch.code.replace(batchPrefix, ""), 10);
    if (!isNaN(lastSeq)) batchSeq = lastSeq + 1;
  }

  const batchCode = `${batchPrefix}${batchSeq.toString().padStart(3, "0")}`;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Update order status to in_progress
      await tx
        .update(productionOrders)
        .set({
          status: "in_progress",
          updatedBy: claims.userId,
        })
        .where(
          and(
            eq(productionOrders.id, orderId),
            eq(productionOrders.status, "draft"),
          ),
        );

      // 2. Create batch
      const plantCount = Math.round(parseFloat(order.initialQuantity));

      const [batch] = await tx
        .insert(batches)
        .values({
          code: batchCode,
          cultivarId: order.cultivarId,
          zoneId: batchZoneId!,
          plantCount: plantCount > 0 ? plantCount : 1,
          currentPhaseId: order.entryPhaseId,
          productionOrderId: orderId,
          startDate: order.plannedStartDate,
          expectedEndDate: order.plannedEndDate,
          companyId: order.companyId,
          createdBy: claims.userId,
          updatedBy: claims.userId,
        })
        .returning({ id: batches.id, code: batches.code });

      // 3. Mark first order phase as in_progress
      if (firstPhase) {
        await tx
          .update(productionOrderPhases)
          .set({
            status: "in_progress",
            actualStartDate: new Date().toISOString().split("T")[0],
            batchId: batch.id,
            updatedBy: claims.userId,
          })
          .where(eq(productionOrderPhases.id, firstPhase.id));
      }

      return batch;
    });

    return { success: true, data: { batchId: result.id, batchCode: result.code } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Error de codigo duplicado. Intente de nuevo." };
    }
    throw err;
  }
}

// ── Reject Order ──────────────────────────────────────────────────

export async function rejectOrder(
  orderId: string,
  reason: string,
): Promise<ActionResult> {
  const claims = await requireAuth(["manager", "admin"]);

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "La razon debe tener al menos 5 caracteres" };
  }

  const [order] = await db
    .select({ status: productionOrders.status })
    .from(productionOrders)
    .where(eq(productionOrders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: "Orden no encontrada" };
  }

  if (order.status !== "draft") {
    return {
      success: false,
      error: "Solo se pueden rechazar ordenes en estado borrador",
    };
  }

  await db
    .update(productionOrders)
    .set({
      status: "cancelled",
      notes: reason.trim(),
      updatedBy: claims.userId,
    })
    .where(
      and(
        eq(productionOrders.id, orderId),
        eq(productionOrders.status, "draft"),
      ),
    );

  return { success: true };
}
