import { Zap } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function ActivitiesPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={Zap}
        title="Actividades"
        description="Programacion y ejecucion de actividades. Proximamente."
      />
    </div>
  );
}
