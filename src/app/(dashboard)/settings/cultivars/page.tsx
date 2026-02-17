import { getCultivars, getCropTypes } from "@/lib/actions/config";
import { CultivarList } from "./cultivar-list";

export default async function CultivarsPage() {
  const [cultivarsList, cropTypesList] = await Promise.all([
    getCultivars(),
    getCropTypes(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <CultivarList
        initialData={cultivarsList}
        cropTypes={cropTypesList.filter((ct) => ct.isActive)}
      />
    </div>
  );
}
