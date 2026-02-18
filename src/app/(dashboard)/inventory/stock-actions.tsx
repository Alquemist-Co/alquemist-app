"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  transferStock,
  adjustStock,
  registerWaste,
} from "@/lib/actions/inventory";

const selectClasses = cn(
  "h-10 w-full rounded-input border border-border bg-surface-card px-3",
  "font-sans text-xs text-text-primary",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type LotOption = {
  id: string;
  productName: string;
  batchNumber: string | null;
  zoneName: string | null;
  zoneId: string | null;
  available: number;
  unitCode: string;
};

type ZoneOption = { id: string; name: string };

type Props = {
  lots: LotOption[];
  zones: ZoneOption[];
};

export function StockActions({ lots, zones }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<
    "transfer" | "adjust" | "waste" | null
  >(null);
  const [selectedLot, setSelectedLot] = useState("");
  const [destZone, setDestZone] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [adjustType, setAdjustType] = useState<"positive" | "negative">(
    "positive",
  );
  const [batchId, setBatchId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setSelectedLot("");
    setDestZone("");
    setQuantity("");
    setReason("");
    setAdjustType("positive");
    setBatchId("");
  }, []);

  const selectedLotData = lots.find((l) => l.id === selectedLot);

  async function handleTransfer() {
    if (!selectedLot || !destZone || !quantity) return;
    setSubmitting(true);
    const result = await transferStock({
      inventoryItemId: selectedLot,
      quantity: Number(quantity),
      destinationZoneId: destZone,
      reason: reason || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Transferencia completada");
    setDialog(null);
    resetForm();
    router.refresh();
  }

  async function handleAdjust() {
    if (!selectedLot || !quantity || !reason) return;
    setSubmitting(true);
    const result = await adjustStock({
      inventoryItemId: selectedLot,
      adjustmentType: adjustType,
      quantity: Number(quantity),
      reason,
    });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Ajuste registrado");
    setDialog(null);
    resetForm();
    router.refresh();
  }

  async function handleWaste() {
    if (!selectedLot || !quantity || !reason) return;
    setSubmitting(true);
    const result = await registerWaste({
      inventoryItemId: selectedLot,
      quantity: Number(quantity),
      reason,
      batchId: batchId || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Desperdicio registrado");
    setDialog(null);
    resetForm();
    router.refresh();
  }

  const activeLots = lots.filter((l) => l.available > 0);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            resetForm();
            setDialog("transfer");
          }}
        >
          <ArrowRightLeft className="size-4" />
          Transferir
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            resetForm();
            setDialog("adjust");
          }}
        >
          <PlusCircle className="size-4" />
          Ajustar
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            resetForm();
            setDialog("waste");
          }}
        >
          <Trash2 className="size-4" />
          Desperdicio
        </Button>
      </div>

      {/* Transfer dialog */}
      <Dialog
        open={dialog === "transfer"}
        onClose={() => setDialog(null)}
        title="Transferir stock"
        footer={
          <Button
            onClick={handleTransfer}
            loading={submitting}
            disabled={!selectedLot || !destZone || !quantity}
            className="w-full"
          >
            Transferir
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Lote origen
            </label>
            <select
              value={selectedLot}
              onChange={(e) => setSelectedLot(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar lote...</option>
              {activeLots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.productName}
                  {l.batchNumber ? ` (${l.batchNumber})` : ""} —{" "}
                  {l.available} {l.unitCode}
                  {l.zoneName ? ` en ${l.zoneName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Zona destino
            </label>
            <select
              value={destZone}
              onChange={(e) => setDestZone(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar zona...</option>
              {zones
                .filter((z) => z.id !== selectedLotData?.zoneId)
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
            </select>
          </div>
          <Input
            label={`Cantidad${selectedLotData ? ` (max ${selectedLotData.available} ${selectedLotData.unitCode})` : ""}`}
            type="number"
            min={0.01}
            step="any"
            max={selectedLotData?.available}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Razon (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Dialog>

      {/* Adjustment dialog */}
      <Dialog
        open={dialog === "adjust"}
        onClose={() => setDialog(null)}
        title="Ajuste de stock"
        footer={
          <Button
            onClick={handleAdjust}
            loading={submitting}
            disabled={!selectedLot || !quantity || reason.length < 10}
            className="w-full"
          >
            Registrar ajuste
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Lote
            </label>
            <select
              value={selectedLot}
              onChange={(e) => setSelectedLot(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar lote...</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.productName}
                  {l.batchNumber ? ` (${l.batchNumber})` : ""} —{" "}
                  {l.available} {l.unitCode}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Tipo de ajuste
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={adjustType === "positive"}
                  onChange={() => setAdjustType("positive")}
                />
                Agregar
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={adjustType === "negative"}
                  onChange={() => setAdjustType("negative")}
                />
                Reducir
              </label>
            </div>
          </div>
          <Input
            label="Cantidad"
            type="number"
            min={0.01}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Razon (min 10 caracteres)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Dialog>

      {/* Waste dialog */}
      <Dialog
        open={dialog === "waste"}
        onClose={() => setDialog(null)}
        title="Registrar desperdicio"
        footer={
          <Button
            onClick={handleWaste}
            loading={submitting}
            disabled={!selectedLot || !quantity || reason.length < 10}
            className="w-full"
          >
            Registrar desperdicio
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Lote
            </label>
            <select
              value={selectedLot}
              onChange={(e) => setSelectedLot(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar lote...</option>
              {activeLots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.productName}
                  {l.batchNumber ? ` (${l.batchNumber})` : ""} —{" "}
                  {l.available} {l.unitCode}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={`Cantidad${selectedLotData ? ` (max ${selectedLotData.available})` : ""}`}
            type="number"
            min={0.01}
            step="any"
            max={selectedLotData?.available}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Razon (min 10 caracteres)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
