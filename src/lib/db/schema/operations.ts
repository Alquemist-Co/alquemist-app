import {
  pgTable,
  uuid,
  varchar,
  char,
  boolean,
  timestamp,
  decimal,
  integer,
  text,
  date,
} from "drizzle-orm/pg-core";
import {
  costTypeEnum,
  allocationBasisEnum,
  sensorTypeEnum,
  readingParameterEnum,
  alertTypeEnum,
  alertSeverityEnum,
} from "./enums";
import { companies, users } from "./system";
import { facilities, zones } from "./areas";
import { batches } from "./batches";

export const overheadCosts = pgTable("overhead_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  zoneId: uuid("zone_id").references(() => zones.id),
  costType: costTypeEnum("cost_type").notNull(),
  description: varchar("description").notNull(),
  amount: decimal("amount").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  allocationBasis: allocationBasisEnum("allocation_basis")
    .notNull()
    .default("even_split"),
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

export const sensors = pgTable("sensors", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => zones.id),
  type: sensorTypeEnum("type").notNull(),
  brandModel: varchar("brand_model"),
  serialNumber: varchar("serial_number"),
  calibrationDate: date("calibration_date"),
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

export const environmentalReadings = pgTable("environmental_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sensorId: uuid("sensor_id")
    .notNull()
    .references(() => sensors.id),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => zones.id),
  parameter: readingParameterEnum("parameter").notNull(),
  value: decimal("value").notNull(),
  unit: varchar("unit").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: alertTypeEnum("type").notNull(),
  severity: alertSeverityEnum("severity").notNull().default("info"),
  title: text("title"),
  entityType: varchar("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  message: text("message").notNull(),
  batchId: uuid("batch_id").references(() => batches.id),
  triggeredAt: timestamp("triggered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  companyId: uuid("company_id").references(() => companies.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  description: varchar("description"),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OverheadCost = typeof overheadCosts.$inferSelect;
export type NewOverheadCost = typeof overheadCosts.$inferInsert;
export type Sensor = typeof sensors.$inferSelect;
export type NewSensor = typeof sensors.$inferInsert;
export type EnvironmentalReading = typeof environmentalReadings.$inferSelect;
export type NewEnvironmentalReading = typeof environmentalReadings.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
