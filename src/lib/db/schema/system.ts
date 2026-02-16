import {
  pgTable,
  uuid,
  varchar,
  char,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  legalId: varchar("legal_id"),
  country: char("country", { length: 2 }).notNull(),
  timezone: varchar("timezone").notNull().default("America/Bogota"),
  currency: char("currency", { length: 3 }).notNull().default("COP"),
  settings: jsonb("settings"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  email: varchar("email").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  role: userRoleEnum("role").notNull(),
  phone: varchar("phone"),
  assignedFacilityId: uuid("assigned_facility_id"),
  permissions: jsonb("permissions"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
