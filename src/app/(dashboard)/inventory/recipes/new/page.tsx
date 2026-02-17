import { getProductFormData } from "@/lib/actions/inventory";
import { RecipeForm } from "./recipe-form";

export default async function NewRecipePage() {
  const formData = await getProductFormData();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <RecipeForm formData={formData} />
    </div>
  );
}
