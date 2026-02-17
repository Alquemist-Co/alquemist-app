"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Shield, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getBatchTests, type PendingTest } from "@/lib/actions/quality";

type Props = {
  batchId: string;
};

export function BatchQualityTab({ batchId }: Props) {
  const [tests, setTests] = useState<PendingTest[] | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    getBatchTests(batchId).then((data) => {
      setTests(data);
    });
  }, [batchId]);

  if (tests === null) {
    return <p className="text-sm text-text-secondary py-4">Cargando...</p>;
  }

  if (tests.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="Sin tests"
        description="No hay tests de calidad para este batch."
      />
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-text-primary mb-3">
        Tests de calidad
      </h3>
      {tests.map((test) => (
        <Link key={test.id} href={`/quality/${test.id}`}>
          <div className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-brand/30 transition-colors">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  {test.testType}
                </span>
                <Badge variant="outlined">{test.status}</Badge>
              </div>
              {test.phaseName && (
                <span className="text-xs text-text-secondary">
                  Fase: {test.phaseName}
                </span>
              )}
              <span className="text-xs text-text-secondary">
                Muestra: {test.sampleDate}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {test.status === "completed" ? (
                (test as unknown as { overallPass: boolean | null }).overallPass ? (
                  <Badge variant="success">
                    <CheckCircle className="inline size-3 mr-0.5" />
                    Aprobado
                  </Badge>
                ) : (
                  <Badge variant="error">
                    <XCircle className="inline size-3 mr-0.5" />
                    Fallido
                  </Badge>
                )
              ) : (
                <Badge variant="warning">
                  <Clock className="inline size-3 mr-0.5" />
                  {test.daysWaiting}d
                </Badge>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
