"use client";

import { useRef, useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import { getTransactions, type TransactionListItem } from "@/lib/actions/inventory";

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

const TYPE_LABELS: Record<string, string> = {
  receipt: "Recepcion",
  consumption: "Consumo",
  application: "Aplicacion",
  transfer_out: "Transferencia salida",
  transfer_in: "Transferencia entrada",
  transformation_out: "Transformacion salida",
  transformation_in: "Transformacion entrada",
  adjustment: "Ajuste",
  waste: "Desperdicio",
  return: "Devolucion",
  reservation: "Reserva",
  release: "Liberacion",
};

type Props = {
  batchId: string;
};

export function BatchInventoryTab({ batchId }: Props) {
  const [transactions, setTransactions] = useState<TransactionListItem[] | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    getTransactions({ batchId }).then((result) => {
      setTransactions(result.items);
    });
  }, [batchId]);

  if (transactions === null) {
    return <p className="text-sm text-text-secondary py-4">Cargando...</p>;
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Sin movimientos"
        description="No hay transacciones de inventario para este batch."
      />
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-text-primary mb-3">
        Movimientos de inventario
      </h3>
      {transactions.map((tx) => {
        const sign = TRANSACTION_SIGNS[tx.type] ?? "+";
        const isPositive = sign === "+";

        return (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="outlined">
                  {TYPE_LABELS[tx.type] ?? tx.type}
                </Badge>
                <span className="text-xs text-text-secondary">
                  {tx.productName}
                </span>
              </div>
              {tx.reason && (
                <span className="text-xs text-text-secondary">{tx.reason}</span>
              )}
            </div>
            <div className="text-right">
              <span
                className={cn(
                  "font-mono text-sm font-bold",
                  isPositive ? "text-success" : "text-error",
                )}
              >
                {sign}{tx.quantity} {tx.unitCode}
              </span>
              <p className="text-xs text-text-secondary">{tx.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
