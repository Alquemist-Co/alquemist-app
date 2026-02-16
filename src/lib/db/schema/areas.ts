import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import {
  facilityTypeEnum,
  zonePurposeEnum,
  zoneEnvironmentEnum,
  zoneStatusEnum,
  structureTypeEnum,
  positionStatusEnum,
} from "./enums";
import { companies, users } from "./system";

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  name: varchar("name").notNull(),
  type: facilityTypeEnum("type").notNull(),
  totalFootprintM2: decimal("total_footprint_m2").notNull(),
  totalGrowingAreaM2: decimal("total_growing_area_m2").notNull().default("0"),
  totalPlantCapacity: integer("total_plant_capacity").notNull().default(0),
  address: varchar("address").notNull(),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
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

export const zones = pgTable("zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  name: varchar("name").notNull(),
  purpose: zonePurposeEnum("purpose").notNull(),
  environment: zoneEnvironmentEnum("environment").notNull(),
  areaM2: decimal("area_m2").notNull(),
  heightM: decimal("height_m"),
  effectiveGrowingAreaM2: decimal("effective_growing_area_m2")
    .notNull()
    .default("0"),
  plantCapacity: integer("plant_capacity").notNull().default(0),
  climateConfig: jsonb("climate_config"),
  status: zoneStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const zoneStructures = pgTable("zone_structures", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => zones.id),
  name: varchar("name").notNull(),
  type: structureTypeEnum("type").notNull(),
  lengthM: decimal("length_m").notNull(),
  widthM: decimal("width_m").notNull(),
  isMobile: boolean("is_mobile").notNull().default(false),
  numLevels: integer("num_levels").notNull().default(1),
  positionsPerLevel: integer("positions_per_level"),
  maxPositions: integer("max_positions"),
  levelConfig: jsonb("level_config"),
  spacingCm: decimal("spacing_cm"),
  potSizeL: decimal("pot_size_l"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const plantPositions = pgTable("plant_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => zones.id),
  structureId: uuid("structure_id").references(() => zoneStructures.id),
  levelNumber: integer("level_number"),
  positionIndex: integer("position_index").notNull(),
  label: varchar("label"),
  status: positionStatusEnum("status").notNull().default("empty"),
  currentBatchId: uuid("current_batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type Facility = typeof facilities.$inferSelect;
export type NewFacility = typeof facilities.$inferInsert;
export type Zone = typeof zones.$inferSelect;
export type NewZone = typeof zones.$inferInsert;
export type ZoneStructure = typeof zoneStructures.$inferSelect;
export type NewZoneStructure = typeof zoneStructures.$inferInsert;
export type PlantPosition = typeof plantPositions.$inferSelect;
export type NewPlantPosition = typeof plantPositions.$inferInsert;
