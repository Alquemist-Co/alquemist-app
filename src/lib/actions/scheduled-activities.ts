"use server";

import { eq, and, sql, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  scheduledActivities,
  cultivationSchedules,
  activityTemplates,
  activityTemplatePhases,
  activityTemplateResources,
  activityTemplateChecklist,
  batches,
  productionOrderPhases,
  productionPhases,
} from "@/lib/db/schema";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type ScheduledActivityItem = {
  id: string;
  templateName: string;
  templateCode: string;
  phaseName: string;
  plannedDate: string;
  cropDay: number;
  status: string;
};

// ── Generate scheduled activities ─────────────────────────────────

/**
 * Generate scheduled_activities for a batch entering a new phase.
 * Reads cultivation_schedule and applicable templates.
 * Called from approveOrder (F-014) and advancePhase (F-018).
 */
export async function generateScheduledActivities(
  batchId: string,
  phaseId: string,
): Promise<{ generated: number }> {
  // Get batch info
  const batchRows = await db
    .select({
      id: batches.id,
      cultivarId: batches.cultivarId,
      scheduleId: batches.scheduleId,
      startDate: batches.startDate,
      zoneId: batches.zoneId,
    })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (batchRows.length === 0) return { generated: 0 };
  const batch = batchRows[0];

  // Find cultivation_schedule for this cultivar
  let scheduleId = batch.scheduleId;
  if (!scheduleId) {
    const schedRows = await db
      .select({ id: cultivationSchedules.id })
      .from(cultivationSchedules)
      .where(
        and(
          eq(cultivationSchedules.cultivarId, batch.cultivarId),
          eq(cultivationSchedules.isActive, true),
        ),
      )
      .limit(1);

    if (schedRows.length === 0) return { generated: 0 };
    scheduleId = schedRows[0].id;

    // Update batch with schedule reference
    await db
      .update(batches)
      .set({ scheduleId })
      .where(eq(batches.id, batchId));
  }

  // Find templates applicable to this phase
  const templateRows = await db
    .select({
      templateId: activityTemplatePhases.templateId,
      code: activityTemplates.code,
      name: activityTemplates.name,
      frequency: activityTemplates.frequency,
      estimatedDurationMin: activityTemplates.estimatedDurationMin,
      triggerDayFrom: activityTemplates.triggerDayFrom,
      triggerDayTo: activityTemplates.triggerDayTo,
    })
    .from(activityTemplatePhases)
    .innerJoin(
      activityTemplates,
      eq(activityTemplatePhases.templateId, activityTemplates.id),
    )
    .where(
      and(
        eq(activityTemplatePhases.phaseId, phaseId),
        eq(activityTemplates.isActive, true),
      ),
    );

  if (templateRows.length === 0) return { generated: 0 };

  // Get the order_phase to determine duration
  const orderPhaseRows = await db
    .select({
      plannedDurationDays: productionOrderPhases.plannedDurationDays,
      plannedStartDate: productionOrderPhases.plannedStartDate,
    })
    .from(productionOrderPhases)
    .innerJoin(batches, eq(productionOrderPhases.batchId, batches.id))
    .where(
      and(
        eq(productionOrderPhases.batchId, batchId),
        eq(productionOrderPhases.phaseId, phaseId),
      ),
    )
    .limit(1);

  // Default duration: 14 days if not specified
  const phaseDuration = orderPhaseRows[0]?.plannedDurationDays ?? 14;
  const phaseStartDate = orderPhaseRows[0]?.plannedStartDate ?? batch.startDate;

  // Calculate crop day offset from batch start
  const batchStart = new Date(batch.startDate);
  const phaseStart = new Date(phaseStartDate);
  const cropDayOffset = Math.floor(
    (phaseStart.getTime() - batchStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Build template snapshots in parallel
  const snapshotPromises = templateRows.map(async (t) => {
    const [resources, checklist] = await Promise.all([
      db
        .select()
        .from(activityTemplateResources)
        .where(eq(activityTemplateResources.templateId, t.templateId))
        .orderBy(asc(activityTemplateResources.sortOrder)),
      db
        .select()
        .from(activityTemplateChecklist)
        .where(eq(activityTemplateChecklist.templateId, t.templateId))
        .orderBy(asc(activityTemplateChecklist.stepOrder)),
    ]);
    return {
      templateId: t.templateId,
      snapshot: {
        code: t.code,
        name: t.name,
        frequency: t.frequency,
        estimatedDurationMin: t.estimatedDurationMin,
        resources: resources.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
          quantityBasis: r.quantityBasis,
          isOptional: r.isOptional,
        })),
        checklist: checklist.map((c) => ({
          instruction: c.instruction,
          isCritical: c.isCritical,
          requiresPhoto: c.requiresPhoto,
          expectedValue: c.expectedValue,
          tolerance: c.tolerance,
        })),
      },
    };
  });

  const snapshots = await Promise.all(snapshotPromises);
  const snapshotMap = new Map(
    snapshots.map((s) => [s.templateId, s.snapshot]),
  );

  // Generate activities based on frequency
  const activitiesToInsert: {
    scheduleId: string;
    templateId: string;
    batchId: string;
    plannedDate: string;
    cropDay: number;
    phaseId: string;
    templateSnapshot: unknown;
    status: "pending";
  }[] = [];

  for (const template of templateRows) {
    const snapshot = snapshotMap.get(template.templateId);
    const dayFrom = template.triggerDayFrom ?? 1;
    const dayTo = template.triggerDayTo ?? phaseDuration;

    switch (template.frequency) {
      case "daily":
        for (let day = dayFrom; day <= dayTo; day++) {
          const date = addDays(phaseStart, day - 1);
          activitiesToInsert.push({
            scheduleId: scheduleId!,
            templateId: template.templateId,
            batchId,
            plannedDate: formatDate(date),
            cropDay: cropDayOffset + day,
            phaseId,
            templateSnapshot: snapshot,
            status: "pending",
          });
        }
        break;

      case "weekly":
        for (let day = dayFrom; day <= dayTo; day += 7) {
          const date = addDays(phaseStart, day - 1);
          activitiesToInsert.push({
            scheduleId: scheduleId!,
            templateId: template.templateId,
            batchId,
            plannedDate: formatDate(date),
            cropDay: cropDayOffset + day,
            phaseId,
            templateSnapshot: snapshot,
            status: "pending",
          });
        }
        break;

      case "biweekly":
        for (let day = dayFrom; day <= dayTo; day += 14) {
          const date = addDays(phaseStart, day - 1);
          activitiesToInsert.push({
            scheduleId: scheduleId!,
            templateId: template.templateId,
            batchId,
            plannedDate: formatDate(date),
            cropDay: cropDayOffset + day,
            phaseId,
            templateSnapshot: snapshot,
            status: "pending",
          });
        }
        break;

      case "once": {
        const date = addDays(phaseStart, dayFrom - 1);
        activitiesToInsert.push({
          scheduleId: scheduleId!,
          templateId: template.templateId,
          batchId,
          plannedDate: formatDate(date),
          cropDay: cropDayOffset + dayFrom,
          phaseId,
          templateSnapshot: snapshot,
          status: "pending",
        });
        break;
      }

      case "on_demand":
        // Don't auto-generate for on_demand
        break;
    }
  }

  if (activitiesToInsert.length === 0) return { generated: 0 };

  // Bulk insert
  await db.insert(scheduledActivities).values(activitiesToInsert);

  return { generated: activitiesToInsert.length };
}

