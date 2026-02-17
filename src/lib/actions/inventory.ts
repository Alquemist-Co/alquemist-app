"use server";

import { eq, sql, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  products,
  resourceCategories,
  unitsOfMeasure,
  suppliers,
  inventoryItems,
  inventoryTransactions,
} from "@/lib/db/schema";
import { createProductSchema, updateProductSchema } from "@/lib/schemas/product";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitCode: string;
  unitName: string;
  procurementType: string;
  defaultPrice: string | null;
  preferredSupplierName: string | null;
  minStockThreshold: string | null;
  isActive: boolean;
  itemCount: number;
};

export type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  defaultUnitId: string;
  unitCode: string;
  unitName: string;
  cultivarId: string | null;
  procurementType: string;
  lotTracking: string;
  shelfLifeDays: number | null;
  phiDays: number | null;
  reiHours: number | null;
  defaultPrice: string | null;
  priceCurrency: string | null;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  minStockThreshold: string | null;
  isActive: boolean;
};

export type ProductFormData = {
  categories: { id: string; name: string; parentId: string | null }[];
  units: { id: string; code: string; name: string }[];
  suppliers: { id: string; name: string }[];
};

// ── Product queries ───────────────────────────────────────────────

export async function getProducts(): Promise<ProductListItem[]> {
  await requireAuth();

  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: resourceCategories.name,
      unitCode: unitsOfMeasure.code,
      unitName: unitsOfMeasure.name,
      procurementType: products.procurementType,
      defaultPrice: products.defaultPrice,
      preferredSupplierName: sql<string | null>`s.name`,
      minStockThreshold: products.minStockThreshold,
      isActive: products.isActive,
      itemCount: sql<number>`(
        SELECT count(*)::int FROM inventory_items
        WHERE product_id = ${products.id} AND quantity_available > 0
      )`,
    })
    .from(products)
    .innerJoin(resourceCategories, eq(products.categoryId, resourceCategories.id))
    .innerJoin(unitsOfMeasure, eq(products.defaultUnitId, unitsOfMeasure.id))
    .leftJoin(sql`suppliers s`, sql`s.id = ${products.preferredSupplierId}`)
    .orderBy(asc(products.name));
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  await requireAuth();

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: resourceCategories.name,
      defaultUnitId: products.defaultUnitId,
      unitCode: unitsOfMeasure.code,
      unitName: unitsOfMeasure.name,
      cultivarId: products.cultivarId,
      procurementType: products.procurementType,
      lotTracking: products.lotTracking,
      shelfLifeDays: products.shelfLifeDays,
      phiDays: products.phiDays,
      reiHours: products.reiHours,
      defaultPrice: products.defaultPrice,
      priceCurrency: products.priceCurrency,
      preferredSupplierId: products.preferredSupplierId,
      preferredSupplierName: sql<string | null>`s.name`,
      minStockThreshold: products.minStockThreshold,
      isActive: products.isActive,
    })
    .from(products)
    .innerJoin(resourceCategories, eq(products.categoryId, resourceCategories.id))
    .innerJoin(unitsOfMeasure, eq(products.defaultUnitId, unitsOfMeasure.id))
    .leftJoin(sql`suppliers s`, sql`s.id = ${products.preferredSupplierId}`)
    .where(eq(products.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function getProductFormData(): Promise<ProductFormData> {
  await requireAuth();

  const [cats, units, supps] = await Promise.all([
    db
      .select({
        id: resourceCategories.id,
        name: resourceCategories.name,
        parentId: resourceCategories.parentId,
      })
      .from(resourceCategories)
      .where(eq(resourceCategories.isActive, true))
      .orderBy(asc(resourceCategories.name)),
    db
      .select({
        id: unitsOfMeasure.id,
        code: unitsOfMeasure.code,
        name: unitsOfMeasure.name,
      })
      .from(unitsOfMeasure)
      .orderBy(asc(unitsOfMeasure.name)),
    db
      .select({
        id: suppliers.id,
        name: suppliers.name,
      })
      .from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(asc(suppliers.name)),
  ]);

  return { categories: cats, units, suppliers: supps };
}

// ── Product mutations ─────────────────────────────────────────────

export async function createProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  try {
    const [row] = await db
      .insert(products)
      .values({
        sku: data.sku,
        name: data.name,
        categoryId: data.categoryId,
        defaultUnitId: data.defaultUnitId,
        cultivarId: data.cultivarId || null,
        procurementType: data.procurementType,
        lotTracking: data.lotTracking,
        shelfLifeDays: data.shelfLifeDays || null,
        phiDays: data.phiDays || null,
        reiHours: data.reiHours || null,
        defaultPrice: data.defaultPrice?.toString() ?? null,
        priceCurrency: data.priceCurrency || null,
        preferredSupplierId: data.preferredSupplierId || null,
        minStockThreshold: data.minStockThreshold?.toString() ?? null,
        createdBy: claims.userId,
        updatedBy: claims.userId,
      })
      .returning({ id: products.id });

    revalidatePath("/inventory/products");
    return { success: true, data: { id: row.id } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe un producto con este SKU" };
    }
    throw err;
  }
}

export async function updateProduct(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;

  try {
    const [updated] = await db
      .update(products)
      .set({
        sku: data.sku,
        name: data.name,
        categoryId: data.categoryId,
        defaultUnitId: data.defaultUnitId,
        cultivarId: data.cultivarId || null,
        procurementType: data.procurementType,
        lotTracking: data.lotTracking,
        shelfLifeDays: data.shelfLifeDays || null,
        phiDays: data.phiDays || null,
        reiHours: data.reiHours || null,
        defaultPrice: data.defaultPrice?.toString() ?? null,
        priceCurrency: data.priceCurrency || null,
        preferredSupplierId: data.preferredSupplierId || null,
        minStockThreshold: data.minStockThreshold?.toString() ?? null,
        updatedBy: claims.userId,
      })
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (!updated) {
      return { success: false, error: "Producto no encontrado" };
    }

    revalidatePath("/inventory/products");
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe un producto con este SKU" };
    }
    throw err;
  }
}

