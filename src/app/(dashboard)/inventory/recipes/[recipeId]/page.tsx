import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/actions/inventory";
import { RecipeDetail } from "./recipe-detail";

type Props = {
  params: Promise<{ recipeId: string }>;
};

export default async function RecipeDetailPage({ params }: Props) {
  const { recipeId } = await params;
  const recipe = await getRecipe(recipeId);

  if (!recipe) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <RecipeDetail recipe={recipe} />
    </div>
  );
}