// ── Reschedule ────────────────────────────────────────────────────

export async function rescheduleActivity(
  id: string,
  newDate: string,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const today = new Date().toISOString().split("T")[0];
  if (newDate < today) {
    return {
      success: false,
      error: "No se puede reprogramar a una fecha pasada.",
    };
  }

  const rows = await db
    .select({ id: scheduledActivities.id, status: scheduledActivities.status })
    .from(scheduledActivities)
    .where(eq(scheduledActivities.id, id))
    .limit(1);

  if (rows.length === 0) {
    return { success: false, error: "Actividad no encontrada." };
  }

  if (!["pending", "overdue"].includes(rows[0].status)) {
    return {
      success: false,
      error: "Solo se pueden reprogramar actividades pendientes.",
    };
  }

  await db
    .update(scheduledActivities)
    .set({ plannedDate: newDate, status: "pending" })
    .where(eq(scheduledActivities.id, id));

  return { success: true };
}

// ── Cancel ────────────────────────────────────────────────────────

export async function cancelScheduledActivity(
  id: string,
  reason: string,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: "La razon debe tener al menos 5 caracteres.",
    };
  }

  const rows = await db
    .select({ id: scheduledActivities.id, status: scheduledActivities.status })
    .from(scheduledActivities)
    .where(eq(scheduledActivities.id, id))
    .limit(1);

  if (rows.length === 0) {
    return { success: false, error: "Actividad no encontrada." };
  }

  if (rows[0].status === "completed") {
    return {
      success: false,
      error: "No se puede cancelar una actividad ya completada.",
    };
  }

  // Use skipped status (closest to cancelled in the enum)
  await db
    .update(scheduledActivities)
    .set({ status: "skipped" })
    .where(eq(scheduledActivities.id, id));

  return { success: true };
}

