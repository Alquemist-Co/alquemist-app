"use server";

import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  scheduledActivities,
  activities,
  activityResources,
  batches,
} from "@/lib/db/schema";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

type SnapshotResource = {
  productId: string;
  quantity: number | string;
  quantityBasis: string;
  isOptional: boolean;
};

type SnapshotChecklist = {
  instruction: string;
  isCritical: boolean;
  requiresPhoto: boolean;
  expectedValue: string | null;
  tolerance: string | null;
};

type TemplateSnapshot = {
  code: string;
  name: string;
  frequency: string;
  estimatedDurationMin: number;
  resources: SnapshotResource[];
  checklist: SnapshotChecklist[];
};

export type ActivityContextResource = {
  productId: string;
  productName: string;
  productSku: string;
  unitName: string;
  unitId: string;
  quantityPlanned: number;
  quantityBasis: string;
  isOptional: boolean;
};

export type ActivityContextChecklist = {
  stepOrder: number;
  instruction: string;
  isCritical: boolean;
  requiresPhoto: boolean;
  expectedValue: string | null;
  tolerance: string | null;
};

export type ActivityContext = {
  scheduledActivityId: string;
  templateName: string;
  templateCode: string;
  activityTypeName: string;
  batchId: string;
  batchCode: string;
  zoneName: string;
  zoneId: string;
  phaseId: string;
  phaseName: string;
  plantCount: number;
  cropDay: number;
  plannedDate: string;
  estimatedDurationMin: number;
  triggersPhaseChangeId: string | null;
  resources: ActivityContextResource[];
  checklist: ActivityContextChecklist[];
};

// ── Get activity context ──────────────────────────────────────────

export async function getActivityContext(
  scheduledActivityId: string,
): Promise<ActionResult<ActivityContext>> {
  await requireAuth();

  // Get scheduled activity with template and batch info
  const rows = await db
    .select({
      id: scheduledActivities.id,
      templateSnapshot: scheduledActivities.templateSnapshot,
      plannedDate: scheduledActivities.plannedDate,
      cropDay: scheduledActivities.cropDay,
      status: scheduledActivities.status,
      phaseId: scheduledActivities.phaseId,
      phaseName: sql<string>`pp.name`,
      templateName: sql<string>`at.name`,
      templateCode: sql<string>`at.code`,
      activityTypeName: sql<string>`atype.name`,
      triggersPhaseChangeId: sql<string | null>`at.triggers_phase_change_id`,
      estimatedDurationMin: sql<number>`at.estimated_duration_min`,
      batchId: sql<string>`b.id`,
      batchCode: sql<string>`b.code`,
      plantCount: sql<number>`b.plant_count`,
      zoneId: sql<string>`z.id`,
      zoneName: sql<string>`z.name`,
    })
    .from(scheduledActivities)
    .innerJoin(
      sql`activity_templates at`,
      sql`at.id = ${scheduledActivities.templateId}`,
    )
    .innerJoin(
      sql`activity_types atype`,
      sql`atype.id = at.activity_type_id`,
    )
    .innerJoin(
      sql`batches b`,
      sql`b.id = ${scheduledActivities.batchId}`,
    )
    .innerJoin(sql`zones z`, sql`z.id = b.zone_id`)
    .innerJoin(
      sql`production_phases pp`,
      sql`pp.id = ${scheduledActivities.phaseId}`,
    )
    .where(eq(scheduledActivities.id, scheduledActivityId))
    .limit(1);

  if (rows.length === 0) {
    return { success: false, error: "Actividad no encontrada." };
  }

  const row = rows[0];

  if (row.status === "completed") {
    return { success: false, error: "Esta actividad ya fue completada." };
  }

  if (row.status === "skipped") {
    return { success: false, error: "Esta actividad fue cancelada." };
  }

  // Parse template snapshot
  const snapshot = row.templateSnapshot as TemplateSnapshot | null;
  const snapshotResources = snapshot?.resources ?? [];
  const snapshotChecklist = snapshot?.checklist ?? [];

  // Scale resources and get product details
  const plantCount = Number(row.plantCount);

  let contextResources: ActivityContextResource[] = [];
  if (snapshotResources.length > 0) {
    const productIds = snapshotResources.map((r) => r.productId);
    const productRows = await db
      .select({
        id: sql<string>`p.id`,
        name: sql<string>`p.name`,
        sku: sql<string>`p.sku`,
        unitId: sql<string>`u.id`,
        unitName: sql<string>`u.name`,
      })
      .from(sql`products p`)
      .innerJoin(sql`units_of_measure u`, sql`u.id = p.unit_id`)
      .where(sql`p.id = ANY(${productIds})`);

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    contextResources = snapshotResources.map((r) => {
      const product = productMap.get(r.productId);
      const baseQty = Number(r.quantity);
      let scaled = baseQty;

      switch (r.quantityBasis) {
        case "per_plant":
          scaled = baseQty * plantCount;
          break;
        case "per_zone":
        case "fixed":
        default:
          scaled = baseQty;
          break;
      }

      return {
        productId: r.productId,
        productName: product?.name ?? "Producto desconocido",
        productSku: product?.sku ?? "",
        unitName: product?.unitName ?? "",
        unitId: product?.unitId ?? "",
        quantityPlanned: Math.round(scaled * 100) / 100,
        quantityBasis: r.quantityBasis,
        isOptional: r.isOptional,
      };
    });
  }

  const contextChecklist: ActivityContextChecklist[] = snapshotChecklist.map(
    (c, idx) => ({
      stepOrder: idx + 1,
      instruction: c.instruction,
      isCritical: c.isCritical,
      requiresPhoto: c.requiresPhoto,
      expectedValue: c.expectedValue,
      tolerance: c.tolerance,
    }),
  );

  return {
    success: true,
    data: {
      scheduledActivityId: row.id,
      templateName: row.templateName,
      templateCode: row.templateCode,
      activityTypeName: row.activityTypeName,
      batchId: row.batchId,
      batchCode: row.batchCode,
      zoneName: row.zoneName,
      zoneId: row.zoneId,
      phaseId: row.phaseId,
      phaseName: row.phaseName,
      plantCount,
      cropDay: row.cropDay,
      plannedDate: row.plannedDate,
      estimatedDurationMin: row.estimatedDurationMin,
      triggersPhaseChangeId: row.triggersPhaseChangeId,
      resources: contextResources,
      checklist: contextChecklist,
    },
  };
}

