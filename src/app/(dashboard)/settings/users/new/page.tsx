import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { facilities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CreateUserForm } from "./create-user-form";

export default async function CreateUserPage() {
  const claims = await requireAuth(["admin"]);
  const facilityList = await db
    .select({ id: facilities.id, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.companyId, claims.companyId));

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary">
        Crear usuario
      </h1>
      <CreateUserForm facilities={facilityList} />
    </div>
  );
}
