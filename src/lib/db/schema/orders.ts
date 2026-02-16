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
import {
  orderStatusEnum,
  orderPriorityEnum,
  orderPhaseStatusEnum,
} from "./enums";
import { companies, users } from "./system";
import { cultivars, productionPhases } from "./production";
import { zones } from "./areas";
import { products, unitsOfMeasure } from "./inventory";
import { batches } from "./batches";

export const productionOrders = pgTable("production_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code").notNull().unique(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  cultivarId: uuid("cultivar_id")
    .notNull()
    .references(() => cultivars.id),
  entryPhaseId: uuid("entry_phase_id")
    .notNull()
    .references(() => productionPhases.id),
  exitPhaseId: uuid("exit_phase_id")
    .notNull()
    .references(() => productionPhases.id),
  initialQuantity: decimal("initial_quantity").notNull(),
  initialUnitId: uuid("initial_unit_id")
    .notNull()
    .references(() => unitsOfMeasure.id),
  initialProductId: uuid("initial_product_id").references(() => products.id),
  expectedOutputQuantity: decimal("expected_output_quantity"),
  expectedOutputProductId: uuid("expected_output_product_id").references(
    () => products.id,
  ),
  zoneId: uuid("zone_id").references(() => zones.id),
  plannedStartDate: date("planned_start_date").notNull(),
  plannedEndDate: date("planned_end_date"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: orderStatusEnum("status").notNull().default("draft"),
  priority: orderPriorityEnum("priority").notNull().default("normal"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const productionOrderPhases = pgTable("production_order_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => productionOrders.id),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => productionPhases.id),
  sortOrder: integer("sort_order").notNull(),
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  plannedDurationDays: integer("planned_duration_days"),
  zoneId: uuid("zone_id").references(() => zones.id),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  batchId: uuid("batch_id").references(() => batches.id),
  inputQuantity: decimal("input_quantity"),
  outputQuantity: decimal("output_quantity"),
  yieldPct: decimal("yield_pct"),
  status: orderPhaseStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type NewProductionOrder = typeof productionOrders.$inferInsert;
export type ProductionOrderPhase = typeof productionOrderPhases.$inferSelect;
export type NewProductionOrderPhase = typeof productionOrderPhases.$inferInsert;
