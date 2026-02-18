"use server";

import { eq, sql, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  activityObservations,
  activities,
  activityTypes,
  batches,
} from "@/lib/db/schema";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type ObservationItem = {
  id: string;
  type: string;
  severity: string;
  description: string;
  affectedPlants: number | null;
  actionTaken: string | null;
  batchCode: string | null;
  zoneName: string;
  createdAt: Date;
};

export type ObservationBatchOption = {
  id: string;
  code: string;
  cultivarName: string;
  zoneName: string;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getRecentObservations(): Promise<ObservationItem[]> {
  await requireAuth();

  return db
    .select({
      id: activityObservations.id,
      type: activityObservations.type,
      severity: activityObservations.severity,
      description: activityObservations.description,
      affectedPlants: activityObservations.affectedPlants,
      actionTaken: activityObservations.actionTaken,
      batchCode: sql<string | null>`b.code`,
      zoneName: sql<string>`z.name`,
      createdAt: activityObservations.createdAt,
    })
    .from(activityObservations)
    .innerJoin(activities, eq(activityObservations.activityId, activities.id))
    .innerJoin(sql`zones z`, sql`z.id = ${activities.zoneId}`)
    .leftJoin(sql`batches b`, sql`b.id = ${activities.batchId}`)
    .orderBy(desc(activityObservations.createdAt))
    .limit(50);
}

export async function getObservationFormData(): Promise<{
  batches: ObservationBatchOption[];
}> {
  await requireAuth();

  const batchRows = await db
    .select({
      id: batches.id,
      code: batches.code,
      cultivarName: sql<string>`c.name`,
      zoneName: sql<string>`z.name`,
    })
    .from(batches)
    .innerJoin(sql`cultivars c`, sql`c.id = ${batches.cultivarId}`)
    .innerJoin(sql`zones z`, sql`z.id = ${batches.zoneId}`)
    .where(eq(batches.status, "active"))
    .orderBy(batches.code);

  return { batches: batchRows };
}

// ── Create observation ───────────────────────────────────────────

const createObservationSchema = z.object({
  batchId: z.string().uuid(),
  type: z.enum(["pest", "disease", "deficiency", "environmental", "general", "measurement"]),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  description: z.string().min(5),
  affectedPlants: z.number().int().nonnegative().optional(),
  actionTaken: z.string().optional(),
});

export async function createObservation(
  input: z.infer<typeof createObservationSchema>,
): Promise<ActionResult> {
  const claims = await requireAuth();

  const parsed = createObservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { batchId, type, severity, description, affectedPlants, actionTaken } = parsed.data;

  // Get batch zone and phase
  const batchRows = await db
    .select({
      zoneId: batches.zoneId,
      currentPhaseId: batches.currentPhaseId,
    })
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.status, "active")))
    .limit(1);

  if (batchRows.length === 0) {
    return { success: false, error: "Batch no encontrado o no esta activo." };
  }

  const batch = batchRows[0];

  // Get or create "Observacion" activity type
  let activityTypeId: string;
  const existingType = await db
    .select({ id: activityTypes.id })
    .from(activityTypes)
    .where(eq(activityTypes.name, "Observacion"))
    .limit(1);

  if (existingType.length > 0) {
    activityTypeId = existingType[0].id;
  } else {
    const [newType] = await db
      .insert(activityTypes)
      .values({ name: "Observacion", category: "observacion" })
      .returning({ id: activityTypes.id });
    activityTypeId = newType.id;
  }

  // Create activity + observation in transaction
  await db.transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({
        activityTypeId,
        batchId,
        zoneId: batch.zoneId,
        performedBy: claims.userId,
        durationMinutes: 0,
        phaseId: batch.currentPhaseId,
        status: "completed",
        notes: `Observacion: ${type} - ${severity}`,
        createdBy: claims.userId,
        updatedBy: claims.userId,
      })
      .returning({ id: activities.id });

    await tx.insert(activityObservations).values({
      activityId: activity.id,
      type,
      severity,
      description,
      affectedPlants: affectedPlants ?? null,
      actionTaken: actionTaken || null,
      createdBy: claims.userId,
      updatedBy: claims.userId,
    });

    // Auto-generate alert for critical/high severity
    if (severity === "critical" || severity === "high") {
      await tx.execute(sql`
        INSERT INTO alerts (type, severity, entity_type, entity_id, title, message, zone_id, company_id)
        SELECT
          'quality_failed',
          ${severity === "critical" ? "critical" : "warning"},
          'batch',
          ${batchId},
          ${`Observacion ${severity}: ${type}`},
          ${description.substring(0, 200)},
          ${batch.zoneId},
          b.company_id
        FROM batches b WHERE b.id = ${batchId}
      `);
    }
  });

  return { success: true };
}
