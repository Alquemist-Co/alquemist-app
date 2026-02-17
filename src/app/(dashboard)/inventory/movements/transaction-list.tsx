"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Download, ArrowUpRight, ArrowDownLeft, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  getTransactions,
  getTransaction,
  exportTransactionsCSV,
  type TransactionListItem,
} from "@/lib/actions/inventory";

type Props = {
  initialItems: TransactionListItem[];
  initialCursor: string | null;
};

const TRANSACTION_SIGNS: Record<string, "+" | "-"> = {
  receipt: "+",
  consumption: "-",
  application: "-",
  transfer_out: "-",
  transfer_in: "+",
  transformation_out: "-",
  transformation_in: "+",
  adjustment: "+",
  waste: "-",
  return: "+",
  reservation: "-",
  release: "+",
};

const TRANSACTION_LABELS: Record<string, string> = {
  receipt: "Recepcion",
  consumption: "Consumo",
  application: "Aplicacion",
  transfer_out: "Transferencia (salida)",
  transfer_in: "Transferencia (entrada)",
  transformation_out: "Transformacion (salida)",
  transformation_in: "Transformacion (entrada)",
  adjustment: "Ajuste",
  waste: "Merma",
  return: "Devolucion",
  reservation: "Reserva",
  release: "Liberacion",
};

const TRANSACTION_COLORS: Record<string, string> = {
  receipt: "bg-success/10 text-success",
  consumption: "bg-error/10 text-error",
  application: "bg-error/10 text-error",
  transfer_out: "bg-warning/10 text-warning",
  transfer_in: "bg-brand/10 text-brand",
  transformation_out: "bg-warning/10 text-warning",
  transformation_in: "bg-brand/10 text-brand",
  adjustment: "bg-brand/10 text-brand",
  waste: "bg-error/10 text-error",
  return: "bg-success/10 text-success",
  reservation: "bg-warning/10 text-warning",
  release: "bg-success/10 text-success",
};

export function TransactionList({ initialItems, initialCursor }: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  type TransactionDetail = {
    id: string;
    type: string;
    quantity: number;
    unitCode: string;
    unitName: string;
    timestamp: string;
    costPerUnit: string | null;
    costTotal: string | null;
    reason: string | null;
    relatedTransactionId: string | null;
    productId: string;
    productName: string;
    productSku: string;
    zoneId: string | null;
    zoneName: string | null;
    batchId: string | null;
    batchCode: string | null;
    userName: string;
    createdAt: string;
  };
  const [detail, setDetail] = useState<TransactionDetail | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const result = await getTransactions({
        type: typeFilter || undefined,
        cursor,
      });
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, typeFilter]);

  const applyFilter = useCallback(async (type: string) => {
    setTypeFilter(type);
    setLoading(true);
    try {
      const result = await getTransactions({ type: type || undefined });
      setItems(result.items);
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportTransactionsCSV({
        type: typeFilter || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const bom = "\uFEFF";
      const blob = new Blob([bom + result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movimientos-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado");
    } finally {
      setExporting(false);
    }
  }, [typeFilter]);

  const handleRowClick = useCallback(async (id: string) => {
    const data = await getTransaction(id);
    setDetail(data as TransactionDetail | null);
  }, []);

  const formatRelativeTime = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  };

  const selectClasses = cn(
    "h-10 rounded-input border border-border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none",
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Movimientos</h1>
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          loading={exporting}
          disabled={items.length === 0}
          onClick={handleExport}
        >
          CSV
        </Button>
      </div>

      <div className="mb-4">
        <select
          className={selectClasses}
          value={typeFilter}
          onChange={(e) => applyFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TRANSACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin movimientos"
          description="No hay transacciones de inventario registradas."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const sign = TRANSACTION_SIGNS[item.type] ?? "+";
            const isPositive = sign === "+";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRowClick(item.id)}
                className="text-left cursor-pointer"
              >
                <Card className="hover:border-brand/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        isPositive ? "bg-success/10" : "bg-error/10",
                      )}
                    >
                      {isPositive ? (
                        <ArrowDownLeft className="size-4 text-success" />
                      ) : (
                        <ArrowUpRight className="size-4 text-error" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            TRANSACTION_COLORS[item.type] ?? "bg-surface text-text-secondary",
                          )}
                        >
                          {TRANSACTION_LABELS[item.type] ?? item.type}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <span className="text-sm text-text-primary">
                        {item.productName}
                      </span>
                      <span className="font-mono text-xs text-text-secondary">
                        {item.productSku}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm font-bold",
                        isPositive ? "text-success" : "text-error",
                      )}
                    >
                      {sign}{item.quantity} {item.unitCode}
                    </span>
                  </div>
                </Card>
              </button>
            );
          })}

          {cursor && (
            <Button
              variant="ghost"
              loading={loading}
              onClick={loadMore}
              className="mt-2"
            >
              Cargar mas
            </Button>
          )}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de movimiento"
      >
        {detail && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Tipo</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  TRANSACTION_COLORS[detail.type] ?? "bg-surface text-text-secondary",
                )}
              >
                {TRANSACTION_LABELS[detail.type] ?? detail.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Producto</span>
              <span className="text-text-primary">{detail.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Cantidad</span>
              <span className="font-mono">
                {TRANSACTION_SIGNS[detail.type]}{detail.quantity} {detail.unitCode}
              </span>
            </div>
            {detail.zoneName && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Zona</span>
                <span>{detail.zoneName}</span>
              </div>
            )}
            {detail.batchCode && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Batch</span>
                <Link
                  href={`/batches/${detail.batchId}`}
                  className="text-brand underline"
                >
                  {detail.batchCode}
                </Link>
              </div>
            )}
            {detail.reason && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Razon</span>
                <span className="text-right max-w-[60%]">{detail.reason}</span>
              </div>
            )}
            {detail.costTotal && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Costo total</span>
                <span className="font-mono">${Number(detail.costTotal).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-secondary">Usuario</span>
              <span>{detail.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Fecha</span>
              <span className="text-xs">
                {new Date(detail.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
