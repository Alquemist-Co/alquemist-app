"use server";

import { eq, sql, desc, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  activityTemplates,
  activityTemplatePhases,
  activityTemplateResources,
  activityTemplateChecklist,
  activityTypes,
  productionPhases,
  products,
  unitsOfMeasure,
} from "@/lib/db/schema";
import {
  createTemplateSchema,
  updateTemplateSchema,
  setTemplateResourcesSchema,
  setTemplateChecklistSchema,
} from "@/lib/schemas/template";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type TemplateListItem = {
  id: string;
  code: string;
  name: string;
  activityTypeName: string;
  frequency: string;
  estimatedDurationMin: number;
  triggersPhaseChangeName: string | null;
  triggersTransformation: boolean;
  isActive: boolean;
  phaseNames: string[];
  resourceCount: number;
  checklistCount: number;
};

export type TemplateDetail = {
  id: string;
  code: string;
  name: string;
  activityTypeId: string;
  activityTypeName: string;
  frequency: string;
  estimatedDurationMin: number;
  triggerDayFrom: number | null;
  triggerDayTo: number | null;
  triggersPhaseChangeId: string | null;
  triggersPhaseChangeName: string | null;
  triggersTransformation: boolean;
  isActive: boolean;
  phases: { id: string; phaseId: string; phaseName: string }[];
  resources: TemplateResourceDetail[];
  checklist: TemplateChecklistDetail[];
};

export type TemplateResourceDetail = {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  quantity: string;
  quantityBasis: string;
  isOptional: boolean;
  sortOrder: number;
  notes: string | null;
};

export type TemplateChecklistDetail = {
  id: string;
  stepOrder: number;
  instruction: string;
  isCritical: boolean;
  requiresPhoto: boolean;
  expectedValue: string | null;
  tolerance: string | null;
};

export type TemplateFormData = {
  activityTypes: { id: string; name: string }[];
  phases: { id: string; name: string; cropTypeName: string }[];
  products: { id: string; name: string; unitName: string }[];
};

// ── Queries ───────────────────────────────────────────────────────

export async function getTemplates(): Promise<TemplateListItem[]> {
  await requireAuth();

  const rows = await db
    .select({
      id: activityTemplates.id,
      code: activityTemplates.code,
      name: activityTemplates.name,
      activityTypeName: activityTypes.name,
      frequency: activityTemplates.frequency,
      estimatedDurationMin: activityTemplates.estimatedDurationMin,
      triggersPhaseChangeName: sql<string | null>`tp.name`,
      triggersTransformation: activityTemplates.triggersTransformation,
      isActive: activityTemplates.isActive,
      phaseNames: sql<string[]>`COALESCE(
        (SELECT array_agg(pp.name ORDER BY pp.sort_order)
         FROM activity_template_phases atp
         JOIN production_phases pp ON pp.id = atp.phase_id
         WHERE atp.template_id = ${activityTemplates.id}),
        '{}'
      )`,
      resourceCount: sql<number>`(
        SELECT COUNT(*)::int FROM activity_template_resources
        WHERE template_id = ${activityTemplates.id}
      )`,
      checklistCount: sql<number>`(
        SELECT COUNT(*)::int FROM activity_template_checklist
        WHERE template_id = ${activityTemplates.id}
      )`,
    })
    .from(activityTemplates)
    .innerJoin(activityTypes, eq(activityTemplates.activityTypeId, activityTypes.id))
    .leftJoin(
      sql`production_phases tp`,
      sql`tp.id = ${activityTemplates.triggersPhaseChangeId}`,
    )
    .orderBy(desc(activityTemplates.createdAt));

  return rows;
}

