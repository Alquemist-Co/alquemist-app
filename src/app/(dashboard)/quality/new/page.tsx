import { getTestFormData } from "@/lib/actions/quality";
import { CreateTestForm } from "./create-test-form";

export default async function NewTestPage() {
  const formData = await getTestFormData();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <CreateTestForm formData={formData} />
    </div>
  );
}
