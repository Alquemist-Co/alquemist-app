"use server";

import { eq, sql, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  cultivationSchedules,
  cultivars,
  cropTypes,
  productionPhases,
  activityTemplates,
  activityTemplatePhases,
  batches,
} from "@/lib/db/schema";
import { z } from "zod";
import { cultivationScheduleSchema } from "@/lib/schemas/cultivation-schedule";
import type { PhaseConfigItem } from "@/lib/schemas/cultivation-schedule";
import type { ActionResult } from "./types";

const updateScheduleSchema = cultivationScheduleSchema.extend({
  id: z.string().uuid(),
});

// ────────────────────────────── Types ──────────────────────────────

export type ScheduleListItem = {
  id: string;
  name: string;
  cultivarName: string;
  cultivarCode: string;
  cropTypeName: string;
  totalDays: number;
  phaseCount: number;
  templateCount: number;
  isActive: boolean;
};

export type ScheduleDetail = ScheduleListItem & {
  cultivarId: string;
  phaseConfig: PhaseConfigItem[];
};

export type ScheduleWizardCultivar = {
  id: string;
  name: string;
  code: string;
  cropTypeName: string;
  cropTypeId: string;
};

export type ScheduleWizardPhase = {
  id: string;
  name: string;
  sortOrder: number;
  defaultDurationDays: number | null;
};

export type ScheduleWizardTemplate = {
  id: string;
  name: string;
  code: string;
  frequency: string;
};

export type ScheduleWizardData = {
  cultivars: ScheduleWizardCultivar[];
};

// ────────────────────────────── Read actions ──────────────────────────────

export async function getCultivationSchedules(): Promise<ScheduleListItem[]> {
  await requireAuth();

  const rows = await db
    .select({
      id: cultivationSchedules.id,
      name: cultivationSchedules.name,
      cultivarName: cultivars.name,
      cultivarCode: cultivars.code,
      cropTypeName: cropTypes.name,
      totalDays: cultivationSchedules.totalDays,
      phaseConfig: cultivationSchedules.phaseConfig,
      isActive: cultivationSchedules.isActive,
    })
    .from(cultivationSchedules)
    .innerJoin(cultivars, eq(cultivationSchedules.cultivarId, cultivars.id))
    .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
    .orderBy(cultivationSchedules.name);

  return rows.map((r) => {
    const config = (r.phaseConfig ?? []) as PhaseConfigItem[];
    const templateCount = config.reduce(
      (sum, p) => sum + (p.templates?.length ?? 0),
      0,
    );
    return {
      id: r.id,
      name: r.name,
      cultivarName: r.cultivarName,
      cultivarCode: r.cultivarCode,
      cropTypeName: r.cropTypeName,
      totalDays: r.totalDays,
      phaseCount: config.length,
      templateCount,
      isActive: r.isActive,
    };
  });
}

export async function getScheduleDetail(
  id: string,
): Promise<ScheduleDetail | null> {
  await requireAuth();

  const [row] = await db
    .select({
      id: cultivationSchedules.id,
      name: cultivationSchedules.name,
      cultivarId: cultivationSchedules.cultivarId,
      cultivarName: cultivars.name,
      cultivarCode: cultivars.code,
      cropTypeName: cropTypes.name,
      totalDays: cultivationSchedules.totalDays,
      phaseConfig: cultivationSchedules.phaseConfig,
      isActive: cultivationSchedules.isActive,
    })
    .from(cultivationSchedules)
    .innerJoin(cultivars, eq(cultivationSchedules.cultivarId, cultivars.id))
    .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
    .where(eq(cultivationSchedules.id, id))
    .limit(1);

  if (!row) return null;

  const config = (row.phaseConfig ?? []) as PhaseConfigItem[];
  const templateCount = config.reduce(
    (sum, p) => sum + (p.templates?.length ?? 0),
    0,
  );

  return {
    id: row.id,
    name: row.name,
    cultivarId: row.cultivarId,
    cultivarName: row.cultivarName,
    cultivarCode: row.cultivarCode,
    cropTypeName: row.cropTypeName,
    totalDays: row.totalDays,
    phaseConfig: config,
    phaseCount: config.length,
    templateCount,
    isActive: row.isActive,
  };
}

