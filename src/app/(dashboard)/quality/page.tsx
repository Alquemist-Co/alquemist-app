import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function QualityPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={FlaskConical}
        title="Calidad"
        description="Tests de calidad e historial. Proximamente."
      />
    </div>
  );
}
