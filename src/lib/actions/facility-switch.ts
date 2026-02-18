"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { users, facilities } from "@/lib/db/schema";
import type { ActionResult } from "./types";

export type FacilityOption = {
  id: string;
  name: string;
};

export async function getUserFacilities(): Promise<FacilityOption[]> {
  await requireAuth();

  return db
    .select({ id: facilities.id, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.isActive, true))
    .orderBy(facilities.name);
}

const switchFacilitySchema = z.object({
  facilityId: z.string().uuid().nullable(),
});

export async function switchFacility(
  input: z.infer<typeof switchFacilitySchema>,
): Promise<ActionResult> {
  const claims = await requireAuth();

  const parsed = switchFacilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos." };
  }

  const { facilityId } = parsed.data;

  // Verify facility exists if not null
  if (facilityId) {
    const rows = await db
      .select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Facility no encontrada." };
    }
  }

  await db
    .update(users)
    .set({ assignedFacilityId: facilityId })
    .where(eq(users.id, claims.userId));

  return { success: true };
}
