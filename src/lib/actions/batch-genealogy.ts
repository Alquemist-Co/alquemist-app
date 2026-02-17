"use server";

import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────

export type GenealogyNode = {
  id: string;
  code: string;
  plantCount: number;
  status: string;
  currentPhaseName: string;
  parentBatchId: string | null;
  depth: number;
};

export type GenealogyTree = {
  nodes: GenealogyNode[];
  currentBatchId: string;
};

export type LineageOperation = {
  id: string;
  operation: string;
  parentBatchId: string;
  parentCode: string;
  childBatchId: string;
  childCode: string;
  quantity: string;
  unitCode: string;
  reason: string;
  performedByName: string;
  performedAt: string;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getGenealogyTree(batchId: string): Promise<GenealogyTree> {
  await requireAuth();

  // Recursive CTE: navigate up to root, then down to all descendants
  const rows = await db.execute(sql`
    WITH RECURSIVE
    -- Find root by going up
    ancestors AS (
      SELECT id, code, plant_count, status, current_phase_id, parent_batch_id, 0 as depth
      FROM batches WHERE id = ${batchId}
      UNION ALL
      SELECT b.id, b.code, b.plant_count, b.status, b.current_phase_id, b.parent_batch_id, a.depth - 1
      FROM batches b
      INNER JOIN ancestors a ON b.id = a.parent_batch_id
    ),
    root AS (
      SELECT id FROM ancestors ORDER BY depth ASC LIMIT 1
    ),
    -- Build tree from root down
    tree AS (
      SELECT b.id, b.code, b.plant_count, b.status, b.current_phase_id, b.parent_batch_id, 0 as depth
      FROM batches b WHERE b.id = (SELECT id FROM root)
      UNION ALL
      SELECT b.id, b.code, b.plant_count, b.status, b.current_phase_id, b.parent_batch_id, t.depth + 1
      FROM batches b
      INNER JOIN tree t ON b.parent_batch_id = t.id
    )
    SELECT
      t.id,
      t.code,
      t.plant_count as "plantCount",
      t.status,
      pp.name as "currentPhaseName",
      t.parent_batch_id as "parentBatchId",
      t.depth
    FROM tree t
    INNER JOIN production_phases pp ON pp.id = t.current_phase_id
    ORDER BY t.depth, t.code
  `);

  return {
    nodes: rows as unknown as GenealogyNode[],
    currentBatchId: batchId,
  };
}

export async function getLineageOperations(batchId: string): Promise<LineageOperation[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      bl.id,
      bl.operation,
      bl.parent_batch_id as "parentBatchId",
      pb.code as "parentCode",
      bl.child_batch_id as "childBatchId",
      cb.code as "childCode",
      bl.quantity_transferred as quantity,
      u.code as "unitCode",
      bl.reason,
      usr.full_name as "performedByName",
      bl.performed_at as "performedAt"
    FROM batch_lineage bl
    INNER JOIN batches pb ON pb.id = bl.parent_batch_id
    INNER JOIN batches cb ON cb.id = bl.child_batch_id
    INNER JOIN units_of_measure u ON u.id = bl.unit_id
    INNER JOIN users usr ON usr.id = bl.performed_by
    WHERE bl.parent_batch_id = ${batchId} OR bl.child_batch_id = ${batchId}
    ORDER BY bl.performed_at DESC
  `);

  return rows as unknown as LineageOperation[];
}
