"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import {
  getTestHistory,
  getTrendData,
  type TestHistoryItem,
  type HistoryFilterOptions,
  type TrendDataPoint,
} from "@/lib/actions/quality";
import dynamic from "next/dynamic";

const TrendChart = dynamic(() => import("./trend-chart").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <p className="text-xs text-text-secondary py-4">Cargando grafico...</p>,
});

type Props = {
  initialData: { items: TestHistoryItem[]; nextCursor: string | null };
  filterOptions: HistoryFilterOptions;
};

export function HistoryTable({ initialData, filterOptions }: Props) {
  const [items, setItems] = useState(initialData.items);
  const [cursor, setCursor] = useState(initialData.nextCursor);
  const [loading, setLoading] = useState(false);

  // Filters
  const [cultivarId, setCultivarId] = useState("");
  const [testType, setTestType] = useState("");
  const [passFilter, setPassFilter] = useState("");

  // Trend
  const [trendCultivar, setTrendCultivar] = useState("");
  const [trendParameter, setTrendParameter] = useState("");
  const [trendData, setTrendData] = useState<TrendDataPoint[] | null>(null);
  const [showTrend, setShowTrend] = useState(false);

  const applyFilters = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTestHistory({
        cultivarId: cultivarId || undefined,
        testType: testType || undefined,
        passFilter: passFilter || undefined,
      });
      setItems(result.items);
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cultivarId, testType, passFilter]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await getTestHistory({
        cultivarId: cultivarId || undefined,
        testType: testType || undefined,
        passFilter: passFilter || undefined,
        cursor,
      });
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, cultivarId, testType, passFilter]);

  const loadTrend = useCallback(async () => {
    if (!trendCultivar || !trendParameter) return;
    const data = await getTrendData(trendCultivar, trendParameter);
    setTrendData(data);
  }, [trendCultivar, trendParameter]);

  const selectClasses = cn(
    "h-10 rounded-input border border-border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none",
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/quality">
            <button type="button" className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <h1 className="text-xl font-bold text-text-primary">Historial de calidad</h1>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={TrendingUp}
          onClick={() => setShowTrend(!showTrend)}
        >
          {showTrend ? "Ocultar tendencia" : "Ver tendencia"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className={selectClasses}
          value={cultivarId}
          onChange={(e) => { setCultivarId(e.target.value); }}
        >
          <option value="">Todos los cultivares</option>
          {filterOptions.cultivars.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className={selectClasses}
          value={testType}
          onChange={(e) => { setTestType(e.target.value); }}
        >
          <option value="">Todos los tipos</option>
          {filterOptions.testTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className={selectClasses}
          value={passFilter}
          onChange={(e) => { setPassFilter(e.target.value); }}
        >
          <option value="">Todos</option>
          <option value="pass">Aprobados</option>
          <option value="fail">Fallidos</option>
        </select>
        <Button size="sm" onClick={applyFilters} loading={loading}>
          Filtrar
        </Button>
      </div>

      {/* Trend chart */}
      {showTrend && (
        <div className="mb-6 rounded-lg border border-border p-4">
          <h2 className="text-sm font-bold text-text-primary mb-3">Tendencia por parametro</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              className={selectClasses}
              value={trendCultivar}
              onChange={(e) => { setTrendCultivar(e.target.value); setTrendData(null); }}
            >
              <option value="">Seleccionar cultivar...</option>
              {filterOptions.cultivars.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              className={cn(selectClasses, "w-40")}
              placeholder="Parametro (ej: THC)"
              value={trendParameter}
              onChange={(e) => { setTrendParameter(e.target.value); setTrendData(null); }}
            />
            <Button size="sm" variant="ghost" onClick={loadTrend} disabled={!trendCultivar || !trendParameter}>
              Cargar
            </Button>
          </div>
          {trendData && trendData.length >= 3 ? (
            <TrendChart data={trendData} parameter={trendParameter} />
          ) : trendData && trendData.length < 3 ? (
            <p className="text-xs text-text-secondary">Se necesitan al menos 3 datos para tendencia.</p>
          ) : null}
        </div>
      )}

      {/* Results table */}
      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Sin historial"
          description="No hay tests completados con los filtros seleccionados."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Link key={item.id} href={`/quality/${item.id}`}>
              <div className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-brand/30 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary">{item.testType}</span>
                    <span className="text-xs text-text-secondary">{item.cultivarName}</span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    Batch: <span className="font-mono">{item.batchCode}</span>
                    {" — "}{item.parameterCount} parametros
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary">{item.resultDate}</span>
                  {item.overallPass ? (
                    <Badge variant="success">
                      <CheckCircle className="inline size-3 mr-0.5" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="error">
                      <XCircle className="inline size-3 mr-0.5" />
                      Fail
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {cursor && (
        <div className="mt-4 text-center">
          <Button size="sm" variant="ghost" onClick={loadMore} loading={loading}>
            Cargar mas
          </Button>
        </div>
      )}
    </>
  );
}