// ── Execute activity ──────────────────────────────────────────────

const resourceSchema = z.object({
  productId: z.string().uuid(),
  quantityPlanned: z.number(),
  quantityActual: z.number().min(0),
  unitId: z.string().uuid(),
});

const executeActivitySchema = z.object({
  scheduledActivityId: z.string().uuid(),
  resources: z.array(resourceSchema),
  checklistResults: z.array(
    z.object({
      stepOrder: z.number(),
      isCompleted: z.boolean(),
      valueRecorded: z.string().optional(),
    }),
  ),
  notes: z.string().max(1000).optional(),
  durationMinutes: z.number().min(0),
});

export async function executeActivity(
  input: z.infer<typeof executeActivitySchema>,
): Promise<ActionResult<{ activityId: string }>> {
  const claims = await requireAuth();

  const parsed = executeActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos." };
  }

  const data = parsed.data;

  // Verify scheduled activity is still pending
  const saRows = await db
    .select({
      id: scheduledActivities.id,
      status: scheduledActivities.status,
      batchId: scheduledActivities.batchId,
      phaseId: scheduledActivities.phaseId,
      cropDay: scheduledActivities.cropDay,
      templateId: scheduledActivities.templateId,
    })
    .from(scheduledActivities)
    .where(eq(scheduledActivities.id, data.scheduledActivityId))
    .limit(1);

  if (saRows.length === 0) {
    return { success: false, error: "Actividad programada no encontrada." };
  }

  const sa = saRows[0];

  if (sa.status === "completed") {
    return {
      success: false,
      error: "Esta actividad ya fue completada por otro usuario.",
    };
  }

  if (sa.status === "skipped") {
    return { success: false, error: "Esta actividad fue cancelada." };
  }

  if (!sa.batchId) {
    return { success: false, error: "La actividad no tiene batch asociado." };
  }

  // Get batch zone and template type
  const batchRows = await db
    .select({
      zoneId: batches.zoneId,
      activityTypeId: sql<string>`at.activity_type_id`,
      triggersPhaseChangeId: sql<string | null>`at.triggers_phase_change_id`,
    })
    .from(batches)
    .innerJoin(
      sql`activity_templates at`,
      sql`at.id = ${sa.templateId}`,
    )
    .where(eq(batches.id, sa.batchId))
    .limit(1);

  if (batchRows.length === 0) {
    return { success: false, error: "Batch no encontrado." };
  }

  const batchInfo = batchRows[0];

  // Build checklist notes for storage (no dedicated table)
  const checklistSummary = data.checklistResults
    .filter((c) => c.valueRecorded)
    .map((c) => `Paso ${c.stepOrder}: ${c.valueRecorded}`)
    .join("; ");

  const fullNotes = [data.notes, checklistSummary]
    .filter(Boolean)
    .join("\n---\n");

  try {
    const result = await db.transaction(async (tx) => {
      // 1. INSERT activity
      const [activity] = await tx
        .insert(activities)
        .values({
          activityTypeId: batchInfo.activityTypeId,
          templateId: sa.templateId,
          scheduledActivityId: sa.id,
          batchId: sa.batchId,
          zoneId: batchInfo.zoneId,
          performedBy: claims.userId,
          durationMinutes: data.durationMinutes,
          phaseId: sa.phaseId,
          cropDay: sa.cropDay,
          status: "completed",
          notes: fullNotes || null,
          companyId: claims.companyId,
          createdBy: claims.userId,
          updatedBy: claims.userId,
        })
        .returning({ id: activities.id });

      // 2. INSERT activity_resources for each resource with quantity > 0
      const resourcesWithQty = data.resources.filter(
        (r) => r.quantityActual > 0,
      );
      if (resourcesWithQty.length > 0) {
        await tx.insert(activityResources).values(
          resourcesWithQty.map((r) => ({
            activityId: activity.id,
            productId: r.productId,
            quantityPlanned: r.quantityPlanned.toString(),
            quantityActual: r.quantityActual.toString(),
            unitId: r.unitId,
            createdBy: claims.userId,
            updatedBy: claims.userId,
          })),
        );
      }

      // 3. UPDATE scheduled_activity as completed
      await tx
        .update(scheduledActivities)
        .set({
          status: "completed",
          completedActivityId: activity.id,
        })
        .where(
          and(
            eq(scheduledActivities.id, sa.id),
            sql`${scheduledActivities.status} != 'completed'`,
          ),
        );

      return activity;
    });

    // 4. If template triggers phase change, advance batch (non-blocking)
    if (batchInfo.triggersPhaseChangeId && sa.batchId) {
      const { advancePhase } = await import("./batches");
      advancePhase({ batchId: sa.batchId }).catch(() => {
        // Silently fail — phase can be advanced manually
      });
    }

    return { success: true, data: { activityId: result.id } };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("unique")
    ) {
      return {
        success: false,
        error: "Esta actividad ya fue completada.",
      };
    }
    throw err;
  }
}
