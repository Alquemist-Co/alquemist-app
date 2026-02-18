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

// ── Manager Dashboard Types ───────────────────────────────────────

export type ManagerKPIs = {
  activeOrders: number;
  activeBatches: number;
  avgYieldPct: number | null;
  cogsPerGram: number | null;
};

export type OrderProgress = {
  id: string;
  code: string;
  cultivarName: string;
  status: string;
  priority: string;
  phasesTotal: number;
  phasesCompleted: number;
  progressPct: number;
  plannedEndDate: string | null;
  daysRemaining: number | null;
};

export type CostDistribution = {
  materials: number;
  labor: number;
  overhead: number;
  total: number;
};

export type YieldComparison = {
  orderCode: string;
  cultivarName: string;
  yieldReal: number | null;
  yieldExpected: number | null;
};

export type ManagerDashboardData = {
  facilities: FacilityItem[];
  kpis: ManagerKPIs;
  orders: OrderProgress[];
  costDistribution: CostDistribution;
  yieldComparison: YieldComparison[];
};

// ── Viewer Dashboard Types ────────────────────────────────────────

export type ViewerKPIs = {
  activeOrders: number;
  activeBatches: number;
  avgYieldPct: number | null;
  qualityPassRate: number | null;
};

export type ViewerOrderStatus = {
  code: string;
  cultivarName: string;
  status: string;
  progressPct: number;
  expectedEndDate: string | null;
};

export type ViewerDashboardData = {
  facilities: FacilityItem[];
  kpis: ViewerKPIs;
  orders: ViewerOrderStatus[];
  overallYieldReal: number | null;
  overallYieldExpected: number | null;
};

// ── Manager Queries ───────────────────────────────────────────────