export async function deactivateProduct(id: string): Promise<ActionResult<{ stockCount: number }>> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const [stockCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.productId, id), sql`quantity_available > 0`));

  await db
    .update(products)
    .set({ isActive: false })
    .where(eq(products.id, id));

  revalidatePath("/inventory/products");
  return { success: true, data: { stockCount: stockCount?.count ?? 0 } };
}

export async function reactivateProduct(id: string): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  await db
    .update(products)
    .set({ isActive: true })
    .where(eq(products.id, id));

  revalidatePath("/inventory/products");
  return { success: true };
}

// ── Stock queries (F-026) ─────────────────────────────────────────

export type StockByProduct = {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  unitCode: string;
  available: number;
  reserved: number;
  committed: number;
  total: number;
  minStockThreshold: number | null;
};

export async function getStockByProduct(): Promise<StockByProduct[]> {
  await requireAuth();

  const rows = await db.execute<StockByProduct>(sql`
    SELECT
      p.id as "productId",
      p.name as "productName",
      p.sku,
      rc.name as "categoryName",
      u.code as "unitCode",
      COALESCE(SUM(ii.quantity_available), 0)::float as available,
      COALESCE(SUM(ii.quantity_reserved), 0)::float as reserved,
      COALESCE(SUM(ii.quantity_committed), 0)::float as committed,
      COALESCE(SUM(ii.quantity_available + ii.quantity_reserved + ii.quantity_committed), 0)::float as total,
      p.min_stock_threshold::float as "minStockThreshold"
    FROM products p
    INNER JOIN resource_categories rc ON rc.id = p.category_id
    INNER JOIN units_of_measure u ON u.id = p.default_unit_id
    LEFT JOIN inventory_items ii ON ii.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.sku, rc.name, u.code, p.min_stock_threshold
    ORDER BY p.name
  `);

  return rows as unknown as StockByProduct[];
}

export type StockByZone = {
  zoneId: string;
  zoneName: string;
  facilityName: string;
  productCount: number;
  items: {
    productId: string;
    productName: string;
    sku: string;
    unitCode: string;
    available: number;
    reserved: number;
  }[];
};

