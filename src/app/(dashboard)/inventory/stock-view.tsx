"use client";

import { useState, useMemo, useCallback } from "react";
import { Package, AlertTriangle, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import {
  type StockByProduct,
  type StockByZone,
  type LowStockAlert,
  type ProductLot,
  getProductLots,
} from "@/lib/actions/inventory";

type Props = {
  stockByProduct: StockByProduct[];
  stockByZone: StockByZone[];
  alerts: LowStockAlert[];
};

type ViewMode = "product" | "zone";

const LOT_STATUS_COLORS: Record<string, string> = {
  available: "bg-success/10 text-success",
  quarantine: "bg-warning/10 text-warning",
  expired: "bg-error/10 text-error",
  depleted: "bg-text-secondary/10 text-text-secondary",
};

export function StockView({ stockByProduct, stockByZone, alerts }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("product");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<StockByProduct | null>(null);
  const [lots, setLots] = useState<ProductLot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [showDepleted, setShowDepleted] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const filteredProducts = useMemo(() => {
    if (!search) return stockByProduct;
    const q = search.toLowerCase();
    return stockByProduct.filter(
      (p) => p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [stockByProduct, search]);

  const handleProductClick = useCallback(async (product: StockByProduct) => {
    setSelectedProduct(product);
    setLotsLoading(true);
    try {
      const data = await getProductLots(product.productId);
      setLots(data);
    } finally {
      setLotsLoading(false);
    }
  }, []);

  const toggleZone = useCallback((zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  }, []);

  const visibleLots = showDepleted
    ? lots
    : lots.filter((l) => l.quantityAvailable > 0 || l.quantityReserved > 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Stock actual</h1>
        <div className="flex items-center gap-1 rounded-input border border-border p-1">
          <button
            type="button"
            onClick={() => setViewMode("product")}
            className={cn(
              "rounded-button px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
              viewMode === "product"
                ? "bg-brand text-brand-light"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Package className="inline size-3.5 mr-1" />
            Producto
          </button>
          <button
            type="button"
            onClick={() => setViewMode("zone")}
            className={cn(
              "rounded-button px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
              viewMode === "zone"
                ? "bg-brand text-brand-light"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <MapPin className="inline size-3.5 mr-1" />
            Zona
          </button>
        </div>
      </div>

      {/* Low stock alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-warning">
            <AlertTriangle className="size-4" />
            Alertas de stock bajo ({alerts.length})
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {alerts.map((a) => (
              <Card key={a.productId} className="border-warning/30 bg-warning/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-text-primary">{a.productName}</p>
                    <p className="font-mono text-xs text-text-secondary">{a.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-error">
                      {a.available} / {a.threshold} {a.unitCode}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Faltan {a.deficit.toFixed(1)} {a.unitCode}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {viewMode === "product" && (
        <Input
          label="Buscar"
          placeholder="Buscar por producto o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
      )}

      {/* Product view */}
      {viewMode === "product" && (
        <>
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Sin stock"
              description={search ? "Sin resultados para esta busqueda." : "No hay inventario registrado."}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.productId}
                  type="button"
                  onClick={() => handleProductClick(p)}
                  className="text-left cursor-pointer"
                >
                  <Card className="hover:border-brand/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-text-primary">
                            {p.productName}
                          </span>
                          <Badge variant="outlined">{p.categoryName}</Badge>
                        </div>
                        <span className="font-mono text-xs text-text-secondary">
                          {p.sku}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="font-mono text-sm font-bold text-text-primary">
                            {p.available} {p.unitCode}
                          </p>
                          <div className="flex gap-2 text-xs">
                            {p.reserved > 0 && (
                              <span className="text-warning">
                                {p.reserved} reservado
                              </span>
                            )}
                            {p.committed > 0 && (
                              <span className="text-error">
                                {p.committed} comprometido
                              </span>
                            )}
                          </div>
                        </div>
                        {p.minStockThreshold !== null && p.available < p.minStockThreshold && (
                          <AlertTriangle className="size-4 text-warning" />
                        )}
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Zone view */}
      {viewMode === "zone" && (
        <>
          {stockByZone.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Sin zonas"
              description="No hay zonas activas con inventario."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {stockByZone.map((z) => (
                <Card key={z.zoneId}>
                  <button
                    type="button"
                    onClick={() => toggleZone(z.zoneId)}
                    className="flex w-full items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {expandedZones.has(z.zoneId) ? (
                        <ChevronDown className="size-4 text-text-secondary" />
                      ) : (
                        <ChevronRight className="size-4 text-text-secondary" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-bold text-text-primary">{z.zoneName}</p>
                        <p className="text-xs text-text-secondary">{z.facilityName}</p>
                      </div>
                    </div>
                    <Badge variant="outlined">
                      {z.productCount} producto{z.productCount !== 1 ? "s" : ""}
                    </Badge>
                  </button>
                  {expandedZones.has(z.zoneId) && (
                    <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                      {z.items.length === 0 ? (
                        <p className="text-xs text-text-secondary">Sin stock</p>
                      ) : (
                        z.items.map((item) => (
                          <div
                            key={`${z.zoneId}-${item.productId}`}
                            className="flex items-center justify-between py-1"
                          >
                            <div>
                              <span className="text-sm text-text-primary">{item.productName}</span>
                              <span className="ml-2 font-mono text-xs text-text-secondary">
                                {item.sku}
                              </span>
                            </div>
                            <span className="font-mono text-sm text-text-primary">
                              {item.available} {item.unitCode}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Product detail dialog */}
      <Dialog
        open={!!selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          setLots([]);
        }}
        title={selectedProduct?.productName ?? "Detalle"}
      >
        {lotsLoading ? (
          <p className="text-sm text-text-secondary">Cargando lotes...</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs text-text-secondary">
                {selectedProduct?.sku}
              </p>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDepleted}
                  onChange={(e) => setShowDepleted(e.target.checked)}
                  className="accent-brand"
                />
                Mostrar agotados
              </label>
            </div>

            {visibleLots.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">
                Sin lotes disponibles
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                {visibleLots.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      {lot.batchNumber && (
                        <span className="font-mono text-xs text-text-primary">
                          {lot.batchNumber}
                        </span>
                      )}
                      {lot.zoneName && (
                        <span className="text-xs text-text-secondary">
                          {lot.zoneName}
                        </span>
                      )}
                      {lot.expirationDate && (
                        <span className="text-xs text-text-secondary">
                          Vence: {lot.expirationDate}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold">
                        {lot.quantityAvailable}
                      </p>
                      {lot.quantityReserved > 0 && (
                        <p className="font-mono text-xs text-warning">
                          +{lot.quantityReserved} reservado
                        </p>
                      )}
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                          LOT_STATUS_COLORS[lot.lotStatus] ?? "bg-surface text-text-secondary",
                        )}
                      >
                        {lot.lotStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
