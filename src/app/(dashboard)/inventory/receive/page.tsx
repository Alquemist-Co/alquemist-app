import { getReceptionFormData } from "@/lib/actions/inventory";
import { ReceiveForm } from "./receive-form";

export default async function ReceivePage() {
  const formData = await getReceptionFormData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <ReceiveForm formData={formData} />
    </div>
  );
}
