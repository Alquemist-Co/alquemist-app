"use server";

import { eq, sql, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  cropTypes,
  productionPhases,
  phaseProductFlows,
} from "@/lib/db/schema";
import {
  createCropTypeSchema,
  updateCropTypeSchema,
  createPhaseSchema,
  updatePhaseSchema,
  reorderPhasesSchema,
  setPhaseFlowsSchema,
} from "@/lib/schemas/config";
import type { ActionResult } from "./types";

// ── Crop Type queries ──────────────────────────────────────────────

export type CropTypeWithCounts = {
  id: string;
  code: string;
  name: string;
  category: string;
  scientificName: string | null;
  regulatoryFramework: string | null;
  icon: string | null;
  isActive: boolean;
  phaseCount: number;
  cultivarCount: number;
};

export async function getCropTypes(): Promise<CropTypeWithCounts[]> {
  await requireAuth();

  const rows = await db
    .select({
      id: cropTypes.id,
      code: cropTypes.code,
      name: cropTypes.name,
      category: cropTypes.category,
      scientificName: cropTypes.scientificName,
      regulatoryFramework: cropTypes.regulatoryFramework,
      icon: cropTypes.icon,
      isActive: cropTypes.isActive,
      phaseCount: sql<number>`(
        SELECT count(*)::int FROM production_phases
        WHERE crop_type_id = ${cropTypes.id}
      )`,
      cultivarCount: sql<number>`(
        SELECT count(*)::int FROM cultivars
        WHERE crop_type_id = ${cropTypes.id}
      )`,
    })
    .from(cropTypes)
    .orderBy(cropTypes.name);

  return rows;
}

export type CropTypeDetail = {
  id: string;
  code: string;
  name: string;
  category: string;
  scientificName: string | null;
  regulatoryFramework: string | null;
  icon: string | null;
  isActive: boolean;
  phases: PhaseWithFlows[];
};

export type PhaseWithFlows = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  defaultDurationDays: number | null;
  isTransformation: boolean;
  isDestructive: boolean;
  requiresZoneChange: boolean;
  canSkip: boolean;
  canBeEntryPoint: boolean;
  canBeExitPoint: boolean;
  icon: string | null;
  color: string | null;
  flows: FlowRow[];
};

export type FlowRow = {
  id: string;
  direction: string;
  productRole: string;
  productId: string | null;
  productCategoryId: string | null;
  expectedYieldPct: string | null;
  expectedQuantityPerInput: string | null;
  unitId: string | null;
  isRequired: boolean;
  sortOrder: number;
  notes: string | null;
};

export async function getCropType(id: string): Promise<CropTypeDetail | null> {
  await requireAuth();

  const [ct] = await db
    .select()
    .from(cropTypes)
    .where(eq(cropTypes.id, id))
    .limit(1);

  if (!ct) return null;

  const phases = await db
    .select()
    .from(productionPhases)
    .where(eq(productionPhases.cropTypeId, id))
    .orderBy(asc(productionPhases.sortOrder));

  const phaseIds = phases.map((p) => p.id);

  const flowsByPhase: Record<string, FlowRow[]> = {};
  if (phaseIds.length > 0) {
    const allFlows = await db
      .select()
      .from(phaseProductFlows)
      .where(
        sql`${phaseProductFlows.phaseId} IN (${sql.join(
          phaseIds.map((pid) => sql`${pid}`),
          sql`, `
        )})`
      )
      .orderBy(asc(phaseProductFlows.sortOrder));

    for (const f of allFlows) {
      if (!flowsByPhase[f.phaseId]) flowsByPhase[f.phaseId] = [];
      flowsByPhase[f.phaseId].push({
        id: f.id,
        direction: f.direction,
        productRole: f.productRole,
        productId: f.productId,
        productCategoryId: f.productCategoryId,
        expectedYieldPct: f.expectedYieldPct,
        expectedQuantityPerInput: f.expectedQuantityPerInput,
        unitId: f.unitId,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
        notes: f.notes,
      });
    }
  }

  return {
    id: ct.id,
    code: ct.code,
    name: ct.name,
    category: ct.category,
    scientificName: ct.scientificName,
    regulatoryFramework: ct.regulatoryFramework,
    icon: ct.icon,
    isActive: ct.isActive,
    phases: phases.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      sortOrder: p.sortOrder,
      defaultDurationDays: p.defaultDurationDays,
      isTransformation: p.isTransformation,
      isDestructive: p.isDestructive,
      requiresZoneChange: p.requiresZoneChange,
      canSkip: p.canSkip,
      canBeEntryPoint: p.canBeEntryPoint,
      canBeExitPoint: p.canBeExitPoint,
      icon: p.icon,
      color: p.color,
      flows: flowsByPhase[p.id] ?? [],
    })),
  };
}

