"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { resolveAlertSchema } from "@/lib/schemas/alert";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type AlertItem = {
  id: string;
  type: string;
  severity: string;
  title: string | null;
  message: string;
  entityType: string;
  entityId: string;
  batchId: string | null;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolutionNotes: string | null;
};

export type AlertCounts = {
  pending: number;
  acknowledged: number;
  resolved: number;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getAlerts(
  tab: "pending" | "acknowledged" | "resolved",
  cursor?: string,
): Promise<{ items: AlertItem[]; hasMore: boolean }> {
  const claims = await requireAuth();
  const limit = 20;

  let statusFilter: string;
  switch (tab) {
    case "pending":
      statusFilter = "a.acknowledged_at IS NULL AND a.resolved_at IS NULL";
      break;
    case "acknowledged":
      statusFilter = "a.acknowledged_at IS NOT NULL AND a.resolved_at IS NULL";
      break;
    case "resolved":
      statusFilter = "a.resolved_at IS NOT NULL";
      break;
  }

  const cursorCondition = cursor
    ? sql`AND a.triggered_at < ${cursor}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      a.id, a.type, a.severity, a.title, a.message,
      a.entity_type, a.entity_id, a.batch_id,
      a.triggered_at, a.acknowledged_at, a.resolved_at,
      a.resolution_notes,
      ack.full_name AS acknowledged_by_name,
      res.full_name AS resolved_by_name
    FROM alerts a
    LEFT JOIN users ack ON a.acknowledged_by = ack.id
    LEFT JOIN users res ON a.resolved_by = res.id
    WHERE a.company_id = ${claims.companyId}
      AND ${sql.raw(statusFilter)}
      ${cursorCondition}
    ORDER BY
      CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      a.triggered_at DESC
    LIMIT ${limit + 1}
  `);

  const items = (rows as unknown as {
    id: string;
    type: string;
    severity: string;
    title: string | null;
    message: string;
    entity_type: string;
    entity_id: string;
    batch_id: string | null;
    triggered_at: string;
    acknowledged_at: string | null;
    resolved_at: string | null;
    resolution_notes: string | null;
    acknowledged_by_name: string | null;
    resolved_by_name: string | null;
  }[]).map((r) => ({
    id: r.id,
    type: r.type,
    severity: r.severity,
    title: r.title,
    message: r.message,
    entityType: r.entity_type,
    entityId: r.entity_id,
    batchId: r.batch_id,
    triggeredAt: r.triggered_at,
    acknowledgedAt: r.acknowledged_at,
    acknowledgedByName: r.acknowledged_by_name,
    resolvedAt: r.resolved_at,
    resolvedByName: r.resolved_by_name,
    resolutionNotes: r.resolution_notes,
  }));

  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  return { items, hasMore };
}

export async function getAlertCounts(): Promise<AlertCounts> {
  const claims = await requireAuth();

  const [row] = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE acknowledged_at IS NULL AND resolved_at IS NULL) AS pending,
      COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL AND resolved_at IS NULL) AS acknowledged,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) AS resolved
    FROM alerts
    WHERE company_id = ${claims.companyId}
  `) as unknown as {
    pending: string;
    acknowledged: string;
    resolved: string;
  }[];

  return {
    pending: parseInt(row.pending),
    acknowledged: parseInt(row.acknowledged),
    resolved: parseInt(row.resolved),
  };
}

// ── Mutations ─────────────────────────────────────────────────────

export async function acknowledgeAlert(alertId: string): Promise<ActionResult> {
  const claims = await requireAuth(["operator", "supervisor", "manager", "admin"]);

  await db.execute(sql`
    UPDATE alerts
    SET acknowledged_by = ${claims.userId},
        acknowledged_at = now(),
        updated_at = now()
    WHERE id = ${alertId}
      AND company_id = ${claims.companyId}
      AND acknowledged_at IS NULL
  `);

  revalidatePath("/operations/alerts");
  return { success: true };
}

export async function resolveAlert(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = resolveAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await db.execute(sql`
    UPDATE alerts
    SET resolved_by = ${claims.userId},
        resolved_at = now(),
        resolution_notes = ${parsed.data.resolutionNotes || null},
        acknowledged_by = COALESCE(acknowledged_by, ${claims.userId}),
        acknowledged_at = COALESCE(acknowledged_at, now()),
        updated_at = now()
    WHERE id = ${parsed.data.alertId}
      AND company_id = ${claims.companyId}
      AND resolved_at IS NULL
  `);

  revalidatePath("/operations/alerts");
  return { success: true };
}
