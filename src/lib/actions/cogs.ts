"use server";

import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────

export type COGSBreakdown = {
  directMaterials: number;
  labor: number;
  overhead: number;
  total: number;
  perPlant: number | null;
  plantCount: number;
  phaseBreakdown: { phase: string; materials: number; labor: number }[];
};

export type BatchCostComparison = {
  batchId: string;
  batchCode: string;
  totalCOGS: number;
  perPlant: number | null;
  plantCount: number;
};

// ── Queries ───────────────────────────────────────────────────────

export async function calculateBatchCOGS(batchId: string): Promise<COGSBreakdown> {
  await requireAuth(["supervisor", "manager", "admin", "viewer"]);

  // Direct materials: cost from inventory transactions
  const [materials] = await db.execute(sql`
    SELECT COALESCE(SUM(ABS(it.cost::numeric)), 0) AS total_materials
    FROM inventory_transactions it
    WHERE it.batch_id = ${batchId}
      AND it.type IN ('consumption', 'application')
  `) as unknown as { total_materials: string }[];

  // Labor: sum of activity durations * estimated rate
  // Since we don't have hourly rates in the schema, use activity count * fixed rate estimate
  const [laborData] = await db.execute(sql`
    SELECT
      COALESCE(SUM(EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) / 3600), 0) AS total_hours
    FROM activities a
    WHERE a.batch_id = ${batchId}
      AND a.status = 'completed'
  `) as unknown as { total_hours: string }[];

  const laborHours = parseFloat(laborData.total_hours);
  const LABOR_RATE = 15; // Default hourly rate in USD
  const laborCost = laborHours * LABOR_RATE;

  // Overhead: allocated from overhead_costs
  const [overheadData] = await db.execute(sql`
    SELECT
      COALESCE(SUM(
        oc.amount::numeric / GREATEST(
          (SELECT COUNT(*) FROM batches b2
           WHERE b2.zone_id IN (SELECT z.id FROM zones z WHERE z.facility_id = oc.facility_id)
           AND b2.status IN ('active', 'completed')
           AND b2.created_at >= oc.period_start::date
           AND b2.created_at <= oc.period_end::date
          ), 1
        )
      ), 0) AS total_overhead
    FROM overhead_costs oc
    INNER JOIN zones z ON z.facility_id = oc.facility_id
    INNER JOIN batches b ON b.zone_id = z.id AND b.id = ${batchId}
    WHERE oc.period_start::date <= b.created_at
      AND oc.period_end::date >= b.created_at
  `) as unknown as { total_overhead: string }[];

  const directMaterials = parseFloat(materials.total_materials);
  const overhead = parseFloat(overheadData.total_overhead);
  const total = directMaterials + laborCost + overhead;

  // Get plant count
  const [batch] = await db.execute(sql`
    SELECT plant_count FROM batches WHERE id = ${batchId}
  `) as unknown as { plant_count: number }[];

  const plantCount = batch?.plant_count ?? 0;
  const perPlant = plantCount > 0 ? Math.round((total / plantCount) * 100) / 100 : null;

  // Phase breakdown
  const phaseRows = await db.execute(sql`
    SELECT
      pp.name AS phase,
      COALESCE(SUM(ABS(it.cost::numeric)), 0) AS materials,
      COALESCE(SUM(EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) / 3600) * ${LABOR_RATE}, 0) AS labor
    FROM production_phases pp
    LEFT JOIN activities a ON a.batch_id = ${batchId} AND a.phase_id = pp.id AND a.status = 'completed'
    LEFT JOIN inventory_transactions it ON it.batch_id = ${batchId} AND it.reference_id = a.id
    INNER JOIN batches b ON b.id = ${batchId}
    INNER JOIN cultivation_schedules cs ON cs.batch_id = b.id
    WHERE pp.crop_type_id = (SELECT cultivar_id FROM batches WHERE id = ${batchId})
    GROUP BY pp.name, pp.sort_order
    ORDER BY pp.sort_order
  `);

  const phaseBreakdown = (phaseRows as unknown as {
    phase: string;
    materials: string;
    labor: string;
  }[]).map((r) => ({
    phase: r.phase,
    materials: parseFloat(r.materials),
    labor: parseFloat(r.labor),
  }));

  return {
    directMaterials,
    labor: laborCost,
    overhead,
    total,
    perPlant,
    plantCount,
    phaseBreakdown,
  };
}

export async function getBatchCostComparison(
  cultivarId: string,
): Promise<{ batches: BatchCostComparison[]; avgCOGS: number; stdDev: number }> {
  await requireAuth(["supervisor", "manager", "admin", "viewer"]);

  const rows = await db.execute(sql`
    SELECT
      b.id, b.code, b.plant_count,
      COALESCE(SUM(ABS(it.cost::numeric)), 0) AS materials
    FROM batches b
    LEFT JOIN inventory_transactions it ON it.batch_id = b.id AND it.type IN ('consumption', 'application')
    WHERE b.cultivar_id = ${cultivarId}
      AND b.status IN ('completed', 'active')
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT 10
  `);

  const batches = (rows as unknown as {
    id: string;
    code: string;
    plant_count: number;
    materials: string;
  }[]).map((r) => ({
    batchId: r.id,
    batchCode: r.code,
    totalCOGS: parseFloat(r.materials),
    perPlant: r.plant_count > 0 ? parseFloat(r.materials) / r.plant_count : null,
    plantCount: r.plant_count,
  }));

  const costs = batches.map((b) => b.totalCOGS);
  const avg = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
  const variance = costs.length > 1
    ? costs.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / (costs.length - 1)
    : 0;

  return {
    batches,
    avgCOGS: Math.round(avg * 100) / 100,
    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}
