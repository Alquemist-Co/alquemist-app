"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { createRecipe, type ProductFormData } from "@/lib/actions/inventory";

type Props = {
  formData: ProductFormData;
};

type IngredientLine = {
  key: number;
  productId: string;
  quantity: string;
  unitId: string;
};

export function RecipeForm({ formData }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [outputProductId, setOutputProductId] = useState("");
  const [baseQuantity, setBaseQuantity] = useState("");
  const [baseUnitId, setBaseUnitId] = useState("");

  const [ingredients, setIngredients] = useState<IngredientLine[]>([
    { key: 1, productId: "", quantity: "", unitId: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [
      ...prev,
      { key: nextKey, productId: "", quantity: "", unitId: "" },
    ]);
    setNextKey((k) => k + 1);
  }, [nextKey]);

  const removeIngredient = useCallback((key: number) => {
    setIngredients((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateIngredient = useCallback(
    (key: number, field: keyof IngredientLine, value: string) => {
      setIngredients((prev) =>
        prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)),
      );
    },
    [],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const items = ingredients
        .filter((i) => i.productId && i.quantity && i.unitId)
        .map((i) => ({
          productId: i.productId,
          quantity: parseFloat(i.quantity),
          unitId: i.unitId,
        }));

      const result = await createRecipe({
        name,
        code,
        outputProductId,
        baseQuantity: parseFloat(baseQuantity),
        baseUnitId,
        items,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Receta creada");
      router.push("/inventory/recipes");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const selectClasses = cn(
    "h-12 w-full rounded-input border border-border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none",
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Nueva receta</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            placeholder="Fertilizante NPK Mezcla"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Codigo"
            placeholder="REC-NPK-01"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Producto de salida
            </label>
            <input
              type="text"
              placeholder="ID del producto"
              className={selectClasses}
              value={outputProductId}
              onChange={(e) => setOutputProductId(e.target.value)}
            />
          </div>
          <Input
            label="Cantidad base"
            type="number"
            min={0}
            step="0.01"
            value={baseQuantity}
            onChange={(e) => setBaseQuantity(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Unidad
            </label>
            <select
              className={selectClasses}
              value={baseUnitId}
              onChange={(e) => setBaseUnitId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {formData.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="mt-4 text-sm font-bold text-text-primary">Ingredientes</h2>

        <div className="flex flex-col gap-3">
          {ingredients.map((ing) => (
            <div
              key={ing.key}
              className="flex items-end gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary">
                  Producto
                </label>
                <input
                  type="text"
                  placeholder="ID del producto"
                  className={cn(selectClasses, "h-10 text-xs")}
                  value={ing.productId}
                  onChange={(e) =>
                    updateIngredient(ing.key, "productId", e.target.value)
                  }
                />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-bold uppercase text-text-secondary">
                  Cantidad
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={cn(selectClasses, "h-10 text-xs")}
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(ing.key, "quantity", e.target.value)
                  }
                />
              </div>
              <div className="w-32">
                <label className="text-[10px] font-bold uppercase text-text-secondary">
                  Unidad
                </label>
                <select
                  className={cn(selectClasses, "h-10 text-xs")}
                  value={ing.unitId}
                  onChange={(e) =>
                    updateIngredient(ing.key, "unitId", e.target.value)
                  }
                >
                  <option value="">-</option>
                  {formData.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code}
                    </option>
                  ))}
                </select>
              </div>
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(ing.key)}
                  className="mb-1 text-error cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          icon={Plus}
          size="sm"
          onClick={addIngredient}
        >
          Agregar ingrediente
        </Button>

        <div className="mt-4 flex gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Crear receta
          </Button>
        </div>
      </form>
    </>
  );
}