export async function getStockByZone(): Promise<StockByZone[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      z.id as zone_id,
      z.name as zone_name,
      f.name as facility_name,
      p.id as product_id,
      p.name as product_name,
      p.sku,
      u.code as unit_code,
      COALESCE(SUM(ii.quantity_available), 0)::float as available,
      COALESCE(SUM(ii.quantity_reserved), 0)::float as reserved
    FROM zones z
    INNER JOIN facilities f ON f.id = z.facility_id
    LEFT JOIN inventory_items ii ON ii.zone_id = z.id AND ii.quantity_available > 0
    LEFT JOIN products p ON p.id = ii.product_id
    LEFT JOIN units_of_measure u ON u.id = p.default_unit_id
    WHERE z.status = 'active'
    GROUP BY z.id, z.name, f.name, p.id, p.name, p.sku, u.code
    ORDER BY f.name, z.name, p.name
  `);

  const zoneMap = new Map<string, StockByZone>();
  for (const row of rows as unknown as Record<string, unknown>[]) {
    const zoneId = row.zone_id as string;
    if (!zoneMap.has(zoneId)) {
      zoneMap.set(zoneId, {
        zoneId,
        zoneName: row.zone_name as string,
        facilityName: row.facility_name as string,
        productCount: 0,
        items: [],
      });
    }
    const zone = zoneMap.get(zoneId)!;
    if (row.product_id) {
      zone.items.push({
        productId: row.product_id as string,
        productName: row.product_name as string,
        sku: row.sku as string,
        unitCode: row.unit_code as string,
        available: row.available as number,
        reserved: row.reserved as number,
      });
      zone.productCount = zone.items.length;
    }
  }

  return Array.from(zoneMap.values());
}

export type ProductLot = {
  id: string;
  batchNumber: string | null;
  zoneName: string | null;
  quantityAvailable: number;
  quantityReserved: number;
  expirationDate: string | null;
  lotStatus: string;
  costPerUnit: string | null;
  createdAt: string;
};

export async function getProductLots(productId: string): Promise<ProductLot[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      ii.id,
      ii.batch_number as "batchNumber",
      z.name as "zoneName",
      ii.quantity_available::float as "quantityAvailable",
      ii.quantity_reserved::float as "quantityReserved",
      ii.expiration_date as "expirationDate",
      ii.lot_status as "lotStatus",
      ii.cost_per_unit as "costPerUnit",
      ii.created_at as "createdAt"
    FROM inventory_items ii
    LEFT JOIN zones z ON z.id = ii.zone_id
    WHERE ii.product_id = ${productId}
    ORDER BY ii.expiration_date ASC NULLS LAST, ii.created_at ASC
  `);

  return rows as unknown as ProductLot[];
}

export type LowStockAlert = {
  productId: string;
  productName: string;
  sku: string;
  unitCode: string;
  available: number;
  threshold: number;
  deficit: number;
};

export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      p.id as "productId",
      p.name as "productName",
      p.sku,
      u.code as "unitCode",
      COALESCE(SUM(ii.quantity_available), 0)::float as available,
      p.min_stock_threshold::float as threshold,
      (p.min_stock_threshold - COALESCE(SUM(ii.quantity_available), 0))::float as deficit
    FROM products p
    INNER JOIN units_of_measure u ON u.id = p.default_unit_id
    LEFT JOIN inventory_items ii ON ii.product_id = p.id
    WHERE p.is_active = true
      AND p.min_stock_threshold IS NOT NULL
      AND p.min_stock_threshold > 0
    GROUP BY p.id, p.name, p.sku, u.code, p.min_stock_threshold
    HAVING COALESCE(SUM(ii.quantity_available), 0) < p.min_stock_threshold
    ORDER BY (p.min_stock_threshold - COALESCE(SUM(ii.quantity_available), 0)) DESC
  `);

  return rows as unknown as LowStockAlert[];
}

// ── Stock movement chart data ─────────────────────────────────────

export type StockMovement = {
  date: string;
  inflow: number;
  outflow: number;
};

export async function getStockMovements(
  productId: string,
  days: number = 30,
): Promise<StockMovement[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      it.timestamp::date as date,
      COALESCE(SUM(CASE WHEN it.type IN ('receipt', 'transfer_in', 'transformation_in', 'return', 'release', 'adjustment') THEN it.quantity::float ELSE 0 END), 0) as inflow,
      COALESCE(SUM(CASE WHEN it.type IN ('consumption', 'application', 'transfer_out', 'transformation_out', 'waste', 'reservation') THEN it.quantity::float ELSE 0 END), 0) as outflow
    FROM inventory_transactions it
    INNER JOIN inventory_items ii ON ii.id = it.inventory_item_id
    WHERE ii.product_id = ${productId}
      AND it.timestamp >= NOW() - INTERVAL '1 day' * ${days}
    GROUP BY it.timestamp::date
    ORDER BY date ASC
  `);

  return rows as unknown as StockMovement[];
}

// ── Reception (F-028) ─────────────────────────────────────────────

export type ReceptionInput = {
  productId: string;
  quantity: number;
  unitId: string;
  zoneId: string;
  supplierId?: string;
  costPerUnit?: number;
  expirationDate?: string;
  batchNumber?: string;
};