export async function getScheduleWizardData(): Promise<ScheduleWizardData> {
  await requireAuth(["admin", "manager"]);

  const cultivarRows = await db
    .select({
      id: cultivars.id,
      name: cultivars.name,
      code: cultivars.code,
      cropTypeName: cropTypes.name,
      cropTypeId: cultivars.cropTypeId,
    })
    .from(cultivars)
    .innerJoin(cropTypes, eq(cultivars.cropTypeId, cropTypes.id))
    .where(eq(cropTypes.isActive, true))
    .orderBy(cultivars.name);

  return { cultivars: cultivarRows };
}

export async function getPhasesByCultivar(
  cultivarId: string,
): Promise<ScheduleWizardPhase[]> {
  await requireAuth(["admin", "manager"]);

  const [cultivar] = await db
    .select({ cropTypeId: cultivars.cropTypeId, phaseDurations: cultivars.phaseDurations })
    .from(cultivars)
    .where(eq(cultivars.id, cultivarId))
    .limit(1);

  if (!cultivar) return [];

  const phases = await db
    .select({
      id: productionPhases.id,
      name: productionPhases.name,
      sortOrder: productionPhases.sortOrder,
    })
    .from(productionPhases)
    .where(eq(productionPhases.cropTypeId, cultivar.cropTypeId))
    .orderBy(productionPhases.sortOrder);

  // Resolve default duration from cultivar.phaseDurations if available
  const durations = (cultivar.phaseDurations ?? {}) as Record<string, number>;

  return phases.map((p) => ({
    id: p.id,
    name: p.name,
    sortOrder: p.sortOrder,
    defaultDurationDays: durations[p.id] ?? null,
  }));
}

export async function getTemplatesForPhase(
  phaseId: string,
): Promise<ScheduleWizardTemplate[]> {
  await requireAuth(["admin", "manager"]);

  const rows = await db
    .select({
      id: activityTemplates.id,
      name: activityTemplates.name,
      code: activityTemplates.code,
      frequency: activityTemplates.frequency,
    })
    .from(activityTemplates)
    .innerJoin(
      activityTemplatePhases,
      eq(activityTemplates.id, activityTemplatePhases.templateId),
    )
    .where(
      and(
        eq(activityTemplatePhases.phaseId, phaseId),
        eq(activityTemplates.isActive, true),
      ),
    )
    .orderBy(activityTemplates.name);

  return rows;
}

// ────────────────────────────── Write actions ──────────────────────────────

export async function createCultivationSchedule(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin", "manager"]);
  const parsed = cultivationScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, cultivarId, totalDays, phaseConfig } = parsed.data;

  const [row] = await db
    .insert(cultivationSchedules)
    .values({
      name,
      cultivarId,
      totalDays,
      phaseConfig: JSON.parse(JSON.stringify(phaseConfig)),
      createdBy: claims.userId,
      updatedBy: claims.userId,
    })
    .returning({ id: cultivationSchedules.id });

  return { success: true, data: { id: row.id } };
}

export async function updateCultivationSchedule(
  input: unknown,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin", "manager"]);

  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, name, totalDays, phaseConfig } = parsed.data;

  const [updated] = await db
    .update(cultivationSchedules)
    .set({
      name,
      totalDays,
      phaseConfig: JSON.parse(JSON.stringify(phaseConfig)),
      updatedBy: claims.userId,
    })
    .where(eq(cultivationSchedules.id, id))
    .returning({ id: cultivationSchedules.id });

  if (!updated) {
    return { success: false, error: "Schedule no encontrado" };
  }
  return { success: true };
}

export async function toggleScheduleActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ activeBatchCount?: number }>> {
  const claims = await requireAuth(["admin", "manager"]);

  if (!isActive) {
    // Check active batches
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(batches)
      .where(
        and(
          eq(batches.scheduleId, id),
          inArray(batches.status, ["active", "phase_transition", "on_hold"]),
        ),
      );

    const activeBatchCount = countRow?.count ?? 0;
    if (activeBatchCount > 0) {
      // Still deactivate but inform the caller
      await db
        .update(cultivationSchedules)
        .set({ isActive: false, updatedBy: claims.userId })
        .where(eq(cultivationSchedules.id, id));
      return { success: true, data: { activeBatchCount } };
    }
  }

  await db
    .update(cultivationSchedules)
    .set({ isActive, updatedBy: claims.userId })
    .where(eq(cultivationSchedules.id, id));

  return { success: true, data: {} };
}
