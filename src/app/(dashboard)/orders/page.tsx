import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function OrdersPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={ClipboardList}
        title="Ordenes"
        description="Ordenes de produccion y seguimiento. Proximamente."
      />
    </div>
  );
}