async function getManagerKPIs(
  companyId: string,
  facilityId?: string,
): Promise<ManagerKPIs> {
  const facilityFilter = facilityId
    ? sql`AND z.facility_id = ${facilityId}`
    : sql``;

  const [row] = (await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM production_orders po
       INNER JOIN cultivars cv ON po.cultivar_id = cv.id
       INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
       WHERE ct.company_id = ${companyId}
         AND po.status IN ('approved', 'in_progress')) AS active_orders,
      (SELECT COUNT(*)::int FROM batches b
       INNER JOIN zones z ON b.zone_id = z.id
       INNER JOIN facilities f ON z.facility_id = f.id
       WHERE f.company_id = ${companyId}
         AND b.status = 'active'
         ${facilityFilter}) AS active_batches,
      (SELECT AVG(pop.yield_pct)
       FROM production_order_phases pop
       INNER JOIN production_orders po ON pop.production_order_id = po.id
       INNER JOIN cultivars cv ON po.cultivar_id = cv.id
       INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
       WHERE ct.company_id = ${companyId}
         AND pop.yield_pct IS NOT NULL) AS avg_yield_pct
  `)) as unknown as {
    active_orders: number;
    active_batches: number;
    avg_yield_pct: string | null;
  }[];

  return {
    activeOrders: row?.active_orders ?? 0,
    activeBatches: row?.active_batches ?? 0,
    avgYieldPct: row?.avg_yield_pct ? parseFloat(row.avg_yield_pct) : null,
    cogsPerGram: null, // Would need batch-level COGS aggregation — simplified for now
  };
}

async function getOrdersProgress(
  companyId: string,
  facilityId?: string,
): Promise<OrderProgress[]> {
  const rows = await db.execute(sql`
    SELECT
      po.id,
      po.code,
      cv.name AS cultivar_name,
      po.status,
      po.priority,
      po.planned_end_date,
      COUNT(pop.id)::int AS phases_total,
      COUNT(pop.id) FILTER (WHERE pop.status = 'completed')::int AS phases_completed
    FROM production_orders po
    INNER JOIN cultivars cv ON po.cultivar_id = cv.id
    INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
    LEFT JOIN production_order_phases pop ON pop.production_order_id = po.id
    WHERE ct.company_id = ${companyId}
      AND po.status IN ('approved', 'in_progress')
    GROUP BY po.id, cv.name
    ORDER BY
      CASE po.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      po.created_at DESC
    LIMIT 10
  `);

  const today = new Date();

  return (
    rows as unknown as {
      id: string;
      code: string;
      cultivar_name: string;
      status: string;
      priority: string;
      planned_end_date: string | null;
      phases_total: number;
      phases_completed: number;
    }[]
  ).map((r) => {
    const phasesTotal = r.phases_total || 1;
    let daysRemaining: number | null = null;
    if (r.planned_end_date) {
      const end = new Date(r.planned_end_date);
      daysRemaining = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    return {
      id: r.id,
      code: r.code,
      cultivarName: r.cultivar_name,
      status: r.status,
      priority: r.priority,
      phasesTotal,
      phasesCompleted: r.phases_completed,
      progressPct: Math.round((r.phases_completed / phasesTotal) * 100),
      plannedEndDate: r.planned_end_date,
      daysRemaining,
    };
  });
}

async function getCostDistributionInternal(
  companyId: string,
): Promise<CostDistribution> {
  const [row] = (await db.execute(sql`
    SELECT
      COALESCE((
        SELECT SUM(ABS(it.cost::numeric))
        FROM inventory_transactions it
        INNER JOIN batches b ON it.batch_id = b.id
        INNER JOIN zones z ON b.zone_id = z.id
        INNER JOIN facilities f ON z.facility_id = f.id
        WHERE f.company_id = ${companyId}
          AND it.type IN ('consumption', 'application')
      ), 0) AS materials,
      COALESCE((
        SELECT SUM(EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) / 3600) * 15
        FROM activities a
        INNER JOIN batches b ON a.batch_id = b.id
        INNER JOIN zones z ON b.zone_id = z.id
        INNER JOIN facilities f ON z.facility_id = f.id
        WHERE f.company_id = ${companyId}
          AND a.completed_at IS NOT NULL
      ), 0) AS labor,
      COALESCE((
        SELECT SUM(oc.amount::numeric)
        FROM overhead_costs oc
        INNER JOIN facilities f ON oc.facility_id = f.id
        WHERE f.company_id = ${companyId}
      ), 0) AS overhead
  `)) as unknown as {
    materials: string;
    labor: string;
    overhead: string;
  }[];

  const materials = parseFloat(row?.materials ?? "0");
  const labor = parseFloat(row?.labor ?? "0");
  const overhead = parseFloat(row?.overhead ?? "0");

  return {
    materials,
    labor,
    overhead,
    total: materials + labor + overhead,
  };
}

async function getYieldComparisonInternal(
  companyId: string,
): Promise<YieldComparison[]> {
  const rows = await db.execute(sql`
    SELECT
      po.code AS order_code,
      cv.name AS cultivar_name,
      AVG(pop.yield_pct) AS yield_real,
      AVG(ppf.expected_yield_pct::numeric) AS yield_expected
    FROM production_orders po
    INNER JOIN cultivars cv ON po.cultivar_id = cv.id
    INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
    LEFT JOIN production_order_phases pop ON pop.production_order_id = po.id
    LEFT JOIN phase_product_flows ppf ON ppf.phase_id = pop.phase_id
      AND ppf.direction = 'output'
    WHERE ct.company_id = ${companyId}
      AND po.status IN ('approved', 'in_progress', 'completed')
    GROUP BY po.id, po.code, cv.name
    ORDER BY po.created_at DESC
    LIMIT 8
  `);

  return (
    rows as unknown as {
      order_code: string;
      cultivar_name: string;
      yield_real: string | null;
      yield_expected: string | null;
    }[]
  ).map((r) => ({
    orderCode: r.order_code,
    cultivarName: r.cultivar_name,
    yieldReal: r.yield_real ? parseFloat(r.yield_real) : null,
    yieldExpected: r.yield_expected ? parseFloat(r.yield_expected) : null,
  }));
}

export async function getManagerDashboardData(
  facilityId?: string,
): Promise<ManagerDashboardData> {
  const claims = await requireAuth();

  const [facilities, kpis, orders, costDistribution, yieldComparison] =
    await Promise.all([
      getFacilitiesInternal(claims.companyId),
      getManagerKPIs(claims.companyId, facilityId),
      getOrdersProgress(claims.companyId, facilityId),
      getCostDistributionInternal(claims.companyId),
      getYieldComparisonInternal(claims.companyId),
    ]);

  return { facilities, kpis, orders, costDistribution, yieldComparison };
}

// ── Viewer Queries ────────────────────────────────────────────────

async function getViewerKPIs(companyId: string): Promise<ViewerKPIs> {
  const [row] = (await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM production_orders po
       INNER JOIN cultivars cv ON po.cultivar_id = cv.id
       INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
       WHERE ct.company_id = ${companyId}
         AND po.status IN ('approved', 'in_progress')) AS active_orders,
      (SELECT COUNT(*)::int FROM batches b
       INNER JOIN zones z ON b.zone_id = z.id
       INNER JOIN facilities f ON z.facility_id = f.id
       WHERE f.company_id = ${companyId}
         AND b.status = 'active') AS active_batches,
      (SELECT AVG(pop.yield_pct)
       FROM production_order_phases pop
       INNER JOIN production_orders po ON pop.production_order_id = po.id
       INNER JOIN cultivars cv ON po.cultivar_id = cv.id
       INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
       WHERE ct.company_id = ${companyId}
         AND pop.yield_pct IS NOT NULL) AS avg_yield_pct,
      (SELECT CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE overall_pass = true)::numeric / COUNT(*) * 100, 1)
        ELSE NULL END
       FROM quality_tests qt
       INNER JOIN batches b ON qt.batch_id = b.id
       INNER JOIN zones z ON b.zone_id = z.id
       INNER JOIN facilities f ON z.facility_id = f.id
       WHERE f.company_id = ${companyId}
         AND qt.status = 'completed') AS quality_pass_rate
  `)) as unknown as {
    active_orders: number;
    active_batches: number;
    avg_yield_pct: string | null;
    quality_pass_rate: string | null;
  }[];

  return {
    activeOrders: row?.active_orders ?? 0,
    activeBatches: row?.active_batches ?? 0,
    avgYieldPct: row?.avg_yield_pct ? parseFloat(row.avg_yield_pct) : null,
    qualityPassRate: row?.quality_pass_rate
      ? parseFloat(row.quality_pass_rate)
      : null,
  };
}

