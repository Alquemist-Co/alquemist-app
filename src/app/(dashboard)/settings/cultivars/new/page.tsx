import { getCropTypes, getCropType } from "@/lib/actions/config";
import type { PhaseWithFlows } from "@/lib/actions/config";
import { CultivarForm } from "../cultivar-form";

export default async function NewCultivarPage() {
  const cropTypesList = await getCropTypes();
  const activeCropTypes = cropTypesList.filter((ct) => ct.isActive);

  // Get phases for the first crop type
  let phases: PhaseWithFlows[] = [];
  if (activeCropTypes.length > 0) {
    const detail = await getCropType(activeCropTypes[0].id);
    phases = detail?.phases ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary">
        Nuevo cultivar
      </h1>
      <CultivarForm cropTypes={activeCropTypes} phases={phases} />
    </div>
  );
}
