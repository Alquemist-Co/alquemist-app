"use server";

import { eq, sql, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { qualityTests, qualityTestResults } from "@/lib/db/schema";
import { createQualityTestSchema, recordResultsSchema } from "@/lib/schemas/quality";
import type { ActionResult } from "./types";

// ── Types ─────────────────────────────────────────────────────────

export type PendingTest = {
  id: string;
  testType: string;
  labName: string | null;
  sampleDate: string;
  status: string;
  batchCode: string;
  batchId: string;
  phaseName: string | null;
  daysWaiting: number;
};

export type TestDetail = {
  id: string;
  testType: string;
  labName: string | null;
  labReference: string | null;
  sampleDate: string;
  resultDate: string | null;
  status: string;
  overallPass: boolean | null;
  notes: string | null;
  certificateUrl: string | null;
  batchCode: string;
  batchId: string;
  phaseName: string | null;
  performedByName: string | null;
  results: TestResultRow[];
};

export type TestResultRow = {
  id: string;
  parameter: string;
  value: string;
  numericValue: string | null;
  unit: string | null;
  minThreshold: string | null;
  maxThreshold: string | null;
  passed: boolean | null;
};

// ── Queries ───────────────────────────────────────────────────────

export async function getPendingTests(): Promise<PendingTest[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      qt.id,
      qt.test_type as "testType",
      qt.lab_name as "labName",
      qt.sample_date as "sampleDate",
      qt.status,
      b.code as "batchCode",
      b.id as "batchId",
      pp.name as "phaseName",
      EXTRACT(DAY FROM NOW() - qt.sample_date::timestamp)::int as "daysWaiting"
    FROM quality_tests qt
    INNER JOIN batches b ON b.id = qt.batch_id
    LEFT JOIN production_phases pp ON pp.id = qt.phase_id
    WHERE qt.status IN ('pending', 'in_progress')
    ORDER BY qt.sample_date ASC
  `);

  return rows as unknown as PendingTest[];
}

export async function getTest(id: string): Promise<TestDetail | null> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      qt.id,
      qt.test_type as "testType",
      qt.lab_name as "labName",
      qt.lab_reference as "labReference",
      qt.sample_date as "sampleDate",
      qt.result_date as "resultDate",
      qt.status,
      qt.overall_pass as "overallPass",
      qt.notes,
      qt.certificate_url as "certificateUrl",
      b.code as "batchCode",
      b.id as "batchId",
      pp.name as "phaseName",
      u.full_name as "performedByName"
    FROM quality_tests qt
    INNER JOIN batches b ON b.id = qt.batch_id
    LEFT JOIN production_phases pp ON pp.id = qt.phase_id
    LEFT JOIN users u ON u.id = qt.performed_by
    WHERE qt.id = ${id}
    LIMIT 1
  `);

  const row = (rows as unknown as Record<string, unknown>[])[0];
  if (!row) return null;

  const results = await db
    .select()
    .from(qualityTestResults)
    .where(eq(qualityTestResults.testId, id))
    .orderBy(asc(qualityTestResults.createdAt));

  return {
    ...row,
    results: results.map((r) => ({
      id: r.id,
      parameter: r.parameter,
      value: r.value,
      numericValue: r.numericValue,
      unit: r.unit,
      minThreshold: r.minThreshold,
      maxThreshold: r.maxThreshold,
      passed: r.passed,
    })),
  } as TestDetail;
}

export async function getTestFormData() {
  await requireAuth();

  const [batchRows, phaseRows] = await Promise.all([
    db.execute(sql`
      SELECT id, code FROM batches
      WHERE status IN ('active', 'phase_transition')
      ORDER BY code
    `),
    db.execute(sql`
      SELECT DISTINCT pp.id, pp.name, ct.name as "cropTypeName"
      FROM production_phases pp
      INNER JOIN crop_types ct ON ct.id = pp.crop_type_id
      ORDER BY ct.name, pp.name
    `),
  ]);

  return {
    batches: batchRows as unknown as { id: string; code: string }[],
    phases: phaseRows as unknown as { id: string; name: string; cropTypeName: string }[],
  };
}

