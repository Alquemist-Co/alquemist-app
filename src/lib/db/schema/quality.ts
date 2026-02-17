import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  decimal,
  text,
  date,
} from "drizzle-orm/pg-core";
import { testStatusEnum } from "./enums";
import { users } from "./system";
import { productionPhases } from "./production";
import { batches } from "./batches";

export const qualityTests = pgTable("quality_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id),
  phaseId: uuid("phase_id").references(() => productionPhases.id),
  testType: varchar("test_type").notNull(),
  labName: varchar("lab_name"),
  labReference: varchar("lab_reference"),
  sampleDate: date("sample_date").notNull(),
  resultDate: date("result_date"),
  status: testStatusEnum("status").notNull().default("pending"),
  overallPass: boolean("overall_pass"),
  notes: text("notes"),
  certificateUrl: text("certificate_url"),
  performedBy: uuid("performed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const qualityTestResults = pgTable("quality_test_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  testId: uuid("test_id")
    .notNull()
    .references(() => qualityTests.id),
  parameter: varchar("parameter").notNull(),
  value: varchar("value").notNull(),
  numericValue: decimal("numeric_value"),
  unit: varchar("unit"),
  minThreshold: decimal("min_threshold"),
  maxThreshold: decimal("max_threshold"),
  passed: boolean("passed"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type QualityTest = typeof qualityTests.$inferSelect;
export type NewQualityTest = typeof qualityTests.$inferInsert;
export type QualityTestResult = typeof qualityTestResults.$inferSelect;
export type NewQualityTestResult = typeof qualityTestResults.$inferInsert;
