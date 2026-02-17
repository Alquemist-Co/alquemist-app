"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { GitBranch } from "lucide-react";
import type { LineageOperation } from "@/lib/actions/batch-genealogy";

type Props = {
  operations: LineageOperation[];
};

const OP_LABELS: Record<string, string> = {
  split: "Division",
  merge: "Fusion",
};

const OP_VARIANTS: Record<string, "info" | "warning"> = {
  split: "info",
  merge: "warning",
};

export function OperationsTable({ operations }: Props) {
  if (operations.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Sin operaciones"
        description="No se han registrado divisiones ni fusiones."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {operations.map((op) => (
        <div
          key={op.id}
          className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={OP_VARIANTS[op.operation] ?? "outlined"}>
              {OP_LABELS[op.operation] ?? op.operation}
            </Badge>
            <span className="text-xs text-text-secondary">
              <Link href={`/batches/${op.parentBatchId}`} className="font-mono text-brand hover:underline">
                {op.parentCode}
              </Link>
              {" → "}
              <Link href={`/batches/${op.childBatchId}`} className="font-mono text-brand hover:underline">
                {op.childCode}
              </Link>
            </span>
            <span className="font-mono text-xs text-text-primary">
              {op.quantity} {op.unitCode}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-text-secondary">{op.performedByName}</span>
            <span className="text-xs font-mono text-text-secondary">{op.performedAt}</span>
          </div>
          {op.reason && (
            <p className="text-xs text-text-secondary mt-1 sm:mt-0 sm:hidden">
              {op.reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
