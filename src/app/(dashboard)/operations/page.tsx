import Link from "next/link";
import {
  Activity,
  Radio,
  Bell,
  DollarSign,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const MODULES = [
  {
    href: "/operations/environment",
    icon: Activity,
    title: "Monitoreo Ambiental",
    description: "Temperatura, humedad, CO2 y VPD en tiempo real",
  },
  {
    href: "/operations/sensors",
    icon: Radio,
    title: "Sensores",
    description: "Gestion de dispositivos IoT y calibracion",
  },
  {
    href: "/operations/alerts",
    icon: Bell,
    title: "Centro de Alertas",
    description: "Alertas activas, reconocimiento y resolucion",
  },
  {
    href: "/operations/costs",
    icon: DollarSign,
    title: "Costos Overhead",
    description: "Costos operativos y asignacion por batch",
  },
] as const;

export default function OperationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-6 font-sans text-xl font-bold text-text-primary">
        Operaciones
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="flex items-start gap-4 p-5 transition-colors hover:bg-surface">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <mod.icon className="size-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-bold text-text-primary">
                  {mod.title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {mod.description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
