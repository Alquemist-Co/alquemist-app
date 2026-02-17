import { getFacilities } from "@/lib/actions/areas";
import { OccupancyView } from "./occupancy-view";

export default async function OccupancyPage() {
  const facilities = await getFacilities();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6 lg:py-8">
      <OccupancyView facilities={facilities} />
    </div>
  );
}
