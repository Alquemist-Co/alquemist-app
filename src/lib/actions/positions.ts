"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { plantPositions } from "@/lib/db/schema";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type PositionItem = {
  id: string;
  zoneId: string;
  structureId: string | null;
  structureName: string | null;
  levelNumber: number | null;
  positionIndex: number;
  label: string | null;
  status: string;
  batchId: string | null;
  batchCode: string | null;
  cultivarName: string | null;
};

export type PositionStats = {
  total: number;
  planted: number;
  empty: number;
  harvested: number;
  maintenance: number;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getPositions(zoneId: string): Promise<PositionItem[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      pp.id, pp.zone_id, pp.structure_id,
      zs.name AS structure_name,
      pp.level_number, pp.position_index, pp.label, pp.status,
      pp.current_batch_id AS batch_id,
      b.code AS batch_code,
      cv.name AS cultivar_name
    FROM plant_positions pp
    LEFT JOIN zone_structures zs ON pp.structure_id = zs.id
    LEFT JOIN batches b ON pp.current_batch_id = b.id
    LEFT JOIN cultivars cv ON b.cultivar_id = cv.id
    WHERE pp.zone_id = ${zoneId}
    ORDER BY zs.name NULLS LAST, pp.level_number, pp.position_index
  `);

  return (rows as unknown as {
    id: string;
    zone_id: string;
    structure_id: string | null;
    structure_name: string | null;
    level_number: number | null;
    position_index: number;
    label: string | null;
    status: string;
    batch_id: string | null;
    batch_code: string | null;
    cultivar_name: string | null;
  }[]).map((r) => ({
    id: r.id,
    zoneId: r.zone_id,
    structureId: r.structure_id,
    structureName: r.structure_name,
    levelNumber: r.level_number,
    positionIndex: r.position_index,
    label: r.label,
    status: r.status,
    batchId: r.batch_id,
    batchCode: r.batch_code,
    cultivarName: r.cultivar_name,
  }));
}

export async function getPositionStats(zoneId: string): Promise<PositionStats> {
  await requireAuth();

  const [row] = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'planted') AS planted,
      COUNT(*) FILTER (WHERE status = 'empty') AS empty,
      COUNT(*) FILTER (WHERE status = 'harvested') AS harvested,
      COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance
    FROM plant_positions
    WHERE zone_id = ${zoneId}
  `) as unknown as {
    total: string;
    planted: string;
    empty: string;
    harvested: string;
    maintenance: string;
  }[];

  return {
    total: parseInt(row.total),
    planted: parseInt(row.planted),
    empty: parseInt(row.empty),
    harvested: parseInt(row.harvested),
    maintenance: parseInt(row.maintenance),
  };
}

// ── Mutations ─────────────────────────────────────────────────────

export async function updatePositionStatus(
  positionId: string,
  status: "empty" | "planted" | "harvested" | "maintenance",
  batchId?: string,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  await db
    .update(plantPositions)
    .set({
      status,
      currentBatchId: status === "planted" && batchId ? batchId : null,
      updatedAt: new Date(),
    })
    .where(eq(plantPositions.id, positionId));

  revalidatePath("/areas");
  return { success: true };
}
