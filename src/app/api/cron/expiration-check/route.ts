import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { validateCronRequest } from "@/lib/utils/cron-auth";

export async function GET(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find items expiring within 7 days
  const expiring = await db.execute(sql`
    SELECT
      ii.id AS item_id,
      ii.lot_code,
      ii.expiration_date,
      p.name AS product_name,
      f.company_id,
      EXTRACT(DAY FROM ii.expiration_date - CURRENT_DATE) AS days_until
    FROM inventory_items ii
    INNER JOIN products p ON ii.product_id = p.id
    INNER JOIN zones z ON ii.zone_id = z.id
    INNER JOIN facilities f ON z.facility_id = f.id
    WHERE ii.expiration_date IS NOT NULL
      AND ii.expiration_date <= CURRENT_DATE + interval '7 days'
      AND ii.status = 'available'
      AND ii.available_quantity::numeric > 0
  `);

  let alertCount = 0;
  for (const row of expiring as unknown as {
    item_id: string;
    lot_code: string | null;
    product_name: string;
    days_until: string;
    company_id: string;
  }[]) {
    const days = parseInt(row.days_until);
    const severity = days <= 0 ? "critical" : days <= 3 ? "warning" : "info";

    // Check for existing unresolved alert
    const [existing] = await db.execute(sql`
      SELECT id FROM alerts
      WHERE type = 'expiring_item'
        AND entity_type = 'inventory_item'
        AND entity_id = ${row.item_id}
        AND resolved_at IS NULL
      LIMIT 1
    `) as unknown as { id: string }[];

    if (!existing) {
      const label = days <= 0 ? "Expirado" : `Vence en ${days} dia${days === 1 ? "" : "s"}`;
      await db.execute(sql`
        INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, company_id)
        VALUES (
          'expiring_item', ${severity},
          ${`${label}: ${row.product_name}`},
          ${`Lote ${row.lot_code ?? "—"} de ${row.product_name}`},
          'inventory_item', ${row.item_id}, ${row.company_id}
        )
      `);
      alertCount++;
    }
  }

  return NextResponse.json({
    expiringItems: (expiring as unknown[]).length,
    newAlerts: alertCount,
  });
}
