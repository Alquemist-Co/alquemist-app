"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Package, Pencil, Power, PowerOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  deactivateProduct,
  reactivateProduct,
  type ProductListItem,
  type ProductFormData,
} from "@/lib/actions/inventory";

type Props = {
  initialData: ProductListItem[];
  formData: ProductFormData;
};

const PROCUREMENT_LABELS: Record<string, string> = {
  purchased: "Comprado",
  produced: "Producido",
  both: "Ambos",
};

export function ProductList({ initialData, formData }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<ProductListItem | null>(null);

  const filtered = useMemo(() => {
    let items = initialData;

    if (!showInactive) {
      items = items.filter((p) => p.isActive);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }

    if (categoryFilter) {
      items = items.filter((p) => p.categoryId === categoryFilter);
    }

    if (typeFilter) {
      items = items.filter((p) => p.procurementType === typeFilter);
    }

    return items;
  }, [initialData, search, categoryFilter, typeFilter, showInactive]);

  const hasInactive = initialData.some((p) => !p.isActive);

  const handleDeactivate = useCallback(async () => {
    if (!confirmDeactivate) return;
    setDeactivating(confirmDeactivate.id);

    const result = await deactivateProduct(confirmDeactivate.id);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Producto desactivado");
      router.refresh();
    }

    setDeactivating(null);
    setConfirmDeactivate(null);
  }, [confirmDeactivate, router]);

  const handleReactivate = useCallback(
    async (id: string) => {
      const result = await reactivateProduct(id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Producto reactivado");
        router.refresh();
      }
    },
    [router],
  );

  const selectClasses = cn(
    "h-10 rounded-input border border-border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none",
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Productos</h1>
        <Link href="/inventory/products/new">
          <Button icon={Plus} size="sm">
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          label="Buscar"
          placeholder="Buscar por SKU o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          className={selectClasses}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas las categorias</option>
          {formData.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={selectClasses}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="purchased">Comprado</option>
          <option value="produced">Producido</option>
          <option value="both">Ambos</option>
        </select>
      </div>

      {hasInactive && (
        <label className="mb-4 flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-brand"
          />
          Mostrar inactivos
        </label>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin productos"
          description={
            search || categoryFilter || typeFilter
              ? "No se encontraron productos con esos filtros."
              : "Crea el primero para comenzar a gestionar inventario."
          }
          action={
            !search && !categoryFilter && !typeFilter
              ? {
                  label: "Crear primer producto",
                  onClick: () => router.push("/inventory/products/new"),
                }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/inventory/products/${p.id}`}>
              <Card
                className={cn(
                  "flex items-center gap-4",
                  !p.isActive && "opacity-50",
                )}
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text-primary">
                      {p.name}
                    </span>
                    <Badge variant="outlined">
                      {PROCUREMENT_LABELS[p.procurementType] ?? p.procurementType}
                    </Badge>
                    {!p.isActive && <Badge variant="warning">Inactivo</Badge>}
                  </div>
                  <span className="font-mono text-xs text-text-secondary">
                    {p.sku}
                  </span>
                  <div className="flex gap-4 text-xs text-text-secondary flex-wrap">
                    <span>{p.categoryName}</span>
                    <span>{p.unitCode}</span>
                    {p.defaultPrice && (
                      <span className="font-mono">
                        ${Number(p.defaultPrice).toLocaleString()}
                      </span>
                    )}
                    {p.preferredSupplierName && (
                      <span>{p.preferredSupplierName}</span>
                    )}
                    {p.itemCount > 0 && (
                      <span>{p.itemCount} lotes</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!p.isActive ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReactivate(p.id);
                      }}
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-button",
                        "text-text-secondary hover:bg-surface hover:text-success",
                        "transition-colors duration-150 cursor-pointer",
                      )}
                      aria-label={`Reactivar ${p.name}`}
                    >
                      <Power className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConfirmDeactivate(p);
                      }}
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-button",
                        "text-text-secondary hover:bg-surface hover:text-error",
                        "transition-colors duration-150 cursor-pointer",
                      )}
                      aria-label={`Desactivar ${p.name}`}
                    >
                      <PowerOff className="size-4" />
                    </button>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Deactivate confirmation dialog */}
      <Dialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title="Desactivar producto"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setConfirmDeactivate(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              className="flex-1 border-error text-error hover:bg-error hover:text-white"
              loading={!!deactivating}
              onClick={handleDeactivate}
            >
              Desactivar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          {confirmDeactivate?.itemCount
            ? `Este producto tiene ${confirmDeactivate.itemCount} lotes con stock. Desactivar no eliminara el inventario existente.`
            : `¿Desactivar "${confirmDeactivate?.name}"? No aparecera en selectores de otros modulos.`}
        </p>
      </Dialog>
    </>
  );
}
