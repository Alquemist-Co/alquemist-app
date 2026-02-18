"use server";

import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { users, facilities } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileSchema } from "@/lib/schemas/profile";
import type { ActionResult } from "./types";

export type ProfileData = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  facilityName: string | null;
  lastSignInAt: string | null;
};

export async function getProfile(): Promise<ProfileData | null> {
  const claims = await requireAuth();

  const [row] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      facilityId: users.assignedFacilityId,
    })
    .from(users)
    .where(eq(users.id, claims.userId))
    .limit(1);

  if (!row) return null;

  let facilityName: string | null = null;
  if (row.facilityId) {
    const [f] = await db
      .select({ name: facilities.name })
      .from(facilities)
      .where(eq(facilities.id, row.facilityId))
      .limit(1);
    facilityName = f?.name ?? null;
  }

  // Get last sign in from auth
  const { data: authUser } = await createAdminClient().auth.admin.getUserById(
    claims.userId,
  );
  const lastSignInAt = authUser?.user?.last_sign_in_at ?? null;

  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    facilityName,
    lastSignInAt,
  };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { fullName, phone } = parsed.data;

  // Update public.users
  await db
    .update(users)
    .set({
      fullName,
      phone: phone || null,
    })
    .where(eq(users.id, claims.userId));

  // Update auth.users metadata
  await createAdminClient().auth.admin.updateUserById(claims.userId, {
    user_metadata: { full_name: fullName },
  });

  return { success: true };
}
