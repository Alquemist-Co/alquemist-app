import { describe, it, expect } from "vitest";
import { loginSchema } from "@/lib/schemas/auth";
import { createUserSchema } from "@/lib/schemas/user";
import { createOrderSchema } from "@/lib/schemas/order";
import { createProductSchema } from "@/lib/schemas/product";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@test.com",
      password: "Admin123!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "Admin123!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "admin@test.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "123456" }).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  const validUser = {
    email: "user@test.com",
    fullName: "Test User",
    role: "operator" as const,
  };

  it("accepts valid user with required fields", () => {
    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it("accepts optional facilityId as UUID", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      facilityId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for facilityId", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      facilityId: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid facilityId (non-UUID, non-empty)", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      facilityId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid password", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      password: "SecurePass1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for password (auto-generate)", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      password: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid roles", () => {
    for (const role of ["admin", "manager", "supervisor", "operator", "viewer"]) {
      const result = createUserSchema.safeParse({ ...validUser, role });
      expect(result.success).toBe(true);
    }
  });

  it("rejects fullName too short", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      fullName: "A",
    });
    expect(result.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const validOrder = {
    cultivarId: uuid,
    entryPhaseId: uuid,
    exitPhaseId: uuid,
    initialQuantity: 100,
    initialUnitId: uuid,
    plannedStartDate: "2026-03-01",
    priority: "normal" as const,
    phaseConfig: [
      { phaseId: uuid, skipped: false },
    ],
  };

  it("accepts valid order", () => {
    const result = createOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      initialQuantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      initialQuantity: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      priority: "critical",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid priorities", () => {
    for (const priority of ["low", "normal", "high", "urgent"]) {
      const result = createOrderSchema.safeParse({ ...validOrder, priority });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty plannedStartDate", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      plannedStartDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as empty string", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      assignedTo: "",
      notes: "",
      initialProductId: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("createProductSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const validProduct = {
    sku: "PROD-001",
    name: "Test Product",
    categoryId: uuid,
    defaultUnitId: uuid,
    procurementType: "purchased" as const,
    lotTracking: "required" as const,
  };

  it("accepts valid product with required fields", () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("rejects empty SKU", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      sku: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name too short", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      name: "A",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all procurement types", () => {
    for (const procurementType of ["purchased", "produced", "both"]) {
      const result = createProductSchema.safeParse({ ...validProduct, procurementType });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all lot tracking types", () => {
    for (const lotTracking of ["required", "optional", "none"]) {
      const result = createProductSchema.safeParse({ ...validProduct, lotTracking });
      expect(result.success).toBe(true);
    }
  });

  it("rejects negative shelfLifeDays", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      shelfLifeDays: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional numeric fields", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      shelfLifeDays: 30,
      phiDays: 7,
      reiHours: 24,
      defaultPrice: 9.99,
      minStockThreshold: 10,
    });
    expect(result.success).toBe(true);
  });
});
