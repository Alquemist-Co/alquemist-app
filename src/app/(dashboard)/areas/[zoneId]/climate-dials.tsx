"use client";

import { DialGauge } from "@/components/data/dial-gauge";
import { PARAMETER_CONFIG } from "@/lib/schemas/environmental";
import type { ZoneReading } from "@/lib/actions/environmental";
import { Card } from "@/components/ui/card";

type Props = {
  readings: ZoneReading[];
};

const MAIN_PARAMS = ["temperature", "humidity", "co2", "vpd"];

export function ClimateDials({ readings }: Props) {
  if (readings.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-text-secondary">
        Sin sensores configurados en esta zona
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MAIN_PARAMS.map((param) => {
          const reading = readings.find((r) => r.parameter === param);
          const config = PARAMETER_CONFIG[param];
          if (!config) return null;

          return (
            <DialGauge
              key={param}
              value={reading ? reading.value : null}
              unit={config.unit}
              label={config.label}
              min={config.min}
              max={config.max}
              optimalMin={config.optimalMin}
              optimalMax={config.optimalMax}
              size="md"
            />
          );
        })}
      </div>
    </Card>
  );
}
