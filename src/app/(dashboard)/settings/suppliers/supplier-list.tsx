"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { supplierSchema, type SupplierFormData } from "@/lib/schemas/supplier";
import {
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
  type SupplierListItem,
} from "@/lib/actions/suppliers";

type Props = { initialData: SupplierListItem[] };

export function SupplierList({ initialData }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  const hasInactive = initialData.some((s) => !s.isActive);
  let filtered = showInactive
    ? initialData
    : initialData.filter((s) => s.isActive);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s) => s.name.toLowerCase().includes(q));
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    reset({ name: "", email: "", phone: "", address: "", website: "", paymentTerms: "" });
    setShowDialog(true);
  }, [reset]);

  const openEdit = useCallback(
    (s: SupplierListItem) => {
      setEditingId(s.id);
      reset({
        name: s.name,
        email: s.contactInfo.email ?? "",
        phone: s.contactInfo.phone ?? "",
        address: s.contactInfo.address ?? "",
        website: s.contactInfo.website ?? "",
        paymentTerms: s.paymentTerms ?? "",
      });
      setShowDialog(true);
    },
    [reset],
  );

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setEditingId(null);
  }, []);

  async function onSubmit(data: SupplierFormData) {
    const result = editingId
      ? await updateSupplier({ ...data, id: editingId })
      : await createSupplier(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? "Proveedor actualizado" : "Proveedor creado");
    handleClose();
    router.refresh();
  }

  async function handleToggle(s: SupplierListItem) {
    const result = await toggleSupplierActive(s.id, !s.isActive);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(s.isActive ? "Proveedor desactivado" : "Proveedor reactivado");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Proveedores</h1>
        <div className="flex items-center gap-3">
          {hasInactive && (
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Inactivos
            </label>
          )}
          <Button variant="primary" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>
      </div>

      <Input
        label="Buscar"
        placeholder="Buscar proveedor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sin proveedores"
          description="Crea el primer proveedor"
          action={{ label: "Nuevo proveedor", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className={cn(
                "flex items-center gap-4 p-4",
                !s.isActive && "opacity-50",
              )}
            >
              <div
                className="flex flex-1 cursor-pointer flex-col gap-1"
                onClick={() => openEdit(s)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {s.name}
                  </span>
                  {!s.isActive && <Badge variant="warning">Inactivo</Badge>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                  {s.contactInfo.email && <span>{s.contactInfo.email}</span>}
                  {s.contactInfo.phone && <span>{s.contactInfo.phone}</span>}
                  {s.paymentTerms && <span>{s.paymentTerms}</span>}
                </div>
                <span className="text-xs text-text-secondary">
                  {s.productCount} productos
                </span>
              </div>
              <button
                onClick={() => handleToggle(s)}
                className="shrink-0 text-xs text-text-secondary hover:text-text-primary"
              >
                {s.isActive ? "Desactivar" : "Reactivar"}
              </button>
              <Pencil
                className="size-4 shrink-0 cursor-pointer text-text-secondary"
                onClick={() => openEdit(s)}
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={handleClose}
        title={editingId ? "Editar proveedor" : "Nuevo proveedor"}
        footer={
          <Button
            type="submit"
            form="supplier-form"
            loading={isSubmitting}
            className="w-full"
          >
            {editingId ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        }
      >
        <form
          id="supplier-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Nombre"
            placeholder="Agroquimicos S.A."
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Email"
            type="email"
            placeholder="contacto@proveedor.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Telefono"
            placeholder="+57 300 123 4567"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="Direccion"
            placeholder="Calle 1 #2-3, Ciudad"
            error={errors.address?.message}
            {...register("address")}
          />
          <Input
            label="Sitio web"
            placeholder="www.proveedor.com"
            error={errors.website?.message}
            {...register("website")}
          />
          <Input
            label="Terminos de pago"
            placeholder="30 dias neto"
            error={errors.paymentTerms?.message}
            {...register("paymentTerms")}
          />
        </form>
      </Dialog>
    </div>
  );
}
