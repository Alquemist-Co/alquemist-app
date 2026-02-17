import { getProductFormData } from "@/lib/actions/inventory";
import { ProductForm } from "./product-form";

export default async function NewProductPage() {
  const formData = await getProductFormData();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <ProductForm formData={formData} />
    </div>
  );
}
