"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { executeRecipe, type RecipeDetail as RecipeDetailType } from "@/lib/actions/inventory";

type Props = {
  recipe: RecipeDetailType;
};

export function RecipeDetail({ recipe }: Props) {
  const router = useRouter();
  const [desiredQty, setDesiredQty] = useState(recipe.baseQuantity);
  const [showExecute, setShowExecute] = useState(false);
  const [zoneId, setZoneId] = useState("");
  const [executing, setExecuting] = useState(false);

  const scaleFactor = desiredQty / recipe.baseQuantity;

  const scaledItems = useMemo(
    () =>
      recipe.items.map((item) => ({
        ...item,
        scaledQty: item.quantity * scaleFactor,
        hasStock: item.stockAvailable >= item.quantity * scaleFactor,
        gap: Math.max(0, item.quantity * scaleFactor - item.stockAvailable),
      })),
    [recipe.items, scaleFactor],
  );

  const allStockOk = scaledItems.every((i) => i.hasStock);

  const handleExecute = useCallback(async () => {
    setExecuting(true);
    try {
      const result = await executeRecipe({
        recipeId: recipe.id,
        scaleFactor,
        zoneId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Receta ejecutada: ${desiredQty} ${recipe.baseUnitCode} producidos`);
      setShowExecute(false);
      router.push("/inventory");
      router.refresh();
    } finally {
      setExecuting(false);
    }
  }, [recipe, scaleFactor, zoneId, desiredQty, router]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{recipe.name}</h1>
          <p className="font-mono text-xs text-text-secondary">{recipe.code}</p>
        </div>
        <Button
          icon={Play}
          size="sm"
          onClick={() => setShowExecute(true)}
          disabled={!allStockOk}
        >
          Ejecutar
        </Button>
      </div>

      {/* Output */}
      <Card className="mb-4">
        <p className="text-xs font-bold uppercase text-text-secondary mb-1">Produce</p>
        <p className="text-sm text-text-primary">
          {recipe.outputProductName}{" "}
          <span className="font-mono text-text-secondary">({recipe.outputProductSku})</span>
        </p>
        <p className="font-mono text-sm text-brand font-bold mt-1">
          {recipe.baseQuantity} {recipe.baseUnitCode}
        </p>
      </Card>

      {/* Scale control */}
      <div className="mb-4">
        <Input
          label="Cantidad deseada"
          type="number"
          min={0}
          step="0.01"
          value={desiredQty}
          onChange={(e) => setDesiredQty(parseFloat(e.target.value) || 0)}
        />
        {scaleFactor !== 1 && (
          <p className="mt-1 text-xs text-text-secondary">
            Factor de escala: {scaleFactor.toFixed(2)}x
          </p>
        )}
      </div>

      {/* Ingredients table */}
      <h2 className="mb-3 text-sm font-bold text-text-primary">Ingredientes</h2>
      <div className="flex flex-col gap-2">
        {scaledItems.map((item) => (
          <Card
            key={item.productId}
            className={cn(
              "flex items-center justify-between",
              !item.hasStock && "border-error/30 bg-error/5",
            )}
          >
            <div>
              <p className="text-sm text-text-primary">{item.productName}</p>
              <p className="font-mono text-xs text-text-secondary">{item.productSku}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold">
                {item.scaledQty.toFixed(2)} {item.unitCode}
              </p>
              <p
                className={cn(
                  "text-xs",
                  item.hasStock ? "text-success" : "text-error",
                )}
              >
                Stock: {item.stockAvailable.toFixed(2)}
                {!item.hasStock && ` (faltan ${item.gap.toFixed(2)})`}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Execute dialog */}
      <Dialog
        open={showExecute}
        onClose={() => setShowExecute(false)}
        title="Ejecutar receta"
        footer={
          <Button
            loading={executing}
            onClick={handleExecute}
            disabled={!zoneId}
            className="w-full"
          >
            Confirmar ejecucion
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Se produciran <strong>{desiredQty} {recipe.baseUnitCode}</strong> de{" "}
            <strong>{recipe.outputProductName}</strong> consumiendo{" "}
            {scaledItems.length} ingredientes.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Zona de destino
            </label>
            <input
              type="text"
              placeholder="ID de zona (seleccionar en futuro)"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className={cn(
                "h-12 w-full rounded-input border border-border bg-surface-card px-3",
                "font-sans text-sm text-text-primary",
                "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
              )}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
