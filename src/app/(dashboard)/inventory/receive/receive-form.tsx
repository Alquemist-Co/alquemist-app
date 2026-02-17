"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { receiveItem, receiveBulk, type ReceptionInput } from "@/lib/actions/inventory";

type FormData = {
  products: {
    id: string;
    sku: string;
    name: string;
    defaultUnitId: string;
    preferredSupplierId: string | null;
    shelfLifeDays: number | null;
  }[];
  zones: { id: string; name: string; facilityName: string }[];
  units: { id: string; code: string; name: string }[];
  suppliers: { id: string; name: string }[];
};

type LineItem = {
  key: number;
  productId: string;
  quantity: string;
  unitId: string;
  costPerUnit: string;
  expirationDate: string;
  batchNumber: string;
};

const emptyLine = (key: number): LineItem => ({
  key,
  productId: "",
  quantity: "",
  unitId: "",
  costPerUnit: "",
  expirationDate: "",
  batchNumber: "",
});

export function ReceiveForm({ formData }: { formData: FormData }) {
  const router = useRouter();
  const [bulkMode, setBulkMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Shared fields
  const [supplierId, setSupplierId] = useState("");
  const [zoneId, setZoneId] = useState("");

  // Single mode
  const [single, setSingle] = useState<LineItem>(emptyLine(0));

  // Bulk mode
  const [lines, setLines] = useState<LineItem[]>([emptyLine(1), emptyLine(2)]);
  const [nextKey, setNextKey] = useState(3);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine(nextKey)]);
    setNextKey((k) => k + 1);
  }, [nextKey]);

  const removeLine = useCallback((key: number) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback(
    (key: number, field: keyof LineItem, value: string) => {
      setLines((prev) =>
        prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)),
      );
    },
    [],
  );

  // Auto-calc expiration when product changes
  const autoCalcExpiration = (productId: string): string => {
    const product = formData.products.find((p) => p.id === productId);
    if (!product?.shelfLifeDays) return "";
    const date = new Date();
    date.setDate(date.getDate() + product.shelfLifeDays);
    return date.toISOString().split("T")[0];
  };

  const handleProductChange = useCallback(
    (line: LineItem, productId: string, isSingle: boolean) => {
      const product = formData.products.find((p) => p.id === productId);
      const unitId = product?.defaultUnitId ?? "";
      const expiration = autoCalcExpiration(productId);

      if (product?.preferredSupplierId && !supplierId) {
        setSupplierId(product.preferredSupplierId);
      }

      if (isSingle) {
        setSingle((prev) => ({
          ...prev,
          productId,
          unitId,
          expirationDate: expiration || prev.expirationDate,
        }));
      } else {
        setLines((prev) =>
          prev.map((l) =>
            l.key === line.key
              ? {
                  ...l,
                  productId,
                  unitId,
                  expirationDate: expiration || l.expirationDate,
                }
              : l,
          ),
        );
      }
    },
    [formData.products, supplierId],
  );

  const buildInput = (line: LineItem): ReceptionInput | null => {
    if (!line.productId || !line.quantity || !zoneId) return null;
    const product = formData.products.find((p) => p.id === line.productId);
    return {
      productId: line.productId,
      quantity: parseFloat(line.quantity),
      unitId: line.unitId || product?.defaultUnitId || "",
      zoneId,
      supplierId: supplierId || undefined,
      costPerUnit: line.costPerUnit ? parseFloat(line.costPerUnit) : undefined,
      expirationDate: line.expirationDate || undefined,
      batchNumber: line.batchNumber || undefined,
    };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneId) {
      toast.error("Selecciona una zona de destino");
      return;
    }

    setSubmitting(true);

    try {
      if (bulkMode) {
        const inputs = lines
          .map((l) => buildInput(l))
          .filter((i): i is ReceptionInput => i !== null);

        if (inputs.length === 0) {
          toast.error("Agrega al menos un producto con cantidad");
          return;
        }

        const result = await receiveBulk(inputs);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.data.count} productos recibidos`);
      } else {
        const input = buildInput(single);
        if (!input) {
          toast.error("Completa producto y cantidad");
          return;
        }
        const result = await receiveItem(input);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Producto recibido exitosamente");
      }

      router.push("/inventory");
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

  const renderLine = (line: LineItem, isSingle: boolean) => (
    <div key={line.key} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Producto
          </label>
          <select
            className={selectClasses}
            value={line.productId}
            onChange={(e) => handleProductChange(line, e.target.value, isSingle)}
          >
            <option value="">Seleccionar producto...</option>
            {formData.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cantidad"
            type="number"
            min={0}
            step="0.01"
            value={line.quantity}
            onChange={(e) =>
              isSingle
                ? setSingle((prev) => ({ ...prev, quantity: e.target.value }))
                : updateLine(line.key, "quantity", e.target.value)
            }
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Unidad
            </label>
            <select
              className={selectClasses}
              value={line.unitId}
              onChange={(e) =>
                isSingle
                  ? setSingle((prev) => ({ ...prev, unitId: e.target.value }))
                  : updateLine(line.key, "unitId", e.target.value)
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
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Costo/unidad"
          type="number"
          min={0}
          step="0.01"
          value={line.costPerUnit}
          onChange={(e) =>
            isSingle
              ? setSingle((prev) => ({ ...prev, costPerUnit: e.target.value }))
              : updateLine(line.key, "costPerUnit", e.target.value)
          }
        />
        <Input
          label="Vencimiento"
          type="date"
          value={line.expirationDate}
          onChange={(e) =>
            isSingle
              ? setSingle((prev) => ({
                  ...prev,
                  expirationDate: e.target.value,
                }))
              : updateLine(line.key, "expirationDate", e.target.value)
          }
        />
        <Input
          label="Lote proveedor"
          value={line.batchNumber}
          onChange={(e) =>
            isSingle
              ? setSingle((prev) => ({
                  ...prev,
                  batchNumber: e.target.value,
                }))
              : updateLine(line.key, "batchNumber", e.target.value)
          }
        />
      </div>
      {!isSingle && lines.length > 1 && (
        <button
          type="button"
          onClick={() => removeLine(line.key)}
          className="self-end text-xs text-error hover:underline cursor-pointer flex items-center gap-1"
        >
          <Trash2 className="size-3" />
          Quitar
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">
          Recepcion de compras
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Common fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Zona de destino
            </label>
            <select
              className={selectClasses}
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              required
            >
              <option value="">Seleccionar zona...</option>
              {formData.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.facilityName} — {z.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Proveedor
            </label>
            <select
              className={selectClasses}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Sin proveedor</option>
              {formData.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Toggle
          label="Modo multiple"
          checked={bulkMode}
          onChange={setBulkMode}
        />

        {/* Lines */}
        <div className="flex flex-col gap-3">
          {bulkMode
            ? lines.map((line) => renderLine(line, false))
            : renderLine(single, true)}
        </div>

        {bulkMode && (
          <Button
            type="button"
            variant="ghost"
            icon={Plus}
            size="sm"
            onClick={addLine}
          >
            Agregar linea
          </Button>
        )}

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
            loading={submitting}
            icon={PackagePlus}
            className="flex-1 sm:flex-none"
          >
            {bulkMode ? `Recibir ${lines.filter((l) => l.productId && l.quantity).length} productos` : "Recibir producto"}
          </Button>
        </div>
      </form>
    </>
  );
}
