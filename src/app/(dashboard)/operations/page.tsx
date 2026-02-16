import { Radio } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function OperationsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={Radio}
        title="Operaciones"
        description="Monitoreo ambiental, sensores y alertas. Proximamente."
      />
    </div>
  );
}
