import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { iotReadingSchema } from "@/lib/schemas/environmental";

const IOT_API_KEY = process.env.IOT_API_KEY;

export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("x-api-key");
  if (!IOT_API_KEY || apiKey !== IOT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = iotReadingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Lookup sensor by serial number
  const [sensor] = await db.execute(sql`
    SELECT s.id, s.zone_id, s.is_active, z.climate_config, f.company_id
    FROM sensors s
    INNER JOIN zones z ON s.zone_id = z.id
    INNER JOIN facilities f ON z.facility_id = f.id
    WHERE s.serial_number = ${data.serialNumber}
    LIMIT 1
  `) as unknown as {
    id: string;
    zone_id: string;
    is_active: boolean;
    climate_config: Record<string, unknown> | null;
    company_id: string;
  }[];

  if (!sensor) {
    return NextResponse.json(
      { error: "Sensor not found" },
      { status: 404 },
    );
  }

  if (!sensor.is_active) {
    return NextResponse.json(
      { error: "Sensor is inactive" },
      { status: 422 },
    );
  }

  // Insert environmental reading
  const ts = data.timestamp ? new Date(data.timestamp) : new Date();

  await db.execute(sql`
    INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
    VALUES (${sensor.id}, ${sensor.zone_id}, ${data.parameter}, ${data.value}, ${data.unit}, ${ts})
  `);

  // Check if value is out of range and generate alert (with 30min debounce)
  const config = sensor.climate_config as Record<string, { min?: number; max?: number }> | null;
  if (config && config[data.parameter]) {
    const range = config[data.parameter];
    const isOutOfRange =
      (range.min !== undefined && data.value < range.min) ||
      (range.max !== undefined && data.value > range.max);

    if (isOutOfRange) {
      // Debounce: check if alert was created in last 30 minutes
      const [recentAlert] = await db.execute(sql`
        SELECT id FROM alerts
        WHERE type = 'env_out_of_range'
          AND entity_type = 'zone'
          AND entity_id = ${sensor.zone_id}
          AND triggered_at > now() - interval '30 minutes'
          AND message LIKE ${"%" + data.parameter + "%"}
        LIMIT 1
      `) as unknown as { id: string }[];

      if (!recentAlert) {
        const direction = range.min !== undefined && data.value < range.min ? "bajo" : "alto";
        await db.execute(sql`
          INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, company_id)
          VALUES (
            'env_out_of_range', 'warning',
            ${`${data.parameter} fuera de rango`},
            ${`${data.parameter} ${direction}: ${data.value} ${data.unit} (rango: ${range.min ?? "—"}–${range.max ?? "—"})`},
            'zone', ${sensor.zone_id}, ${sensor.company_id}
          )
        `);
      }
    }
  }

  return NextResponse.json({ status: "created" }, { status: 201 });
}
