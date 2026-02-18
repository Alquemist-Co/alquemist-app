"use server";

import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { unitsOfMeasure } from "@/lib/db/schema";
import { unitSchema, updateUnitSchema } from "@/lib/schemas/unit";
import type { ActionResult } from "./types";

export type UnitListItem = {
  id: string;
  code: string;
  name: string;
  dimension: string;
  baseUnitId: string | null;
  baseUnitName: string | null;
  toBaseFactor: string;
  productCount: number;
};

export async function getUnitsOfMeasure(): Promise<UnitListItem[]> {
  await requireAuth();

  const rows = await db
    .select({
      id: unitsOfMeasure.id,
      code: unitsOfMeasure.code,
      name: unitsOfMeasure.name,
      dimension: unitsOfMeasure.dimension,
      baseUnitId: unitsOfMeasure.baseUnitId,
      toBaseFactor: unitsOfMeasure.toBaseFactor,
      productCount: sql<number>`(
        SELECT count(*)::int FROM products
        WHERE default_unit_id = ${unitsOfMeasure.id}
      )`,
    })
    .from(unitsOfMeasure)
    .orderBy(unitsOfMeasure.dimension, unitsOfMeasure.name);

  // Resolve base unit names in a second pass
  const unitMap = new Map(rows.map((u) => [u.id, u.name]));
  return rows.map((u) => ({
    ...u,
    baseUnitName: u.baseUnitId ? unitMap.get(u.baseUnitId) ?? null : null,
  }));
}

export async function createUnit(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin"]);
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Validate base unit is same dimension
  if (parsed.data.baseUnitId) {
    const [base] = await db
      .select({ dimension: unitsOfMeasure.dimension })
      .from(unitsOfMeasure)
      .where(eq(unitsOfMeasure.id, parsed.data.baseUnitId))
      .limit(1);

    if (!base) {
      return { success: false, error: "Unidad base no encontrada" };
    }
    if (base.dimension !== parsed.data.dimension) {
      return {
        success: false,
        error: "La unidad base debe ser de la misma dimension",
      };
    }
  }

  try {
    const [row] = await db
      .insert(unitsOfMeasure)
      .values({
        code: parsed.data.code,
        name: parsed.data.name,
        dimension: parsed.data.dimension,
        baseUnitId: parsed.data.baseUnitId || null,
        toBaseFactor: String(parsed.data.toBaseFactor),
        createdBy: claims.userId,
      })
      .returning({ id: unitsOfMeasure.id });
    return { success: true, data: { id: row.id } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe una unidad con este codigo" };
    }
    throw err;
  }
}

export async function updateUnit(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);
  const parsed = updateUnitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;

  // Same dimension validation for base unit
  if (data.baseUnitId) {
    const [base] = await db
      .select({ dimension: unitsOfMeasure.dimension })
      .from(unitsOfMeasure)
      .where(eq(unitsOfMeasure.id, data.baseUnitId))
      .limit(1);

    if (base && base.dimension !== data.dimension) {
      return {
        success: false,
        error: "La unidad base debe ser de la misma dimension",
      };
    }
  }

  try {
    const [updated] = await db
      .update(unitsOfMeasure)
      .set({
        code: data.code,
        name: data.name,
        dimension: data.dimension,
        baseUnitId: data.baseUnitId || null,
        toBaseFactor: String(data.toBaseFactor),
        updatedBy: claims.userId,
      })
      .where(eq(unitsOfMeasure.id, id))
      .returning({ id: unitsOfMeasure.id });

    if (!updated) {
      return { success: false, error: "Unidad no encontrada" };
    }
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe una unidad con este codigo" };
    }
    throw err;
  }
}
