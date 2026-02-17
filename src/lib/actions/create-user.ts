"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createUserSchema } from "@/lib/schemas/user";

type CreateUserResult =
  | { success: true; userId: string; temporaryPassword: string }
  | { success: false; error: string };

export async function createUser(input: unknown): Promise<CreateUserResult> {
  // 1. Auth guard — admin only
  const claims = await requireAuth(["admin"]);

  // 2. Validate input
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { email, fullName, role, facilityId, password } = parsed.data;

  // 3. Generate password if not provided
  const finalPassword = password || generatePassword();

  // 4. Create auth user via Admin API
  const admin = createAdminClient();
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      app_metadata: {
        role,
        company_id: claims.companyId,
        facility_id: facilityId || null,
      },
      user_metadata: { full_name: fullName },
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return { success: false, error: "Ya existe un usuario con este email" };
    }
    return { success: false, error: authError.message };
  }

  // 5. Create public.users row
  await db.insert(users).values({
    id: authData.user.id,
    companyId: claims.companyId,
    email,
    fullName,
    role,
    assignedFacilityId: facilityId || null,
    createdBy: claims.userId,
  });

  return {
    success: true,
    userId: authData.user.id,
    temporaryPassword: finalPassword,
  };
}

function generatePassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(14)),
    (b) => chars[b % chars.length]
  ).join("");
}
