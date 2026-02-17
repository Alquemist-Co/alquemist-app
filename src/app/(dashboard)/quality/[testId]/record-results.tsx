"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, CheckCircle, XCircle, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { recordResults, uploadCertificate, type TestDetail } from "@/lib/actions/quality";

type Props = {
  test: TestDetail;
};

type ResultLine = {
  key: number;
  parameter: string;
  value: string;
  unit: string;
  minThreshold: string;
  maxThreshold: string;
};

export function RecordResults({ test }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState(test.notes ?? "");

  const isCompleted = test.status === "completed";

  // For recording new results
  const [lines, setLines] = useState<ResultLine[]>([
    { key: 1, parameter: "", value: "", unit: "", minThreshold: "", maxThreshold: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      { key: nextKey, parameter: "", value: "", unit: "", minThreshold: "", maxThreshold: "" },
    ]);
    setNextKey((k) => k + 1);
  }, [nextKey]);

  const removeLine = useCallback((key: number) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback(
    (key: number, field: keyof ResultLine, value: string) => {
      setLines((prev) =>
        prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)),
      );
    },
    [],
  );

  const computeOverallPass = useCallback((): boolean => {
    return lines.every((l) => {
      if (!l.value || (!l.minThreshold && !l.maxThreshold)) return true;
      const num = parseFloat(l.value);
      if (isNaN(num)) return true;
      const min = l.minThreshold ? parseFloat(l.minThreshold) : -Infinity;
      const max = l.maxThreshold ? parseFloat(l.maxThreshold) : Infinity;
      return num >= min && num <= max;
    });
  }, [lines]);

  async function handleSubmit() {
    if (lines.filter((l) => l.parameter && l.value).length === 0) {
      toast.error("Agrega al menos un resultado");
      return;
    }

    setSubmitting(true);
    try {
      const overallPass = computeOverallPass();
      const results = lines
        .filter((l) => l.parameter && l.value)
        .map((l) => ({
          parameter: l.parameter,
          value: l.value,
          numericValue: parseFloat(l.value) || undefined,
          unit: l.unit || undefined,
          minThreshold: l.minThreshold ? parseFloat(l.minThreshold) : undefined,
          maxThreshold: l.maxThreshold ? parseFloat(l.maxThreshold) : undefined,
        }));

      const result = await recordResults({
        testId: test.id,
        results,
        overallPass,
        notes,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        overallPass
          ? "Resultados registrados — Test aprobado"
          : "Resultados registrados — Test fallido, alerta generada",
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{test.testType}</h1>
          <p className="text-xs text-text-secondary">
            Batch:{" "}
            <Link href={`/batches/${test.batchId}`} className="text-brand hover:underline font-mono">
              {test.batchCode}
            </Link>
            {test.phaseName && ` — ${test.phaseName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {test.overallPass !== null && (
            test.overallPass ? (
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
          )}
          <Badge variant="outlined">{test.status}</Badge>
        </div>
      </div>

      {/* Test info */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-text-secondary">Muestra</p>
            <p>{test.sampleDate}</p>
          </div>
          {test.resultDate && (
            <div>
              <p className="text-xs text-text-secondary">Resultado</p>
              <p>{test.resultDate}</p>
            </div>
          )}
          {test.labName && (
            <div>
              <p className="text-xs text-text-secondary">Laboratorio</p>
              <p>{test.labName}</p>
            </div>
          )}
          {test.performedByName && (
            <div>
              <p className="text-xs text-text-secondary">Realizado por</p>
              <p>{test.performedByName}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Existing results */}
      {test.results.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-text-primary">Resultados</h2>
          <div className="flex flex-col gap-2">
            {test.results.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3",
                  r.passed === true && "border-success/30 bg-success/5",
                  r.passed === false && "border-error/30 bg-error/5",
                  r.passed === null && "border-border",
                )}
              >
                <div>
                  <p className="text-sm font-bold text-text-primary">{r.parameter}</p>
                  {r.unit && <p className="text-xs text-text-secondary">{r.unit}</p>}
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{r.value}</p>
                  {(r.minThreshold || r.maxThreshold) && (
                    <p className="text-xs text-text-secondary">
                      Rango: {r.minThreshold ?? "—"} – {r.maxThreshold ?? "—"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record new results (only if not completed) */}
      {!isCompleted && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-text-primary">Registrar resultados</h2>

          <div className="flex flex-col gap-3">
            {lines.map((line) => (
              <div key={line.key} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input
                    label="Parametro"
                    placeholder="THC"
                    value={line.parameter}
                    onChange={(e) => updateLine(line.key, "parameter", e.target.value)}
                  />
                  <Input
                    label="Valor"
                    placeholder="18.5"
                    value={line.value}
                    onChange={(e) => updateLine(line.key, "value", e.target.value)}
                  />
                  <Input
                    label="Min"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={line.minThreshold}
                    onChange={(e) => updateLine(line.key, "minThreshold", e.target.value)}
                  />
                  <Input
                    label="Max"
                    type="number"
                    step="0.01"
                    placeholder="25"
                    value={line.maxThreshold}
                    onChange={(e) => updateLine(line.key, "maxThreshold", e.target.value)}
                  />
                </div>
                {lines.length > 1 && (
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
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            icon={Plus}
            size="sm"
            onClick={addLine}
            className="mt-2"
          >
            Agregar parametro
          </Button>

          <div className="mt-2">
            <Input
              label="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <Button variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              Registrar resultados
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
