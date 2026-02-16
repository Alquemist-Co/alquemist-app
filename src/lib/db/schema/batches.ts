import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  date,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { batchStatusEnum, lineageOperationEnum } from "./enums";
import { companies, users } from "./system";
import { cultivars, productionPhases } from "./production";
import { zones } from "./areas";
import { products, inventoryItems, unitsOfMeasure } from "./inventory";
import { cultivationSchedules } from "./activities";

export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code").notNull().unique(),
  cultivarId: uuid("cultivar_id")
    .notNull()
    .references(() => cultivars.id),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => zones.id),
  plantCount: integer("plant_count").notNull(),
  areaM2: decimal("area_m2"),
  sourceInventoryItemId: uuid("source_inventory_item_id").references(
    () => inventoryItems.id,
  ),
  currentProductId: uuid("current_product_id").references(() => products.id),
  scheduleId: uuid("schedule_id").references(() => cultivationSchedules.id),
  currentPhaseId: uuid("current_phase_id")
    .notNull()
    .references(() => productionPhases.id),
  productionOrderId: uuid("production_order_id"),
  parentBatchId: uuid("parent_batch_id"),
  startDate: date("start_date").notNull(),
  expectedEndDate: date("expected_end_date"),
  status: batchStatusEnum("status").notNull().default("active"),
  yieldWetKg: decimal("yield_wet_kg"),
  yieldDryKg: decimal("yield_dry_kg"),
  totalCost: decimal("total_cost"),
  companyId: uuid("company_id").references(() => companies.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const batchLineage = pgTable("batch_lineage", {
  id: uuid("id").primaryKey().defaultRandom(),
  operation: lineageOperationEnum("operation").notNull(),
  parentBatchId: uuid("parent_batch_id")
    .notNull()
    .references(() => batches.id),
  childBatchId: uuid("child_batch_id")
    .notNull()
    .references(() => batches.id),
  quantityTransferred: decimal("quantity_transferred").notNull(),
  unitId: uuid("unit_id")
    .notNull()
    .references(() => unitsOfMeasure.id),
  reason: text("reason").notNull(),
  performedBy: uuid("performed_by")
    .notNull()
    .references(() => users.id),
  performedAt: timestamp("performed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
export type BatchLineage = typeof batchLineage.$inferSelect;
export type NewBatchLineage = typeof batchLineage.$inferInsert;
