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
  date,
  unique,
} from "drizzle-orm/pg-core";
import {
  activityFrequencyEnum,
  quantityBasisEnum,
  scheduledActivityStatusEnum,
  activityStatusEnum,
  observationTypeEnum,
  severityLevelEnum,
} from "./enums";
import { companies, users } from "./system";
import { cultivars, productionPhases } from "./production";
import { zones } from "./areas";
import {
  products,
  inventoryItems,
  inventoryTransactions,
  unitsOfMeasure,
} from "./inventory";

export const activityTypes = pgTable("activity_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  category: varchar("category"),
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

export const activityTemplates = pgTable("activity_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code").notNull().unique(),
  activityTypeId: uuid("activity_type_id")
    .notNull()
    .references(() => activityTypes.id),
  name: varchar("name").notNull(),
  frequency: activityFrequencyEnum("frequency").notNull().default("on_demand"),
  estimatedDurationMin: integer("estimated_duration_min").notNull(),
  triggerDayFrom: integer("trigger_day_from"),
  triggerDayTo: integer("trigger_day_to"),
  dependsOnTemplateId: uuid("depends_on_template_id"),
  triggersPhaseChangeId: uuid("triggers_phase_change_id").references(
    () => productionPhases.id,
  ),
  triggersTransformation: boolean("triggers_transformation")
    .notNull()
    .default(false),
  metadata: jsonb("metadata"),
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

export const activityTemplatePhases = pgTable(
  "activity_template_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => activityTemplates.id),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => productionPhases.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.templateId, table.phaseId)],
);

export const activityTemplateResources = pgTable(
  "activity_template_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => activityTemplates.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: decimal("quantity").notNull(),
    quantityBasis: quantityBasisEnum("quantity_basis")
      .notNull()
      .default("fixed"),
    isOptional: boolean("is_optional").notNull().default(false),
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
  },
);

export const activityTemplateChecklist = pgTable(
  "activity_template_checklist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => activityTemplates.id),
    stepOrder: integer("step_order").notNull(),
    instruction: text("instruction").notNull(),
    isCritical: boolean("is_critical").notNull().default(false),
    requiresPhoto: boolean("requires_photo").notNull().default(false),
    expectedValue: varchar("expected_value"),
    tolerance: varchar("tolerance"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
);

export const cultivationSchedules = pgTable("cultivation_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  cultivarId: uuid("cultivar_id")
    .notNull()
    .references(() => cultivars.id),
  totalDays: integer("total_days").notNull(),
  phaseConfig: jsonb("phase_config").notNull().default([]),
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

export const scheduledActivities = pgTable("scheduled_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => cultivationSchedules.id),
  templateId: uuid("template_id")
    .notNull()
    .references(() => activityTemplates.id),
  batchId: uuid("batch_id"),
  plannedDate: date("planned_date").notNull(),
  cropDay: integer("crop_day").notNull(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => productionPhases.id),
  templateSnapshot: jsonb("template_snapshot"),
  status: scheduledActivityStatusEnum("status").notNull().default("pending"),
  completedActivityId: uuid("completed_activity_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityTypeId: uuid("activity_type_id")
    .notNull()
    .references(() => activityTypes.id),
  templateId: uuid("template_id").references(() => activityTemplates.id),
  scheduledActivityId: uuid("scheduled_activity_id").references(
    () => scheduledActivities.id,
  ),
  batchId: uuid("batch_id"),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => zones.id),
  performedBy: uuid("performed_by")
    .notNull()
    .references(() => users.id),
  performedAt: timestamp("performed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  durationMinutes: integer("duration_minutes").notNull(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => productionPhases.id),
  cropDay: integer("crop_day"),
  status: activityStatusEnum("status").notNull().default("in_progress"),
  notes: text("notes"),
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

export const activityResources = pgTable("activity_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  inventoryItemId: uuid("inventory_item_id").references(
    () => inventoryItems.id,
  ),
  quantityPlanned: decimal("quantity_planned"),
  quantityActual: decimal("quantity_actual").notNull(),
  unitId: uuid("unit_id")
    .notNull()
    .references(() => unitsOfMeasure.id),
  costTotal: decimal("cost_total"),
  transactionId: uuid("transaction_id").references(
    () => inventoryTransactions.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const activityObservations = pgTable("activity_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id),
  type: observationTypeEnum("type").notNull(),
  severity: severityLevelEnum("severity").notNull().default("info"),
  description: text("description").notNull(),
  affectedPlants: integer("affected_plants"),
  actionTaken: text("action_taken"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type ActivityType = typeof activityTypes.$inferSelect;
export type NewActivityType = typeof activityTypes.$inferInsert;
export type ActivityTemplate = typeof activityTemplates.$inferSelect;
export type NewActivityTemplate = typeof activityTemplates.$inferInsert;
export type ActivityTemplatePhase = typeof activityTemplatePhases.$inferSelect;
export type NewActivityTemplatePhase =
  typeof activityTemplatePhases.$inferInsert;
export type ActivityTemplateResource =
  typeof activityTemplateResources.$inferSelect;
export type NewActivityTemplateResource =
  typeof activityTemplateResources.$inferInsert;
export type ActivityTemplateChecklist =
  typeof activityTemplateChecklist.$inferSelect;
export type NewActivityTemplateChecklist =
  typeof activityTemplateChecklist.$inferInsert;
export type CultivationSchedule = typeof cultivationSchedules.$inferSelect;
export type NewCultivationSchedule = typeof cultivationSchedules.$inferInsert;
export type ScheduledActivity = typeof scheduledActivities.$inferSelect;
export type NewScheduledActivity = typeof scheduledActivities.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type ActivityResource = typeof activityResources.$inferSelect;
export type NewActivityResource = typeof activityResources.$inferInsert;
export type ActivityObservation = typeof activityObservations.$inferSelect;
export type NewActivityObservation = typeof activityObservations.$inferInsert;
