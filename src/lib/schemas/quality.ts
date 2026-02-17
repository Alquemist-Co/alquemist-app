import { z } from "zod";

export const createQualityTestSchema = z.object({
  batchId: z.string().uuid("Batch requerido"),
  phaseId: z.string().uuid().optional().or(z.literal("")),
  testType: z.string().min(1, "Tipo de test requerido"),
  labName: z.string().optional().or(z.literal("")),
  sampleDate: z.string().min(1, "Fecha de muestra requerida"),
});

const resultRowSchema = z.object({
  parameter: z.string().min(1),
  value: z.string().min(1),
  numericValue: z.number().optional(),
  unit: z.string().optional().or(z.literal("")),
  minThreshold: z.number().optional(),
  maxThreshold: z.number().optional(),
});

export const recordResultsSchema = z.object({
  testId: z.string().uuid(),
  results: z.array(resultRowSchema).min(1, "Al menos un resultado"),
  overallPass: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateQualityTestData = z.infer<typeof createQualityTestSchema>;
export type RecordResultsData = z.infer<typeof recordResultsSchema>;
export type ResultRow = z.infer<typeof resultRowSchema>;
