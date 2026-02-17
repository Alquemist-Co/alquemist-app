"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { splitBatchSchema, mergeBatchesSchema } from "@/lib/schemas/batch-split";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type SplitContext = {
  batchCode: string;
  batchId: string;
  plantCount: number;
  status: string;
  currentPhaseName: string;
  existingChildCount: number;
  zones: { id: string; name: string }[];
};

export type MergeCandidate = {
  id: string;
  code: string;
  plantCount: number;
  status: string;
  currentPhaseName: string;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getSplitContext(batchId: string): Promise<SplitContext | null> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const rows = await db.execute(sql`
    SELECT
      b.id as "batchId",
      b.code as "batchCode",
      b.plant_count as "plantCount",
      b.status,
      pp.name as "currentPhaseName",
      (SELECT count(*)::int FROM batch_lineage bl
       WHERE bl.parent_batch_id = b.id AND bl.operation = 'split') as "existingChildCount"
    FROM batches b
    INNER JOIN production_phases pp ON pp.id = b.current_phase_id
    WHERE b.id = ${batchId}
    LIMIT 1
  `);

  const batch = (rows as unknown as Record<string, unknown>[])[0];
  if (!batch) return null;

  const zoneRows = await db.execute(sql`
    SELECT id, name FROM zones WHERE status = 'active' ORDER BY name
  `);

  return {
    ...batch,
    zones: zoneRows as unknown as { id: string; name: string }[],
  } as SplitContext;
}

export async function getMergeContext(batchId: string): Promise<MergeCandidate[]> {
  await requireAuth(["supervisor", "manager", "admin"]);

  // Find siblings: same parent, same phase, active, excluding self
  const rows = await db.execute(sql`
    SELECT
      b.id,
      b.code,
      b.plant_count as "plantCount",
      b.status,
      pp.name as "currentPhaseName"
    FROM batches b
    INNER JOIN production_phases pp ON pp.id = b.current_phase_id
    WHERE b.parent_batch_id = (SELECT parent_batch_id FROM batches WHERE id = ${batchId})
      AND b.id != ${batchId}
      AND b.status = 'active'
      AND b.current_phase_id = (SELECT current_phase_id FROM batches WHERE id = ${batchId})
    ORDER BY b.code
  `);

  return rows as unknown as MergeCandidate[];
}

// ── Code derivation ──────────────────────────────────────────────

function deriveChildCode(parentCode: string, existingChildCount: number): string {
  // LOT-001 → LOT-001-A, LOT-001-B, ...
  // LOT-001-A → LOT-001-A-1, LOT-001-A-2, ...
  const isAlpha = /[A-Z]$/.test(parentCode);
  if (isAlpha) {
    return `${parentCode}-${existingChildCount + 1}`;
  }
  const letter = String.fromCharCode(65 + existingChildCount); // A, B, C...
  return `${parentCode}-${letter}`;
}

// ── Mutations ─────────────────────────────────────────────────────

