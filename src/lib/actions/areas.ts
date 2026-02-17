"use server";

import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────

export type FacilityItem = {
  id: string;
  name: string;
  type: string;
  totalFootprintM2: number;
  totalPlantCapacity: number;
  isActive: boolean;
};

export type ZoneWithStats = {
  id: string;
  name: string;
  purpose: string;
  environment: string;
  areaM2: number;
  plantCapacity: number;
  status: string;
  batchCount: number;
  activePlants: number;
  occupancyPct: number;
};

export type FacilityStats = {
  totalArea: number;
  totalCapacity: number;
  activePlants: number;
  occupancyPct: number;
  zoneCount: number;
};

export type ZoneDetail = {
  id: string;
  name: string;
  purpose: string;
  environment: string;
  areaM2: number;
  heightM: number | null;
  plantCapacity: number;
  status: string;
  facilityName: string;
  climateConfig: Record<string, unknown> | null;
  structureCount: number;
  batchCount: number;
};

export type ZoneBatch = {
  id: string;
  code: string;
  cultivarName: string;
  phaseName: string;
  plantCount: number;
  status: string;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getFacilityNameById(
  id: string | null,
): Promise<string | null> {
  if (!id) return null;
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT name FROM facilities WHERE id = ${id} LIMIT 1
  `);

  const row = (rows as unknown as { name: string }[])[0];
  return row?.name ?? null;
}


export async function getFacilities(): Promise<FacilityItem[]> {
  const claims = await requireAuth();

  const rows = await db.execute(sql`
    SELECT id, name, type, total_footprint_m2, total_plant_capacity, is_active
    FROM facilities
    WHERE company_id = ${claims.companyId}
    ORDER BY name
  `);

  return (rows as unknown as {
    id: string;
    name: string;
    type: string;
    total_footprint_m2: string;
    total_plant_capacity: number;
    is_active: boolean;
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    totalFootprintM2: parseFloat(r.total_footprint_m2),
    totalPlantCapacity: r.total_plant_capacity,
    isActive: r.is_active,
  }));
}

export async function getZonesWithStats(facilityId: string): Promise<ZoneWithStats[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      z.id,
      z.name,
      z.purpose,
      z.environment,
      z.area_m2,
      z.plant_capacity,
      z.status,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active') AS batch_count,
      COALESCE(SUM(b.plant_count) FILTER (WHERE b.status = 'active'), 0) AS active_plants
    FROM zones z
    LEFT JOIN batches b ON b.zone_id = z.id
    WHERE z.facility_id = ${facilityId}
    GROUP BY z.id
    ORDER BY z.name
  `);

  return (rows as unknown as {
    id: string;
    name: string;
    purpose: string;
    environment: string;
    area_m2: string;
    plant_capacity: number;
    status: string;
    batch_count: string;
    active_plants: string;
  }[]).map((r) => {
    const activePlants = parseInt(r.active_plants);
    const capacity = r.plant_capacity;
    return {
      id: r.id,
      name: r.name,
      purpose: r.purpose,
      environment: r.environment,
      areaM2: parseFloat(r.area_m2),
      plantCapacity: capacity,
      status: r.status,
      batchCount: parseInt(r.batch_count),
      activePlants,
      occupancyPct: capacity > 0 ? Math.round((activePlants / capacity) * 100) : 0,
    };
  });
}

export async function getFacilityStats(facilityId: string): Promise<FacilityStats> {
  await requireAuth();

  const [row] = await db.execute(sql`
    SELECT
      COALESCE(SUM(z.area_m2::numeric), 0) AS total_area,
      COALESCE(SUM(z.plant_capacity), 0) AS total_capacity,
      COALESCE(SUM(b_agg.active_plants), 0) AS active_plants,
      COUNT(z.id) AS zone_count
    FROM zones z
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(b.plant_count), 0) AS active_plants
      FROM batches b
      WHERE b.zone_id = z.id AND b.status = 'active'
    ) b_agg ON true
    WHERE z.facility_id = ${facilityId} AND z.status = 'active'
  `) as unknown as {
    total_area: string;
    total_capacity: string;
    active_plants: string;
    zone_count: string;
  }[];

  const totalCapacity = parseInt(row.total_capacity);
  const activePlants = parseInt(row.active_plants);

  return {
    totalArea: parseFloat(row.total_area),
    totalCapacity,
    activePlants,
    occupancyPct: totalCapacity > 0 ? Math.round((activePlants / totalCapacity) * 100) : 0,
    zoneCount: parseInt(row.zone_count),
  };
}

export async function getZoneDetail(zoneId: string): Promise<ZoneDetail | null> {
  await requireAuth();

  const [row] = await db.execute(sql`
    SELECT
      z.id, z.name, z.purpose, z.environment, z.area_m2, z.height_m,
      z.plant_capacity, z.status, z.climate_config,
      f.name AS facility_name,
      (SELECT COUNT(*) FROM zone_structures WHERE zone_id = z.id) AS structure_count,
      (SELECT COUNT(*) FROM batches WHERE zone_id = z.id AND status = 'active') AS batch_count
    FROM zones z
    INNER JOIN facilities f ON z.facility_id = f.id
    WHERE z.id = ${zoneId}
  `) as unknown as {
    id: string;
    name: string;
    purpose: string;
    environment: string;
    area_m2: string;
    height_m: string | null;
    plant_capacity: number;
    status: string;
    climate_config: Record<string, unknown> | null;
    facility_name: string;
    structure_count: string;
    batch_count: string;
  }[];

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    environment: row.environment,
    areaM2: parseFloat(row.area_m2),
    heightM: row.height_m ? parseFloat(row.height_m) : null,
    plantCapacity: row.plant_capacity,
    status: row.status,
    facilityName: row.facility_name,
    climateConfig: row.climate_config,
    structureCount: parseInt(row.structure_count),
    batchCount: parseInt(row.batch_count),
  };
}

export async function getZoneBatches(zoneId: string): Promise<ZoneBatch[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      b.id, b.code, b.plant_count, b.status,
      cv.name AS cultivar_name,
      pp.name AS phase_name
    FROM batches b
    INNER JOIN cultivars cv ON b.cultivar_id = cv.id
    LEFT JOIN production_phases pp ON b.current_phase_id = pp.id
    WHERE b.zone_id = ${zoneId} AND b.status = 'active'
    ORDER BY b.created_at DESC
  `);

  return (rows as unknown as {
    id: string;
    code: string;
    plant_count: number;
    status: string;
    cultivar_name: string;
    phase_name: string | null;
  }[]).map((r) => ({
    id: r.id,
    code: r.code,
    cultivarName: r.cultivar_name,
    phaseName: r.phase_name ?? "—",
    plantCount: r.plant_count,
    status: r.status,
  }));
}
