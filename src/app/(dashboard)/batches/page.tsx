import { getBatches, getBatchFilterOptions } from "@/lib/actions/batches";
import { BatchList } from "./batch-list";

export default async function BatchesPage() {
  const [batchesList, filterOptions] = await Promise.all([
    getBatches(),
    getBatchFilterOptions(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <BatchList batches={batchesList} filterOptions={filterOptions} />
    </div>
  );
}
