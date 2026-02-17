import { notFound } from "next/navigation";
import { getCultivar, getCropTypes, getCropType } from "@/lib/actions/config";
import { CultivarForm } from "../cultivar-form";

type Props = {
  params: Promise<{ cultivarId: string }>;
};

export default async function EditCultivarPage({ params }: Props) {
  const { cultivarId } = await params;
  const [cultivar, cropTypesList] = await Promise.all([
    getCultivar(cultivarId),
    getCropTypes(),
  ]);

  if (!cultivar) notFound();

  const activeCropTypes = cropTypesList.filter((ct) => ct.isActive);

  // Get phases for the cultivar's crop type
  const detail = await getCropType(cultivar.cropTypeId);
  const phases = detail?.phases ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary">
        Editar cultivar — {cultivar.name}
      </h1>
      <CultivarForm
        cropTypes={activeCropTypes}
        phases={phases}
        cultivar={cultivar}
      />
    </div>
  );
}
