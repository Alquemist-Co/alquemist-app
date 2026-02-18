"use server";

import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────

export type SearchResult = {
  id: string;
  type: "batch" | "order" | "product" | "zone" | "user";
  title: string;
  subtitle: string;
  href: string;
};

// ── Query ─────────────────────────────────────────────────────────

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const claims = await requireAuth();
  const q = `%${query.toLowerCase()}%`;
  const limit = 5;

  const [batchRows, orderRows, productRows, zoneRows, userRows] =
    await Promise.all([
      // Batches
      db.execute(sql`
        SELECT b.id, b.code, cv.name AS cultivar_name, z.name AS zone_name
        FROM batches b
        INNER JOIN cultivars cv ON b.cultivar_id = cv.id
        INNER JOIN zones z ON b.zone_id = z.id
        INNER JOIN facilities f ON z.facility_id = f.id
        WHERE f.company_id = ${claims.companyId}
          AND (LOWER(b.code) LIKE ${q} OR LOWER(cv.name) LIKE ${q})
        ORDER BY b.created_at DESC
        LIMIT ${limit}
      `),
      // Orders
      db.execute(sql`
        SELECT po.id, po.code, cv.name AS cultivar_name, po.status
        FROM production_orders po
        INNER JOIN cultivars cv ON po.cultivar_id = cv.id
        INNER JOIN crop_types ct ON cv.crop_type_id = ct.id
        WHERE ct.company_id = ${claims.companyId}
          AND (LOWER(po.code) LIKE ${q} OR LOWER(cv.name) LIKE ${q})
        ORDER BY po.created_at DESC
        LIMIT ${limit}
      `),
      // Products
      db.execute(sql`
        SELECT p.id, p.name, p.sku
        FROM products p
        WHERE p.company_id = ${claims.companyId}
          AND (LOWER(p.name) LIKE ${q} OR LOWER(p.sku) LIKE ${q})
        ORDER BY p.name
        LIMIT ${limit}
      `),
      // Zones
      db.execute(sql`
        SELECT z.id, z.name, f.name AS facility_name
        FROM zones z
        INNER JOIN facilities f ON z.facility_id = f.id
        WHERE f.company_id = ${claims.companyId}
          AND LOWER(z.name) LIKE ${q}
        ORDER BY z.name
        LIMIT ${limit}
      `),
      // Users
      db.execute(sql`
        SELECT u.id, u.full_name, u.email, u.role
        FROM users u
        WHERE u.company_id = ${claims.companyId}
          AND (LOWER(u.full_name) LIKE ${q} OR LOWER(u.email) LIKE ${q})
        ORDER BY u.full_name
        LIMIT ${limit}
      `),
    ]);

  const results: SearchResult[] = [];

  for (const r of batchRows as unknown as {
    id: string;
    code: string;
    cultivar_name: string;
    zone_name: string;
  }[]) {
    results.push({
      id: r.id,
      type: "batch",
      title: r.code,
      subtitle: `${r.cultivar_name} — ${r.zone_name}`,
      href: `/batches/${r.id}`,
    });
  }

  for (const r of orderRows as unknown as {
    id: string;
    code: string;
    cultivar_name: string;
    status: string;
  }[]) {
    results.push({
      id: r.id,
      type: "order",
      title: r.code,
      subtitle: `${r.cultivar_name} — ${r.status}`,
      href: `/orders/${r.id}`,
    });
  }

  for (const r of productRows as unknown as {
    id: string;
    name: string;
    sku: string;
  }[]) {
    results.push({
      id: r.id,
      type: "product",
      title: r.name,
      subtitle: r.sku,
      href: `/inventory/products/${r.id}`,
    });
  }

  for (const r of zoneRows as unknown as {
    id: string;
    name: string;
    facility_name: string;
  }[]) {
    results.push({
      id: r.id,
      type: "zone",
      title: r.name,
      subtitle: r.facility_name,
      href: `/areas/${r.id}`,
    });
  }

  for (const r of userRows as unknown as {
    id: string;
    full_name: string;
    email: string;
    role: string;
  }[]) {
    results.push({
      id: r.id,
      type: "user",
      title: r.full_name,
      subtitle: `${r.email} — ${r.role}`,
      href: `/settings/users/${r.id}`,
    });
  }

  return results;
}
