"use server";

import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { resourceCategories } from "@/lib/db/schema";
import {
  categorySchema,
  updateCategorySchema,
} from "@/lib/schemas/resource-category";
import type { ActionResult } from "./types";

export type CategoryListItem = {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  parentName: string | null;
  icon: string | null;
  color: string | null;
  isConsumable: boolean;
  isDepreciable: boolean;
  isTransformable: boolean;
  defaultLotTracking: string;
  isActive: boolean;
  productCount: number;
  childCount: number;
};

export async function getResourceCategories(): Promise<CategoryListItem[]> {
  await requireAuth();

  const rows = await db
    .select({
      id: resourceCategories.id,
      name: resourceCategories.name,
      code: resourceCategories.code,
      parentId: resourceCategories.parentId,
      icon: resourceCategories.icon,
      color: resourceCategories.color,
      isConsumable: resourceCategories.isConsumable,
      isDepreciable: resourceCategories.isDepreciable,
      isTransformable: resourceCategories.isTransformable,
      defaultLotTracking: resourceCategories.defaultLotTracking,
      isActive: resourceCategories.isActive,
      productCount: sql<number>`(
        SELECT count(*)::int FROM products
        WHERE category_id = ${resourceCategories.id}
      )`,
      childCount: sql<number>`(
        SELECT count(*)::int FROM resource_categories c2
        WHERE c2.parent_id = ${resourceCategories.id}
      )`,
    })
    .from(resourceCategories)
    .orderBy(resourceCategories.name);

  // Resolve parent names
  const catMap = new Map(rows.map((c) => [c.id, c.name]));
  return rows.map((c) => ({
    ...c,
    parentName: c.parentId ? catMap.get(c.parentId) ?? null : null,
  }));
}

export async function createCategory(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin"]);
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Validate max 3 levels
  if (parsed.data.parentId) {
    const depth = await getCategoryDepth(parsed.data.parentId);
    if (depth >= 2) {
      return {
        success: false,
        error: "Maximo 3 niveles de profundidad",
      };
    }
  }

  try {
    const [row] = await db
      .insert(resourceCategories)
      .values({
        name: parsed.data.name,
        code: parsed.data.code,
        parentId: parsed.data.parentId || null,
        icon: parsed.data.icon || null,
        color: parsed.data.color || null,
        isConsumable: parsed.data.isConsumable,
        isDepreciable: parsed.data.isDepreciable,
        isTransformable: parsed.data.isTransformable,
        defaultLotTracking: parsed.data.defaultLotTracking,
        createdBy: claims.userId,
      })
      .returning({ id: resourceCategories.id });
    return { success: true, data: { id: row.id } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe una categoria con este codigo" };
    }
    throw err;
  }
}

export async function updateCategory(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;

  // Prevent setting self as parent
  if (data.parentId === id) {
    return { success: false, error: "No puede ser su propia categoria padre" };
  }

  // Validate max depth if parent changed
  if (data.parentId) {
    const depth = await getCategoryDepth(data.parentId);
    if (depth >= 2) {
      return { success: false, error: "Maximo 3 niveles de profundidad" };
    }
  }

  try {
    const [updated] = await db
      .update(resourceCategories)
      .set({
        name: data.name,
        code: data.code,
        parentId: data.parentId || null,
        icon: data.icon || null,
        color: data.color || null,
        isConsumable: data.isConsumable,
        isDepreciable: data.isDepreciable,
        isTransformable: data.isTransformable,
        defaultLotTracking: data.defaultLotTracking,
        updatedBy: claims.userId,
      })
      .where(eq(resourceCategories.id, id))
      .returning({ id: resourceCategories.id });

    if (!updated) {
      return { success: false, error: "Categoria no encontrada" };
    }
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe una categoria con este codigo" };
    }
    throw err;
  }
}

export async function toggleCategoryActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  if (!active) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`products`)
      .where(sql`category_id = ${id} AND is_active = true`);

    if (count > 0) {
      return {
        success: false,
        error: `No se puede desactivar: tiene ${count} producto(s) activo(s)`,
      };
    }
  }

  const [updated] = await db
    .update(resourceCategories)
    .set({ isActive: active, updatedBy: claims.userId })
    .where(eq(resourceCategories.id, id))
    .returning({ id: resourceCategories.id });

  if (!updated) {
    return { success: false, error: "Categoria no encontrada" };
  }
  return { success: true };
}

async function getCategoryDepth(id: string): Promise<number> {
  const [result] = await db.execute<{ depth: number }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id, 0 AS depth
      FROM resource_categories WHERE id = ${id}
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1
      FROM resource_categories c
      JOIN ancestors a ON c.id = a.parent_id
    )
    SELECT max(depth) AS depth FROM ancestors
  `);
  return (result as unknown as { depth: number })?.depth ?? 0;
}