export async function receiveItem(input: ReceptionInput): Promise<ActionResult<{ itemId: string }>> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  return db.transaction(async (tx) => {
    const [item] = await tx
      .insert(inventoryItems)
      .values({
        productId: input.productId,
        zoneId: input.zoneId,
        quantityAvailable: input.quantity.toString(),
        unitId: input.unitId,
        costPerUnit: input.costPerUnit?.toString() ?? null,
        expirationDate: input.expirationDate || null,
        batchNumber: input.batchNumber || null,
        sourceType: "purchase",
        lotStatus: "available",
        createdBy: claims.userId,
        updatedBy: claims.userId,
      })
      .returning({ id: inventoryItems.id });

    await tx.insert(inventoryTransactions).values({
      type: "receipt",
      inventoryItemId: item.id,
      quantity: input.quantity.toString(),
      unitId: input.unitId,
      zoneId: input.zoneId,
      costPerUnit: input.costPerUnit?.toString() ?? null,
      costTotal: input.costPerUnit
        ? (input.costPerUnit * input.quantity).toString()
        : null,
      userId: claims.userId,
      reason: `Recepcion de compra${input.batchNumber ? ` - Lote ${input.batchNumber}` : ""}`,
    });

    revalidatePath("/inventory");
    return { success: true as const, data: { itemId: item.id } };
  });
}

export async function receiveBulk(
  items: ReceptionInput[],
): Promise<ActionResult<{ count: number }>> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  return db.transaction(async (tx) => {
    for (const input of items) {
      const [item] = await tx
        .insert(inventoryItems)
        .values({
          productId: input.productId,
          zoneId: input.zoneId,
          quantityAvailable: input.quantity.toString(),
          unitId: input.unitId,
          costPerUnit: input.costPerUnit?.toString() ?? null,
          expirationDate: input.expirationDate || null,
          batchNumber: input.batchNumber || null,
          sourceType: "purchase",
          lotStatus: "available",
          createdBy: claims.userId,
          updatedBy: claims.userId,
        })
        .returning({ id: inventoryItems.id });

      await tx.insert(inventoryTransactions).values({
        type: "receipt",
        inventoryItemId: item.id,
        quantity: input.quantity.toString(),
        unitId: input.unitId,
        zoneId: input.zoneId,
        costPerUnit: input.costPerUnit?.toString() ?? null,
        costTotal: input.costPerUnit
          ? (input.costPerUnit * input.quantity).toString()
          : null,
        userId: claims.userId,
        reason: `Recepcion de compra${input.batchNumber ? ` - Lote ${input.batchNumber}` : ""}`,
      });
    }

    revalidatePath("/inventory");
    return { success: true as const, data: { count: items.length } };
  });
}

export async function getReceptionFormData() {
  await requireAuth();

  const [prods, zones, units, supps] = await Promise.all([
    db.execute(sql`
      SELECT id, sku, name, default_unit_id as "defaultUnitId",
             preferred_supplier_id as "preferredSupplierId",
             shelf_life_days as "shelfLifeDays"
      FROM products WHERE is_active = true ORDER BY name
    `),
    db.execute(sql`
      SELECT z.id, z.name, f.name as "facilityName"
      FROM zones z INNER JOIN facilities f ON f.id = z.facility_id
      WHERE z.status = 'active' ORDER BY f.name, z.name
    `),
    db.execute(sql`SELECT id, code, name FROM units_of_measure ORDER BY name`),
    db.execute(sql`SELECT id, name FROM suppliers WHERE is_active = true ORDER BY name`),
  ]);

  return {
    products: prods as unknown as { id: string; sku: string; name: string; defaultUnitId: string; preferredSupplierId: string | null; shelfLifeDays: number | null }[],
    zones: zones as unknown as { id: string; name: string; facilityName: string }[],
    units: units as unknown as { id: string; code: string; name: string }[],
    suppliers: supps as unknown as { id: string; name: string }[],
  };
}

// ── Transaction log (F-029) ───────────────────────────────────────

export type TransactionListItem = {
  id: string;
  type: string;
  quantity: number;
  unitCode: string;
  timestamp: string;
  productName: string;
  productSku: string;
  zoneName: string | null;
  batchCode: string | null;
  userName: string;
  reason: string | null;
};

