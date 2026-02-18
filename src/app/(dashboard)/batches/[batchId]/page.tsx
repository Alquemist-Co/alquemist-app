import { notFound } from "next/navigation";
import { getBatch, getBatchFilterOptions } from "@/lib/actions/batches";
import { BatchDetailView } from "./batch-detail-view";

type Props = {
  params: Promise<{ batchId: string }>;
};

export default async function BatchDetailPage({ params }: Props) {
  const { batchId } = await params;
  const [batch, filterOptions] = await Promise.all([
    getBatch(batchId),
    getBatchFilterOptions(),
  ]);

  if (!batch) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <BatchDetailView batch={batch} zones={filterOptions.zones} />
    </div>
  );
}
