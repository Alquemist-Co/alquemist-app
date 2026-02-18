"use server";

import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { supplierSchema, updateSupplierSchema } from "@/lib/schemas/supplier";
import type { ActionResult } from "./types";

export type SupplierListItem = {
  id: string;
  name: string;
  contactInfo: Record<string, string>;
  paymentTerms: string | null;
  isActive: boolean;
  productCount: number;
};

export async function getSuppliers(): Promise<SupplierListItem[]> {
  const claims = await requireAuth();

  const rows = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      contactInfo: suppliers.contactInfo,
      paymentTerms: suppliers.paymentTerms,
      isActive: suppliers.isActive,
      productCount: sql<number>`(
        SELECT count(*)::int FROM products
        WHERE preferred_supplier_id = ${suppliers.id}
      )`,
    })
    .from(suppliers)
    .where(eq(suppliers.companyId, claims.companyId))
    .orderBy(suppliers.name);

  return rows.map((r) => ({
    ...r,
    contactInfo: (r.contactInfo ?? {}) as Record<string, string>,
  }));
}

export async function createSupplier(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const claims = await requireAuth(["admin", "manager"]);
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const contactInfo: Record<string, string> = {};
  if (parsed.data.email) contactInfo.email = parsed.data.email;
  if (parsed.data.phone) contactInfo.phone = parsed.data.phone;
  if (parsed.data.address) contactInfo.address = parsed.data.address;
  if (parsed.data.website) contactInfo.website = parsed.data.website;

  try {
    const [row] = await db
      .insert(suppliers)
      .values({
        companyId: claims.companyId,
        name: parsed.data.name,
        contactInfo,
        paymentTerms: parsed.data.paymentTerms || null,
        createdBy: claims.userId,
      })
      .returning({ id: suppliers.id });
    return { success: true, data: { id: row.id } };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return { success: false, error: "Ya existe un proveedor con este nombre" };
    }
    throw err;
  }
}

export async function updateSupplier(input: unknown): Promise<ActionResult> {
  const claims = await requireAuth(["admin", "manager"]);
  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;
  const contactInfo: Record<string, string> = {};
  if (data.email) contactInfo.email = data.email;
  if (data.phone) contactInfo.phone = data.phone;
  if (data.address) contactInfo.address = data.address;
  if (data.website) contactInfo.website = data.website;

  const [updated] = await db
    .update(suppliers)
    .set({
      name: data.name,
      contactInfo,
      paymentTerms: data.paymentTerms || null,
      updatedBy: claims.userId,
    })
    .where(eq(suppliers.id, id))
    .returning({ id: suppliers.id });

  if (!updated) {
    return { success: false, error: "Proveedor no encontrado" };
  }
  return { success: true };
}

export async function toggleSupplierActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const claims = await requireAuth(["admin", "manager"]);

  if (!active) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`products`)
      .where(sql`preferred_supplier_id = ${id} AND is_active = true`);

    if (count > 0) {
      return {
        success: false,
        error: `Tiene ${count} producto(s) asociado(s). Se desactivara de todas formas.`,
      };
    }
  }

  const [updated] = await db
    .update(suppliers)
    .set({ isActive: active, updatedBy: claims.userId })
    .where(eq(suppliers.id, id))
    .returning({ id: suppliers.id });

  if (!updated) {
    return { success: false, error: "Proveedor no encontrado" };
  }
  return { success: true };
}
