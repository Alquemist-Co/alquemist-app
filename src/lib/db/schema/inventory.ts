import {
  pgTable,
  uuid,
  varchar,
  char,
  boolean,
  timestamp,
  jsonb,
  integer,
  decimal,
  text,
  date,
} from "drizzle-orm/pg-core";
import {
  lotTrackingEnum,
  procurementTypeEnum,
  dimensionTypeEnum,
  sourceTypeEnum,
  lotStatusEnum,
  transactionTypeEnum,
} from "./enums";
import { companies, users } from "./system";
import { cultivars, productionPhases } from "./production";
import { zones } from "./areas";

export const resourceCategories = pgTable("resource_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id"),
  name: varchar("name").notNull(),
  code: varchar("code").notNull(),
  icon: varchar("icon"),
  color: varchar("color"),
  isConsumable: boolean("is_consumable").notNull().default(false),
  isDepreciable: boolean("is_depreciable").notNull().default(false),
  isTransformable: boolean("is_transformable").notNull().default(false),
  defaultLotTracking: lotTrackingEnum("default_lot_tracking")
    .notNull()
    .default("none"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const unitsOfMeasure = pgTable("units_of_measure", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code").notNull(),
  name: varchar("name").notNull(),
  dimension: dimensionTypeEnum("dimension").notNull(),
  baseUnitId: uuid("base_unit_id"),
  toBaseFactor: decimal("to_base_factor").notNull().default("1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  name: varchar("name").notNull(),
  contactInfo: jsonb("contact_info").notNull().default({}),
  paymentTerms: varchar("payment_terms"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: varchar("sku").notNull().unique(),
  name: varchar("name").notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => resourceCategories.id),
  defaultUnitId: uuid("default_unit_id")
    .notNull()
    .references(() => unitsOfMeasure.id),
  cultivarId: uuid("cultivar_id").references(() => cultivars.id),
  procurementType: procurementTypeEnum("procurement_type")
    .notNull()
    .default("purchased"),
  lotTracking: lotTrackingEnum("lot_tracking").notNull().default("none"),
  shelfLifeDays: integer("shelf_life_days"),
  phiDays: integer("phi_days"),
  reiHours: integer("rei_hours"),
  defaultYieldPct: decimal("default_yield_pct"),
  densityGPerMl: decimal("density_g_per_ml"),
  conversionProperties: jsonb("conversion_properties"),
  defaultPrice: decimal("default_price"),
  priceCurrency: char("price_currency", { length: 3 }),
  preferredSupplierId: uuid("preferred_supplier_id").references(
    () => suppliers.id,
  ),
  minStockThreshold: decimal("min_stock_threshold"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  zoneId: uuid("zone_id").references(() => zones.id),
  quantityAvailable: decimal("quantity_available").notNull().default("0"),
  quantityReserved: decimal("quantity_reserved").notNull().default("0"),
  quantityCommitted: decimal("quantity_committed").notNull().default("0"),
  unitId: uuid("unit_id")
    .notNull()
    .references(() => unitsOfMeasure.id),
  batchNumber: varchar("batch_number"),
  supplierLotNumber: varchar("supplier_lot_number"),
  costPerUnit: decimal("cost_per_unit"),
  expirationDate: date("expiration_date"),
  sourceType: sourceTypeEnum("source_type").notNull().default("purchase"),
  lotStatus: lotStatusEnum("lot_status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: transactionTypeEnum("type").notNull(),
  inventoryItemId: uuid("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id),
  quantity: decimal("quantity").notNull(),
  unitId: uuid("unit_id")
    .notNull()
    .references(() => unitsOfMeasure.id),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
  zoneId: uuid("zone_id").references(() => zones.id),
  batchId: uuid("batch_id"),
  phaseId: uuid("phase_id").references(() => productionPhases.id),
  activityId: uuid("activity_id"),
  recipeExecutionId: uuid("recipe_execution_id"),
  relatedTransactionId: uuid("related_transaction_id"),
  targetItemId: uuid("target_item_id").references(() => inventoryItems.id),
  costPerUnit: decimal("cost_per_unit"),
  costTotal: decimal("cost_total"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  companyId: uuid("company_id").references(() => companies.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  code: varchar("code").notNull(),
  outputProductId: uuid("output_product_id")
    .notNull()
    .references(() => products.id),
  baseQuantity: decimal("base_quantity").notNull(),
  baseUnitId: uuid("base_unit_id")
    .notNull()
    .references(() => unitsOfMeasure.id),
  items: jsonb("items").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const recipeExecutions = pgTable("recipe_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id),
  executedBy: uuid("executed_by")
    .notNull()
    .references(() => users.id),
  scaleFactor: decimal("scale_factor").notNull().default("1"),
  outputQuantityExpected: decimal("output_quantity_expected").notNull(),
  outputQuantityActual: decimal("output_quantity_actual"),
  yieldPct: decimal("yield_pct"),
  batchId: uuid("batch_id"),
  executedAt: timestamp("executed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ResourceCategory = typeof resourceCategories.$inferSelect;
export type NewResourceCategory = typeof resourceCategories.$inferInsert;
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type NewUnitOfMeasure = typeof unitsOfMeasure.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransaction = typeof inventoryTransactions.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeExecution = typeof recipeExecutions.$inferSelect;
export type NewRecipeExecution = typeof recipeExecutions.$inferInsert;
