"use client";

import Link from "next/link";
import { Plus, FlaskConical, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import type { PendingTest } from "@/lib/actions/quality";

type Props = {
  initialData: PendingTest[];
};

function daysWaitingVariant(days: number): "success" | "warning" | "error" {
  if (days <= 3) return "success";
  if (days <= 7) return "warning";
  return "error";
}

export function PendingTests({ initialData }: Props) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Tests de calidad</h1>
        <Link href="/quality/new">
          <Button icon={Plus} size="sm">
            Nuevo test
          </Button>
        </Link>
      </div>

      {initialData.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Sin tests pendientes"
          description="No hay tests de calidad en espera de resultados."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {initialData.map((test) => (
            <Link key={test.id} href={`/quality/${test.id}`}>
              <Card className="hover:border-brand/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-text-primary">
                        {test.testType}
                      </span>
                      <Badge variant="outlined">{test.status}</Badge>
                      <Badge variant={daysWaitingVariant(test.daysWaiting)}>
                        <Clock className="inline size-3 mr-0.5" />
                        {test.daysWaiting}d
                      </Badge>
                    </div>
                    <span className="text-xs text-text-secondary">
                      Batch: <span className="font-mono">{test.batchCode}</span>
                      {test.phaseName && ` — ${test.phaseName}`}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {test.labName && `Lab: ${test.labName} — `}
                      Muestra: {test.sampleDate}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href="/quality/history" className="text-sm text-brand hover:underline">
          Ver historial completo →
        </Link>
      </div>
    </>
  );
}
