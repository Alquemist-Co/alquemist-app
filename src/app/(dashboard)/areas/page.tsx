import { getFacilities } from "@/lib/actions/areas";
import { FacilityView } from "./facility-view";

export default async function AreasPage() {
  const facilities = await getFacilities();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <FacilityView facilities={facilities} />
    </div>
  );
}
