import { Settings } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
      <EmptyState
        icon={Settings}
        title="Configuracion"
        description="Tipos de cultivo, cultivares, usuarios y ajustes. Proximamente."
      />
    </div>
  );
}
