import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function AreasPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={MapPin}
        title="Areas"
        description="Zonas, invernaderos y posiciones. Proximamente."
      />
    </div>
  );
}