export async function splitBatch(input: unknown): Promise<ActionResult<{ childBatchId: string; childCode: string }>> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = splitBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { batchId, splitCount, zoneId, reason } = parsed.data;

  return db.transaction(async (tx) => {
    // Lock and verify parent batch
    const [parent] = await tx.execute(sql`
      SELECT id, code, plant_count, status, cultivar_id, current_phase_id,
             production_order_id, start_date, expected_end_date, schedule_id
      FROM batches WHERE id = ${batchId} FOR UPDATE
    `);
    const p = parent as unknown as {
      id: string; code: string; plant_count: number; status: string;
      cultivar_id: string; current_phase_id: string; production_order_id: string | null;
      start_date: string; expected_end_date: string | null; schedule_id: string | null;
    };

    if (!p || (p.status !== "active" && p.status !== "phase_transition")) {
      return { success: false as const, error: "Batch no se puede dividir en su estado actual" };
    }
    if (splitCount >= p.plant_count) {
      return { success: false as const, error: "Cantidad a dividir debe ser menor al total de plantas" };
    }

    // Count existing children for code derivation
    const [countRow] = await tx.execute(sql`
      SELECT count(*)::int as cnt FROM batch_lineage
      WHERE parent_batch_id = ${batchId} AND operation = 'split'
    `);
    const existingCount = (countRow as unknown as { cnt: number }).cnt;

    const childCode = deriveChildCode(p.code, existingCount);

    // Create child batch
    const [child] = await tx.execute(sql`
      INSERT INTO batches (code, cultivar_id, zone_id, plant_count, current_phase_id,
        production_order_id, parent_batch_id, start_date, expected_end_date, schedule_id,
        status, created_by, updated_by)
      VALUES (${childCode}, ${p.cultivar_id}, ${zoneId}, ${splitCount}, ${p.current_phase_id},
        ${p.production_order_id}, ${batchId}, ${p.start_date}, ${p.expected_end_date}, ${p.schedule_id},
        ${p.status}, ${claims.userId}, ${claims.userId})
      RETURNING id
    `);
    const childId = (child as unknown as { id: string }).id;

    // Update parent plant count
    await tx.execute(sql`
      UPDATE batches SET plant_count = plant_count - ${splitCount}, updated_by = ${claims.userId}
      WHERE id = ${batchId}
    `);

    // Get a unit for the lineage record (plant count unit)
    const [unitRow] = await tx.execute(sql`
      SELECT id FROM units_of_measure WHERE code = 'und' OR code = 'u' LIMIT 1
    `);
    const unitId = unitRow ? (unitRow as unknown as { id: string }).id : null;

    // If no unit found, get any unit
    let lineageUnitId = unitId;
    if (!lineageUnitId) {
      const [anyUnit] = await tx.execute(sql`SELECT id FROM units_of_measure LIMIT 1`);
      lineageUnitId = anyUnit ? (anyUnit as unknown as { id: string }).id : null;
    }

    if (!lineageUnitId) {
      return { success: false as const, error: "No se encontro unidad de medida" };
    }

    // Insert lineage record
    await tx.execute(sql`
      INSERT INTO batch_lineage (operation, parent_batch_id, child_batch_id,
        quantity_transferred, unit_id, reason, performed_by)
      VALUES ('split', ${batchId}, ${childId}, ${splitCount.toString()},
        ${lineageUnitId}, ${reason}, ${claims.userId})
    `);

    revalidatePath("/batches");
    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: { childBatchId: childId, childCode } };
  });
}

export async function mergeBatches(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = mergeBatchesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { targetBatchId, sourceBatchIds, reason } = parsed.data;

  return db.transaction(async (tx) => {
    // Lock target
    const [target] = await tx.execute(sql`
      SELECT id, current_phase_id, parent_batch_id FROM batches WHERE id = ${targetBatchId} FOR UPDATE
    `);
    const t = target as unknown as { id: string; current_phase_id: string; parent_batch_id: string | null };
    if (!t) return { success: false as const, error: "Batch destino no encontrado" };

    // Get a unit for lineage
    const [unitRow] = await tx.execute(sql`
      SELECT id FROM units_of_measure WHERE code = 'und' OR code = 'u' LIMIT 1
    `);
    let lineageUnitId = unitRow ? (unitRow as unknown as { id: string }).id : null;
    if (!lineageUnitId) {
      const [anyUnit] = await tx.execute(sql`SELECT id FROM units_of_measure LIMIT 1`);
      lineageUnitId = anyUnit ? (anyUnit as unknown as { id: string }).id : null;
    }
    if (!lineageUnitId) return { success: false as const, error: "No se encontro unidad de medida" };

    for (const sourceId of sourceBatchIds) {
      const [source] = await tx.execute(sql`
        SELECT id, plant_count, current_phase_id, parent_batch_id FROM batches WHERE id = ${sourceId} FOR UPDATE
      `);
      const s = source as unknown as { id: string; plant_count: number; current_phase_id: string; parent_batch_id: string | null };

      if (!s) continue;
      if (s.current_phase_id !== t.current_phase_id) {
        return { success: false as const, error: `Batch ${sourceId} no esta en la misma fase` };
      }

      // Transfer plants
      await tx.execute(sql`
        UPDATE batches SET plant_count = plant_count + ${s.plant_count}, updated_by = ${claims.userId}
        WHERE id = ${targetBatchId}
      `);

      // Mark source as completed
      await tx.execute(sql`
        UPDATE batches SET status = 'completed', plant_count = 0, updated_by = ${claims.userId}
        WHERE id = ${sourceId}
      `);

      // Insert lineage
      await tx.execute(sql`
        INSERT INTO batch_lineage (operation, parent_batch_id, child_batch_id,
          quantity_transferred, unit_id, reason, performed_by)
        VALUES ('merge', ${sourceId}, ${targetBatchId}, ${s.plant_count.toString()},
          ${lineageUnitId}, ${reason}, ${claims.userId})
      `);
    }

    revalidatePath("/batches");
    revalidatePath(`/batches/${targetBatchId}`);
    return { success: true as const };
  });
}
