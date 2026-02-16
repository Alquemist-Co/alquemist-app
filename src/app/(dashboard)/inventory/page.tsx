import { Package } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function InventoryPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={Package}
        title="Inventario"
        description="Stock, movimientos y productos. Proximamente."
      />
    </div>
  );
}
