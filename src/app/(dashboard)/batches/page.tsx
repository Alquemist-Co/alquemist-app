import { Sprout } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function BatchesPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={Sprout}
        title="Batches"
        description="Gestion de lotes de produccion. Proximamente."
      />
    </div>
  );
}
