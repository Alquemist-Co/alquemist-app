"use server";

import { eq, asc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  scheduledActivities,
  productionPhases,
} from "@/lib/db/schema";
import type { FacilityItem } from "@/lib/actions/areas";
import type { ZoneWithStats } from "@/lib/actions/areas";
import type { ZoneCondition, ZoneReading } from "@/lib/actions/environmental";
import type { TodayActivityItem } from "@/lib/actions/scheduled-activities";

// ── Types ─────────────────────────────────────────────────────────

export type OperatorSummary = {
  id: string;
  fullName: string;
  lastLoginAt: string | null;
  isOnline: boolean;
};

export type ZoneAlertCount = {
  entityId: string;
  maxSeverity: string;
  count: number;
};

export type SupervisorDashboardData = {
  facilities: FacilityItem[];
  zones: ZoneWithStats[];
  conditions: ZoneCondition[];
  activities: TodayActivityItem[];
  operators: OperatorSummary[];
  alertCountsByZone: ZoneAlertCount[];
  activeBatchCount: number;
  alertCount: number;
};

// ── Queries ───────────────────────────────────────────────────────

async function getFacilitiesInternal(
  companyId: string,
): Promise<FacilityItem[]> {
  const rows = await db.execute(sql`
    SELECT id, name, type, total_footprint_m2, total_plant_capacity, is_active
    FROM facilities
    WHERE company_id = ${companyId}
    ORDER BY name
  `);

  return (
    rows as unknown as {
      id: string;
      name: string;
      type: string;
      total_footprint_m2: string;
      total_plant_capacity: number;
      is_active: boolean;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    totalFootprintM2: parseFloat(r.total_footprint_m2),
    totalPlantCapacity: r.total_plant_capacity,
    isActive: r.is_active,
  }));
}

async function getZonesInternal(
  companyId: string,
  facilityId?: string,
): Promise<ZoneWithStats[]> {
  const facilityFilter = facilityId
    ? sql`AND z.facility_id = ${facilityId}`
    : sql``;

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
    INNER JOIN facilities f ON z.facility_id = f.id
    LEFT JOIN batches b ON b.zone_id = z.id
    WHERE f.company_id = ${companyId}
      AND z.status = 'active'
      ${facilityFilter}
    GROUP BY z.id
    ORDER BY z.name
  `);

  return (
    rows as unknown as {
      id: string;
      name: string;
      purpose: string;
      environment: string;
      area_m2: string;
      plant_capacity: number;
      status: string;
      batch_count: string;
      active_plants: string;
    }[]
  ).map((r) => {
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
      occupancyPct:
        capacity > 0 ? Math.round((activePlants / capacity) * 100) : 0,
    };
  });
}

async function getConditionsInternal(
  companyId: string,
): Promise<ZoneCondition[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (z.id, er.parameter)
      z.id AS zone_id,
      z.name AS zone_name,
      f.name AS facility_name,
      er.parameter,
      er.value,
      er.unit,
      er.timestamp
    FROM zones z
    INNER JOIN facilities f ON z.facility_id = f.id
    INNER JOIN sensors s ON s.zone_id = z.id AND s.is_active = true
    INNER JOIN environmental_readings er ON er.zone_id = z.id
    WHERE f.company_id = ${companyId}
      AND z.status = 'active'
    ORDER BY z.id, er.parameter, er.timestamp DESC
  `);

  const zoneMap = new Map<string, ZoneCondition>();

  for (const row of rows as unknown as {
    zone_id: string;
    zone_name: string;
    facility_name: string;
    parameter: string;
    value: string;
    unit: string;
    timestamp: string;
  }[]) {
    if (!zoneMap.has(row.zone_id)) {
      zoneMap.set(row.zone_id, {
        zoneId: row.zone_id,
        zoneName: row.zone_name,
        facilityName: row.facility_name,
        readings: [],
        lastUpdated: null,
      });
    }

    const zone = zoneMap.get(row.zone_id)!;
    zone.readings.push({
      parameter: row.parameter,
      value: parseFloat(row.value),
      unit: row.unit,
      timestamp: row.timestamp,
    } satisfies ZoneReading);

    if (!zone.lastUpdated || row.timestamp > zone.lastUpdated) {
      zone.lastUpdated = row.timestamp;
    }
  }

  return Array.from(zoneMap.values());
}

