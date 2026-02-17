import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { validateCronRequest } from "@/lib/utils/cron-auth";

export async function GET(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find products below min stock threshold
  const lowStock = await db.execute(sql`
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.min_stock_threshold,
      COALESCE(SUM(ii.available_quantity::numeric), 0) AS total_available,
      f.company_id
    FROM products p
    INNER JOIN resource_categories rc ON p.category_id = rc.id
    INNER JOIN facilities f ON f.company_id = rc.company_id
    LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.status = 'available'
    WHERE p.min_stock_threshold IS NOT NULL
      AND p.is_active = true
    GROUP BY p.id, p.name, p.min_stock_threshold, f.company_id
    HAVING COALESCE(SUM(ii.available_quantity::numeric), 0) < p.min_stock_threshold::numeric
  `);

  let alertCount = 0;
  for (const row of lowStock as unknown as {
    product_id: string;
    product_name: string;
    min_stock_threshold: string;
    total_available: string;
    company_id: string;
  }[]) {
    // Check for existing unresolved alert
    const [existing] = await db.execute(sql`
      SELECT id FROM alerts
      WHERE type = 'low_inventory'
        AND entity_type = 'product'
        AND entity_id = ${row.product_id}
        AND resolved_at IS NULL
      LIMIT 1
    `) as unknown as { id: string }[];

    if (!existing) {
      await db.execute(sql`
        INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, company_id)
        VALUES (
          'low_inventory', 'warning',
          ${`Stock bajo: ${row.product_name}`},
          ${`Stock actual: ${row.total_available} (minimo: ${row.min_stock_threshold})`},
          'product', ${row.product_id}, ${row.company_id}
        )
      `);
      alertCount++;
    }
  }

  // Auto-resolve alerts where stock recovered
  const autoResolved = await db.execute(sql`
    UPDATE alerts SET
      resolved_at = now(),
      resolution_notes = 'Auto-resuelto: stock recuperado',
      updated_at = now()
    WHERE type = 'low_inventory'
      AND resolved_at IS NULL
      AND entity_id NOT IN (
        SELECT p.id
        FROM products p
        LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.status = 'available'
        WHERE p.min_stock_threshold IS NOT NULL
        GROUP BY p.id
        HAVING COALESCE(SUM(ii.available_quantity::numeric), 0) < p.min_stock_threshold::numeric
      )
  `);

  return NextResponse.json({
    lowStockProducts: (lowStock as unknown[]).length,
    newAlerts: alertCount,
    autoResolved: (autoResolved as unknown[]).length,
  });
}
