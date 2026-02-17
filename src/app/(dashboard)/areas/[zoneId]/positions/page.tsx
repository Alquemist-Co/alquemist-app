import { getPositions, getPositionStats } from "@/lib/actions/positions";
import { getZoneBatches } from "@/lib/actions/areas";
import { PositionGrid } from "./position-grid";

type Props = {
  params: Promise<{ zoneId: string }>;
};

export default async function PositionsPage({ params }: Props) {
  const { zoneId } = await params;
  const [positions, stats, batches] = await Promise.all([
    getPositions(zoneId),
    getPositionStats(zoneId),
    getZoneBatches(zoneId),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <PositionGrid
        zoneId={zoneId}
        positions={positions}
        stats={stats}
        batches={batches}
      />
    </div>
  );
}
