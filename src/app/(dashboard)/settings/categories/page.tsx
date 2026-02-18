import { getResourceCategories } from "@/lib/actions/resource-categories";
import { CategoryList } from "./category-list";

export default async function CategoriesPage() {
  const categories = await getResourceCategories();
  return <CategoryList initialData={categories} />;
}