export async function getTransactions(filters?: {
  type?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: TransactionListItem[]; nextCursor: string | null }> {
  await requireAuth();

  const limit = filters?.limit ?? 50;

  const rows = await db.execute(sql`
    SELECT
      it.id,
      it.type,
      it.quantity::float as quantity,
      u.code as "unitCode",
      it.timestamp,
      p.name as "productName",
      p.sku as "productSku",
      z.name as "zoneName",
      b.code as "batchCode",
      usr.full_name as "userName",
      it.reason
    FROM inventory_transactions it
    INNER JOIN inventory_items ii ON ii.id = it.inventory_item_id
    INNER JOIN products p ON p.id = ii.product_id
    INNER JOIN units_of_measure u ON u.id = it.unit_id
    LEFT JOIN zones z ON z.id = it.zone_id
    LEFT JOIN batches b ON b.id = it.batch_id
    INNER JOIN users usr ON usr.id = it.user_id
    WHERE 1=1
      ${filters?.type ? sql`AND it.type = ${filters.type}` : sql``}
      ${filters?.productId ? sql`AND ii.product_id = ${filters.productId}` : sql``}
      ${filters?.dateFrom ? sql`AND it.timestamp >= ${filters.dateFrom}::timestamptz` : sql``}
      ${filters?.dateTo ? sql`AND it.timestamp <= ${filters.dateTo}::timestamptz` : sql``}
      ${filters?.cursor ? sql`AND it.timestamp < ${filters.cursor}::timestamptz` : sql``}
    ORDER BY it.timestamp DESC
    LIMIT ${limit + 1}
  `);

  const items = rows as unknown as TransactionListItem[];
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].timestamp : null,
  };
}

export async function getTransaction(id: string) {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      it.id,
      it.type,
      it.quantity::float as quantity,
      u.code as "unitCode",
      u.name as "unitName",
      it.timestamp,
      it.cost_per_unit as "costPerUnit",
      it.cost_total as "costTotal",
      it.reason,
      it.related_transaction_id as "relatedTransactionId",
      p.id as "productId",
      p.name as "productName",
      p.sku as "productSku",
      z.id as "zoneId",
      z.name as "zoneName",
      b.id as "batchId",
      b.code as "batchCode",
      usr.full_name as "userName",
      it.created_at as "createdAt"
    FROM inventory_transactions it
    INNER JOIN inventory_items ii ON ii.id = it.inventory_item_id
    INNER JOIN products p ON p.id = ii.product_id
    INNER JOIN units_of_measure u ON u.id = it.unit_id
    LEFT JOIN zones z ON z.id = it.zone_id
    LEFT JOIN batches b ON b.id = it.batch_id
    INNER JOIN users usr ON usr.id = it.user_id
    WHERE it.id = ${id}
    LIMIT 1
  `);

  return (rows as unknown as Record<string, unknown>[])[0] ?? null;
}

export async function exportTransactionsCSV(filters?: {
  type?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<string>> {
  await requireAuth(["supervisor", "manager", "admin"]);

  const rows = await db.execute(sql`
    SELECT
      it.timestamp,
      it.type,
      p.sku,
      p.name as product_name,
      it.quantity::float as quantity,
      u.code as unit,
      z.name as zone,
      b.code as batch,
      usr.full_name as user_name,
      it.reason,
      it.cost_per_unit,
      it.cost_total
    FROM inventory_transactions it
    INNER JOIN inventory_items ii ON ii.id = it.inventory_item_id
    INNER JOIN products p ON p.id = ii.product_id
    INNER JOIN units_of_measure u ON u.id = it.unit_id
    LEFT JOIN zones z ON z.id = it.zone_id
    LEFT JOIN batches b ON b.id = it.batch_id
    INNER JOIN users usr ON usr.id = it.user_id
    WHERE 1=1
      ${filters?.type ? sql`AND it.type = ${filters.type}` : sql``}
      ${filters?.productId ? sql`AND ii.product_id = ${filters.productId}` : sql``}
      ${filters?.dateFrom ? sql`AND it.timestamp >= ${filters.dateFrom}::timestamptz` : sql``}
      ${filters?.dateTo ? sql`AND it.timestamp <= ${filters.dateTo}::timestamptz` : sql``}
    ORDER BY it.timestamp DESC
    LIMIT 10000
  `);

  const header = "Fecha,Tipo,SKU,Producto,Cantidad,Unidad,Zona,Batch,Usuario,Razon,Costo/Unidad,Costo Total";
  const lines = (rows as unknown as Record<string, unknown>[]).map((r) => {
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      r.timestamp, r.type, r.sku, r.product_name, r.quantity,
      r.unit, r.zone, r.batch, r.user_name, r.reason,
      r.cost_per_unit, r.cost_total,
    ].map(escape).join(",");
  });

  return { success: true, data: [header, ...lines].join("\n") };
}
