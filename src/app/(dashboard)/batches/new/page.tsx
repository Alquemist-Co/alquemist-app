import { getManualBatchFormData } from "@/lib/actions/batches";
import { ManualBatchForm } from "./manual-batch-form";

export default async function NewBatchPage() {
  const formData = await getManualBatchFormData();
  return <ManualBatchForm formData={formData} />;
}
