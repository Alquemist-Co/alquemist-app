import { notFound } from "next/navigation";
import { getProduct, getProductFormData } from "@/lib/actions/inventory";
import { ProductForm } from "../new/product-form";

type Props = {
  params: Promise<{ productId: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { productId } = await params;
  const [product, formData] = await Promise.all([
    getProduct(productId),
    getProductFormData(),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <ProductForm formData={formData} product={product} />
    </div>
  );
}
