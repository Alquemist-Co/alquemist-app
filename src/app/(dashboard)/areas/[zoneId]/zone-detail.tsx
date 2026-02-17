"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Sprout, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  getZoneBatches,
  type ZoneDetail,
  type ZoneBatch,
} from "@/lib/actions/areas";
import {
  getZoneConditions,
  type ZoneReading,
} from "@/lib/actions/environmental";
import { ClimateDials } from "./climate-dials";

type Props = {
  zone: ZoneDetail;
};

const PURPOSE_LABELS: Record<string, string> = {
  propagation: "Propagacion",
  vegetation: "Vegetacion",
  flowering: "Floracion",
  drying: "Secado",
  processing: "Proceso",
  storage: "Almacen",
  multipurpose: "Multi",
};

const ENV_LABELS: Record<string, string> = {
  indoor_controlled: "Indoor controlado",
  greenhouse: "Invernadero",
  tunnel: "Tunel",
  open_field: "Campo abierto",
};

export function ZoneDetailView({ zone }: Props) {
  const [batches, setBatches] = useState<ZoneBatch[] | null>(null);
  const [readings, setReadings] = useState<ZoneReading[] | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    getZoneBatches(zone.id).then(setBatches);
    getZoneConditions(zone.id).then(setReadings);
  }, [zone.id]);

  return (
    <>
      {/* Back */}
      <Link
        href="/areas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        Areas
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-sans text-xl font-bold text-text-primary">
            {zone.name}
          </h1>
          <Badge variant="outlined">
            {PURPOSE_LABELS[zone.purpose] ?? zone.purpose}
          </Badge>
          <Badge variant="info">
            {ENV_LABELS[zone.environment] ?? zone.environment}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {zone.facilityName} · {zone.areaM2} m²
          {zone.heightM ? ` · ${zone.heightM} m alto` : ""}
          {" · "}Cap: {zone.plantCapacity} plantas
        </p>
      </div>

      {/* Climate dials */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-text-secondary uppercase tracking-wider">
          Condiciones Actuales
        </h2>
        {readings === null ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : (
          <ClimateDials readings={readings} />
        )}
      </section>

      {/* Batches */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            Batches Activos
          </h2>
          {zone.structureCount > 0 && (
            <Link href={`/areas/${zone.id}/positions`}>
              <Button variant="ghost" className="text-xs">
                <Layers className="mr-1 size-3.5" />
                Posiciones
              </Button>
            </Link>
          )}
        </div>

        {batches === null ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : batches.length === 0 ? (
          <Card className="flex items-center gap-3 p-6 text-sm text-text-secondary">
            <Sprout className="size-5 text-text-tertiary" />
            No hay batches activos en esta zona
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {batches.map((b) => (
              <Link key={b.id} href={`/batches/${b.id}`}>
                <Card className="flex items-center justify-between p-4 transition-colors hover:bg-surface">
                  <div>
                    <span className="font-mono text-sm font-bold text-text-primary">
                      {b.code}
                    </span>
                    <span className="mx-2 text-text-tertiary">·</span>
                    <span className="text-sm text-text-secondary">
                      {b.cultivarName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <Badge variant="outlined">{b.phaseName}</Badge>
                    <span className="font-mono">{b.plantCount} pl</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
