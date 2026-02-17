"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  createProductSchema,
  type CreateProductData,
} from "@/lib/schemas/product";
import {
  createProduct,
  updateProduct,
  type ProductDetail,
  type ProductFormData,
} from "@/lib/actions/inventory";

type Props = {
  formData: ProductFormData;
  product?: ProductDetail;
};

const LOT_TRACKING_OPTIONS = [
  { value: "none", label: "Sin seguimiento" },
  { value: "optional", label: "Opcional" },
  { value: "required", label: "Obligatorio" },
] as const;

const PROCUREMENT_OPTIONS = [
  { value: "purchased", label: "Comprado" },
  { value: "produced", label: "Producido" },
  { value: "both", label: "Ambos" },
] as const;

export function ProductForm({ formData, product }: Props) {
  const router = useRouter();
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateProductData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          categoryId: product.categoryId,
          defaultUnitId: product.defaultUnitId,
          cultivarId: product.cultivarId ?? "",
          procurementType: product.procurementType as "purchased" | "produced" | "both",
          lotTracking: product.lotTracking as "required" | "optional" | "none",
          shelfLifeDays: product.shelfLifeDays ?? 0,
          phiDays: product.phiDays ?? 0,
          reiHours: product.reiHours ?? 0,
          defaultPrice: product.defaultPrice ? Number(product.defaultPrice) : 0,
          priceCurrency: product.priceCurrency ?? "COP",
          preferredSupplierId: product.preferredSupplierId ?? "",
          minStockThreshold: product.minStockThreshold
            ? Number(product.minStockThreshold)
            : 0,
        }
      : {
          sku: "",
          name: "",
          categoryId: "",
          defaultUnitId: "",
          cultivarId: "",
          procurementType: "purchased",
          lotTracking: "none",
          shelfLifeDays: 0,
          phiDays: 0,
          reiHours: 0,
          defaultPrice: 0,
          priceCurrency: "COP",
          preferredSupplierId: "",
          minStockThreshold: 0,
        },
  });

  async function onSubmit(data: CreateProductData) {
    if (isEditing) {
      const result = await updateProduct({ ...data, id: product.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Producto actualizado");
    } else {
      const result = await createProduct(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Producto creado");
    }
    router.push("/inventory/products");
    router.refresh();
  }

  const selectClasses = cn(
    "h-12 w-full rounded-input border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "transition-colors duration-150",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none",
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          {isEditing ? "Editar producto" : "Nuevo producto"}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="SKU"
            placeholder="FERT-NPK-1KG"
            error={errors.sku?.message}
            {...register("sku")}
          />
          <Input
            label="Nombre"
            placeholder="Fertilizante NPK 1kg"
            error={errors.name?.message}
            {...register("name")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Categoria
            </label>
            <select
              className={cn(selectClasses, errors.categoryId ? "border-error" : "border-border")}
              {...register("categoryId")}
            >
              <option value="">Seleccionar...</option>
              {formData.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <span className="text-xs text-error">{errors.categoryId.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Unidad por defecto
            </label>
            <select
              className={cn(selectClasses, errors.defaultUnitId ? "border-error" : "border-border")}
              {...register("defaultUnitId")}
            >
              <option value="">Seleccionar...</option>
              {formData.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
            {errors.defaultUnitId && (
              <span className="text-xs text-error">{errors.defaultUnitId.message}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Tipo de abastecimiento
            </label>
            <select
              className={cn(selectClasses, "border-border")}
              {...register("procurementType")}
            >
              {PROCUREMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Seguimiento de lotes
            </label>
            <select
              className={cn(selectClasses, "border-border")}
              {...register("lotTracking")}
            >
              {LOT_TRACKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Vida util (dias)"
            type="number"
            min={0}
            placeholder="365"
            {...register("shelfLifeDays", { valueAsNumber: true })}
          />
          <Input
            label="Precio por defecto"
            type="number"
            min={0}
            step="0.01"
            placeholder="15000"
            {...register("defaultPrice", { valueAsNumber: true })}
          />
          <Input
            label="Stock minimo"
            type="number"
            min={0}
            step="0.01"
            placeholder="10"
            {...register("minStockThreshold", { valueAsNumber: true })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Proveedor preferido
          </label>
          <select
            className={cn(selectClasses, "border-border")}
            {...register("preferredSupplierId")}
          >
            <option value="">Sin proveedor preferido</option>
            {formData.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isEditing && !isDirty}
            className="flex-1 sm:flex-none"
          >
            {isEditing ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </form>
    </>
  );
}