async function getActivitiesInternal(
  facilityId?: string,
): Promise<TodayActivityItem[]> {
  const today = new Date().toISOString().split("T")[0];

  const facilityFilter = facilityId
    ? sql`AND z.facility_id = ${facilityId}`
    : sql``;

  const rows = await db
    .select({
      id: scheduledActivities.id,
      templateName: sql<string>`at.name`,
      templateCode: sql<string>`at.code`,
      activityTypeName: sql<string>`atype.name`,
      batchCode: sql<string>`b.code`,
      batchId: sql<string>`b.id`,
      zoneName: sql<string>`z.name`,
      phaseName: productionPhases.name,
      plannedDate: scheduledActivities.plannedDate,
      cropDay: scheduledActivities.cropDay,
      status: scheduledActivities.status,
      estimatedDurationMin: sql<number>`at.estimated_duration_min`,
    })
    .from(scheduledActivities)
    .innerJoin(
      sql`activity_templates at`,
      sql`at.id = ${scheduledActivities.templateId}`,
    )
    .innerJoin(
      sql`activity_types atype`,
      sql`atype.id = at.activity_type_id`,
    )
    .innerJoin(sql`batches b`, sql`b.id = ${scheduledActivities.batchId}`)
    .innerJoin(sql`zones z`, sql`z.id = b.zone_id`)
    .innerJoin(
      productionPhases,
      eq(scheduledActivities.phaseId, productionPhases.id),
    )
    .where(
      sql`(${scheduledActivities.plannedDate} = ${today} OR (${scheduledActivities.status} = 'overdue'))
        AND ${scheduledActivities.status} != 'skipped'
        ${facilityFilter}`,
    )
    .orderBy(
      sql`CASE ${scheduledActivities.status} WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 END`,
      asc(scheduledActivities.plannedDate),
    );

  return rows;
}

export async function getOperators(
  facilityId?: string,
): Promise<OperatorSummary[]> {
  const claims = await requireAuth();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const facilityFilter = facilityId
    ? sql`AND assigned_facility_id = ${facilityId}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT id, full_name, last_login_at
    FROM users
    WHERE company_id = ${claims.companyId}
      AND role = 'operator'
      AND is_active = true
      ${facilityFilter}
    ORDER BY full_name
  `);

  return (
    rows as unknown as {
      id: string;
      full_name: string;
      last_login_at: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    lastLoginAt: r.last_login_at,
    isOnline: r.last_login_at != null && r.last_login_at > twoHoursAgo,
  }));
}

async function getZoneAlertCounts(
  companyId: string,
): Promise<ZoneAlertCount[]> {
  const rows = await db.execute(sql`
    SELECT
      entity_id,
      MAX(severity) AS max_severity,
      COUNT(*)::int AS count
    FROM alerts
    WHERE company_id = ${companyId}
      AND entity_type IN ('zone', 'batch')
      AND resolved_at IS NULL
    GROUP BY entity_id
  `);

  return (
    rows as unknown as {
      entity_id: string;
      max_severity: string;
      count: number;
    }[]
  ).map((r) => ({
    entityId: r.entity_id,
    maxSeverity: r.max_severity,
    count: r.count,
  }));
}

async function getActiveBatchCount(
  companyId: string,
  facilityId?: string,
): Promise<number> {
  const facilityFilter = facilityId
    ? sql`AND z.facility_id = ${facilityId}`
    : sql``;

  const [row] = (await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM batches b
    INNER JOIN zones z ON b.zone_id = z.id
    INNER JOIN facilities f ON z.facility_id = f.id
    WHERE f.company_id = ${companyId}
      AND b.status = 'active'
      ${facilityFilter}
  `)) as unknown as { count: number }[];

  return row?.count ?? 0;
}

async function getPendingAlertCount(companyId: string): Promise<number> {
  const [row] = (await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM alerts
    WHERE company_id = ${companyId}
      AND acknowledged_at IS NULL
      AND resolved_at IS NULL
  `)) as unknown as { count: number }[];

  return row?.count ?? 0;
}

export async function getSupervisorDashboardData(
  facilityId?: string,
): Promise<SupervisorDashboardData> {
  const claims = await requireAuth();

  const [
    facilities,
    zones,
    conditions,
    activities,
    operators,
    alertCountsByZone,
    activeBatchCount,
    alertCount,
  ] = await Promise.all([
    getFacilitiesInternal(claims.companyId),
    getZonesInternal(claims.companyId, facilityId),
    getConditionsInternal(claims.companyId),
    getActivitiesInternal(facilityId),
    getOperators(facilityId),
    getZoneAlertCounts(claims.companyId),
    getActiveBatchCount(claims.companyId, facilityId),
    getPendingAlertCount(claims.companyId),
  ]);

  return {
    facilities,
    zones,
    conditions,
    activities,
    operators,
    alertCountsByZone,
    activeBatchCount,
    alertCount,
  };
}