// ── Crop Type mutations ────────────────────────────────────────────

export async function createCropType(input: unknown): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin"]);

  const parsed = createCropTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { code, name, category, scientificName, regulatoryFramework, icon } = parsed.data;

  try {
    const [row] = await db
      .insert(cropTypes)
      .values({
        code,
        name,
        category,
        scientificName: scientificName || null,
        regulatoryFramework: regulatoryFramework || null,
        icon: icon || null,
        createdBy: claims.userId,
        updatedBy: claims.userId,
      })
      .returning({ id: cropTypes.id });

    return { success: true, data: { id: row.id } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe un tipo de cultivo con este codigo" };
    }
    throw err;
  }
}

export async function updateCropType(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  const parsed = updateCropTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, code, name, category, scientificName, regulatoryFramework, icon } = parsed.data;

  try {
    const [updated] = await db
      .update(cropTypes)
      .set({
        code,
        name,
        category,
        scientificName: scientificName || null,
        regulatoryFramework: regulatoryFramework || null,
        icon: icon || null,
        updatedBy: claims.userId,
      })
      .where(eq(cropTypes.id, id))
      .returning({ id: cropTypes.id });

    if (!updated) {
      return { success: false, error: "Tipo de cultivo no encontrado" };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe un tipo de cultivo con este codigo" };
    }
    throw err;
  }
}

export async function deactivateCropType(
  id: string
): Promise<ActionResult<{ dependencyCount: number }>> {
  await requireAuth(["admin"]);

  // Count active orders using this crop type
  const [orderCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`production_orders`)
    .where(
      sql`crop_type_id = ${id} AND status NOT IN ('completed', 'cancelled')`
    );

  const depCount = orderCount?.count ?? 0;

  await db
    .update(cropTypes)
    .set({ isActive: false })
    .where(eq(cropTypes.id, id));

  return { success: true, data: { dependencyCount: depCount } };
}

export async function reactivateCropType(id: string): Promise<ActionResult> {
  await requireAuth(["admin"]);

  await db
    .update(cropTypes)
    .set({ isActive: true })
    .where(eq(cropTypes.id, id));

  return { success: true };
}

// ── Phase mutations ────────────────────────────────────────────────

export async function createPhase(input: unknown): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin"]);

  const parsed = createPhaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Get max sort order for this crop type
  const [maxOrder] = await db
    .select({ max: sql<number>`coalesce(max(sort_order), 0)::int` })
    .from(productionPhases)
    .where(eq(productionPhases.cropTypeId, data.cropTypeId));

  const nextOrder = (maxOrder?.max ?? 0) + 1;

  const [row] = await db
    .insert(productionPhases)
    .values({
      cropTypeId: data.cropTypeId,
      code: data.code,
      name: data.name,
      sortOrder: nextOrder,
      defaultDurationDays: data.defaultDurationDays ?? null,
      isTransformation: data.isTransformation,
      isDestructive: data.isDestructive,
      requiresZoneChange: data.requiresZoneChange,
      canSkip: data.canSkip,
      canBeEntryPoint: data.canBeEntryPoint,
      canBeExitPoint: data.canBeExitPoint,
      icon: data.icon || null,
      color: data.color || null,
      createdBy: claims.userId,
      updatedBy: claims.userId,
    })
    .returning({ id: productionPhases.id });

  return { success: true, data: { id: row.id } };
}

