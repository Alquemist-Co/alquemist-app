import { getPendingTests } from "@/lib/actions/quality";
import { PendingTests } from "./pending-tests";

export default async function QualityPage() {
  const tests = await getPendingTests();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <PendingTests initialData={tests} />
    </div>
  );
}
