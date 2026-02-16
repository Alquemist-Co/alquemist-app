"use client";

import { useState } from "react";
import { Plus, Leaf, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/data/stat-card";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Table, type Column } from "@/components/ui/table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/shared/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";

// --- Section wrapper ---
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-2xl font-bold text-text-primary border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

// --- Sample table data ---
type BatchRow = {
  id: string;
  cultivar: string;
  phase: string;
  yield: string;
  units: number;
};

const tableColumns: Column<BatchRow>[] = [
  { key: "id", header: "ID", sortable: true, mobileVisible: true },
  { key: "cultivar", header: "Cultivar", sortable: true, mobileVisible: true },
  { key: "phase", header: "Fase", sortable: true, mobileVisible: true },
  { key: "yield", header: "Yield", numeric: true, sortable: true, mobileVisible: true },
  { key: "units", header: "Unidades", numeric: true, sortable: true, mobileVisible: false },
];

const tableData: BatchRow[] = [
  { id: "BAT-001", cultivar: "OG Kush", phase: "Vegetativo", yield: "85.2%", units: 120 },
  { id: "BAT-002", cultivar: "Blue Dream", phase: "Floración", yield: "91.7%", units: 200 },
  { id: "BAT-003", cultivar: "Sour Diesel", phase: "Secado", yield: "78.5%", units: 80 },
  { id: "BAT-004", cultivar: "Girl Scout Cookies", phase: "Curado", yield: "93.1%", units: 150 },
];

// --- Page ---
export default function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggleOn, setToggleOn] = useState(false);
  const [toggleDisabled] = useState(true);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-14">
        <h1 className="text-4xl font-bold text-text-primary">Design System</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Alquemist — Componentes base UI
        </p>
      </header>

      <div className="flex flex-col gap-16">
        {/* --- Buttons --- */}
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={Plus}>Con icono</Button>
            <Button loading>Cargando</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled>Secondary disabled</Button>
            <Button variant="ghost" disabled>Ghost disabled</Button>
            <Button variant="secondary" loading>Secondary loading</Button>
          </div>
        </Section>

        {/* --- Cards --- */}
        <Section title="Cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <h3 className="font-bold">Card base</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Contenido de ejemplo con borde hover a brand color.
              </p>
            </Card>
            <Card>
              <h3 className="font-bold">Otra card</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Sin shadows, estilo flat editorial.
              </p>
            </Card>
          </div>

          <h3 className="text-sm font-bold text-text-secondary mt-2">Stat Cards</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={42} label="Batches activos" color="brand" />
            <StatCard value="91.7%" label="Yield promedio" color="success" />
            <StatCard value={3} label="Alertas" color="warning" />
            <StatCard value={1} label="Errores criticos" color="error" />
          </div>
        </Section>

        {/* --- Inputs --- */}
        <Section title="Inputs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nombre del cultivar" placeholder="Ej: OG Kush" />
            <Input label="Cantidad" type="number" inputMode="decimal" placeholder="0.00" />
            <Input label="Con error" error="Este campo es requerido" defaultValue="" />
            <Input label="Deshabilitado" disabled defaultValue="No editable" />
          </div>
        </Section>

        {/* --- Toggles --- */}
        <Section title="Toggles">
          <div className="flex flex-col gap-4">
            <Toggle
              checked={toggleOn}
              onChange={setToggleOn}
              label={toggleOn ? "Activado" : "Desactivado"}
            />
            <Toggle
              checked={toggleDisabled}
              onChange={() => {}}
              disabled
              label="Deshabilitado (on)"
            />
          </div>
        </Section>

        {/* --- Badges --- */}
        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Filled</Badge>
            <Badge variant="outlined">Outlined</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </div>
          <div className="max-w-[200px]">
            <Badge>Texto muy largo que debe truncarse con ellipsis al llegar al limite</Badge>
          </div>
        </Section>

        {/* --- Dialog --- */}
        <Section title="Dialog">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Abrir Dialog
          </Button>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Confirmar accion"
            footer={
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setDialogOpen(false)}>
                  Confirmar
                </Button>
              </div>
            }
          >
            <p className="text-sm text-text-secondary">
              Esta es una demostración del componente Dialog. En mobile se muestra como
              bottom sheet, en desktop como modal centrado. Puedes cerrar con Escape,
              click en overlay, o el botón X.
            </p>
          </Dialog>
        </Section>

        {/* --- Table --- */}
        <Section title="Table">
          <Table
            columns={tableColumns}
            data={tableData}
            onRowClick={(row) => toast.info(`Click en ${row.id}`)}
          />
        </Section>

        {/* --- Toasts --- */}
        <Section title="Toasts">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => toast.success("Actividad completada")}
            >
              Toast Success
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.error("Error al guardar los cambios")}
            >
              Toast Error
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.warning("Stock bajo en zona A")}
            >
              Toast Warning
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info("Sincronización completa")}
            >
              Toast Info
            </Button>
          </div>
        </Section>

        {/* --- Progress Bar --- */}
        <Section title="Progress Bar">
          <div className="flex flex-col gap-4">
            <ProgressBar value={0} label="Sin progreso" />
            <ProgressBar value={35} label="Vegetativo" color="warning" />
            <ProgressBar value={72} label="Floración" />
            <ProgressBar value={100} label="Completo" color="success" />
          </div>
        </Section>

        {/* --- Skeleton --- */}
        <Section title="Skeleton">
          <div className="flex flex-col gap-3">
            <Skeleton variant="text" />
            <Skeleton variant="text" className="w-3/4" />
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton variant="text" />
                <Skeleton variant="text" className="w-1/2" />
              </div>
            </div>
            <Skeleton variant="card" />
            <Skeleton variant="table-row" />
            <Skeleton variant="table-row" />
          </div>
        </Section>

        {/* --- Empty State --- */}
        <Section title="Empty State">
          <Card>
            <EmptyState
              icon={Leaf}
              title="No hay batches activos"
              description="Crea una orden de producción para comenzar."
              action={{ label: "Ir a Órdenes", onClick: () => toast.info("Navegando a órdenes...") }}
            />
          </Card>
          <Card>
            <EmptyState
              icon={Package}
              title="Sin inventario"
              description="Aún no hay productos registrados en el sistema."
            />
          </Card>
        </Section>
      </div>
    </div>
  );
}