export async function updatePhase(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  const parsed = updatePhaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;

  const [updated] = await db
    .update(productionPhases)
    .set({
      code: data.code,
      name: data.name,
      defaultDurationDays: data.defaultDurationDays ?? null,
      isTransformation: data.isTransformation,
      isDestructive: data.isDestructive,
      requiresZoneChange: data.requiresZoneChange,
      canSkip: data.canSkip,
      canBeEntryPoint: data.canBeEntryPoint,
      canBeExitPoint: data.canBeExitPoint,
      icon: data.icon || null,
      color: data.color || null,
      updatedBy: claims.userId,
    })
    .where(eq(productionPhases.id, id))
    .returning({ id: productionPhases.id });

  if (!updated) {
    return { success: false, error: "Fase no encontrada" };
  }

  return { success: true };
}

export async function deletePhase(id: string): Promise<ActionResult> {
  await requireAuth(["admin"]);

  // Check for batches currently in this phase
  const [batchCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`batches`)
    .where(sql`current_phase_id = ${id} AND status = 'active'`);

  if ((batchCount?.count ?? 0) > 0) {
    return {
      success: false,
      error: `Hay ${batchCount!.count} batches activos en esta fase. No se puede eliminar.`,
    };
  }

  // Delete flows first, then the phase
  await db.delete(phaseProductFlows).where(eq(phaseProductFlows.phaseId, id));
  await db.delete(productionPhases).where(eq(productionPhases.id, id));

  return { success: true };
}

export async function reorderPhases(input: unknown): Promise<ActionResult> {
  await requireAuth(["admin"]);

  const parsed = reorderPhasesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { cropTypeId, phaseIds } = parsed.data;

  // Build CASE WHEN for atomic update
  const cases = phaseIds
    .map((pid, i) => sql`WHEN ${pid} THEN ${i + 1}`)
    .reduce((acc, c) => sql`${acc} ${c}`);

  await db.execute(sql`
    UPDATE production_phases
    SET sort_order = CASE id ${cases} END
    WHERE crop_type_id = ${cropTypeId}
      AND id IN (${sql.join(
        phaseIds.map((pid) => sql`${pid}`),
        sql`, `
      )})
  `);

  return { success: true };
}

// ── Phase Product Flow mutations ───────────────────────────────────

export async function setPhaseFlows(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);

  const parsed = setPhaseFlowsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { phaseId, flows } = parsed.data;

  await db.transaction(async (tx) => {
    // Delete all existing flows for this phase
    await tx.delete(phaseProductFlows).where(eq(phaseProductFlows.phaseId, phaseId));

    // Insert new flows
    if (flows.length > 0) {
      await tx.insert(phaseProductFlows).values(
        flows.map((f) => ({
          phaseId,
          direction: f.direction as "input" | "output",
          productRole: f.productRole as "primary" | "secondary" | "byproduct" | "waste",
          productId: f.productId || null,
          productCategoryId: f.productCategoryId || null,
          expectedYieldPct: f.expectedYieldPct?.toString() ?? null,
          expectedQuantityPerInput: f.expectedQuantityPerInput?.toString() ?? null,
          unitId: f.unitId || null,
          isRequired: f.isRequired,
          sortOrder: f.sortOrder,
          notes: f.notes || null,
          createdBy: claims.userId,
          updatedBy: claims.userId,
        }))
      );
    }
  });

  return { success: true };
}

// ── Helper queries for selectors ───────────────────────────────────

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
};

export type CategoryOption = {
  id: string;
  code: string;
  name: string;
};

export type UnitOption = {
  id: string;
  code: string;
  name: string;
};

export async function getProductOptions(): Promise<ProductOption[]> {
  await requireAuth();

  return db
    .select({
      id: sql<string>`id`,
      sku: sql<string>`sku`,
      name: sql<string>`name`,
      categoryId: sql<string>`category_id`,
    })
    .from(sql`products`)
    .where(sql`is_active = true`)
    .orderBy(sql`name`);
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  await requireAuth();

  return db
    .select({
      id: sql<string>`id`,
      code: sql<string>`code`,
      name: sql<string>`name`,
    })
    .from(sql`resource_categories`)
    .where(sql`is_active = true`)
    .orderBy(sql`name`);
}

export async function getUnitOptions(): Promise<UnitOption[]> {
  await requireAuth();

  return db
    .select({
      id: sql<string>`id`,
      code: sql<string>`code`,
      name: sql<string>`name`,
    })
    .from(sql`units_of_measure`)
    .orderBy(sql`name`);
}