// ── Query for batch activities tab ────────────────────────────────

export async function getBatchScheduledActivities(
  batchId: string,
): Promise<ScheduledActivityItem[]> {
  await requireAuth();

  return db
    .select({
      id: scheduledActivities.id,
      templateName: sql<string>`at.name`,
      templateCode: sql<string>`at.code`,
      phaseName: productionPhases.name,
      plannedDate: scheduledActivities.plannedDate,
      cropDay: scheduledActivities.cropDay,
      status: scheduledActivities.status,
    })
    .from(scheduledActivities)
    .innerJoin(
      sql`activity_templates at`,
      sql`at.id = ${scheduledActivities.templateId}`,
    )
    .innerJoin(
      productionPhases,
      eq(scheduledActivities.phaseId, productionPhases.id),
    )
    .where(eq(scheduledActivities.batchId, batchId))
    .orderBy(asc(scheduledActivities.plannedDate));
}

// ── Today's activities ───────────────────────────────────────────

export type TodayActivityItem = {
  id: string;
  templateName: string;
  templateCode: string;
  activityTypeName: string;
  batchCode: string;
  batchId: string;
  zoneName: string;
  phaseName: string;
  plannedDate: string;
  cropDay: number;
  status: string;
  estimatedDurationMin: number;
};

export async function getTodayActivities(): Promise<TodayActivityItem[]> {
  await requireAuth();

  const today = new Date().toISOString().split("T")[0];

  return db
    .select({
      id: scheduledActivities.id,
      templateName: sql<string>`at.name`,
      templateCode: sql<string>`at.code`,
      activityTypeName: sql<string>`atype.name`,
      batchCode: sql<string>`b.code`,
      batchId: sql<string>`b.id`,
      zoneName: sql<string>`z.name`,
      phaseName: productionPhases.name,
      plannedDate: scheduledActivities.plannedDate,
      cropDay: scheduledActivities.cropDay,
      status: scheduledActivities.status,
      estimatedDurationMin: sql<number>`at.estimated_duration_min`,
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
    .innerJoin(
      sql`zones z`,
      sql`z.id = b.zone_id`,
    )
    .innerJoin(
      productionPhases,
      eq(scheduledActivities.phaseId, productionPhases.id),
    )
    .where(
      sql`(${scheduledActivities.plannedDate} = ${today} OR (${scheduledActivities.status} = 'overdue'))
        AND ${scheduledActivities.status} != 'skipped'`,
    )
    .orderBy(
      sql`CASE ${scheduledActivities.status} WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 END`,
      asc(scheduledActivities.plannedDate),
    );
}

// ── F-085: Calendar query ────────────────────────────────────────

export type CalendarActivityItem = {
  id: string;
  templateName: string;
  batchCode: string;
  batchId: string;
  zoneName: string;
  plannedDate: string;
  status: string;
};

export async function getCalendarActivities(
  startDate: string,
  endDate: string,
): Promise<CalendarActivityItem[]> {
  await requireAuth();

  return db
    .select({
      id: scheduledActivities.id,
      templateName: sql<string>`at.name`,
      batchCode: sql<string>`b.code`,
      batchId: sql<string>`b.id`,
      zoneName: sql<string>`z.name`,
      plannedDate: scheduledActivities.plannedDate,
      status: scheduledActivities.status,
    })
    .from(scheduledActivities)
    .innerJoin(
      sql`activity_templates at`,
      sql`at.id = ${scheduledActivities.templateId}`,
    )
    .innerJoin(sql`batches b`, sql`b.id = ${scheduledActivities.batchId}`)
    .innerJoin(sql`zones z`, sql`z.id = b.zone_id`)
    .where(
      and(
        sql`${scheduledActivities.plannedDate} >= ${startDate}`,
        sql`${scheduledActivities.plannedDate} <= ${endDate}`,
        sql`${scheduledActivities.status} != 'skipped'`,
      ),
    )
    .orderBy(asc(scheduledActivities.plannedDate));
}

// ── Helpers ───────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
