import Link from "next/link";
import {
  Sprout,
  FlaskConical,
  Users,
  Zap,
  Building2,
  Map,
  Truck,
  Ruler,
  FolderTree,
  Activity,
  Building,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const SETTINGS_LINKS = [
  {
    href: "/settings/facilities",
    icon: Building2,
    title: "Facilities",
    description: "Invernaderos, bodegas y campos de cultivo",
  },
  {
    href: "/settings/zones",
    icon: Map,
    title: "Zonas",
    description: "Zonas dentro de cada facility con proposito y ambiente",
  },
  {
    href: "/settings/crop-types",
    icon: Sprout,
    title: "Tipos de cultivo",
    description: "Tipos de cultivo, fases de produccion y flujos de producto",
  },
  {
    href: "/settings/cultivars",
    icon: FlaskConical,
    title: "Cultivares",
    description: "Variedades, duraciones por fase y condiciones optimas",
  },
  {
    href: "/settings/templates",
    icon: Zap,
    title: "Templates de actividad",
    description: "Recetas reutilizables con recursos, checklist y fases",
  },
  {
    href: "/settings/activity-types",
    icon: Activity,
    title: "Tipos de actividad",
    description: "Clasificacion de actividades para templates y reportes",
  },
  {
    href: "/settings/categories",
    icon: FolderTree,
    title: "Categorias de recursos",
    description: "Categorias jerarquicas para productos e inventario",
  },
  {
    href: "/settings/units",
    icon: Ruler,
    title: "Unidades de medida",
    description: "Unidades con conversiones y dimensiones",
  },
  {
    href: "/settings/suppliers",
    icon: Truck,
    title: "Proveedores",
    description: "Proveedores de insumos y materiales",
  },
  {
    href: "/settings/users",
    icon: Users,
    title: "Usuarios",
    description: "Crear y gestionar usuarios del sistema",
  },
  {
    href: "/settings/company",
    icon: Building,
    title: "Empresa",
    description: "Datos de la empresa, zona horaria y moneda",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary">
        Configuracion
      </h1>

      <div className="grid gap-3 sm:grid-cols-2">
        {SETTINGS_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="flex items-start gap-4 p-5">
              <link.icon
                className="mt-0.5 size-6 shrink-0 text-brand"
                strokeWidth={1.5}
              />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-text-primary">
                  {link.title}
                </span>
                <span className="text-xs text-text-secondary">
                  {link.description}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
