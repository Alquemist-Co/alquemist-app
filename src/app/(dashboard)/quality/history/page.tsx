import { getTestHistory, getHistoryFilterOptions } from "@/lib/actions/quality";
import { HistoryTable } from "./history-table";

export default async function QualityHistoryPage() {
  const [initial, filterOptions] = await Promise.all([
    getTestHistory(),
    getHistoryFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <HistoryTable initialData={initial} filterOptions={filterOptions} />
    </div>
  );
}
