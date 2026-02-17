import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { validateCronRequest } from "@/lib/utils/cron-auth";

export async function GET(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Mark overdue scheduled activities
  const updated = await db.execute(sql`
    UPDATE scheduled_activities
    SET status = 'overdue', updated_at = now()
    WHERE planned_date < CURRENT_DATE
      AND status = 'pending'
    RETURNING batch_id
  `);

  const batchIds = new Set(
    (updated as unknown as { batch_id: string }[]).map((r) => r.batch_id),
  );

  // Insert one alert per affected batch (deduplicated)
  let alertCount = 0;
  for (const batchId of batchIds) {
    // Check if alert already exists for this batch in last 24h
    const [existing] = await db.execute(sql`
      SELECT id FROM alerts
      WHERE type = 'overdue_activity'
        AND entity_type = 'batch'
        AND entity_id = ${batchId}
        AND triggered_at > now() - interval '24 hours'
      LIMIT 1
    `) as unknown as { id: string }[];

    if (!existing) {
      await db.execute(sql`
        INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, batch_id, company_id)
        SELECT
          'overdue_activity', 'warning',
          'Actividades vencidas',
          'Hay actividades vencidas pendientes para este batch',
          'batch', b.id, b.id, b.company_id
        FROM batches b
        WHERE b.id = ${batchId}
      `);
      alertCount++;
    }
  }

  return NextResponse.json({
    overdue: batchIds.size,
    alerts: alertCount,
  });
}