async function getViewerOrders(
  companyId: string,
): Promise<ViewerOrderStatus[]> {
  const rows = await db.execute(sql`
    SELECT
      po.code,
      cv.name AS cultivar_name,
      po.status,
      po.planned_end_date,
      COUNT(pop.id)::int AS phases_total,
      COUNT(pop.id) FILTER (WHERE pop.status = 'completed')::int AS phases_completed
    FROM production_orders po
    INNER JOIN cultivars cv ON po.cultivar_id = cv.id
    INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
    LEFT JOIN production_order_phases pop ON pop.production_order_id = po.id
    WHERE ct.company_id = ${companyId}
      AND po.status IN ('approved', 'in_progress', 'completed')
    GROUP BY po.id, cv.name
    ORDER BY po.created_at DESC
    LIMIT 10
  `);

  return (
    rows as unknown as {
      code: string;
      cultivar_name: string;
      status: string;
      planned_end_date: string | null;
      phases_total: number;
      phases_completed: number;
    }[]
  ).map((r) => {
    const total = r.phases_total || 1;
    return {
      code: r.code,
      cultivarName: r.cultivar_name,
      status: r.status,
      progressPct: Math.round((r.phases_completed / total) * 100),
      expectedEndDate: r.planned_end_date,
    };
  });
}

async function getOverallYields(
  companyId: string,
): Promise<{ real: number | null; expected: number | null }> {
  const [row] = (await db.execute(sql`
    SELECT
      AVG(pop.yield_pct) AS yield_real,
      AVG(ppf.expected_yield_pct::numeric) AS yield_expected
    FROM production_order_phases pop
    INNER JOIN production_orders po ON pop.production_order_id = po.id
    INNER JOIN cultivars cv ON po.cultivar_id = cv.id
    INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
    LEFT JOIN phase_product_flows ppf ON ppf.phase_id = pop.phase_id
      AND ppf.direction = 'output'
    WHERE ct.company_id = ${companyId}
      AND pop.yield_pct IS NOT NULL
  `)) as unknown as {
    yield_real: string | null;
    yield_expected: string | null;
  }[];

  return {
    real: row?.yield_real ? parseFloat(row.yield_real) : null,
    expected: row?.yield_expected ? parseFloat(row.yield_expected) : null,
  };
}

export async function getViewerDashboardData(
  facilityId?: string,
): Promise<ViewerDashboardData> {
  const claims = await requireAuth();

  const [facilities, kpis, orders, yields] = await Promise.all([
    getFacilitiesInternal(claims.companyId),
    getViewerKPIs(claims.companyId),
    getViewerOrders(claims.companyId),
    getOverallYields(claims.companyId),
  ]);

  return {
    facilities,
    kpis,
    orders,
    overallYieldReal: yields.real,
    overallYieldExpected: yields.expected,
  };
}

// ── Supervisor Queries (existing) ─────────────────────────────────

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
