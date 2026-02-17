"use server";

import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { PARAMETER_CONFIG } from "@/lib/schemas/environmental";

// ── Types ─────────────────────────────────────────────────────────

export type ZoneReading = {
  parameter: string;
  value: number;
  unit: string;
  timestamp: string;
};

export type ZoneCondition = {
  zoneId: string;
  zoneName: string;
  facilityName: string;
  readings: ZoneReading[];
  lastUpdated: string | null;
};

export type HistoryPoint = {
  hour: string;
  parameter: string;
  avgValue: number;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getAllZoneConditions(): Promise<ZoneCondition[]> {
  const claims = await requireAuth();

  // Get latest reading per parameter per zone
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
    WHERE f.company_id = ${claims.companyId}
      AND z.status = 'active'
    ORDER BY z.id, er.parameter, er.timestamp DESC
  `);

  // Group by zone
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
    });

    if (!zone.lastUpdated || row.timestamp > zone.lastUpdated) {
      zone.lastUpdated = row.timestamp;
    }
  }

  return Array.from(zoneMap.values());
}

export async function getZoneConditions(zoneId: string): Promise<ZoneReading[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (er.parameter)
      er.parameter,
      er.value,
      er.unit,
      er.timestamp
    FROM environmental_readings er
    WHERE er.zone_id = ${zoneId}
    ORDER BY er.parameter, er.timestamp DESC
  `);

  return (rows as unknown as {
    parameter: string;
    value: string;
    unit: string;
    timestamp: string;
  }[]).map((r) => ({
    parameter: r.parameter,
    value: parseFloat(r.value),
    unit: r.unit,
    timestamp: r.timestamp,
  }));
}

export async function getEnvironmentalHistory(
  zoneId: string,
  days: number = 7,
): Promise<HistoryPoint[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      date_trunc('hour', er.timestamp) AS hour,
      er.parameter,
      AVG(er.value::numeric) AS avg_value
    FROM environmental_readings er
    WHERE er.zone_id = ${zoneId}
      AND er.timestamp >= now() - (${days} || ' days')::interval
    GROUP BY hour, er.parameter
    ORDER BY hour ASC
  `);

  return (rows as unknown as {
    hour: string;
    parameter: string;
    avg_value: string;
  }[]).map((r) => ({
    hour: r.hour,
    parameter: r.parameter,
    avgValue: parseFloat(r.avg_value),
  }));
}
