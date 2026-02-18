"use server";

import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { activityTypes } from "@/lib/db/schema";
import {
  activityTypeSchema,
  updateActivityTypeSchema,
} from "@/lib/schemas/activity-type";
import type { ActionResult } from "./types";

export type ActivityTypeListItem = {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
  templateCount: number;
};

export async function getActivityTypes(): Promise<ActivityTypeListItem[]> {
  await requireAuth();

  return db
    .select({
      id: activityTypes.id,
      name: activityTypes.name,
      category: activityTypes.category,
      isActive: activityTypes.isActive,
      templateCount: sql<number>`(
        SELECT count(*)::int FROM activity_templates
        WHERE activity_type_id = ${activityTypes.id}
      )`,
    })
    .from(activityTypes)
    .orderBy(activityTypes.name);
}

export async function createActivityType(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin"]);
  const parsed = activityTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const [row] = await db
      .insert(activityTypes)
      .values({
        name: parsed.data.name,
        category: parsed.data.category || null,
        createdBy: claims.userId,
      })
      .returning({ id: activityTypes.id });
    return { success: true, data: { id: row.id } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return {
        success: false,
        error: "Ya existe un tipo de actividad con este nombre",
      };
    }
    throw err;
  }
}

export async function updateActivityType(
  input: unknown,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);
  const parsed = updateActivityTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;
  try {
    const [updated] = await db
      .update(activityTypes)
      .set({
        name: data.name,
        category: data.category || null,
        updatedBy: claims.userId,
      })
      .where(eq(activityTypes.id, id))
      .returning({ id: activityTypes.id });

    if (!updated) {
      return { success: false, error: "Tipo de actividad no encontrado" };
    }
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return {
        success: false,
        error: "Ya existe un tipo de actividad con este nombre",
      };
    }
    throw err;
  }
}

export async function toggleActivityTypeActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  if (!active) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`activity_templates`)
      .where(sql`activity_type_id = ${id} AND is_active = true`);

    if (count > 0) {
      return {
        success: false,
        error: `Tiene ${count} template(s) asociado(s). Se desactivara de todas formas.`,
      };
    }
  }

  const [updated] = await db
    .update(activityTypes)
    .set({ isActive: active, updatedBy: claims.userId })
    .where(eq(activityTypes.id, id))
    .returning({ id: activityTypes.id });

  if (!updated) {
    return { success: false, error: "Tipo de actividad no encontrado" };
  }
  return { success: true };
}
