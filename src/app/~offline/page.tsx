import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-warning/10">
          <WifiOff className="size-8 text-warning" />
        </div>
        <h1 className="text-xl font-bold text-primary">Sin conexión</h1>
        <p className="max-w-sm text-sm text-secondary">
          No hay conexión a internet. Verifica tu conexión e intenta de nuevo.
        </p>
      </div>
    </div>
  );
}
