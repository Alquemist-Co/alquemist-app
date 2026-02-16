import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  decimal,
  text,
} from "drizzle-orm/pg-core";
import { cropCategoryEnum, flowDirectionEnum, productRoleEnum } from "./enums";
import { users } from "./system";

export const cropTypes = pgTable("crop_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code").notNull().unique(),
  name: varchar("name").notNull(),
  scientificName: varchar("scientific_name"),
  category: cropCategoryEnum("category").notNull(),
  regulatoryFramework: varchar("regulatory_framework"),
  icon: varchar("icon"),
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

export const cultivars = pgTable("cultivars", {
  id: uuid("id").primaryKey().defaultRandom(),
  cropTypeId: uuid("crop_type_id")
    .notNull()
    .references(() => cropTypes.id),
  code: varchar("code").notNull().unique(),
  name: varchar("name").notNull(),
  breeder: varchar("breeder"),
  genetics: varchar("genetics"),
  defaultCycleDays: integer("default_cycle_days"),
  phaseDurations: jsonb("phase_durations"),
  expectedYieldPerPlantG: decimal("expected_yield_per_plant_g"),
  expectedDryRatio: decimal("expected_dry_ratio"),
  targetProfile: jsonb("target_profile"),
  qualityGrade: varchar("quality_grade"),
  optimalConditions: jsonb("optimal_conditions"),
  densityPlantsPerM2: decimal("density_plants_per_m2"),
  notes: text("notes"),
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

export const productionPhases = pgTable("production_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  cropTypeId: uuid("crop_type_id")
    .notNull()
    .references(() => cropTypes.id),
  code: varchar("code").notNull(),
  name: varchar("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  isTransformation: boolean("is_transformation").notNull().default(false),
  isDestructive: boolean("is_destructive").notNull().default(false),
  defaultDurationDays: integer("default_duration_days"),
  requiresZoneChange: boolean("requires_zone_change").notNull().default(false),
  canSkip: boolean("can_skip").notNull().default(false),
  canBeEntryPoint: boolean("can_be_entry_point").notNull().default(false),
  canBeExitPoint: boolean("can_be_exit_point").notNull().default(false),
  dependsOnPhaseId: uuid("depends_on_phase_id"),
  icon: varchar("icon"),
  color: varchar("color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const phaseProductFlows = pgTable("phase_product_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => productionPhases.id),
  direction: flowDirectionEnum("direction").notNull(),
  productRole: productRoleEnum("product_role").notNull(),
  productId: uuid("product_id"),
  productCategoryId: uuid("product_category_id"),
  expectedYieldPct: decimal("expected_yield_pct"),
  expectedQuantityPerInput: decimal("expected_quantity_per_input"),
  unitId: uuid("unit_id"),
  isRequired: boolean("is_required").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
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

export const cultivarProducts = pgTable("cultivar_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  cultivarId: uuid("cultivar_id")
    .notNull()
    .references(() => cultivars.id),
  productId: uuid("product_id"),
  phaseId: uuid("phase_id").references(() => productionPhases.id),
  isPrimary: boolean("is_primary").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type CropType = typeof cropTypes.$inferSelect;
export type NewCropType = typeof cropTypes.$inferInsert;
export type Cultivar = typeof cultivars.$inferSelect;
export type NewCultivar = typeof cultivars.$inferInsert;
export type ProductionPhase = typeof productionPhases.$inferSelect;
export type NewProductionPhase = typeof productionPhases.$inferInsert;
export type PhaseProductFlow = typeof phaseProductFlows.$inferSelect;
export type NewPhaseProductFlow = typeof phaseProductFlows.$inferInsert;
export type CultivarProduct = typeof cultivarProducts.$inferSelect;
export type NewCultivarProduct = typeof cultivarProducts.$inferInsert;
