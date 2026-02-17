import { getProducts, getProductFormData } from "@/lib/actions/inventory";
import { ProductList } from "./product-list";

export default async function ProductsPage() {
  const [products, formData] = await Promise.all([
    getProducts(),
    getProductFormData(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <ProductList initialData={products} formData={formData} />
    </div>
  );
}