export async function getBatchTests(batchId: string): Promise<PendingTest[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      qt.id,
      qt.test_type as "testType",
      qt.lab_name as "labName",
      qt.sample_date as "sampleDate",
      qt.status,
      qt.overall_pass as "overallPass",
      b.code as "batchCode",
      b.id as "batchId",
      pp.name as "phaseName",
      EXTRACT(DAY FROM NOW() - qt.sample_date::timestamp)::int as "daysWaiting"
    FROM quality_tests qt
    INNER JOIN batches b ON b.id = qt.batch_id
    LEFT JOIN production_phases pp ON pp.id = qt.phase_id
    WHERE qt.batch_id = ${batchId}
    ORDER BY qt.sample_date DESC
  `);

  return rows as unknown as PendingTest[];
}

// ── Mutations ─────────────────────────────────────────────────────

export async function createQualityTest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = createQualityTestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  const [row] = await db
    .insert(qualityTests)
    .values({
      batchId: data.batchId,
      phaseId: data.phaseId || null,
      testType: data.testType,
      labName: data.labName || null,
      sampleDate: data.sampleDate,
      status: "pending",
      performedBy: claims.userId,
      createdBy: claims.userId,
      updatedBy: claims.userId,
    })
    .returning({ id: qualityTests.id });

  revalidatePath("/quality");
  return { success: true, data: { id: row.id } };
}

export async function recordResults(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["supervisor", "manager", "admin"]);

  const parsed = recordResultsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { testId, results, overallPass, notes } = parsed.data;

  return db.transaction(async (tx) => {
    // Insert results
    for (const r of results) {
      const numVal = r.numericValue ?? (r.value ? parseFloat(r.value) : null);
      let passed: boolean | null = null;
      if (numVal !== null && !isNaN(numVal)) {
        if (r.minThreshold !== undefined && r.maxThreshold !== undefined) {
          passed = numVal >= r.minThreshold && numVal <= r.maxThreshold;
        } else if (r.minThreshold !== undefined) {
          passed = numVal >= r.minThreshold;
        } else if (r.maxThreshold !== undefined) {
          passed = numVal <= r.maxThreshold;
        }
      }

      await tx.insert(qualityTestResults).values({
        testId,
        parameter: r.parameter,
        value: r.value,
        numericValue: numVal !== null && !isNaN(numVal) ? numVal.toString() : null,
        unit: r.unit || null,
        minThreshold: r.minThreshold?.toString() ?? null,
        maxThreshold: r.maxThreshold?.toString() ?? null,
        passed,
      });
    }

    // Update test status
    const today = new Date().toISOString().split("T")[0];
    await tx
      .update(qualityTests)
      .set({
        status: "completed",
        overallPass,
        resultDate: today,
        notes: notes || null,
        updatedBy: claims.userId,
      })
      .where(eq(qualityTests.id, testId));

    // If failed, insert alert
    if (!overallPass) {
      // Get batch info for alert
      const [test] = await tx.execute(sql`
        SELECT batch_id FROM quality_tests WHERE id = ${testId}
      `);
      const batchId = (test as unknown as { batch_id: string })?.batch_id;

      if (batchId) {
        await tx.execute(sql`
          INSERT INTO alerts (type, severity, title, message, batch_id, entity_type, entity_id, created_by)
          VALUES (
            'quality_failed', 'warning',
            'Test de calidad fallido',
            'Un test de calidad ha fallado para este batch',
            ${batchId}, 'quality_test', ${testId}, ${claims.userId}
          )
        `);
      }
    }

    revalidatePath("/quality");
    return { success: true as const };
  });
}

export async function uploadCertificate(
  testId: string,
  certificateUrl: string,
): Promise<ActionResult> {
  await requireAuth(["supervisor", "manager", "admin"]);

  await db
    .update(qualityTests)
    .set({ certificateUrl })
    .where(eq(qualityTests.id, testId));

  revalidatePath("/quality");
  return { success: true };
}

// ── History queries (F-033) ───────────────────────────────────────

export type TestHistoryItem = {
  id: string;
  testType: string;
  batchCode: string;
  batchId: string;
  cultivarName: string;
  resultDate: string;
  overallPass: boolean;
  parameterCount: number;
};

export async function getTestHistory(filters?: {
  cultivarId?: string;
  testType?: string;
  passFilter?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: TestHistoryItem[]; nextCursor: string | null }> {
  await requireAuth();

  const limit = filters?.limit ?? 50;

  const rows = await db.execute(sql`
    SELECT
      qt.id,
      qt.test_type as "testType",
      b.code as "batchCode",
      b.id as "batchId",
      c.name as "cultivarName",
      qt.result_date as "resultDate",
      qt.overall_pass as "overallPass",
      (SELECT count(*)::int FROM quality_test_results WHERE test_id = qt.id) as "parameterCount"
    FROM quality_tests qt
    INNER JOIN batches b ON b.id = qt.batch_id
    INNER JOIN cultivars c ON c.id = b.cultivar_id
    WHERE qt.status = 'completed'
      ${filters?.cultivarId ? sql`AND c.id = ${filters.cultivarId}` : sql``}
      ${filters?.testType ? sql`AND qt.test_type = ${filters.testType}` : sql``}
      ${filters?.passFilter === "pass" ? sql`AND qt.overall_pass = true` : sql``}
      ${filters?.passFilter === "fail" ? sql`AND qt.overall_pass = false` : sql``}
      ${filters?.cursor ? sql`AND qt.result_date < ${filters.cursor}` : sql``}
    ORDER BY qt.result_date DESC
    LIMIT ${limit + 1}
  `);

  const items = rows as unknown as TestHistoryItem[];
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].resultDate : null,
  };
}

export type HistoryFilterOptions = {
  cultivars: { id: string; name: string }[];
  testTypes: string[];
};

export async function getHistoryFilterOptions(): Promise<HistoryFilterOptions> {
  await requireAuth();

  const [cultivarRows, typeRows] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT c.id, c.name
      FROM cultivars c
      INNER JOIN batches b ON b.cultivar_id = c.id
      INNER JOIN quality_tests qt ON qt.batch_id = b.id
      WHERE qt.status = 'completed'
      ORDER BY c.name
    `),
    db.execute(sql`
      SELECT DISTINCT test_type as "testType"
      FROM quality_tests
      WHERE status = 'completed'
      ORDER BY test_type
    `),
  ]);

  return {
    cultivars: cultivarRows as unknown as { id: string; name: string }[],
    testTypes: (typeRows as unknown as { testType: string }[]).map((r) => r.testType),
  };
}

export type TrendDataPoint = {
  date: string;
  value: number;
  sma: number | null;
};

export async function getTrendData(
  cultivarId: string,
  parameter: string,
): Promise<TrendDataPoint[]> {
  await requireAuth();

  const rows = await db.execute(sql`
    SELECT
      qt.result_date as date,
      qtr.numeric_value::float as value
    FROM quality_test_results qtr
    INNER JOIN quality_tests qt ON qt.id = qtr.test_id
    INNER JOIN batches b ON b.id = qt.batch_id
    WHERE b.cultivar_id = ${cultivarId}
      AND qtr.parameter = ${parameter}
      AND qtr.numeric_value IS NOT NULL
      AND qt.status = 'completed'
    ORDER BY qt.result_date ASC
  `);

  const data = rows as unknown as { date: string; value: number }[];

  // Calculate 3-point SMA
  return data.map((d, i) => ({
    date: d.date,
    value: d.value,
    sma:
      i >= 2
        ? (data[i].value + data[i - 1].value + data[i - 2].value) / 3
        : null,
  }));
}
