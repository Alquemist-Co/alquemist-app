import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { iotReadingSchema } from "@/lib/schemas/environmental";

const IOT_API_KEY = process.env.IOT_API_KEY;

// ── F-089: In-memory rate limiter (100 req/min per API key) ──────

const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── F-089: Physical range validation ─────────────────────────────

const PHYSICAL_RANGES: Record<string, { min: number; max: number }> = {
  temperature: { min: -40, max: 80 },
  humidity: { min: 0, max: 100 },
  co2: { min: 0, max: 5000 },
  light_ppfd: { min: 0, max: 3000 },
  ec: { min: 0, max: 20 },
  ph: { min: 0, max: 14 },
  vpd: { min: 0, max: 10 },
};

// ── F-089: Timestamp drift tolerance (5 minutes) ────────────────

const MAX_DRIFT_MS = 5 * 60 * 1000;

function isValidTimestamp(ts: string | undefined): boolean {
  if (!ts) return true; // Will use server time
  const parsed = new Date(ts).getTime();
  if (isNaN(parsed)) return false;
  const drift = Math.abs(Date.now() - parsed);
  return drift <= MAX_DRIFT_MS;
}

// ── Process single reading ───────────────────────────────────────

type ReadingResult = { status: "created" | "error" | "skipped"; error?: string };

async function processReading(
  data: { serialNumber: string; parameter: string; value: number; unit: string; timestamp?: string },
): Promise<ReadingResult> {
  // Physical range check
  const range = PHYSICAL_RANGES[data.parameter];
  if (range && (data.value < range.min || data.value > range.max)) {
    return { status: "error", error: `Value ${data.value} out of physical range for ${data.parameter}` };
  }

  // Timestamp validation
  if (!isValidTimestamp(data.timestamp)) {
    return { status: "error", error: "Timestamp drift exceeds 5 minutes" };
  }

  // Lookup sensor
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

  if (!sensor) return { status: "error", error: "Sensor not found" };
  if (!sensor.is_active) return { status: "error", error: "Sensor inactive" };

  const ts = data.timestamp ? new Date(data.timestamp) : new Date();

  // Idempotency check: skip if same (sensor_id, parameter, timestamp) exists
  const [existing] = await db.execute(sql`
    SELECT id FROM environmental_readings
    WHERE sensor_id = ${sensor.id} AND parameter = ${data.parameter} AND timestamp = ${ts}
    LIMIT 1
  `) as unknown as { id: string }[];

  if (existing) return { status: "skipped" };

  // Insert reading
  await db.execute(sql`
    INSERT INTO environmental_readings (sensor_id, zone_id, parameter, value, unit, timestamp)
    VALUES (${sensor.id}, ${sensor.zone_id}, ${data.parameter}, ${data.value}, ${data.unit}, ${ts})
  `);

  // Alert check with debounce
  const config = sensor.climate_config as Record<string, { min?: number; max?: number }> | null;
  if (config && config[data.parameter]) {
    const r = config[data.parameter];
    const isOutOfRange =
      (r.min !== undefined && data.value < r.min) ||
      (r.max !== undefined && data.value > r.max);

    if (isOutOfRange) {
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
        const direction = r.min !== undefined && data.value < r.min ? "bajo" : "alto";
        await db.execute(sql`
          INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, company_id)
          VALUES (
            'env_out_of_range', 'warning',
            ${`${data.parameter} fuera de rango`},
            ${`${data.parameter} ${direction}: ${data.value} ${data.unit} (rango: ${r.min ?? "—"}–${r.max ?? "—"})`},
            'zone', ${sensor.zone_id}, ${sensor.company_id}
          )
        `);
      }
    }
  }

  return { status: "created" };
}

// ── POST handler ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("x-api-key");
  if (!IOT_API_KEY || apiKey !== IOT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json(
      { error: "Rate limit exceeded (100/min)" },
      { status: 429 },
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // F-089: Support batch format { readings: [...] }
  if (body && typeof body === "object" && "readings" in body) {
    const readings = (body as { readings: unknown[] }).readings;
    if (!Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ error: "Empty readings array" }, { status: 400 });
    }
    if (readings.length > 100) {
      return NextResponse.json({ error: "Max 100 readings per batch" }, { status: 400 });
    }

    const results: ReadingResult[] = [];
    for (const reading of readings) {
      const parsed = iotReadingSchema.safeParse(reading);
      if (!parsed.success) {
        results.push({ status: "error", error: "Validation error" });
        continue;
      }
      const result = await processReading(parsed.data);
      results.push(result);
    }

    const created = results.filter((r) => r.status === "created").length;
    const errors = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json(
      { created, errors, skipped, details: results },
      { status: errors > 0 && created === 0 ? 422 : 207 },
    );
  }

  // Single reading (backward compatible)
  const parsed = iotReadingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.issues },
      { status: 422 },
    );
  }

  const result = await processReading(parsed.data);
  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  if (result.status === "skipped") {
    return NextResponse.json({ status: "duplicate, skipped" }, { status: 200 });
  }

  return NextResponse.json({ status: "created" }, { status: 201 });
}
