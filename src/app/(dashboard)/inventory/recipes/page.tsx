import { getRecipes } from "@/lib/actions/inventory";
import { RecipeList } from "./recipe-list";

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <RecipeList initialData={recipes} />
    </div>
  );
}
