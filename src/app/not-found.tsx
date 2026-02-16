import { Home } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <EmptyState
        icon={Home}
        title="Pagina no encontrada"
        description="La ruta que buscas no existe."
        action={{ label: "Volver al inicio", href: "/" }}
      />
    </div>
  );
}
