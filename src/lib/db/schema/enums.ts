import { pgEnum } from "drizzle-orm/pg-core";

// Sistema
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "supervisor",
  "operator",
  "viewer",
]);

// Produccion
export const cropCategoryEnum = pgEnum("crop_category", [
  "annual",
  "perennial",
  "biennial",
]);
export const flowDirectionEnum = pgEnum("flow_direction", [
  "input",
  "output",
]);
export const productRoleEnum = pgEnum("product_role", [
  "primary",
  "secondary",
  "byproduct",
  "waste",
]);

// Areas
export const facilityTypeEnum = pgEnum("facility_type", [
  "indoor_warehouse",
  "greenhouse",
  "tunnel",
  "open_field",
  "vertical_farm",
]);
export const zonePurposeEnum = pgEnum("zone_purpose", [
  "propagation",
  "vegetation",
  "flowering",
  "drying",
  "processing",
  "storage",
  "multipurpose",
]);
export const zoneEnvironmentEnum = pgEnum("zone_environment", [
  "indoor_controlled",
  "greenhouse",
  "tunnel",
  "open_field",
]);
export const zoneStatusEnum = pgEnum("zone_status", [
  "active",
  "maintenance",
  "inactive",
]);
export const structureTypeEnum = pgEnum("structure_type", [
  "mobile_rack",
  "fixed_rack",
  "rolling_bench",
  "row",
  "bed",
  "trellis_row",
  "nft_channel",
]);
export const positionStatusEnum = pgEnum("position_status", [
  "empty",
  "planted",
  "harvested",
  "maintenance",
]);

// Inventario
export const lotTrackingEnum = pgEnum("lot_tracking", [
  "required",
  "optional",
  "none",
]);
export const procurementTypeEnum = pgEnum("procurement_type", [
  "purchased",
  "produced",
  "both",
]);
export const dimensionTypeEnum = pgEnum("dimension_type", [
  "mass",
  "volume",
  "count",
  "area",
  "energy",
  "time",
  "concentration",
]);
export const sourceTypeEnum = pgEnum("source_type", [
  "purchase",
  "production",
  "transfer",
  "transformation",
]);
export const lotStatusEnum = pgEnum("lot_status", [
  "available",
  "quarantine",
  "expired",
  "depleted",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "receipt",
  "consumption",
  "application",
  "transfer_out",
  "transfer_in",
  "transformation_out",
  "transformation_in",
  "adjustment",
  "waste",
  "return",
  "reservation",
  "release",
]);

// Actividades
export const activityFrequencyEnum = pgEnum("activity_frequency", [
  "daily",
  "weekly",
  "biweekly",
  "once",
  "on_demand",
]);
export const quantityBasisEnum = pgEnum("quantity_basis", [
  "fixed",
  "per_plant",
  "per_m2",
  "per_zone",
  "per_L_solution",
]);
export const scheduledActivityStatusEnum = pgEnum(
  "scheduled_activity_status",
  ["pending", "completed", "skipped", "overdue"],
);
export const activityStatusEnum = pgEnum("activity_status", [
  "in_progress",
  "completed",
  "cancelled",
]);
export const observationTypeEnum = pgEnum("observation_type", [
  "pest",
  "disease",
  "deficiency",
  "environmental",
  "general",
  "measurement",
]);
export const severityLevelEnum = pgEnum("severity_level", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

// Nexo (Batches)
export const batchStatusEnum = pgEnum("batch_status", [
  "active",
  "phase_transition",
  "completed",
  "cancelled",
  "on_hold",
]);
export const lineageOperationEnum = pgEnum("lineage_operation", [
  "split",
  "merge",
]);

// Ordenes
export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
]);
export const orderPriorityEnum = pgEnum("order_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const orderPhaseStatusEnum = pgEnum("order_phase_status", [
  "pending",
  "ready",
  "in_progress",
  "completed",
  "skipped",
]);

// Calidad
export const testStatusEnum = pgEnum("test_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "rejected",
]);

// Operaciones
export const costTypeEnum = pgEnum("cost_type", [
  "energy",
  "rent",
  "depreciation",
  "insurance",
  "maintenance",
  "labor_fixed",
  "other",
]);
export const allocationBasisEnum = pgEnum("allocation_basis", [
  "per_m2",
  "per_plant",
  "per_batch",
  "per_zone",
  "even_split",
]);
export const sensorTypeEnum = pgEnum("sensor_type", [
  "temperature",
  "humidity",
  "co2",
  "light",
  "ec",
  "ph",
  "soil_moisture",
  "vpd",
]);
export const readingParameterEnum = pgEnum("reading_parameter", [
  "temperature",
  "humidity",
  "co2",
  "light_ppfd",
  "ec",
  "ph",
  "vpd",
]);
export const alertTypeEnum = pgEnum("alert_type", [
  "overdue_activity",
  "low_inventory",
  "stale_batch",
  "expiring_item",
  "env_out_of_range",
  "order_delayed",
  "quality_failed",
]);
export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",
  "warning",
  "critical",
]);