export async function getTemplate(
  id: string,
): Promise<TemplateDetail | null> {
  await requireAuth();

  const rows = await db
    .select({
      id: activityTemplates.id,
      code: activityTemplates.code,
      name: activityTemplates.name,
      activityTypeId: activityTemplates.activityTypeId,
      activityTypeName: activityTypes.name,
      frequency: activityTemplates.frequency,
      estimatedDurationMin: activityTemplates.estimatedDurationMin,
      triggerDayFrom: activityTemplates.triggerDayFrom,
      triggerDayTo: activityTemplates.triggerDayTo,
      triggersPhaseChangeId: activityTemplates.triggersPhaseChangeId,
      triggersPhaseChangeName: sql<string | null>`tp.name`,
      triggersTransformation: activityTemplates.triggersTransformation,
      isActive: activityTemplates.isActive,
    })
    .from(activityTemplates)
    .innerJoin(activityTypes, eq(activityTemplates.activityTypeId, activityTypes.id))
    .leftJoin(
      sql`production_phases tp`,
      sql`tp.id = ${activityTemplates.triggersPhaseChangeId}`,
    )
    .where(eq(activityTemplates.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const template = rows[0];

  // Fetch phases, resources, checklist in parallel
  const [phases, resources, checklist] = await Promise.all([
    db
      .select({
        id: activityTemplatePhases.id,
        phaseId: activityTemplatePhases.phaseId,
        phaseName: productionPhases.name,
      })
      .from(activityTemplatePhases)
      .innerJoin(
        productionPhases,
        eq(activityTemplatePhases.phaseId, productionPhases.id),
      )
      .where(eq(activityTemplatePhases.templateId, id)),
    db
      .select({
        id: activityTemplateResources.id,
        productId: activityTemplateResources.productId,
        productName: products.name,
        productUnit: unitsOfMeasure.code,
        quantity: activityTemplateResources.quantity,
        quantityBasis: activityTemplateResources.quantityBasis,
        isOptional: activityTemplateResources.isOptional,
        sortOrder: activityTemplateResources.sortOrder,
        notes: activityTemplateResources.notes,
      })
      .from(activityTemplateResources)
      .innerJoin(products, eq(activityTemplateResources.productId, products.id))
      .innerJoin(unitsOfMeasure, eq(products.defaultUnitId, unitsOfMeasure.id))
      .where(eq(activityTemplateResources.templateId, id))
      .orderBy(asc(activityTemplateResources.sortOrder)),
    db
      .select({
        id: activityTemplateChecklist.id,
        stepOrder: activityTemplateChecklist.stepOrder,
        instruction: activityTemplateChecklist.instruction,
        isCritical: activityTemplateChecklist.isCritical,
        requiresPhoto: activityTemplateChecklist.requiresPhoto,
        expectedValue: activityTemplateChecklist.expectedValue,
        tolerance: activityTemplateChecklist.tolerance,
      })
      .from(activityTemplateChecklist)
      .where(eq(activityTemplateChecklist.templateId, id))
      .orderBy(asc(activityTemplateChecklist.stepOrder)),
  ]);

  return { ...template, phases, resources, checklist };
}

export async function getTemplateFormData(): Promise<TemplateFormData> {
  await requireAuth();

  const [typeRows, phaseRows, productRows] = await Promise.all([
    db
      .select({ id: activityTypes.id, name: activityTypes.name })
      .from(activityTypes)
      .where(eq(activityTypes.isActive, true))
      .orderBy(activityTypes.name),
    db
      .select({
        id: productionPhases.id,
        name: productionPhases.name,
        cropTypeName: sql<string>`ct.name`,
      })
      .from(productionPhases)
      .innerJoin(
        sql`crop_types ct`,
        sql`ct.id = ${productionPhases.cropTypeId}`,
      )
      .orderBy(sql`ct.name`, asc(productionPhases.sortOrder)),
    db
      .select({
        id: products.id,
        name: products.name,
        unitName: unitsOfMeasure.code,
      })
      .from(products)
      .innerJoin(unitsOfMeasure, eq(products.defaultUnitId, unitsOfMeasure.id))
      .orderBy(products.name),
  ]);

  return {
    activityTypes: typeRows,
    phases: phaseRows,
    products: productRows,
  };
}

// ── Mutations ─────────────────────────────────────────────────────

export async function createTemplate(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAuth(["manager", "admin"]);

  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: msg };
  }

  const { phaseIds, triggersPhaseChangeId, triggersTransformation, ...data } =
    parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(activityTemplates)
        .values({
          ...data,
          triggersPhaseChangeId: triggersPhaseChangeId || null,
          triggersTransformation: triggersTransformation ?? false,
        })
        .returning({ id: activityTemplates.id });

      // Insert phase associations
      if (phaseIds && phaseIds.length > 0) {
        await tx.insert(activityTemplatePhases).values(
          phaseIds.map((phaseId) => ({
            templateId: row.id,
            phaseId,
          })),
        );
      }

      return row;
    });

    return { success: true, data: { id: result.id } };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("unique")
    ) {
      return {
        success: false,
        error: `Ya existe un template con el codigo "${data.code}".`,
      };
    }
    throw err;
  }
}

export async function updateTemplate(
  input: unknown,
): Promise<ActionResult> {
  await requireAuth(["manager", "admin"]);

  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: msg };
  }

  const {
    id,
    phaseIds,
    triggersPhaseChangeId,
    triggersTransformation,
    ...data
  } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(activityTemplates)
        .set({
          ...data,
          triggersPhaseChangeId: triggersPhaseChangeId || null,
          triggersTransformation: triggersTransformation ?? false,
        })
        .where(eq(activityTemplates.id, id));

      // Replace phase associations
      await tx
        .delete(activityTemplatePhases)
        .where(eq(activityTemplatePhases.templateId, id));

      if (phaseIds && phaseIds.length > 0) {
        await tx.insert(activityTemplatePhases).values(
          phaseIds.map((phaseId) => ({
            templateId: id,
            phaseId,
          })),
        );
      }
    });

    return { success: true };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("unique")
    ) {
      return {
        success: false,
        error: `Ya existe un template con el codigo "${data.code}".`,
      };
    }
    throw err;
  }
}

export async function setTemplateResources(
  input: unknown,
): Promise<ActionResult> {
  await requireAuth(["manager", "admin"]);

  const parsed = setTemplateResourcesSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: msg };
  }

  const { templateId, resources } = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .delete(activityTemplateResources)
      .where(eq(activityTemplateResources.templateId, templateId));

    if (resources.length > 0) {
      await tx.insert(activityTemplateResources).values(
        resources.map((r) => ({
          templateId,
          productId: r.productId,
          quantity: String(r.quantity),
          quantityBasis: r.quantityBasis as "fixed" | "per_plant" | "per_m2" | "per_zone" | "per_L_solution",
          isOptional: r.isOptional,
          sortOrder: r.sortOrder,
          notes: r.notes || null,
        })),
      );
    }
  });

  return { success: true };
}

export async function setTemplateChecklist(
  input: unknown,
): Promise<ActionResult> {
  await requireAuth(["manager", "admin"]);

  const parsed = setTemplateChecklistSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: msg };
  }

  const { templateId, items } = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .delete(activityTemplateChecklist)
      .where(eq(activityTemplateChecklist.templateId, templateId));

    if (items.length > 0) {
      await tx.insert(activityTemplateChecklist).values(
        items.map((item) => ({
          templateId,
          stepOrder: item.stepOrder,
          instruction: item.instruction,
          isCritical: item.isCritical,
          requiresPhoto: item.requiresPhoto,
          expectedValue: item.expectedValue || null,
          tolerance: item.tolerance || null,
        })),
      );
    }
  });

  return { success: true };
}
