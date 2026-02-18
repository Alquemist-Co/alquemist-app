"use server";

import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { companySchema } from "@/lib/schemas/company";
import type { CompanyData } from "@/lib/schemas/company";
import type { ActionResult } from "./types";

export async function getCompany(): Promise<CompanyData | null> {
  const claims = await requireAuth();

  const [row] = await db
    .select({
      id: companies.id,
      name: companies.name,
      legalId: companies.legalId,
      country: companies.country,
      timezone: companies.timezone,
      currency: companies.currency,
      isActive: companies.isActive,
    })
    .from(companies)
    .where(eq(companies.id, claims.companyId))
    .limit(1);

  return row ?? null;
}

export async function updateCompany(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin"]);
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const [updated] = await db
    .update(companies)
    .set({
      name: parsed.data.name,
      legalId: parsed.data.legalId || null,
      country: parsed.data.country,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      updatedBy: claims.userId,
    })
    .where(eq(companies.id, claims.companyId))
    .returning({ id: companies.id });

  if (!updated) {
    return { success: false, error: "Empresa no encontrada" };
  }
  return { success: true };
}
