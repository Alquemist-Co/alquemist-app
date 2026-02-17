import { getCropTypes } from "@/lib/actions/config";
import { CropTypeList } from "./crop-type-list";

export default async function CropTypesPage() {
  const cropTypes = await getCropTypes();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <CropTypeList initialData={cropTypes} />
    </div>
  );
}
