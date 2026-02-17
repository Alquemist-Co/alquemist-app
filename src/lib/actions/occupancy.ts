"use server";

import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────

export type OccupancyZone = {
  zoneId: string;
  zoneName: string;
  batches: OccupancyBatch[];
};

export type OccupancyBatch = {
  id: string;
  code: string;
  cultivarName: string;
  phaseName: string;
  startDate: string;
  endDate: string | null;
  plantCount: number;
};

export type AvailabilityItem = {
  zoneId: string;
  zoneName: string;
  areaM2: number;
  plantCapacity: number;
  nextAvailable: string | null;
  daysUntilFree: number | null;
  isAvailable: boolean;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getOccupancyData(
  facilityId: string,
): Promise<OccupancyZone[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      z.id AS zone_id,
      z.name AS zone_name,
      b.id AS batch_id,
      b.code,
      b.plant_count,
      b.created_at AS start_date,
      cv.name AS cultivar_name,
      pp.name AS phase_name,
      CASE
        WHEN b.status = 'completed' THEN b.updated_at
        ELSE NULL
      END AS end_date
    FROM zones z
    LEFT JOIN batches b ON b.zone_id = z.id AND b.status IN ('active', 'completed')
    LEFT JOIN cultivars cv ON b.cultivar_id = cv.id
    LEFT JOIN production_phases pp ON b.current_phase_id = pp.id
    WHERE z.facility_id = ${facilityId}
    ORDER BY z.name, b.created_at
  `);

  const zoneMap = new Map<string, OccupancyZone>();

  for (const row of rows as unknown as {
    zone_id: string;
    zone_name: string;
    batch_id: string | null;
    code: string | null;
    plant_count: number | null;
    start_date: string | null;
    cultivar_name: string | null;
    phase_name: string | null;
    end_date: string | null;
  }[]) {
    if (!zoneMap.has(row.zone_id)) {
      zoneMap.set(row.zone_id, {
        zoneId: row.zone_id,
        zoneName: row.zone_name,
        batches: [],
      });
    }

    if (row.batch_id && row.code && row.start_date) {
      zoneMap.get(row.zone_id)!.batches.push({
        id: row.batch_id,
        code: row.code,
        cultivarName: row.cultivar_name ?? "—",
        phaseName: row.phase_name ?? "—",
        startDate: row.start_date,
        endDate: row.end_date,
        plantCount: row.plant_count ?? 0,
      });
    }
  }

  return Array.from(zoneMap.values());
}

export async function getAvailabilityProjection(
  facilityId: string,
): Promise<AvailabilityItem[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      z.id AS zone_id,
      z.name AS zone_name,
      z.area_m2,
      z.plant_capacity,
      (
        SELECT MAX(b.created_at)
        FROM batches b
        WHERE b.zone_id = z.id AND b.status = 'active'
      ) AS latest_batch_start,
      (
        SELECT COUNT(*)
        FROM batches b
        WHERE b.zone_id = z.id AND b.status = 'active'
      ) AS active_batch_count
    FROM zones z
    WHERE z.facility_id = ${facilityId} AND z.status = 'active'
    ORDER BY z.name
  `);

  const today = new Date();

  return (rows as unknown as {
    zone_id: string;
    zone_name: string;
    area_m2: string;
    plant_capacity: number;
    latest_batch_start: string | null;
    active_batch_count: string;
  }[]).map((r) => {
    const activeBatches = parseInt(r.active_batch_count);
    const isAvailable = activeBatches === 0;

    return {
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      areaM2: parseFloat(r.area_m2),
      plantCapacity: r.plant_capacity,
      nextAvailable: isAvailable ? today.toISOString() : null,
      daysUntilFree: isAvailable ? 0 : null,
      isAvailable,
    };
  });
}
