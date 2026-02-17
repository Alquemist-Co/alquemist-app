import { getOverheadCosts, getOverheadFormData } from "@/lib/actions/overhead";
import { CostList } from "./cost-list";

export default async function CostsPage() {
  const [costs, formData] = await Promise.all([
    getOverheadCosts(),
    getOverheadFormData(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <CostList initialData={costs} formData={formData} />
    </div>
  );
}
