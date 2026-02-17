import { notFound } from "next/navigation";
import {
  getCropType,
  getProductOptions,
  getCategoryOptions,
  getUnitOptions,
} from "@/lib/actions/config";
import { PhaseList } from "./phase-list";

type Props = {
  params: Promise<{ cropTypeId: string }>;
};

export default async function CropTypeDetailPage({ params }: Props) {
  const { cropTypeId } = await params;
  const [cropType, products, categories, units] = await Promise.all([
    getCropType(cropTypeId),
    getProductOptions(),
    getCategoryOptions(),
    getUnitOptions(),
  ]);

  if (!cropType) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <PhaseList
        cropType={cropType}
        products={products}
        categories={categories}
        units={units}
      />
    </div>
  );
}
